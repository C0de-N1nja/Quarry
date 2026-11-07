const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');

router.get('/', templateController.getTemplates);
router.post('/', templateController.saveTemplate);
router.post('/preview', templateController.previewPitch);

module.exports = router;
