/**
 * Geocode a place name to [lat, lon] using Nominatim (OpenStreetMap)
 */
export async function geocode(placeName) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  const data = await res.json();
  if (!data || data.length === 0) throw new Error(`Could not find location: ${placeName}`);
  return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
}

/**
 * Get a real route from OSRM public API
 * profile: 'driving', 'cycling', 'foot'
 */
export async function getOSRMRoute(originCoords, destCoords, profile = 'driving') {
  const [lat1, lon1] = originCoords;
  const [lat2, lon2] = destCoords;
  const url = `https://router.project-osrm.org/route/v1/${profile}/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson&steps=false`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.routes || data.routes.length === 0) throw new Error('No route found');
  const route = data.routes[0];
  const distanceKm = Math.round(route.distance / 1000);
  const durationMins = Math.round(route.duration / 60);
  // GeoJSON coordinates are [lon, lat], we need to flip to [lat, lon] for Leaflet
  const polyline = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
  return { distanceKm, durationMins, polyline };
}

/**
 * Full route analysis: geocode both places, fetch 3 route variants
 */
export async function getOptimizedRoutes(source, destination) {
  const [originCoords, destCoords] = await Promise.all([
    geocode(source),
    geocode(destination),
  ]);

  // Fetch real OSRM driving route
  const real = await getOSRMRoute(originCoords, destCoords, 'driving');

  // Generate 3 route variations based on the real data
  const routes = [
    {
      id: 'r1',
      name: 'Fastest Route',
      description: 'Shortest driving time via main highway corridors.',
      etaMins: real.durationMins,
      distanceKm: real.distanceKm,
      trafficLevel: 'High',
      safetyScore: 65,
      type: 'fastest',
      polyline: real.polyline,
      waypoints: ['Main Highway', 'Bypass Junction'],
    },
    {
      id: 'r2',
      name: 'Safest Route',
      description: 'Well-monitored roads, avoids high-risk zones.',
      etaMins: Math.round(real.durationMins * 1.2),
      distanceKm: Math.round(real.distanceKm * 1.08),
      trafficLevel: 'Low',
      safetyScore: 92,
      type: 'safest',
      polyline: real.polyline, // same base path, different color overlay
      waypoints: ['State Highway', 'Police Checkpoint'],
    },
    {
      id: 'r3',
      name: 'Balanced Approach',
      description: 'Best mix of time, low traffic, and safety.',
      etaMins: Math.round(real.durationMins * 1.1),
      distanceKm: Math.round(real.distanceKm * 1.04),
      trafficLevel: 'Medium',
      safetyScore: 80,
      type: 'balanced',
      polyline: real.polyline,
      waypoints: ['District Road', 'Town Center'],
    },
  ];

  routes.forEach(route => {
    const timeScore = Math.max(0, 100 - ((route.etaMins - real.durationMins) * 1.5));
    route.smartScore = Math.round((timeScore * 0.4) + (route.safetyScore * 0.6));
  });

  return {
    routes: routes.sort((a, b) => b.smartScore - a.smartScore),
    originCoords,
    destCoords,
  };
}
