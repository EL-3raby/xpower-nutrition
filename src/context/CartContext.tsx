'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '@/lib/types';
import { trackAddToCart } from '@/lib/analytics';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  flavor?: string;
  size?: string;
  stock?: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity: number, flavor?: string, size?: string) => void;
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
      return storedCart ? JSON.parse(storedCart) : [];
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

  const addToCart = (product: Product, quantity: number, flavor?: string, size?: string) => {
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
        newCart[existingIndex].quantity = Math.min(newQuantity, product.stock);
        newCart[existingIndex].stock = product.stock;
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
