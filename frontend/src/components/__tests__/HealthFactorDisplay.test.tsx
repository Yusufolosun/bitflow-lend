import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthFactorDisplay } from '../HealthFactorDisplay';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Shield: () => <span data-testid="shield-icon" />,
  AlertTriangle: () => <span data-testid="alert-icon" />,
  XCircle: () => <span data-testid="x-icon" />,
  Activity: () => <span data-testid="activity-icon" />,
  CheckCircle: () => <span data-testid="check-icon" />,
}));

// Mock calculations
vi.mock('../../utils/calculations', () => ({
  getHealthStatus: (hf: number) => {
    if (hf >= 150) return 'healthy';
    if (hf >= 110) return 'warning';
    return 'critical';
  },
}));

describe('HealthFactorDisplay', () => {
  it('renders skeleton/loading state when healthFactor is undefined', () => {
    render(<HealthFactorDisplay healthFactor={undefined} />);
    expect(screen.getByTestId('hf-loading-skeleton')).toBeInTheDocument();
  });

  it('renders skeleton/loading state when healthFactor is null', () => {
    render(<HealthFactorDisplay healthFactor={null} />);
    expect(screen.getByTestId('hf-loading-skeleton')).toBeInTheDocument();
  });

  it('renders critical alert when healthFactor is exactly 0', () => {
    render(<HealthFactorDisplay healthFactor={0} />);
    expect(screen.getByTestId('hf-critical-alert')).toBeInTheDocument();
    expect(screen.getByText(/Immediate Liquidation/i)).toBeInTheDocument();
  });

  it('renders warning state for healthFactor 1.1 (110%)', () => {
    render(<HealthFactorDisplay healthFactor={1.1} />);
    expect(screen.getByTestId('hf-display-warning')).toBeInTheDocument();
    expect(screen.getByText('110%')).toBeInTheDocument();
  });

  it('renders healthy state for healthFactor 2.0 (200%)', () => {
    render(<HealthFactorDisplay healthFactor={2.0} />);
    expect(screen.getByTestId('hf-display-healthy')).toBeInTheDocument();
    expect(screen.getByText('200%')).toBeInTheDocument();
  });

  it('renders critical state for healthFactor 105', () => {
    render(<HealthFactorDisplay healthFactor={105} />);
    expect(screen.getByTestId('hf-display-critical')).toBeInTheDocument();
    expect(screen.getByText('105%')).toBeInTheDocument();
  });

  it('matches snapshot for healthy state', () => {
    const { asFragment } = render(<HealthFactorDisplay healthFactor={2.0} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders small size correctly', () => {
    render(<HealthFactorDisplay healthFactor={2.0} size="sm" />);
    const container = screen.getByTestId('hf-display-healthy');
    expect(container).toHaveClass('p-2');
  });

  it('renders large size correctly', () => {
    render(<HealthFactorDisplay healthFactor={2.0} size="lg" />);
    const container = screen.getByTestId('hf-display-healthy');
    expect(container).toHaveClass('p-6');
  });

  it('renders error state for NaN healthFactor', () => {
    render(<HealthFactorDisplay healthFactor={NaN} />);
    expect(screen.getByText(/Invalid Health Factor/i)).toBeInTheDocument();
  });
});
