'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';

export default function AdminInventoryPage() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await api('/admin/inventory');
        setStores(data || []);
      } catch (err) {
        setError(err.message || 'Failed to load inventory');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="pb-12">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">
            {loading ? 'Loading...' : `${stores.length} store${stores.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <Link
          href="/admin/inventory/new"
          className="shrink-0 px-4 py-2 bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded transition"
        >
          Add Inventory
        </Link>
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

      {loading ? (
        <p className="p-6 text-sm text-gray-500 bg-white rounded-lg border">Loading inventory...</p>
      ) : stores.length === 0 ? (
        <p className="p-6 text-sm text-gray-500 bg-white rounded-lg border">No inventory yet. Add stock from the button above.</p>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-brand-bg">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Store</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Products</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Categories</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stores.map((group) => (
                <tr key={group.store._id}>
                  <td className="px-4 py-4">
                    <p className="font-medium text-gray-900">{group.store.name}</p>
                    <p className="text-gray-500 mt-1">{group.store.addressText}</p>
                  </td>
                  <td className="px-4 py-4 text-gray-700">{group.productCount}</td>
                  <td className="px-4 py-4 text-gray-700">{group.categories.length}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end">
                      <Link
                        href={`/admin/inventory/store/${group.store._id}`}
                        className="px-3 py-1.5 text-sm font-medium text-brand-dark bg-brand-soft rounded hover:bg-brand-soft"
                      >
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
