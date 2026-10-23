// src/app/admin/page.js

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    storesCount: 0,
    categoriesCount: 0,
    productsCount: 0,
    totalRiders: 0,
    onlineRiders: 0,
    totalOrders: 0,
    confirmedOrders: 0,
    assignedOrders: 0,
    deliveredOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchDashboardStats() {
      try {
        const [storesData, categoriesData, productsData, ridersData, ordersData] = await Promise.all([
          api('/admin/stores'),
          api('/admin/categories'),
          api('/admin/products'),
          api('/admin/riders'),
          api('/orders'),
        ]);

        const stores = storesData || [];
        const categories = categoriesData || [];
        const products = productsData || [];
        const riders = ridersData || [];
        const orders = ordersData || [];

        const onlineRiders = riders.filter((r) => r.rider?.isOnline === true).length;
        const confirmedOrders = orders.filter((o) => o.status === 'confirmed').length;
        const assignedOrders = orders.filter((o) => o.status === 'assigned').length;
        const deliveredOrders = orders.filter((o) => o.status === 'delivered').length;

        setStats({
          storesCount: stores.length,
          categoriesCount: categories.length,
          productsCount: products.length,
          totalRiders: riders.length,
          onlineRiders,
          totalOrders: orders.length,
          confirmedOrders,
          assignedOrders,
          deliveredOrders,
        });
      } catch (err) {
        setError(err.message || 'Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardStats();
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="p-4 bg-red-100 text-red-700 rounded-md my-4">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-text">Admin Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stores Card */}
        <Link href="/admin/stores" className="bg-white p-6 rounded-lg shadow-sm border hover:border-brand transition block">
          <h3 className="text-sm font-medium text-gray-500">Total Stores</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.storesCount}</p>
          <span className="text-xs text-brand mt-3 inline-block font-medium">Manage Stores →</span>
        </Link>

        <Link href="/admin/categories" className="bg-white p-6 rounded-lg shadow-sm border hover:border-brand transition block">
          <h3 className="text-sm font-medium text-gray-500">Total Categories</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.categoriesCount}</p>
          <span className="text-xs text-brand mt-3 inline-block font-medium">Manage Categories →</span>
        </Link>

        {/* Products Card */}
        <Link href="/admin/products" className="bg-white p-6 rounded-lg shadow-sm border hover:border-brand transition block">
          <h3 className="text-sm font-medium text-gray-500">Total Products</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.productsCount}</p>
          <span className="text-xs text-brand mt-3 inline-block font-medium">Manage Products →</span>
        </Link>

        <Link href="/admin/riders" className="bg-white p-6 rounded-lg shadow-sm border hover:border-brand transition block">
          <h3 className="text-sm font-medium text-gray-500">Riders (Online / Total)</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {stats.onlineRiders} <span className="text-lg text-gray-400 font-normal">/ {stats.totalRiders}</span>
          </p>
          <span className="text-xs text-brand mt-3 inline-block font-medium">Manage Riders →</span>
        </Link>

        {/* Orders Card */}
        <Link href="/admin/orders" className="bg-white p-6 rounded-lg shadow-sm border hover:border-brand transition block">
          <h3 className="text-sm font-medium text-gray-500">Total Orders</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalOrders}</p>
          <div className="text-xs text-gray-500 mt-2 flex gap-2">
            <span>Confirmed: {stats.confirmedOrders}</span>
            <span>Assigned: {stats.assignedOrders}</span>
          </div>
          <span className="text-xs text-brand mt-1 inline-block font-medium">Manage Orders →</span>
        </Link>
      </div>
    </div>
  );
}