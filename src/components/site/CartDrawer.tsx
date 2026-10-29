'use client';

import React from 'react';
import Link from 'next/link';
import { useCart } from '@/hooks/useCart';
import { getSiteConfig } from '@/lib/firebase/admin-actions';
import { SiteConfig } from '@/lib/types';

export default function CartDrawer() {
  const { cart, removeFromCart, updateQuantity, getCartTotal, isDrawerOpen, setIsDrawerOpen, lastAddedItemId } = useCart();
  const [siteConfig, setSiteConfig] = React.useState<SiteConfig | null>(null);

  React.useEffect(() => {
    if (isDrawerOpen && !siteConfig) {
      getSiteConfig().then(config => setSiteConfig(config)).catch(console.error);
    }
  }, [isDrawerOpen, siteConfig]);

  const handleClose = () => {
    setIsDrawerOpen(false);
  };

  return (
    <div 
      className={`fixed inset-0 z-[9999] overflow-hidden transition-all duration-300 ${isDrawerOpen ? 'visible' : 'invisible pointer-events-none'}`}
    >
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/85 backdrop-blur-sm transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10" dir="rtl">
        <div 
          className={`w-screen max-w-md bg-[#050505] shadow-[-15px_0_30px_rgba(227,30,36,0.1)] flex flex-col transition-transform duration-300 ease-in-out ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-black/40">
            <h2 className="font-display text-2xl font-black italic uppercase tracking-wider text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-accent-red">shopping_cart</span>
              السلة
            </h2>
            <button 
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-accent-red text-text-muted hover:text-white flex items-center justify-center transition-all duration-300 hover:rotate-90"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Free Shipping Progress Bar */}
          {cart.length > 0 && siteConfig?.freeShipping?.isEnabled && siteConfig.freeShipping.thresholdAmount > 0 && (
            <div className="px-6 py-4 bg-[#0a0a0a] border-b border-white/5 relative overflow-hidden shadow-[inset_0_-10px_20px_rgba(0,0,0,0.2)]">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(227,30,36,0.08)_0%,_transparent_70%)] pointer-events-none"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-accent-red">local_shipping</span>
                    الشحن المجاني
                  </span>
                  <span className="text-[13px] font-black text-accent-red">
                    {getCartTotal() >= siteConfig.freeShipping.thresholdAmount 
                      ? 'مبروك! شحن مجاني 🎉' 
                      : `باقي ${(siteConfig.freeShipping.thresholdAmount - getCartTotal()).toLocaleString()} ج`}
                  </span>
                </div>
                
                <div className="w-full h-2.5 bg-black rounded-full overflow-hidden border border-white/10 p-[1px]">
                  <div 
                    className="h-full bg-gradient-to-l from-accent-red to-[#5c0000] rounded-full transition-all duration-1000 ease-out relative overflow-hidden shadow-[0_0_10px_rgba(227,30,36,0.8)]"
                    style={{ width: `${Math.min(100, (getCartTotal() / siteConfig.freeShipping.thresholdAmount) * 100)}%` }}
                  >
                    {/* Glossy overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent rounded-full"></div>
                    {/* Animated shine */}
                    <div className="absolute top-0 left-0 w-[50%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 animate-[pulse_2s_ease-in-out_infinite]"></div>
                  </div>
                </div>
                
                <p className="text-[11px] text-text-muted mt-2 text-center font-body opacity-80">
                  {getCartTotal() >= siteConfig.freeShipping.thresholdAmount 
                    ? 'طلبك مؤهل للحصول على شحن مجاني بالكامل' 
                    : 'أضف المزيد من المنتجات للحصول على شحن مجاني للطلب'}
                </p>
              </div>
            </div>
          )}

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                <span className="material-symbols-outlined text-6xl text-text-muted/30">shopping_basket</span>
                <p className="font-body text-text-muted">عربية التسوق فاضية دلوقتي.</p>
                <Link 
                  href="/products" 
                  onClick={handleClose}
                  className="bg-accent-red text-white font-product-title px-6 py-2.5 btn-diagonal hover:scale-105 transition-transform"
                >
                  شوف المنتجات
                </Link>
              </div>
            ) : (
              cart.map((item, idx) => {
                const itemId = `${item.productId}-${item.flavor || 'none'}-${item.size || 'none'}`;
                const isJustAdded = itemId === lastAddedItemId;
                
                return (
                  <div 
                  key={`${item.productId}-${item.flavor}-${item.size}-${idx}`}
                  className={`flex items-center gap-4 p-3 border transition-all duration-300 group ${
                    isJustAdded 
                      ? 'bg-accent-red/10 border-accent-red shadow-[0_0_15px_rgba(227,30,36,0.15)]' 
                      : 'bg-white/5 border-white/5 hover:border-accent-red/50 hover:bg-white/10'
                  }`}
                >
                  {/* Product Image */}
                  <div className="w-20 h-20 shrink-0 bg-white p-2 rounded-sm flex items-center justify-center shadow-inner relative overflow-hidden group-hover:shadow-[0_0_10px_rgba(255,255,255,0.2)] transition-shadow">
                    <img 
                      src={item.image || '/images/no-image.png'} 
                      alt={item.name} 
                      className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                  
                  {/* Product details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-product-title text-white text-base truncate font-black uppercase tracking-wide group-hover:text-accent-red transition-colors">{item.name}</h3>
                    {(item.flavor || item.size) && (
                      <p className="font-body text-xs text-text-muted mt-1 bg-black/40 inline-block px-1.5 py-0.5 rounded-sm">
                        {item.flavor && `نكهة: ${item.flavor}`}
                        {item.flavor && item.size && ' - '}
                        {item.size && `حجم: ${item.size}`}
                      </p>
                    )}
                    <span className="font-product-title text-accent-red text-lg block mt-1 font-bold">
                      {item.price} <span className="text-xs text-white/60 font-body">EGP</span>
                    </span>
                  </div>

                  {/* Quantity & Actions */}
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <button 
                      onClick={() => removeFromCart(item.productId, item.flavor, item.size)}
                      className="text-text-muted hover:text-accent-red transition-colors w-6 h-6 flex items-center justify-center rounded-full hover:bg-accent-red/10"
                      title="مسح من السلة"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                    
                    <div className="flex items-center bg-black border border-white/10 rounded-sm overflow-hidden">
                      <button 
                        onClick={() => updateQuantity(item.productId, item.quantity - 1, item.flavor, item.size)}
                        className="w-7 h-7 flex items-center justify-center text-text-muted hover:text-white hover:bg-accent-red transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">remove</span>
                      </button>
                      <span className="w-8 text-center font-product-title text-white text-sm font-bold">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.productId, item.quantity + 1, item.flavor, item.size)}
                        disabled={item.stock !== undefined && item.quantity >= item.stock}
                        className="w-7 h-7 flex items-center justify-center text-text-muted hover:text-white hover:bg-accent-red transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-muted"
                        title={item.stock !== undefined && item.quantity >= item.stock ? "أقصى كمية" : undefined}
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                      </button>
                    </div>
                  </div>
                </div>
              )})
            )}
          </div>

          {/* Footer Details */}
          {cart.length > 0 && (
            <div className="px-6 py-6 border-t border-white/10 bg-black/60 backdrop-blur-md space-y-5">
              <div className="flex justify-between items-center">
                <span className="font-display uppercase text-white/80 tracking-wider text-base">المجموع الفرعي:</span>
                <span className="font-display text-accent-red text-2xl font-black italic">{getCartTotal()} <span className="text-sm text-white/60">EGP</span></span>
              </div>
              
              <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-4"></div>

              <div className="grid grid-cols-2 gap-3">
                <Link 
                  href="/cart"
                  onClick={handleClose}
                  className="w-full flex items-center justify-center gap-2 border border-white/20 hover:border-accent-red text-white font-product-title py-3 transition-colors text-sm hover:bg-accent-red/5 rounded-sm"
                >
                  <span className="material-symbols-outlined text-lg">shopping_bag</span>
                  شوف السلة
                </Link>
                <Link 
                  href="/checkout"
                  onClick={handleClose}
                  className="w-full text-center bg-accent-red hover:bg-accent-red/90 text-white font-product-title py-3 btn-diagonal shadow-[0_0_15px_rgba(227,30,36,0.4)] hover:scale-105 transition-all duration-300 text-sm flex items-center justify-center gap-2"
                >
                  أكد الطلب
                  <span className="material-symbols-outlined text-lg">arrow_back</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
