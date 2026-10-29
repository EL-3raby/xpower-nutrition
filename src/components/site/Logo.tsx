import React from 'react';

export default function Logo({ className = "", size = "md" }: { className?: string, size?: "sm" | "md" | "lg" | "xl" }) {
  
  const sizeClasses = {
    sm: "h-6 md:h-8",
    md: "h-8 md:h-10",
    lg: "h-10 md:h-12",
    xl: "h-12 md:h-16",
  };

  const s = sizeClasses[size];
  const combinedClasses = ['object-contain transition-all duration-300', s, className].filter(Boolean).join(' ').trim();

  return (
    <img 
      src="/images/logo-transparent.png" 
      alt="Xpower Nutrition" 
      className={combinedClasses}
    />
  );
}
