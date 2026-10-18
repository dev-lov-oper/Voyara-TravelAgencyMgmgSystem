import React, { useEffect } from 'react';

export default function DetailsPlaceholderModal({ selectedPackage, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!selectedPackage) return null;

  return (
    <div 
      className="modal-backdrop" 
      onClick={onClose}
      role="dialog" 
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="badge badge-destination">{selectedPackage.destination}</span>
            <h3 id="modal-title" className="modal-title">{selectedPackage.title}</h3>
          </div>
          <button 
            type="button" 
            className="modal-close-btn" 
            onClick={onClose}
            aria-label="Close details dialog"
          >
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-stats">
            <div className="stat-pill">
              <span className="stat-label">Duration:</span>
              <span className="stat-value">{selectedPackage.durationText}</span>
            </div>
            <div className="stat-pill">
              <span className="stat-label">Starting Price:</span>
              <span className="stat-value">{selectedPackage.formattedPrice}</span>
            </div>
          </div>

          <p className="modal-description">
            {selectedPackage.description}
          </p>

          <div className="modal-notice">
            <div className="notice-icon" aria-hidden="true">ℹ️</div>
            <div className="notice-text">
              <strong>Notice:</strong> Detailed itinerary views, booking flows, and payment options are scheduled for implementation in subsequent Jira stories (TAMS-8). This listing interface allows tourists to browse and compare available travel packages.
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onClose}
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
