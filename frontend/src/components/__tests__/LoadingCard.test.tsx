/**
 * LoadingCard Component Tests
 * Covers: skeleton rendering, line count, header visibility, aria labels
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingCard, LoadingStats } from '../LoadingCard';

describe('LoadingCard Component', () => {
  it('renders with default 3 skeleton lines', () => {
    const { container } = render(<LoadingCard />);
    const lines = container.querySelectorAll('.space-y-2');
    expect(lines.length).toBe(3);
  });

  it('renders custom number of lines', () => {
    const { container } = render(<LoadingCard lines={5} />);
    const lines = container.querySelectorAll('.space-y-2');
    expect(lines.length).toBe(5);
  });

  it('shows header skeleton by default', () => {
    const { container } = render(<LoadingCard />);
    // Header contains a 12x12 rounded square
    expect(container.querySelector('.w-12.h-12')).toBeInTheDocument();
  });

  it('hides header skeleton when showHeader is false', () => {
    const { container } = render(<LoadingCard showHeader={false} />);
    expect(container.querySelector('.w-12.h-12')).not.toBeInTheDocument();
  });

  it('has aria status role for accessibility', () => {
    render(<LoadingCard />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has screen reader text', () => {
    render(<LoadingCard />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<LoadingCard className="my-custom" />);
    expect(container.querySelector('.my-custom')).toBeInTheDocument();
  });

  it('renders footer skeleton', () => {
    const { container } = render(<LoadingCard />);
    expect(container.querySelector('.h-12.bg-gray-200')).toBeInTheDocument();
  });
});

describe('LoadingStats Component', () => {
  it('renders 4 skeleton stat cards', () => {
    render(<LoadingStats />);
    const cards = screen.getAllByRole('status');
    expect(cards.length).toBe(4);
  });

  it('includes screen reader text for each card', () => {
    render(<LoadingStats />);
    const srTexts = screen.getAllByText('Loading...');
    expect(srTexts.length).toBe(4);
  });
});
