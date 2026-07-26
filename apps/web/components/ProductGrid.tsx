import type { CatalogProduct } from '@/lib/api';
import { ProductCard } from './ProductCard';

type ProductGridProps = {
  products: CatalogProduct[];
  emptyLabel?: string;
};

export function ProductGrid({ products, emptyLabel }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line bg-surface-2 px-4 py-10 text-center text-sm text-muted">
        {emptyLabel ?? 'No products yet.'}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
