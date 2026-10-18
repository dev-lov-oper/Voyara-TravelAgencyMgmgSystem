import React from 'react';

export default function HeroSection({ onExploreClick }) {
  const handleScrollToPackages = (e) => {
    e.preventDefault();
    if (onExploreClick) {
      onExploreClick();
    } else {
      const section = document.getElementById('packages-section');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <section id="hero-section" className="hero-section" aria-labelledby="hero-heading">
      <div className="hero-container">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-pulse"></span>
            Curated Travel Experiences
          </div>
          <h1 id="hero-heading" className="hero-title">
            Discover your next escape.
          </h1>
          <p className="hero-subtitle">
            Explore thoughtfully curated trips, from peaceful beach holidays to unforgettable mountain adventures.
          </p>
          <div className="hero-actions">
            <a 
              href="#packages-section" 
              className="btn btn-primary btn-lg"
              onClick={handleScrollToPackages}
            >
              Explore Packages
              <svg 
                className="btn-icon" 
                viewBox="0 0 20 20" 
                width="18" 
                height="18" 
                fill="currentColor"
                aria-hidden="true"
              >
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </a>
          </div>

          <div className="hero-highlights">
            <div className="highlight-item">
              <span className="highlight-number">100%</span>
              <span className="highlight-label">Handpicked Itineraries</span>
            </div>
            <div className="highlight-divider" aria-hidden="true"></div>
            <div className="highlight-item">
              <span className="highlight-number">Transparent</span>
              <span className="highlight-label">All-Inclusive Pricing</span>
            </div>
            <div className="highlight-divider" aria-hidden="true"></div>
            <div className="highlight-item">
              <span className="highlight-number">Reliable</span>
              <span className="highlight-label">Verified Escapes</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="visual-wrapper">
            <img 
              src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80" 
              alt="Panoramic scenic tropical beach destination with crystal blue ocean and sunlit horizon"
              className="hero-image"
              loading="eager"
            />
            <div className="hero-image-caption">
              <span className="caption-tag">Featured Destination</span>
              <p className="caption-title">Tropical Shorelines & Mountain Trails</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
