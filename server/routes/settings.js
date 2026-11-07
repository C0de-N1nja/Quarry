const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

router.get('/', settingsController.getSettings);
router.post('/', settingsController.updateSettings);
router.post('/test-smtp', settingsController.testSmtp);

// Cloudflare Tunnel endpoints
router.get('/tunnel', settingsController.getTunnelStatus);
router.post('/tunnel/start', settingsController.startTunnel);
router.post('/tunnel/stop', settingsController.stopTunnel);
router.post('/tunnel/custom-url', settingsController.setCustomDomain);

// Multi-Inbox Pool endpoints
router.get('/inboxes', settingsController.getInboxes);
router.post('/inboxes', settingsController.addInbox);
router.delete('/inboxes/:id', settingsController.deleteInbox);
router.patch('/inboxes/:id/toggle', settingsController.toggleInbox);

module.exports = router;
