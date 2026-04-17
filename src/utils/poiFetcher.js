/**
 * Search for real Points of Interest along a route using Overpass API (OpenStreetMap)
 */

const AMENITY_MAP = {
  'Dhabas & Restaurants': {
    query: 'node["amenity"~"restaurant|fast_food|cafe"]',
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
  'Railway Stations': {
    query: 'node["railway"="station"]',
    icon: '🚉',
    color: '#10b981',
  },
};

/**
 * Fetch POIs near a route bounding box using Overpass API
 * @param {string} amenityType - key from AMENITY_MAP
 * @param {Array} originCoords - [lat, lon]
 * @param {Array} destCoords - [lat, lon]
 * @returns {Array} of { lat, lon, name }
 */
export async function fetchPOIsAlongRoute(amenityType, originCoords, destCoords) {
  const config = AMENITY_MAP[amenityType];
  if (!config) return [];

  // Build bounding box between origin and destination with padding
  const latMin = Math.min(originCoords[0], destCoords[0]) - 0.15;
  const latMax = Math.max(originCoords[0], destCoords[0]) + 0.15;
  const lonMin = Math.min(originCoords[1], destCoords[1]) - 0.15;
  const lonMax = Math.max(originCoords[1], destCoords[1]) + 0.15;

  const bbox = `${latMin},${lonMin},${latMax},${lonMax}`;

  const overpassQuery = `
    [out:json][timeout:10];
    (
      ${config.query}(${bbox});
    );
    out body 30;
  `;

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
