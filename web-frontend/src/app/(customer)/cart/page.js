'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import { getToken, getRole } from '@/utils/auth';
import { getGuestCart, setGuestQty } from '@/utils/guestCart';
import { formatRupees } from '@/utils/format';
import CartItem from '@/components/CartItem';

const DELIVERY_FEE_PAISE = 990;

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
  const [shippingMode, setShippingMode] = useState('pickup');

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
    return <p className="py-16 text-center text-gray-500">Loading your cart...</p>;
  }

  if (error) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
    );
  }

  const items = cart?.items || [];
  const subtotalPaise = cart?.itemTotalPaise || 0;
  const shippingPaise = shippingMode === 'delivery' ? DELIVERY_FEE_PAISE : 0;
  const totalPaise = subtotalPaise + shippingPaise;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-brand-text sm:text-4xl">My Cart</h1>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="inline-flex w-fit items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-brand-text transition hover:bg-gray-50"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Continue shopping
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">
          <p className="mb-5 text-gray-500">Your cart is empty.</p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="rounded-md bg-brand-bright px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Browse Products
          </button>
        </div>
      ) : (
        <div>
          {/* Column headers — desktop */}
          <div className="mb-1 hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_auto_minmax(0,0.9fr)_auto] gap-4 border-b border-gray-200 pb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-gray-400 sm:grid">
            <span>Product</span>
            <span className="text-right">Price</span>
            <span className="text-center">Qty</span>
            <span className="text-right">Total</span>
            <span className="w-8" aria-hidden />
          </div>

          <div className="mb-8">
            {items.map((item) => (
              <CartItem key={item.productId} item={item} onUpdateQty={handleUpdateQty} />
            ))}
          </div>

          {/* Shipping + summary */}
          <div className="rounded-2xl bg-gray-100 p-5 sm:p-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
              <div className="min-w-0 flex-1">
                <p className="mb-4 text-sm font-medium text-brand-text">Choose shipping mode:</p>
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="radio"
                      name="shipping"
                      value="pickup"
                      checked={shippingMode === 'pickup'}
                      onChange={() => setShippingMode('pickup')}
                      className="mt-1 h-4 w-4 accent-[#FF5555]"
                    />
                    <span className="text-sm text-brand-text">
                      Store pickup ( In 20 min ) <span className="text-gray-500">• FREE</span>
                      {cart.store?.name ? (
                        <span className="mt-1 block text-xs text-gray-400">At {cart.store.name}</span>
                      ) : null}
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="radio"
                      name="shipping"
                      value="delivery"
                      checked={shippingMode === 'delivery'}
                      onChange={() => setShippingMode('delivery')}
                      className="mt-1 h-4 w-4 accent-[#FF5555]"
                    />
                    <span className="text-sm text-brand-text">
                      Delivery at home ( Under 2 - 4 day ){' '}
                      <span className="text-gray-500">• {formatRupees(DELIVERY_FEE_PAISE)}</span>
                      <span className="mt-1 block text-xs text-gray-400">
                        Address confirmed at checkout
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="w-full shrink-0 lg:w-72">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span className="uppercase tracking-wide">Subtotal TTC</span>
                    <span>{formatRupees(subtotalPaise)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span className="uppercase tracking-wide">Shipping</span>
                    <span>{shippingPaise === 0 ? 'Free' : formatRupees(shippingPaise)}</span>
                  </div>
                  <div className="flex justify-between pt-1 text-base font-bold text-brand-text">
                    <span className="uppercase tracking-wide">Total</span>
                    <span>{formatRupees(totalPaise)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={goCheckout}
                  className="mt-5 flex w-full items-center justify-between rounded-xl bg-brand-bright px-5 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 sm:text-base"
                >
                  <span>{isCustomer ? 'Checkout' : 'Login to Checkout'}</span>
                  <span>{formatRupees(totalPaise)}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
