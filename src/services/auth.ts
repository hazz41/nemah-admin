import { signInWithEmailAndPassword } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { AdminUser, AuthCredentials } from '@/types';

function mapFirebaseError(error: FirebaseError): string {
  switch (error.code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return 'No account found with this email or password.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

/**
 * Sign in with email + password. Rejects any account whose Firestore
 * `users/{uid}.role` isn't 'admin' — that field is only ever set by hand in
 * the Firebase console, there's no self-service way to become an admin.
 */
export async function login(credentials: AuthCredentials): Promise<AdminUser> {
  try {
    const { user: firebaseUser } = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);

    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (!userDoc.exists()) {
      throw new Error('User profile not found. Please contact support.');
    }

    const data = userDoc.data();
    if (data.role !== 'admin') {
      throw new Error('This account does not have admin access.');
    }

    return {
      id: firebaseUser.uid,
      name: data.name ?? firebaseUser.displayName ?? 'Admin',
      email: firebaseUser.email ?? credentials.email,
    };
  } catch (error) {
    if (error instanceof FirebaseError) {
      throw new Error(mapFirebaseError(error));
    }
    throw error;
  }
}
