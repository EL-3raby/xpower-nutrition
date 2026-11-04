'use client';

import { invalidateCache } from '../cache';

export type StoreSyncTarget = 'products' | 'siteConfig' | 'categories' | 'shipping' | 'all';

export interface StoreSyncMessage {
  type: 'XPOWER_STORE_SYNC';
  target: StoreSyncTarget;
  timestamp: number;
}

const CHANNEL_NAME = 'xpower_store_realtime_sync';
const STORAGE_KEY = 'xpower_store_sync_event';

let channel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
  } catch (e) {
    console.warn('BroadcastChannel not available, falling back to storage events', e);
  }
}

/**
 * Broadcast an update event across all open tabs in the browser.
 * Also immediately clears the local in-memory cache for the given target.
 */
export function notifyAdminUpdate(target: StoreSyncTarget = 'all'): void {
  // 1. Invalidate local cache in current tab
  if (target === 'all') {
    invalidateCache();
  } else if (target === 'products') {
    invalidateCache('product');
  } else if (target === 'siteConfig') {
    invalidateCache('siteConfig');
  } else if (target === 'categories') {
    invalidateCache('categories');
  } else if (target === 'shipping') {
    invalidateCache('shippingRates');
  }

  if (typeof window === 'undefined') return;

  const payload: StoreSyncMessage = {
    type: 'XPOWER_STORE_SYNC',
    target,
    timestamp: Date.now(),
  };

  // 2. Broadcast to other tabs via BroadcastChannel (0 ms latency)
  if (channel) {
    try {
      channel.postMessage(payload);
    } catch (e) {
      console.warn('Failed to postMessage on BroadcastChannel', e);
    }
  }

  // 3. Fallback broadcast to other tabs via localStorage storage event
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota/private mode errors
  }

  // 4. Also dispatch a local CustomEvent for components in the SAME tab
  try {
    window.dispatchEvent(new CustomEvent('xpower_store_sync_local', { detail: payload }));
  } catch {}
}

/**
 * Listen for store update events from any tab or local window.
 * Returns an unsubscribe cleanup function.
 */
export function onStoreUpdate(callback: (target: StoreSyncTarget) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleMessage = (target: StoreSyncTarget) => {
    // Invalidate local memory cache before invoking callback
    if (target === 'all') {
      invalidateCache();
    } else if (target === 'products') {
      invalidateCache('product');
    } else if (target === 'siteConfig') {
      invalidateCache('siteConfig');
    } else if (target === 'categories') {
      invalidateCache('categories');
    } else if (target === 'shipping') {
      invalidateCache('shippingRates');
    }
    callback(target);
  };

  // 1. BroadcastChannel listener
  const bcListener = (event: MessageEvent<StoreSyncMessage>) => {
    if (event.data && event.data.type === 'XPOWER_STORE_SYNC') {
      handleMessage(event.data.target || 'all');
    }
  };

  if (channel) {
    channel.addEventListener('message', bcListener);
  }

  // 2. Storage event listener (cross-tab fallback)
  const storageListener = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const data = JSON.parse(e.newValue) as StoreSyncMessage;
        if (data.type === 'XPOWER_STORE_SYNC') {
          handleMessage(data.target || 'all');
        }
      } catch {}
    }
  };
  window.addEventListener('storage', storageListener);

  // 3. Local custom event listener
  const localListener = (e: Event) => {
    const custom = e as CustomEvent<StoreSyncMessage>;
    if (custom.detail && custom.detail.target) {
      handleMessage(custom.detail.target);
    }
  };
  window.addEventListener('xpower_store_sync_local', localListener);

  return () => {
    if (channel) {
      channel.removeEventListener('message', bcListener);
    }
    window.removeEventListener('storage', storageListener);
    window.removeEventListener('xpower_store_sync_local', localListener);
  };
}

