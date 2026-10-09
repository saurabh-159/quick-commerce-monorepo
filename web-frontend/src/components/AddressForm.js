'use client';
import { useState } from 'react';
import { api } from '@/utils/api';

export default function AddressForm({ onAddressCreated }) {
  const [label, setLabel] = useState('Home');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Default fallback coordinates (Delhi) for dev testing if geolocation isn't explicitly captured here
      const payload = {
        label,
        line1,
        line2,
        city,
        state,
        pincode,
        lat: 28.6139,
        lng: 77.2090,
        isDefault: true
      };

      const newAddress = await api('/addresses', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      onAddressCreated(newAddress);
    } catch (err) {
      setError(err.message || 'Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow border space-y-3">
      <h3 className="font-bold text-black text-md">Add New Address</h3>
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-700">Label (Home/Work)</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full p-2 border rounded text-black text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Pincode (6 digit)</label>
          <input
            type="text"
            maxLength={6}
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            className="w-full p-2 border rounded text-black text-sm"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700">Address Line 1</label>
        <input
          type="text"
          value={line1}
          onChange={(e) => setLine1(e.target.value)}
          placeholder="House no., Street name"
          className="w-full p-2 border rounded text-black text-sm"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-700">City</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full p-2 border rounded text-black text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">State</label>
          <input
            type="text"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full p-2 border rounded text-black text-sm"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-black text-white py-2 rounded text-sm font-semibold hover:bg-gray-800"
      >
        {loading ? 'Saving Address...' : 'Save Address'}
      </button>
    </form>
  );
}