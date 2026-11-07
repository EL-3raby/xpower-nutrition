'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { DailyStats } from '@/lib/types';

interface VisitorsChartProps {
  stats: DailyStats[];
  range: 'today' | '7d' | '30d' | 'all';
}

export default function VisitorsChart({ stats, range }: VisitorsChartProps) {
  const chartData = React.useMemo(() => {
    if (!stats || stats.length === 0) return [];

    let filtered = [...stats];

    // Filter by range if needed
    if (range === 'today') {
      filtered = filtered.slice(-1);
    } else if (range === '7d') {
      filtered = filtered.slice(-7);
    } else if (range === '30d') {
      filtered = filtered.slice(-30);
    }

    return filtered.map((item) => {
      let label = item.date;
      try {
        const [year, month, day] = item.date.split('-').map(Number);
        const d = new Date(year, month - 1, day);
        label = d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
      } catch {
        label = item.date;
      }

      return {
        date: label,
        rawDate: item.date,
        visitors: item.visitors || 0,
        pageViews: item.pageViews || 0
      };
    });
  }, [stats, range]);

  if (chartData.length === 0) {
    return (
      <div className="h-72 flex flex-col items-center justify-center text-text-muted font-body text-sm border border-white/5 rounded-2xl bg-black/30 p-6 text-center">
        <span className="material-symbols-outlined text-4xl mb-2 text-text-muted/40">query_stats</span>
        <p>لا توجد بيانات زيارات مسجلة لهذه الفترة حتى الآن.</p>
        <span className="text-[11px] text-text-muted/60 mt-1">يتم احتساب الزيارات والمشاهدات تلقائياً بمجرد دخول العملاء للمتجر.</span>
      </div>
    );
  }

  return (
    <div className="h-80 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 15, right: 15, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="visitorsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e31e24" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#e31e24" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="pageViewsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          
          <XAxis
            dataKey="date"
            tick={{ fill: '#8b8b8d', fontSize: 12, fontFamily: 'Tajawal, sans-serif' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#8b8b8d', fontSize: 12, fontFamily: 'Inter, sans-serif' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${value}`}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
            contentStyle={{
              backgroundColor: '#111111',
              borderColor: 'rgba(255,255,255,0.12)',
              borderRadius: '12px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
              color: '#ffffff',
              fontFamily: 'Tajawal, sans-serif',
              direction: 'rtl'
            }}
            formatter={(value: any, name: any) => [
              `${Number(value || 0).toLocaleString()} ${name === 'visitors' ? 'زائر' : 'مشاهدة'}`,
              name === 'visitors' ? 'الزوار الفريدين' : 'مشاهدات الصفحات'
            ]}
            labelStyle={{ color: '#8b8b8d', marginBottom: '6px', fontWeight: 'bold' }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: '12px', fontFamily: 'Tajawal, sans-serif', fontSize: '12px' }}
            formatter={(value) => (
              <span className="text-text-muted hover:text-white transition-colors">
                {value === 'visitors' ? 'الزوار الفريدين' : 'مشاهدات الصفحات'}
              </span>
            )}
          />

          <Area
            type="monotone"
            dataKey="visitors"
            stroke="#e31e24"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#visitorsGradient)"
            name="visitors"
          />
          <Area
            type="monotone"
            dataKey="pageViews"
            stroke="#38bdf8"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#pageViewsGradient)"
            name="pageViews"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

