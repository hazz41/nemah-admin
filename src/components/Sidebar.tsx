'use client';

import Link from 'next/link';
import { Store, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function Sidebar() {
  const { user, signOut } = useAuth();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="px-6 py-6">
        <h1 className="text-xl font-semibold text-brand">Nemah</h1>
        <p className="text-xs text-muted">Fees Admin</p>
      </div>

      <nav className="flex-1 px-3">
        <Link
          href="/"
          className="mb-1 flex items-center gap-3 rounded-lg bg-brand-light px-3 py-2.5 text-sm font-medium text-brand"
        >
          <Store size={18} strokeWidth={2.2} />
          Restaurants
        </Link>
      </nav>

      <div className="border-t border-border px-3 py-4">
        <div className="mb-2 px-3">
          <p className="truncate text-sm font-medium text-ink">{user?.name ?? 'Admin'}</p>
          <p className="truncate text-xs text-muted">{user?.email}</p>
        </div>
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-error transition-colors hover:bg-background"
        >
          <LogOut size={18} strokeWidth={1.8} />
          Log out
        </button>
      </div>
    </aside>
  );
}
