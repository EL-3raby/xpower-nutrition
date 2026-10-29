'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Order } from '@/lib/types';

interface SalesChartProps {
  orders: Order[];
  range: 'today' | '7d' | '30d' | 'all';
}

export default function SalesChart({ orders, range }: SalesChartProps) {
  // Filter active orders
  const activeOrders = orders.filter(
    (o) => o.status !== 'cancelled' && o.paymentStatus !== 'rejected'
  );

  const dataMap = new Map<string, number>();

  let startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  if (range === 'today') {
    startDate.setDate(startDate.getDate());
  } else if (range === '7d') {
    startDate.setDate(startDate.getDate() - 6);
  } else if (range === '30d') {
    startDate.setDate(startDate.getDate() - 29);
  } else if (range === 'all') {
    if (activeOrders.length > 0) {
      // Find the earliest order date
      let earliest = new Date();
      activeOrders.forEach((o) => {
        const d = o.createdAt instanceof Date ? o.createdAt : (o.createdAt as any)?.seconds ? new Date((o.createdAt as any).seconds * 1000) : new Date();
        if (d < earliest) earliest = d;
      });
      earliest.setHours(0, 0, 0, 0);
      startDate = earliest;
    }
  }

  // Generate date labels
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);

  const curr = new Date(startDate);
  while (curr <= endDate) {
    const label = curr.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
    dataMap.set(label, 0);
    curr.setDate(curr.getDate() + 1);
  }

  // Populate data
  activeOrders.forEach((o) => {
    const orderDate = o.createdAt instanceof Date ? o.createdAt : (o.createdAt as any)?.seconds ? new Date((o.createdAt as any).seconds * 1000) : new Date();
    if (orderDate >= startDate) {
      const label = orderDate.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
      if (dataMap.has(label)) {
        dataMap.set(label, dataMap.get(label)! + o.totalPrice);
      }
    }
  });

  const chartData = Array.from(dataMap.entries()).map(([date, total]) => ({
    date,
    total
  }));

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-text-muted font-body text-sm border border-text-muted/10 bg-bg-primary">
        لا توجد بيانات مبيعات لعرضها.
      </div>
    );
  }

  return (
    <div className="h-64 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
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
          />
          <Tooltip 
            cursor={{ fill: 'rgba(255,255,255,0.02)' }}
            contentStyle={{ backgroundColor: '#121212', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontFamily: 'Tajawal, sans-serif', direction: 'rtl' }}
            itemStyle={{ color: '#e31e24', fontWeight: 'bold' }}
            formatter={(value: any) => [`${value} EGP`, 'المبيعات']}
            labelStyle={{ color: '#8b8b8d', marginBottom: '4px' }}
          />
          <Bar dataKey="total" fill="#e31e24" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
