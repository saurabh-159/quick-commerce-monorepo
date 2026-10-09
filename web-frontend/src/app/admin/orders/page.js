'use client';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { formatRupees } from '@/utils/format';
import StatusBadge from '@/components/StatusBadge';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [riderIdInput, setRiderIdInput] = useState({});

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await api('/orders');
      setOrders(data || []);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleAssignRider = async (orderId) => {
    const riderId = riderIdInput[orderId];
    if (!riderId) {
      alert('Please enter a valid Rider ID');
      return;
    }

    try {
      await api(`/admin/orders/${orderId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ riderId })
      });
      alert('Rider assigned successfully!');
      fetchOrders();
    } catch (err) {
      alert(err.message || 'Failed to assign rider');
    }
  };

  if (loading) {
    return <div className="text-gray-500 font-medium">Loading orders...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-black mb-6">Manage Orders & Assign Riders</h1>

      {orders.length === 0 ? (
        <div className="bg-white p-6 rounded shadow border text-center">
          <p className="text-gray-500">No orders found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-gray-700">
                <th className="p-3">Order #</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Status</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Total</th>
                <th className="p-3">Assign Rider</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((ord) => (
                <tr key={ord._id} className="border-b">
                  <td className="p-3 font-medium text-black">{ord.orderNumber || ord._id.slice(-6)}</td>
                  <td className="p-3 text-gray-600">{ord.user?.name || 'Customer'}</td>
                  <td className="p-3"><StatusBadge status={ord.status} /></td>
                  <td className="p-3 text-gray-600">{ord.paymentMethod?.toUpperCase()} ({ord.paymentStatus})</td>
                  <td className="p-3 font-semibold text-green-600">{formatRupees(ord.pricing?.grandTotal || 0)}</td>
                  <td className="p-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Rider Mongo ID"
                        value={riderIdInput[ord._id] || ''}
                        onChange={(e) => setRiderIdInput({ ...riderIdInput, [ord._id]: e.target.value })}
                        className="p-1 border rounded text-xs text-black w-32"
                      />
                      <button
                        onClick={() => handleAssignRider(ord._id)}
                        className="bg-blue-600 text-white px-2.5 py-1 rounded text-xs font-semibold hover:bg-blue-700"
                      >
                        Assign
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