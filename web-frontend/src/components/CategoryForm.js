'use client';

import { useState } from 'react';
import Link from 'next/link';
import ImagePicker from '@/components/ImagePicker';

function toSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function CategoryForm({ heading, submitLabel, initialValues, onSubmit, submitting, error }) {
  const [name, setName] = useState(initialValues?.name || '');
  const [slug, setSlug] = useState(initialValues?.slug || '');
  const [slugEdited, setSlugEdited] = useState(Boolean(initialValues?.slug));
  const [isActive, setIsActive] = useState(initialValues?.isActive !== false);
  const [description, setDescription] = useState(initialValues?.description || '');
  const [images, setImages] = useState(initialValues?.images || []);

  const fieldClass =
    'w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand';

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ name, slug, isActive, description, images });
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/categories" className="text-sm font-medium text-brand-dark hover:underline">
          ← Back to categories
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
              onChange={(e) => {
                const value = e.target.value;
                setName(value);
                if (!slugEdited) setSlug(toSlug(value));
              }}
              className={fieldClass}
              placeholder="Dairy & Eggs"
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
              placeholder="dairy-eggs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={fieldClass}
            placeholder="Short text shoppers see for this category"
          />
        </div>

        <ImagePicker folder="/categories" images={images} onChange={setImages} />

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-semibold rounded transition"
          >
            {submitting ? 'Saving...' : submitLabel}
          </button>
          <Link
            href="/admin/categories"
            className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded hover:bg-brand-bg"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
