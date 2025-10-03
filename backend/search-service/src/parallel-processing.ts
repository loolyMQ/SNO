import { Worker } from 'worker_threads';
import { cpus } from 'os';
// import { join } from 'path';

export interface ParallelTask<T = unknown> {
  id: string;
  data: unknown;
  processor: (data: unknown) => Promise<T>;
}

export interface ParallelResult<T = unknown> {
  id: string;
  result?: T;
  error?: Error;
  duration: number;
}

export class ParallelProcessor {
  private static instance: ParallelProcessor;
  private maxWorkers: number;
  private activeWorkers: Map<string, Worker> = new Map();
  private taskQueue: ParallelTask[] = [];
  private isProcessing = false;

  private constructor() {
    this.maxWorkers = Math.min(cpus().length, 8); // Limit to 8 workers max
  }

  static getInstance(): ParallelProcessor {
    if (!ParallelProcessor.instance) {
      ParallelProcessor.instance = new ParallelProcessor();
    }
    return ParallelProcessor.instance;
  }

  // Process tasks in parallel with worker threads
  async processWithWorkers<T>(tasks: ParallelTask<T>[]): Promise<ParallelResult<T>[]> {
    const results: ParallelResult<T>[] = [];
    const promises: Promise<ParallelResult<T>>[] = [];

    // Create worker promises
    for (const task of tasks) {
      const promise = this.executeWithWorker(task);
      promises.push(promise);
    }

    // Wait for all workers to complete
    const workerResults = await Promise.allSettled(promises);
    
    workerResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          id: tasks[index]?.id || 'unknown',
          error: result.reason,
          duration: 0,
        });
      }
    });

    return results;
  }

  // Process tasks in parallel with async/await
  async processParallel<T>(tasks: ParallelTask<T>[]): Promise<ParallelResult<T>[]> {
    // Start time tracking would be implemented here
    const promises: Array<Promise<ParallelResult<T>>> = tasks.map(async (task) => {
      const taskStartTime = Date.now();
      try {
        const result = await task.processor(task.data);
        return {
          id: task.id,
          result,
          duration: Date.now() - taskStartTime,
        };
      } catch (error) {
        return {
          id: task.id,
          error: error as Error,
          duration: Date.now() - taskStartTime,
        };
      }
    });

    return Promise.all(promises);
  }

  // Process tasks in batches
  async processBatches<T>(
    tasks: ParallelTask<T>[],
    batchSize: number = this.maxWorkers
  ): Promise<ParallelResult<T>[]> {
    const results: ParallelResult<T>[] = [];
    
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      const batchResults = await this.processParallel(batch);
      results.push(...batchResults);
    }

    return results;
  }

  // Process tasks with concurrency control
  async processWithConcurrency<T>(
    tasks: ParallelTask<T>[],
    concurrency: number = this.maxWorkers
  ): Promise<ParallelResult<T>[]> {
    const results: ParallelResult<T>[] = [];
    const executing: Promise<ParallelResult<T>>[] = [];

    for (const task of tasks) {
      const promise = this.executeTask(task);
      executing.push(promise);

      if (executing.length >= concurrency) {
        // Wait for any task to complete (propagate index with result)
        const raced = await Promise.race(
          executing.map((p, index) => p.then((res) => ({ index, res })))
        );
        results.push(raced.res);
        executing.splice(raced.index, 1);
      }
    }

    // Wait for remaining tasks
    const remainingResults = await Promise.all(executing);
    results.push(...remainingResults);

    return results;
  }

  // Execute single task
  private async executeTask<T>(task: ParallelTask<T>): Promise<ParallelResult<T>> {
    const startTime = Date.now();
    try {
      const result = await task.processor(task.data);
      return {
        id: task.id,
        result,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        id: task.id,
        error: error as Error,
        duration: Date.now() - startTime,
      };
    }
  }

  // Execute task with worker thread
  private async executeWithWorker<T>(task: ParallelTask<T>): Promise<ParallelResult<T>> {
    const startTime = Date.now();
    const workerId = `worker-${Date.now()}-${Math.random()}`;

    return new Promise((resolve) => {
      // Create worker script dynamically
      const workerScript = `
        const { parentPort } = require('worker_threads');
        
        parentPort.on('message', async (task) => {
          try {
            const result = await eval(\`(${task.processor})\`)(task.data);
            parentPort.postMessage({ success: true, result });
          } catch (error) {
            parentPort.postMessage({ success: false, error: error instanceof Error ? error.message : String(error) });
          }
        });
      `;

      if (process.env.NODE_ENV === 'production') {
        throw new Error('Inline worker scripts are not allowed in production');
      }
      const worker = new Worker(workerScript, { eval: true });
      this.activeWorkers.set(workerId, worker);

      worker.on('message', (message) => {
        worker.terminate();
        this.activeWorkers.delete(workerId);

        if (message.success) {
          resolve({
            id: task.id,
            result: message.result,
            duration: Date.now() - startTime,
          });
        } else {
          resolve({
            id: task.id,
            error: new Error(message.error),
            duration: Date.now() - startTime,
          });
        }
      });

      worker.on('error', (error) => {
        worker.terminate();
        this.activeWorkers.delete(workerId);
        resolve({
          id: task.id,
          error,
          duration: Date.now() - startTime,
        });
      });

      // Send task to worker
      worker.postMessage({
        id: task.id,
        data: task.data,
        // Передача сериализованной функции небезопасна и должна быть запрещена в продакшене
        // Здесь оставлено только для моков в тестах. В боевом коде используйте файл воркера.
        processor: task.processor.toString()
      });
    });
  }

  // Search-specific parallel operations
  async parallelSearch(queries: string[]): Promise<unknown[]> {
    const tasks: ParallelTask<unknown>[] = queries.map((query, index) => ({
      id: `search-${index}`,
      data: { query },
      processor: async (data: unknown) => {
        const { query } = data as { query: string };
        // Mock search implementation
        return {
          query,
          results: [`Result for ${query}`],
          timestamp: Date.now(),
        };
      },
    }));

    const results = await this.processParallel(tasks);
    return results.map(r => r.result).filter((v): v is unknown => Boolean(v));
  }

  async parallelDataProcessing(dataItems: unknown[]): Promise<unknown[]> {
    const tasks: ParallelTask<unknown>[] = dataItems.map((item, index) => ({
      id: `process-${index}`,
      data: item,
      processor: async (data: unknown) => {
        // Mock data processing
        if (typeof data === 'object' && data !== null) {
          return { ...(data as Record<string, unknown>), processed: true, timestamp: Date.now() };
        }
        return { value: data, processed: true, timestamp: Date.now() };
      },
    }));

    const results = await this.processWithConcurrency(tasks);
    return results.map(r => r.result).filter((v): v is unknown => Boolean(v));
  }

  // Cleanup
  async cleanup(): Promise<void> {
    const workers = Array.from(this.activeWorkers.values());
    await Promise.all(workers.map(worker => worker.terminate()));
    this.activeWorkers.clear();
  }

  // Metrics
  getMetrics() {
    return {
      maxWorkers: this.maxWorkers,
      activeWorkers: this.activeWorkers.size,
      queueLength: this.taskQueue.length,
      isProcessing: this.isProcessing,
    };
  }
}

// Global instance
export const parallelProcessor = ParallelProcessor.getInstance();
