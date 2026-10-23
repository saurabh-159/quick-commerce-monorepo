// src/app/rider/assignments/page.js

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';
import { useSocket } from '@/context/SocketContext';
import { getUser } from '@/utils/auth';
import StatusBadge from '@/components/StatusBadge';

export default function RiderAssignmentsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const socket = useSocket();
  const user = getUser();

  const formatRupees = (paise) => `₹${(paise / 100).toFixed(2)}`;

  const fetchAssignments = async () => {
    try {
      const data = await api('/rider/assignments');
      setOrders(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  useEffect(() => {
    if (!socket || !user) return;

    const handleAssigned = (payload) => {
      if (payload.riderId === user.id || payload.riderId === user._id) {
        fetchAssignments();
      }
    };

    socket.on('order:assigned', handleAssigned);
    return () => {
      socket.off('order:assigned', handleAssigned);
    };
  }, [socket, user]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading assignments...</div>;
  }

  if (error) {
    return <div className="p-4 bg-red-100 text-red-700 rounded-md my-4">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">My Assigned Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg border p-8">
          No orders assigned currently.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order._id} className="bg-white rounded-lg shadow-sm border p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center space-x-3">
                  <span className="font-bold text-gray-900">Order #{order.orderNumber || order._id.slice(-6)}</span>
                  <StatusBadge status={order.status} />
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Address: {order.addressSnapshot?.line1}, {order.addressSnapshot?.city}
                </p>
              </div>

              <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end">
                <span className="font-semibold text-gray-900">
                  {formatRupees(order.pricing?.grandTotal || 0)}
                </span>
                <Link
                  href={`/rider/orders/${order._id}`}
                  className="px-4 py-2 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-md transition"
                >
                  Manage Order
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}