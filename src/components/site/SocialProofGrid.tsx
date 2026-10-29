'use client';

import React from 'react';
import { getOptimizedImageUrl } from '@/lib/utils/image';

interface SocialProofGridProps {
  images: string[];
}

export default function SocialProofGrid({ images }: SocialProofGridProps) {
  if (!images || images.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {images.map((img, index) => (
        <div 
          key={index} 
          className="relative aspect-square overflow-hidden group cursor-pointer border border-text-muted/10 bg-bg-elevated"
        >
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-3xl">favorite</span>
          </div>
          
          <img 
            src={getOptimizedImageUrl(img, { width: 400, height: 400 })} 
            alt={`Xpower Community ${index + 1}`} 
            width={400}
            height={400}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}
