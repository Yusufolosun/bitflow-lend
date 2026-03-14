import { Dashboard } from './components/Dashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastProvider';
import './index.css';

/**
 * Main App Component
 * Entry point for the BitFlow Lend application
 */
function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <div className="App">
          <Dashboard />
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
