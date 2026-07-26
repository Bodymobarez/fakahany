import { PageHeader } from '@/components/PageHeader';
import { ProductForm } from '@/components/ProductForm';

export default function NewProductPage() {
  return (
    <div>
      <PageHeader title="New product" description="Create a catalog item." />
      <ProductForm />
    </div>
  );
}
