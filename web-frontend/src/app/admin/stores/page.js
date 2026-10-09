'use client';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';

export default function AdminStoresPage() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states for creating store
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressText, setAddressText] = useState('');
  const [lat, setLat] = useState('28.6139');
  const [lng, setLng] = useState('77.2090');
  const [radius, setRadius] = useState('5');
  const [submitting, setSubmitting] = useState(false);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const data = await api('/admin/stores');
      setStores(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handleCreateStore = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        name,
        phone,
        addressText,
        location: {
          type: 'Point',
          coordinates: [Number(lng), Number(lat)] // Longitude first!
        },
        serviceRadiusKm: Number(radius),
        isOpen: true
      };

      await api('/admin/stores', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setName('');
      setPhone('');
      setAddressText('');
      fetchStores();
    } catch (err) {
      alert(err.message || 'Failed to create store');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-black">Manage Stores</h1>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

      {/* Create Store Form */}
      <form onSubmit={handleCreateStore} className="bg-white p-6 rounded-lg shadow border mb-8 space-y-4">
        <h2 className="font-bold text-lg text-black">Add New Store</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700">Store Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full p-2 border rounded text-black text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Phone</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full p-2 border rounded text-black text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">Address Text</label>
          <input type="text" value={addressText} onChange={(e) => setAddressText(e.target.value)} required className="w-full p-2 border rounded text-black text-sm" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700">Latitude</label>
            <input type="text" value={lat} onChange={(e) => setLat(e.target.value)} required className="w-full p-2 border rounded text-black text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Longitude</label>
            <input type="text" value={lng} onChange={(e) => setLng(e.target.value)} required className="w-full p-2 border rounded text-black text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Radius (Km)</label>
            <input type="number" value={radius} onChange={(e) => setRadius(e.target.value)} required className="w-full p-2 border rounded text-black text-sm" />
          </div>
        </div>

        <button type="submit" disabled={submitting} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-semibold">
          {submitting ? 'Creating...' : 'Create Store'}
        </button>
      </form>

      {/* Stores List */}
      <h2 className="font-bold text-lg text-black mb-4">Existing Stores</h2>
      {loading ? (
        <p className="text-gray-500">Loading stores...</p>
      ) : stores.length === 0 ? (
        <p className="text-gray-500">No stores found.</p>
      ) : (
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-gray-700">
                <th className="p-3">Name</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Address</th>
                <th className="p-3">Radius</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((st) => (
                <tr key={st._id} className="border-b">
                  <td className="p-3 font-medium text-black">{st.name}</td>
                  <td className="p-3 text-gray-600">{st.phone}</td>
                  <td className="p-3 text-gray-600">{st.addressText}</td>
                  <td className="p-3 text-gray-600">{st.serviceRadiusKm} km</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 text-xs rounded font-semibold ${st.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {st.isOpen ? 'Open' : 'Closed'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}