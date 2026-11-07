const express = require('express');
const router = express.Router();
const mockupController = require('../controllers/mockupController');

// REST API endpoints
router.get('/:leadId', mockupController.getMockup.bind(mockupController));
router.post('/:leadId', mockupController.generateMockup.bind(mockupController));

module.exports = router;
