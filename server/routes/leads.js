const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');

// Leads CRUD & Metrics routes
router.get('/', leadController.getLeads);
router.get('/stats', leadController.getStats);
router.post('/clean-websites', leadController.cleanWebsites);
router.post('/purge-all', leadController.purgeAll);
router.post('/auto-resolve-websites', leadController.autoResolveAll);
router.get('/:id', leadController.getLeadById);
router.post('/', leadController.createLead);
router.put('/:id', leadController.updateLead);
router.delete('/:id', leadController.deleteLead);
router.patch('/:id/stage', leadController.updateStage);
router.post('/:id/resolve-website', leadController.resolveWebsite);
router.post('/:id/scan-phone', leadController.scanPhone);
router.post('/:id/scan-holehe', leadController.scanHolehe);

module.exports = router;
