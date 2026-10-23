'use client';
import { formatRupees } from '@/utils/format';

export default function CartItem({ item, onUpdateQty }) {
  return (
    <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow border mb-3">
      <div>
        <h4 className="font-bold text-black">{item.name}</h4>
        <p className="text-sm text-gray-500">Price: {formatRupees(item.pricePaise)}</p>
      </div>

      <div className="flex items-center space-x-3">
        <div className="flex items-center border rounded">
          <button
            onClick={() => onUpdateQty(item.productId, item.qty - 1)}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-black font-bold"
          >
            -
          </button>
          <span className="px-4 text-black font-medium">{item.qty}</span>
          <button
            onClick={() => onUpdateQty(item.productId, item.qty + 1)}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-black font-bold"
          >
            +
          </button>
        </div>
        <span className="font-bold text-brand w-20 text-right">
          {formatRupees(item.totalPaise)}
        </span>
      </div>
    </div>
  );
}