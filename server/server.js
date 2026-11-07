const os = require('os');
// Configure libuv threadpool size to leverage full hardware concurrency (12 cores)
const CPU_COUNT = os.cpus().length || 4;
process.env.UV_THREADPOOL_SIZE = String(Math.max(8, CPU_COUNT));

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const leadsRouter = require('./routes/leads');
const searchRouter = require('./routes/search');
const osintRouter = require('./routes/osint');
const templatesRouter = require('./routes/templates');
const outreachRouter = require('./routes/outreach');
const settingsRouter = require('./routes/settings');
const mockupRouter = require('./routes/mockup');
const radarRouter = require('./routes/radar');
const sequenceRouter = require('./routes/sequence');
const rescuerRouter = require('./routes/rescuer');
const autopilotRouter = require('./routes/autopilot');
const showcaseRouter = require('./routes/showcase');
const exportRouter = require('./routes/export');
const mockupController = require('./controllers/mockupController');
const spamRescuerService = require('./services/spam-rescuer-service');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Niche Showcase Prototypes from Local Laptop
app.use('/', showcaseRouter);

// Standalone Public Client Preview Routes
app.get('/mockup/:leadId', mockupController.renderPublicView.bind(mockupController));

// REST API Routes
app.use('/api/leads', leadsRouter);
app.use('/api/search', searchRouter);
app.use('/api/osint', osintRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/outreach', outreachRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/mockup', mockupRouter);
app.use('/api/radar', radarRouter);
app.use('/api/sequence', sequenceRouter);
app.use('/api/rescuer', rescuerRouter);
app.use('/api/autopilot', autopilotRouter);
app.use('/api/export', exportRouter);

// Root health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Client Hunting Automation Engine'
  });
});

// Serve standalone client prototype pages
app.use('/prototypes', express.static(path.join(__dirname, 'public/prototypes')));

// Serve static client assets if built
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/prototypes')) return next();
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) next();
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`⚡ Client Hunting Automation Backend running on http://localhost:${PORT}`);
    // Initialize background spam monitor
    spamRescuerService.initBackgroundMonitor();
  });
}

module.exports = app;
