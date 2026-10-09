'use client';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';

export default function AdminDashboardPage() {
  const [storeCount, setStoreCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stores = await api('/admin/stores');
        const orders = await api('/orders');
        setStoreCount(stores?.length || 0);
        setOrderCount(orders?.length || 0);
      } catch (err) {
        console.error('Failed to load dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="text-gray-500 font-medium">Loading dashboard stats...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-black mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-gray-500 text-sm font-medium">Total Stores</h3>
          <p className="text-3xl font-bold text-black mt-2">{storeCount}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-gray-500 text-sm font-medium">Total Orders</h3>
          <p className="text-3xl font-bold text-black mt-2">{orderCount}</p>
        </div>
      </div>
    </div>
  );
}