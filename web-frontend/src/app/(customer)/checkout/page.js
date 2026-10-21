// src/app/(customer)/checkout/page.js

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getRole } from '@/utils/auth';
import { api } from '@/utils/api';
import AddressForm from '@/components/AddressForm';

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [radiusIssue, setRadiusIssue] = useState(null);

  const formatRupees = (paise) => `₹${(paise / 100).toFixed(2)}`;

  useEffect(() => {
    const token = getToken();
    const role = getRole();

    if (!token || role !== 'customer') {
      window.location.assign('/login?next=/checkout');
      return;
    }

    async function fetchData() {
      try {
        const cartData = await api('/cart');
        setCart(cartData);

        const addrData = await api('/addresses');
        setAddresses(addrData || []);
        if (addrData && addrData.length > 0) {
          const defaultAddr = addrData.find((a) => a.isDefault) || addrData[0];
          setSelectedAddressId(defaultAddr._id);
        }
      } catch (err) {
        setError(err.message || 'Failed to load checkout details');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleAddressCreated = (newAddr) => {
    setAddresses((prev) => [...prev, newAddr]);
    setSelectedAddressId(newAddr._id);
    setShowNewAddressForm(false);
  };

  const distanceKm = (fromLng, fromLat, toLng, toLat) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const earthKm = 6371;
    const dLat = toRad(toLat - fromLat);
    const dLng = toRad(toLng - fromLng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLng / 2) ** 2;
    return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const explainRadiusError = (err) => {
    if (err.details?.distanceKm != null) return err.details;
    if (!/outside store service radius/i.test(err.message || '')) return null;

    const store = cart?.store;
    const address = addresses.find((item) => item._id === selectedAddressId);
    const storeCoords = store?.location?.coordinates;
    const addressCoords = address?.location?.coordinates;
    const serviceRadiusKm = store?.serviceRadiusKm ?? 5;

    if (!storeCoords || !addressCoords) {
      return { storeName: store?.name || 'This store', distanceKm: null, serviceRadiusKm };
    }

    return {
      storeName: store?.name || 'This store',
      distanceKm: Number(distanceKm(storeCoords[0], storeCoords[1], addressCoords[0], addressCoords[1]).toFixed(1)),
      serviceRadiusKm,
    };
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      setError('Please select or add a delivery address.');
      return;
    }

    setSubmitting(true);
    setError('');
    setRadiusIssue(null);

    try {
      // 1. Create Order
      const orderData = await api('/orders', {
        method: 'POST',
        body: JSON.stringify({
          addressId: selectedAddressId,
          paymentMethod,
        }),
      });

      let finalOrderId = orderData._id || orderData.id;

      // 2. If online payment, call mock-success
      if (paymentMethod === 'online') {
        const paymentRes = await api('/payments/online/mock-success', {
          method: 'POST',
          body: JSON.stringify({ orderId: finalOrderId }),
        });
        if (paymentRes.order && paymentRes.order._id) {
          finalOrderId = paymentRes.order._id;
        }
      }

      window.location.assign(`/order/${finalOrderId}`);
    } catch (err) {
      const issue = explainRadiusError(err);
      if (issue) setRadiusIssue(issue);
      setError(err.message || 'Failed to place order');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading checkout...</div>;
  }

  const items = cart?.items || [];
  const itemTotal = cart?.itemTotalPaise || 0;
  const deliveryFee = itemTotal < 19900 ? 2900 : 0;
  const grandTotal = itemTotal + deliveryFee;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <h1 className="text-2xl font-bold text-gray-800">Checkout</h1>

      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {/* Address Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Delivery Address</h2>
          <button
            onClick={() => setShowNewAddressForm(!showNewAddressForm)}
            className="text-sm text-green-600 font-medium hover:underline"
          >
            {showNewAddressForm ? 'Cancel' : '+ Add New Address'}
          </button>
        </div>

        {showNewAddressForm ? (
          <AddressForm onAddressCreated={handleAddressCreated} />
        ) : addresses.length === 0 ? (
          <p className="text-sm text-gray-500">No saved addresses found. Please add a new address.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <div
                key={addr._id}
                onClick={() => setSelectedAddressId(addr._id)}
                className={`p-4 rounded-lg border cursor-pointer transition ${
                  selectedAddressId === addr._id ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-semibold text-sm text-gray-800">{addr.label || 'Address'}</p>
                <p className="text-xs text-gray-600 mt-1">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
                <p className="text-xs text-gray-500">{addr.city}, {addr.state} - {addr.pincode}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Method */}
      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Payment Method</h2>
        <div className="flex space-x-4">
          <label className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer flex-1 ${paymentMethod === 'cod' ? 'border-green-600 bg-green-50' : 'border-gray-200'}`}>
            <input
              type="radio"
              name="paymentMethod"
              value="cod"
              checked={paymentMethod === 'cod'}
              onChange={() => setPaymentMethod('cod')}
              className="text-green-600 focus:ring-green-500"
            />
            <span className="text-sm font-medium text-gray-800">Cash on Delivery (COD)</span>
          </label>

          <label className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer flex-1 ${paymentMethod === 'online' ? 'border-green-600 bg-green-50' : 'border-gray-200'}`}>
            <input
              type="radio"
              name="paymentMethod"
              value="online"
              checked={paymentMethod === 'online'}
              onChange={() => setPaymentMethod('online')}
              className="text-green-600 focus:ring-green-500"
            />
            <span className="text-sm font-medium text-gray-800">Online Payment (Mock)</span>
          </label>
        </div>
      </div>

      {/* Order Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-3">
        <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Order Summary</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Item Total</span>
            <span>{formatRupees(itemTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery Fee</span>
            <span>{formatRupees(deliveryFee)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg text-gray-900 border-t pt-2">
            <span>Grand Total</span>
            <span>{formatRupees(grandTotal)}</span>
          </div>
        </div>

        <button
          onClick={handlePlaceOrder}
          disabled={submitting || items.length === 0 || !selectedAddressId}
          className="w-full mt-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md transition disabled:opacity-50 text-center"
        >
          {submitting ? 'Placing Order...' : 'Place Order'}
        </button>
      </div>

      {radiusIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Cannot deliver to this address</h3>
            <p className="text-sm text-gray-700">
              <span className="font-semibold">{radiusIssue.storeName}</span>
              {radiusIssue.distanceKm != null
                ? ` is ${radiusIssue.distanceKm} km from this address.`
                : ' does not deliver to this address.'}
            </p>
            <p className="text-sm text-gray-600">
              This store delivers within {radiusIssue.serviceRadiusKm} km. Place the order from a store inside that distance, or choose an address closer to {radiusIssue.storeName}.
            </p>
            <button
              type="button"
              onClick={() => setRadiusIssue(null)}
              className="w-full py-2 bg-black text-white text-sm font-semibold rounded hover:bg-gray-800"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}