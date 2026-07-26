'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Price } from '@fv/ui';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { useAppSelector } from '@/store/hooks';

type DashboardData = {
  kpis: {
    todayRevenue: number;
    todayOrders: number;
    customers: number;
    pendingOrders: number;
    avgOrder: number;
    revenueChange: number;
    ordersChange: number;
  };
  series: { date: string; label: string; revenue: number; orders: number }[];
  byCategory: { name: string; slug: string; revenue: number; qty: number; orders: number }[];
  statusDistribution: { status: string; count: number }[];
  activeOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    deliveryType: string;
    itemCount: number;
    relativeTime: string;
  }>;
  topProducts: Array<{
    productId: string;
    nameEn: string;
    sku: string;
    quantity: number;
    revenue: number;
  }>;
  topDays: number;
};

const STATUS_COLORS: Record<string, string> = {
  DELIVERED: '#f4a28c',
  CANCELLED: '#0d9488',
  PENDING: '#fbbf24',
  ACCEPTED: '#60a5fa',
  PREPARING: '#a78bfa',
  PACKED: '#34d399',
  OUT_FOR_DELIVERY: '#38bdf8',
  REFUNDED: '#94a3b8',
  RETURNED: '#fb7185',
  FAILED_PAYMENT: '#64748b',
};

const CATEGORY_COLORS = ['#d4a017', '#f4a28c', '#0d9488', '#3b82f6', '#a78bfa', '#f97316', '#14b8a6', '#e11d48'];

const empty: DashboardData = {
  kpis: {
    todayRevenue: 0,
    todayOrders: 0,
    customers: 0,
    pendingOrders: 0,
    avgOrder: 0,
    revenueChange: 0,
    ordersChange: 0,
  },
  series: [],
  byCategory: [],
  statusDistribution: [],
  activeOrders: [],
  topProducts: [],
  topDays: 1,
};

function Trend({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <p className={`mt-2 text-xs font-medium ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
      {up ? '↑' : '↓'} {Math.abs(value)}% from yesterday
    </p>
  );
}

function KpiIcon({ kind }: { kind: 'revenue' | 'orders' | 'customers' | 'pending' | 'avg' }) {
  const common = 'h-4 w-4';
  if (kind === 'revenue') {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M17 8c0-1.7-2.2-3-5-3s-5 1.3-5 3 2.2 3 5 3 5 1.3 5 3-2.2 3-5 3-5-1.3-5-3" />
      </svg>
    );
  }
  if (kind === 'orders') {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.8 4M7 13h10l3-8H6.2M7 13L5.8 7M7 13l-1.2 5h12.4M10 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
      </svg>
    );
  }
  if (kind === 'customers') {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M9.5 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM20 8v6M17 11h6" />
      </svg>
    );
  }
  if (kind === 'pending') {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M12 4v16" />
    </svg>
  );
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

function deliveryLabel(type: string) {
  if (type === 'PICKUP') return 'Pickup';
  if (type === 'EXPRESS') return 'Express';
  if (type === 'SAME_DAY') return 'Same day';
  if (type === 'NEXT_DAY') return 'Next day';
  return type.replace(/_/g, ' ');
}

export default function DashboardPage() {
  const { hydrated, accessToken } = useAppSelector((s) => s.auth);
  const [data, setData] = useState<DashboardData>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topDays, setTopDays] = useState(1);

  const load = useCallback(async (days = topDays) => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await api.get('/api/admin/reports/dashboard', {
        params: { topDays: days },
      });
      setData({
        ...empty,
        ...res,
        kpis: { ...empty.kpis, ...(res.kpis || {}) },
      });
    } catch {
      setError('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  }, [topDays, accessToken]);

  useEffect(() => {
    if (!hydrated || !accessToken) return;
    void load(topDays);
  }, [load, topDays, hydrated, accessToken]);

  const cards = useMemo(
    () => [
      {
        label: "Today's Revenue",
        value: <Price amount={data.kpis.todayRevenue} className="text-2xl font-semibold" />,
        trend: data.kpis.revenueChange,
        href: '/reports/sales',
        icon: 'revenue' as const,
        tone: 'bg-emerald-50 text-emerald-700',
      },
      {
        label: "Today's Orders",
        value: <span className="text-2xl font-semibold">{data.kpis.todayOrders}</span>,
        trend: data.kpis.ordersChange,
        href: '/orders',
        icon: 'orders' as const,
        tone: 'bg-sky-50 text-sky-700',
      },
      {
        label: 'Total Customers',
        value: <span className="text-2xl font-semibold">{data.kpis.customers}</span>,
        href: '/customers',
        icon: 'customers' as const,
        tone: 'bg-violet-50 text-violet-700',
      },
      {
        label: 'Pending Orders',
        value: <span className="text-2xl font-semibold">{data.kpis.pendingOrders}</span>,
        href: '/orders',
        icon: 'pending' as const,
        tone: 'bg-amber-50 text-amber-700',
      },
      {
        label: 'Avg. Order',
        value: <Price amount={data.kpis.avgOrder} className="text-2xl font-semibold" />,
        href: '/reports/sales',
        icon: 'avg' as const,
        tone: 'bg-teal-50 text-teal-700',
      },
    ],
    [data.kpis],
  );

  return (
    <div>
      <PageHeader
        title="Today's Overview"
        description="Real-time business metrics"
        actions={
          <button
            type="button"
            onClick={() => void load(topDays)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M20 9a8 8 0 00-14.9-3M4 15a8 8 0 0014.9 3" />
            </svg>
            Refresh
          </button>
        }
      />

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm text-slate-500">{c.label}</div>
              <span className={`rounded-lg p-2 ${c.tone}`}>
                <KpiIcon kind={c.icon} />
              </span>
            </div>
            <div className="mt-2 text-slate-900">{c.value}</div>
            {'trend' in c && c.trend != null ? <Trend value={c.trend} /> : <div className="mt-2 h-4" />}
            <Link href={c.href} className="mt-3 inline-block text-xs font-medium text-teal-700 hover:underline">
              View Details
            </Link>
          </div>
        ))}
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Sales Trend (30 Days)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.series}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d4a017" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#d4a017" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" minTickGap={28} />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip
                  formatter={(value: number) => [`AED ${Number(value).toFixed(2)}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#b8860b" fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Sales by Category</h2>
          <div className="h-72">
            {data.byCategory.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byCategory} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                    tick={{ fontSize: 12 }}
                    stroke="#94a3b8"
                  />
                  <Tooltip
                    formatter={(value: number) => [`AED ${Number(value).toFixed(2)}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                    {data.byCategory.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                No category sales yet
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Order Status Distribution</h2>
          <div className="flex h-72 flex-col items-center justify-center gap-4 sm:flex-row">
            {data.statusDistribution.length ? (
              <>
                <div className="h-56 w-full max-w-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.statusDistribution}
                        dataKey="count"
                        nameKey="status"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        {data.statusDistribution.map((s) => (
                          <Cell
                            key={s.status}
                            fill={STATUS_COLORS[s.status] || '#94a3b8'}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number, name: string) => [value, statusLabel(name)]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="w-full space-y-2 text-sm">
                  {data.statusDistribution.map((s) => (
                    <li key={s.status} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-slate-600">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: STATUS_COLORS[s.status] || '#94a3b8' }}
                        />
                        {statusLabel(s.status)}
                      </span>
                      <span className="font-semibold text-slate-800">{s.count}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="text-sm text-slate-400">No orders yet</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Category Performance</h2>
          <ul className="divide-y divide-slate-100">
            {data.byCategory.map((c, i) => (
              <li key={c.slug} className="flex items-center justify-between gap-3 py-3">
                <span className="flex items-center gap-2 font-medium text-slate-800">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                  />
                  {c.name}
                </span>
                <span className="text-sm text-slate-500">
                  <Price amount={c.revenue} className="inline font-semibold text-slate-800" />
                  <span className="mx-1.5 text-slate-300">|</span>
                  {c.qty} sold
                </span>
              </li>
            ))}
            {!data.byCategory.length ? (
              <li className="py-8 text-center text-sm text-slate-400">No category data yet</li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-slate-900">Active Orders</h2>
            <Link href="/orders" className="text-sm font-medium text-teal-700 hover:underline">
              View All
            </Link>
          </div>
          <div className="max-h-[28rem] space-y-3 overflow-y-auto pe-1">
            {data.activeOrders.map((o) => (
              <div
                key={o.id}
                className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-slate-900">Order #{o.orderNumber}</p>
                  <span className="text-xs text-slate-500">{deliveryLabel(o.deliveryType)}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-slate-600">
                    {o.itemCount} Items · <Price amount={o.total} className="inline" />
                  </p>
                  <span className="rounded-md bg-slate-200/80 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                    {statusLabel(o.status)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-400">{o.relativeTime}</span>
                  <Link
                    href={`/orders/${o.id}`}
                    className="text-sm font-medium text-teal-700 hover:underline"
                  >
                    Details
                  </Link>
                </div>
              </div>
            ))}
            {!data.activeOrders.length ? (
              <p className="py-8 text-center text-sm text-slate-400">No active orders</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-slate-900">Top Selling Items</h2>
            <select
              value={topDays}
              onChange={(e) => setTopDays(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700"
            >
              <option value={1}>Today</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          </div>
          <ul className="divide-y divide-slate-100">
            {data.topProducts.map((p, i) => (
              <li key={`${p.productId}-${p.sku}`} className="flex items-center gap-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-semibold text-teal-700">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-800">{p.nameEn}</p>
                  <p className="text-xs text-slate-400">
                    {p.quantity} sold · {p.sku}
                  </p>
                </div>
                <Price amount={p.revenue} className="shrink-0 text-sm font-semibold text-slate-800" />
              </li>
            ))}
            {!data.topProducts.length ? (
              <li className="py-8 text-center text-sm text-slate-400">No sales in this period</li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
