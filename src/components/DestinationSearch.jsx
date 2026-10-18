import React, { useState, useRef } from 'react';

/**
 * DestinationSearch Component (TAMS-24)
 * Provides a clean, responsive search input above the package listing
 * with an integrated search icon, accessible labeling, and clear button.
 */
export default function DestinationSearch({ 
  value, 
  onChange, 
  placeholder = "Search by destination..." 
}) {
  const [internalTerm, setInternalTerm] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('search') || '';
    }
    return '';
  });
  const inputRef = useRef(null);

  // Support controlled or uncontrolled usage
  const isControlled = value !== undefined;
  const currentTerm = isControlled ? value : internalTerm;

  const handleChange = (e) => {
    const nextVal = e.target.value;
    if (!isControlled) {
      setInternalTerm(nextVal);
    }
    if (onChange) {
      onChange(nextVal);
    }
  };

  const handleClear = () => {
    if (!isControlled) {
      setInternalTerm('');
    }
    if (onChange) {
      onChange('');
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && currentTerm) {
      handleClear();
    }
  };

  return (
    <div className="destination-search-container" role="search">
      <div className="destination-search-wrapper">
        <label htmlFor="destination-search-input" className="visually-hidden">
          Search by destination
        </label>
        
        {/* Search Icon */}
        <span className="search-icon" aria-hidden="true">
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="9" r="6" />
            <line x1="13.5" y1="13.5" x2="18" y2="18" />
          </svg>
        </span>

        {/* Search Input Field */}
        <input
          ref={inputRef}
          id="destination-search-input"
          type="text"
          className="destination-search-input"
          placeholder={placeholder}
          value={currentTerm}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck="false"
        />

        {/* Clear Button (Visible only when text entered) */}
        {currentTerm && currentTerm.length > 0 && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={handleClear}
            aria-label="Clear destination search"
            title="Clear search"
          >
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="5" y1="5" x2="15" y2="15" />
              <line x1="15" y1="5" x2="5" y2="15" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
