'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import CategoryForm from '@/components/CategoryForm';

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const categoryId = params.id;

  const [initialValues, setInitialValues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const category = await api(`/admin/categories/${categoryId}`);
        setInitialValues({
          name: category.name || '',
          slug: category.slug || '',
          isActive: category.isActive !== false,
          description: category.description || '',
          images: category.images?.length ? category.images : category.imageUrl ? [category.imageUrl] : [],
        });
      } catch (err) {
        setError(err.message || 'Failed to load category');
      } finally {
        setLoading(false);
      }
    }
    if (categoryId) load();
  }, [categoryId]);

  const handleUpdate = async (payload) => {
    setError('');
    setSubmitting(true);
    try {
      await api(`/admin/categories/${categoryId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      router.push('/admin/categories');
    } catch (err) {
      setError(err.message || 'Failed to update category');
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading category...</p>;

  if (!initialValues) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-700">{error || 'Category not found'}</p>
        <button
          type="button"
          onClick={() => router.push('/admin/categories')}
          className="text-sm font-medium text-green-700 hover:underline"
        >
          Back to categories
        </button>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <CategoryForm
        key={categoryId}
        heading="Edit Category"
        submitLabel="Save Changes"
        initialValues={initialValues}
        onSubmit={handleUpdate}
        submitting={submitting}
        error={error}
      />
    </div>
  );
}
