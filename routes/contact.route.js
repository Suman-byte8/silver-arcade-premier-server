const express = require('express');
const router = express.Router();
const { sendContactMessage } = require('../controllers/contact.controller');

// POST /api/contact - send contact form message
router.post('/', sendContactMessage);

module.exports = router;
