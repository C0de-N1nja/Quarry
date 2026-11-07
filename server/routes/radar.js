const express = require('express');
const router = express.Router();
const radarController = require('../controllers/radarController');

router.get('/', radarController.search);
router.post('/proposal', radarController.generateProposal);
router.post('/convert', radarController.convertToLead);

module.exports = router;
