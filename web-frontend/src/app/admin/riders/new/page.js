'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import RiderForm from '@/components/RiderForm';

export default function NewRiderPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (payload) => {
    setError('');
    setSubmitting(true);
    try {
      await api('/admin/riders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      router.push('/admin/riders');
    } catch (err) {
      setError(err.message || 'Failed to create rider');
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-12">
      <RiderForm heading="Add Rider" submitLabel="Create Rider" onSubmit={handleCreate} submitting={submitting} error={error} />
    </div>
  );
}
