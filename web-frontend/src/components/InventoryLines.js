'use client';

import ImagePicker from '@/components/ImagePicker';

const fieldClass =
  'w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500 bg-white';

export function createInventoryLine(partial = {}) {
  return {
    key: partial.key || `line-${Math.random().toString(36).slice(2, 10)}`,
    inventoryId: partial.inventoryId || '',
    productId: partial.productId || '',
    stock: partial.stock ?? '',
    sellingPrice: partial.sellingPrice ?? '',
    description: partial.description || '',
    images: partial.images || [],
    locked: Boolean(partial.locked),
  };
}

export default function InventoryLines({ products, lines, onChange }) {
  const selectedIds = new Set(lines.map((line) => line.productId).filter(Boolean));
  const unusedCount = products.filter((product) => !selectedIds.has(product._id)).length;

  const updateLine = (key, patch) => {
    onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  const addLine = () => {
    onChange([...lines, createInventoryLine()]);
  };

  const removeLine = (key) => {
    onChange(lines.filter((line) => line.key !== key));
  };

  const optionsFor = (line) =>
    products.filter((product) => product._id === line.productId || !selectedIds.has(product._id));

  return (
    <div className="space-y-3">
      {lines.map((line, index) => {
        const lockedProduct = products.find((product) => product._id === line.productId);
        return (
          <div key={line.key} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-800">Product {index + 1}</p>
              <button
                type="button"
                onClick={() => removeLine(line.key)}
                className="text-sm font-medium text-red-700 hover:underline"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Product</label>
                {line.locked ? (
                  <p className="px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded">
                    {lockedProduct?.name || 'Product'}
                    {lockedProduct?.unit ? ` (${lockedProduct.unit})` : ''}
                  </p>
                ) : (
                  <select
                    required
                    value={line.productId}
                    onChange={(e) => updateLine(line.key, { productId: e.target.value })}
                    className={fieldClass}
                  >
                    <option value="">Select product</option>
                    {optionsFor(line).map((product) => (
                      <option key={product._id} value={product._id}>
                        {product.name} ({product.unit})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Stock</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={line.stock}
                  onChange={(e) => updateLine(line.key, { stock: e.target.value })}
                  className={fieldClass}
                  placeholder="50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Selling price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={line.sellingPrice}
                  onChange={(e) => updateLine(line.key, { sellingPrice: e.target.value })}
                  className={fieldClass}
                  placeholder="40.00"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Note</label>
              <textarea
                rows={2}
                value={line.description}
                onChange={(e) => updateLine(line.key, { description: e.target.value })}
                className={fieldClass}
                placeholder="Store note, offer text, or freshness detail"
              />
            </div>
            <div className="mt-3">
              <ImagePicker
                label="Store photos"
                folder="/inventory"
                images={line.images}
                onChange={(nextImages) => updateLine(line.key, { images: nextImages })}
              />
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={addLine}
        disabled={products.length > 0 && unusedCount === 0}
        className="px-3 py-2 text-sm font-semibold text-green-700 bg-green-50 rounded hover:bg-green-100 disabled:opacity-60"
      >
        Add another product
      </button>
      {products.length > 0 && unusedCount === 0 && (
        <p className="text-xs text-gray-500">Every catalog product is already on this list.</p>
      )}
    </div>
  );
}
