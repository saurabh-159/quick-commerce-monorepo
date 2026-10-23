// src/app/rider/page.js

'use client';

import { useEffect, useState } from 'react';
import { api } from '@/utils/api';

export default function RiderHomePage() {
  const [profile, setProfile] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [loading, setLoading] = useState(true);
  const [updatingOnline, setUpdatingOnline] = useState(false);
  const [updatingLoc, setUpdatingLoc] = useState(false);
  const [error, setError] = useState('');

  const fetchProfile = async () => {
    try {
      const data = await api('/auth/me');
      setProfile(data);
      if (data?.rider) {
        setIsOnline(!!data.rider.isOnline);
        if (data.rider.currentLocation?.coordinates) {
          const [lng, lat] = data.rider.currentLocation.coordinates;
          setLocation({ lat, lng });
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load rider profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleToggleOnline = async () => {
    setUpdatingOnline(true);
    setError('');
    try {
      const nextOnline = !isOnline;
      const data = await api('/rider/online', {
        method: 'PATCH',
        body: JSON.stringify({ isOnline: nextOnline }),
      });
      setIsOnline(data?.rider?.isOnline ?? nextOnline);
    } catch (err) {
      setError(err.message || 'Failed to update online status');
    } finally {
      setUpdatingOnline(false);
    }
  };

  const handleUpdateLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setUpdatingLoc(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        try {
          await api('/rider/location', {
            method: 'PATCH',
            body: JSON.stringify({ lat, lng }),
          });
          setLocation({ lat, lng });
          alert('Location updated successfully!');
        } catch (err) {
          setError(err.message || 'Failed to send location to server');
        } finally {
          setUpdatingLoc(false);
        }
      },
      (err) => {
        setError(`Geolocation error: ${err.message}. Ensure location permissions are allowed.`);
        setUpdatingLoc(false);
      },
      { timeout: 10000 }
    );
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading rider dashboard...</div>;
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Rider Dashboard</h1>

      {error && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

      <div className="bg-white p-6 rounded-lg shadow-sm border space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">{profile?.name || 'Rider'}</h2>
            <p className="text-xs text-gray-500">{profile?.phone}</p>
          </div>
          <div className="text-right">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                isOnline ? 'bg-brand-soft text-brand-dark' : 'bg-gray-100 text-gray-800'
              }`}
            >
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Change Status</span>
            <button
              onClick={handleToggleOnline}
              disabled={updatingOnline}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition text-white ${
                isOnline ? 'bg-red-600 hover:bg-red-700' : 'bg-brand hover:bg-brand-dark'
              } disabled:opacity-50`}
            >
              {updatingOnline ? 'Updating...' : isOnline ? 'Go Offline' : 'Go Online'}
            </button>
          </div>

          <div className="border-t pt-4 space-y-2">
            <span className="text-sm font-medium text-gray-700 block">Current GPS Location</span>
            <p className="text-xs text-gray-500">
              Latitude: {location.lat !== null ? location.lat : 'Not set'} | Longitude:{' '}
              {location.lng !== null ? location.lng : 'Not set'}
            </p>
            <button
              onClick={handleUpdateLocation}
              disabled={updatingLoc}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md transition disabled:opacity-50"
            >
              {updatingLoc ? 'Fetching Location...' : 'Update My Location'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}