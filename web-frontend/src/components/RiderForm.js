'use client';

import { useState } from 'react';
import Link from 'next/link';
import { VEHICLES } from '@/utils/riders';

const fieldClass =
  'w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand';

export default function RiderForm({
  mode = 'create',
  heading,
  submitLabel,
  initialValues,
  onSubmit,
  submitting,
  error,
}) {
  const editing = mode === 'edit';
  const [name, setName] = useState(initialValues?.name || '');
  const [phone, setPhone] = useState(initialValues?.phone || '');
  const [email, setEmail] = useState(initialValues?.email || '');
  const [password, setPassword] = useState('');
  const [vehicleType, setVehicleType] = useState(initialValues?.vehicleType || 'bike');
  const [isActive, setIsActive] = useState(initialValues?.isActive !== false);

  const handleSubmit = (event) => {
    event.preventDefault();
    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      vehicleType,
    };

    if (editing) payload.isActive = isActive;
    if (!editing || password) payload.password = password;
    onSubmit(payload);
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/riders" className="text-sm font-medium text-brand-dark hover:underline">
          ← Back to riders
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{heading}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {editing
            ? 'Update contact details, vehicle, or the login password.'
            : 'The rider signs in on the rider portal with this phone number and password.'}
        </p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Full name</label>
            <input type="text" required minLength={2} maxLength={50} value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              required
              inputMode="numeric"
              pattern="[0-9]{10}"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className={fieldClass}
              placeholder="10-digit mobile"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} placeholder="Optional" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Vehicle</label>
            <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} className={fieldClass}>
              {VEHICLES.map((vehicle) => (
                <option key={vehicle.value} value={vehicle.value}>
                  {vehicle.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {editing ? 'New password' : 'Password'}
          </label>
          <input
            type="password"
            required={!editing}
            minLength={password ? 8 : undefined}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={fieldClass}
            placeholder={editing ? 'Leave blank to keep the current password' : 'At least 8 characters'}
          />
        </div>

        {editing && (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-gray-300 text-brand" />
            Account is active and can receive orders
          </label>
        )}

        <div className="pt-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded transition disabled:opacity-60"
          >
            {submitting ? 'Saving...' : submitLabel}
          </button>
          <Link href="/admin/riders" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
