'use client';

import React, { useState, useEffect } from 'react';
import { Product, Review } from '@/lib/types';
import { addReview, getReviewsForProduct, syncProductRating } from '@/lib/firebase/reviews';
import { sanitizeText } from '@/lib/utils/security';

interface ProductReviewsProps {
  product: Product;
  onReviewAdded?: (newAvg: number, newCount: number) => void;
  onReviewsLoaded?: (avg: number, count: number) => void;
}

export default function ProductReviews({ product, onReviewAdded, onReviewsLoaded }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [hasReviewed, setHasReviewed] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filter state
  const [filter, setFilter] = useState<'all'|'positive'|'critical'>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 6;

  useEffect(() => {
    // Check local storage optimistically
    if (product.id) {
      const reviewed = localStorage.getItem(`reviewed_${product.id}`);
      if (reviewed) {
        setHasReviewed(true);
      }
    }

    if (typeof window !== 'undefined') {
      const checkReviewHash = () => {
        if (
          window.location.hash === '#reviews' || 
          window.location.hash === '#add-review' || 
          window.location.search.includes('review=true')
        ) {
          setIsFormOpen(true);
          setTimeout(() => {
            const el = document.getElementById('reviews');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 400);
        }
      };
      checkReviewHash();
      window.addEventListener('hashchange', checkReviewHash);
    }

    async function loadReviews() {
      if (!product.id) return;
      try {
        const data = await getReviewsForProduct(product.id);
        setReviews(data);
        setCurrentPage(1);
        
        // Verify if the user's review was deleted by admin
        const reviewedId = localStorage.getItem(`reviewed_${product.id}`);
        if (reviewedId && reviewedId !== 'true') {
          const stillExists = data.some(r => r.id === reviewedId);
          if (!stillExists) {
            localStorage.removeItem(`reviewed_${product.id}`);
            setHasReviewed(false);
          }
        }

        // Sync true rating with parent and repair Firestore product doc if needed
        if (onReviewsLoaded) {
          if (data.length > 0) {
            const trueAvg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
            onReviewsLoaded(Number(trueAvg.toFixed(1)), data.length);
          } else {
            onReviewsLoaded(0, 0);
          }
        }
        
        // Auto-repair Firestore product document reviewCount/avgRating if out of sync
        syncProductRating(product.id);
      } catch (err) {
        console.error('Failed to load reviews', err);
      } finally {
        setLoading(false);
      }
    }
    loadReviews();
  }, [product.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product.id) return;

    setError('');
    setSuccess('');

    // Validation matching Firestore Rules
    if (rating < 1 || rating > 5) {
      setError('يرجى اختيار التقييم (من 1 إلى 5 نجوم).');
      return;
    }
    if (customerName.length < 2 || customerName.length > 50) {
      setError('الاسم يجب أن يكون بين 2 و 50 حرف.');
      return;
    }
    if (comment.length < 5 || comment.length > 500) {
      setError('التعليق يجب أن يكون بين 5 و 500 حرف.');
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanName = sanitizeText(customerName, 50);
      const cleanComment = sanitizeText(comment, 500);

      const newReview: Omit<Review, 'id' | 'createdAt'> = {
        productId: product.id,
        customerName: cleanName,
        rating,
        comment: cleanComment
      };

      const newId = await addReview(newReview);
      
      // Optimistic Update local state
      const reviewObj: Review = {
        ...newReview,
        id: newId,
        createdAt: new Date()
      };
      
      setReviews([reviewObj, ...reviews]);
      setHasReviewed(true);
      localStorage.setItem(`reviewed_${product.id}`, newId);
      setSuccess('شكراً لتقييمك! تم إضافة تقييمك بنجاح.');

      // Calculate new optimistic avg and count based on the actual reviews array
      const newReviewsList = [reviewObj, ...reviews];
      const newCount = newReviewsList.length;
      const newAvg = newReviewsList.reduce((sum, r) => sum + r.rating, 0) / newCount;
      
      if (onReviewAdded) {
        onReviewAdded(Number(newAvg.toFixed(1)), newCount);
      }

      // Auto close the success message after 2.5 seconds
      setTimeout(() => {
        setIsFormOpen(false);
      }, 2500);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء إضافة التقييم. حاول مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return '';
    const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
  };

  return (
    <div id="reviews" className="w-full mt-16 mb-8 scroll-mt-28" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent-red/20 flex items-center justify-center border border-accent-red/30 shrink-0">
            <span className="material-symbols-outlined text-accent-red text-sm">reviews</span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-black text-white uppercase tracking-wider flex items-center gap-2">
            آراء العملاء
            {reviews.length > 0 && (
              <span className="text-sm font-body text-text-muted bg-white/5 px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                <span className="font-bold">({reviews.length})</span>
                <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                <span className="text-white font-bold tracking-widest">
                  {(() => {
                    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
                    return avg >= 4 ? 5 : avg.toFixed(1);
                  })()}
                </span>
                <span className="text-yellow-500 text-xs mt-0.5">★</span>
              </span>
            )}
          </h2>
        </div>
        
        {!hasReviewed && (
          <button 
            onClick={() => setIsFormOpen(!isFormOpen)}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
              isFormOpen 
                ? 'bg-white/10 text-white hover:bg-white/20' 
                : 'bg-accent-red text-white hover:bg-accent-red-hover shadow-[0_0_15px_rgba(227,30,36,0.3)]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{isFormOpen ? 'close' : 'edit'}</span>
            {isFormOpen ? 'إلغاء' : 'شاركنا رأيك'}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-8">
        
        {/* Add Review Form */}
        {isFormOpen && (
          <div className="animate-in slide-in-from-top-4 fade-in duration-300">
            {!hasReviewed ? (
              <div className="bg-[#050505] p-6 md:p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden group max-w-3xl mx-auto w-full">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent-red/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none transition-transform duration-700 group-hover:scale-150"></div>
                
                <h3 className="font-display font-bold text-white text-xl mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-accent-red rounded-full"></span>
                  أضف تقييمك
                </h3>
              
              {error && (
                <div className="mb-6 flex items-center gap-2 text-accent-red text-sm bg-accent-red/10 border border-accent-red/20 p-3 rounded-xl font-bold">
                  <span className="material-symbols-outlined text-lg">error</span>
                  {error}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="flex flex-col gap-5 relative z-10">
                
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-white/80">التقييم العام</label>
                  <div className="flex gap-1.5 text-3xl cursor-pointer" onMouseLeave={() => setHoveredRating(0)}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <span 
                        key={star}
                        className={`cursor-pointer transition-all duration-300 transform hover:scale-110 drop-shadow-md ${(hoveredRating || rating) >= star ? 'text-yellow-500' : 'text-white/10'}`}
                        onMouseEnter={() => setHoveredRating(star)}
                        onClick={() => setRating(star)}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-white/80">اسمك</label>
                  <input 
                    type="text" 
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={50}
                    className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-accent-red focus:ring-1 focus:ring-accent-red/50 transition-all placeholder-text-muted/50 text-sm font-body"
                    placeholder="اكتب اسمك هنا..."
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-white/80">التعليق</label>
                  <textarea 
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    required
                    minLength={5}
                    maxLength={500}
                    rows={4}
                    className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-accent-red focus:ring-1 focus:ring-accent-red/50 transition-all placeholder-text-muted/50 text-sm font-body custom-scrollbar resize-none"
                    placeholder="رأيك يهمنا! شاركنا تجربتك مع المنتج (5 حروف على الأقل)..."
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="mt-2 bg-white text-black hover:bg-accent-red hover:text-white border border-transparent font-black uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed w-full flex justify-center items-center gap-2"
                >
                  {isSubmitting ? (
                    <>جاري الإرسال...</>
                  ) : (
                    <>
                      <span>إرسال التقييم</span>
                      <span className="material-symbols-outlined text-sm">send</span>
                    </>
                  )}
                </button>
              </form>
            </div>
            ) : (
              <div className="bg-success/5 border border-success/20 p-8 rounded-3xl text-center flex flex-col items-center justify-center gap-4 shadow-lg max-w-3xl mx-auto w-full">
                <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-success text-3xl">task_alt</span>
                </div>
                <h3 className="font-display font-black text-white text-xl">شكراً لتقييمك!</h3>
                <p className="text-text-muted text-sm leading-relaxed max-w-md mx-auto">{success || 'تم إرسال رأيك بنجاح. نحن نقدر وقتك ومشاركتك لتجربتك معنا.'}</p>
              </div>
            )}
          </div>
        )}

        {/* Reviews List */}
        <div>
          {reviews.length > 0 && (
            <div className="flex gap-2 mb-6 border-b border-white/10 pb-4 overflow-x-auto custom-scrollbar">
              <button onClick={() => {setFilter('all'); setCurrentPage(1);}} className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filter === 'all' ? 'bg-white text-black shadow-md' : 'bg-white/5 text-text-muted hover:bg-white/10 hover:text-white border border-white/5'}`}>الكل ({reviews.length})</button>
              <button onClick={() => {setFilter('positive'); setCurrentPage(1);}} className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filter === 'positive' ? 'bg-success text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-white/5 text-text-muted hover:bg-white/10 hover:text-white border border-white/5'}`}>إيجابي (4-5 نجوم)</button>
              <button onClick={() => {setFilter('critical'); setCurrentPage(1);}} className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filter === 'critical' ? 'bg-accent-red text-white shadow-[0_0_15px_rgba(227,30,36,0.3)]' : 'bg-white/5 text-text-muted hover:bg-white/10 hover:text-white border border-white/5'}`}>سلبي (1-3 نجوم)</button>
            </div>
          )}

          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-accent-red/30 border-t-accent-red rounded-full animate-spin"></div>
            </div>
          ) : reviews.length === 0 ? (
            <div className="bg-[#050505] border border-white/5 rounded-3xl p-10 flex flex-col items-center justify-center text-center gap-4">
              <span className="material-symbols-outlined text-5xl text-white/10">speaker_notes_off</span>
              <p className="text-text-muted text-sm font-body">لا توجد تقييمات لهذا المنتج بعد.<br/>كن أول من يشاركنا رأيه!</p>
            </div>
          ) : (
            <>
              {(() => {
                const filteredReviews = reviews.filter(r => {
                  if (filter === 'positive') return r.rating >= 4;
                  if (filter === 'critical') return r.rating <= 3;
                  return true;
                });
                const totalPages = Math.ceil(filteredReviews.length / reviewsPerPage);
                const currentReviews = filteredReviews.slice((currentPage - 1) * reviewsPerPage, currentPage * reviewsPerPage);

                if (filteredReviews.length === 0) {
                  return (
                    <div className="bg-[#050505] border border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-3">
                      <span className="material-symbols-outlined text-4xl text-white/10">filter_list_off</span>
                      <p className="text-text-muted text-sm font-body">لا توجد تقييمات تطابق هذا الفلتر.</p>
                      <button onClick={() => {setFilter('all'); setCurrentPage(1);}} className="text-accent-red text-xs font-bold hover:underline">عرض كل التقييمات</button>
                    </div>
                  );
                }

                return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {currentReviews.map(review => (
                        <div key={review.id} className="bg-[#050505] p-5 md:p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-colors group flex flex-col justify-between">
                          <div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-white/50 border border-white/5 font-display font-bold uppercase shrink-0">
                                  {review.customerName.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-bold text-white text-sm tracking-wide line-clamp-1 flex items-center gap-1.5">
                                    {review.customerName}
                                    <span className="bg-success/10 border border-success/20 text-success text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5" title="مشتري موثوق">
                                      <span className="material-symbols-outlined text-[10px]">verified</span>
                                      مشتري موثوق
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-text-muted/70">{formatDate(review.createdAt)}</div>
                                </div>
                              </div>
                              <div className="flex gap-0.5 text-sm drop-shadow-sm shrink-0">
                                {[...Array(5)].map((_, i) => (
                                  <span key={i} className={i < review.rating ? 'text-yellow-500' : 'text-white/10'}>★</span>
                                ))}
                              </div>
                            </div>
                            <p className="text-text-muted text-sm leading-relaxed whitespace-pre-wrap font-body">{review.comment}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="mt-10 flex items-center justify-center gap-1.5 sm:gap-2" dir="ltr">
                        {/* Prev Button */}
                        <button 
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          <span className="material-symbols-outlined text-sm">keyboard_double_arrow_left</span>
                        </button>
                        
                        {/* Page Numbers */}
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                          if (
                            page === 1 || 
                            page === totalPages || 
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full font-bold text-sm transition-all ${
                                  currentPage === page 
                                    ? 'bg-accent-red text-white shadow-[0_0_15px_rgba(227,30,36,0.4)]' 
                                    : 'bg-transparent text-white/70 hover:text-white hover:bg-white/5'
                                }`}
                              >
                                {page}
                              </button>
                            );
                          } else if (
                            page === currentPage - 2 ||
                            page === currentPage + 2
                          ) {
                            return <span key={page} className="text-white/30 px-1 font-bold">...</span>;
                          }
                          return null;
                        })}

                        {/* Next Button */}
                        <button 
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          <span className="material-symbols-outlined text-sm">keyboard_double_arrow_right</span>
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
