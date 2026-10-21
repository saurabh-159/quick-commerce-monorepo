'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import ProductForm from '@/components/ProductForm';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id;

  const [categories, setCategories] = useState([]);
  const [initialValues, setInitialValues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [product, catData] = await Promise.all([
          api(`/admin/products/${productId}`),
          api('/admin/categories'),
        ]);
        setCategories(catData || []);
        setInitialValues({
          name: product.name || '',
          slug: product.slug || '',
          category: product.category?._id || product.category || '',
          brand: product.brand || '',
          unit: product.unit || '',
          mrp: product.mrpPaise != null ? (product.mrpPaise / 100).toFixed(2) : '',
          description: product.description || '',
          highlights: (product.highlights || []).join('\n'),
          images: product.images || [],
        });
      } catch (err) {
        setError(err.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    }
    if (productId) load();
  }, [productId]);

  const handleUpdate = async (payload) => {
    setError('');
    setSubmitting(true);
    try {
      await api(`/admin/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      router.push('/admin/products');
    } catch (err) {
      setError(err.message || 'Failed to update product');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading product...</p>;
  }

  if (!initialValues) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-700">{error || 'Product not found'}</p>
        <button
          type="button"
          onClick={() => router.push('/admin/products')}
          className="text-sm font-medium text-green-700 hover:underline"
        >
          Back to products
        </button>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <ProductForm
        key={productId}
        heading="Edit Product"
        submitLabel="Save Changes"
        categories={categories}
        initialValues={initialValues}
        onSubmit={handleUpdate}
        submitting={submitting}
        error={error}
      />
    </div>
  );
}
