// validations/Table/table.validation.js
const { body, param, query } = require('express-validator');

// Validation for creating table
const validateTable = [
  body('tableNumber')
    .notEmpty()
    .withMessage('Table number is required')
    .isString()
    .withMessage('Table number must be a string')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Table number must be between 1 and 20 characters')
    .matches(/^[A-Za-z0-9\-_]+$/)
    .withMessage('Table number can only contain letters, numbers, hyphens, and underscores'),

  body('section')
    .notEmpty()
    .withMessage('Section is required')
    .isIn(['restaurant', 'bar', 'outdoor', 'private', 'patio', 'rooftop', 'vip'])
    .withMessage('Invalid section'),

  body('capacity')
    .isInt({ min: 1, max: 50 })
    .withMessage('Capacity must be between 1 and 50'),

  body('status')
    .optional()
    .isIn(['available', 'reserved', 'occupied', 'dirty', 'maintenance', 'out_of_service'])
    .withMessage('Invalid status'),

  body('locationDescription')
    .optional()
    .isString()
    .withMessage('Location description must be a string')
    .isLength({ max: 200 })
    .withMessage('Location description cannot exceed 200 characters'),

  body('floor')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Floor must be a positive integer'),

  body('coordinates')
    .optional()
    .isObject()
    .withMessage('Coordinates must be an object')
    .custom((coords) => {
      if (coords.x !== undefined && (typeof coords.x !== 'number' || coords.x < 0)) {
        throw new Error('Coordinate x must be a non-negative number');
      }
      if (coords.y !== undefined && (typeof coords.y !== 'number' || coords.y < 0)) {
        throw new Error('Coordinate y must be a non-negative number');
      }
      return true;
    }),

  body('features')
    .optional()
    .isArray()
    .withMessage('Features must be an array')
    .custom((features) => {
      const validFeatures = [
        'wheelchair', 'highchair', 'window', 'booth', 'private', 'tv',
        'fireplace', 'corner', 'near_kitchen', 'romantic', 'family_friendly'
      ];
      if (features && features.length > 0) {
        for (let feature of features) {
          if (!validFeatures.includes(feature)) {
            throw new Error(`Invalid feature: ${feature}`);
          }
        }
      }
      return true;
    }),

  body('priority')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Priority must be between 1 and 10'),

  body('maintenanceSchedule')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'as_needed'])
    .withMessage('Invalid maintenance schedule'),

  body('specialNotes')
    .optional()
    .isString()
    .withMessage('Special notes must be a string')
    .isLength({ max: 500 })
    .withMessage('Special notes cannot exceed 500 characters'),
];

// Validation for updating table (tableNumber is optional)
const validateTableUpdate = [
  body('tableNumber')
    .optional()
    .isString()
    .withMessage('Table number must be a string')
    .trim()
    .notEmpty()
    .withMessage('Table number cannot be empty if provided')
    .isLength({ min: 1, max: 20 })
    .withMessage('Table number must be between 1 and 20 characters')
    .matches(/^[A-Za-z0-9\-_]+$/)
    .withMessage('Table number can only contain letters, numbers, hyphens, and underscores'),

  body('section')
    .optional()
    .isIn(['restaurant', 'bar', 'outdoor', 'private', 'patio', 'rooftop', 'vip'])
    .withMessage('Invalid section'),

  body('capacity')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Capacity must be between 1 and 50'),

  body('status')
    .optional()
    .isIn(['available', 'reserved', 'occupied', 'dirty', 'maintenance', 'out_of_service'])
    .withMessage('Invalid status'),

  body('locationDescription')
    .optional()
    .isString()
    .withMessage('Location description must be a string')
    .isLength({ max: 200 })
    .withMessage('Location description cannot exceed 200 characters'),

  body('floor')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Floor must be a positive integer'),

  body('coordinates')
    .optional()
    .isObject()
    .withMessage('Coordinates must be an object')
    .custom((coords) => {
      if (coords.x !== undefined && (typeof coords.x !== 'number' || coords.x < 0)) {
        throw new Error('Coordinate x must be a non-negative number');
      }
      if (coords.y !== undefined && (typeof coords.y !== 'number' || coords.y < 0)) {
        throw new Error('Coordinate y must be a non-negative number');
      }
      return true;
    }),

  body('features')
    .optional()
    .isArray()
    .withMessage('Features must be an array')
    .custom((features) => {
      const validFeatures = [
        'wheelchair', 'highchair', 'window', 'booth', 'private', 'tv',
        'fireplace', 'corner', 'near_kitchen', 'romantic', 'family_friendly'
      ];
      if (features && features.length > 0) {
        for (let feature of features) {
          if (!validFeatures.includes(feature)) {
            throw new Error(`Invalid feature: ${feature}`);
          }
        }
      }
      return true;
    }),

  body('priority')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Priority must be between 1 and 10'),

  body('maintenanceSchedule')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'as_needed'])
    .withMessage('Invalid maintenance schedule'),

  body('specialNotes')
    .optional()
    .isString()
    .withMessage('Special notes must be a string')
    .isLength({ max: 500 })
    .withMessage('Special notes cannot exceed 500 characters'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

// Validation for bulk operations
const validateBulkUpdate = [
  body('tableIds')
    .isArray({ min: 1 })
    .withMessage('Table IDs must be a non-empty array')
    .custom((tableIds) => {
      if (!tableIds.every(id => typeof id === 'string' && id.length === 24 && /^[a-f0-9]+$/i.test(id))) {
        throw new Error('All table IDs must be valid MongoDB ObjectIds');
      }
      return true;
    }),

  body('updates')
    .isObject()
    .withMessage('Updates must be an object')
    .custom((updates) => {
      const allowedFields = [
        'status', 'section', 'assignedTo', 'features', 'priority',
        'maintenanceSchedule', 'specialNotes', 'isActive'
      ];
      const updateKeys = Object.keys(updates);
      const invalidKeys = updateKeys.filter(key => !allowedFields.includes(key));

      if (invalidKeys.length > 0) {
        throw new Error(`Invalid update fields: ${invalidKeys.join(', ')}`);
      }

      // Validate specific fields
      if (updates.status && !['available', 'reserved', 'occupied', 'dirty', 'maintenance', 'out_of_service'].includes(updates.status)) {
        throw new Error('Invalid status value');
      }

      if (updates.section && !['restaurant', 'bar', 'outdoor', 'private', 'patio', 'rooftop', 'vip'].includes(updates.section)) {
        throw new Error('Invalid section value');
      }

      if (updates.priority && (typeof updates.priority !== 'number' || updates.priority < 1 || updates.priority > 10)) {
        throw new Error('Priority must be a number between 1 and 10');
      }

      if (updates.maintenanceSchedule && !['daily', 'weekly', 'monthly', 'as_needed'].includes(updates.maintenanceSchedule)) {
        throw new Error('Invalid maintenance schedule');
      }

      if (updates.isActive !== undefined && typeof updates.isActive !== 'boolean') {
        throw new Error('isActive must be a boolean');
      }

      return true;
    }),
];

// Validation for table ID parameter
const validateTableId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid table ID format'),
];

// Validation for analytics query
const validateAnalyticsQuery = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((endDate, { req }) => {
      if (req.query.startDate && new Date(endDate) <= new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
];

// Validation for available tables query
const validateAvailableTablesQuery = [
  query('capacity')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Capacity must be between 1 and 50'),

  query('section')
    .optional()
    .isIn(['restaurant', 'bar', 'outdoor', 'private', 'patio', 'rooftop', 'vip'])
    .withMessage('Invalid section'),

  query('features')
    .optional()
    .isString()
    .withMessage('Features must be a comma-separated string'),

  query('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date'),

  query('time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:MM format'),
];

module.exports = {
  validateTable,
  validateTableUpdate,
  validateBulkUpdate,
  validateTableId,
  validateAnalyticsQuery,
  validateAvailableTablesQuery,
};
