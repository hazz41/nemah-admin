// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

// ─── Restaurant (users/{uid} with role "kitchen") ─────────────────────────────

export interface Restaurant {
  id: string;
  name: string;
  logoUrl?: string;
  category?: string;
  city?: string;
  isOpen?: boolean;
}

// ─── Monthly Sales (mirrors restaurant-dashboard's src/types/index.ts) ────────
// Same `monthlySales` collection the merchant dashboard writes to
// (id: "{storeId}_{YYYY-MM}"). This app only ever adds the fee-collection
// fields — it never touches the sales totals themselves.

export interface MonthlySales {
  storeId: string;
  storeName: string;
  month: string; // "YYYY-MM"
  year: number;
  monthIndex: number; // 0-11
  totalRevenue: number;
  orderCount: number;
  itemsSold: number;
  feeCollected: boolean;
  collectedAt?: string;
  collectedBy?: string;
  updatedAt?: string;
}
