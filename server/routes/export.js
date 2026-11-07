const express = require("express");
const router = express.Router();
const exportController = require("../controllers/exportController");

router.get("/excel", exportController.exportExcel);
router.get("/csv", exportController.exportCsv);

module.exports = router;
