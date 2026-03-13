/**
 * StatsCard Component Tests
 * Covers: rendering label/value, color variants, trend display, subtitle
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsCard } from '../StatsCard';

describe('StatsCard Component', () => {
  const baseProps = {
    icon: <span data-testid="test-icon">icon</span>,
    label: 'Total Deposits',
    value: '1,000 STX',
  };

  it('renders label and value', () => {
    render(<StatsCard {...baseProps} />);
    expect(screen.getByText('Total Deposits')).toBeInTheDocument();
    expect(screen.getByText('1,000 STX')).toBeInTheDocument();
  });

  it('renders the provided icon', () => {
    render(<StatsCard {...baseProps} />);
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('shows subtitle when provided', () => {
    render(<StatsCard {...baseProps} subtitle="Updated 5m ago" />);
    expect(screen.getByText('Updated 5m ago')).toBeInTheDocument();
  });

  it('hides subtitle when not provided', () => {
    render(<StatsCard {...baseProps} />);
    expect(screen.queryByText('Updated 5m ago')).not.toBeInTheDocument();
  });

  it('shows positive trend with value', () => {
    render(
      <StatsCard
        {...baseProps}
        trend={{ value: 12.5, isPositive: true }}
      />
    );
    expect(screen.getByText('12.5%')).toBeInTheDocument();
  });

  it('shows negative trend with value', () => {
    render(
      <StatsCard
        {...baseProps}
        trend={{ value: -3.2, isPositive: false }}
      />
    );
    expect(screen.getByText('3.2%')).toBeInTheDocument();
  });

  it('hides trend when not provided', () => {
    const { container } = render(<StatsCard {...baseProps} />);
    expect(container.querySelector('.bg-emerald-50')).not.toBeInTheDocument();
    expect(container.querySelector('.bg-red-50')).not.toBeInTheDocument();
  });

  it('applies default blue color classes', () => {
    const { container } = render(<StatsCard {...baseProps} />);
    expect(container.querySelector('.border-t-primary-700')).toBeInTheDocument();
  });

  it('applies green color when specified', () => {
    const { container } = render(<StatsCard {...baseProps} color="green" />);
    expect(container.querySelector('.border-t-emerald-500')).toBeInTheDocument();
  });

  it('applies red color when specified', () => {
    const { container } = render(<StatsCard {...baseProps} color="red" />);
    expect(container.querySelector('.border-t-red-500')).toBeInTheDocument();
  });
});
