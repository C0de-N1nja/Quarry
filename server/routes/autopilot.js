const express = require('express');
const router = express.Router();
const autopilotController = require('../controllers/autopilotController');

router.post('/run', autopilotController.runAutoPilot.bind(autopilotController));
router.get('/status', autopilotController.getStatus.bind(autopilotController));

module.exports = router;
