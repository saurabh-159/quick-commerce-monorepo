'use client';
import { useState } from 'react';
import { api } from '@/utils/api';
import { formatRupees } from '@/utils/format';

export default function ProductCard({ product, storeId }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAddToCart = async () => {
    try {
      setLoading(true);
      setMessage('');

      // API call to add item to cart
      await api('/cart/items', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id || product._id,
          storeId: storeId,
          qty: 1
        })
      });

      setMessage('Added!');
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      alert(err.message || 'Failed to add item to cart');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow border flex flex-col justify-between">
      <div>
        <h3 className="font-bold text-lg text-black">{product.name}</h3>
        <p className="text-gray-500 text-sm mt-1">Unit: {product.unit}</p>
      </div>
      
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-green-600 font-bold">
            {formatRupees(product.sellingPricePaise || product.mrpPaise)}
          </span>
          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
            Stock: {product.stock ?? 0}
          </span>
        </div>

        <button
          onClick={handleAddToCart}
          disabled={loading || (product.stock !== undefined && product.stock <= 0)}
          className={`w-full py-2 px-4 rounded font-semibold text-sm transition ${
            product.stock === 0 
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {loading ? 'Adding...' : (product.stock === 0 ? 'Out of Stock' : (message || 'Add to Cart'))}
        </button>
      </div>
    </div>
  );
}