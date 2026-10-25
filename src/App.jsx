import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import PackageSection from './components/PackageSection';
import PackageDetails from './components/PackageDetails';
import BookingForm from './components/BookingForm';
import BookingStatus from './components/BookingStatus';
import AgentBookingDashboard from './components/AgentBookingDashboard';
import Footer from './components/Footer';
import { getTravelPackages } from './services/packageService';

export default function App({ initialView } = {}) {
  const [packages, setPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // View state: 'catalog' | 'bookings' | 'agent'
  const [currentView, setCurrentView] = useState(() => {
    if (initialView) return initialView;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      if (viewParam === 'agent' || viewParam === 'agent-dashboard' || window.location.hash === '#agent-dashboard') return 'agent';
      if (viewParam === 'bookings' || viewParam === 'status') return 'bookings';
      if (window.location.hash === '#booking-status') return 'bookings';
    }
    return 'catalog';
  });

  // Routing / View state: URL ?package=pkg-id or state
  const [selectedPackageId, setSelectedPackageId] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('package') || null;
    }
    return null;
  });

  const [isBooking, setIsBooking] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('action') === 'book' || params.get('booking') === 'true';
    }
    return false;
  });

  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('search') || '';
    }
    return '';
  });

  const [appliedBudget, setAppliedBudget] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const minParam = params.get('minBudget');
      const maxParam = params.get('maxBudget');
      return {
        min: minParam !== null && minParam !== '' ? Number(minParam) : null,
        max: maxParam !== null && maxParam !== '' ? Number(maxParam) : null,
      };
    }
    return { min: null, max: null };
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
      const params = new URLSearchParams(window.location.search);
      const pkgParam = params.get('package');
      const viewParam = params.get('view');
      setSelectedPackageId(pkgParam || null);
      setIsBooking(Boolean(pkgParam && (params.get('action') === 'book' || params.get('booking') === 'true')));
      if (viewParam === 'agent' || viewParam === 'agent-dashboard' || window.location.hash === '#agent-dashboard') {
        setCurrentView('agent');
      } else if (viewParam === 'bookings' || viewParam === 'status' || window.location.hash === '#booking-status') {
        setCurrentView('bookings');
      } else {
        setCurrentView('catalog');
      }
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
    if (selectedPackageId || currentView === 'bookings') {
      handleBackToListing();
    }
    setTimeout(() => {
      const el = document.getElementById('packages-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  const handleNavigateToBookings = () => {
    setSelectedPackageId(null);
    setIsBooking(false);
    setCurrentView('bookings');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'bookings');
      url.searchParams.delete('package');
      url.searchParams.delete('action');
      url.searchParams.delete('booking');
      window.history.pushState({ view: 'bookings' }, '', url.toString());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNavigateToAgent = () => {
    setSelectedPackageId(null);
    setIsBooking(false);
    setCurrentView('agent');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'agent');
      url.searchParams.delete('package');
      url.searchParams.delete('action');
      url.searchParams.delete('booking');
      window.history.pushState({ view: 'agent' }, '', url.toString());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleOpenDetails = (pkg) => {
    const pkgId = pkg?.id || null;
    setSelectedPackageId(pkgId);
    setIsBooking(false);
    setCurrentView('catalog');
    if (typeof window !== 'undefined' && pkgId) {
      const url = new URL(window.location.href);
      url.searchParams.set('package', pkgId);
      url.searchParams.delete('action');
      url.searchParams.delete('booking');
      url.searchParams.delete('view');
      window.history.pushState({ packageId: pkgId }, '', url.toString());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStartBooking = (pkg) => {
    const pkgId = pkg?.id || selectedPackageId;
    setIsBooking(true);
    setCurrentView('catalog');
    if (typeof window !== 'undefined' && pkgId) {
      const url = new URL(window.location.href);
      url.searchParams.set('package', pkgId);
      url.searchParams.set('action', 'book');
      url.searchParams.delete('view');
      window.history.pushState({ packageId: pkgId, action: 'book' }, '', url.toString());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBackToDetails = () => {
    setIsBooking(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('action');
      url.searchParams.delete('booking');
      url.searchParams.delete('view');
      window.history.pushState({ packageId: selectedPackageId }, '', url.toString());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBackToListing = () => {
    setSelectedPackageId(null);
    setIsBooking(false);
    setCurrentView('catalog');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('package');
      url.searchParams.delete('action');
      url.searchParams.delete('booking');
      url.searchParams.delete('view');
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
      <Navbar
        onExploreClick={handleExploreScroll}
        onBookingsClick={handleNavigateToBookings}
        onAgentClick={handleNavigateToAgent}
        activeView={currentView === 'agent' ? 'agent' : currentView === 'bookings' ? 'bookings' : selectedPackageId ? 'package' : 'packages'}
      />

      {/* Main Content Area */}
      <main id="main-content" className="main-content">
        {currentView === 'agent' ? (
          <AgentBookingDashboard
            onExplorePackages={handleBackToListing}
          />
        ) : currentView === 'bookings' ? (
          <BookingStatus
            onExplorePackages={handleBackToListing}
            onViewPackage={handleOpenDetails}
          />
        ) : selectedPackageId ? (
          isBooking ? (
            <BookingForm
              key={`booking-${selectedPackageId}`}
              pkg={selectedPackage}
              onBack={handleBackToDetails}
              onViewBookings={handleNavigateToBookings}
            />
          ) : (
            <PackageDetails
              key={selectedPackageId || 'details'}
              pkg={selectedPackage}
              onBack={handleBackToListing}
              onBook={handleStartBooking}
              isLoading={isLoading}
              error={error}
              onRetry={handleRetry}
            />
          )
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
              initialSearchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              initialMinBudget={appliedBudget.min}
              initialMaxBudget={appliedBudget.max}
              onBudgetChange={setAppliedBudget}
            />
          </>
        )}
      </main>

      {/* Footer */}
      <Footer
        onExploreClick={handleExploreScroll}
        onBookingsClick={handleNavigateToBookings}
        onAgentClick={handleNavigateToAgent}
      />
    </div>
  );

}
