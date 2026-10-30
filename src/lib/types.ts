import { Timestamp } from 'firebase/firestore';

export interface Product {
  id?: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  price: number;
  oldPrice?: number;
  discountEndDate?: string | Timestamp | Date;
  images: string[];
  weight?: string;
  servings?: number;
  flavors?: string[];
  stock: number;
  salesCount?: number;
  avgRating?: number | null;
  reviewCount?: number;
  isActive: boolean;
  createdAt: Timestamp | Date;
}

export interface Review {
  id?: string;
  productId: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: Timestamp | Date;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  flavor?: string;
}

export interface Order {
  id?: string;
  customerName: string;
  phone: string;
  address: string;
  city: string;
  items: OrderItem[];
  totalPrice: number;
  paymentMethod: 'cod' | 'vodafone_cash' | 'instapay';
  vodafoneCashNumber?: string;        // دفع فودافون كاش كامل
  instapayHandle?: string;            // دفع انستاباي كامل
  depositPaymentMethod?: 'vodafone_cash' | 'instapay';  // طريقة دفع الديبوزيت (فقط لو cod)
  depositSenderInfo?: string;         // رقم/يوزرنيم اللي حول منه الديبوزيت
  depositAmount?: number;             // = shippingCost وقت الطلب بالظبط
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  isReadByAdmin: boolean;
  createdAt: Timestamp | Date;
  paymentProofUrl?: string;           // مشتركة بين الحالات التلاتة اللي محتاجة إثبات
  paymentStatus?: 'pending_review' | 'confirmed' | 'rejected';
  couponCode?: string;
  discountAmount?: number;
  stockRestored?: boolean;
}

export interface Admin {
  uid: string;
  email: string;
  displayName: string;
}

export interface Category {
  id?: string;
  name: string;
  slug: string;
  order: number;
  isActive: boolean;
}

export interface Coupon {
  id?: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue?: number;
  isActive: boolean;
  expiryDate?: Timestamp | Date;
  isAffiliateCode?: boolean;
  affiliateName?: string;
  affiliateContact?: string;
  commissionType?: 'percentage' | 'fixed_per_order';
  commissionValue?: number;
  paidAmount?: number;
  lastPaidAt?: Timestamp | Date;
}

export interface SiteConfig {
  heroBanner: {
    imageUrl: string;
    mobileImageUrl?: string;
    title: string;
    subtitle: string;
    ctaText: string;
    ctaLink: string;
  };
  promoBanner: {
    isActive: boolean;
    text: string;
    expiryDate?: Timestamp | Date;
  };
  contactInfo: {
    phone: string;
    whatsapp: string;
    email: string;
  };
  socialLinks: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
  };
  trustBadges?: string[];
  freeShipping?: {
    isEnabled: boolean;
    thresholdAmount: number;
    depositAmountWhenFree?: number;
  };
  flashSale?: {
    isActive: boolean;
    productId: string;
    endDateTime: Timestamp | Date;
  };
  bestSellers?: {
    isActive: boolean;
    productIds?: string[];
  };
  socialProof?: {
    isActive: boolean;
    images: string[];
  };
  authenticityCheck?: {
    isActive: boolean;
  };
  paymentReceivingInfo?: {
    vodafoneCashNumber: string;
    instapayHandle: string;
    instapayPaymentLink?: string;
    vodafoneCashPaymentLink?: string;
  };
  paymentMethodsEnabled?: {
    cod: boolean;
    vodafoneCash: boolean;
    instapay: boolean;
  };
  maintenanceMode?: {
    isActive: boolean;
    title?: string;
    message?: string;
    estimatedEndTime?: string;
  };
  bulkDiscount?: {
    isActive: boolean;
    type: 'percentage' | 'fixed';
    value: number;
    scope: 'all' | string;
    theme?: 'white' | 'gold' | 'cyan' | 'purple' | 'crimson';
    endDate?: string | null;
    appliedAt?: string;
    itemsCount?: number;
  };
}

export interface ShippingRate {
  id?: string;
  cityName: string;
  rate: number;
  isActive: boolean;
}

export interface ActivityLog {
  id?: string;
  adminEmail: string;
  action: string;
  targetId: string;
  timestamp: Timestamp | Date;
}

export interface PromoPopup {
  isActive: boolean;
  imageUrl: string;
  ctaText: string;
  ctaLink: string;
  endDateTime: Timestamp | Date;
  showCountdown: boolean;
}

export interface AbandonedCheckout {
  phone: string;
  customerName?: string;
  items: { productId: string; name: string; price: number; quantity: number }[];
  totalPrice: number;
  lastUpdatedAt: Timestamp | Date;
  isContacted: boolean;
  isConverted: boolean;
}

export interface AuthenticityCode {
  code: string;
  productName?: string;
  isUsed: boolean;
  usedAt?: Timestamp | Date;
  createdAt: Timestamp | Date;
}
