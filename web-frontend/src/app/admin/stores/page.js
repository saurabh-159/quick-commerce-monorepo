'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';

export default function AdminStoresPage() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [placing, setPlacing] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await api('/admin/stores');
        setStores(data || []);
      } catch (err) {
        setError(err.message || 'Failed to load stores');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleDelete = async (store) => {
    const confirmed = window.confirm(`Delete "${store.name}"? This cannot be undone.`);
    if (!confirmed) return;

    setError('');
    setDeletingId(store._id);
    try {
      await api(`/admin/stores/${store._id}`, { method: 'DELETE' });
      setStores((current) => current.filter((item) => item._id !== store._id));
    } catch (err) {
      setError(err.message || 'Failed to delete store');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <div className="pb-12">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stores</h1>
          <p className="text-sm text-gray-500 mt-1">
            {loading ? 'Loading...' : `${stores.length} store${stores.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={placing}
            onClick={async () => {
              setPlacing(true);
              setError('');
              setNotice('');
              try {
                const placed = await api('/admin/stores/place-riders', { method: 'POST' });
                const created = (placed || []).filter((item) => item.created);
                setNotice(
                  created.length
                    ? `Placed ${created.length} rider${created.length === 1 ? '' : 's'} at shops that had none nearby. Login password is Rider@123.`
                    : 'Every shop already has a rider within 1 km.'
                );
              } catch (err) {
                setError(err.message || 'Failed to place riders');
              } finally {
                setPlacing(false);
              }
            }}
            className="shrink-0 px-4 py-2 border border-gray-300 text-sm font-semibold text-gray-800 rounded hover:bg-brand-bg disabled:opacity-60"
          >
            {placing ? 'Placing...' : 'Place riders at all shops'}
          </button>
          <Link
            href="/admin/stores/new"
            className="shrink-0 px-4 py-2 bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded transition"
          >
            Add Store
          </Link>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
      {notice && <div className="mb-4 p-3 bg-brand-soft text-brand-dark rounded text-sm">{notice}</div>}

      <div className="bg-white rounded-lg shadow-sm border">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Loading stores...</p>
        ) : stores.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No stores yet. Add one from the button above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-brand-bg">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Phone</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Address</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Radius</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stores.map((store) => (
                  <tr key={store._id}>
                    <td className="px-4 py-4 font-medium text-gray-900">
                      <div className="flex items-center gap-3">
                        {store.images?.[0] ? (
                          <img src={store.images[0]} alt="" className="h-10 w-10 rounded object-cover" />
                        ) : (
                          <span className="h-10 w-10 rounded bg-gray-100" />
                        )}
                        <span>{store.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-600">{store.phone}</td>
                    <td className="px-4 py-4 text-gray-600">{store.addressText}</td>
                    <td className="px-4 py-4 text-gray-600">{store.serviceRadiusKm} km</td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-2 py-1 text-xs rounded font-semibold ${
                          store.isOpen ? 'bg-brand-soft text-brand-dark' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {store.isOpen ? 'Open' : 'Closed'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            setError('');
                            setNotice('');
                            try {
                              const result = await api(`/admin/stores/${store._id}/place-rider`, { method: 'POST' });
                              setNotice(
                                result?.created
                                  ? `${result.riderName} is now at ${result.storeName}. Phone ${result.phone}, password Rider@123.`
                                  : `${result.riderName} is already ${result.distanceKm} km from ${result.storeName}.`
                              );
                            } catch (err) {
                              setError(err.message || 'Failed to place rider');
                            }
                          }}
                          className="px-3 py-1.5 text-sm font-medium text-gray-800 bg-gray-100 rounded hover:bg-gray-200"
                        >
                          Rider here
                        </button>
                        <Link
                          href={`/admin/stores/${store._id}/edit`}
                          className="px-3 py-1.5 text-sm font-medium text-brand-dark bg-brand-soft rounded hover:bg-brand-soft"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(store)}
                          disabled={deletingId === store._id}
                          className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 disabled:opacity-60"
                        >
                          {deletingId === store._id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
