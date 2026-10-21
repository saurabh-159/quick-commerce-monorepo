// src/app/admin/orders/page.js

'use client';

import { useEffect, useState } from 'react';
import { api } from '@/utils/api';
import StatusBadge from '@/components/StatusBadge';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [riders, setRiders] = useState([]);
  const [selectedRiders, setSelectedRiders] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const formatRupees = (paise) => `₹${(paise / 100).toFixed(2)}`;

  const distanceKm = (from, to) => {
    if (!from || !to) return null;
    const toRad = (value) => (value * Math.PI) / 180;
    const dLat = toRad(to[1] - from[1]);
    const dLng = toRad(to[0] - from[0]);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(from[1])) * Math.cos(toRad(to[1])) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const ridersNearShop = (order) => {
    const shop = order.store?.location?.coordinates;
    return riders
      .filter((rider) => rider.isActive !== false)
      .map((rider) => ({
        ...rider,
        km: distanceKm(shop, rider.rider?.currentLocation?.coordinates),
      }))
      .sort((a, b) => (a.km ?? 9999) - (b.km ?? 9999));
  };

  const fetchData = async () => {
    try {
      const ordersData = await api('/orders');
      setOrders(ordersData || []);

      const ridersData = await api('/admin/riders');
      setRiders(ridersData || []);
    } catch (err) {
      setError(err.message || 'Failed to load admin orders or riders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRiderChange = (orderId, riderId) => {
    setSelectedRiders((prev) => ({ ...prev, [orderId]: riderId }));
  };

  const handleAssign = async (orderId, riderId = selectedRiders[orderId]) => {
    if (!riderId) {
      alert('Please select a rider first.');
      return;
    }

    try {
      await api(`/admin/orders/${orderId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ riderId }),
      });
      alert('Order assigned successfully!');
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to assign rider');
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading admin orders...</div>;
  }

  if (error) {
    return <div className="p-4 bg-red-100 text-red-700 rounded-md my-4">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Manage Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg border p-8">
          No orders found.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Order ID</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Customer</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Payment</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Total</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Rider</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order._id}>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    #{order.orderNumber || order._id.slice(-6)}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {order.user?.name || 'Customer'}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-6 py-4 text-gray-600 uppercase text-xs">
                    {order.paymentMethod} ({order.paymentStatus})
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    {formatRupees(order.pricing?.grandTotal || 0)}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {order.rider?.name || order.riderName || 'None'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedRiders[order._id] || ''}
                        onChange={(e) => handleRiderChange(order._id, e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                      >
                        <option value="">Select rider near shop</option>
                        {ridersNearShop(order).map((rider) => (
                          <option key={rider._id} value={rider._id}>
                            {rider.name}
                            {rider.km != null ? ` · ${rider.km.toFixed(1)} km` : ''}
                            {rider.rider?.isOnline ? ' · Online' : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAssign(order._id)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded transition"
                      >
                        Assign
                      </button>
                      <button
                        onClick={() => {
                          const nearest = ridersNearShop(order)[0];
                          if (!nearest) return alert('No rider available.');
                          handleAssign(order._id, nearest._id);
                        }}
                        className="px-3 py-1 bg-black hover:bg-gray-800 text-white text-xs font-semibold rounded transition"
                      >
                        Nearest
                      </button>
                    </div>
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