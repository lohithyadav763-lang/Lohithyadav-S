import { useState } from 'react';
import './App.css';
import SearchForm from './components/SearchForm';
import RouteCard from './components/RouteCard';
import CustomMap from './components/CustomMap';
import { getOptimizedRoutes } from './utils/routeOptimizer';

function App() {
  const [routes, setRoutes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useState({ source: '', destination: '' });
  const [mapCoords, setMapCoords] = useState({ origin: null, dest: null });
  const [amenityFilter, setAmenityFilter] = useState('');

  const handleSearch = async (source, destination) => {
    setIsLoading(true);
    setError('');
    setRoutes([]);
    setSearchParams({ source, destination });
    setAmenityFilter('');
    try {
      const result = await getOptimizedRoutes(source, destination);
      setRoutes(result.routes);
      setMapCoords({ origin: result.originCoords, dest: result.destCoords });
    } catch (err) {
      setError(`Could not find route: ${err.message}. Please check your location names.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="background-effects">
        <div className="glow glow-1"></div>
        <div className="glow glow-2"></div>
      </div>

      <header className="app-header">
        <div className="logo-container">
          <span className="logo-icon">ai</span>
          <h1>Lohith's<span className="accent"> Map</span></h1>
        </div>
        <p className="subtitle">Real-time smart route intelligence</p>
      </header>

      <main className="app-main">
        <section className="search-section">
          <SearchForm onSearch={handleSearch} isLoading={isLoading} />
        </section>

        {error && (
          <div className="error-banner">⚠️ {error}</div>
        )}

        {isLoading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Fetching real-time route data from OpenStreetMap…</p>
          </div>
        )}

        {routes.length > 0 && (
          <section className="results-section fade-in">
            <h2 className="results-title">
              Recommended Routes
              <span className="results-subtitle">From {searchParams.source} to {searchParams.destination}</span>
            </h2>

            <div className="dashboard-grid">
              {/* Map Left Side */}
              <div className="map-column">
                <div className="map-container glass-panel">
                  <CustomMap
                    originCoords={mapCoords.origin}
                    destCoords={mapCoords.dest}
                    routes={routes}
                    amenityFilter={amenityFilter}
                  />
                </div>

                <div className="amenities-container">
                  <h3 className="amenities-title">Find En Route:</h3>
                  <div className="amenities-buttons">
                    {['Dhabas & Restaurants', 'Hotels', 'Petrol Bunks', 'Railway Stations'].map((amenity) => (
                      <button
                        key={amenity}
                        className={`amenity-btn ${amenityFilter === amenity ? 'active' : ''}`}
                        onClick={() => setAmenityFilter(amenityFilter === amenity ? '' : amenity)}
                      >
                        {amenity === 'Dhabas & Restaurants' && '🍽️ '}
                        {amenity === 'Hotels' && '🏨 '}
                        {amenity === 'Petrol Bunks' && '⛽ '}
                        {amenity === 'Railway Stations' && '🚉 '}
                        {amenity}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Routes Right Side */}
              <div className="routes-list">
                {routes.map((route, index) => (
                  <RouteCard
                    key={route.id}
                    route={route}
                    isBest={index === 0}
                  />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
