'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/utils/api';
import { formatRupees } from '@/utils/format';
import { riderCoordinates, vehicleLabel } from '@/utils/riders';
import StatusBadge from '@/components/StatusBadge';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
  ssr: false,
  loading: () => <div className="h-64 rounded border border-gray-200 bg-gray-50" />,
});

function Pill({ children, tone }) {
  const tones = {
    green: 'bg-green-100 text-green-800',
    gray: 'bg-gray-100 text-gray-700',
    red: 'bg-red-100 text-red-800',
    amber: 'bg-amber-100 text-amber-800',
  };
  return <span className={`px-2 py-1 text-xs rounded font-semibold ${tones[tone]}`}>{children}</span>;
}

function formatWhen(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function AdminRiderDetailPage() {
  const params = useParams();
  const riderId = params.id;
  const [rider, setRider] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [riderData, orderData] = await Promise.all([
          api(`/admin/riders/${riderId}`),
          api(`/admin/riders/${riderId}/orders`),
        ]);
        setRider(riderData);
        setOrders(orderData || []);
      } catch (err) {
        setError(err.message || 'Failed to load rider');
      } finally {
        setLoading(false);
      }
    }
    if (riderId) load();
  }, [riderId]);

  const saveAccount = async (changes) => {
    setError('');
    setSaving(true);
    try {
      const updated = await api(`/admin/riders/${riderId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: rider.name,
          phone: rider.phone,
          email: rider.email || '',
          vehicleType: rider.rider?.vehicleType || 'bike',
          isActive: rider.isActive,
          ...changes,
        }),
      });
      setRider(updated);
    } catch (err) {
      setError(err.message || 'Failed to update rider');
    } finally {
      setSaving(false);
    }
  };

  const handleActiveToggle = () => {
    const nextActive = !rider.isActive;
    const confirmed = window.confirm(
      nextActive
        ? `Activate ${rider.name}? They can log in and receive orders again.`
        : `Deactivate ${rider.name}? They will be signed out of new logins and taken offline.`
    );
    if (!confirmed) return;
    saveAccount(nextActive ? { isActive: true } : { isActive: false, isOnline: false });
  };

  const handleForceOffline = () => {
    const confirmed = window.confirm(`Take ${rider.name} offline? They will not get new auto-assigned orders.`);
    if (!confirmed) return;
    saveAccount({ isOnline: false });
  };

  if (loading) return <p className="text-sm text-gray-500">Loading rider...</p>;

  if (!rider) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-700">{error || 'Rider not found'}</p>
        <Link href="/admin/riders" className="text-sm font-medium text-green-700 hover:underline">
          Back to riders
        </Link>
      </div>
    );
  }

  const location = riderCoordinates(rider);
  const online = rider.isActive && rider.rider?.isOnline;

  return (
    <div className="pb-12 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/admin/riders" className="text-sm font-medium text-green-700 hover:underline">
            ← Back to riders
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <span className="h-11 w-11 rounded-full bg-green-100 text-green-800 font-semibold flex items-center justify-center">
              {(rider.name || '?').trim().charAt(0).toUpperCase()}
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{rider.name}</h1>
              <div className="flex flex-wrap gap-2 mt-1">
                <Pill tone={online ? 'green' : 'gray'}>{online ? 'Online' : 'Offline'}</Pill>
                <Pill tone={rider.isActive ? 'green' : 'red'}>{rider.isActive ? 'Active' : 'Inactive'}</Pill>
                <Pill tone="gray">{vehicleLabel(rider.rider?.vehicleType)}</Pill>
              </div>
            </div>
          </div>
        </div>
        <Link
          href={`/admin/riders/${rider._id}/edit`}
          className="shrink-0 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded transition"
        >
          Edit
        </Link>
      </div>

      {error && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 bg-white border rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-900">Account</h2>
          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-gray-500">Phone</dt>
              <dd className="mt-1 font-medium text-gray-900">{rider.phone}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Email</dt>
              <dd className="mt-1 font-medium text-gray-900">{rider.email || 'Not added'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Vehicle</dt>
              <dd className="mt-1 font-medium text-gray-900">{vehicleLabel(rider.rider?.vehicleType)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Joined</dt>
              <dd className="mt-1 font-medium text-gray-900">{formatWhen(rider.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Active orders</dt>
              <dd className="mt-1 font-medium text-gray-900">{rider.activeOrders || 0}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Delivered</dt>
              <dd className="mt-1 font-medium text-gray-900">{rider.deliveredOrders || 0}</dd>
            </div>
          </dl>

          <div className="mt-5 pt-4 border-t flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleActiveToggle}
              disabled={saving}
              className={`px-3 py-1.5 text-sm font-medium rounded disabled:opacity-60 ${
                rider.isActive ? 'text-red-700 bg-red-50 hover:bg-red-100' : 'text-green-700 bg-green-50 hover:bg-green-100'
              }`}
            >
              {saving ? 'Saving...' : rider.isActive ? 'Deactivate' : 'Activate'}
            </button>
            {online && (
              <button
                type="button"
                onClick={handleForceOffline}
                disabled={saving}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-60"
              >
                Force offline
              </button>
            )}
            <Link href="/admin/orders" className="px-3 py-1.5 text-sm font-medium text-green-700 hover:underline">
              Assign from orders
            </Link>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Inactive riders cannot log in. Online status is set by the rider, and only online riders inside 7 km are auto-assigned.
          </p>
        </section>

        <section className="bg-white border rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-900">Last location</h2>
          {location ? (
            <div className="mt-3 space-y-3">
              <p className="text-xs text-gray-500">
                {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
              </p>
              <LocationPicker lat={location.lat} lng={location.lng} readOnly className="h-64" />
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-500">
              Location is not set yet. The rider updates it from their dashboard before they can be auto-assigned.
            </p>
          )}
        </section>
      </div>

      <section className="bg-white border rounded-lg">
        <div className="px-5 py-4 border-b">
          <h2 className="text-sm font-semibold text-gray-900">Orders</h2>
          <p className="text-xs text-gray-500 mt-1">Latest 100 orders assigned to this rider.</p>
        </div>
        {orders.length === 0 ? (
          <p className="p-5 text-sm text-gray-500">No orders assigned yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Order</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Customer</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Store</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Total</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Placed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order._id}>
                    <td className="px-4 py-3 font-medium text-gray-900">#{order.orderNumber || order._id.slice(-6)}</td>
                    <td className="px-4 py-3 text-gray-600">{order.user?.name || 'Customer'}</td>
                    <td className="px-4 py-3 text-gray-600">{order.store?.name || 'Store'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{formatRupees(order.pricing?.grandTotal || 0)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatWhen(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
