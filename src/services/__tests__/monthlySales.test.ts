import { beforeEach, describe, expect, it, vi } from 'vitest';
import { doc, getDocs, updateDoc, where } from 'firebase/firestore';
import { getCurrentMonthSalesByStore, getMonthlySalesForStore, setFeeCollected } from '../monthlySales';

vi.mock('@/lib/firebase', () => ({ db: {} }));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'monthlySales-collection'),
  doc: vi.fn((_db, _col, id) => ({ __doc: id })),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  query: vi.fn((...args) => args),
  where: vi.fn((field, op, value) => ({ field, op, value })),
  serverTimestamp: vi.fn(() => '__serverTimestamp'),
}));

const mockedDoc = vi.mocked(doc);
const mockedGetDocs = vi.mocked(getDocs);
const mockedUpdateDoc = vi.mocked(updateDoc);
const mockedWhere = vi.mocked(where);

/** A rollup doc exactly as restaurant-dashboard writes it. */
function rollup(overrides: Record<string, unknown> = {}) {
  const data = {
    storeId: 'store-a',
    storeName: 'Test Store',
    month: '2026-08',
    year: 2026,
    monthIndex: 7,
    totalRevenue: 120.5,
    orderCount: 14,
    itemsSold: 22,
    ...overrides,
  };
  return { id: `${data.storeId}_${data.month}`, data: () => data };
}

beforeEach(() => vi.clearAllMocks());

describe('getMonthlySalesForStore', () => {
  it('reads every rollup for the store', async () => {
    mockedGetDocs.mockResolvedValueOnce({ docs: [rollup()] } as never);

    await getMonthlySalesForStore('store-a');

    expect(mockedWhere).toHaveBeenCalledWith('storeId', '==', 'store-a');
  });

  it('carries the merchant’s totals through unchanged', async () => {
    mockedGetDocs.mockResolvedValueOnce({ docs: [rollup()] } as never);

    const [sales] = await getMonthlySalesForStore('store-a');

    expect(sales).toMatchObject({
      storeId: 'store-a',
      storeName: 'Test Store',
      month: '2026-08',
      totalRevenue: 120.5,
      orderCount: 14,
      itemsSold: 22,
    });
  });

  it('sorts newest month first, including across a year boundary', async () => {
    mockedGetDocs.mockResolvedValueOnce({
      docs: [
        rollup({ month: '2025-12' }),
        rollup({ month: '2026-02' }),
        rollup({ month: '2026-01' }),
      ],
    } as never);

    const sales = await getMonthlySalesForStore('store-a');

    expect(sales.map((s) => s.month)).toEqual(['2026-02', '2026-01', '2025-12']);
  });

  it('treats a rollup with no fee fields as not yet collected', async () => {
    mockedGetDocs.mockResolvedValueOnce({ docs: [rollup()] } as never);

    const [sales] = await getMonthlySalesForStore('store-a');

    expect(sales.feeCollected).toBe(false);
    expect(sales.collectedAt).toBeUndefined();
    expect(sales.collectedBy).toBeUndefined();
  });

  it('defaults missing totals to zero rather than NaN', async () => {
    mockedGetDocs.mockResolvedValueOnce({
      docs: [{ id: 'store-a_2026-08', data: () => ({ storeId: 'store-a', month: '2026-08', monthIndex: 7, year: 2026 }) }],
    } as never);

    const [sales] = await getMonthlySalesForStore('store-a');

    expect(sales).toMatchObject({ totalRevenue: 0, orderCount: 0, itemsSold: 0 });
  });

  it('converts Firestore Timestamps on the fee fields to ISO strings', async () => {
    mockedGetDocs.mockResolvedValueOnce({
      docs: [rollup({
        feeCollected: true,
        collectedBy: 'admin-1',
        collectedAt: { toDate: () => new Date('2026-08-13T09:00:00.000Z') },
        updatedAt: { toDate: () => new Date('2026-08-12T09:00:00.000Z') },
      })],
    } as never);

    const [sales] = await getMonthlySalesForStore('store-a');

    expect(sales.feeCollected).toBe(true);
    expect(sales.collectedBy).toBe('admin-1');
    expect(sales.collectedAt).toBe('2026-08-13T09:00:00.000Z');
    expect(sales.updatedAt).toBe('2026-08-12T09:00:00.000Z');
  });

  it('returns an empty list for a store that has never sold', async () => {
    mockedGetDocs.mockResolvedValueOnce({ docs: [] } as never);

    await expect(getMonthlySalesForStore('store-new')).resolves.toEqual([]);
  });
});

describe('getCurrentMonthSalesByStore', () => {
  it('queries the current calendar month in one go', async () => {
    vi.setSystemTime(new Date(2026, 7, 13));
    mockedGetDocs.mockResolvedValueOnce({ docs: [] } as never);

    await getCurrentMonthSalesByStore();

    // Must match the key restaurant-dashboard writes: "{storeId}_{YYYY-MM}".
    expect(mockedWhere).toHaveBeenCalledWith('month', '==', '2026-08');
    expect(mockedGetDocs).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('zero-pads single-digit months', async () => {
    vi.setSystemTime(new Date(2026, 0, 5));
    mockedGetDocs.mockResolvedValueOnce({ docs: [] } as never);

    await getCurrentMonthSalesByStore();

    expect(mockedWhere).toHaveBeenCalledWith('month', '==', '2026-01');
    vi.useRealTimers();
  });

  it('keys the result by storeId so the roster can join against it', async () => {
    vi.setSystemTime(new Date(2026, 7, 13));
    mockedGetDocs.mockResolvedValueOnce({
      docs: [rollup({ storeId: 'store-a' }), rollup({ storeId: 'store-b', totalRevenue: 40 })],
    } as never);

    const byStore = await getCurrentMonthSalesByStore();

    expect(byStore.get('store-a')?.totalRevenue).toBe(120.5);
    expect(byStore.get('store-b')?.totalRevenue).toBe(40);
    // A store with no rollup this month is simply absent -> "No sales yet".
    expect(byStore.get('store-c')).toBeUndefined();
    vi.useRealTimers();
  });
});

describe('setFeeCollected', () => {
  it('targets the same doc id the merchant dashboard writes', async () => {
    await setFeeCollected('store-a', '2026-08', true, 'admin-1');

    expect(mockedDoc).toHaveBeenCalledWith({}, 'monthlySales', 'store-a_2026-08');
  });

  it('stamps who collected the fee and when', async () => {
    await setFeeCollected('store-a', '2026-08', true, 'admin-1');

    expect(mockedUpdateDoc).toHaveBeenCalledWith(
      { __doc: 'store-a_2026-08' },
      { feeCollected: true, collectedAt: '__serverTimestamp', collectedBy: 'admin-1' },
    );
  });

  it('clears the audit fields when a collection is undone', async () => {
    await setFeeCollected('store-a', '2026-08', false, 'admin-1');

    expect(mockedUpdateDoc).toHaveBeenCalledWith(
      { __doc: 'store-a_2026-08' },
      { feeCollected: false, collectedAt: null, collectedBy: null },
    );
  });

  it('never writes the sales totals the merchant app owns', async () => {
    await setFeeCollected('store-a', '2026-08', true, 'admin-1');

    // updateDoc's overloads type arg 1 as `string | FieldPath` in the
    // field-path form; the object form is what the service actually uses.
    const written = mockedUpdateDoc.mock.calls[0][1] as unknown as Record<string, unknown>;
    expect(Object.keys(written).sort()).toEqual(['collectedAt', 'collectedBy', 'feeCollected']);
    for (const owned of ['totalRevenue', 'orderCount', 'itemsSold', 'storeName', 'month']) {
      expect(owned in written).toBe(false);
    }
  });

  it('surfaces a failure rather than silently reporting a fee as collected', async () => {
    // updateDoc rejects when the rollup doc does not exist, so a month with no
    // sales can never be marked collected by accident.
    mockedUpdateDoc.mockRejectedValueOnce(new Error('No document to update'));

    await expect(setFeeCollected('store-a', '2026-08', true, 'admin-1')).rejects.toThrow('No document to update');
  });
});
