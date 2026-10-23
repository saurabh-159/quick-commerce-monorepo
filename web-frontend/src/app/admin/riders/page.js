'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';
import { vehicleLabel } from '@/utils/riders';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'online', label: 'Online' },
  { id: 'offline', label: 'Offline' },
  { id: 'busy', label: 'On delivery' },
  { id: 'inactive', label: 'Inactive' },
];

function matchesFilter(rider, filter) {
  if (filter === 'online') return rider.isActive && rider.rider?.isOnline;
  if (filter === 'offline') return rider.isActive && !rider.rider?.isOnline;
  if (filter === 'busy') return rider.activeOrders > 0;
  if (filter === 'inactive') return !rider.isActive;
  return true;
}

function Pill({ children, tone }) {
  const tones = {
    green: 'bg-brand-soft text-brand-dark',
    gray: 'bg-gray-100 text-gray-700',
    red: 'bg-red-100 text-red-800',
    amber: 'bg-amber-100 text-amber-800',
  };
  return <span className={`px-2 py-1 text-xs rounded font-semibold ${tones[tone]}`}>{children}</span>;
}

export default function AdminRidersPage() {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function load() {
      try {
        const data = await api('/admin/riders');
        setRiders(data || []);
      } catch (err) {
        setError(err.message || 'Failed to load riders');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const counts = useMemo(() => {
    return riders.reduce(
      (summary, rider) => {
        summary.total += 1;
        if (!rider.isActive) summary.inactive += 1;
        else if (rider.rider?.isOnline) summary.online += 1;
        else summary.offline += 1;
        if (rider.activeOrders > 0) summary.busy += 1;
        return summary;
      },
      { total: 0, online: 0, offline: 0, inactive: 0, busy: 0 }
    );
  }, [riders]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return riders.filter((rider) => {
      if (!matchesFilter(rider, filter)) return false;
      if (!needle) return true;
      return [rider.name, rider.phone, rider.email].some((value) =>
        String(value || '').toLowerCase().includes(needle)
      );
    });
  }, [riders, query, filter]);

  const stats = [
    { label: 'Total', value: counts.total },
    { label: 'Online', value: counts.online },
    { label: 'On delivery', value: counts.busy },
    { label: 'Inactive', value: counts.inactive },
  ];

  return (
    <div className="pb-12">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Riders</h1>
          <p className="text-sm text-gray-500 mt-1">
            Add delivery partners, keep their accounts active, and see who is free.
          </p>
        </div>
        <Link
          href="/admin/riders/new"
          className="shrink-0 px-4 py-2 bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded transition"
        >
          Add Rider
        </Link>
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white border rounded-lg px-4 py-3">
            <p className="text-xs font-medium text-gray-500">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{loading ? '—' : stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone, or email"
            className="w-full sm:max-w-xs px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`px-3 py-1.5 rounded text-xs font-semibold ${
                  filter === item.id ? 'bg-brand text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-gray-500">Loading riders...</p>
        ) : visible.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">
            {riders.length === 0 ? 'No riders yet. Add one from the button above.' : 'No riders match this search.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-brand-bg">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Rider</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Phone</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Vehicle</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Availability</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Account</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Active orders</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {visible.map((rider) => (
                  <tr key={rider._id}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="h-9 w-9 rounded-full bg-brand-soft text-brand-dark text-sm font-semibold flex items-center justify-center">
                          {(rider.name || '?').trim().charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">{rider.name}</p>
                          <p className="text-xs text-gray-500">{rider.email || 'No email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-600">{rider.phone}</td>
                    <td className="px-4 py-4 text-gray-600">{vehicleLabel(rider.rider?.vehicleType)}</td>
                    <td className="px-4 py-4">
                      <Pill tone={rider.isActive && rider.rider?.isOnline ? 'green' : 'gray'}>
                        {rider.isActive && rider.rider?.isOnline ? 'Online' : 'Offline'}
                      </Pill>
                    </td>
                    <td className="px-4 py-4">
                      <Pill tone={rider.isActive ? 'green' : 'red'}>{rider.isActive ? 'Active' : 'Inactive'}</Pill>
                    </td>
                    <td className="px-4 py-4">
                      {rider.activeOrders > 0 ? (
                        <Pill tone="amber">{rider.activeOrders}</Pill>
                      ) : (
                        <span className="text-gray-500">0</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/riders/${rider._id}`}
                          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                        >
                          View
                        </Link>
                        <Link
                          href={`/admin/riders/${rider._id}/edit`}
                          className="px-3 py-1.5 text-sm font-medium text-brand-dark bg-brand-soft rounded hover:bg-brand-soft"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
