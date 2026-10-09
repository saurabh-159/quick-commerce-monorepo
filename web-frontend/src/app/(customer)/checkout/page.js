'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import { formatRupees } from '@/utils/format';
import AddressForm from '@/components/AddressForm';

export default function CheckoutPage() {
  const router = useRouter();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod'); // 'cod' or 'online'
  
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAddresses = async () => {
    try {
      const data = await api('/addresses');
      setAddresses(data || []);
      if (data && data.length > 0) {
        setSelectedAddressId(data[0]._id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load addresses');
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      alert('Please select or add a delivery address');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // 1. Create Order
      const orderData = await api('/orders', {
        method: 'POST',
        body: JSON.stringify({
          addressId: selectedAddressId,
          paymentMethod: paymentMethod // lowercase 'cod' or 'online'
        })
      });

      const orderId = orderData._id;

      // 2. If online payment, trigger mock success
      if (paymentMethod === 'online') {
        await api('/payments/online/mock-success', {
          method: 'POST',
          body: JSON.stringify({ orderId })
        });
      }

      // 3. Redirect to order tracking page
      router.replace(`/order/${orderId}`);
    } catch (err) {
      setError(err.message || 'Failed to place order');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto pb-12">
      <h1 className="text-2xl font-bold mb-6 text-black">Checkout & Delivery</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {/* Address Selection Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-lg text-black">Select Delivery Address</h2>
          <button
            onClick={() => setShowNewAddressForm(!showNewAddressForm)}
            className="text-xs text-green-600 font-bold hover:underline"
          >
            {showNewAddressForm ? 'Cancel' : '+ Add New Address'}
          </button>
        </div>

        {showNewAddressForm && (
          <div className="mb-4">
            <AddressForm onAddressCreated={(newAddr) => {
              setAddresses([...addresses, newAddr]);
              setSelectedAddressId(newAddr._id);
              setShowNewAddressForm(false);
            }} />
          </div>
        )}

        {addresses.length === 0 && !showNewAddressForm ? (
          <p className="text-sm text-gray-500 bg-white p-4 rounded border">No saved addresses found. Please add one above.</p>
        ) : (
          <div className="space-y-2">
            {addresses.map((addr) => (
              <label key={addr._id} className={`flex items-start p-3 bg-white rounded border cursor-pointer ${selectedAddressId === addr._id ? 'border-green-600 ring-1 ring-green-600' : ''}`}>
                <input
                  type="radio"
                  name="address"
                  value={addr._id}
                  checked={selectedAddressId === addr._id}
                  onChange={() => setSelectedAddressId(addr._id)}
                  className="mt-1 mr-3"
                />
                <div>
                  <span className="font-bold text-sm text-black">{addr.label}</span>
                  <p className="text-xs text-gray-600">{addr.line1}, {addr.city}, {addr.state} - {addr.pincode}</p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Payment Method Section */}
      <div className="mb-6">
        <h2 className="font-bold text-lg text-black mb-3">Payment Method</h2>
        <div className="space-y-2">
          <label className={`flex items-center p-3 bg-white rounded border cursor-pointer ${paymentMethod === 'cod' ? 'border-green-600 ring-1 ring-green-600' : ''}`}>
            <input
              type="radio"
              name="payment"
              value="cod"
              checked={paymentMethod === 'cod'}
              onChange={() => setPaymentMethod('cod')}
              className="mr-3"
            />
            <span className="font-medium text-sm text-black">Cash on Delivery (COD)</span>
          </label>

          <label className={`flex items-center p-3 bg-white rounded border cursor-pointer ${paymentMethod === 'online' ? 'border-green-600 ring-1 ring-green-600' : ''}`}>
            <input
              type="radio"
              name="payment"
              value="online"
              checked={paymentMethod === 'online'}
              onChange={() => setPaymentMethod('online')}
              className="mr-3"
            />
            <span className="font-medium text-sm text-black">Online Payment (Mock Success)</span>
          </label>
        </div>
      </div>

      <button
        onClick={handlePlaceOrder}
        disabled={loading || addresses.length === 0}
        className={`w-full py-3 rounded-lg font-bold text-white transition ${
          loading || addresses.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        {loading ? 'Placing Order...' : 'Place Order'}
      </button>
    </div>
  );
}