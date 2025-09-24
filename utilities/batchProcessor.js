/**
 * Batch Processor Utility for handling high-volume database operations
 * Processes operations in batches to prevent database overload
 */

const batchProcessor = {
    /**
     * Process operations in batches with configurable size and delay
     * @param {Array} operations - Array of async functions to execute
     * @param {Object} options - Configuration options
     * @param {number} options.batchSize - Number of operations per batch (default: 50)
     * @param {number} options.delayMs - Delay between batches in milliseconds (default: 100)
     * @param {boolean} options.continueOnError - Whether to continue on individual operation errors (default: true)
     * @returns {Promise<Array>} Array of results for all operations
     */
    processBatch: async (operations, options = {}) => {
        const {
            batchSize = 50,
            delayMs = 100,
            continueOnError = true
        } = options;

        const results = [];
        const totalBatches = Math.ceil(operations.length / batchSize);

        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const startIndex = batchIndex * batchSize;
            const endIndex = Math.min(startIndex + batchSize, operations.length);
            const batchOperations = operations.slice(startIndex, endIndex);

            console.log(`Processing batch ${batchIndex + 1}/${totalBatches} (${batchOperations.length} operations)`);

            try {
                const batchResults = await Promise.allSettled(
                    batchOperations.map((op, index) => 
                        op().catch(error => {
                            if (continueOnError) {
                                console.error(`Operation ${startIndex + index} failed:`, error.message);
                                return { status: 'rejected', reason: error };
                            }
                            throw error;
                        })
                    )
                );

                results.push(...batchResults);

                // Add delay between batches if not the last batch
                if (batchIndex < totalBatches - 1 && delayMs > 0) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }

            } catch (batchError) {
                if (!continueOnError) {
                    throw batchError;
                }
                console.error(`Batch ${batchIndex + 1} failed:`, batchError.message);
            }
        }

        return results;
    },

    /**
     * Create batches from an array of data
     * @param {Array} data - Array of data to batch
     * @param {number} batchSize - Size of each batch
     * @returns {Array} Array of batches
     */
    createBatches: (data, batchSize = 50) => {
        const batches = [];
        for (let i = 0; i < data.length; i += batchSize) {
            batches.push(data.slice(i, i + batchSize));
        }
        return batches;
    },

    /**
     * Process MongoDB bulk operations with progress tracking
     * @param {Model} model - Mongoose model
     * @param {Array} operations - Bulk write operations
     * @param {Object} options - Bulk write options
     * @returns {Promise} Bulk write result
     */
    processBulkOperations: async (model, operations, options = {}) => {
        const startTime = Date.now();
        const totalOperations = operations.length;

        console.log(`Starting bulk operations: ${totalOperations} operations`);

        try {
            const result = await model.bulkWrite(operations, {
                ordered: false,
                ...options
            });

            const duration = Date.now() - startTime;
            console.log(`Bulk operations completed in ${duration}ms`);
            console.log(`Inserted: ${result.insertedCount}, Updated: ${result.modifiedCount}, Deleted: ${result.deletedCount}`);

            return result;
        } catch (error) {
            console.error('Bulk operations failed:', error.message);
            throw error;
        }
    },

    /**
     * Monitor database connection pool status
     * @param {mongoose.Connection} connection - Mongoose connection
     */
    monitorPoolStatus: (connection) => {
        setInterval(() => {
            const poolStats = connection.getClient().s;
            console.log('Connection pool status:', {
                totalConnectionCount: poolStats.totalConnectionCount,
                availableConnectionCount: poolStats.availableConnectionCount,
                currentCheckedOutCount: poolStats.currentCheckedOutCount,
                waitQueueLength: poolStats.waitQueueLength
            });
        }, 30000); // Log every 30 seconds
    }
};

module.exports = batchProcessor;
