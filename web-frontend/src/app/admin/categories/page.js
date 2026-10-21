'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await api('/admin/categories');
        setCategories(data || []);
      } catch (err) {
        setError(err.message || 'Failed to load categories');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleDelete = async (category) => {
    const confirmed = window.confirm(`Delete "${category.name}"? This cannot be undone.`);
    if (!confirmed) return;

    setError('');
    setDeletingId(category._id);
    try {
      await api(`/admin/categories/${category._id}`, { method: 'DELETE' });
      setCategories((current) => current.filter((item) => item._id !== category._id));
    } catch (err) {
      setError(err.message || 'Failed to delete category');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <div className="pb-12">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-1">
            {loading ? 'Loading...' : `${categories.length} categor${categories.length === 1 ? 'y' : 'ies'}`}
          </p>
        </div>
        <Link
          href="/admin/categories/new"
          className="shrink-0 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded transition"
        >
          Add Category
        </Link>
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

      <div className="bg-white rounded-lg shadow-sm border">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Loading categories...</p>
        ) : categories.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No categories yet. Add one from the button above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Slug</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {categories.map((category) => (
                  <tr key={category._id}>
                    <td className="px-4 py-4 font-medium text-gray-900">
                      <div className="flex items-center gap-3">
                        {(category.images?.[0] || category.imageUrl) ? (
                          <img src={category.images?.[0] || category.imageUrl} alt="" className="h-10 w-10 rounded object-cover" />
                        ) : (
                          <span className="h-10 w-10 rounded bg-gray-100" />
                        )}
                        <span>{category.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-600">{category.slug}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-2 py-1 text-xs rounded font-semibold ${
                          category.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {category.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/categories/${category._id}/edit`}
                          className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 rounded hover:bg-green-100"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(category)}
                          disabled={deletingId === category._id}
                          className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 disabled:opacity-60"
                        >
                          {deletingId === category._id ? 'Deleting...' : 'Delete'}
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
