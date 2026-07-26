'use client';

import { useEffect, useState } from 'react';
import { Price } from '@fv/ui';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Invoice = {
  id: string;
  orderNumber: string;
  invoiceNumber: string | null;
  total: number | string;
  tax: number | string;
  status: string;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string | null };
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void api
      .get('/api/admin/finance/invoices')
      .then(({ data }) => setInvoices(data.invoices || []))
      .catch(() => setError('Failed to load invoices'));
  }, []);

  async function downloadPdf(orderId: string, label: string) {
    setBusyId(orderId);
    setError(null);
    try {
      const res = await api.get(`/api/admin/finance/invoices/${orderId}/pdf`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${label || orderId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('PDF download failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader title="Invoices" description="Tax invoices generated for orders." />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Invoice</th>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">VAT</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{inv.invoiceNumber}</td>
                <td className="px-4 py-3">{inv.orderNumber}</td>
                <td className="px-4 py-3">
                  {inv.user
                    ? `${inv.user.firstName} ${inv.user.lastName}`.trim() || inv.user.email
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <Price amount={inv.total} />
                </td>
                <td className="px-4 py-3">
                  <Price amount={inv.tax} />
                </td>
                <td className="px-4 py-3 text-xs">{inv.status}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    disabled={busyId === inv.id}
                    onClick={() =>
                      void downloadPdf(inv.id, inv.invoiceNumber || inv.orderNumber)
                    }
                    className="text-xs font-semibold text-teal-700 hover:underline disabled:opacity-50"
                  >
                    PDF
                  </button>
                </td>
              </tr>
            ))}
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No invoices yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
