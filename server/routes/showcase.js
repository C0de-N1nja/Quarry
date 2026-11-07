const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const showcaseService = require('../services/showcase-service');

// Serve static assets for each prototype under isolated namespaces
router.use('/showcase-assets/roofing', express.static('/home/beast/Projects/client-work/roofers-website'));
router.use('/showcase-assets/roofing-trust', express.static('/home/beast/Projects/client-work/roofing-showcase/trust-my-roofer'));
router.use('/showcase-assets/restaurant', express.static('/home/beast/Projects/research/Internet Research/restaurant-showcase'));
router.use('/showcase-assets/contractor', express.static('/home/beast/Projects/client-work/roofing-showcase/shock-and-awe'));

// API list of available showcase templates
router.get('/api/showcase/list', (req, res) => {
  res.json({
    success: true,
    showcases: showcaseService.getAllShowcases()
  });
});

// Serve the HTML for a given niche showcase
router.get('/showcase/:niche', (req, res) => {
  try {
    const niche = req.params.niche;
    const html = showcaseService.renderPrototype(niche);
    res.send(html);
  } catch (err) {
    res.status(404).send(`<h3>${err.message}</h3>`);
  }
});

module.exports = router;
