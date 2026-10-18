import React from 'react';

export default function EmptyState({ onReset }) {
  return (
    <div className="empty-state-card" role="status" aria-live="polite">
      <div className="empty-state-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      </div>
      <h3 className="empty-state-title">No packages available right now.</h3>
      <p className="empty-state-subtitle">
        We are updating our seasonal itineraries. Please check back shortly for new departures.
      </p>
      {onReset && (
        <button 
          type="button" 
          className="btn btn-outline empty-state-btn"
          onClick={onReset}
        >
          View All Packages
        </button>
      )}
    </div>
  );
}
