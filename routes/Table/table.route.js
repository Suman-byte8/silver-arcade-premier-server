// routes/Table/table.routes.js
const express = require('express');
const router = express.Router();

// Import controller
const tableController = require('../../controllers/Table/table.controller');

// Import middleware
const { protect, authorize } = require('../../middlewares/authMiddleware');

const {
  validateTable,
  validateTableUpdate,
  validateBulkUpdate,
  validateTableId,
  validateAnalyticsQuery,
  validateAvailableTablesQuery
} = require('../../validations/table.validation');

// Table routes
router
  .route('/')
  .get(protect, authorize('admin'), tableController.getAllTables)
  .post(protect, authorize('admin'), validateTable, tableController.createTable);

router.get('/analytics', protect, authorize('admin'), tableController.getTableAnalytics);

// Bulk operations routes
router
  .route('/bulk')
  .put(protect, authorize('admin'), validateBulkUpdate, tableController.bulkUpdateTables)
  .delete(protect, authorize('admin'), validateBulkUpdate, tableController.bulkDeleteTables);

// Reset all tables route (must be before :id routes to avoid conflicts)
router.put('/reset-all', protect, authorize('admin'), tableController.resetAllTables);

// Available tables route (public viewing for reservations)
router.get('/available', tableController.getAvailableTables);

// Export route
router.get('/export', protect, authorize('admin'), tableController.exportTables);

router
  .route('/:id')
  .get(protect, authorize('admin'), validateTableId, tableController.getTableById)
  .put(protect, authorize('admin'), validateTableId, validateTableUpdate, tableController.updateTable)
  .delete(protect, authorize('admin'), validateTableId, tableController.deleteTable);

// Table status transition route
router.put('/:id/status', protect, authorize('admin'), validateTableId, tableController.updateTableStatus);

// Table transfer route
router.put('/:id/transfer', protect, authorize('admin'), validateTableId, tableController.transferTable);

// Maintenance history route
router.get('/:id/maintenance', protect, authorize('admin'), validateTableId, tableController.getTableMaintenanceHistory);

module.exports = router;
