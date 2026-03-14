/**
 * ErrorState Component Tests
 * Covers: full card vs compact mode, retry button, custom title/message
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorState } from '../ErrorState';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  AlertTriangle: () => <span data-testid="alert-icon">Alert</span>,
  RefreshCw: () => <span data-testid="refresh-icon">Refresh</span>,
}));

describe('ErrorState Component', () => {
  it('renders default title and message', () => {
    render(<ErrorState message="Something broke" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Something broke')).toBeInTheDocument();
  });

  it('renders custom title', () => {
    render(<ErrorState title="Connection Error" message="Could not connect" />);
    expect(screen.getByText('Connection Error')).toBeInTheDocument();
  });

  it('shows retry button when onRetry is provided', () => {
    render(<ErrorState message="Error" onRetry={() => {}} />);
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('hides retry button when onRetry is not provided', () => {
    render(<ErrorState message="Error" />);
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', async () => {
    const user = userEvent.setup();
    const mockRetry = vi.fn();
    render(<ErrorState message="Error" onRetry={mockRetry} />);

    await user.click(screen.getByText('Try Again'));
    expect(mockRetry).toHaveBeenCalledOnce();
  });

  it('shows alert icon', () => {
    render(<ErrorState message="Error" />);
    expect(screen.getAllByTestId('alert-icon').length).toBeGreaterThan(0);
  });

  describe('Compact Mode', () => {
    it('renders inline error in compact mode', () => {
      const { container } = render(
        <ErrorState message="Quick error" compact />
      );
      // Compact uses flex row layout, not centered card
      expect(container.querySelector('.flex.items-center')).toBeInTheDocument();
    });

    it('shows retry in compact mode when provided', () => {
      render(
        <ErrorState message="Quick error" compact onRetry={() => {}} />
      );
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('calls onRetry in compact mode', async () => {
      const user = userEvent.setup();
      const mockRetry = vi.fn();
      render(
        <ErrorState message="Quick error" compact onRetry={mockRetry} />
      );

      await user.click(screen.getByText('Retry'));
      expect(mockRetry).toHaveBeenCalledOnce();
    });
  });

  it('applies custom className', () => {
    const { container } = render(
      <ErrorState message="Error" className="custom-class" />
    );
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});
