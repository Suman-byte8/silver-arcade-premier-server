/**
 * Index Optimization Utility
 * Analyzes query patterns and suggests optimal indexes
 */

const mongoose = require('mongoose');

const indexOptimizer = {
    /**
     * Analyze a collection's query patterns and suggest indexes
     * @param {mongoose.Model} model - Mongoose model to analyze
     * @param {Object} options - Analysis options
     * @returns {Object} Index recommendations
     */
    analyzeCollection: async function(model, options = {}) {
        const collection = model.collection;
        const collectionName = model.collection.collectionName;
        
        console.log(`🔍 Analyzing index patterns for collection: ${collectionName}`);
        
        try {
            // Get current indexes
            const currentIndexes = await collection.indexes();
            
            // Analyze query patterns (this would typically come from query logs)
            // For now, we'll provide common index patterns based on typical usage
            
            const recommendations = this.generateRecommendations(
                collectionName, 
                currentIndexes,
                options
            );
            
            return {
                collection: collectionName,
                currentIndexes: currentIndexes.map(idx => ({
                    name: idx.name,
                    key: idx.key,
                    unique: idx.unique || false,
                    sparse: idx.sparse || false
                })),
                recommendations
            };
            
        } catch (error) {
            console.error(`Error analyzing collection ${collectionName}:`, error);
            throw error;
        }
    },
    
    /**
     * Generate index recommendations based on common patterns
     */
    generateRecommendations: function(collectionName, currentIndexes, options) {
        const recommendations = [];
        
        // Common index patterns for different collections
        const commonPatterns = {
            'facilities': [
                { fields: { isActive: 1, order: 1 }, description: 'Optimize sorting and filtering active facilities' },
                { fields: { path: 1 }, description: 'Quick lookup by path/URL' },
                { fields: { title: 1 }, description: 'Text search and sorting by title' }
            ],
            'rooms': [
                { fields: { isActive: 1, price: 1 }, description: 'Filter active rooms by price' },
                { fields: { roomType: 1, isAvailable: 1 }, description: 'Quick room availability lookup' },
                { fields: { capacity: 1 }, description: 'Filter by room capacity' }
            ],
            'users': [
                { fields: { email: 1 }, description: 'Quick user lookup by email', unique: true },
                { fields: { createdAt: -1 }, description: 'Sort users by registration date' },
                { fields: { isActive: 1, role: 1 }, description: 'Filter active users by role' }
            ],
            'reservations': [
                { fields: { userId: 1, createdAt: -1 }, description: 'User reservation history' },
                { fields: { status: 1, date: 1 }, description: 'Filter reservations by status and date' },
                { fields: { roomId: 1, checkInDate: 1 }, description: 'Room availability checking' }
            ]
        };
        
        // Check if recommended indexes already exist
        const collectionPatterns = commonPatterns[collectionName] || [];
        
        collectionPatterns.forEach(pattern => {
            const indexExists = currentIndexes.some(idx => 
                this.indexesMatch(idx.key, pattern.fields)
            );
            
            if (!indexExists) {
                recommendations.push({
                    ...pattern,
                    action: 'CREATE',
                    estimatedImpact: 'High',
                    sql: `db.${collectionName}.createIndex(${JSON.stringify(pattern.fields)})`
                });
            }
        });
        
        // Check for redundant indexes
        currentIndexes.forEach((index, indexIndex) => {
            // Skip default _id index
            if (index.name === '_id_') return;
            
            // Check if this index is covered by another more specific index
            const isRedundant = currentIndexes.some((otherIndex, otherIndexIndex) => 
                otherIndexIndex !== indexIndex && 
                this.isIndexRedundant(otherIndex.key, index.key)
            );
            
            if (isRedundant) {
                recommendations.push({
                    fields: index.key,
                    description: 'Redundant index - can be removed',
                    action: 'DROP',
                    estimatedImpact: 'Medium',
                    sql: `db.${collectionName}.dropIndex("${index.name}")`
                });
            }
        });
        
        return recommendations;
    },
    
    /**
     * Check if two index specifications match
     */
    indexesMatch: function(index1, index2) {
        const keys1 = Object.keys(index1);
        const keys2 = Object.keys(index2);
        
        if (keys1.length !== keys2.length) return false;
        
        return keys1.every(key => 
            index1[key] === index2[key] && key in index2
        );
    },
    
    /**
     * Check if one index is redundant compared to another
     */
    isIndexRedundant: function(moreSpecificIndex, lessSpecificIndex) {
        const specificKeys = Object.keys(moreSpecificIndex);
        const generalKeys = Object.keys(lessSpecificIndex);
        
        // The more specific index must contain all keys of the general index
        return generalKeys.every(key => key in moreSpecificIndex);
    },
    
    /**
     * Create recommended indexes for a collection
     */
    applyRecommendations: async function(model, recommendations) {
        const collection = model.collection;
        const results = [];
        
        for (const recommendation of recommendations) {
            if (recommendation.action === 'CREATE') {
                try {
                    await collection.createIndex(recommendation.fields);
                    results.push({
                        success: true,
                        action: 'CREATE',
                        index: recommendation.fields,
                        message: `Index created successfully`
                    });
                } catch (error) {
                    results.push({
                        success: false,
                        action: 'CREATE',
                        index: recommendation.fields,
                        error: error.message
                    });
                }
            } else if (recommendation.action === 'DROP') {
                try {
                    // For drop, we need the index name
                    const indexName = Object.keys(recommendation.fields).map(key => 
                        `${key}_${recommendation.fields[key]}`
                    ).join('_');
                    
                    await collection.dropIndex(indexName);
                    results.push({
                        success: true,
                        action: 'DROP',
                        index: recommendation.fields,
                        message: `Index dropped successfully`
                    });
                } catch (error) {
                    results.push({
                        success: false,
                        action: 'DROP',
                        index: recommendation.fields,
                        error: error.message
                    });
                }
            }
        }
        
        return results;
    },
    
    /**
     * Get index statistics for a collection
     */
    getIndexStats: async function(model) {
        const collection = model.collection;
        try {
            const stats = await collection.stats();
            return {
                size: stats.size,
                count: stats.count,
                avgObjSize: stats.avgObjSize,
                storageSize: stats.storageSize,
                totalIndexSize: stats.totalIndexSize,
                indexSizes: stats.indexSizes
            };
        } catch (error) {
            console.error('Error getting index stats:', error);
            throw error;
        }
    },
    
    /**
     * Compact collection and rebuild indexes
     */
    optimizeCollection: async function(model) {
        const collection = model.collection;
        try {
            console.log(`🔄 Optimizing collection: ${collection.collectionName}`);
            
            // Rebuild indexes
            await collection.reIndex();
            console.log('✅ Indexes rebuilt successfully');
            
            // Compact collection (if supported)
            try {
                await collection.compact();
                console.log('✅ Collection compacted successfully');
            } catch (compactError) {
                console.log('ℹ️  Compact operation not supported or not needed');
            }
            
            return { success: true, message: 'Collection optimization completed' };
        } catch (error) {
            console.error('Error optimizing collection:', error);
            return { success: false, error: error.message };
        }
    }
};

module.exports = indexOptimizer;
