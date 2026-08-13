import { collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MonthlySales } from '@/types';

function docId(storeId: string, month: string): string {
  return `${storeId}_${month}`;
}

function toMonthlySales(data: Record<string, unknown>): MonthlySales {
  const collectedAt = data.collectedAt as { toDate?: () => Date } | string | undefined;
  const updatedAt = data.updatedAt as { toDate?: () => Date } | string | undefined;
  return {
    storeId: data.storeId as string,
    storeName: data.storeName as string,
    month: data.month as string,
    year: data.year as number,
    monthIndex: data.monthIndex as number,
    totalRevenue: (data.totalRevenue as number) ?? 0,
    orderCount: (data.orderCount as number) ?? 0,
    itemsSold: (data.itemsSold as number) ?? 0,
    feeCollected: (data.feeCollected as boolean) ?? false,
    collectedAt: typeof collectedAt === 'object' && collectedAt?.toDate ? collectedAt.toDate().toISOString() : (collectedAt as string | undefined),
    collectedBy: data.collectedBy as string | undefined,
    updatedAt: typeof updatedAt === 'object' && updatedAt?.toDate ? updatedAt.toDate().toISOString() : (updatedAt as string | undefined),
  };
}

/** Fetches a single store's monthly rollups, newest month first. */
export async function getMonthlySalesForStore(storeId: string): Promise<MonthlySales[]> {
  const salesRef = collection(db, 'monthlySales');
  const q = query(salesRef, where('storeId', '==', storeId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => toMonthlySales(docSnap.data())).sort((a, b) => (a.month < b.month ? 1 : -1));
}

/**
 * Fetches every store's rollup for the current calendar month in one query,
 * so the restaurant list can show a collected/pending badge without an
 * extra fetch per store.
 */
export async function getCurrentMonthSalesByStore(): Promise<Map<string, MonthlySales>> {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const salesRef = collection(db, 'monthlySales');
  const q = query(salesRef, where('month', '==', monthKey));
  const snapshot = await getDocs(q);

  const byStore = new Map<string, MonthlySales>();
  for (const docSnap of snapshot.docs) {
    const sales = toMonthlySales(docSnap.data());
    byStore.set(sales.storeId, sales);
  }
  return byStore;
}

/**
 * Toggles whether the platform fee for a given store/month has been
 * collected. Only touches the three fee-tracking fields — the sales totals
 * themselves are owned by the restaurant-dashboard, never written here.
 */
export async function setFeeCollected(storeId: string, month: string, collected: boolean, adminId: string): Promise<void> {
  const docRef = doc(db, 'monthlySales', docId(storeId, month));
  await updateDoc(docRef, {
    feeCollected: collected,
    collectedAt: collected ? serverTimestamp() : null,
    collectedBy: collected ? adminId : null,
  });
}
