import React, { useState } from 'react';

export default function SearchForm({ onSearch, isLoading }) {
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (source.trim() && destination.trim()) {
      onSearch(source, destination);
    }
  };

  return (
    <form className="search-form glass-panel" onSubmit={handleSubmit}>
      <div className="input-group">
        <label htmlFor="source">Current Location</label>
        <div className="input-wrapper">
          <span className="input-icon">📍</span>
          <input
            id="source"
            type="text"
            placeholder="Where are you now?"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="input-separator">
        <div className="line"></div>
        <button 
          type="button" 
          className="swap-btn"
          onClick={() => {
            const temp = source;
            setSource(destination);
            setDestination(temp);
          }}
          disabled={isLoading}
          aria-label="Swap locations"
        >
          ⇅
        </button>
      </div>

      <div className="input-group">
        <label htmlFor="destination">Destination</label>
        <div className="input-wrapper">
          <span className="input-icon">🎯</span>
          <input
            id="destination"
            type="text"
            placeholder="Where to?"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
      </div>

      <button className="submit-btn" type="submit" disabled={isLoading || !source || !destination}>
        {isLoading ? (
          <span className="loader"></span>
        ) : (
          <>
            <span className="btn-text">Find Best Routes</span>
            <span className="btn-icon">→</span>
          </>
        )}
      </button>
    </form>
  );
}
