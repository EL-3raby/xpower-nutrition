'use client';

import React from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number; // in milliseconds (kept for API compatibility)
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  duration?: number;
}

/**
 * ScrollReveal: Renders elements instantly without scroll fade-in or slide-up animation.
 */
export default function ScrollReveal({
  children,
  className = '',
}: ScrollRevealProps) {
  return <div className={className}>{children}</div>;
}
