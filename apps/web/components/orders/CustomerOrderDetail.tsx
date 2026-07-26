'use client';

import { formatProductMeasure } from '@fv/shared';
import { Price } from '@fv/ui';
import { Link } from '@/i18n/routing';
import {
  formatOrderLineQty,
  paymentMethodLabel,
} from '@/lib/orderUi';
import type { CustomerOrder } from '@/lib/orderTypes';

function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.4 7-11a7 7 0 10-14 0c0 5.6 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function ReorderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 0115.5-6.36M21 12a9 9 0 01-15.5 6.36" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5v5h5M21 19v-5h-5" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l4-4m-4 4l-4-4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
    </svg>
  );
}

function formatAddressLines(order: CustomerOrder): string[] {
  const a = order.address;
  if (!a) return ['No delivery address on file'];
  const name = [order.user?.firstName, order.user?.lastName].filter(Boolean).join(' ').trim();
  const street = [a.building, a.street, a.line1, a.line2, a.area, a.apartment]
    .filter(Boolean)
    .join(', ');
  const cityLine = [a.city, a.emirate].filter(Boolean).join(', ');
  return [name, street, cityLine].filter(Boolean) as string[];
}

type Props = {
  order: CustomerOrder;
  busy?: boolean;
  downloading?: boolean;
  onReorder: () => void;
  onDownloadInvoice: () => void;
  onCancel?: () => void;
  onReturn?: () => void;
  showCancel?: boolean;
  showReturn?: boolean;
};

export function CustomerOrderDetail({
  order,
  busy,
  downloading,
  onReorder,
  onDownloadInvoice,
  onCancel,
  onReturn,
  showCancel,
  showReturn,
}: Props) {
  const vatRate = order.vatRateSnap != null ? Number(order.vatRateSnap) : 5;
  const addressLines = formatAddressLines(order);

  return (
    <div className="rounded-2xl border border-leaf-200 bg-white p-5 shadow-sm sm:p-7">
      <h2 className="text-lg font-semibold text-ink">Order Items</h2>

      <ul className="mt-4 divide-y divide-leaf-100">
        {order.items.map((item) => {
          const img = item.product?.images?.[0]?.url;
          const measure = formatProductMeasure({
            soldAs: item.product?.soldAs,
            weight: item.variant?.weight ?? item.product?.weight,
            unit: item.product?.unit,
            packageSize: item.product?.packageSize,
          });
          const variantBit = item.variant?.name ? item.variant.name : '';
          const sub = [variantBit, measure].filter(Boolean).join(' · ');
          const qtyLabel = formatOrderLineQty({
            quantity: item.quantity,
            weight: item.product?.weight,
            unit: item.product?.unit,
            variantWeight: item.variant?.weight,
          });

          return (
            <li key={item.id} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-leaf-50 ring-1 ring-leaf-100">
                {img ? (
                  <img src={img} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold text-leaf-600">FH</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{item.nameEn}</p>
                {sub ? <p className="truncate text-xs text-ink/50">{sub}</p> : null}
              </div>
              <div className="shrink-0 text-end">
                <p className="text-sm font-medium text-ink/70">{qtyLabel}</p>
                <Price
                  amount={item.lineTotal}
                  className="mt-0.5 inline-flex items-center gap-1 text-sm font-semibold text-ink"
                  symbolClassName="inline-block h-3.5 w-3.5"
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-leaf-50/70 px-4 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <PinIcon className="h-4 w-4 text-leaf-700" />
            Delivery Address
          </div>
          <div className="mt-2 space-y-0.5 text-sm text-ink/70">
            {addressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-leaf-50/70 px-4 py-4">
          <p className="text-sm font-semibold text-ink">Payment Method</p>
          <p className="mt-1 text-sm text-ink/70">{paymentMethodLabel(order.paymentMethod)}</p>
          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between gap-3 text-ink/70">
              <dt>Subtotal</dt>
              <dd>
                <Price amount={order.subtotal} className="inline-flex items-center gap-1" symbolClassName="h-3.5 w-3.5" />
              </dd>
            </div>
            <div className="flex justify-between gap-3 text-ink/70">
              <dt>VAT ({vatRate}%)</dt>
              <dd>
                <Price amount={order.tax} className="inline-flex items-center gap-1" symbolClassName="h-3.5 w-3.5" />
              </dd>
            </div>
            <div className="flex justify-between gap-3 text-ink/70">
              <dt>Delivery Fee</dt>
              <dd>
                <Price amount={order.shipping} className="inline-flex items-center gap-1" symbolClassName="h-3.5 w-3.5" />
              </dd>
            </div>
            {Number(order.discount || 0) > 0 ? (
              <div className="flex justify-between gap-3 text-ink/70">
                <dt>Discount</dt>
                <dd>
                  −
                  <Price
                    amount={order.discount ?? 0}
                    className="inline-flex items-center gap-1"
                    symbolClassName="h-3.5 w-3.5"
                  />
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3 border-t border-leaf-200 pt-2 font-semibold text-ink">
              <dt>Total</dt>
              <dd>
                <Price
                  amount={order.total}
                  className="inline-flex items-center gap-1"
                  symbolClassName="h-3.5 w-3.5"
                />
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={onReorder}
          className="inline-flex items-center gap-2 rounded-xl bg-leaf-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-leaf-600 disabled:opacity-50"
        >
          <ReorderIcon className="h-4 w-4" />
          Reorder
        </button>
        <button
          type="button"
          disabled={downloading}
          onClick={onDownloadInvoice}
          className="inline-flex items-center gap-2 rounded-xl border border-leaf-700 bg-white px-5 py-2.5 text-sm font-semibold text-leaf-800 hover:bg-leaf-50 disabled:opacity-50"
        >
          <DownloadIcon className="h-4 w-4" />
          {downloading ? 'Downloading…' : 'Download Invoice'}
        </button>
        <Link
          href={`/account/orders/${order.id}/track`}
          className="inline-flex items-center rounded-xl px-3 py-2.5 text-sm font-medium text-leaf-700 underline-offset-2 hover:underline"
        >
          Track
        </Link>
        {showCancel && onCancel ? (
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="text-sm font-medium text-red-600 underline-offset-2 hover:underline disabled:opacity-50"
          >
            Cancel order
          </button>
        ) : null}
        {showReturn && onReturn ? (
          <button
            type="button"
            disabled={busy}
            onClick={onReturn}
            className="text-sm font-medium text-amber-700 underline-offset-2 hover:underline disabled:opacity-50"
          >
            Request return
          </button>
        ) : null}
      </div>
    </div>
  );
}
