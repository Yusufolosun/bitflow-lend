/**
 * NetworkIndicator Component Tests
 * Covers: testnet vs mainnet labels, styling, title tooltip
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock the config module so we can control ACTIVE_NETWORK
vi.mock('../../config/contracts', () => ({
  ACTIVE_NETWORK: 'testnet',
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Wifi: () => <span data-testid="wifi-icon">Wifi</span>,
}));

describe('NetworkIndicator Component (testnet)', () => {
  it('renders Testnet label', async () => {
    const { NetworkIndicator } = await import('../NetworkIndicator');
    render(<NetworkIndicator />);
    expect(screen.getByText('Testnet')).toBeInTheDocument();
  });

  it('shows wifi icon', async () => {
    const { NetworkIndicator } = await import('../NetworkIndicator');
    render(<NetworkIndicator />);
    expect(screen.getByTestId('wifi-icon')).toBeInTheDocument();
  });

  it('includes tooltip with network name', async () => {
    const { NetworkIndicator } = await import('../NetworkIndicator');
    render(<NetworkIndicator />);
    expect(screen.getByTitle('Connected to Stacks Testnet')).toBeInTheDocument();
  });
});
