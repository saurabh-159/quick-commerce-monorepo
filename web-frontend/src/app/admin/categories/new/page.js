'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import CategoryForm from '@/components/CategoryForm';

export default function NewCategoryPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (payload) => {
    setError('');
    setSubmitting(true);
    try {
      await api('/admin/categories', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      router.push('/admin/categories');
    } catch (err) {
      setError(err.message || 'Failed to create category');
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-12">
      <CategoryForm
        heading="Add Category"
        submitLabel="Create Category"
        onSubmit={handleCreate}
        submitting={submitting}
        error={error}
      />
    </div>
  );
}
