'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import ProductForm from '@/components/ProductForm';

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadCategories() {
      try {
        const catData = await api('/admin/categories');
        setCategories(catData || []);
      } catch (err) {
        setError(err.message || 'Failed to load categories');
      } finally {
        setLoading(false);
      }
    }
    loadCategories();
  }, []);

  const handleCreateProduct = async (payload) => {
    setError('');
    setSubmitting(true);
    try {
      await api('/admin/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      router.push('/admin/products');
    } catch (err) {
      setError(err.message || 'Failed to create product');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading form...</p>;
  }

  return (
    <div className="pb-12">
      <ProductForm
        heading="Add Product"
        submitLabel="Create Product"
        categories={categories}
        onSubmit={handleCreateProduct}
        submitting={submitting}
        error={error}
      />
    </div>
  );
}
