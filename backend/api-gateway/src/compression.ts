import compression from 'compression';
import { Request, Response, NextFunction } from 'express';
import { gzip, deflate, brotliCompress, constants } from 'zlib';
import { promisify } from 'util';
import { promises as fs } from 'fs';

const gzipAsync = promisify(gzip);
const deflateAsync = promisify(deflate);
const brotliCompressAsync = promisify(brotliCompress);

export interface CompressionOptions {
  level: number;
  threshold: number;
  filter: (req: Request, res: Response) => boolean;
  compressionTypes: string[];
}

export class CompressionService {
  private static instance: CompressionService;
  private options: CompressionOptions;

  private constructor() {
    this.options = {
      level: 6,
      threshold: 1024,
      filter: this.defaultFilter,
      compressionTypes: ['gzip', 'deflate', 'br'],
    };
  }

  static getInstance(): CompressionService {
    if (!CompressionService.instance) {
      CompressionService.instance = new CompressionService();
    }
    return CompressionService.instance;
  }

  // Default filter function
  private defaultFilter(req: Request, res: Response): boolean {
    // Don't compress if client doesn't support it
    if (!req.headers['accept-encoding']) {
      return false;
    }

    // Don't compress if already compressed
    if (res.getHeader('content-encoding')) {
      return false;
    }

    // Don't compress small responses
    const contentLength = res.getHeader('content-length');
    if (contentLength && Number(contentLength) < this.options.threshold) {
      return false;
    }

    // Don't compress certain content types
    const contentType = res.getHeader('content-type') as string;
    if (contentType) {
      const nonCompressibleTypes = [
        'image/',
        'video/',
        'audio/',
        'application/zip',
        'application/gzip',
        'application/x-rar',
      ];
      
      if (nonCompressibleTypes.some(type => contentType.includes(type))) {
        return false;
      }
    }

    return true;
  }

  // Get compression middleware
  getMiddleware() {
    return compression({
      level: this.options.level,
      threshold: this.options.threshold,
      filter: this.options.filter,
    });
  }

  // Compress response data
  async compressData(data: string | Buffer, encoding: string = 'gzip'): Promise<Buffer> {
    const input = Buffer.isBuffer(data) ? data : Buffer.from(data);

    switch (encoding.toLowerCase()) {
      case 'gzip':
        return gzipAsync(input, { level: this.options.level });
      case 'deflate':
        return deflateAsync(input, { level: this.options.level });
      case 'br':
      case 'brotli':
        return brotliCompressAsync(input, {
          params: {
            [constants.BROTLI_PARAM_QUALITY]: this.options.level,
          },
        });
      default:
        throw new Error(`Unsupported compression encoding: ${encoding}`);
    }
  }

  // Get best compression type based on client support
  getBestCompressionType(req: Request): string {
    const acceptEncoding = req.headers['accept-encoding'] as string;
    
    if (!acceptEncoding) {
      return 'identity';
    }

    // Check for Brotli support (best compression)
    if (acceptEncoding.includes('br')) {
      return 'br';
    }

    // Check for Gzip support (good compression)
    if (acceptEncoding.includes('gzip')) {
      return 'gzip';
    }

    // Check for Deflate support (basic compression)
    if (acceptEncoding.includes('deflate')) {
      return 'deflate';
    }

    return 'identity';
  }

  // Compress JSON responses
  async compressJsonResponse(data: unknown, req: Request): Promise<{ data: Buffer; encoding: string }> {
    const jsonString = JSON.stringify(data);
    const compressionType = this.getBestCompressionType(req);
    
    if (compressionType === 'identity') {
      return {
        data: Buffer.from(jsonString),
        encoding: 'identity',
      };
    }

    const compressed = await this.compressData(jsonString, compressionType);
    return {
      data: compressed,
      encoding: compressionType,
    };
  }

  // Compress text responses
  async compressTextResponse(text: string, req: Request): Promise<{ data: Buffer; encoding: string }> {
    const compressionType = this.getBestCompressionType(req);
    
    if (compressionType === 'identity') {
      return {
        data: Buffer.from(text),
        encoding: 'identity',
      };
    }

    const compressed = await this.compressData(text, compressionType);
    return {
      data: compressed,
      encoding: compressionType,
    };
  }

  // Compress file responses
  async compressFileResponse(filePath: string, req: Request): Promise<{ data: Buffer; encoding: string }> {
    const fileData = await fs.readFile(filePath);
    const compressionType = this.getBestCompressionType(req);
    
    if (compressionType === 'identity') {
      return {
        data: fileData,
        encoding: 'identity',
      };
    }

    const compressed = await this.compressData(fileData, compressionType);
    return {
      data: compressed,
      encoding: compressionType,
    };
  }

  // Set compression options
  setOptions(options: Partial<CompressionOptions>): void {
    this.options = { ...this.options, ...options };
  }

  // Get compression statistics
  getStats(): Record<string, unknown> {
    return {
      options: this.options,
      supportedTypes: this.options.compressionTypes,
    };
  }
}


// Express middleware for custom compression
