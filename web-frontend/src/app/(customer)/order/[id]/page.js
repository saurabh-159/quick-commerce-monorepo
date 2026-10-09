'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/utils/api';
import { formatRupees } from '@/utils/format';
import { useSocket } from '@/context/SocketContext';
import StatusBadge from '@/components/StatusBadge';

export default function OrderTrackingPage() {
  const { id } = useParams();
  const socket = useSocket();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const data = await api(`/orders/${id}`);
        setOrder(data);
      } catch (err) {
        setError(err.message || 'Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchOrderDetails();
    }
  }, [id]);

  // Socket listener for live status updates
  useEffect(() => {
    if (!socket || !id) return;

    socket.emit('join:order', { orderId: id });

    const handleStatusUpdate = (payload) => {
      if (payload && payload.orderId === id) {
        setOrder((prev) => (prev ? { ...prev, status: payload.status } : prev));
      }
    };

    socket.on('order:status', handleStatusUpdate);
    socket.on('order:assigned', handleStatusUpdate);

    return () => {
      socket.off('order:status', handleStatusUpdate);
      socket.off('order:assigned', handleStatusUpdate);
    };
  }, [socket, id]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading order status...</div>;
  }

  if (error) {
    return <div className="bg-red-50 p-4 text-red-700 border border-red-200 rounded">{error}</div>;
  }

  if (!order) return null;

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow border">
      <div className="flex justify-between items-center border-b pb-4 mb-4">
        <div>
          <h1 className="text-xl font-bold text-black">Order #{order.orderNumber || order._id.slice(-6)}</h1>
          <p className="text-xs text-gray-500">Payment: {order.paymentMethod?.toUpperCase()} ({order.paymentStatus})</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="mb-6 bg-gray-50 p-4 rounded border">
        <h3 className="font-semibold text-sm text-black mb-2">Delivery Address</h3>
        <p className="text-xs text-gray-600">
          {order.addressSnapshot?.line1}, {order.addressSnapshot?.city} - {order.addressSnapshot?.pincode}
        </p>
      </div>

      <div className="mb-6">
        <h3 className="font-semibold text-sm text-black mb-3">Items Ordered</h3>
        <div className="space-y-2">
          {order.items?.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm py-1 border-b">
              <span className="text-black">{item.name} x {item.qty}</span>
              <span className="font-medium text-gray-700">{formatRupees(item.pricePaise * item.qty)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t pt-4 flex justify-between items-center font-bold text-black">
        <span>Grand Total</span>
        <span className="text-green-600 text-lg">{formatRupees(order.pricing?.grandTotal || 0)}</span>
      </div>
    </div>
  );
}