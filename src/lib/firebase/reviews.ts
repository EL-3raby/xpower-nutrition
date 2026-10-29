import { db, isDummyFirebase } from './client';
import { 
  collection, 
  doc, 
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { Review } from '../types';
import { logAdminActivity } from './admin-actions';

// Helper to recalculate and sync exact product rating and review count from actual reviews collection
export async function syncProductRating(productIdOrSlug: string) {
  if (isDummyFirebase || !productIdOrSlug) return;
  try {
    // 1. Find product doc in Firestore (by id or by slug)
    let productRef = doc(db, 'products', productIdOrSlug);
    const productSnap = await getDoc(productRef);
    let realDocId = productIdOrSlug;
    let realSlug = productIdOrSlug;

    if (!productSnap.exists()) {
      // Try searching by slug
      const pCol = collection(db, 'products');
      const qSlug = query(pCol, where('slug', '==', productIdOrSlug));
      const slugSnap = await getDocs(qSlug);
      if (!slugSnap.empty) {
        productRef = doc(db, 'products', slugSnap.docs[0].id);
        realDocId = slugSnap.docs[0].id;
        realSlug = slugSnap.docs[0].data().slug || productIdOrSlug;
      } else {
        return; // Product doc not found
      }
    } else {
      realSlug = productSnap.data()?.slug || productIdOrSlug;
    }

    // 2. Fetch all reviews matching either realDocId or realSlug
    const reviewsColRef = collection(db, 'reviews');
    const allReviewsSnap = await getDocs(reviewsColRef);
    const matchingReviews = allReviewsSnap.docs.filter(d => {
      const data = d.data();
      return data.productId === realDocId || data.productId === realSlug;
    });

    const count = matchingReviews.length;
    let avg: number | null = null;
    if (count > 0) {
      const sum = matchingReviews.reduce((acc, d) => acc + (Number(d.data().rating) || 0), 0);
      avg = Number((sum / count).toFixed(1));
    }

    // 3. Update the product document in Firestore
    await updateDoc(productRef, {
      avgRating: avg,
      reviewCount: count,
    });
  } catch (err) {
    console.error('Failed to sync product rating:', err);
  }
}

// Sync ratings and review counts for ALL products in Firestore
export async function syncAllProductsRatings() {
  if (isDummyFirebase) return;
  try {
    const productsColRef = collection(db, 'products');
    const productsSnap = await getDocs(productsColRef);
    for (const pDoc of productsSnap.docs) {
      await syncProductRating(pDoc.id);
    }
  } catch (err) {
    console.error('Failed to sync all products ratings:', err);
  }
}

// Get reviews for a specific product
export async function getReviewsForProduct(productId: string): Promise<Review[]> {
  if (isDummyFirebase) {
    return [];
  }
  try {
    const colRef = collection(db, 'reviews');
    const q = query(colRef, where('productId', '==', productId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt
      } as Review;
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
}

// Get all reviews (for Admin panel)
export async function getAllReviews(): Promise<Review[]> {
  if (isDummyFirebase) {
    return [];
  }
  try {
    const colRef = collection(db, 'reviews');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt
      } as Review;
    });
  } catch (error) {
    console.error('Error fetching all reviews:', error);
    return [];
  }
}

// Add a review (Client side)
export async function addReview(reviewData: Omit<Review, 'id' | 'createdAt'>): Promise<string> {
  if (isDummyFirebase) {
    return 'mock_review_id';
  }

  const reviewsColRef = collection(db, 'reviews');
  const newReviewRef = doc(reviewsColRef);

  // 1. Create review doc
  await setDoc(newReviewRef, {
    ...reviewData,
    createdAt: serverTimestamp()
  });

  // 2. Sync product rating & count
  await syncProductRating(reviewData.productId);

  return newReviewRef.id;
}

// Delete a review (Admin side)
export async function deleteReview(reviewId: string, productId: string, _deletedRating?: number) {
  if (isDummyFirebase) {
    return;
  }

  const reviewRef = doc(db, 'reviews', reviewId);

  // 1. Delete review doc
  await deleteDoc(reviewRef);

  // 2. Sync product rating & count
  await syncProductRating(productId);

  await logAdminActivity('deleted review', reviewId);
}
