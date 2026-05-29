import { useState, useCallback } from 'react';
import { Dashboard } from './components/Dashboard';
import { LandingPage } from './components/LandingPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastProvider';
import './index.css';

/**
 * Main App Component
 * Entry point for the BitFlow Lend application.
 * Manages page-level routing between the landing page and dashboard.
 */
function App() {
  const [page, setPage] = useState<'landing' | 'app'>('landing');

  const handleLaunchApp = useCallback(() => {
    setPage('app');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleBackToLanding = useCallback(() => {
    setPage('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <ErrorBoundary>
      <ToastProvider>
        {page === 'landing' ? (
          <LandingPage onLaunchApp={handleLaunchApp} />
        ) : (
          <Dashboard onBackToLanding={handleBackToLanding} />
        )}
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
