export class StringUtils {
  static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  static capitalizeWords(str: string): string {
    return str.split(' ').map(word => this.capitalize(word)).join(' ');
  }

  static camelCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
      })
      .replace(/\s+/g, '');
  }

  static kebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  static snakeCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[\s-]+/g, '_')
      .toLowerCase();
  }

  static pascalCase(str: string): string {
    return this.capitalizeWords(str).replace(/\s+/g, '');
  }

  static truncate(str: string, length: number, suffix: string = '...'): string {
    if (str.length <= length) {
      return str;
    }
    return str.substring(0, length - suffix.length) + suffix;
  }

  static truncateWords(str: string, wordCount: number, suffix: string = '...'): string {
    if (!str) {
      throw new Error('String is required');
    }
    const words = str.split(' ');
    if (words.length <= wordCount) {
      return str;
    }
    return words.slice(0, wordCount).join(' ') + suffix;
  }

  static slugify(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  static random(length: number = 10, charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }

  static randomAlpha(length: number = 10): string {
    return this.random(length, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');
  }

  static randomNumeric(length: number = 10): string {
    return this.random(length, '0123456789');
  }

  static randomAlphaNumeric(length: number = 10): string {
    return this.random(length, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789');
  }

  static uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  static isEmail(str: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(str);
  }

  static isUrl(str: string): boolean {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  }

  static isPhoneNumber(str: string): boolean {
    const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(str.replace(/[\s\-()]/g, ''));
  }

  static isNumeric(str: string): boolean {
    return !isNaN(parseFloat(str)) && isFinite(Number(str));
  }

  static isAlpha(str: string): boolean {
    return /^[a-zA-Z]+$/.test(str);
  }

  static isAlphaNumeric(str: string): boolean {
    return /^[a-zA-Z0-9]+$/.test(str);
  }

  static isUuid(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  static padStart(str: string, length: number, padString: string = ' '): string {
    return str.padStart(length, padString);
  }

  static padEnd(str: string, length: number, padString: string = ' '): string {
    return str.padEnd(length, padString);
  }

  static repeat(str: string, count: number): string {
    return str.repeat(count);
  }

  static reverse(str: string): string {
    return str.split('').reverse().join('');
  }

  static removeWhitespace(str: string): string {
    return str.replace(/\s+/g, '');
  }

  static normalizeWhitespace(str: string): string {
    return str.replace(/\s+/g, ' ').trim();
  }

  static stripHtml(str: string): string {
    return str.replace(/<[^>]*>/g, '');
  }

  static escapeHtml(str: string): string {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return str.replace(/[&<>"']/g, (match) => htmlEscapes[match] || match);
  }

  static unescapeHtml(str: string): string {
    const htmlUnescapes: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'"
    };
    return str.replace(/&(amp|lt|gt|quot|#39);/g, (match) => htmlUnescapes[match] || match);
  }

  static base64Encode(str: string): string {
    return Buffer.from(str, 'utf8').toString('base64');
  }

  static base64Decode(str: string): string {
    return Buffer.from(str, 'base64').toString('utf8');
  }

  static hash(str: string, algorithm: string = 'sha256'): string {
    const crypto = require('crypto');
    return crypto.createHash(algorithm).update(str).digest('hex');
  }

  static compare(str1: string, str2: string): number {
    return str1.localeCompare(str2);
  }

  static similarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) {
      return 1.0;
    }
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) {
      matrix[0]![i] = i;
    }
    
    for (let j = 0; j <= str2.length; j++) {
      matrix[j]![0] = j;
    }
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j]![i] = Math.min(
          matrix[j]![i - 1]! + 1,
          matrix[j - 1]![i]! + 1,
          matrix[j - 1]![i - 1]! + indicator
        );
      }
    }
    
    return matrix[str2.length]![str1.length]!;
  }
}
