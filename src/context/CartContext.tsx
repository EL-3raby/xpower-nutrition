'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '@/lib/types';
import { trackAddToCart } from '@/lib/analytics';
import { getProducts } from '@/lib/firebase/products';
import { onStoreUpdate } from '@/lib/sync/store-events';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  flavor?: string;
  size?: string;
  stock?: number;
  isFreeShipping?: boolean;
  freeShippingEndDate?: string;
  isBundle?: boolean;
  bundleItems?: {
    productId: string;
    name: string;
    quantity: number;
    selectedFlavor?: string;
  }[];
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (
    product: Product,
    quantity: number,
    flavor?: string,
    size?: string,
    bundleItems?: {
      productId: string;
      name: string;
      quantity: number;
      selectedFlavor?: string;
    }[]
  ) => void;
  updateQuantity: (productId: string, quantity: number, flavor?: string, size?: string) => void;
  removeFromCart: (productId: string, flavor?: string, size?: string) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (isOpen: boolean) => void;
  lastAddedItemId: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const storedCart = localStorage.getItem('xpower_cart');
      const parsed = storedCart ? JSON.parse(storedCart) : [];
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => ({
          ...item,
          quantity: typeof item.stock === 'number' && item.stock > 0 
            ? Math.min(item.quantity, item.stock) 
            : item.quantity
        }));
      }
      return [];
    } catch (error) {
      console.error('Error loading cart from storage:', error);
      return [];
    }
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [lastAddedItemId, setLastAddedItemId] = useState<string | null>(null);

  // Mark initialized after mount to enable saving to localStorage
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Save cart to localStorage when it changes
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem('xpower_cart', JSON.stringify(cart));
    } catch (error) {
      console.error('Error saving cart to storage:', error);
    }
  }, [cart, isInitialized]);

  // Auto-sync cart items with live Firestore products (isFreeShipping, stock, price, etc.)
  useEffect(() => {
    if (!isInitialized || cart.length === 0) return;
    let isSubscribed = true;

    async function syncCartItems() {
      try {
        const liveProducts = await getProducts(undefined, false);
        if (!isSubscribed || !liveProducts || liveProducts.length === 0) return;

        const prodMap = new Map(liveProducts.map(p => [p.id, p]));
        setCart(prevCart => {
          let hasChanges = false;
          const updated = prevCart.map(item => {
            const live = prodMap.get(item.productId);
            if (!live) return item;

            const liveFreeShipping = Boolean(live.isFreeShipping);
            const liveEndDate = live.freeShippingEndDate
              ? (live.freeShippingEndDate instanceof Date
                  ? live.freeShippingEndDate.toISOString()
                  : typeof (live.freeShippingEndDate as any).toDate === 'function'
                    ? (live.freeShippingEndDate as any).toDate().toISOString()
                    : String(live.freeShippingEndDate))
              : undefined;

            if (
              item.isFreeShipping !== liveFreeShipping ||
              item.freeShippingEndDate !== liveEndDate ||
              item.price !== live.price ||
              item.stock !== live.stock
            ) {
              hasChanges = true;
              return {
                ...item,
                price: live.price,
                stock: live.stock,
                isFreeShipping: liveFreeShipping,
                freeShippingEndDate: liveEndDate,
              };
            }
            return item;
          });

          return hasChanges ? updated : prevCart;
        });
      } catch (err) {
        console.error('Error syncing cart with live products:', err);
      }
    }

    syncCartItems();

    const unsubStore = onStoreUpdate((target) => {
      if (target === 'products' || target === 'all') {
        syncCartItems();
      }
    });

    return () => {
      isSubscribed = false;
      unsubStore();
    };
  }, [cart.length, isInitialized]);

  const addToCart = (
    product: Product,
    quantity: number,
    flavor?: string,
    size?: string,
    bundleItems?: {
      productId: string;
      name: string;
      quantity: number;
      selectedFlavor?: string;
    }[]
  ) => {
    // Strict Guard: Never add out-of-stock products or out-of-stock bundles
    if (typeof product.stock === 'number' && product.stock <= 0) {
      console.warn('Cannot add out-of-stock product to cart:', product.name);
      return;
    }

    if (product.isBundle && product.bundleItems && product.bundleItems.length > 0) {
      const hasOutOfStockComponent = product.bundleItems.some(item => {
        if (item.flavorOptions && item.flavorOptions.length > 0) {
          const chosen = bundleItems?.find(b => b.productId === item.productId);
          if (chosen?.selectedFlavor) {
            const opt = item.flavorOptions.find(o => o.flavorLabel.toLowerCase() === chosen.selectedFlavor?.toLowerCase());
            if (opt && opt.stock <= 0) return true;
          }
          return item.flavorOptions.every(o => (o.stock ?? 0) <= 0);
        }
        return (item.stock ?? 0) <= 0;
      });

      if (hasOutOfStockComponent) {
        console.warn('Cannot add bundle to cart: contains out-of-stock components:', product.name);
        return;
      }
    }

    // Track Add To Cart Event (GA4 & Meta Pixel)
    if (product.id) {
      trackAddToCart({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity,
        category: product.category,
      });
    }

    // Generate a unique ID for the item based on product ID, flavor, and size
    const itemId = `${product.id}-${flavor || 'none'}-${size || 'none'}`;
    setLastAddedItemId(itemId);
    setIsDrawerOpen(true);

    setCart((prevCart) => {
      // Find existing item with exact match of ID, flavor, and size
      const existingIndex = prevCart.findIndex(
        (item) => 
          item.productId === product.id && 
          item.flavor === flavor && 
          item.size === size
      );

      if (existingIndex > -1) {
        const newCart = [...prevCart];
        const newQuantity = newCart[existingIndex].quantity + quantity;
        // Enforce product stock limit
        const limitStock = typeof product.stock === 'number' && product.stock > 0 ? product.stock : 999;
        newCart[existingIndex].quantity = Math.min(newQuantity, limitStock);
        newCart[existingIndex].stock = product.stock;
        newCart[existingIndex].price = product.price;
        newCart[existingIndex].isFreeShipping = Boolean(product.isFreeShipping);
        newCart[existingIndex].freeShippingEndDate = product.freeShippingEndDate 
          ? (product.freeShippingEndDate instanceof Date 
              ? product.freeShippingEndDate.toISOString() 
              : typeof (product.freeShippingEndDate as any).toDate === 'function' 
                ? (product.freeShippingEndDate as any).toDate().toISOString() 
                : String(product.freeShippingEndDate))
          : undefined;
        return newCart;
      }

      return [
        ...prevCart,
        {
          productId: product.id!,
          name: product.name,
          price: product.price,
          quantity: Math.min(quantity, product.stock),
          image: product.images[0] || '/images/no-image.png',
          flavor,
          size,
          stock: product.stock,
          isFreeShipping: Boolean(product.isFreeShipping),
          isBundle: Boolean(product.isBundle),
          bundleItems: bundleItems || (product.isBundle && product.bundleItems ? product.bundleItems.map(b => ({
            productId: b.productId,
            name: b.name,
            quantity: b.quantity,
            selectedFlavor: b.selectedFlavor
          })) : undefined),
          freeShippingEndDate: product.freeShippingEndDate 
            ? (product.freeShippingEndDate instanceof Date 
                ? product.freeShippingEndDate.toISOString() 
                : typeof (product.freeShippingEndDate as any).toDate === 'function' 
                  ? (product.freeShippingEndDate as any).toDate().toISOString() 
                  : String(product.freeShippingEndDate))
            : undefined,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, quantity: number, flavor?: string, size?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, flavor, size);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.productId === productId && item.flavor === flavor && item.size === size) {
          const maxStock = item.stock !== undefined ? item.stock : 999;
          return { ...item, quantity: Math.min(quantity, maxStock) };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string, flavor?: string, size?: string) => {
    setCart((prevCart) =>
      prevCart.filter(
        (item) => 
          !(item.productId === productId && item.flavor === flavor && item.size === size)
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getCartCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        getCartTotal,
        getCartCount,
        isDrawerOpen,
        setIsDrawerOpen,
        lastAddedItemId,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
