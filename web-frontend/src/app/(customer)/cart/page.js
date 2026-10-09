'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import { formatRupees } from '@/utils/format';
import CartItem from '@/components/CartItem';

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCart = async () => {
    try {
      setLoading(true);
      const data = await api('/cart');
      setCart(data);
    } catch (err) {
      setError(err.message || 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const handleUpdateQty = async (productId, newQty) => {
    try {
      // Qty 0 hone par backend item delete kar deta hai
      const updatedCart = await api(`/cart/items/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify({ qty: newQty })
      });
      setCart(updatedCart);
    } catch (err) {
      alert(err.message || 'Failed to update quantity');
    }
  };

  if (loading && !cart) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500 font-medium">Loading your cart...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md border border-red-200 text-red-700">
        <p>{error}</p>
      </div>
    );
  }

  const items = cart?.items || [];
  const itemTotalPaise = cart?.itemTotalPaise || 0;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-black">Your Shopping Cart</h1>

      {items.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow text-center border">
          <p className="text-gray-500 mb-4">Your cart is empty.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700"
          >
            Browse Products
          </button>
        </div>
      ) : (
        <div>
          {cart.store && (
            <div className="mb-4 text-sm text-gray-600 bg-white p-3 rounded border">
              Store: <span className="font-semibold text-black">{cart.store.name}</span>
            </div>
          )}

          <div className="space-y-3 mb-6">
            {items.map((item) => (
              <CartItem key={item.productId} item={item} onUpdateQty={handleUpdateQty} />
            ))}
          </div>

          <div className="bg-white p-4 rounded-lg shadow border flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Amount</p>
              <p className="text-2xl font-bold text-green-600">{formatRupees(itemTotalPaise)}</p>
            </div>
            <button
              onClick={() => router.push('/checkout')}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 transition"
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}