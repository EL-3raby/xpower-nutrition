import { auth, db, isDummyFirebase } from './client';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// Mock User Object for local/dummy testing
const MOCK_ADMIN_USER = {
  uid: 'mock_admin_uid',
  email: 'admin@xpower.com',
  emailVerified: true,
} as User;

// Admin Login
export async function adminLogin(email: string, password: string): Promise<User> {
  if (isDummyFirebase) {
    if (email === 'admin@xpower.com' && password === 'admin123') {
      if (typeof window !== 'undefined') {
        localStorage.setItem('xpower_mock_logged_in', 'true');
        localStorage.setItem('xpower_is_admin', '1');
        document.documentElement.classList.remove('is-maintenance');
      }
      return MOCK_ADMIN_USER;
    }
    throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة في الوضع التجريبي.');
  }

  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  
  // Verify if they exist in the admins collection
  const adminDocRef = doc(db, 'admins', userCredential.user.uid);
  const adminDocSnap = await getDoc(adminDocRef);
  
  if (!adminDocSnap.exists()) {
    // If not in admin DB, sign them out immediately
    await signOut(auth);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('xpower_is_admin');
    }
    throw new Error('عذراً، هذا الحساب ليس له صلاحيات مدير.');
  }
  
  if (typeof window !== 'undefined') {
    localStorage.setItem('xpower_is_admin', '1');
    document.documentElement.classList.remove('is-maintenance');
  }

  return userCredential.user;
}

// Admin Logout
export async function adminLogout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('xpower_is_admin');
    localStorage.removeItem('xpower_mock_logged_in');
  }
  if (isDummyFirebase) {
    return;
  }
  await signOut(auth);
}

// Check if a user ID is an admin
export async function checkIsAdmin(uid: string): Promise<boolean> {
  if (isDummyFirebase) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('xpower_is_admin', '1');
      document.documentElement.classList.remove('is-maintenance');
    }
    return true;
  }
  try {
    const docRef = doc(db, 'admins', uid);
    const snap = await getDoc(docRef);
    const isAdmin = snap.exists();
    if (typeof window !== 'undefined') {
      if (isAdmin) {
        localStorage.setItem('xpower_is_admin', '1');
        document.documentElement.classList.remove('is-maintenance');
      } else {
        localStorage.removeItem('xpower_is_admin');
      }
    }
    return isAdmin;
  } catch (err) {
    console.error('Error checking admin status:', err);
    return false;
  }
}

// Listen to Auth State Changes
export function subscribeToAuth(callback: (user: User | null) => void) {
  if (isDummyFirebase) {
    const isLoggedIn = typeof window !== 'undefined' && localStorage.getItem('xpower_mock_logged_in') === 'true';
    const timer = setTimeout(() => {
      callback(isLoggedIn ? MOCK_ADMIN_USER : null);
    }, 100);
    return () => clearTimeout(timer);
  }
  return onAuthStateChanged(auth, (user) => {
    if (!user && typeof window !== 'undefined') {
      localStorage.removeItem('xpower_is_admin');
    }
    callback(user);
  });
}
