import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDoc, getDocs, where } from 'firebase/firestore';
import { getRestaurantById, getRestaurants } from '../restaurants';

vi.mock('@/lib/firebase', () => ({ db: {} }));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'users-collection'),
  doc: vi.fn((_db, _col, id) => ({ __doc: id })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn((...args) => args),
  where: vi.fn((field, op, value) => ({ field, op, value })),
}));

const mockedGetDoc = vi.mocked(getDoc);
const mockedGetDocs = vi.mocked(getDocs);
const mockedWhere = vi.mocked(where);

function userSnap(id: string, data: Record<string, unknown>) {
  return { id, exists: () => true, data: () => data };
}

const KITCHEN = { name: 'Zaatar House', role: 'kitchen', avatarUrl: 'https://x.test/a.png', category: 'Bakery', city: 'Amman', isOpen: true };

beforeEach(() => vi.clearAllMocks());

describe('getRestaurants', () => {
  it('lists only kitchen accounts', async () => {
    mockedGetDocs.mockResolvedValueOnce({ docs: [userSnap('store-a', KITCHEN)] } as never);

    await getRestaurants();

    // Customers and admins must never appear on the fee roster.
    expect(mockedWhere).toHaveBeenCalledWith('role', '==', 'kitchen');
  });

  it('maps the users doc onto the roster row', async () => {
    mockedGetDocs.mockResolvedValueOnce({ docs: [userSnap('store-a', KITCHEN)] } as never);

    await expect(getRestaurants()).resolves.toEqual([
      { id: 'store-a', name: 'Zaatar House', logoUrl: 'https://x.test/a.png', category: 'Bakery', city: 'Amman', isOpen: true },
    ]);
  });

  it('sorts by name so the roster is stable between loads', async () => {
    mockedGetDocs.mockResolvedValueOnce({
      docs: [
        userSnap('c', { ...KITCHEN, name: 'Sweet Corner' }),
        userSnap('a', { ...KITCHEN, name: 'Amman Bakes' }),
        userSnap('b', { ...KITCHEN, name: 'Manakish Co' }),
      ],
    } as never);

    const roster = await getRestaurants();

    expect(roster.map((r) => r.name)).toEqual(['Amman Bakes', 'Manakish Co', 'Sweet Corner']);
  });

  it('falls back to a placeholder name so a row is never blank', async () => {
    mockedGetDocs.mockResolvedValueOnce({ docs: [userSnap('store-a', { role: 'kitchen' })] } as never);

    const [row] = await getRestaurants();

    expect(row.name).toBe('Partner Store');
    expect(row.city).toBeUndefined();
  });

  it('returns an empty roster when no kitchens exist', async () => {
    mockedGetDocs.mockResolvedValueOnce({ docs: [] } as never);

    await expect(getRestaurants()).resolves.toEqual([]);
  });
});

describe('getRestaurantById', () => {
  it('returns the kitchen', async () => {
    mockedGetDoc.mockResolvedValueOnce(userSnap('store-a', KITCHEN) as never);

    await expect(getRestaurantById('store-a')).resolves.toMatchObject({ id: 'store-a', name: 'Zaatar House' });
  });

  it('refuses a non-kitchen user id', async () => {
    // Guards against an admin browsing to /restaurants/{a customer uid} and
    // seeing a fee page for an account that can never owe fees.
    mockedGetDoc.mockResolvedValueOnce(userSnap('cust-1', { name: 'Sami', role: 'customer' }) as never);

    await expect(getRestaurantById('cust-1')).rejects.toThrow('Restaurant cust-1 not found');
  });

  it('throws for a missing user', async () => {
    mockedGetDoc.mockResolvedValueOnce({ exists: () => false } as never);

    await expect(getRestaurantById('nope')).rejects.toThrow('Restaurant nope not found');
  });
});
