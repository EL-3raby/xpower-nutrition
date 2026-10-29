'use client';

/**
 * Analytics event helpers.
 *
 * GA4 events are pushed via `window.dataLayer.push(...)` so that Google Tag
 * Manager (GTM) picks them up.  GTM is the single owner of the GA4 tag —
 * there is NO direct gtag.js script loaded alongside it.
 *
 * Meta Pixel events still use the global `fbq()` function loaded by
 * Analytics.tsx.
 */

const isBrowser = typeof window !== 'undefined';
const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID || '1065044719907009';

function unlockMetaPixel() {
  if (!isBrowser) return;
  try {
    const inst = (window as any).fbq?.instance;
    if (inst?.optIns) {
      const proto = Object.getPrototypeOf(inst.optIns);
      if (proto && !proto._unlocked) {
        proto._unlocked = true;
        const origProto = proto.isOptedIn;
        proto.isOptedIn = function(pId: any, feat: any) {
          if (feat === 'EventValidation') return false;
          return origProto.apply(this, arguments);
        };
      }
      inst.optIns.isOptedIn = function(pId: any, feat: any) {
        if (feat === 'EventValidation') return false;
        return proto ? proto.isOptedIn.apply(this, arguments) : false;
      };
    }
    if (inst?.pluginConfig?._configStore?.eventValidation) {
      const ev = inst.pluginConfig._configStore.eventValidation['1065044719907009'];
      if (ev) {
        ev.restrictedEventNames = [];
        ev.unverifiedEventNames = [];
      }
    }
  } catch {
    // ignore
  }
}

const canTrackGTM = () =>
  isBrowser && Array.isArray((window as any).dataLayer);

const canTrackPixel = () => {
  if (
    !isBrowser ||
    !Boolean(pixelId) ||
    pixelId === 'your_meta_pixel_id_here' ||
    typeof (window as any).fbq !== 'function'
  ) {
    return false;
  }
  unlockMetaPixel();
  return true;
};

/**
 * 1. View Item (Product Details Page)
 * GTM/GA4: view_item
 * Meta Pixel: ViewContent
 */
export function trackViewItem(product: {
  id?: string;
  name: string;
  price: number;
  category?: string;
}) {
  try {
    if (canTrackGTM()) {
      (window as any).dataLayer.push({
        event: 'view_item',
        ecommerce: {
          currency: 'EGP',
          value: product.price,
          items: [
            {
              item_id: product.id || '',
              item_name: product.name,
              price: product.price,
              item_category: product.category || '',
            },
          ],
        },
      });
    }

    if (canTrackPixel()) {
      (window as any).fbq('track', 'ViewContent', {
        content_name: product.name,
        content_category: product.category || '',
        content_ids: [product.id || ''],
        content_type: 'product',
        value: product.price,
        currency: 'EGP',
      });
      (window as any).fbq('trackCustom', 'Custom_ViewContent', {
        content_name: product.name,
        content_category: product.category || '',
        content_ids: [product.id || ''],
        content_type: 'product',
        value: product.price,
        currency: 'EGP',
      });
    }
  } catch (err) {
    console.error('Analytics trackViewItem error:', err);
  }
}

/**
 * 2. Add To Cart
 * GTM/GA4: add_to_cart
 * Meta Pixel: AddToCart + Custom_AddToCart
 */
export function trackAddToCart(item: {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}) {
  try {
    const totalValue = item.price * item.quantity;

    if (canTrackGTM()) {
      (window as any).dataLayer.push({
        event: 'add_to_cart',
        ecommerce: {
          currency: 'EGP',
          value: totalValue,
          items: [
            {
              item_id: item.productId,
              item_name: item.name,
              price: item.price,
              quantity: item.quantity,
              item_category: item.category || '',
            },
          ],
        },
      });
    }

    if (canTrackPixel()) {
      (window as any).fbq('track', 'AddToCart', {
        content_name: item.name,
        content_category: item.category || '',
        content_ids: [item.productId],
        content_type: 'product',
        value: totalValue,
        currency: 'EGP',
      });
      (window as any).fbq('trackCustom', 'Custom_AddToCart', {
        content_name: item.name,
        content_category: item.category || '',
        content_ids: [item.productId],
        content_type: 'product',
        value: totalValue,
        currency: 'EGP',
      });
    }
  } catch (err) {
    console.error('Analytics trackAddToCart error:', err);
  }
}

/**
 * 3. Begin Checkout
 * GTM/GA4: begin_checkout
 * Meta Pixel: InitiateCheckout + Custom_InitiateCheckout
 */
export function trackBeginCheckout(
  cartItems: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }[],
  totalValue: number
) {
  try {
    if (canTrackGTM()) {
      (window as any).dataLayer.push({
        event: 'begin_checkout',
        ecommerce: {
          currency: 'EGP',
          value: totalValue,
          items: cartItems.map((item) => ({
            item_id: item.productId,
            item_name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        },
      });
    }

    if (canTrackPixel()) {
      (window as any).fbq('track', 'InitiateCheckout', {
        content_ids: cartItems.map((item) => item.productId),
        content_type: 'product',
        num_items: cartItems.reduce((sum, item) => sum + item.quantity, 0),
        value: totalValue,
        currency: 'EGP',
      });
      (window as any).fbq('trackCustom', 'Custom_InitiateCheckout', {
        content_ids: cartItems.map((item) => item.productId),
        content_type: 'product',
        num_items: cartItems.reduce((sum, item) => sum + item.quantity, 0),
        value: totalValue,
        currency: 'EGP',
      });
    }
  } catch (err) {
    console.error('Analytics trackBeginCheckout error:', err);
  }
}

/**
 * 4. Purchase (Triggered ONCE upon order creation success in checkout submit handler)
 * GTM/GA4: purchase
 * Meta Pixel: Purchase + Custom_Purchase
 */
export function trackPurchase(order: {
  transactionId: string;
  totalPrice: number;
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }[];
}) {
  try {
    if (canTrackGTM()) {
      (window as any).dataLayer.push({
        event: 'purchase',
        ecommerce: {
          transaction_id: order.transactionId,
          value: order.totalPrice,
          currency: 'EGP',
          items: order.items.map((item) => ({
            item_id: item.productId,
            item_name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        },
      });
    }

    if (canTrackPixel()) {
      (window as any).fbq('track', 'Purchase', {
        content_ids: order.items.map((item) => item.productId),
        content_type: 'product',
        value: order.totalPrice,
        currency: 'EGP',
        num_items: order.items.reduce((sum, item) => sum + item.quantity, 0),
      });
      (window as any).fbq('trackCustom', 'Custom_Purchase', {
        content_ids: order.items.map((item) => item.productId),
        content_type: 'product',
        value: order.totalPrice,
        currency: 'EGP',
        num_items: order.items.reduce((sum, item) => sum + item.quantity, 0),
      });
    }
  } catch (err) {
    console.error('Analytics trackPurchase error:', err);
  }
}
