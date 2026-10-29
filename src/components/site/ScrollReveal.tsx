'use client';

import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number; // in milliseconds
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  duration?: number;
}

export default function ScrollReveal({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  duration,
}: ScrollRevealProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile, { passive: true });
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  // Animation values tuned differently for Mobile vs Desktop:
  // Desktop: Greater travel distance (32px), subtle scale depth (0.97 -> 1), elegant 0.65s timing
  // Mobile: Compact travel (16px), instant response (0.42s), compressed delay so flick-scrolling never stumbles
  const distance = isMobile ? 16 : 32;
  const animDuration = duration ?? (isMobile ? 0.42 : 0.65);
  const animDelay = isMobile ? (Math.min(delay, 180) * 0.0006) : (delay * 0.001);

  const getOffset = () => {
    switch (direction) {
      case 'up': return { y: distance, x: 0 };
      case 'down': return { y: -distance, x: 0 };
      case 'left': return { x: distance, y: 0 };
      case 'right': return { x: -distance, y: 0 };
      case 'none': return { x: 0, y: 0 };
      default: return { y: distance, x: 0 };
    }
  };

  return (
    <motion.div
      initial={{
        opacity: 0,
        ...getOffset(),
        scale: isMobile ? 0.99 : 0.98,
      }}
      whileInView={{
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
      }}
      viewport={{
        once: true,
        margin: isMobile ? '-20px' : '-50px',
        amount: isMobile ? 0.08 : 0.15,
      }}
      transition={{
        duration: animDuration,
        delay: animDelay,
        ease: [0.22, 1, 0.36, 1], // Smooth Apple-grade cubic-bezier
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
