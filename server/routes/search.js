const express = require('express');
const router = express.Router();
const multer = require('multer');
const searchController = require('../controllers/searchController');

const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

router.post('/', searchController.searchProspects);
router.post('/csv', upload.single('file'), searchController.uploadCsv);
router.post('/maps', searchController.searchMaps);
router.get('/maps/telemetry/:jobId', searchController.getTelemetry);
router.get('/maps/stream/:jobId', searchController.streamTelemetry);
router.post('/maps/cancel/:jobId', searchController.cancelTelemetry);

module.exports = router;
