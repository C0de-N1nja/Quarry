const express = require('express');
const router = express.Router();
const osintController = require('../controllers/osintController');

// Batch OSINT and telemetry routes
router.post('/batch', osintController.runBatchOsint.bind(osintController));
router.post('/cancel/:jobId', osintController.cancelJob.bind(osintController));
router.get('/stream/:jobId', osintController.streamProgress.bind(osintController));
router.get('/telemetry/:jobId', osintController.getTelemetry.bind(osintController));
router.get('/active-job', osintController.getActiveJob.bind(osintController));

// Reset OSINT data across leads and contacts
router.post('/reset', osintController.resetOsint.bind(osintController));

// Social account resolution from email address
router.post('/social-resolve', osintController.resolveSocialAccounts.bind(osintController));

// Single lead OSINT
router.post('/owner/:leadId', osintController.enrichOwner.bind(osintController));
router.post('/:leadId', osintController.enrichLead.bind(osintController));

module.exports = router;
