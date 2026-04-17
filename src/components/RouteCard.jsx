import React from 'react';

export default function RouteCard({ route, isBest }) {
  const getTrafficColor = (level) => {
    switch (level) {
      case 'Low': return 'var(--color-success)';
      case 'Medium': return 'var(--color-warning)';
      case 'High': return 'var(--color-danger)';
      default: return 'var(--color-text-dim)';
    }
  };

  const getSafetyColor = (score) => {
    if (score >= 85) return 'var(--color-success)';
    if (score >= 70) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  const formatTime = (mins) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div className={`route-card ${route.type === 'safest' ? 'safest-theme' : ''} ${isBest ? 'best-route' : ''}`}>
      {isBest && <div className="badge">Recommended Best Route</div>}
      {route.type === 'safest' && <div className="badge safety-badge">🛡️ Verified Safe</div>}
      
      <div className="route-header">
        <h3>{route.name}</h3>
        <div className="smart-score">
          <span className="score-label">Smart Score</span>
          <span className="score-value">{route.smartScore}</span>
        </div>
      </div>
      
      <p className="route-desc">{route.description}</p>
      
      <div className="route-metrics">
        <div className="metric">
          <span className="metric-icon">⏱️</span>
          <div>
            <div className="metric-title">ETA</div>
            <div className="metric-val">{formatTime(route.etaMins)}</div>
          </div>
        </div>

        <div className="metric">
          <span className="metric-icon">📏</span>
          <div>
            <div className="metric-title">Distance</div>
            <div className="metric-val">{route.distanceKm} km</div>
          </div>
        </div>
        
        <div className="metric">
          <span className="metric-icon">🚗</span>
          <div>
            <div className="metric-title">Traffic</div>
            <div className="metric-val" style={{ color: getTrafficColor(route.trafficLevel) }}>
              {route.trafficLevel}
            </div>
          </div>
        </div>

        <div className="metric">
          <span className="metric-icon">🛡️</span>
          <div>
            <div className="metric-title">Safety</div>
            <div className="metric-val" style={{ color: getSafetyColor(route.safetyScore) }}>
              {route.safetyScore}/100
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
