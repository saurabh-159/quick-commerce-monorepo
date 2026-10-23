'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import RiderForm from '@/components/RiderForm';

export default function EditRiderPage() {
  const router = useRouter();
  const params = useParams();
  const riderId = params.id;

  const [initialValues, setInitialValues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const rider = await api(`/admin/riders/${riderId}`);
        setInitialValues({
          name: rider.name || '',
          phone: rider.phone || '',
          email: rider.email || '',
          vehicleType: rider.rider?.vehicleType || 'bike',
          isActive: rider.isActive !== false,
        });
      } catch (err) {
        setError(err.message || 'Failed to load rider');
      } finally {
        setLoading(false);
      }
    }
    if (riderId) load();
  }, [riderId]);

  const handleUpdate = async (payload) => {
    setError('');
    setSubmitting(true);
    try {
      await api(`/admin/riders/${riderId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      router.push(`/admin/riders/${riderId}`);
    } catch (err) {
      setError(err.message || 'Failed to update rider');
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading rider...</p>;

  if (!initialValues) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-700">{error || 'Rider not found'}</p>
        <button type="button" onClick={() => router.push('/admin/riders')} className="text-sm font-medium text-brand-dark hover:underline">
          Back to riders
        </button>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <RiderForm
        key={riderId}
        mode="edit"
        heading="Edit Rider"
        submitLabel="Save Changes"
        initialValues={initialValues}
        onSubmit={handleUpdate}
        submitting={submitting}
        error={error}
      />
    </div>
  );
}
