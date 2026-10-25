import React, { useState } from 'react';

export default function Navbar({ onExploreClick, onBookingsClick, onAgentClick, activeView }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(prev => !prev);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const handleNavClick = (e, sectionId) => {
    e.preventDefault();
    closeMobileMenu();
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
      if (onExploreClick && (activeView === 'bookings' || activeView === 'agent')) {
        onExploreClick();
      } else {
        const el = document.getElementById('hero-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (sectionId === 'about-section') {
      const el = document.getElementById('about-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="site-header">
      <div className="navbar-container">
        {/* Brand Logo */}
        <a 
          href="#hero-section" 
          className="brand-logo" 
          onClick={(e) => handleNavClick(e, 'hero-section')}
          aria-label="Voyara Home"
        >
          <span className="brand-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" opacity="0.85" />
            </svg>
          </span>
          <span className="brand-name">Voyara</span>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="desktop-nav" aria-label="Main Navigation">
          <ul className="nav-links">
            <li>
              <a 
                href="#hero-section" 
                className={`nav-link ${activeView === 'home' || (!activeView && activeView !== 'bookings') ? 'active' : ''}`}
                onClick={(e) => handleNavClick(e, 'hero-section')}
              >
                Home
              </a>
            </li>
            <li>
              <a 
                href="#packages-section" 
                className={`nav-link ${activeView === 'packages' ? 'active' : ''}`}
                onClick={(e) => handleNavClick(e, 'packages-section')}
              >
                Explore Packages
              </a>
            </li>
            <li>
              <a 
                href="#booking-status" 
                className={`nav-link ${activeView === 'bookings' ? 'active' : ''}`}
                id="nav-booking-status"
                onClick={(e) => handleNavClick(e, 'booking-status')}
              >
                My Bookings
              </a>
            </li>
            <li>
              <a 
                href="#agent-dashboard" 
                className={`nav-link ${activeView === 'agent' ? 'active' : ''}`}
                id="nav-agent-dashboard"
                onClick={(e) => handleNavClick(e, 'agent-dashboard')}
              >
                Agent Portal
              </a>
            </li>
            <li>
              <a 
                href="#about-section" 
                className="nav-link"
                onClick={(e) => handleNavClick(e, 'about-section')}
              >
                About
              </a>
            </li>
          </ul>
        </nav>

        {/* Header Action Button */}
        <div className="nav-actions">
          <button 
            type="button" 
            className="btn btn-outline"
            onClick={(e) => handleNavClick(e, 'packages-section')}
          >
            Explore Packages
          </button>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={toggleMobileMenu}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            <span className="hamburger-bar"></span>
            <span className="hamburger-bar"></span>
            <span className="hamburger-bar"></span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <div 
        id="mobile-navigation" 
        className={`mobile-menu ${mobileMenuOpen ? 'is-open' : ''}`}
        aria-hidden={!mobileMenuOpen}
      >
        <nav className="mobile-nav" aria-label="Mobile Navigation">
          <ul className="mobile-nav-links">
            <li>
              <a 
                href="#hero-section" 
                className="mobile-nav-link"
                onClick={(e) => handleNavClick(e, 'hero-section')}
              >
                Home
              </a>
            </li>
            <li>
              <a 
                href="#packages-section" 
                className="mobile-nav-link"
                onClick={(e) => handleNavClick(e, 'packages-section')}
              >
                Explore Packages
              </a>
            </li>
            <li>
              <a 
                href="#booking-status" 
                className={`mobile-nav-link ${activeView === 'bookings' ? 'active' : ''}`}
                id="mobile-nav-booking-status"
                onClick={(e) => handleNavClick(e, 'booking-status')}
              >
                My Bookings
              </a>
            </li>
            <li>
              <a 
                href="#agent-dashboard" 
                className={`mobile-nav-link ${activeView === 'agent' ? 'active' : ''}`}
                id="mobile-nav-agent-dashboard"
                onClick={(e) => handleNavClick(e, 'agent-dashboard')}
              >
                Agent Portal
              </a>
            </li>
            <li>
              <a 
                href="#about-section" 
                className="mobile-nav-link"
                onClick={(e) => handleNavClick(e, 'about-section')}
              >
                About
              </a>
            </li>
            <li className="mobile-cta-item">
              <button 
                type="button" 
                className="btn btn-primary btn-block"
                onClick={(e) => handleNavClick(e, 'packages-section')}
              >
                Explore Packages
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

