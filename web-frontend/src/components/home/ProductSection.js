'use client';

import ProductCard from '@/components/ProductCard';
import SectionHead from '@/components/home/SectionHead';

function columnClass(count) {
  if (count <= 1) return '';
  if (count === 2) return 'sm:grid-cols-2';
  if (count === 3) return 'sm:grid-cols-2 xl:grid-cols-3';
  if (count === 4) return 'sm:grid-cols-2 lg:grid-cols-4';
  return 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5';
}

export default function ProductSection({ section, store, eyebrow = 'Handpicked', categoryBase = '' }) {
  const products = section?.products || [];
  if (!products.length) return null;

  const wide = products.length === 1;

  return (
    <section>
      <SectionHead
        eyebrow={eyebrow}
        title={section.title}
        subtitle={section.subtitle}
        href={section.categorySlug ? `${categoryBase || '/'}?category=${section.categorySlug}` : ''}
      />
      <div className={wide ? '' : `grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 ${columnClass(products.length)}`}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            storeId={store?.id}
            storeName={store?.name}
            layout={wide ? 'wide' : 'card'}
          />
        ))}
      </div>
    </section>
  );
}
