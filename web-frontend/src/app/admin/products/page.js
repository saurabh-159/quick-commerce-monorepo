'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState('');

  const formatRupees = (paise) => `₹${(Number(paise) / 100).toFixed(2)}`;

  const fetchProducts = async () => {
    try {
      const prodData = await api('/admin/products');
      setProducts(prodData || []);
    } catch (err) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (product) => {
    const confirmed = window.confirm(`Delete "${product.name}"? This cannot be undone.`);
    if (!confirmed) return;

    setError('');
    setDeletingId(product._id);
    try {
      await api(`/admin/products/${product._id}`, { method: 'DELETE' });
      setProducts((current) => current.filter((item) => item._id !== product._id));
    } catch (err) {
      setError(err.message || 'Failed to delete product');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <div className="pb-12">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-1">
            {loading ? 'Loading...' : `${products.length} product${products.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="shrink-0 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded transition"
        >
          Add Product
        </Link>
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

      <div className="bg-white rounded-lg shadow-sm border">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Loading products...</p>
        ) : products.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No products yet. Add one from the button above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Unit</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">MRP</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product._id}>
                    <td className="px-4 py-4 font-medium text-gray-900">
                      <div className="flex items-center gap-3">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt="" className="h-10 w-10 rounded object-cover" />
                        ) : (
                          <span className="h-10 w-10 rounded bg-gray-100" />
                        )}
                        <span>{product.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-600">{product.category?.name || 'N/A'}</td>
                    <td className="px-4 py-4 text-gray-600">{product.unit}</td>
                    <td className="px-4 py-4 font-semibold text-gray-900">{formatRupees(product.mrpPaise)}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/products/${product._id}/edit`}
                          className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 rounded hover:bg-green-100"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(product)}
                          disabled={deletingId === product._id}
                          className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 disabled:opacity-60"
                        >
                          {deletingId === product._id ? 'Deleting...' : 'Delete'}
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
