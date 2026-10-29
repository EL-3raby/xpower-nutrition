'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getEgyptTime } from '@/lib/date-utils';

interface CountdownTimerProps {
  endDate: any;
  onExpire?: () => void;
  className?: string;
  itemClassName?: string;
  labelClassName?: string;
  numberClassName?: string;
}

export default function CountdownTimer({ 
  endDate, 
  onExpire,
  className = "flex items-center gap-2 sm:gap-2.5",
  itemClassName = "flex flex-col items-center justify-center bg-[#121212] border border-white/[0.08] p-2.5 sm:p-3 rounded-xl min-w-[55px] sm:min-w-[65px]",
  labelClassName = "text-[10px] text-zinc-400 mt-1 uppercase font-body font-medium",
  numberClassName = "font-product-title text-xl sm:text-2xl font-black text-white leading-none"
}: CountdownTimerProps) {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const tick = () => {
      let targetDate: Date;
      if (endDate instanceof Date) {
        targetDate = endDate;
      } else if (typeof endDate?.toDate === 'function') {
        targetDate = endDate.toDate();
      } else {
        targetDate = new Date(endDate);
      }

      if (isNaN(targetDate.getTime())) {
        return; // wait for valid date
      }

      const now = getEgyptTime();
      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (onExpire) onExpire();
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / (3600 * 24));
      const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      setCountdown({ days, hours, minutes, seconds });
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [endDate, onExpire]);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className={className} dir="ltr">
      {countdown.days > 0 && (
        <div className={itemClassName}>
          <span className={numberClassName}>{pad(countdown.days)}</span>
          <span className={labelClassName}>أيام</span>
        </div>
      )}
      <div className={itemClassName}>
        <span className={numberClassName}>{pad(countdown.hours)}</span>
        <span className={labelClassName}>ساعات</span>
      </div>
      <div className={itemClassName}>
        <span className={numberClassName}>{pad(countdown.minutes)}</span>
        <span className={labelClassName}>دقائق</span>
      </div>
      <div className={itemClassName}>
        <span className={numberClassName}>{pad(countdown.seconds)}</span>
        <span className={labelClassName}>ثواني</span>
      </div>
    </div>
  );
}
