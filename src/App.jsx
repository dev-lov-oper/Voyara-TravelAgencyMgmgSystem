import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import PackageSection from './components/PackageSection';
import Footer from './components/Footer';
import DetailsPlaceholderModal from './components/DetailsPlaceholderModal';
import { getTravelPackages } from './services/packageService';

export default function App() {
  const [packages, setPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [previewMode, setPreviewMode] = useState('normal'); // 'normal' | 'empty' | 'error'
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    getTravelPackages({ signal: controller.signal })
      .then((data) => {
        if (!ignore) {
          setPackages(data);
          setError(null);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore && err.name !== 'AbortError') {
          setError(err.message || 'Unable to connect to the package catalog service.');
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [retryKey]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setPreviewMode('normal');
    setRetryKey((prev) => prev + 1);
  };

  const handleExploreScroll = () => {
    const el = document.getElementById('packages-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleOpenDetails = (pkg) => {
    setSelectedPackage(pkg);
  };

  const handleCloseDetails = () => {
    setSelectedPackage(null);
  };

  return (
    <div className="app-layout">
      {/* Navigation Bar */}
      <Navbar onExploreClick={handleExploreScroll} />

      {/* Main Content Area */}
      <main id="main-content" className="main-content">
        {/* Hero Section */}
        <HeroSection onExploreClick={handleExploreScroll} />

        {/* Dynamic Package Listing Section */}
        <PackageSection 
          packages={packages}
          isLoading={isLoading}
          error={error}
          onRetry={handleRetry}
          onViewDetails={handleOpenDetails}
          previewMode={previewMode}
          onChangePreviewMode={setPreviewMode}
        />
      </main>

      {/* Footer */}
      <Footer onExploreClick={handleExploreScroll} />

      {/* Details View Placeholder Modal */}
      <DetailsPlaceholderModal 
        selectedPackage={selectedPackage}
        onClose={handleCloseDetails}
      />
    </div>
  );
}
