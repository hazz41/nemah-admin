'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Store, ChevronRight, CheckCircle2, CircleDollarSign } from 'lucide-react';
import { getRestaurants } from '@/services/restaurants';
import { getCurrentMonthSalesByStore } from '@/services/monthlySales';

const CURRENT_MONTH_LABEL = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export default function RestaurantsPage() {
  const { data: restaurants, isLoading } = useQuery({
    queryKey: ['restaurants'],
    queryFn: getRestaurants,
  });

  const { data: currentMonthSales } = useQuery({
    queryKey: ['current-month-sales'],
    queryFn: getCurrentMonthSalesByStore,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Restaurants</h1>
        <p className="mt-1 text-sm text-muted">Fee collection status for {CURRENT_MONTH_LABEL}</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : !restaurants || restaurants.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface py-16 text-center">
          <Store size={32} className="text-muted" />
          <p className="font-medium text-ink">No restaurants yet</p>
          <p className="text-sm text-muted">Kitchen accounts will show up here once they sign up.</p>
        </div>
      ) : (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface">
          {restaurants.map((restaurant, index) => {
            const sales = currentMonthSales?.get(restaurant.id);
            return (
              <Link
                key={restaurant.id}
                href={`/restaurants/${restaurant.id}`}
                className={`flex items-center gap-4 px-6 py-4 transition-colors hover:bg-background ${
                  index > 0 ? 'border-t border-border' : ''
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-light text-brand">
                  {restaurant.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={restaurant.logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Store size={18} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{restaurant.name}</p>
                  <p className="truncate text-xs text-muted">{restaurant.category ?? 'Restaurant'}{restaurant.city ? ` · ${restaurant.city}` : ''}</p>
                </div>

                {sales ? (
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-ink">{sales.totalRevenue.toFixed(2)} JOD</span>
                    {sales.feeCollected ? (
                      <span className="flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                        <CheckCircle2 size={12} />
                        Collected
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
                        <CircleDollarSign size={12} />
                        Pending
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted">No sales yet</span>
                )}

                <ChevronRight size={18} className="text-muted" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
