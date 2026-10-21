'use client';

import { useState } from 'react';
import Link from 'next/link';
import ImagePicker from '@/components/ImagePicker';
import { aiGenerateProductContent } from '@/utils/ai';

function toSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function ProductForm({
  heading,
  submitLabel,
  categories,
  initialValues,
  onSubmit,
  submitting,
  error,
}) {
  const [name, setName] = useState(initialValues?.name || '');
  const [slug, setSlug] = useState(initialValues?.slug || '');
  const [slugEdited, setSlugEdited] = useState(Boolean(initialValues?.slug));
  const [category, setCategory] = useState(initialValues?.category || '');
  const [brand, setBrand] = useState(initialValues?.brand || '');
  const [unit, setUnit] = useState(initialValues?.unit || '');
  const [mrp, setMrp] = useState(initialValues?.mrp || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [highlights, setHighlights] = useState(initialValues?.highlights || '');
  const [images, setImages] = useState(initialValues?.images || []);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const handleNameChange = (value) => {
    setName(value);
    if (!slugEdited) setSlug(toSlug(value));
  };

  const handleGenerateAi = async () => {
    if (!name.trim() || !category) {
      setAiError('Enter name and select category first');
      return;
    }
    const cat = (categories || []).find((c) => c._id === category);
    if (!cat?.name) {
      setAiError('Category not found');
      return;
    }

    setAiError('');
    setAiLoading(true);
    try {
      const data = await aiGenerateProductContent(name.trim(), cat.name);
      if (data?.title) {
        setName(data.title);
        if (!slugEdited) setSlug(toSlug(data.title));
      }
      if (data?.description) setDescription(data.description);
      if (Array.isArray(data?.tags) && data.tags.length) {
        setHighlights(data.tags.join('\n'));
      }
    } catch (err) {
      setAiError(err.message || 'AI generate failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      name,
      slug,
      category,
      brand,
      unit,
      mrpPaise: Math.round(parseFloat(mrp) * 100),
      description,
      highlights: highlights
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      images,
    });
  };

  const fieldClass =
    'w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500';

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/products" className="text-sm font-medium text-green-700 hover:underline">
          ← Back to products
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{heading}</h1>
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={fieldClass}
              placeholder="Milk 1L"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Slug</label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(e.target.value);
              }}
              className={fieldClass}
              placeholder="milk-1l"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`${fieldClass} bg-white`}
            >
              <option value="">Select category</option>
              {(categories || []).map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
            {(categories || []).length === 0 && (
              <p className="mt-1 text-xs text-gray-500">
                No categories yet.{' '}
                <Link href="/admin/categories/new" className="text-green-700 font-medium">
                  Add a category
                </Link>
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Brand</label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className={fieldClass}
              placeholder="Amul"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
            <input
              type="text"
              required
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className={fieldClass}
              placeholder="1 pkt / 500g"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">MRP (₹)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={mrp}
            onChange={(e) => setMrp(e.target.value)}
            className={fieldClass}
            placeholder="45.00"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-3">
            <label className="block text-xs font-medium text-gray-700">Description</label>
            <button
              type="button"
              onClick={handleGenerateAi}
              disabled={aiLoading || !name.trim() || !category}
              className="text-xs font-semibold text-green-700 hover:underline disabled:opacity-40"
            >
              {aiLoading ? 'Generating…' : 'Generate with AI'}
            </button>
          </div>
          {aiError && <p className="mb-2 text-xs text-amber-700">{aiError}</p>}
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={fieldClass}
            placeholder="What is this product, and why should someone buy it?"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Key points</label>
          <textarea
            rows={3}
            value={highlights}
            onChange={(e) => setHighlights(e.target.value)}
            className={fieldClass}
            placeholder={'One point per line\nPasteurised\n1 litre pack'}
          />
        </div>

        <ImagePicker folder="/products" images={images} onChange={setImages} />

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold rounded transition"
          >
            {submitting ? 'Saving...' : submitLabel}
          </button>
          <Link
            href="/admin/products"
            className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
