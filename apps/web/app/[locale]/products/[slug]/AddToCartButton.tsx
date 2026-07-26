'use client';

import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { addToCartApi } from '@/lib/cartApi';
import { addItemLocal, setCartFromApi } from '@/store/cartSlice';

type Props = {
  productId: string;
  variantId?: string | null;
  slug: string;
  name: string;
  unitPrice: number;
  imageUrl?: string | null;
  label: string;
};

export function AddToCartButton({
  productId,
  variantId,
  slug,
  name,
  unitPrice,
  imageUrl,
  label,
}: Props) {
  const dispatch = useDispatch();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleAdd() {
    setBusy(true);
    try {
      const cart = await addToCartApi(productId, 1, variantId);
      dispatch(setCartFromApi(cart));
      setDone(true);
    } catch {
      dispatch(
        addItemLocal({
          productId,
          slug,
          name,
          unitPrice,
          imageUrl,
        }),
      );
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void handleAdd()}
      className="inline-flex w-full items-center justify-center rounded-full bg-leaf-700 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-leaf-600 disabled:opacity-60 sm:w-auto"
    >
      {busy ? '…' : done ? 'Added' : label}
    </button>
  );
}
