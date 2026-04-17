/**
 * Search for real Points of Interest along a route using Overpass API (OpenStreetMap)
 */

const AMENITY_MAP = {
  'Food & Drink': {
    query: 'node["amenity"~"restaurant|fast_food|cafe|bar|pub|ice_cream"]',
    icon: '🍽️',
    color: '#f59e0b',
  },
  'Hotels': {
    query: 'node["tourism"~"hotel|motel|guest_house"]',
    icon: '🏨',
    color: '#8b5cf6',
  },
  'Petrol Bunks': {
    query: 'node["amenity"="fuel"]',
    icon: '⛽',
    color: '#ef4444',
  },
  'Things to Do': {
    query: 'node["tourism"~"attraction|viewpoint|museum|theme_park|zoo"]["name"]',
    icon: '🎡',
    color: '#38bdf8',
  },
  'Shopping': {
    query: 'node["shop"~"mall|supermarket|convenience|department_store"]["name"]',
    icon: '🛍️',
    color: '#ec4899',
  },
  'Services': {
    query: 'node["amenity"~"hospital|clinic|pharmacy|police|bank|atm|post_office"]',
    icon: '🛠️',
    color: '#10b981',
  },
  'Railway Stations': {
    query: 'node["railway"="station"]',
    icon: '🚉',
    color: '#6366f1',
  },
};

/**
 * Fetch POIs near a route using Overpass API
 * @param {string} amenityType - key from AMENITY_MAP
 * @param {Array} originCoords - [lat, lon] (legacy, now optional)
 * @param {Array} destCoords - [lat, lon] (legacy, now optional)
 * @param {Array} polyline - Array of [lat, lon] points representing the route
 * @returns {Array} of { lat, lon, name }
 */
export async function fetchPOIsAlongRoute(amenityType, originCoords, destCoords, polyline = []) {
  const config = AMENITY_MAP[amenityType];
  if (!config) return [];

  let overpassQuery = '';

  // Use polyline-based proximity search if available
  if (polyline && polyline.length > 0) {
    // Sample the polyline to avoid hitting Overpass query length limits
    // We target around 15-20 points distributed across the route
    const step = Math.max(1, Math.floor(polyline.length / 20));
    const sampledPoints = [];
    for (let i = 0; i < polyline.length; i += step) {
      sampledPoints.push(`${polyline[i][0]} ${polyline[i][1]}`);
    }
    // Always include the last point
    if (polyline.length > 1 && !sampledPoints.includes(`${polyline[polyline.length-1][0]} ${polyline[polyline.length-1][1]}`)) {
      sampledPoints.push(`${polyline[polyline.length-1][0]} ${polyline[polyline.length-1][1]}`);
    }

    const pointsStr = sampledPoints.join(' ');
    
    // Search within 10km (10000m) of any point in the sampled polyline
    overpassQuery = `
      [out:json][timeout:25];
      (
        ${config.query}(around:10000,${pointsStr});
      );
      out body 100;
    `;
  } else {
    // Fallback: Build bounding box between origin and destination with padding
    const latMin = Math.min(originCoords[0], destCoords[0]) - 0.15;
    const latMax = Math.max(originCoords[0], destCoords[0]) + 0.15;
    const lonMin = Math.min(originCoords[1], destCoords[1]) - 0.15;
    const lonMax = Math.max(originCoords[1], destCoords[1]) + 0.15;
    const bbox = `${latMin},${lonMin},${latMax},${lonMax}`;

    overpassQuery = `
      [out:json][timeout:15];
      (
        ${config.query}(${bbox});
      );
      out body 50;
    `;
  }

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(overpassQuery)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const data = await res.json();

    return (data.elements || []).map(el => ({
      lat: el.lat,
      lon: el.lon,
      name: el.tags?.name || amenityType,
      icon: config.icon,
      color: config.color,
    }));
  } catch (err) {
    console.error('Overpass API error:', err);
    return [];
  }
}

export { AMENITY_MAP };
