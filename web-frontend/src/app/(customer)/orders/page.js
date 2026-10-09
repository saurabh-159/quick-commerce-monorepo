'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';
import { formatRupees } from '@/utils/format';
import StatusBadge from '@/components/StatusBadge';

export default function OrdersListPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await api('/orders');
        setOrders(data || []);
      } catch (err) {
        setError(err.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading your orders...</div>;
  }

  if (error) {
    return <div className="bg-red-50 p-4 text-red-700 border border-red-200 rounded">{error}</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-black">Your Orders</h1>

      {orders.length === 0 ? (
        <div className="bg-white p-6 rounded shadow text-center border">
          <p className="text-gray-500">You haven't placed any orders yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order._id} className="bg-white p-4 rounded-lg shadow border flex items-center justify-between">
              <div>
                <p className="font-bold text-black">Order #{order.orderNumber || order._id.slice(-6)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Total: <span className="font-semibold text-gray-700">{formatRupees(order.pricing?.grandTotal || 0)}</span>
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <StatusBadge status={order.status} />
                <Link
                  href={`/order/${order._id}`}
                  className="bg-gray-100 hover:bg-gray-200 text-black px-3 py-1.5 rounded text-xs font-semibold"
                >
                  Track
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}