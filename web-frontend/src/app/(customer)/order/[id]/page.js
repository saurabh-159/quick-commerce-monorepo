// src/app/(customer)/order/[id]/page.js

'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/utils/api';
import { useSocket } from '@/context/SocketContext';
import StatusBadge from '@/components/StatusBadge';

const OrderTrackMap = dynamic(() => import('@/components/OrderTrackMap'), { ssr: false });

function pointFrom(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  const [lng, lat] = coordinates.map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id;
  const socket = useSocket();

  const [order, setOrder] = useState(null);
  const [riderPoint, setRiderPoint] = useState(null);
  const [riderDistanceKm, setRiderDistanceKm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);

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

    const handleAssigned = (payload) => {
      if (payload.orderId === orderId) {
        fetchOrder();
      }
    };

    const handleRiderLocation = (payload) => {
      if (String(payload.orderId) !== String(orderId)) return;
      const lat = Number(payload.lat);
      const lng = Number(payload.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      setRiderPoint({ lat, lng });
      if (payload.distanceKm != null) setRiderDistanceKm(payload.distanceKm);
    };

    socket.on('order:status', handleStatusUpdate);
    socket.on('order:assigned', handleAssigned);
    socket.on('rider:location', handleRiderLocation);

    return () => {
      socket.off('order:status', handleStatusUpdate);
      socket.off('order:assigned', handleAssigned);
      socket.off('rider:location', handleRiderLocation);
    };
  }, [socket, orderId]);

  const handleCancelOrder = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    setCancelling(true);
    setError('');
    try {
      const data = await api(`/orders/${orderId}/cancel`, { method: 'POST' });
      setOrder(data);
    } catch (err) {
      setError(err.message || 'Order cannot be cancelled at this stage');
    } finally {
      setCancelling(false);
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

  const canCancel = order.status === 'pending' || order.status === 'confirmed';
  const home = pointFrom(order.addressSnapshot?.location?.coordinates);
  const store = pointFrom(order.store?.location?.coordinates);
  const rider = riderPoint || pointFrom(order.rider?.rider?.currentLocation?.coordinates);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Order #{order.orderNumber || order._id.slice(-6)}</h1>
          <p className="text-xs text-gray-500 mt-1">{new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <div className="flex items-center space-x-3">
          <StatusBadge status={order.status} />
          {canCancel && (
            <button
              onClick={handleCancelOrder}
              disabled={cancelling}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-md transition disabled:opacity-50"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Order'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {order.etaMinutes && (
        <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg flex justify-between items-center text-sm">
          <span>Estimated Delivery Time</span>
          <span className="font-bold">{order.etaMinutes} mins</span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">Delivery map</h2>
        <div className="flex gap-4 text-xs text-gray-600">
          <span>Blue: you</span>
          <span>Green: shop</span>
          <span>Orange: rider</span>
          {riderDistanceKm != null && <span>{riderDistanceKm} km left</span>}
        </div>
        {home || store ? (
          <OrderTrackMap home={home} store={store} rider={rider} />
        ) : (
          <p className="text-sm text-gray-500">Location is not available for this order.</p>
        )}
      </div>

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
        <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Payment & Pricing</h2>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Payment Method</span>
          <span className="uppercase font-medium text-gray-800">{order.paymentMethod} ({order.paymentStatus})</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Item Total</span>
          <span>{formatRupees(order.pricing?.itemTotalPaise || order.pricing?.itemTotal || 0)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Delivery Fee</span>
          <span>{formatRupees(order.pricing?.deliveryFeePaise || order.pricing?.deliveryFee || 0)}</span>
        </div>
        <div className="flex justify-between font-bold text-lg text-gray-900 border-t pt-2">
          <span>Grand Total</span>
          <span>{formatRupees(order.pricing?.grandTotalPaise || order.pricing?.grandTotal || 0)}</span>
        </div>
      </div>
    </div>
  );
}