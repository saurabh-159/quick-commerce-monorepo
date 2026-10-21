'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import StoreForm from '@/components/StoreForm';

export default function NewStorePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (payload) => {
    setError('');
    setSubmitting(true);
    try {
      await api('/admin/stores', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      router.push('/admin/stores');
    } catch (err) {
      setError(err.message || 'Failed to create store');
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-12">
      <StoreForm heading="Add Store" submitLabel="Create Store" onSubmit={handleCreate} submitting={submitting} error={error} />
    </div>
  );
}
