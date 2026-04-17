import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchPOIsAlongRoute, AMENITY_MAP } from '../utils/poiFetcher';

// Fix Leaflet default icon paths broken by Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const ROUTE_COLORS = {
  fastest: '#ef4444',
  balanced: '#f59e0b',
  safest: '#10b981',
};

export default function NaturalMap({ originCoords, destCoords, routes, amenityFilter }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const routeLayersRef = useRef([]);
  const poiLayersRef = useRef([]);
  const tileLayerRef = useRef(null);
  const labelLayerRef = useRef(null);
  
  const [loadingPOIs, setLoadingPOIs] = useState(false);
  const [mapStyle, setMapStyle] = useState('satellite');

  // Initialize map once
  useEffect(() => {
    if (leafletMap.current) return;
    leafletMap.current = L.map(mapRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: true,
    });

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // Manage tile layers based on mapStyle
  useEffect(() => {
    if (!leafletMap.current) return;

    // Clear existing tile/label layers
    if (tileLayerRef.current) tileLayerRef.current.remove();
    if (labelLayerRef.current) labelLayerRef.current.remove();

    if (mapStyle === 'dark') {
      tileLayerRef.current = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(leafletMap.current);
    } else {
      // Satellite imagery from Esri
      tileLayerRef.current = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      }).addTo(leafletMap.current);

      // Add hybrid labels on top
      labelLayerRef.current = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19,
        zIndex: 10,
      }).addTo(leafletMap.current);
    }
  }, [mapStyle]);

  // Draw routes when data changes
  useEffect(() => {
    if (!leafletMap.current || !routes || routes.length === 0 || !originCoords || !destCoords) return;

    // Clear previous route layers
    routeLayersRef.current.forEach(l => l.remove());
    routeLayersRef.current = [];

    // Draw each route polyline (draw non-best first so best is on top)
    const sortedForDraw = [...routes].reverse();
    sortedForDraw.forEach((route) => {
      if (!route.polyline || route.polyline.length === 0) return;
      const isBest = route === routes[0];
      const color = ROUTE_COLORS[route.type] || '#38bdf8';

      const pl = L.polyline(route.polyline, {
        color,
        weight: isBest ? 6 : 4,
        opacity: isBest ? 0.9 : 0.5,
        dashArray: isBest ? null : '10, 8',
      }).addTo(leafletMap.current);

      pl.bindTooltip(
        `<b>${route.name}</b><br/>📏 ${route.distanceKm} km &nbsp; ⏱️ ${route.etaMins} min<br/>🛡️ Safety: ${route.safetyScore}/100 &nbsp; 🚗 Traffic: ${route.trafficLevel}`,
        { sticky: true, className: 'route-tooltip', direction: 'top' }
      );

      routeLayersRef.current.push(pl);
    });

    // Origin marker
    const originIcon = L.divIcon({
      className: '',
      html: `<div style="font-size:2rem;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.8))">📍</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
    const destIcon = L.divIcon({
      className: '',
      html: `<div style="font-size:2rem;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.8))">🎯</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    const om = L.marker(originCoords, { icon: originIcon })
      .bindPopup('<b>Origin</b>')
      .addTo(leafletMap.current);
    const dm = L.marker(destCoords, { icon: destIcon })
      .bindPopup('<b>Destination</b>')
      .addTo(leafletMap.current);
    routeLayersRef.current.push(om, dm);

    // Fit bounds
    const bestRoute = routes[0];
    if (bestRoute && bestRoute.polyline.length > 0) {
      const bounds = L.latLngBounds(bestRoute.polyline);
      leafletMap.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routes, originCoords, destCoords]);

  // Fetch and display POIs when amenity filter changes
  useEffect(() => {
    if (!leafletMap.current || !originCoords || !destCoords) return;

    // Clear previous POI markers
    poiLayersRef.current.forEach(l => l.remove());
    poiLayersRef.current = [];

    if (!amenityFilter) return;

    const loadPOIs = async () => {
      setLoadingPOIs(true);
      try {
        const pois = await fetchPOIsAlongRoute(amenityFilter, originCoords, destCoords, routes[0]?.polyline);
        const config = AMENITY_MAP[amenityFilter];

        pois.forEach(poi => {
          const icon = L.divIcon({
            className: '',
            html: `<div style="
              background:${config.color}22;
              border:2px solid ${config.color};
              border-radius:50%;
              width:32px;height:32px;
              display:flex;align-items:center;justify-content:center;
              font-size:1rem;
              box-shadow: 0 0 8px ${config.color}55;
            ">${config.icon}</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          const marker = L.marker([poi.lat, poi.lon], { icon })
            .bindPopup(`<b>${poi.name}</b><br/><small>${amenityFilter}</small>`)
            .addTo(leafletMap.current);

          poiLayersRef.current.push(marker);
        });
      } catch (err) {
        console.error('Failed to load POIs:', err);
      } finally {
        setLoadingPOIs(false);
      }
    };

    loadPOIs();
  }, [amenityFilter, originCoords, destCoords, routes]);

  return (
    <div className="natural-map-wrapper">
      <div className="map-topbar">
        <div className="map-status-dot"></div>
        <span>LIVE ROUTE MAP</span>
        
        <button 
          className="theme-toggle-btn"
          onClick={() => setMapStyle(mapStyle === 'dark' ? 'satellite' : 'dark')}
          title="Toggle Map Style"
        >
          {mapStyle === 'dark' ? '🛰️ Satellite' : '🌃 Dark View'}
        </button>
        {loadingPOIs && <span className="poi-loading">Loading {amenityFilter}…</span>}
        <div className="map-legend">
          <span className="legend-dot fastest"></span> Fastest
          <span className="legend-dot balanced"></span> Balanced
          <span className="legend-dot safest"></span> Safest
        </div>
      </div>

      <div ref={mapRef} className="leaflet-map-container" />

      {routes && routes.length > 0 && (
        <div className="map-infobar">
          {routes.map((r, i) => (
            <div key={r.id} className={`map-route-pill ${i === 0 ? 'best' : ''}`} style={{ borderColor: ROUTE_COLORS[r.type] }}>
              <span className="pill-color-dot" style={{ background: ROUTE_COLORS[r.type] }}></span>
              <span className="pill-name">{r.name.split(' ')[0]}</span>
              <span className="pill-km">{r.distanceKm} km</span>
              <span className="pill-time">{r.etaMins} min</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
