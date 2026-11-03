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
  deleteField,
  writeBatch
} from 'firebase/firestore';

import { Product } from '../types';
import { logAdminActivity } from './admin-actions';
import { cachedFetch, invalidateCache, CacheOptions } from '../cache';

// Retrieve all products
export async function getProducts(categorySlug?: string, activeOnly = false, options?: CacheOptions): Promise<Product[]> {
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
  const cacheKey = `products:${categorySlug || 'all'}:${activeOnly ? 'active' : 'all'}`;
  return cachedFetch(cacheKey, async () => {
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
      const list: Product[] = snapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt
        } as Product;
      });

      // Synchronize live real-time stock for all bundles in the product list
      const bundleProducts = list.filter(p => p.isBundle && p.bundleItems && p.bundleItems.length > 0);
      if (bundleProducts.length > 0) {
        const liveStockMap = new Map<string, number>();
        list.forEach(p => {
          if (p.id) liveStockMap.set(p.id, typeof p.stock === 'number' ? p.stock : 0);
        });

        const missingIds = new Set<string>();
        bundleProducts.forEach(b => {
          b.bundleItems?.forEach(item => {
            if (item.productId && !liveStockMap.has(item.productId)) missingIds.add(item.productId);
            if (item.flavorOptions) {
              item.flavorOptions.forEach(opt => {
                if (opt.productId && !liveStockMap.has(opt.productId)) missingIds.add(opt.productId);
              });
            }
          });
        });

        if (missingIds.size > 0) {
          await Promise.all(
            Array.from(missingIds).map(async (prodId) => {
              try {
                const pSnap = await getDoc(doc(db, 'products', prodId));
                if (pSnap.exists()) {
                  const pData = pSnap.data();
                  liveStockMap.set(prodId, typeof pData.stock === 'number' ? pData.stock : 0);
                }
              } catch (e) {
                console.warn('Failed to fetch missing bundle component stock:', prodId, e);
              }
            })
          );
        }

        // Dynamically compute real stock for each bundle
        bundleProducts.forEach(b => {
          if (!b.bundleItems) return;
          const componentMaxBundles = b.bundleItems.map(item => {
            const qtyPerBundle = item.quantity || 1;
            if (item.flavorOptions && item.flavorOptions.length > 0) {
              const maxOptionStock = Math.max(
                ...item.flavorOptions.map(opt => liveStockMap.get(opt.productId) ?? (opt.stock ?? 0)),
                0
              );
              return Math.floor(maxOptionStock / qtyPerBundle);
            }
            const compStock = liveStockMap.get(item.productId) ?? (item.stock ?? 0);
            return Math.floor(compStock / qtyPerBundle);
          });

          b.stock = Math.max(0, Math.min(...componentMaxBundles));
        });
      }

      return list;
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  }, options);
}

// Retrieve single product by slug
export async function getProductBySlug(slug: string, options?: CacheOptions): Promise<Product | null> {
  if (isDummyFirebase) {
    return DEFAULT_PRODUCTS.find(p => p.slug === slug && p.isActive) || null;
  }
  return cachedFetch(`product:slug:${slug}`, async () => {
    try {
      const colRef = collection(db, 'products');
      const q = query(colRef, where('slug', '==', slug), where('isActive', '==', true));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const docSnapshot = snapshot.docs[0];
      const data = docSnapshot.data();

      // If this is a bundle, resolve live real-time stock for all component flavor options
      if (data.isBundle && data.bundleItems && Array.isArray(data.bundleItems)) {
        const refIds = new Set<string>();
        data.bundleItems.forEach((it: any) => {
          if (it.productId) refIds.add(it.productId);
          if (it.flavorOptions && Array.isArray(it.flavorOptions)) {
            it.flavorOptions.forEach((opt: any) => {
              if (opt.productId) refIds.add(opt.productId);
            });
          }
        });

        if (refIds.size > 0) {
          const liveStockMap = new Map<string, number>();
          await Promise.all(
            Array.from(refIds).map(async (prodId) => {
              try {
                const pSnap = await getDoc(doc(db, 'products', prodId));
                if (pSnap.exists()) {
                  const pData = pSnap.data();
                  liveStockMap.set(prodId, typeof pData.stock === 'number' ? pData.stock : 0);
                }
              } catch (e) {
                console.warn('Failed to fetch live component stock:', prodId, e);
              }
            })
          );

          data.bundleItems = data.bundleItems.map((it: any) => {
            let updatedOptions = it.flavorOptions;
            if (updatedOptions && Array.isArray(updatedOptions)) {
              updatedOptions = updatedOptions.map((opt: any) => ({
                ...opt,
                stock: liveStockMap.has(opt.productId) ? liveStockMap.get(opt.productId)! : (opt.stock ?? 0)
              }));
            }
            return {
              ...it,
              flavorOptions: updatedOptions
            };
          });

          // Dynamically compute the bundle's maximum purchasable stock based on live component inventory
          const bundleMaxStock = data.bundleItems.map((it: any) => {
            const qtyPerBundle = it.quantity || 1;
            if (it.flavorOptions && Array.isArray(it.flavorOptions) && it.flavorOptions.length > 0) {
              const maxFlavorStock = Math.max(
                ...it.flavorOptions.map((opt: any) => liveStockMap.get(opt.productId) ?? (opt.stock ?? 0)),
                0
              );
              return Math.floor(maxFlavorStock / qtyPerBundle);
            }
            const compStock = liveStockMap.get(it.productId) ?? (it.stock ?? 0);
            return Math.floor(compStock / qtyPerBundle);
          });
          data.stock = Math.max(0, Math.min(...bundleMaxStock));
        }
      }

      return {
        id: docSnapshot.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt
      } as Product;
    } catch (error) {
      console.error('Error fetching product by slug:', error);
      return null;
    }
  }, options);
}

// Retrieve product by ID
export async function getProductById(id: string, options?: CacheOptions): Promise<Product | null> {
  if (isDummyFirebase) {
    return DEFAULT_PRODUCTS.find(p => p.id === id) || null;
  }
  return cachedFetch(`product:id:${id}`, async () => {
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
  }, options);
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
    invalidateCache('product');
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
  if (updateData.isBundle === false) {
    updateData.bundleItems = deleteField();
  }

  // Clean up any remaining undefined fields
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });

  await updateDoc(docRef, updateData);

  // If a regular product's stock was updated, propagate changes to any bundles that include it
  if (typeof updateData.stock === 'number') {
    try {
      const bundlesSnap = await getDocs(query(collection(db, 'products'), where('isBundle', '==', true)));
      for (const bDoc of bundlesSnap.docs) {
        const bData = bDoc.data();
        if (!bData.bundleItems || !Array.isArray(bData.bundleItems)) continue;

        const isReferenced = bData.bundleItems.some((item: any) => 
          item.productId === id || 
          (item.flavorOptions && item.flavorOptions.some((opt: any) => opt.productId === id))
        );

        if (isReferenced) {
          const refIds = new Set<string>();
          bData.bundleItems.forEach((item: any) => {
            if (item.productId) refIds.add(item.productId);
            if (item.flavorOptions) {
              item.flavorOptions.forEach((opt: any) => {
                if (opt.productId) refIds.add(opt.productId);
              });
            }
          });

          const liveMap = new Map<string, number>();
          liveMap.set(id, updateData.stock);

          await Promise.all(
            Array.from(refIds).filter(rId => rId !== id).map(async (rId) => {
              try {
                const s = await getDoc(doc(db, 'products', rId));
                if (s.exists()) {
                  liveMap.set(rId, typeof s.data().stock === 'number' ? s.data().stock : 0);
                }
              } catch (e) {
                console.warn('Failed to fetch component stock during bundle sync:', rId, e);
              }
            })
          );

          const updatedBundleItems = bData.bundleItems.map((item: any) => {
            let updatedOpts = item.flavorOptions;
            if (updatedOpts && Array.isArray(updatedOpts)) {
              updatedOpts = updatedOpts.map((opt: any) => ({
                ...opt,
                stock: liveMap.get(opt.productId) ?? (opt.stock || 0)
              }));
            }
            return {
              ...item,
              stock: liveMap.get(item.productId) ?? (item.stock || 0),
              flavorOptions: updatedOpts
            };
          });

          const compMax = updatedBundleItems.map((item: any) => {
            const qty = item.quantity || 1;
            if (item.flavorOptions && item.flavorOptions.length > 0) {
              const maxOpt = Math.max(...item.flavorOptions.map((opt: any) => liveMap.get(opt.productId) ?? (opt.stock || 0)), 0);
              return Math.floor(maxOpt / qty);
            }
            const s = liveMap.get(item.productId) ?? (item.stock || 0);
            return Math.floor(s / qty);
          });

          const newBundleStock = Math.max(0, Math.min(...compMax));
          await updateDoc(doc(db, 'products', bDoc.id), {
            stock: newBundleStock,
            bundleItems: updatedBundleItems
          });
        }
      }
    } catch (e) {
      console.warn('Failed to auto-sync bundle stocks:', e);
    }
  }

  invalidateCache('product');
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
  invalidateCache('product');
  invalidateCache('siteConfig');

  // 2. Clean up any siteConfig references (Flash Sale & Best Sellers)
  try {
    const configRef = doc(db, 'settings', 'siteConfig');
    const configSnap = await getDoc(configRef);
    if (configSnap.exists()) {
      const configData = configSnap.data();
      let updated = false;

      if (configData.flashSale?.items && Array.isArray(configData.flashSale.items)) {
        const prevLen = configData.flashSale.items.length;
        configData.flashSale.items = configData.flashSale.items.filter((item: any) => item.productId !== id);
        if (configData.flashSale.items.length !== prevLen) {
          updated = true;
          if (configData.flashSale.items.length === 0) {
            configData.flashSale.isActive = false;
            configData.flashSale.productId = '';
          } else {
            configData.flashSale.productId = configData.flashSale.items[0].productId;
          }
        }
      } else if (configData.flashSale?.productId === id) {
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

// ==========================================
// Bulk Discount Actions (تطبيق وإلغاء الخصم الجماعي)
// ==========================================
export interface BulkDiscountOptions {
  type: 'percentage' | 'fixed';
  value: number;
  scope: 'all' | string; // 'all' or category slug
  theme?: 'white' | 'gold' | 'cyan' | 'purple' | 'crimson';
  endDate?: string | null; // ISO string e.g. "2026-11-05T23:59"
  excludeDiscounted?: boolean;
}

export async function applyBulkDiscount(options: BulkDiscountOptions): Promise<{ updatedCount: number }> {
  if (isDummyFirebase) {
    console.log('Mock Mode: applyBulkDiscount', options);
    return { updatedCount: 0 };
  }

  const allProducts = await getProducts();
  const targetProducts = allProducts.filter(p => {
    if (!p.id) return false;
    // Check scope
    if (options.scope !== 'all' && p.category !== options.scope) {
      return false;
    }
    // Check if already discounted and exclude is checked
    if (options.excludeDiscounted && p.oldPrice && p.oldPrice > p.price) {
      return false;
    }
    return true;
  });

  if (targetProducts.length === 0) {
    return { updatedCount: 0 };
  }

  const siteConfigRef = doc(db, 'settings', 'siteConfig');
  const bulkConfigPayload: any = {
    bulkDiscount: {
      isActive: true,
      type: options.type,
      value: options.value,
      scope: options.scope,
      theme: options.theme || 'white',
      endDate: options.endDate || null,
      appliedAt: new Date().toISOString(),
      itemsCount: targetProducts.length
    }
  };

  const BATCH_SIZE = 400;
  for (let i = 0; i < targetProducts.length; i += BATCH_SIZE) {
    const chunk = targetProducts.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    chunk.forEach(product => {
      // If product already had oldPrice > price, base price is oldPrice; otherwise base price is price
      const basePrice = (product.oldPrice && product.oldPrice > product.price) 
        ? product.oldPrice 
        : product.price;

      let newPrice = basePrice;
      if (options.type === 'percentage') {
        const discount = Math.round(basePrice * (options.value / 100));
        newPrice = Math.max(10, basePrice - discount);
      } else {
        newPrice = Math.max(10, Math.round(basePrice - options.value));
      }

      const docRef = doc(db, 'products', product.id!);
      batch.update(docRef, {
        price: newPrice,
        oldPrice: basePrice,
        ...(options.endDate ? { discountEndDate: options.endDate } : { discountEndDate: deleteField() })
      });
    });

    if (i === 0) {
      batch.set(siteConfigRef, bulkConfigPayload, { merge: true });
    }

    await batch.commit();
  }

  invalidateCache('product');
  invalidateCache('siteConfig');

  const discountText = options.type === 'percentage' ? `${options.value}%` : `${options.value} ج.م`;
  await logAdminActivity(
    `طبّق خصم جماعي (${discountText}) على ${targetProducts.length} منتج`,
    'products'
  );

  return { updatedCount: targetProducts.length };
}

export async function revertBulkDiscount(): Promise<{ revertedCount: number }> {
  if (isDummyFirebase) {
    console.log('Mock Mode: revertBulkDiscount');
    return { revertedCount: 0 };
  }

  const allProducts = await getProducts();
  const discountedProducts = allProducts.filter(p => p.id && p.oldPrice && p.oldPrice > p.price);

  if (discountedProducts.length === 0) {
    // Just deactivate bulkDiscount in config if set
    const siteConfigRef = doc(db, 'settings', 'siteConfig');
    await setDoc(siteConfigRef, {
      bulkDiscount: {
        isActive: false,
        revertedAt: new Date().toISOString()
      }
    }, { merge: true });
    return { revertedCount: 0 };
  }

  const siteConfigRef = doc(db, 'settings', 'siteConfig');
  const BATCH_SIZE = 400;

  for (let i = 0; i < discountedProducts.length; i += BATCH_SIZE) {
    const chunk = discountedProducts.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    chunk.forEach(product => {
      const docRef = doc(db, 'products', product.id!);
      batch.update(docRef, {
        price: product.oldPrice!,
        oldPrice: deleteField(),
        discountEndDate: deleteField()
      });
    });

    if (i === 0) {
      batch.set(siteConfigRef, {
        bulkDiscount: {
          isActive: false,
          revertedAt: new Date().toISOString()
        }
      }, { merge: true });
    }

    await batch.commit();
  }

  invalidateCache('product');
  invalidateCache('siteConfig');

  await logAdminActivity(
    `استعاد الأسعار الأصلية وألغى الخصم لـ ${discountedProducts.length} منتج`,
    'products'
  );

  return { revertedCount: discountedProducts.length };
}

export interface FreeShippingScopeOptions {
  scope: 'all' | 'category' | 'product';
  targetId?: string; // categorySlug or single productId
  targetIds?: string[]; // array of product IDs or category slugs for multi-selection
  isFreeShipping: boolean;
  endDate?: string | null; // ISO date string or null
}

export async function applyFreeShipping(options: FreeShippingScopeOptions): Promise<{ updatedCount: number }> {
  if (isDummyFirebase) {
    console.log('Mock Mode: applyFreeShipping', options);
    return { updatedCount: 0 };
  }

  const allProducts = await getProducts();
  const targetProducts = allProducts.filter(p => {
    if (!p.id) return false;
    if (options.scope === 'product') {
      if (options.targetIds && options.targetIds.length > 0) {
        return options.targetIds.includes(p.id);
      }
      return p.id === options.targetId;
    }
    if (options.scope === 'category') {
      if (options.targetIds && options.targetIds.length > 0) {
        return options.targetIds.includes(p.category);
      }
      return p.category === options.targetId;
    }
    return true; // 'all'
  });

  if (targetProducts.length === 0) {
    return { updatedCount: 0 };
  }

  const BATCH_SIZE = 400;
  for (let i = 0; i < targetProducts.length; i += BATCH_SIZE) {
    const chunk = targetProducts.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    chunk.forEach(product => {
      const docRef = doc(db, 'products', product.id!);
      if (options.isFreeShipping) {
        batch.update(docRef, {
          isFreeShipping: true,
          ...(options.endDate ? { freeShippingEndDate: options.endDate } : { freeShippingEndDate: deleteField() })
        });
      } else {
        batch.update(docRef, {
          isFreeShipping: false,
          freeShippingEndDate: deleteField()
        });
      }
    });

    await batch.commit();
  }

  invalidateCache('product');

  const actionText = options.isFreeShipping ? 'تفعيل' : 'إلغاء';
  let scopeDesc = 'كل المنتجات';
  if (options.scope === 'category') {
    if (options.targetIds && options.targetIds.length > 1) {
      scopeDesc = `(${options.targetIds.length}) أقسام محددة`;
    } else {
      scopeDesc = `قسم (${options.targetId || options.targetIds?.[0]})`;
    }
  } else if (options.scope === 'product') {
    if (options.targetIds && options.targetIds.length > 1) {
      scopeDesc = `(${options.targetIds.length}) منتجات محددة`;
    } else {
      const pName = targetProducts[0]?.name || options.targetId;
      scopeDesc = `المنتج (${pName})`;
    }
  }

  const durationText = options.endDate ? ` (ينتهي في ${new Date(options.endDate).toLocaleString('ar-EG')})` : '';

  await logAdminActivity(
    `${actionText} الشحن المجاني لـ ${scopeDesc} (${targetProducts.length} منتج)${durationText}`,
    'products'
  );

  return { updatedCount: targetProducts.length };
}

export async function toggleProductFreeShipping(
  productId: string, 
  isFreeShipping: boolean,
  endDate?: string | null
): Promise<void> {
  if (isDummyFirebase) {
    console.log('Mock Mode: toggleProductFreeShipping', productId, isFreeShipping);
    return;
  }

  const docRef = doc(db, 'products', productId);
  if (isFreeShipping) {
    await updateDoc(docRef, {
      isFreeShipping: true,
      ...(endDate ? { freeShippingEndDate: endDate } : { freeShippingEndDate: deleteField() })
    });
  } else {
    await updateDoc(docRef, {
      isFreeShipping: false,
      freeShippingEndDate: deleteField()
    });
  }

  invalidateCache('product');

  await logAdminActivity(
    `${isFreeShipping ? 'تفعيل' : 'إلغاء'} الشحن المجاني للمنتج (${productId})`,
    'products'
  );
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
