// src/app/(customer)/orders/page.js

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';
import StatusBadge from '@/components/StatusBadge';
import AiSupportChat from '@/components/AiSupportChat';

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const formatRupees = (paise) => `₹${(paise / 100).toFixed(2)}`;

  useEffect(() => {
    async function fetchOrders() {
      try {
        const data = await api('/orders');
        setOrders(data || []);
      } catch (err) {
        setError(err.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading orders...</div>;
  }

  if (error) {
    return <div className="p-4 bg-red-100 text-red-700 rounded-md my-4">{error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">My Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg border p-8">
          No orders found.
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
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end">
                <span className="font-semibold text-gray-900">
                  {formatRupees(order.pricing?.grandTotal || 0)}
                </span>
                <Link
                  href={`/order/${order._id}`}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <AiSupportChat mode="order" title="Order help" />
    </div>
  );
}