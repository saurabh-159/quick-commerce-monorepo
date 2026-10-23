'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import ImagePicker from '@/components/ImagePicker';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
  ssr: false,
  loading: () => <div className="h-80 rounded border border-gray-200 bg-brand-bg" />,
});

export default function StoreForm({ heading, submitLabel, initialValues, onSubmit, submitting, error }) {
  const [name, setName] = useState(initialValues?.name || '');
  const [phone, setPhone] = useState(initialValues?.phone || '');
  const [addressText, setAddressText] = useState(initialValues?.addressText || '');
  const [lat, setLat] = useState(initialValues?.lat || '');
  const [lng, setLng] = useState(initialValues?.lng || '');
  const [radius, setRadius] = useState(initialValues?.radius || '5');
  const [isOpen, setIsOpen] = useState(initialValues?.isOpen !== false);
  const [description, setDescription] = useState(initialValues?.description || '');
  const [images, setImages] = useState(initialValues?.images || []);
  const [locationMessage, setLocationMessage] = useState(
    initialValues?.lat && initialValues?.lng ? 'Drag the pin or click the map to change it.' : ''
  );

  function placeCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationMessage('This browser cannot read your location.');
      return;
    }

    setLocationMessage('Allow location access to place the pin.');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(6));
        setLng(position.coords.longitude.toFixed(6));
        setLocationMessage('Current location is set. Drag the pin or click the map to change it.');
      },
      () => {
        setLocationMessage('Location was blocked. Allow it, then press Use current location.');
      }
    );
  }

  useEffect(() => {
    if (initialValues?.lat && initialValues?.lng) return;
    placeCurrentLocation();
  }, []);

  const fieldClass =
    'w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand';

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      name,
      phone,
      addressText,
      location: {
        type: 'Point',
        coordinates: [Number(lng), Number(lat)],
      },
      serviceRadiusKm: Number(radius),
      isOpen,
      description,
      images,
    });
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/stores" className="text-sm font-medium text-brand-dark hover:underline">
          ← Back to stores
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{heading}</h1>
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Store name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
            <input type="text" required value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldClass} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
          <input
            type="text"
            required
            value={addressText}
            onChange={(e) => setAddressText(e.target.value)}
            className={fieldClass}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-gray-600">
            {locationMessage || 'Allow location access to place the pin.'}
          </p>
          <button
            type="button"
            onClick={placeCurrentLocation}
            className="shrink-0 px-3 py-1.5 border border-gray-300 text-xs font-medium text-gray-700 rounded hover:bg-brand-bg"
          >
            Use current location
          </button>
        </div>

        {lat && lng ? (
          <LocationPicker
            lat={lat}
            lng={lng}
            radiusKm={radius}
            onChange={(nextLat, nextLng) => {
              setLat(nextLat);
              setLng(nextLng);
              setLocationMessage('Drag the pin or click the map to change it.');
            }}
          />
        ) : (
          <div className="h-80 rounded border border-gray-200 bg-brand-bg flex items-center justify-center text-sm text-gray-500">
            Waiting for location...
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Latitude</label>
            <input type="text" required value={lat} onChange={(e) => setLat(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Longitude</label>
            <input type="text" required value={lng} onChange={(e) => setLng(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Radius (km)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              required
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={fieldClass}
            placeholder="Hours, what this store is known for, pickup notes"
          />
        </div>

        <ImagePicker folder="/stores" images={images} onChange={setImages} />

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={isOpen} onChange={(e) => setIsOpen(e.target.checked)} />
          Store is open
        </label>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-semibold rounded transition"
          >
            {submitting ? 'Saving...' : submitLabel}
          </button>
          <Link href="/admin/stores" className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded hover:bg-brand-bg">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
