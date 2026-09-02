import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LatestDiscovery } from '@/lib/latestDiscoveries';
import { DiscoveryList } from '@/components/home/LatestDiscoveries';

const { fetchLatestDiscoveries } = vi.hoisted(() => ({ fetchLatestDiscoveries: vi.fn() }));

vi.mock('next/server', () => ({ connection: async () => {} }));
vi.mock('@/lib/latestDiscoveries', () => ({ fetchLatestDiscoveries }));

const KEPLER: LatestDiscovery = {
  pl_name: 'Kepler-452 b',
  hostname: 'Kepler-452',
  disc_year: 2015,
  discoverymethod: 'Transit',
};

async function renderList(planets: LatestDiscovery[]) {
  fetchLatestDiscoveries.mockResolvedValue({ status: 'ok', planets });
  render(await DiscoveryList());
}

beforeEach(() => {
  fetchLatestDiscoveries.mockReset();
});

describe('LatestDiscoveries planet links (#68)', () => {
  it('links each name to its planet page, encoding names that need it', async () => {
    await renderList([KEPLER]);

    expect(screen.getByRole('link', { name: 'Kepler-452 b' })).toHaveAttribute(
      'href',
      '/planet/Kepler-452%20b',
    );
  });

  it('keeps the name a heading, so the feed still reads as a list of named worlds', async () => {
    await renderList([KEPLER]);

    const heading = screen.getByRole('heading', { name: 'Kepler-452 b' });
    expect(within(heading).getByRole('link')).toBeInTheDocument();
  });

  // The names simply become links here; the table's two-control pattern must not spread.
  it('gives each entry one control and no quick-look button', async () => {
    await renderList([KEPLER, { ...KEPLER, pl_name: 'Ross 128 b', hostname: 'Ross 128' }]);

    expect(screen.getAllByRole('link')).toHaveLength(2);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('links nothing when the feed is unavailable', async () => {
    fetchLatestDiscoveries.mockResolvedValue({ status: 'unavailable' });
    render(await DiscoveryList());

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText(/unavailable right now/i)).toBeInTheDocument();
  });
});
