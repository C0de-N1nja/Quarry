/**
 * Local SEO Geo-Grid Rank Calculator
 * Simulates 3x3 geographic rank dispersion around a local business location.
 * Demonstrates search visibility decay and lost competitor revenue radius.
 */

const GRID_NODES = [
  { id: 'nw', name: 'North-West', dLat: 0.022, dLng: -0.025, distanceMi: 2.1 },
  { id: 'n',  name: 'North',      dLat: 0.025, dLng: 0,      distanceMi: 1.7 },
  { id: 'ne', name: 'North-East', dLat: 0.022, dLng: 0.025,  distanceMi: 2.1 },
  { id: 'w',  name: 'West',       dLat: 0,     dLng: -0.032, distanceMi: 1.8 },
  { id: 'c',  name: 'Center',     dLat: 0,     dLng: 0,      distanceMi: 0.0 },
  { id: 'e',  name: 'East',       dLat: 0,     dLng: 0.032,  distanceMi: 1.8 },
  { id: 'sw', name: 'South-West', dLat: -0.022, dLng: -0.025, distanceMi: 2.1 },
  { id: 's',  name: 'South',      dLat: -0.025, dLng: 0,      distanceMi: 1.7 },
  { id: 'se', name: 'South-East', dLat: -0.022, dLng: 0.025,  distanceMi: 2.1 },
];

function calculateRankGrid(lead) {
  if (!lead) return null;

  const lat = Number(lead.latitude || lead.lat || -42.834);
  const lng = Number(lead.longitude || lead.lng || 147.373);
  const hasWebsite = lead.has_no_website === 0 && !!lead.website && lead.website !== 'None';
  
  // Base rank from Google Maps rank or rating/review indicators
  let baseRank = Number(lead.maps_rank) || 1;
  if (baseRank < 1) baseRank = 1;
  if (baseRank > 15) baseRank = 15;

  let totalRank = 0;
  let top3Count = 0;

  const nodes = GRID_NODES.map((node) => {
    let nodeRank;
    if (node.id === 'c') {
      nodeRank = baseRank;
    } else {
      const decayFactor = hasWebsite ? 2.4 : 5.8;
      const pseudoVariance = ((node.id.charCodeAt(0) + (lead.id || 1)) % 3) - 1;
      const rawDecay = Math.round(baseRank + (node.distanceMi * decayFactor) + pseudoVariance);
      nodeRank = Math.max(1, Math.min(20, rawDecay));
    }

    totalRank += nodeRank;
    if (nodeRank <= 3) top3Count++;

    const color = nodeRank <= 3 ? 'green' : (nodeRank <= 9 ? 'amber' : 'red');

    return {
      id: node.id,
      name: node.name,
      distanceMi: node.distanceMi,
      lat: Number((lat + node.dLat).toFixed(5)),
      lng: Number((lng + node.dLng).toFixed(5)),
      rank: nodeRank,
      color,
      badge: nodeRank <= 3 ? 'Top 3-Pack' : (nodeRank <= 9 ? 'Page 1' : 'Lost to Competitors')
    };
  });

  const averageRank = Number((totalRank / nodes.length).toFixed(1));
  const top3Share = Math.round((top3Count / nodes.length) * 100);
  const effectiveRadius = hasWebsite ? '4.5 miles' : '1.4 miles';

  const insight = hasWebsite
    ? `Strong local anchor at position #${baseRank}. Rank drops below 3-pack in outer suburbs.`
    : `Severe search drop-off outside ${effectiveRadius}. Competitors with active websites capture approximately 78% of local inquiries in outer zones.`;

  return {
    leadId: lead.id,
    businessName: lead.business_name,
    city: lead.city || 'your area',
    hasWebsite,
    centerRank: baseRank,
    averageRank,
    top3Share,
    effectiveRadius,
    insight,
    nodes
  };
}

module.exports = {
  calculateRankGrid
};
