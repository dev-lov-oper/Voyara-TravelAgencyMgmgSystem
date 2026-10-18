import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import PackageSection from './components/PackageSection';
import PackageDetails from './components/PackageDetails';
import Footer from './components/Footer';
import { getTravelPackages } from './services/packageService';

export default function App() {
  const [packages, setPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Routing / View state: URL ?package=pkg-id or state
  const [selectedPackageId, setSelectedPackageId] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('package') || null;
    }
    return null;
  });

  const [previewMode, setPreviewMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const param = new URLSearchParams(window.location.search).get('state');
      if (param === 'empty' || param === 'error') return param;
    }
    return 'normal';
  });
  const [retryKey, setRetryKey] = useState(0);

  // Synchronize browser history (Back / Forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      const param = new URLSearchParams(window.location.search).get('package');
      setSelectedPackageId(param || null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
    if (selectedPackageId) {
      handleBackToListing();
    }
    setTimeout(() => {
      const el = document.getElementById('packages-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  const handleOpenDetails = (pkg) => {
    const pkgId = pkg?.id || null;
    setSelectedPackageId(pkgId);
    if (typeof window !== 'undefined' && pkgId) {
      const url = new URL(window.location.href);
      url.searchParams.set('package', pkgId);
      window.history.pushState({ packageId: pkgId }, '', url.toString());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBackToListing = () => {
    setSelectedPackageId(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('package');
      window.history.pushState({}, '', url.pathname + (url.search ? url.search : ''));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Find the selected package if an ID is active
  const selectedPackage = selectedPackageId
    ? packages.find((p) => String(p.id) === String(selectedPackageId)) || null
    : null;

  return (
    <div className="app-layout">
      {/* Navigation Bar */}
      <Navbar onExploreClick={handleExploreScroll} />

      {/* Main Content Area */}
      <main id="main-content" className="main-content">
        {selectedPackageId ? (
          <PackageDetails
            pkg={selectedPackage}
            onBack={handleBackToListing}
            isLoading={isLoading}
            error={error}
            onRetry={handleRetry}
          />
        ) : (
          <>
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
          </>
        )}
      </main>

      {/* Footer */}
      <Footer onExploreClick={handleExploreScroll} />
    </div>
  );
}
