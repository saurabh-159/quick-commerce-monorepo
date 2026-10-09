'use client';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { formatRupees } from '@/utils/format';

export default function AdminProductsPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  // Category Form State
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');

  // Product Form State
  const [prodName, setProdName] = useState('');
  const [prodSlug, setProdSlug] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [unit, setUnit] = useState('1kg');
  const [mrpRupees, setMrpRupees] = useState('');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');

  const fetchCategories = async () => {
    try {
      const data = await api('/catalog/categories');
      setCategories(data || []);
      if (data && data.length > 0) {
        setSelectedCategory(data[0]._id);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Handle Category Creation
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      await api('/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ name: catName, slug: catSlug })
      });
      alert('Category created successfully!');
      setCatName('');
      setCatSlug('');
      fetchCategories();
    } catch (err) {
      alert(err.message || 'Failed to create category');
    }
  };

  // Handle Product Creation
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const mrpPaise = Math.round(Number(mrpRupees) * 100); // convert to paise

      const payload = {
        name: prodName,
        slug: prodSlug,
        category: selectedCategory,
        unit,
        mrpPaise,
        brand,
        description
      };

      await api('/admin/products', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      alert('Product created successfully!');
      setProdName('');
      setProdSlug('');
      setUnit('1kg');
      setMrpRupees('');
      setBrand('');
      setDescription('');
    } catch (err) {
      alert(err.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-black">Manage Categories & Products</h1>

      {/* 1. Create Category Form */}
      <form onSubmit={handleCreateCategory} className="bg-white p-6 rounded-lg shadow border space-y-4">
        <h2 className="font-bold text-lg text-black">Create Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700">Category Name</label>
            <input type="text" value={catName} onChange={(e) => setCatName(e.target.value)} required placeholder="e.g. Snacks" className="w-full p-2 border rounded text-black text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Slug (unique, lowercase)</label>
            <input type="text" value={catSlug} onChange={(e) => setCatSlug(e.target.value)} required placeholder="e.g. snacks" className="w-full p-2 border rounded text-black text-sm" />
          </div>
        </div>
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-semibold">
          Create Category
        </button>
      </form>

      {/* 2. Create Product Form */}
      <form onSubmit={handleCreateProduct} className="bg-white p-6 rounded-lg shadow border space-y-4">
        <h2 className="font-bold text-lg text-black">Create Product</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700">Product Name</label>
            <input type="text" value={prodName} onChange={(e) => setProdName(e.target.value)} required placeholder="e.g. Lay's Chips" className="w-full p-2 border rounded text-black text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Slug</label>
            <input type="text" value={prodSlug} onChange={(e) => setProdSlug(e.target.value)} required placeholder="e.g. lays-chips-50g" className="w-full p-2 border rounded text-black text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Category</label>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full p-2 border rounded text-black text-sm bg-white">
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700">Unit</label>
            <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} required placeholder="e.g. 50g" className="w-full p-2 border rounded text-black text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">MRP (in Rupees)</label>
            <input type="number" value={mrpRupees} onChange={(e) => setMrpRupees(e.target.value)} required placeholder="e.g. 20" className="w-full p-2 border rounded text-black text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Brand (Optional)</label>
            <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. PepsiCo" className="w-full p-2 border rounded text-black text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">Description (Optional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full p-2 border rounded text-black text-sm" />
        </div>

        <button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-semibold">
          {loading ? 'Creating...' : 'Create Product'}
        </button>
      </form>
    </div>
  );
}