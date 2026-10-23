// src/app/rider/orders/[id]/page.js

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/utils/api';
import { useSocket } from '@/context/SocketContext';
import StatusBadge from '@/components/StatusBadge';

const NEXT_STATUS_MAP = {
  assigned: 'accepted',
  accepted: 'packed',
  packed: 'picked_up',
  picked_up: 'on_the_way',
  on_the_way: 'delivered',
};

export default function RiderOrderDetailPage() {
  const params = useParams();
  const orderId = params.id;
  const socket = useSocket();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const formatRupees = (paise) => `₹${(paise / 100).toFixed(2)}`;

  const fetchOrder = async () => {
    try {
      const data = await api(`/orders/${orderId}`);
      setOrder(data);
    } catch (err) {
      setError(err.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  useEffect(() => {
    if (!socket || !orderId) return;

    socket.emit('join:order', { orderId });

    const handleStatusUpdate = (payload) => {
      if (payload.orderId === orderId) {
        setOrder((prev) => (prev ? { ...prev, status: payload.status } : prev));
      }
    };

    socket.on('order:status', handleStatusUpdate);
    return () => {
      socket.off('order:status', handleStatusUpdate);
    };
  }, [socket, orderId]);

  const handleNextStatus = async () => {
    if (!order) return;
    const nextStatus = NEXT_STATUS_MAP[order.status];
    if (!nextStatus) return;

    setUpdating(true);
    setError('');

    try {
      const data = await api(`/rider/orders/${orderId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: nextStatus }),
      });
      setOrder(data);
    } catch (err) {
      setError(err.message || 'Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading order details...</div>;
  }

  if (error && !order) {
    return <div className="p-4 bg-red-100 text-red-700 rounded-md my-4">{error}</div>;
  }

  if (!order) {
    return <div className="text-center py-12 text-gray-500">Order not found.</div>;
  }

  const nextStatus = NEXT_STATUS_MAP[order.status];

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Order #{order.orderNumber || order._id.slice(-6)}</h1>
          <p className="text-xs text-gray-500 mt-1">{new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <div className="flex items-center space-x-3">
          <StatusBadge status={order.status} />
          {nextStatus && (
            <button
              onClick={handleNextStatus}
              disabled={updating}
              className="px-4 py-2 bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-md transition disabled:opacity-50 uppercase"
            >
              {updating ? 'Updating...' : `Mark as ${nextStatus.replace('_', ' ')}`}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Items</h2>
        <div className="divide-y">
          {(order.items || []).map((item, idx) => (
            <div key={idx} className="py-3 flex justify-between items-center text-sm">
              <div>
                <p className="font-medium text-gray-800">{item.name}</p>
                <p className="text-xs text-gray-500">Qty: {item.qty} {item.unit}</p>
              </div>
              <span className="font-semibold text-gray-900">
                {formatRupees(item.pricePaise * item.qty)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-2">
        <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Delivery Address</h2>
        {order.addressSnapshot ? (
          <div className="text-sm text-gray-600">
            <p>{order.addressSnapshot.line1}, {order.addressSnapshot.city}</p>
            <p>{order.addressSnapshot.pincode}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No address snapshot available.</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-3">
        <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Payment & Total</h2>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Payment Method</span>
          <span className="uppercase font-medium text-gray-800">{order.paymentMethod} ({order.paymentStatus})</span>
        </div>
        <div className="flex justify-between font-bold text-lg text-gray-900 border-t pt-2">
          <span>Grand Total</span>
          <span>{formatRupees(order.pricing?.grandTotalPaise || order.pricing?.grandTotal || 0)}</span>
        </div>
      </div>
    </div>
  );
}