'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ArrowLeft, Store, CheckCircle2, CircleDollarSign } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getRestaurantById } from '@/services/restaurants';
import { getMonthlySalesForStore, setFeeCollected } from '@/services/monthlySales';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function RestaurantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: restaurant } = useQuery({
    queryKey: ['restaurant', id],
    queryFn: () => getRestaurantById(id),
  });

  const { data: sales, isLoading } = useQuery({
    queryKey: ['monthly-sales', id],
    queryFn: () => getMonthlySalesForStore(id),
  });

  const toggleCollectedMutation = useMutation({
    mutationFn: ({ month, collected }: { month: string; collected: boolean }) => setFeeCollected(id, month, collected, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-sales', id] });
      queryClient.invalidateQueries({ queryKey: ['current-month-sales'] });
    },
  });

  const chartData = [...(sales ?? [])]
    .reverse()
    .map((m) => ({ label: `${MONTH_LABELS[m.monthIndex]} '${String(m.year).slice(2)}`, revenue: m.totalRevenue }));

  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft size={16} />
        All restaurants
      </Link>

      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-light text-brand">
          {restaurant?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={restaurant.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Store size={22} />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-ink">{restaurant?.name ?? 'Restaurant'}</h1>
          <p className="mt-0.5 text-sm text-muted">{restaurant?.category ?? 'Restaurant'}{restaurant?.city ? ` · ${restaurant.city}` : ''}</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : !sales || sales.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface py-16 text-center">
          <CircleDollarSign size={32} className="text-muted" />
          <p className="font-medium text-ink">No sales tracked yet</p>
          <p className="text-sm text-muted">Monthly totals show up here once this restaurant completes its first order.</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="mb-4 font-semibold text-ink">Revenue by month</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#737373', fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#737373', fontSize: 12 }} allowDecimals={false} />
                  <Tooltip cursor={{ fill: '#fce4e8' }} formatter={(value) => [`${Number(value).toFixed(2)} JOD`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#e85d75" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b border-border bg-background px-6 py-3 text-xs font-medium uppercase tracking-wide text-muted">
              <span>Month</span>
              <span>Orders</span>
              <span>Revenue</span>
              <span>Fee status</span>
            </div>
            {sales.map((m, index) => {
              const isPending = toggleCollectedMutation.isPending && toggleCollectedMutation.variables?.month === m.month;
              return (
                <div
                  key={m.month}
                  className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-6 py-4 ${index > 0 ? 'border-t border-border' : ''}`}
                >
                  <span className="font-medium text-ink">
                    {MONTH_LABELS[m.monthIndex]} {m.year}
                  </span>
                  <span className="text-sm text-muted">{m.orderCount}</span>
                  <span className="text-sm font-medium text-ink">{m.totalRevenue.toFixed(2)} JOD</span>
                  <button
                    onClick={() => toggleCollectedMutation.mutate({ month: m.month, collected: !m.feeCollected })}
                    disabled={isPending}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                      m.feeCollected
                        ? 'bg-success/10 text-success hover:bg-success/20'
                        : 'bg-warning/10 text-warning hover:bg-warning/20'
                    }`}
                  >
                    {m.feeCollected ? <CheckCircle2 size={14} /> : <CircleDollarSign size={14} />}
                    {isPending ? 'Saving…' : m.feeCollected ? 'Collected' : 'Mark collected'}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
