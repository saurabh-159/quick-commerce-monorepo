'use client';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';

export default function AdminInventoryPage() {
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [productId, setProductId] = useState('');
  const [stock, setStock] = useState('50');
  const [sellingPriceRupees, setSellingPriceRupees] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load stores on mount
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const data = await api('/admin/stores');
        setStores(data || []);
        if (data && data.length > 0) {
          setSelectedStoreId(data[0]._id);
        }
      } catch (err) {
        setError('Failed to load stores');
      }
    };
    fetchStores();
  }, []);

  const handleUpdateInventory = async (e) => {
    e.preventDefault();
    if (!productId.trim()) {
      alert('Please enter a valid Product ID');
      return;
    }

    try {
      setLoading(true);
      const sellingPricePaise = Math.round(Number(sellingPriceRupees) * 100);

      const payload = {
        storeId: selectedStoreId,
        productId: productId.trim(),
        stock: Number(stock),
        sellingPricePaise
      };

      await api('/admin/inventory', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      alert('Inventory updated successfully!');
      setProductId('');
      setStock('50');
      setSellingPriceRupees('');
    } catch (err) {
      alert(err.message || 'Failed to update inventory');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-black mb-6">Manage Store Inventory</h1>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

      <form onSubmit={handleUpdateInventory} className="bg-white p-6 rounded-lg shadow border space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700">Select Store</label>
          <select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="w-full mt-1 p-2 border rounded text-black text-sm bg-white"
            required
          >
            {stores.map((st) => (
              <option key={st._id} value={st._id}>{st.name} ({st.addressText})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">Product ID (from Phase 11 creation)</label>
          <input
            type="text"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            placeholder="e.g. 65f8... (Mongo Product ID)"
            className="w-full mt-1 p-2 border rounded text-black text-sm"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700">Stock Quantity</label>
            <input
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              min={0}
              className="w-full mt-1 p-2 border rounded text-black text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Selling Price (in Rupees)</label>
            <input
              type="number"
              value={sellingPriceRupees}
              onChange={(e) => setSellingPriceRupees(e.target.value)}
              placeholder="e.g. 18"
              className="w-full mt-1 p-2 border rounded text-black text-sm"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded text-sm font-semibold transition"
        >
          {loading ? 'Saving Inventory...' : 'Save Inventory'}
        </button>
      </form>
    </div>
  );
}