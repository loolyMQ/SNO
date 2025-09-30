export class BaseJobProcessor {
    createResult(data) {
        return {
            ...data,
            processedAt: new Date().toISOString(),
            processor: this.getType()
        };
    }
}
//# sourceMappingURL=base.js.map