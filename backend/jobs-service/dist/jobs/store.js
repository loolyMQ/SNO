export class InMemoryJobStore {
    jobs = new Map();
    queue = [];
    add(job) {
        this.jobs.set(job.id, job);
        this.queue.push(job.id);
    }
    get(id) {
        return this.jobs.get(id);
    }
    delete(id) {
        this.jobs.delete(id);
        const idx = this.queue.indexOf(id);
        if (idx > -1)
            this.queue.splice(idx, 1);
    }
    next() {
        return this.queue.shift();
    }
    stats() {
        const values = Array.from(this.jobs.values());
        return {
            total: values.length,
            pending: values.filter(j => j.status === 'pending').length,
            running: values.filter(j => j.status === 'running').length,
            completed: values.filter(j => j.status === 'completed').length,
            failed: values.filter(j => j.status === 'failed').length,
            queueSize: this.queue.length
        };
    }
    allMinimal() {
        return Array.from(this.jobs.values()).map(job => ({
            id: job.id,
            type: job.type,
            status: job.status,
            priority: job.priority,
            createdAt: job.createdAt,
            startedAt: job.startedAt,
            completedAt: job.completedAt,
            retries: job.retries,
            maxRetries: job.maxRetries
        }));
    }
}
//# sourceMappingURL=store.js.map