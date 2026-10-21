'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import InventoryLines, { createInventoryLine } from '@/components/InventoryLines';

const fieldClass =
  'w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500 bg-white';

async function saveStoreLines(storeId, lines) {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    try {
      await api('/admin/inventory', {
        method: 'PUT',
        body: JSON.stringify({
          storeId,
          productId: line.productId,
          stock: parseInt(line.stock, 10),
          sellingPricePaise: Math.round(parseFloat(line.sellingPrice) * 100),
          description: line.description || '',
          images: line.images || [],
        }),
      });
    } catch (err) {
      const saved = index === 0 ? 'None of the products were saved.' : `${index} product${index === 1 ? '' : 's'} were already saved.`;
      throw new Error(`${err.message || 'Failed to save a product'}. ${saved}`);
    }
  }
}

export default function NewInventoryPage() {
  const router = useRouter();
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [storeId, setStoreId] = useState('');
  const [lines, setLines] = useState([createInventoryLine()]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [storeData, productData] = await Promise.all([api('/admin/stores'), api('/admin/products')]);
        setStores(storeData || []);
        setProducts(productData || []);
      } catch (err) {
        setError(err.message || 'Failed to load stores or products');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!lines.length) {
      setError('Add at least one product.');
      return;
    }

    const productIds = lines.map((line) => line.productId);
    if (new Set(productIds).size !== productIds.length) {
      setError('Each product can be added only once for this store.');
      return;
    }

    setSubmitting(true);
    try {
      await saveStoreLines(storeId, lines);
      router.push('/admin/inventory');
    } catch (err) {
      setError(err.message || 'Failed to save inventory');
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading form...</p>;

  return (
    <div className="max-w-3xl pb-12">
      <div className="mb-6">
        <Link href="/admin/inventory" className="text-sm font-medium text-green-700 hover:underline">
          ← Back to inventory
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Add Inventory</h1>
        <p className="text-sm text-gray-500 mt-1">
          Pick a store, then add as many products as you want. Each product has its own stock and price.
        </p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border space-y-5">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Store</label>
          <select required value={storeId} onChange={(e) => setStoreId(e.target.value)} className={fieldClass}>
            <option value="">Select store</option>
            {stores.map((store) => (
              <option key={store._id} value={store._id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>

        <InventoryLines products={products} lines={lines} onChange={setLines} />

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || lines.length === 0}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold rounded transition"
          >
            {submitting ? 'Saving...' : `Save ${lines.length} product${lines.length === 1 ? '' : 's'}`}
          </button>
          <Link href="/admin/inventory" className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded hover:bg-gray-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
