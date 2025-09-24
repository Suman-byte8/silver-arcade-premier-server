/**
 * Database Performance Monitor
 * Tracks query performance, connection stats, and provides optimization insights
 */

const dbMonitor = {
    queryStats: new Map(),
    slowQueryThreshold: 100, // milliseconds
    connectionStats: {
        totalQueries: 0,
        slowQueries: 0,
        averageQueryTime: 0,
        peakQueryTime: 0
    },

    /**
     * Monitor a database query execution
     * @param {string} operation - Operation name (e.g., 'find', 'update')
     * @param {Function} queryFunction - The database query function to monitor
     * @param {Object} context - Additional context about the query
     * @returns {Promise} Query result
     */
    monitorQuery: async function(operation, queryFunction, context = {}) {
        const startTime = Date.now();
        const queryId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            const result = await queryFunction();
            const executionTime = Date.now() - startTime;

            this.trackQueryPerformance(operation, executionTime, context, true);
            
            if (executionTime > this.slowQueryThreshold) {
                this.logSlowQuery(operation, executionTime, context);
            }

            return result;
        } catch (error) {
            const executionTime = Date.now() - startTime;
            this.trackQueryPerformance(operation, executionTime, context, false);
            throw error;
        }
    },

    /**
     * Track query performance metrics
     * @param {string} operation - Operation type
     * @param {number} executionTime - Execution time in ms
     * @param {Object} context - Query context
     * @param {boolean} success - Whether query succeeded
     */
    trackQueryPerformance: function(operation, executionTime, context, success) {
        this.connectionStats.totalQueries++;
        this.connectionStats.averageQueryTime = 
            ((this.connectionStats.averageQueryTime * (this.connectionStats.totalQueries - 1)) + executionTime) / 
            this.connectionStats.totalQueries;
        
        this.connectionStats.peakQueryTime = Math.max(this.connectionStats.peakQueryTime, executionTime);

        if (executionTime > this.slowQueryThreshold) {
            this.connectionStats.slowQueries++;
        }

        // Store individual query stats
        const queryKey = `${operation}_${JSON.stringify(context)}`;
        if (!this.queryStats.has(queryKey)) {
            this.queryStats.set(queryKey, {
                count: 0,
                totalTime: 0,
                minTime: Infinity,
                maxTime: 0,
                successCount: 0,
                errorCount: 0
            });
        }

        const stats = this.queryStats.get(queryKey);
        stats.count++;
        stats.totalTime += executionTime;
        stats.minTime = Math.min(stats.minTime, executionTime);
        stats.maxTime = Math.max(stats.maxTime, executionTime);
        
        if (success) {
            stats.successCount++;
        } else {
            stats.errorCount++;
        }
    },

    /**
     * Log slow query details
     * @param {string} operation - Operation type
     * @param {number} executionTime - Execution time
     * @param {Object} context - Query context
     */
    logSlowQuery: function(operation, executionTime, context) {
        console.warn('🚨 SLOW QUERY DETECTED:', {
            operation,
            executionTime: `${executionTime}ms`,
            threshold: `${this.slowQueryThreshold}ms`,
            context,
            timestamp: new Date().toISOString()
        });
    },

    /**
     * Get performance statistics
     * @returns {Object} Performance stats
     */
    getStats: function() {
        return {
            ...this.connectionStats,
            slowQueryPercentage: (this.connectionStats.slowQueries / this.connectionStats.totalQueries * 100).toFixed(2),
            queryStats: Array.from(this.queryStats.entries()).map(([key, stats]) => ({
                operation: key,
                averageTime: (stats.totalTime / stats.count).toFixed(2),
                minTime: stats.minTime,
                maxTime: stats.maxTime,
                successRate: ((stats.successCount / stats.count) * 100).toFixed(2),
                totalExecutions: stats.count
            }))
        };
    },

    /**
     * Generate optimization recommendations
     * @returns {Array} Array of optimization suggestions
     */
    getOptimizationSuggestions: function() {
        const suggestions = [];
        const stats = this.getStats();

        if (stats.slowQueryPercentage > 10) {
            suggestions.push({
                severity: 'high',
                message: `High percentage of slow queries (${stats.slowQueryPercentage}%). Consider adding indexes or optimizing queries.`,
                action: 'Review query patterns and add appropriate indexes'
            });
        }

        if (stats.averageQueryTime > 50) {
            suggestions.push({
                severity: 'medium',
                message: `Average query time is high (${stats.averageQueryTime.toFixed(2)}ms). Consider query optimization.`,
                action: 'Use projection, lean queries, and proper indexing'
            });
        }

        // Analyze individual query patterns
        stats.queryStats.forEach(queryStat => {
            if (queryStat.averageTime > 100) {
                suggestions.push({
                    severity: 'high',
                    message: `Query "${queryStat.operation}" is consistently slow (avg: ${queryStat.averageTime}ms)`,
                    action: 'Optimize this specific query or add indexes'
                });
            }
        });

        return suggestions;
    },

    /**
     * Reset all monitoring statistics
     */
    resetStats: function() {
        this.queryStats.clear();
        this.connectionStats = {
            totalQueries: 0,
            slowQueries: 0,
            averageQueryTime: 0,
            peakQueryTime: 0
        };
    },

    /**
     * Middleware for Express routes to automatically monitor database calls
     */
    expressMiddleware: function() {
        return (req, res, next) => {
            const originalSend = res.send;
            const dbCalls = [];
            const startTime = Date.now();

            // Monitor database operations
            const originalQuery = require('mongoose').Query.prototype.exec;
            require('mongoose').Query.prototype.exec = function() {
                const queryStart = Date.now();
                const result = originalQuery.apply(this, arguments);
                
                if (result && typeof result.then === 'function') {
                    return result.then(data => {
                        const queryTime = Date.now() - queryStart;
                        dbCalls.push({
                            operation: this.op,
                            collection: this.mongooseCollection.name,
                            executionTime: queryTime,
                            criteria: this.getFilter()
                        });
                        return data;
                    });
                }
                
                return result;
            };

            res.send = function() {
                const totalTime = Date.now() - startTime;
                
                if (dbCalls.length > 0) {
                    console.log('📊 Database Performance Report:', {
                        route: req.path,
                        method: req.method,
                        totalRequestTime: `${totalTime}ms`,
                        databaseCalls: dbCalls.length,
                        totalDbTime: dbCalls.reduce((sum, call) => sum + call.executionTime, 0),
                        slowCalls: dbCalls.filter(call => call.executionTime > 100).length
                    });

                    if (dbCalls.some(call => call.executionTime > 500)) {
                        console.warn('⚠️  Slow database calls detected in route:', req.path);
                    }
                }

                // Restore original methods
                require('mongoose').Query.prototype.exec = originalQuery;
                res.send = originalSend;
                return originalSend.apply(this, arguments);
            };

            next();
        };
    }
};

module.exports = dbMonitor;
