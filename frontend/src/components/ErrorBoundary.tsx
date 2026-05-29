import { Component, ErrorInfo, ReactNode } from 'react';
import { ERROR_BOUNDARY_COPY } from '../constants/messages';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary Component
 * Catches JavaScript errors in child components and displays a fallback UI.
 * Prevents the entire app from crashing due to a single component failure.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6" role="alert">
          <div className="max-w-md w-full text-center">
            <div className="mx-auto w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mb-5">
              <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{ERROR_BOUNDARY_COPY.title}</h2>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              {this.state.error?.message || ERROR_BOUNDARY_COPY.fallbackMessage}
            </p>
            <button type="button"
              onClick={this.handleRetry}
              className="btn btn-primary px-6 py-2.5"
            >
              {ERROR_BOUNDARY_COPY.retry}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

