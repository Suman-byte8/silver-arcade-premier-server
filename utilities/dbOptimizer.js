/**
 * Database Optimization Utilities
 * Shared optimization functions for all controllers
 */

const dbMonitor = require('./dbMonitor');
const batchProcessor = require('./batchProcessor');
const { queryCache } = require('../middlewares/cache');

const dbOptimizer = {
    /**
     * Optimized find operation with monitoring, lean queries, and caching
     */
    find: async function(model, query = {}, options = {}) {
        const {
            select = '',
            lean = true,
            sort = {},
            limit = 0,
            skip = 0,
            populate = null,
            context = {},
            cache: useCache = false,
            cacheKey = null,
            cacheTTL = 300
        } = options;

        // Use cache if enabled
        if (useCache) {
            const key = cacheKey || `db:find:${model.modelName}:${JSON.stringify({query, select, sort, limit, skip, populate})}`;
            return queryCache.get(key, async () => {
                return this._executeFind(model, query, { select, lean, sort, limit, skip, populate, context });
            }, cacheTTL);
        }

        return this._executeFind(model, query, { select, lean, sort, limit, skip, populate, context });
    },

    /**
     * Internal find execution method
     */
    _executeFind: async function(model, query, options) {
        const { select, lean, sort, limit, skip, populate, context } = options;

        return dbMonitor.monitorQuery(
            'find',
            async () => {
                let queryBuilder = model.find(query);

                if (select) queryBuilder = queryBuilder.select(select);
                if (Object.keys(sort).length > 0) queryBuilder = queryBuilder.sort(sort);
                if (limit > 0) queryBuilder = queryBuilder.limit(limit);
                if (skip > 0) queryBuilder = queryBuilder.skip(skip);
                if (populate) queryBuilder = queryBuilder.populate(populate);
                if (lean) queryBuilder = queryBuilder.lean();

                return queryBuilder.exec();
            },
            { model: model.modelName, ...context }
        );
    },

    /**
     * Optimized findOne operation
     */
    findOne: async function(model, query = {}, options = {}) {
        const {
            select = '',
            lean = true,
            populate = null,
            context = {}
        } = options;

        return dbMonitor.monitorQuery(
            'findOne',
            async () => {
                let queryBuilder = model.findOne(query);
                
                if (select) queryBuilder = queryBuilder.select(select);
                if (populate) queryBuilder = queryBuilder.populate(populate);
                if (lean) queryBuilder = queryBuilder.lean();
                
                return queryBuilder.exec();
            },
            { model: model.modelName, ...context }
        );
    },

    /**
     * Optimized findById operation
     */
    findById: async function(model, id, options = {}) {
        const {
            select = '',
            lean = true,
            context = {}
        } = options;

        return dbMonitor.monitorQuery(
            'findById',
            async () => {
                let queryBuilder = model.findById(id);
                
                if (select) queryBuilder = queryBuilder.select(select);
                if (lean) queryBuilder = queryBuilder.lean();
                
                return queryBuilder.exec();
            },
            { model: model.modelName, id, ...context }
        );
    },

    /**
     * Optimized create operation with monitoring
     */
    create: async function(model, data, options = {}) {
        const { context = {} } = options;

        return dbMonitor.monitorQuery(
            'create',
            async () => {
                const document = new model(data);
                return document.save();
            },
            { model: model.modelName, ...context }
        );
    },

    /**
     * Optimized save operation with monitoring
     */
    save: async function(document, options = {}) {
        const { context = {} } = options;

        return dbMonitor.monitorQuery(
            'save',
            async () => {
                return document.save();
            },
            { model: document.constructor.modelName, ...context }
        );
    },

    /**
     * Optimized update operation
     */
    update: async function(model, id, updateData, options = {}) {
        const {
            new: returnNew = true,
            runValidators = true,
            context = {}
        } = options;

        return dbMonitor.monitorQuery(
            'findByIdAndUpdate',
            async () => {
                return model.findByIdAndUpdate(
                    id,
                    updateData,
                    { new: returnNew, runValidators }
                );
            },
            { model: model.modelName, id, ...context }
        );
    },

    /**
     * Optimized delete operation
     */
    delete: async function(model, id, options = {}) {
        const { context = {} } = options;

        return dbMonitor.monitorQuery(
            'findByIdAndDelete',
            async () => {
                return model.findByIdAndDelete(id);
            },
            { model: model.modelName, id, ...context }
        );
    },

    /**
     * Bulk create operation
     */
    bulkCreate: async function(model, documents, options = {}) {
        const { ordered = false, context = {} } = options;

        return dbMonitor.monitorQuery(
            'bulkCreate',
            async () => {
                const operations = documents.map(doc => ({
                    insertOne: { document: doc }
                }));
                
                return model.bulkWrite(operations, { ordered });
            },
            { model: model.modelName, count: documents.length, ...context }
        );
    },

    /**
     * Bulk update operation
     */
    bulkUpdate: async function(model, updateOperations, options = {}) {
        const { ordered = false, context = {} } = options;

        return dbMonitor.monitorQuery(
            'bulkUpdate',
            async () => {
                return model.bulkWrite(updateOperations, { ordered });
            },
            { model: model.modelName, count: updateOperations.length, ...context }
        );
    },

    /**
     * Bulk delete operation
     */
    bulkDelete: async function(model, ids, options = {}) {
        const { ordered = false, context = {} } = options;

        return dbMonitor.monitorQuery(
            'bulkDelete',
            async () => {
                const operations = ids.map(id => ({
                    deleteOne: { filter: { _id: id } }
                }));
                
                return model.bulkWrite(operations, { ordered });
            },
            { model: model.modelName, count: ids.length, ...context }
        );
    },

    /**
     * Process operations in batches
     */
    processBatch: batchProcessor.processBatch,

    /**
     * Create batches from data
     */
    createBatches: batchProcessor.createBatches,

    /**
     * Get performance statistics
     */
    getStats: dbMonitor.getStats,

    /**
     * Get optimization suggestions
     */
    getOptimizationSuggestions: dbMonitor.getOptimizationSuggestions,

    /**
     * Reset performance statistics
     */
    resetStats: dbMonitor.resetStats
};

module.exports = dbOptimizer;
