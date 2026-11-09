const os = require('os');
// Configure libuv threadpool size to leverage full hardware concurrency
const CPU_COUNT = os.cpus().length || 4;
process.env.UV_THREADPOOL_SIZE = String(Math.max(8, CPU_COUNT));

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const leadsRouter = require('./routes/leads');
const searchRouter = require('./routes/search');
const osintRouter = require('./routes/osint');
const settingsRouter = require('./routes/settings');
const radarRouter = require('./routes/radar');
const exportRouter = require('./routes/export');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Core REST API Routes
app.use('/api/leads', leadsRouter);
app.use('/api/search', searchRouter);
app.use('/api/osint', osintRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/radar', radarRouter);
app.use('/api/export', exportRouter);

// Root health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Quarry Lead Hunting & OSINT Engine'
  });
});

// Serve static client assets if built
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
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
    console.log(`[Quarry Server] Minimal Core Running on http://localhost:${PORT}`);
  });
}

module.exports = app;
