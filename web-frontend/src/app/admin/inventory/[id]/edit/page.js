'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import InventoryLines, { createInventoryLine } from '@/components/InventoryLines';

function storeIdOf(row) {
  return row?.store?._id || row?.store || '';
}

function productIdOf(row) {
  return row?.product?._id || row?.product || '';
}

export default function EditInventoryPage() {
  const router = useRouter();
  const params = useParams();
  const inventoryId = params.id;

  const [storeName, setStoreName] = useState('');
  const [storeId, setStoreId] = useState('');
  const [products, setProducts] = useState([]);
  const [lines, setLines] = useState([]);
  const [removed, setRemoved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [row, groups, productData] = await Promise.all([
          api(`/admin/inventory/${inventoryId}`),
          api('/admin/inventory'),
          api('/admin/products'),
        ]);
        const currentStoreId = storeIdOf(row);
        const group = (groups || []).find((item) => String(item.store?._id) === String(currentStoreId));
        const storeRows = group?.products || [];
        setStoreId(currentStoreId);
        setStoreName(row.store?.name || group?.store?.name || 'Store');
        setProducts(productData || []);
        setLines(
          storeRows.map((item) =>
            createInventoryLine({
              inventoryId: item._id,
              productId: item.productId || productIdOf(item),
              stock: item.stock != null ? String(item.stock) : '',
              sellingPrice: item.sellingPricePaise != null ? (item.sellingPricePaise / 100).toFixed(2) : '',
              description: item.description || '',
              images: item.images || [],
              locked: true,
            })
          )
        );
      } catch (err) {
        setError(err.message || 'Failed to load inventory');
      } finally {
        setLoading(false);
      }
    }
    if (inventoryId) load();
  }, [inventoryId]);

  const handleLinesChange = (nextLines) => {
    const nextIds = new Set(nextLines.map((line) => line.inventoryId).filter(Boolean));
    const dropped = lines
      .filter((line) => line.inventoryId && !nextIds.has(line.inventoryId))
      .map((line) => ({ id: line.inventoryId, productId: line.productId }));
    if (dropped.length) {
      setRemoved((current) => {
        const known = new Set(current.map((item) => item.id));
        return [...current, ...dropped.filter((item) => !known.has(item.id))];
      });
    }
    setLines(nextLines);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!lines.length && removed.length === 0) {
      setError('Add at least one product for this store.');
      return;
    }

    const productIds = lines.map((line) => line.productId);
    if (productIds.some((id) => !id)) {
      setError('Select a product on every row.');
      return;
    }
    if (new Set(productIds).size !== productIds.length) {
      setError('Each product can be added only once for this store.');
      return;
    }

    const keptProductIds = new Set(productIds);
    const idsToDelete = removed.filter((item) => !keptProductIds.has(item.productId)).map((item) => item.id);

    setSubmitting(true);
    try {
      for (const line of lines) {
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
      }

      for (const id of idsToDelete) {
        try {
          await api(`/admin/inventory/${id}`, { method: 'DELETE' });
        } catch (err) {
          if (!/not found/i.test(err.message || '')) throw err;
        }
      }

      router.push('/admin/inventory');
    } catch (err) {
      setError(err.message || 'Failed to update inventory');
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading inventory...</p>;

  if (!storeId) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-700">{error || 'Inventory not found'}</p>
        <button
          type="button"
          onClick={() => router.push('/admin/inventory')}
          className="text-sm font-medium text-brand-dark hover:underline"
        >
          Back to inventory
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl pb-12">
      <div className="mb-6">
        <Link href="/admin/inventory" className="text-sm font-medium text-brand-dark hover:underline">
          ← Back to inventory
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Edit {storeName}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Add more products to this store, or change the price and stock of each one.
        </p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border space-y-5">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Store</p>
          <p className="text-sm font-semibold text-gray-900">{storeName}</p>
        </div>

        <InventoryLines products={products} lines={lines} onChange={handleLinesChange} />

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || (lines.length === 0 && removed.length === 0)}
            className="px-4 py-2 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-semibold rounded transition"
          >
            {submitting ? 'Saving...' : 'Save changes'}
          </button>
          <Link href="/admin/inventory" className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded hover:bg-brand-bg">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
