import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DisplacedHolder, StoredRecord } from '@/lib/records';
import RecordsPage, { metadata } from './page';
import RecordList from './RecordList';

const { send } = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: class {},
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send }) },
  ScanCommand: class {
    constructor(readonly input: Record<string, unknown>) {}
  },
}));

vi.mock('next/server', () => ({ connection: async () => {} }));

const FIRST_SYNC = '2026-08-14T03:00:12';

function stored(
  record_id: string,
  pl_name: string,
  value: number,
  previous: DisplacedHolder[] = []
): StoredRecord {
  return { record_id, holder: { pl_name, value }, since: FIRST_SYNC, previous, updated_at: FIRST_SYNC };
}

const WASP_33B: DisplacedHolder = {
  pl_name: 'WASP-33 b',
  value: 2781,
  since: '2026-06-01T03:00:00',
  until: FIRST_SYNC,
};

const EVERY_RECORD: StoredRecord[] = [
  stored('most-earth-like', 'TRAPPIST-1 e', 0.8342),
  stored('hottest', 'KELT-9 b', 4050, [WASP_33B]),
  stored('largest', 'HAT-P-67 b', 23.6),
  stored('smallest', 'Kepler-37 b', 0.3),
  stored('most-massive', 'HD 106906 b', 3170),
  stored('shortest-year', 'KOI-1843.03', 0.1769),
  stored('nearest', 'Proxima Cen b', 1.3012),
];

async function renderStored(items: StoredRecord[]) {
  send.mockResolvedValue({ Items: items });
  render(await RecordList());
}

function card(label: string) {
  return screen.getByRole('article', { name: label });
}

function history(label: string) {
  return within(card(label)).getByRole('group');
}

function pair(scope: HTMLElement, label: string) {
  return within(scope).getByText(label, { selector: 'dt' }).nextElementSibling;
}

beforeEach(() => {
  send.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('RecordsPage shell', () => {
  it('titles the page with one h1 and a plain-language summary', () => {
    render(<RecordsPage />);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Records' })).toBeInTheDocument();
  });

  it('declares a page-specific title and description under the site name', () => {
    expect(metadata.title).toBe('Exoplanet Records | ExoplanetHub');
    expect(metadata.description).toMatch(/Exoplanet Archive/);
  });
});

describe('RecordList holders and values', () => {
  it('names every tracked record in registry order, each as its own heading', async () => {
    await renderStored([...EVERY_RECORD].reverse());

    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'Most Earth-like',
      'Hottest',
      'Largest',
      'Smallest',
      'Most massive',
      'Shortest year',
      'Nearest to us',
    ]);
  });

  it('links the holder to its planet page and shows the value through the registry formatter', async () => {
    await renderStored(EVERY_RECORD);

    const hottest = card('Hottest');
    expect(within(hottest).getByRole('link', { name: 'KELT-9 b' })).toHaveAttribute(
      'href',
      '/planet/KELT-9%20b'
    );
    expect(pair(hottest, 'Value')).toHaveTextContent('4,050 K');
    expect(pair(card('Most Earth-like'), 'Value')).toHaveTextContent('ESI 83');
    expect(pair(card('Nearest to us'), 'Value')).toHaveTextContent(/light-years away/);
  });

  it('omits the value pair rather than printing null when the stored value cannot be formatted', async () => {
    await renderStored([stored('largest', 'HAT-P-67 b', Number.NaN)]);

    const largest = card('Largest');
    expect(within(largest).getByRole('link', { name: 'HAT-P-67 b' })).toBeInTheDocument();
    expect(within(largest).queryByText('Value', { selector: 'dt' })).not.toBeInTheDocument();
    expect(largest).not.toHaveTextContent(/null|NaN/);
  });
});

describe('RecordList tenure wording', () => {
  it('reads "tracked since" for a baseline, which has no previous holders to list', async () => {
    await renderStored([stored('largest', 'HAT-P-67 b', 23.6)]);

    const largest = card('Largest');
    expect(largest).toHaveTextContent('Tracked since August 14, 2026');
    expect(largest).not.toHaveTextContent(/held since/i);
    expect(within(largest).queryByText(/previous holder/i)).not.toBeInTheDocument();
  });

  it('reads "held since" only once the record has actually changed hands', async () => {
    await renderStored([stored('hottest', 'KELT-9 b', 4050, [WASP_33B])]);

    const hottest = card('Hottest');
    expect(hottest).toHaveTextContent('Held since August 14, 2026');
    expect(hottest).not.toHaveTextContent(/tracked since/i);
  });

  it('leaves tenure out rather than printing an invalid date for a corrupt stamp', async () => {
    await renderStored([{ ...stored('largest', 'HAT-P-67 b', 23.6), since: 'not-a-date' }]);

    expect(card('Largest')).not.toHaveTextContent(/since|invalid/i);
  });
});

describe('RecordList previous holders', () => {
  it('collapses the previous holder behind a disclosure, with value and the window it held', async () => {
    await renderStored([stored('hottest', 'KELT-9 b', 4050, [WASP_33B])]);

    const displaced = history('Hottest');
    expect(displaced).not.toHaveAttribute('open');
    expect(within(displaced).getByText('Previous holder').tagName).toBe('SUMMARY');
    // Explicit role, not just the implicit one: Safari drops list semantics from a marker-less list.
    expect(within(displaced).getByRole('list')).toHaveAttribute('role', 'list');
    expect(within(displaced).getByRole('link', { name: 'WASP-33 b' })).toHaveAttribute(
      'href',
      '/planet/WASP-33%20b'
    );
    expect(displaced).toHaveTextContent('2,781 K');
    expect(displaced).toHaveTextContent('June 1, 2026 to August 14, 2026');
  });

  it('counts the holders in the summary and keeps them most recent first', async () => {
    const earlier: DisplacedHolder = {
      pl_name: 'KELT-1 b',
      value: 2400,
      since: '2026-03-03T03:00:00',
      until: WASP_33B.since,
    };
    await renderStored([stored('hottest', 'KELT-9 b', 4050, [WASP_33B, earlier])]);

    const displaced = history('Hottest');
    expect(within(displaced).getByText('Previous holders (2)')).toBeInTheDocument();
    expect(within(displaced).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'WASP-33 b',
      'KELT-1 b',
    ]);
  });

  it('degrades a displaced holder to a bare link when its value or window cannot be shown', async () => {
    const corrupt: DisplacedHolder = { ...WASP_33B, value: Number.NaN, until: 'not-a-date' };
    await renderStored([stored('hottest', 'KELT-9 b', 4050, [corrupt])]);

    const displaced = history('Hottest');
    expect(within(displaced).getByRole('link', { name: 'WASP-33 b' })).toBeInTheDocument();
    expect(within(displaced).getByRole('listitem')).toHaveTextContent(/^WASP-33 b$/);
    expect(displaced).not.toHaveTextContent(/null|NaN|invalid|June 1, 2026/);
  });
});

describe('RecordList Most Earth-like caveat', () => {
  it('says the record only ranks planets that can be scored, on that card alone', async () => {
    await renderStored(EVERY_RECORD);

    expect(card('Most Earth-like')).toHaveTextContent(/measured size, mass and temperature/);
    expect(card('Most Earth-like')).toHaveTextContent(/not a sign that it is habitable/);
    expect(screen.getAllByText(/measured size, mass and temperature/)).toHaveLength(1);
  });
});

describe('RecordList registry and table disagreeing', () => {
  it('skips a stored id the registry does not know instead of crashing', async () => {
    await renderStored([stored('coolest', 'Kepler-1654 b', 206), stored('hottest', 'KELT-9 b', 4050)]);

    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
    expect(screen.queryByText('Kepler-1654 b')).not.toBeInTheDocument();
  });

  it('skips a registry id the table has no item for', async () => {
    await renderStored(EVERY_RECORD.filter((item) => item.record_id !== 'nearest'));

    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(6);
    expect(screen.queryByRole('heading', { name: 'Nearest to us' })).not.toBeInTheDocument();
  });
});

describe('RecordList without records', () => {
  it('shows a calm empty state, not an error, when the table cannot be read', async () => {
    send.mockRejectedValue(new Error('AccessDeniedException'));

    render(await RecordList());

    expect(screen.getByText('Records are being tracked — check back soon.')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('says nothing has been tracked yet, rather than rendering nothing, for an empty table', async () => {
    await renderStored([]);

    expect(screen.getByText(/no records have been tracked yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
