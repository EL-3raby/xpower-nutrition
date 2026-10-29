import { db, isDummyFirebase } from './client';
import { 
  collection, 
  addDoc, 
  setDoc,
  doc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  deleteField
} from 'firebase/firestore';

import { Product } from '../types';
import { logAdminActivity } from './admin-actions';

// Retrieve all products
export async function getProducts(categorySlug?: string, activeOnly = false): Promise<Product[]> {
  if (isDummyFirebase) {
    let list = [...DEFAULT_PRODUCTS];
    if (categorySlug) {
      list = list.filter(p => p.category === categorySlug);
    }
    if (activeOnly) {
      list = list.filter(p => p.isActive);
    }
    return list;
  }
  try {
    const colRef = collection(db, 'products');
    let q = query(colRef, orderBy('createdAt', 'desc'));

    if (categorySlug && activeOnly) {
      q = query(colRef, where('category', '==', categorySlug), where('isActive', '==', true), orderBy('createdAt', 'desc'));
    } else if (categorySlug) {
      q = query(colRef, where('category', '==', categorySlug), orderBy('createdAt', 'desc'));
    } else if (activeOnly) {
      q = query(colRef, where('isActive', '==', true), orderBy('createdAt', 'desc'));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt
      } as Product;
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

// Retrieve single product by slug
export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (isDummyFirebase) {
    return DEFAULT_PRODUCTS.find(p => p.slug === slug && p.isActive) || null;
  }
  try {
    const colRef = collection(db, 'products');
    const q = query(colRef, where('slug', '==', slug), where('isActive', '==', true));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const docSnapshot = snapshot.docs[0];
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt
    } as Product;
  } catch (error) {
    console.error('Error fetching product by slug:', error);
    return null;
  }
}

// Retrieve product by ID
export async function getProductById(id: string): Promise<Product | null> {
  if (isDummyFirebase) {
    return DEFAULT_PRODUCTS.find(p => p.id === id) || null;
  }
  try {
    const docRef = doc(db, 'products', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt
    } as Product;
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    return null;
  }
}

// Add a new product
export async function addProduct(product: Omit<Product, 'id' | 'createdAt'>, customId?: string) {
  if (isDummyFirebase) {
    console.log('Mock Mode: Added product payload', product, 'with customId', customId);
    return customId || 'mock_new_prod_id';
  }
  
  // Clean up undefined fields
  const cleanData = { ...product } as any;
  Object.keys(cleanData).forEach(key => {
    if (cleanData[key] === undefined) {
      delete cleanData[key];
    }
  });

  if (customId) {
    const docRef = doc(db, 'products', customId);
    await setDoc(docRef, {
      ...cleanData,
      createdAt: serverTimestamp()
    });
    await logAdminActivity('created product', customId);
    return customId;
  } else {
    const colRef = collection(db, 'products');
    const docRef = await addDoc(colRef, {
      ...cleanData,
      createdAt: serverTimestamp()
    });
    await logAdminActivity('created product', docRef.id);
    return docRef.id;
  }
}

// Update an existing product
export async function updateProduct(id: string, product: Partial<Product>) {
  if (isDummyFirebase) {
    console.log(`Mock Mode: Updated product #${id} with payload`, product);
    return;
  }

  const docRef = doc(db, 'products', id);
  const updateData = { ...product } as any;
  delete updateData.id;
  
  // Explicitly delete optional fields from Firestore when cleared/empty
  if (updateData.oldPrice === undefined || updateData.oldPrice === null || updateData.oldPrice === 0 || isNaN(updateData.oldPrice)) {
    updateData.oldPrice = deleteField();
  }
  if (updateData.weight === undefined || updateData.weight === null || updateData.weight === '') {
    updateData.weight = deleteField();
  }
  if (updateData.servings === undefined || updateData.servings === null || updateData.servings === 0 || isNaN(updateData.servings)) {
    updateData.servings = deleteField();
  }

  // Clean up any remaining undefined fields
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });

  await updateDoc(docRef, updateData);
  await logAdminActivity('updated product', id);
}

// Delete product
export async function deleteProduct(id: string) {
  if (isDummyFirebase) {
    console.log(`Mock Mode: Deleted product #${id}`);
    return;
  }

  // 1. Delete document from Firestore
  const docRef = doc(db, 'products', id);
  await deleteDoc(docRef);

  // 2. Clean up any siteConfig references (Flash Sale & Best Sellers)
  try {
    const configRef = doc(db, 'settings', 'siteConfig');
    const configSnap = await getDoc(configRef);
    if (configSnap.exists()) {
      const configData = configSnap.data();
      let updated = false;

      if (configData.flashSale?.productId === id) {
        configData.flashSale.productId = '';
        configData.flashSale.isActive = false;
        updated = true;
      }

      if (configData.bestSellers?.productIds && Array.isArray(configData.bestSellers.productIds)) {
        if (configData.bestSellers.productIds.includes(id)) {
          configData.bestSellers.productIds = configData.bestSellers.productIds.filter((pId: string) => pId !== id);
          updated = true;
        }
      }

      if (updated) {
        await updateDoc(configRef, configData);
      }
    }
  } catch (e) {
    console.error('Error cleaning up siteConfig for deleted product:', e);
  }

  await logAdminActivity('deleted product', id);
}

// Delete product image (No-op client-side unsigned deletes in Cloudinary)
export async function deleteProductImage(imageUrl: string) {
  // TODO: Cloudinary unsigned upload does not support client-side image deletion.
  // Deletion requires API Secret, which is kept private on a backend server.
  // Images are removed from the Firestore document list only.
  console.log(`Unsigned Cloudinary mode: Removed image reference: ${imageUrl}`);
}

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod1',
    name: 'Pure X Protein',
    slug: 'pure-x-protein',
    description: 'واي بروتين معزول سريع الامتصاص ومثالي لبناء العضلات بعد التمرين المكثف.',
    category: 'protein',
    price: 250,
    oldPrice: 300,
    images: ['/images/no-image.png'],
    weight: '5 lbs',
    servings: 72,
    flavors: ['Double Chocolate', 'Vanilla Bean'],
    stock: 10,
    isActive: true,
    createdAt: new Date()
  },
  {
    id: 'prod2',
    name: 'Creatine Mono',
    slug: 'creatine-mono',
    description: 'كرياتين مونوهيدرات نقي 100% لزيادة القوة البدنية وتحسين الأداء الرياضي.',
    category: 'creatine',
    price: 120,
    images: ['/images/no-image.png'],
    weight: '300g',
    servings: 60,
    flavors: ['Unflavored'],
    stock: 5,
    isActive: true,
    createdAt: new Date()
  },
  {
    id: 'prod3',
    name: 'Titan Mass Gainer',
    slug: 'titan-mass-gainer',
    description: 'مكمل الضخامة العضلية المثالي بتركيبة غنية بالكربوهيدرات المعقدة والبروتينات والسعرات الحرارية.',
    category: 'mass-gainer',
    price: 350,
    oldPrice: 400,
    images: ['/images/no-image.png'],
    weight: '12 lbs',
    servings: 16,
    flavors: ['Double Chocolate', 'Strawberry Rush'],
    stock: 3,
    isActive: true,
    createdAt: new Date()
  },
  {
    id: 'prod4',
    name: 'Nitro Pre-Workout',
    slug: 'nitro-pre-workout',
    description: 'تركيبة طاقة متفجرة وتركيز ذهني عالي لتحقيق أقصى درجات الضخ الدموي أثناء التمرين.',
    category: 'creatine',
    price: 180,
    images: ['/images/no-image.png'],
    weight: '30 Servings',
    servings: 30,
    flavors: ['Blue Raspberry', 'Fruit Punch'],
    stock: 0,
    isActive: true,
    createdAt: new Date()
  }
];
