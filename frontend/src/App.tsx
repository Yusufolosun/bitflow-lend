import { Dashboard } from './components/Dashboard';
import { ToastProvider } from './components/ToastProvider';
import './index.css';

/**
 * Main App Component
 * Entry point for the BitFlow Lend application
 */
function App() {
  return (
    <ToastProvider>
      <div className="App">
        <Dashboard />
      </div>
    </ToastProvider>
  );
}

export default App;
