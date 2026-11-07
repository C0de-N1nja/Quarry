const express = require('express');
const router = express.Router();
const outreachController = require('../controllers/outreachController');

router.get('/outbox', outreachController.getOutbox);
router.get('/smart-schedule/:leadId', outreachController.getSmartSchedule);
router.post('/queue', outreachController.queueEmail);
router.post('/send/:outboxId', outreachController.sendEmail);
router.post('/send-direct', outreachController.sendDirect);
router.delete('/outbox/:id', outreachController.deleteOutboxItem);
router.all('/unsubscribe', outreachController.handleUnsubscribe);

module.exports = router;
