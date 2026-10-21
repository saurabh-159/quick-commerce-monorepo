'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import { getToken, getRole } from '@/utils/auth';
import { getGuestCart, setGuestQty } from '@/utils/guestCart';
import { formatRupees } from '@/utils/format';
import CartItem from '@/components/CartItem';

function guestView(guest) {
  const items = (guest.items || []).map((item) => ({
    ...item,
    totalPaise: item.pricePaise * item.qty,
  }));
  const itemTotalPaise = items.reduce((sum, item) => sum + item.totalPaise, 0);
  return {
    store: guest.storeName ? { name: guest.storeName } : null,
    items,
    itemTotalPaise,
  };
}

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState(null);
  const [isCustomer, setIsCustomer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const customer = !!getToken() && getRole() === 'customer';
    setIsCustomer(customer);

    if (!customer) {
      setCart(guestView(getGuestCart()));
      setLoading(false);
      return;
    }

    api('/cart')
      .then((data) => setCart(data))
      .catch((err) => setError(err.message || 'Failed to load cart'))
      .finally(() => setLoading(false));
  }, []);

  const handleUpdateQty = async (productId, newQty) => {
    try {
      if (!isCustomer) {
        setCart(guestView(setGuestQty(productId, newQty)));
        return;
      }

      const updatedCart = await api(`/cart/items/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify({ qty: newQty }),
      });
      setCart(updatedCart);
    } catch (err) {
      alert(err.message || 'Failed to update quantity');
    }
  };

  const goCheckout = () => {
    if (isCustomer) {
      router.push('/checkout');
      return;
    }
    router.push('/login?next=/checkout');
  };

  if (loading) {
    return <p className="text-center text-gray-500 py-16">Loading your cart...</p>;
  }

  if (error) {
    return <div className="bg-red-50 p-4 rounded border border-red-200 text-red-700">{error}</div>;
  }

  const items = cart?.items || [];

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
              <p className="text-2xl font-bold text-green-600">{formatRupees(cart.itemTotalPaise || 0)}</p>
            </div>
            <button
              onClick={goCheckout}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700"
            >
              {isCustomer ? 'Proceed to Checkout' : 'Login to Checkout'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
