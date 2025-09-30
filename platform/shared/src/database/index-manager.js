export class IndexManager {
    indexes = new Map();
    compoundIndexes = new Map();
    indexConfigs = new Map();
    logger;
    constructor(_serviceName, logger) {
        this.logger = logger;
    }
    createIndex(name, config) {
        this.indexConfigs.set(name, config);
        if (config.type === 'compound' && config.fields) {
            this.compoundIndexes.set(name, new Map());
            this.logger.info(`Created compound index: ${name} on fields [${config.fields.join(', ')}]`);
        }
        else {
            this.indexes.set(name, new Map());
            this.logger.info(`Created ${config.type} index: ${name} on field ${config.field}`);
        }
    }
    addToIndexes(document) {
        for (const [indexName, config] of this.indexConfigs) {
            try {
                if (config.type === 'compound' && config.fields) {
                    this.addToCompoundIndex(indexName, config, document);
                }
                else {
                    this.addToSingleIndex(indexName, config, document);
                }
            }
            catch (error) {
                this.logger.error(`Failed to add document to index ${indexName}:`, error);
            }
        }
    }
    removeFromIndexes(document) {
        for (const [indexName, config] of this.indexConfigs) {
            try {
                if (config.type === 'compound' && config.fields) {
                    this.removeFromCompoundIndex(indexName, config, document);
                }
                else {
                    this.removeFromSingleIndex(indexName, config, document);
                }
            }
            catch (error) {
                this.logger.error(`Failed to remove document from index ${indexName}:`, error);
            }
        }
    }
    findByIndex(indexName, value) {
        const index = this.indexes.get(indexName);
        if (!index) {
            return [];
        }
        return index.get(value) || [];
    }
    findByCompoundIndex(indexName, values) {
        const compoundIndex = this.compoundIndexes.get(indexName);
        if (!compoundIndex) {
            return [];
        }
        const config = this.indexConfigs.get(indexName);
        if (!config || !config.fields) {
            return [];
        }
        const keyParts = config.fields.map(field => {
            const value = values[field];
            return value !== undefined && value !== null ? String(value) : 'null';
        });
        const compoundKey = keyParts.join('|');
        return compoundIndex.get(compoundKey) || [];
    }
    getAllIndexes() {
        return Array.from(this.indexConfigs.keys());
    }
    getIndexConfig(indexName) {
        return this.indexConfigs.get(indexName);
    }
    dropIndex(indexName) {
        const config = this.indexConfigs.get(indexName);
        if (!config) {
            return false;
        }
        if (config.type === 'compound') {
            this.compoundIndexes.delete(indexName);
        }
        else {
            this.indexes.delete(indexName);
        }
        this.indexConfigs.delete(indexName);
        this.logger.info(`Dropped index: ${indexName}`);
        return true;
    }
    clearIndex(indexName) {
        const config = this.indexConfigs.get(indexName);
        if (!config) {
            return false;
        }
        if (config.type === 'compound') {
            const compoundIndex = this.compoundIndexes.get(indexName);
            if (compoundIndex) {
                compoundIndex.clear();
            }
        }
        else {
            const index = this.indexes.get(indexName);
            if (index) {
                index.clear();
            }
        }
        this.logger.info(`Cleared index: ${indexName}`);
        return true;
    }
    getIndexSize(indexName) {
        const config = this.indexConfigs.get(indexName);
        if (!config) {
            return 0;
        }
        if (config.type === 'compound') {
            const compoundIndex = this.compoundIndexes.get(indexName);
            if (!compoundIndex) {
                return 0;
            }
            return Array.from(compoundIndex.values()).reduce((total, docs) => total + docs.length, 0);
        }
        else {
            const index = this.indexes.get(indexName);
            if (!index) {
                return 0;
            }
            return Array.from(index.values()).reduce((total, docs) => total + docs.length, 0);
        }
    }
    addToSingleIndex(indexName, config, document) {
        const index = this.indexes.get(indexName);
        if (!index)
            return;
        const value = this.getFieldValue(document, config.field);
        if (value === undefined || value === null) {
            if (!config.sparse) {
                const nullDocs = index.get(null) || [];
                nullDocs.push(document);
                index.set(null, nullDocs);
            }
            return;
        }
        if (config.unique && index.has(value)) {
            throw new Error(`Unique constraint violation on field ${config.field}`);
        }
        const docs = index.get(value) || [];
        docs.push(document);
        index.set(value, docs);
    }
    addToCompoundIndex(indexName, config, document) {
        const compoundIndex = this.compoundIndexes.get(indexName);
        if (!compoundIndex || !config.fields)
            return;
        const keyParts = config.fields.map(field => {
            const value = this.getFieldValue(document, field);
            return value !== undefined && value !== null ? String(value) : 'null';
        });
        const compoundKey = keyParts.join('|');
        if (config.unique && compoundIndex.has(compoundKey)) {
            throw new Error(`Unique constraint violation on compound index ${indexName}`);
        }
        const docs = compoundIndex.get(compoundKey) || [];
        docs.push(document);
        compoundIndex.set(compoundKey, docs);
    }
    removeFromSingleIndex(indexName, config, document) {
        const index = this.indexes.get(indexName);
        if (!index)
            return;
        const value = this.getFieldValue(document, config.field);
        const docs = index.get(value);
        if (docs) {
            const filteredDocs = docs.filter(doc => doc !== document);
            if (filteredDocs.length === 0) {
                index.delete(value);
            }
            else {
                index.set(value, filteredDocs);
            }
        }
    }
    removeFromCompoundIndex(indexName, config, document) {
        const compoundIndex = this.compoundIndexes.get(indexName);
        if (!compoundIndex || !config.fields)
            return;
        const keyParts = config.fields.map(field => {
            const value = this.getFieldValue(document, field);
            return value !== undefined && value !== null ? String(value) : 'null';
        });
        const compoundKey = keyParts.join('|');
        const docs = compoundIndex.get(compoundKey);
        if (docs) {
            const filteredDocs = docs.filter(doc => doc !== document);
            if (filteredDocs.length === 0) {
                compoundIndex.delete(compoundKey);
            }
            else {
                compoundIndex.set(compoundKey, filteredDocs);
            }
        }
    }
    getFieldValue(document, field) {
        if (typeof document === 'object' && document !== null) {
            return document[field];
        }
        return undefined;
    }
}
//# sourceMappingURL=index-manager.js.map