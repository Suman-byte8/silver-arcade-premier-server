// controllers/Table/table.controller.js
const { validationResult } = require('express-validator');
const Table = require('../../schema/Table/table.model'); 
const mongoose = require('mongoose');
const { getIo, emitTableEvent } = require('../../utils/socketManager');
const { emitReservationEvent } = require('../../utils/socketManager');


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

        const table = await Table.findById(id)
            .populate('assignedTo', 'firstName lastName role')
            .populate('assignmentHistory.assignedBy', 'firstName lastName role');

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
    const { id } = req.params;
    try {
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

        // Build atomic update with $set/$push to handle history appends safely
        const updateOps = { $set: {}, $push: {} };

        // Allow simple scalar fields directly
        const directSetFields = [
            'status','section','capacity','locationDescription','floor','coordinates',
            'features','priority','isActive','specialNotes','currentGuest','lastAssignedAt',
            'lastOccupiedAt','lastFreedAt','currentReservation'
        ];
        for (const key of Object.keys(filteredUpdateData)) {
            if (key === 'historyEntry') continue; // handled below
            if (key === 'assignmentHistory') {
                // If full array provided, set it (use cautiously)
                updateOps.$set.assignmentHistory = filteredUpdateData.assignmentHistory;
                continue;
            }
            if (directSetFields.includes(key)) {
                updateOps.$set[key] = filteredUpdateData[key];
            }
        }

        // Append single history entry if provided
        if (filteredUpdateData.historyEntry) {
            updateOps.$push.assignmentHistory = filteredUpdateData.historyEntry;
        }

        // Clean empty operators
        if (Object.keys(updateOps.$set).length === 0) delete updateOps.$set;
        if (!updateOps.$push.assignmentHistory) delete updateOps.$push;

        const updatedTable = await Table.findByIdAndUpdate(
            id,
            Object.keys(updateOps).length ? updateOps : filteredUpdateData,
            {
                new: true,
                runValidators: true,
                context: 'query',
                overwrite: false,
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
        // If status changed to occupied/available/reserved, emit a specific event
        if (filteredUpdateData.status) {
            emitTableEvent('tableStatusChanged', { tableId: updatedTable._id, tableNumber: updatedTable.tableNumber, status: updatedTable.status }, id);
        }

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
                    { status: 'occupied' }
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

        console.log('🔍 Analytics dateFilter:', dateFilter);

        // Overall statistics
        const totalTables = await Table.countDocuments(dateFilter);
        const availableTables = await Table.countDocuments({ ...dateFilter, status: 'available' });
        const reservedTables = await Table.countDocuments({ ...dateFilter, status: 'reserved' });
        const occupiedTables = await Table.countDocuments({ ...dateFilter, status: 'occupied' });
        const maintenanceTables = await Table.countDocuments({ ...dateFilter, status: 'maintenance' });

        console.log('✅ Overall stats:', { totalTables, availableTables, reservedTables, occupiedTables, maintenanceTables });

        // Section-wise breakdown
        const sectionStats = await Table.aggregate([
            { $match: dateFilter },
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
                    },
                    maintenance: {
                        $sum: { $cond: [{ $eq: ['$status', 'maintenance'] }, 1, 0] }
                    }
                }
            },
            { $sort: { count: -1 } }
        ]);

        console.log('✅ Section stats:', sectionStats);

        // Capacity distribution
        const capacityStats = await Table.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: '$capacity',
                    count: { $sum: 1 },
                    available: {
                        $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        console.log('✅ Capacity stats:', capacityStats);

        // Utilization trends (if date range provided)
        let utilizationTrends = [];
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

            if (daysDiff <= 30) { // Only calculate trends for reasonable date ranges
                utilizationTrends = await Table.aggregate([
                    {
                        $match: {
                            createdAt: { $gte: start, $lte: end }
                        }
                    },
                    {
                        $group: {
                            _id: {
                                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                            },
                            total: { $sum: 1 },
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
                    },
                    {
                        $project: {
                            date: '$_id',
                            utilizationRate: {
                                $multiply: [
                                    { $divide: [{ $add: ['$reserved', '$occupied'] }, '$total'] },
                                    100
                                ]
                            },
                            total: 1,
                            available: 1,
                            reserved: 1,
                            occupied: 1
                        }
                    },
                    { $sort: { date: 1 } }
                ]);
            }
        }

        // Calculate utilization rate
        const totalActiveTables = totalTables - maintenanceTables;
        const utilizationRate = totalActiveTables > 0 ?
            ((reservedTables + occupiedTables) / totalActiveTables * 100).toFixed(2) : 0;

        res.status(200).json({
            success: true,
            data: {
                overview: {
                    total: totalTables,
                    available: availableTables,
                    reserved: reservedTables,
                    occupied: occupiedTables,
                    maintenance: maintenanceTables,
                    utilizationRate: parseFloat(utilizationRate)
                },
                sectionBreakdown: sectionStats,
                capacityDistribution: capacityStats,
                utilizationTrends: utilizationTrends,
                generatedAt: new Date().toISOString(),
                dateRange: startDate && endDate ? { startDate, endDate } : null
            }
        });
    } catch (error) {
        console.error('❌ Get Table Analytics Error:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Server Error during analytics generation',
            details: error.message
        });
    }
};

// @desc    Get available tables for reservation
// @route   GET /api/tables/available
// @access  Public/Admin
const getAvailableTables = async (req, res) => {
    try {
        console.log('🔍 [DEBUG] getAvailableTables called with query:', req.query);

        // Simplified version for debugging
        const availableTables = await Table.find({ status: 'available' })
            .sort({ section: 1, tableNumber: 1 })
            .limit(50);

        console.log(`✅ Found ${availableTables.length} available tables`);

        res.status(200).json({
            success: true,
            count: availableTables.length,
            data: availableTables,
        });
    } catch (error) {
        console.error('❌ Get Available Tables Error:', error.message);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: error.message || 'Server Error',
        });
    }
};

// @desc    Update table status and manage assignment lifecycle
// @route   PUT /api/tables/:id/status
// @access  Admin
const updateTableStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reservationId, reservationType, guestName, assignedBy, notes, reservationStatus, assignedAt } = req.body || {};

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'Invalid Table ID format' });
        }
        if (!status) {
            return res.status(400).json({ success: false, message: 'Status is required' });
        }

        const table = await Table.findById(id);
        if (!table) {
            return res.status(404).json({ success: false, message: 'Table not found' });
        }

        const now = new Date();

        // Prevent reserving a busy table
        if (status === 'reserved' && (table.status === 'reserved' || table.status === 'occupied')) {
            return res.status(409).json({ success: false, message: `Table ${table.tableNumber} is already ${table.status}`, errorCode: 'TABLE_NOT_AVAILABLE' });
        }

        // Transition handling
        if (status === 'reserved') {
            table.status = 'reserved';
            table.lastAssignedAt = now;
            table.currentReservation = {
                reservationId: reservationId || table.currentReservation?.reservationId || null,
                reservationType: reservationType || table.currentReservation?.reservationType || 'restaurant',
                guestName: guestName || table.currentReservation?.guestName || table.currentGuest || null,
                assignedBy: assignedBy || table.currentReservation?.assignedBy || null
            };
            if (guestName) table.currentGuest = guestName;
            // Set assignedTo from assignedBy if available
            if (assignedBy) {
                table.assignedTo = assignedBy;
            }
        } else if (status === 'occupied') {
            table.status = 'occupied';
            table.lastOccupiedAt = now;
        } else if (status === 'available') {
            // Free table and append assignment history if there was an active reservation
            const active = table.currentReservation || {};
            if (active && (active.reservationId || active.guestName)) {
                table.assignmentHistory.push({
                    reservationId: active.reservationId || null,
                    reservationType: active.reservationType || 'restaurant',
                    guestName: active.guestName || table.currentGuest || 'Guest',
                    assignedAt: assignedAt ? new Date(assignedAt) : (table.lastAssignedAt || now),
                    freedAt: now,
                    assignedBy: active.assignedBy || assignedBy || null,
                    notes: notes || undefined
                });
            }
            table.status = 'available';
            table.lastFreedAt = now;
            table.currentReservation = { reservationId: null, reservationType: 'restaurant', guestName: null, assignedBy: null };
            table.currentGuest = null;
        } else if (['dirty','maintenance','out_of_service'].includes(status)) {
            table.status = status;
        } else {
            return res.status(400).json({ success: false, message: 'Invalid status transition' });
        }

        await table.save();

        // Emit socket events for table
        emitTableEvent('tableUpdated', table, id);
        emitTableEvent('tableStatusChanged', { tableId: table._id, tableNumber: table.tableNumber, status: table.status }, id);

        // Optionally propagate reservation status change
        if (reservationId && reservationStatus) {
            emitReservationEvent('reservationStatusChanged', { id: reservationId, status: reservationStatus }, reservationId);
        }

        return res.status(200).json({ success: true, data: table });
    } catch (error) {
        console.error('Update Table Status Error:', error);
        return res.status(500).json({ success: false, message: 'Server Error during status update' });
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

// @desc    Reset all tables to available status
// @route   PUT /api/tables/reset-all
// @access  Admin
const resetAllTables = async (req, res) => {
    try {
        const now = new Date();

        // Update all tables to available status, clearing reservations and assignments
        const result = await Table.updateMany(
            {}, // Update all tables
            {
                status: 'available',
                assignedTo: null,
                currentReservation: { reservationId: null, reservationType: 'restaurant', guestName: null, assignedBy: null },
                currentGuest: null,
                lastFreedAt: now,
                updatedAt: now
            }
        );

        // Emit socket event for real-time updates
        emitTableEvent('tablesReset', { count: result.modifiedCount });

        console.log(`✅ Reset ${result.modifiedCount} tables to available status`);

        res.status(200).json({
            success: true,
            message: `${result.modifiedCount} tables reset to available status`,
            modifiedCount: result.modifiedCount,
        });
    } catch (error) {
        console.error('Reset All Tables Error:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error during table reset',
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
    // Status-specific transitions
    updateTableStatus,
    deleteTable,
    bulkUpdateTables,
    bulkDeleteTables,
    resetAllTables,
    getTableAnalytics,
    getAvailableTables,
    transferTable,
    getTableMaintenanceHistory,
    exportTables,
};
