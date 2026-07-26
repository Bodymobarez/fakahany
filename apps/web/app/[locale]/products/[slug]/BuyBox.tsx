'use client';

import { useMemo, useState } from 'react';
import { Price } from '@fv/ui';
import { AddToCartButton } from './AddToCartButton';

type Variant = {
  id: string;
  name: string;
  sku: string;
  price: number | string;
  stockQty?: number;
};

type Props = {
  productId: string;
  slug: string;
  name: string;
  basePrice: number;
  imageUrl?: string | null;
  variants: Variant[];
  addLabel: string;
  measureLabel: string;
  inStockLabel: string;
  outOfStockLabel: string;
  inStock: boolean;
};

export function BuyBox({
  productId,
  slug,
  name,
  basePrice,
  imageUrl,
  variants,
  addLabel,
  measureLabel,
  inStockLabel,
  outOfStockLabel,
  inStock,
}: Props) {
  const active = useMemo(() => variants.filter((v) => (v.stockQty ?? 1) >= 0), [variants]);
  const [variantId, setVariantId] = useState(active[0]?.id || '');
  const selected = active.find((v) => v.id === variantId) || null;
  const price = selected ? Number(selected.price) : basePrice;
  const stockOk = selected
    ? (selected.stockQty ?? 1) > 0
    : inStock;

  return (
    <div>
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
        {measureLabel ? (
          <p className="text-base text-ink/50">{measureLabel}</p>
        ) : (
          <span />
        )}
        <Price
          amount={price}
          className="inline-flex items-center gap-1.5 text-2xl font-semibold text-leaf-800"
          symbolClassName="inline-block h-5 w-5"
        />
      </div>
      <p className="mt-2 text-sm font-medium text-leaf-700">
        {stockOk ? inStockLabel : outOfStockLabel}
      </p>

      {active.length > 0 ? (
        <fieldset className="mt-6">
          <legend className="mb-2 text-sm font-medium text-ink">Pack / size</legend>
          <div className="flex flex-wrap gap-2">
            {active.map((v) => (
              <label
                key={v.id}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${
                  variantId === v.id
                    ? 'border-leaf-700 bg-leaf-50 text-leaf-900'
                    : 'border-leaf-200 text-ink/70'
                }`}
              >
                <input
                  type="radio"
                  className="sr-only"
                  name="variant"
                  checked={variantId === v.id}
                  onChange={() => setVariantId(v.id)}
                />
                {v.name}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="mt-8">
        <AddToCartButton
          productId={productId}
          variantId={selected?.id || null}
          slug={slug}
          name={selected ? `${name} · ${selected.name}` : name}
          unitPrice={price}
          imageUrl={imageUrl}
          label={addLabel}
        />
      </div>
    </div>
  );
}
