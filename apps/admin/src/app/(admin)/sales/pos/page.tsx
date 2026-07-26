'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Price } from '@fv/ui';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Product = {
  id: string;
  nameEn: string;
  sku: string;
  basePrice: number | string;
  stockQty: number;
};

type Customer = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

type Line = { productId: string; name: string; unitPrice: number; quantity: number };

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState('1');
  const [customerId, setCustomerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void Promise.all([
      api.get('/api/admin/products'),
      api.get('/api/admin/customers'),
    ])
      .then(([p, c]) => {
        setProducts(p.data.products || []);
        setCustomers(c.data.customers || []);
      })
      .catch(() => setError('Failed to load POS data'));
  }, []);

  const total = useMemo(
    () => lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
    [lines],
  );

  function addLine(e: FormEvent) {
    e.preventDefault();
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const quantity = Math.max(1, Number(qty) || 1);
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: l.quantity + quantity } : l,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.nameEn,
          unitPrice: Number(product.basePrice),
          quantity,
        },
      ];
    });
    setQty('1');
  }

  async function checkout() {
    if (!lines.length) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const { data } = await api.post('/api/admin/pos/checkout', {
        customerId: customerId || null,
        paymentMethod,
        note: note || null,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      });
      const order = data.order as { id: string; orderNumber: string; invoiceNumber?: string | null };
      setOk(`Sale complete · ${order.orderNumber}`);
      setLines([]);
      setNote('');
      try {
        const pdf = await api.get(`/api/admin/finance/invoices/${order.id}/pdf`, {
          responseType: 'blob',
        });
        const url = URL.createObjectURL(pdf.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${order.invoiceNumber || order.orderNumber}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        /* PDF optional — sale already succeeded */
      }
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message || 'Checkout failed',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="POS" description="Counter sales with immediate stock deduction." />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {ok ? (
        <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
          {ok}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form
          onSubmit={addLine}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-semibold">Add item</h2>
          <select
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            <option value="">Product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nameEn} · {Number(p.basePrice).toFixed(2)} · stock {p.stockQty}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
          <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white">
            Add to ticket
          </button>
        </form>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Ticket</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {lines.map((l) => (
              <li key={l.productId} className="flex justify-between gap-3">
                <span>
                  {l.name} × {l.quantity}
                </span>
                <Price amount={l.unitPrice * l.quantity} />
              </li>
            ))}
            {lines.length === 0 ? <li className="text-slate-400">Empty</li> : null}
          </ul>
          <div className="mt-4 flex justify-between border-t border-slate-100 pt-3 font-semibold">
            <span>Total</span>
            <Price amount={total} />
          </div>

          <label className="mt-4 block text-sm">
            <span className="mb-1 block font-medium">Customer (optional)</span>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">Walk-in</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {[c.firstName, c.lastName].filter(Boolean).join(' ') || 'Customer'} — {c.email}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block font-medium">Payment</span>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="COD">Cash</option>
              <option value="STRIPE">Card</option>
              <option value="WALLET">Wallet</option>
            </select>
          </label>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block font-medium">Note</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={busy || !lines.length}
            onClick={() => void checkout()}
            className="mt-4 w-full rounded-lg bg-teal-700 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {busy ? 'Processing…' : 'Complete sale'}
          </button>
        </div>
      </div>
    </div>
  );
}
