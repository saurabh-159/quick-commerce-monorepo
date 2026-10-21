'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/utils/api';

function formatRupees(paise) {
  return `₹${(Number(paise) / 100).toFixed(2)}`;
}

function productLabel(product) {
  if (!product.unit || product.name.includes(product.unit)) return product.name;
  return `${product.name} (${product.unit})`;
}

export default function StoreInventoryPage() {
  const params = useParams();
  const storeId = params.storeId;

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await api('/admin/inventory');
        const match = (data || []).find((item) => String(item.store?._id) === String(storeId));
        setGroup(match || null);
        if (!match) setError('Store inventory not found');
      } catch (err) {
        setError(err.message || 'Failed to load inventory');
      } finally {
        setLoading(false);
      }
    }
    if (storeId) load();
  }, [storeId]);

  const handleDelete = async (product) => {
    const confirmed = window.confirm(`Remove "${product.name}" from this store?`);
    if (!confirmed) return;

    setError('');
    setDeletingId(product._id);
    try {
      await api(`/admin/inventory/${product._id}`, { method: 'DELETE' });
      setGroup((current) => {
        const products = current.products.filter((item) => item._id !== product._id);
        const categories = [];
        for (const item of products) {
          if (!categories.includes(item.category)) categories.push(item.category);
        }
        return { ...current, products, productCount: products.length, categories };
      });
    } catch (err) {
      setError(err.message || 'Failed to delete inventory');
    } finally {
      setDeletingId('');
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading store inventory...</p>;

  if (!group) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-700">{error || 'Store inventory not found'}</p>
        <Link href="/admin/inventory" className="text-sm font-medium text-green-700 hover:underline">
          Back to inventory
        </Link>
      </div>
    );
  }

  const sections = [];
  for (const category of group.categories) {
    sections.push({
      category,
      products: group.products.filter((product) => product.category === category),
    });
  }

  return (
    <div className="pb-12">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link href="/admin/inventory" className="text-sm font-medium text-green-700 hover:underline">
            ← Back to inventory
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{group.store.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{group.store.addressText}</p>
        </div>
        {group.products[0] && (
          <Link
            href={`/admin/inventory/${group.products[0]._id}/edit`}
            className="shrink-0 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded transition"
          >
            Edit
          </Link>
        )}
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

      <div className="grid grid-cols-2 gap-3 mb-6 max-w-md">
        <div className="bg-white border rounded-lg px-4 py-3">
          <p className="text-xs font-medium text-gray-500">Products</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{group.productCount}</p>
        </div>
        <div className="bg-white border rounded-lg px-4 py-3">
          <p className="text-xs font-medium text-gray-500">Categories</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{group.categories.length}</p>
        </div>
      </div>

      {group.products.length === 0 ? (
        <p className="p-6 text-sm text-gray-500 bg-white rounded-lg border">No products left in this store.</p>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => (
            <section key={section.category} className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">{section.category}</h2>
                <span className="text-xs text-gray-500">{section.products.length} products</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Product</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Stock</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Price</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {section.products.map((product) => (
                      <tr key={product._id}>
                        <td className="px-4 py-3 font-medium text-gray-900">{productLabel(product)}</td>
                        <td className="px-4 py-3 text-gray-600">{product.stock}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{formatRupees(product.sellingPricePaise)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(product)}
                            disabled={deletingId === product._id}
                            className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 disabled:opacity-60"
                          >
                            {deletingId === product._id ? 'Deleting...' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
