'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import StoreForm from '@/components/StoreForm';

export default function EditStorePage() {
  const router = useRouter();
  const params = useParams();
  const storeId = params.id;

  const [initialValues, setInitialValues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const store = await api(`/admin/stores/${storeId}`);
        const coordinates = store.location?.coordinates;
        setInitialValues({
          name: store.name || '',
          phone: store.phone || '',
          addressText: store.addressText || '',
          lng: coordinates?.[0] != null ? String(coordinates[0]) : '',
          lat: coordinates?.[1] != null ? String(coordinates[1]) : '',
          radius: store.serviceRadiusKm != null ? String(store.serviceRadiusKm) : '5',
          isOpen: store.isOpen !== false,
          description: store.description || '',
          images: store.images || [],
        });
      } catch (err) {
        setError(err.message || 'Failed to load store');
      } finally {
        setLoading(false);
      }
    }
    if (storeId) load();
  }, [storeId]);

  const handleUpdate = async (payload) => {
    setError('');
    setSubmitting(true);
    try {
      await api(`/admin/stores/${storeId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      router.push('/admin/stores');
    } catch (err) {
      setError(err.message || 'Failed to update store');
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading store...</p>;

  if (!initialValues) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-700">{error || 'Store not found'}</p>
        <button type="button" onClick={() => router.push('/admin/stores')} className="text-sm font-medium text-brand-dark hover:underline">
          Back to stores
        </button>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <StoreForm
        key={storeId}
        heading="Edit Store"
        submitLabel="Save Changes"
        initialValues={initialValues}
        onSubmit={handleUpdate}
        submitting={submitting}
        error={error}
      />
    </div>
  );
}
