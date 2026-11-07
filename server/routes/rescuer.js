const express = require('express');
const router = express.Router();
const rescuerController = require('../controllers/rescuerController');

// Rescuer Status & Configuration
router.get('/status', rescuerController.getStatus.bind(rescuerController));
router.post('/toggle', rescuerController.toggle.bind(rescuerController));

// Operations
router.post('/scan-now', rescuerController.scanNow.bind(rescuerController));
router.post('/test-connection', rescuerController.testConnection.bind(rescuerController));
router.post('/simulate', rescuerController.simulate.bind(rescuerController));

// Replies Management
router.get('/replies', rescuerController.getReplies.bind(rescuerController));
router.delete('/replies/:id', rescuerController.deleteReply.bind(rescuerController));

// Preventive Filter Export
router.get('/export-filter', rescuerController.exportFilter.bind(rescuerController));

module.exports = router;
