'use client';

import Link from 'next/link';

export default function AiSearchResults({ query, results, loading, error, storeId }) {
  if (!query) return null;

  return (
    <section className="mt-10 rounded-[28px] border border-[#e4ddd4] bg-white p-6">
      <p className="text-[11px] uppercase tracking-[0.2em] text-[#8a837b]">AI search</p>
      <h2 className="mt-2 font-serif text-3xl text-[#161616]">
        Matches for “{query}”
      </h2>

      {loading && (
        <p className="mt-4 text-sm text-[#6f6a64]">Finding similar products…</p>
      )}

      {error && (
        <p className="mt-4 text-sm text-[#8a5a12]">
          AI search unavailable. Showing normal store results below. ({error})
        </p>
      )}

      {!loading && !error && results.length === 0 && (
        <p className="mt-4 text-sm text-[#6f6a64]">No semantic matches found.</p>
      )}

      {!loading && results.length > 0 && (
        <ul className="mt-6 space-y-3">
          {results.map((item) => {
            const href =
              storeId && item.product_id
                ? `/store/${storeId}/product/${item.product_id}`
                : '';
            const row = (
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#f6f3ee] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[#161616]">{item.name}</p>
                  <p className="mt-1 text-xs text-[#6f6a64]">
                    {item.category || 'Grocery'}
                    {typeof item.score === 'number' ? ` · score ${item.score}` : ''}
                  </p>
                </div>
                {href ? (
                  <span className="text-xs font-bold text-[#0c831f]">View</span>
                ) : null}
              </div>
            );

            return (
              <li key={item.product_id || item.name}>
                {href ? <Link href={href}>{row}</Link> : row}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}