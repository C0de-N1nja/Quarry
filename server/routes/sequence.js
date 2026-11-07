const express = require('express');
const router = express.Router();
const sequenceController = require('../controllers/sequenceController');

router.get('/due', sequenceController.getDueFollowups);
router.get('/preview/:leadId', sequenceController.previewFollowUp);
router.post('/stage/:leadId', sequenceController.stageFollowUp);

module.exports = router;
