import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Restaurant } from '@/types';

function toRestaurant(id: string, data: Record<string, unknown>): Restaurant {
  return {
    id,
    name: (data.name as string) || 'Partner Store',
    logoUrl: data.avatarUrl as string | undefined,
    category: data.category as string | undefined,
    city: data.city as string | undefined,
    isOpen: data.isOpen as boolean | undefined,
  };
}

/**
 * Fetches every restaurant (a `users` doc with role "kitchen"), sorted by
 * name. This is the full merchant roster the fees admin needs to see.
 */
export async function getRestaurants(): Promise<Restaurant[]> {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('role', '==', 'kitchen'));
  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((docSnap) => toRestaurant(docSnap.id, docSnap.data()))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getRestaurantById(id: string): Promise<Restaurant> {
  const docRef = doc(db, 'users', id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists() || docSnap.data().role !== 'kitchen') {
    throw new Error(`Restaurant ${id} not found`);
  }

  return toRestaurant(docSnap.id, docSnap.data());
}
