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

router
  .route('/:id')
  .get(protect, authorize('admin'), validateTableId, tableController.getTableById)
  .put(protect, authorize('admin'), validateTableId, validateTableUpdate, tableController.updateTable)
  .delete(protect, authorize('admin'), validateTableId, tableController.deleteTable);

// Bulk operations routes
router
  .route('/bulk')
  .put(protect, authorize('admin'), validateBulkUpdate, tableController.bulkUpdateTables)
  .delete(protect, authorize('admin'), validateBulkUpdate, tableController.bulkDeleteTables);

// Analytics route
router.get('/analytics', protect, authorize('admin'), validateAnalyticsQuery, tableController.getTableAnalytics);

// Available tables route (public access for reservations)
router.get('/available', validateAvailableTablesQuery, tableController.getAvailableTables);

// Table transfer route
router.put('/:id/transfer', protect, authorize('admin'), validateTableId, tableController.transferTable);

// Maintenance history route
router.get('/:id/maintenance', protect, authorize('admin'), validateTableId, tableController.getTableMaintenanceHistory);

// Export route
router.get('/export', protect, authorize('admin'), tableController.exportTables);

module.exports = router;
