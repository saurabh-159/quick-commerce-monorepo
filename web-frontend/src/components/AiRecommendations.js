'use client';

import Link from 'next/link';

export default function AiRecommendations({ storeId, items, loading, error }) {
  if (loading) {
    return (
      <section className="mt-16">
        <h2 className="font-sans text-3xl">Similar products</h2>
        <p className="mt-4 text-sm text-brand-muted">Finding similar items…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-16">
        <h2 className="font-sans text-3xl">Similar products</h2>
        <p className="mt-4 text-sm text-brand-warning">
          AI suggestions unavailable. ({error})
        </p>
      </section>
    );
  }

  if (!items?.length) return null;

  return (
    <section className="mt-16">
      <p className="text-[11px] uppercase tracking-[0.2em] text-brand-muted-light">AI picks</p>
      <h2 className="mt-2 font-sans text-3xl">Similar products</h2>
      <ul className="mt-6 space-y-3">
        {items.map((item) => {
          const href =
            storeId && item.product_id
              ? `/store/${storeId}/product/${item.product_id}`
              : '';
          const row = (
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-brand-bg px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-brand-text">{item.name}</p>
                <p className="mt-1 text-xs text-brand-muted">
                  {item.category || 'Grocery'}
                  {typeof item.score === 'number' ? ` · score ${item.score}` : ''}
                </p>
              </div>
              {href ? <span className="text-xs font-bold text-brand">View</span> : null}
            </div>
          );
          return (
            <li key={item.product_id || item.name}>
              {href ? <Link href={href}>{row}</Link> : row}
            </li>
          );
        })}
      </ul>
    </section>
  );
}