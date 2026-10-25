import React from 'react';

const CURRENT_YEAR = new Date().getFullYear();

export default function Footer({ onHomeClick, onExploreClick, onBookingsClick, onAgentClick }) {

  const handleNavClick = (e, sectionId) => {
    e.preventDefault();
    if (sectionId === 'agent-dashboard') {
      if (onAgentClick) {
        onAgentClick();
      } else {
        const el = document.getElementById('agent-dashboard-heading') || document.getElementById('agent-auth-heading');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (sectionId === 'booking-status') {
      if (onBookingsClick) {
        onBookingsClick();
      } else {
        const el = document.getElementById('booking-status-heading') || document.getElementById('bookings-list');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (sectionId === 'packages-section') {
      if (onExploreClick) {
        onExploreClick();
      } else {
        const el = document.getElementById('packages-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (sectionId === 'hero-section') {
      if (onHomeClick) {
        onHomeClick();
      } else if (onExploreClick) {
        onExploreClick();
      } else {
        const el = document.getElementById('hero-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        } else if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    } else if (sectionId === 'about-section') {
      const el = document.getElementById('about-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-top">
          <div className="footer-brand-column">
            <a 
              href="#hero-section"
              className="brand-logo footer-logo"
              onClick={(e) => handleNavClick(e, 'hero-section')}
              aria-label="Voyara Home"
            >
              <span className="brand-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" opacity="0.85" />
                </svg>
              </span>
              <span className="brand-name">Voyara</span>
            </a>
            <p className="footer-description">
              Voyara provides thoughtfully curated travel experiences, connecting travelers with peaceful coastlines, majestic mountain trails, and rich cultural destinations.
            </p>
          </div>

          <div className="footer-links-column">
            <h4 className="footer-heading">Quick Navigation</h4>
            <ul className="footer-links">
              <li>
                <a 
                  href="#hero-section" 
                  onClick={(e) => handleNavClick(e, 'hero-section')}
                >
                  Home
                </a>
              </li>
              <li>
                <a 
                  href="#packages-section" 
                  onClick={(e) => handleNavClick(e, 'packages-section')}
                >
                  Explore Packages
                </a>
              </li>
              <li>
                <a 
                  href="#booking-status" 
                  onClick={(e) => handleNavClick(e, 'booking-status')}
                >
                  My Bookings
                </a>
              </li>
              <li>
                <a 
                  href="#agent-dashboard" 
                  id="footer-agent-dashboard"
                  onClick={(e) => handleNavClick(e, 'agent-dashboard')}
                >
                  Agent Portal
                </a>
              </li>
              <li>
                <a 
                  href="#about-section" 
                  onClick={(e) => handleNavClick(e, 'about-section')}
                >
                  About Voyara
                </a>
              </li>
            </ul>
          </div>

          <div className="footer-info-column" id="about-section">
            <h4 className="footer-heading">About Our Service</h4>
            <p className="footer-info-text">
              Demonstration package listings built for the Travel Agency Management System (TAMS). All itineraries, pricing, and durations are illustrative.
            </p>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="copyright-text">
            &copy; {CURRENT_YEAR} Voyara Travel Agency. All rights reserved.
          </p>
          <p className="footer-meta-note">
            TAMS-7 Package Discovery Interface
          </p>
        </div>
      </div>
    </footer>
  );
}
