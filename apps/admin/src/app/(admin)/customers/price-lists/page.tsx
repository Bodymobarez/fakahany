'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

type Group = { id: string; name: string; slug: string };
type Product = { id: string; nameEn: string; sku: string; basePrice: number | string };
type PriceList = {
  id: string;
  name: string;
  isActive: boolean;
  groupId?: string | null;
  group?: Group | null;
  items: Array<{
    id: string;
    price: number | string;
    productId?: string | null;
    product?: { id: string; nameEn: string; sku: string } | null;
  }>;
};

const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600';

export default function PriceListsPage() {
  const [lists, setLists] = useState<PriceList[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState('');
  const [groupId, setGroupId] = useState('');
  const [listId, setListId] = useState('');
  const [productId, setProductId] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [pl, g, p] = await Promise.all([
      api.get('/api/expansion/b2b/price-lists'),
      api.get('/api/expansion/b2b/groups'),
      api.get('/api/admin/products?limit=100'),
    ]);
    setLists(pl.data.priceLists || []);
    setGroups(g.data.groups || []);
    setProducts(p.data.products || p.data.items || []);
    if (!listId && pl.data.priceLists?.[0]?.id) setListId(pl.data.priceLists[0].id);
  }, [listId]);

  useEffect(() => {
    void load().catch(() => setError('Failed to load price lists'));
  }, [load]);

  async function onCreateList(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    try {
      await api.post('/api/expansion/b2b/price-lists', {
        name: name.trim(),
        groupId: groupId || null,
      });
      setName('');
      setOk('Price list created');
      await load();
    } catch {
      setError('Could not create price list');
    }
  }

  async function onAddItem(e: FormEvent) {
    e.preventDefault();
    if (!listId || !productId || !price) return;
    setError(null);
    setOk(null);
    try {
      await api.post(`/api/expansion/b2b/price-lists/${listId}/items`, {
        productId,
        price: Number(price),
      });
      setPrice('');
      setOk('Item added');
      await load();
    } catch {
      setError('Could not add item');
    }
  }

  async function removeItem(list: string, itemId: string) {
    try {
      await api.delete(`/api/expansion/b2b/price-lists/${list}/items/${itemId}`);
      await load();
    } catch {
      setError('Could not remove item');
    }
  }

  async function renameList(l: PriceList) {
    const next = window.prompt('Rename price list', l.name);
    if (next == null || !next.trim() || next.trim() === l.name) return;
    try {
      await api.patch(`/api/expansion/b2b/price-lists/${l.id}`, { name: next.trim() });
      setOk('Price list renamed');
      await load();
    } catch {
      setError('Could not rename price list');
    }
  }

  async function toggleList(l: PriceList) {
    try {
      await api.patch(`/api/expansion/b2b/price-lists/${l.id}`, { isActive: !l.isActive });
      setOk(l.isActive ? 'Price list deactivated' : 'Price list activated');
      await load();
    } catch {
      setError('Could not update price list');
    }
  }

  async function reassignGroup(l: PriceList, nextGroupId: string) {
    try {
      await api.patch(`/api/expansion/b2b/price-lists/${l.id}`, {
        groupId: nextGroupId || null,
      });
      setOk('Group updated');
      await load();
    } catch {
      setError('Could not update group');
    }
  }

  return (
    <div>
      <PageHeader
        title="B2B price lists"
        description="Wholesale / HORECA prices applied automatically in cart for group members."
      />
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {ok ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {ok}
        </div>
      ) : null}

      <form
        onSubmit={(e) => void onCreateList(e)}
        className="mb-8 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3"
      >
        <h2 className="sm:col-span-3 text-sm font-semibold text-slate-800">New price list</h2>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Name</span>
          <input
            required
            className={fieldClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="HORECA Dubai"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Customer group</span>
          <select className={fieldClass} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">None</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
          >
            Create
          </button>
        </div>
      </form>

      <form
        onSubmit={(e) => void onAddItem(e)}
        className="mb-8 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4"
      >
        <h2 className="sm:col-span-4 text-sm font-semibold text-slate-800">Add SKU price</h2>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">List</span>
          <select className={fieldClass} value={listId} onChange={(e) => setListId(e.target.value)}>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block text-slate-600">Product</span>
          <select
            className={fieldClass}
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            required
          >
            <option value="">Select…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nameEn} ({Number(p.basePrice).toFixed(2)})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Price (AED)</span>
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            className={fieldClass}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <div className="sm:col-span-4">
          <button
            type="submit"
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
          >
            Add item
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {lists.map((l) => (
          <div key={l.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div>
                <p className="font-semibold text-slate-800">{l.name}</p>
                <p className="text-xs text-slate-500">
                  {l.group?.name || 'No group'} · {l.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <select
                  className="rounded border border-slate-300 px-2 py-1 text-xs"
                  value={l.groupId || ''}
                  onChange={(e) => void reassignGroup(l, e.target.value)}
                >
                  <option value="">No group</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="text-teal-700 hover:underline"
                  onClick={() => void renameList(l)}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="text-slate-600 hover:underline"
                  onClick={() => void toggleList(l)}
                >
                  {l.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Product</th>
                  <th className="px-4 py-2 font-medium">SKU</th>
                  <th className="px-4 py-2 font-medium">Price</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {l.items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">{item.product?.nameEn || item.productId}</td>
                    <td className="px-4 py-2 text-slate-500">{item.product?.sku}</td>
                    <td className="px-4 py-2 font-medium text-teal-800">
                      {Number(item.price).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        className="text-xs font-semibold text-red-600 hover:underline"
                        onClick={() => void removeItem(l.id, item.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {l.items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                      No items yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
