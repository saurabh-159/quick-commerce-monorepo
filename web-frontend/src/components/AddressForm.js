'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/utils/api';
import { lookupAddress } from '@/utils/geocode';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
  ssr: false,
  loading: () => <div className="h-64 rounded border border-gray-200 bg-brand-bg" />,
});

const FALLBACK = { lat: '28.613900', lng: '77.209000' };

const fieldClass = 'w-full p-2 border rounded text-black text-sm';

export default function AddressForm({ onAddressCreated }) {
  const [label, setLabel] = useState('Home');
  const [line1, setLine1] = useState('');
  const [locality, setLocality] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [pinned, setPinned] = useState(false);
  const [locating, setLocating] = useState(true);
  const [lookingUp, setLookingUp] = useState(false);
  const [locationMessage, setLocationMessage] = useState('Allow location access to place the pin.');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const lookupId = useRef(0);

  async function fillFromPoint(nextLat, nextLng) {
    const id = lookupId.current + 1;
    lookupId.current = id;
    setLat(nextLat);
    setLng(nextLng);
    setPinned(true);
    setLookingUp(true);
    setLocationMessage('Looking up this location...');

    try {
      const found = await lookupAddress(nextLat, nextLng);
      if (lookupId.current !== id) return;
      setLine1(found.line1);
      setLocality(found.locality || '');
      setCity(found.city);
      setState(found.state);
      setPincode(found.pincode);
      setLocationMessage('Address filled from the pin. Edit any field if it needs a change.');
    } catch {
      if (lookupId.current !== id) return;
      setLocationMessage('Could not fill the address. Type it in, or move the pin again.');
    } finally {
      if (lookupId.current === id) setLookingUp(false);
    }
  }

  function placeCurrentLocation() {
    if (!navigator.geolocation) {
      setLat('');
      setLng('');
      setPinned(false);
      setLocating(false);
      setLocationMessage('This browser cannot read your location. Click the map to place the pin.');
      return;
    }

    setLocating(true);
    setLocationMessage('Allow location access to place the pin.');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        fillFromPoint(position.coords.latitude.toFixed(6), position.coords.longitude.toFixed(6));
      },
      () => {
        setLat('');
        setLng('');
        setPinned(false);
        setLocating(false);
        setLocationMessage('Location was blocked. Click the map to place the pin, then edit the address if needed.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  useEffect(() => {
    placeCurrentLocation();
  }, []);

  const handleMapChange = (nextLat, nextLng) => {
    fillFromPoint(nextLat, nextLng);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!pinned || !lat || !lng) {
      setError('Place the pin with current location or by clicking the map.');
      return;
    }

    setLoading(true);
    try {
      const newAddress = await api('/addresses', {
        method: 'POST',
        body: JSON.stringify({
          label,
          line1,
          line2: locality,
          city,
          state,
          pincode,
          lat: Number(lat),
          lng: Number(lng),
          isDefault: true,
        }),
      });
      onAddressCreated(newAddress);
    } catch (err) {
      setError(err.message || 'Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  const mapLat = lat || FALLBACK.lat;
  const mapLng = lng || FALLBACK.lng;

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow border space-y-3">
      <h3 className="font-bold text-black text-md">Add New Address</h3>
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-600">{lookingUp ? 'Looking up this location...' : locationMessage}</p>
        <button
          type="button"
          onClick={placeCurrentLocation}
          className="shrink-0 px-3 py-1.5 border border-gray-300 text-xs font-medium text-gray-700 rounded hover:bg-brand-bg"
        >
          Use current location
        </button>
      </div>

      {locating && !lat ? (
        <div className="h-64 rounded border border-gray-200 bg-brand-bg flex items-center justify-center text-sm text-gray-500">
          Waiting for location...
        </div>
      ) : (
        <LocationPicker lat={mapLat} lng={mapLng} onChange={handleMapChange} className="h-64" />
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-700">Label (Home/Work)</label>
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} className={fieldClass} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Pincode (6 digit)</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            pattern="[0-9]{6}"
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className={fieldClass}
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
          className={fieldClass}
          required
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700">Locality / Area</label>
        <input
          type="text"
          value={locality}
          onChange={(e) => setLocality(e.target.value)}
          placeholder="Janakpuri, block, neighbourhood"
          className={fieldClass}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-700">City</label>
          <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={fieldClass} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">State</label>
          <input type="text" value={state} onChange={(e) => setState(e.target.value)} className={fieldClass} required />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || lookingUp}
        className="w-full bg-black text-white py-2 rounded text-sm font-semibold hover:bg-gray-800 disabled:opacity-60"
      >
        {loading ? 'Saving Address...' : 'Save Address'}
      </button>
    </form>
  );
}
