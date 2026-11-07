const exportService = require("../services/export-service");

/**
 * ExportController: Serves binary Excel (.xlsx) and CSV downloads for leads and OSINT dossiers.
 */
class ExportController {
  async exportExcel(req, res) {
    try {
      const filter = req.query.filter || "no_website";
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const buffer = await exportService.generateExcelBuffer(filter, baseUrl);
      const dateStr = new Date().toISOString().split("T")[0];
      const filename = `client-hunter-leads-${filter}-${dateStr}.xlsx`;

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", buffer.length);
      return res.send(buffer);
    } catch (err) {
      console.error("Excel Export Error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async exportCsv(req, res) {
    try {
      const filter = req.query.filter || "no_website";
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const buffer = await exportService.generateCsvBuffer(filter, baseUrl);
      const dateStr = new Date().toISOString().split("T")[0];
      const filename = `client-hunter-leads-${filter}-${dateStr}.csv`;

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", buffer.length);
      return res.send(buffer);
    } catch (err) {
      console.error("CSV Export Error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new ExportController();