// controllers/Table/table.controller.js
const { validationResult } = require('express-validator');
const Table = require('../../schema/Table/table.model'); // ✅ CORRECTED PATH
const mongoose = require('mongoose');
const { getIo, emitTableEvent } = require('../../utils/socketManager');


// @desc    Create new table
// @route   POST /api/tables
// @access  Admin
const createTable = async (req, res) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array(),
            });
        }

        // Check if tableNumber already exists
        const existingTable = await Table.findOne({ tableNumber: req.body.tableNumber });
        if (existingTable) {
            return res.status(400).json({
                success: false,
                message: 'Table number already exists',
            });
        }

        // Validate capacity
        if (req.body.capacity < 1 || req.body.capacity > 50) {
            return res.status(400).json({
                success: false,
                message: 'Capacity must be between 1 and 50',
            });
        }

        // Create table
        const table = new Table(req.body);
        await table.save();

        console.log('✅ Table created:', table.tableNumber); // ← DEBUG

        // Emit socket event for real-time updates
        emitTableEvent('tableCreated', table);

        res.status(201).json({
            success: true,
            data: table,
        });
    } catch (error) {
        console.error('Table Creation Error:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: Object.values(error.errors).map(err => err.message),
            });
        }
        res.status(500).json({
            success: false,
            error: 'Server Error',
        });
    }
};

// @desc    Get all tables
// @route   GET /api/tables
// @access  Admin
const getAllTables = async (req, res) => {
    try {
        const { section, status, capacity } = req.query;

        let filter = {};
        if (section) filter.section = section;
        if (status) filter.status = status;
        if (capacity) filter.capacity = parseInt(capacity);

        console.log('🔍 Table Filter:', filter); // ← DEBUG

        const tables = await Table.find(filter).sort({ section: 1, tableNumber: 1 });

        console.log('✅ Found tables:', tables.length); // ← DEBUG
        console.log('✅ Tables:', tables); // ← DEBUG

        res.status(200).json({
            success: true,
            count: tables.length,
            data: tables,
        });
    } catch (error) {
        console.error('Get All Tables Error:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error',
        });
    }
};

// @desc    Get table by ID
// @route   GET /api/tables/:id
// @access  Admin
const getTableById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Table ID is required',
            });
        }

        const table = await Table.findById(id);

        if (!table) {
            return res.status(404).json({
                success: false,
                message: 'Table not found',
            });
        }

        console.log('✅ Found table:', table.tableNumber); // ← DEBUG

        res.status(200).json({
            success: true,
            data: table,
        });
    } catch (error) {
        console.error('Get Table By ID Error:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error',
        });
    }
};


// @desc    Update table
// @route   PUT /api/tables/:id
// @access  Admin
const updateTable = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        console.log("🔧 [CONTROLLER DEBUG] Raw req.params.id:", id);
        console.log("🔧 [CONTROLLER DEBUG] Raw req.body (updateData):", JSON.stringify(updateData, null, 2));

        // --- PREVENT ASSIGNING AN ALREADY RESERVED/OCCUPIED TABLE ---
        // Check if status is being changed to 'reserved'
        if (updateData.status === 'reserved') {
            const currentTable = await Table.findById(id);
            if (currentTable && (currentTable.status === 'reserved' || currentTable.status === 'occupied')) {
                // Use 409 Conflict to indicate a resource state conflict
                return res.status(409).json({
                    success: false,
                    message: `Table ${currentTable.tableNumber || currentTable._id} is already ${currentTable.status}. Assignment failed.`,
                    errorCode: 'TABLE_NOT_AVAILABLE' // Custom code for frontend
                });
            }
            // Optional: Add check if currentReservation is already set if using that field
            // if (currentTable.currentReservation) { ... }
        }
        // --- END PREVENTION ---

        // Filter out empty strings for required fields to prevent validation errors
        const filteredUpdateData = { ...updateData };
        if (filteredUpdateData.tableNumber === '') {
            delete filteredUpdateData.tableNumber; // Prevent setting to empty
        }

        console.log("🔧 [CONTROLLER DEBUG] About to call findByIdAndUpdate");
        console.log("🔧 [CONTROLLER DEBUG] ID passed to Mongoose:", id);
        console.log("🔧 [CONTROLLER DEBUG] Filtered Update Data passed to Mongoose:", JSON.stringify(filteredUpdateData, null, 2));

        const updatedTable = await Table.findByIdAndUpdate(
            id,
            filteredUpdateData,
            {
                new: true,
                runValidators: true,
                context: 'query',
                overwrite: false, // Explicitly ensure
            }
        );

        if (!updatedTable) {
            console.log(`❌ [DEBUG] Table with ID ${id} not found.`);
            return res.status(404).json({
                success: false,
                message: 'Table not found',
            });
        }

        // Emit socket event for real-time updates
        emitTableEvent('tableUpdated', updatedTable, id);

        console.log(`✅ [DEBUG] Table ${id} updated successfully. Final document:`, {
            _id: updatedTable._id,
            tableNumber: updatedTable.tableNumber,
            status: updatedTable.status,
            lastAssignedAt: updatedTable.lastAssignedAt,
        });

        res.status(200).json({
            success: true,
            message: 'Table updated successfully',
            table: updatedTable,
        });
    } catch (error) {
        console.error('❌ [DEBUG] UPDATE TABLE ERROR (Detailed):', error);

        // Handle specific Mongoose errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => ({
                path: err.path,
                message: err.message,
                value: err.value // This will show the problematic value (e.g., '')
            }));
            console.error("❌ [DEBUG] Validation Errors:", errors);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors,
            });
        }

        if (error.name === 'CastError' || !mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Table ID format',
            });
        }

        // Handle the 409 Conflict from our check
        if (error.errorCode === 'TABLE_NOT_AVAILABLE') {
            return res.status(409).json({
                success: false,
                message: error.message,
                errorCode: error.errorCode
            });
        }

        res.status(500).json({
            success: false,
            error: 'Server Error during table update',
        });
    }
};

// @desc    Delete table
// @route   DELETE /api/tables/:id
// @access  Admin
const deleteTable = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Table ID is required',
            });
        }

        const table = await Table.findByIdAndDelete(id);

        if (!table) {
            return res.status(404).json({
                success: false,
                message: 'Table not found',
            });
        }

        // Emit socket event for real-time updates
        emitTableEvent('tableDeleted', { id: table._id }, id);

        console.log('✅ Table deleted:', table.tableNumber); // ← DEBUG

        res.status(200).json({
            success: true,
            message: 'Table deleted successfully',
        });
    } catch (error) {
        console.error('Delete Table Error:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error',
        });
    }
};

// @desc    Bulk update tables
// @route   PUT /api/tables/bulk
// @access  Admin
const bulkUpdateTables = async (req, res) => {
    try {
        const { tableIds, updates } = req.body;

        if (!tableIds || !Array.isArray(tableIds) || tableIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Table IDs array is required',
            });
        }

        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Updates object is required',
            });
        }

        // Validate updates object
        const allowedUpdates = ['status', 'section', 'assignedTo', 'features'];
        const updateKeys = Object.keys(updates);
        const invalidKeys = updateKeys.filter(key => !allowedUpdates.includes(key));

        if (invalidKeys.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Invalid update fields: ${invalidKeys.join(', ')}`,
            });
        }

        // Check if status update conflicts with existing reservations
        if (updates.status === 'reserved') {
            const reservedTables = await Table.find({
                _id: { $in: tableIds },
                $or: [
                    { status: 'reserved' },
                    { status: 'occupied' },
                    { currentReservation: { $ne: null } }
                ]
            });

            if (reservedTables.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Some tables are already reserved or occupied',
                    conflictingTables: reservedTables.map(t => t.tableNumber),
                });
            }
        }

        const result = await Table.updateMany(
            { _id: { $in: tableIds } },
            {
                ...updates,
                updatedAt: new Date(),
                ...(updates.status && { lastAssignedAt: new Date() })
            }
        );

        // Emit socket event for real-time updates
        emitTableEvent('tablesUpdated', { tableIds, updates });

        console.log(`✅ Bulk updated ${result.modifiedCount} tables`);

        res.status(200).json({
            success: true,
            message: `${result.modifiedCount} tables updated successfully`,
            modifiedCount: result.modifiedCount,
        });
    } catch (error) {
        console.error('Bulk Update Tables Error:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error during bulk update',
        });
    }
};

// @desc    Bulk delete tables
// @route   DELETE /api/tables/bulk
// @access  Admin
const bulkDeleteTables = async (req, res) => {
    try {
        const { tableIds } = req.body;

        if (!tableIds || !Array.isArray(tableIds) || tableIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Table IDs array is required',
            });
        }

        // Check for tables with active reservations
        const reservedTables = await Table.find({
            _id: { $in: tableIds },
            $or: [
                { status: 'reserved' },
                { status: 'occupied' },
                { currentReservation: { $ne: null } }
            ]
        });

        if (reservedTables.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Cannot delete tables with active reservations',
                conflictingTables: reservedTables.map(t => t.tableNumber),
            });
        }

        const result = await Table.deleteMany({ _id: { $in: tableIds } });

        // Emit socket event for real-time updates
        emitTableEvent('tablesDeleted', { tableIds });

        console.log(`✅ Bulk deleted ${result.deletedCount} tables`);

        res.status(200).json({
            success: true,
            message: `${result.deletedCount} tables deleted successfully`,
            deletedCount: result.deletedCount,
        });
    } catch (error) {
        console.error('Bulk Delete Tables Error:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error during bulk delete',
        });
    }
};

// @desc    Get table analytics
// @route   GET /api/tables/analytics
// @access  Admin
const getTableAnalytics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let dateFilter = {};

        if (startDate && endDate) {
            dateFilter = {
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };
        }

        // Overall statistics
        const totalTables = await Table.countDocuments();
        const availableTables = await Table.countDocuments({ status: 'available' });
        const reservedTables = await Table.countDocuments({ status: 'reserved' });
        const occupiedTables = await Table.countDocuments({ status: 'occupied' });
        const maintenanceTables = await Table.countDocuments({ status: 'maintenance' });

        // Section-wise breakdown
        const sectionStats = await Table.aggregate([
            {
                $group: {
                    _id: '$section',
                    count: { $sum: 1 },
                    available: {
                        $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] }
                    },
                    reserved: {
                        $sum: { $cond: [{ $eq: ['$status', 'reserved'] }, 1, 0] }
                    },
                    occupied: {
                        $sum: { $cond: [{ $eq: ['$status', 'occupied'] }, 1, 0] }
                    }
                }
            }
        ]);

        // Capacity statistics
        const capacityStats = await Table.aggregate([
            {
                $group: {
                    _id: '$capacity',
                    count: { $sum: 1 },
                    utilization: {
                        $avg: {
                            $cond: [
                                { $in: ['$status', ['reserved', 'occupied']] },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Recent activity (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentActivity = await Table.aggregate([
            {
                $match: {
                    updatedAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
                        status: '$status'
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.date': -1 }
            },
            { $limit: 30 }
        ]);

        res.status(200).json({
            success: true,
            data: {
                overview: {
                    total: totalTables,
                    available: availableTables,
                    reserved: reservedTables,
                    occupied: occupiedTables,
                    maintenance: maintenanceTables,
                    utilizationRate: totalTables > 0 ? ((reservedTables + occupiedTables) / totalTables * 100).toFixed(2) : 0
                },
                sectionBreakdown: sectionStats,
                capacityBreakdown: capacityStats,
                recentActivity: recentActivity,
                generatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Get Table Analytics Error:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error during analytics generation',
        });
    }
};

// @desc    Get available tables for reservation
// @route   GET /api/tables/available
// @access  Public/Admin
const getAvailableTables = async (req, res) => {
    try {
        const { capacity, section, features, date, time } = req.query;

        let filter = {
            status: 'available',
            // Don't assign tables that are in maintenance
            status: { $ne: 'maintenance' }
        };

        if (capacity) {
            filter.capacity = { $gte: parseInt(capacity) };
        }

        if (section) {
            filter.section = section;
        }

        if (features) {
            const featureArray = features.split(',');
            filter.features = { $all: featureArray };
        }

        // If date and time are provided, check for existing reservations
        if (date && time) {
            const Reservation = require('../../schema/Reservation/reservation.model');

            const conflictingReservations = await Reservation.find({
                reservationDate: new Date(date),
                reservationTime: time,
                status: { $in: ['confirmed', 'seated'] }
            });

            const reservedTableIds = conflictingReservations.map(r => r.tableId).filter(Boolean);
            filter._id = { $nin: reservedTableIds };
        }

        const availableTables = await Table.find(filter)
            .sort({ section: 1, tableNumber: 1 })
            .limit(50); // Limit results for performance

        console.log(`✅ Found ${availableTables.length} available tables`);

        res.status(200).json({
            success: true,
            count: availableTables.length,
            data: availableTables,
        });
    } catch (error) {
        console.error('Get Available Tables Error:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error',
        });
    }
};

// @desc    Transfer table assignment
// @route   PUT /api/tables/:id/transfer
// @access  Admin
const transferTable = async (req, res) => {
    try {
        const { id } = req.params;
        const { newTableId, reason } = req.body;

        if (!newTableId) {
            return res.status(400).json({
                success: false,
                message: 'New table ID is required',
            });
        }

        // Get both tables
        const currentTable = await Table.findById(id);
        const newTable = await Table.findById(newTableId);

        if (!currentTable || !newTable) {
            return res.status(404).json({
                success: false,
                message: 'One or both tables not found',
            });
        }

        // Check if new table is available
        if (newTable.status !== 'available') {
            return res.status(409).json({
                success: false,
                message: `Table ${newTable.tableNumber} is not available for transfer`,
            });
        }

        // Check capacity compatibility
        if (newTable.capacity < currentTable.capacity) {
            return res.status(400).json({
                success: false,
                message: 'New table capacity is less than current table',
            });
        }

        // Start transaction-like operation
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                // Update current table
                await Table.findByIdAndUpdate(id, {
                    status: 'available',
                    currentReservation: null,
                    lastFreedAt: new Date(),
                    $push: {
                        assignmentHistory: {
                            reservation: currentTable.currentReservation,
                            assignedAt: currentTable.lastAssignedAt,
                            freedAt: new Date(),
                            transferReason: reason || 'Table transfer'
                        }
                    }
                }, { session });

                // Update new table
                await Table.findByIdAndUpdate(newTableId, {
                    status: currentTable.status,
                    currentReservation: currentTable.currentReservation,
                    lastAssignedAt: new Date(),
                    lastOccupiedAt: currentTable.lastOccupiedAt,
                    assignedTo: currentTable.assignedTo
                }, { session });
            });

            console.log(`✅ Table ${currentTable.tableNumber} transferred to ${newTable.tableNumber}`);

            res.status(200).json({
                success: true,
                message: 'Table transferred successfully',
                data: {
                    fromTable: currentTable.tableNumber,
                    toTable: newTable.tableNumber
                }
            });
        } catch (error) {
            throw error;
        } finally {
            session.endSession();
        }
    } catch (error) {
        console.error('Transfer Table Error:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error during table transfer',
        });
    }
};

// @desc    Get table maintenance history
// @route   GET /api/tables/:id/maintenance
// @access  Admin
const getTableMaintenanceHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 10 } = req.query;

        const table = await Table.findById(id);
        if (!table) {
            return res.status(404).json({
                success: false,
                message: 'Table not found',
            });
        }

        // Get maintenance records (you might want to create a separate Maintenance model)
        // For now, we'll use the assignment history and status changes
        const maintenanceHistory = table.assignmentHistory
            .filter(record => record.maintenanceNote)
            .sort((a, b) => new Date(b.freedAt || b.assignedAt) - new Date(a.freedAt || a.assignedAt))
            .slice(0, parseInt(limit));

        res.status(200).json({
            success: true,
            data: {
                tableNumber: table.tableNumber,
                maintenanceHistory: maintenanceHistory,
                totalRecords: maintenanceHistory.length
            }
        });
    } catch (error) {
        console.error('Get Maintenance History Error:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error',
        });
    }
};

// @desc    Export tables data
// @route   GET /api/tables/export
// @access  Admin
const exportTables = async (req, res) => {
    try {
        const { format = 'csv', section, status } = req.query;

        let filter = {};
        if (section) filter.section = section;
        if (status) filter.status = status;

        const tables = await Table.find(filter)
            .sort({ section: 1, tableNumber: 1 })
            .populate('assignedTo', 'name')
            .populate('currentReservation', 'customerName reservationDate');

        if (format === 'csv') {
            const csvData = tables.map(table => ({
                'Table Number': table.tableNumber,
                'Section': table.section,
                'Capacity': table.capacity,
                'Status': table.status,
                'Features': table.features ? table.features.join(', ') : '',
                'Assigned To': table.assignedTo ? table.assignedTo.name : 'Unassigned',
                'Current Reservation': table.currentReservation ? table.currentReservation.customerName : 'None',
                'Created At': table.createdAt,
                'Last Updated': table.updatedAt
            }));

            // Convert to CSV string
            const csvString = [
                Object.keys(csvData[0]).join(','),
                ...csvData.map(row => Object.values(row).join(','))
            ].join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=tables-export.csv');
            res.status(200).send(csvString);
        } else {
            res.status(400).json({
                success: false,
                message: 'Unsupported export format',
            });
        }
    } catch (error) {
        console.error('Export Tables Error:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error during export',
        });
    }
};

module.exports = {
    createTable,
    getAllTables,
    getTableById,
    updateTable,
    deleteTable,
    bulkUpdateTables,
    bulkDeleteTables,
    getTableAnalytics,
    getAvailableTables,
    transferTable,
    getTableMaintenanceHistory,
    exportTables,
};
