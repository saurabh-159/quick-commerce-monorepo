'use client';

import Link from 'next/link';
import Carousel from '@/components/home/Carousel';
import SectionHead from '@/components/home/SectionHead';

function AllTile() {
  return (
    <Link href="/" className="block">
      <div className="grid aspect-[4/3] place-items-center rounded-[18px] bg-brand-text text-white md:aspect-auto md:h-52 md:rounded-[24px]">
        <span className="font-sans text-2xl md:text-3xl">All</span>
      </div>
      <p className="mt-2.5 text-xs font-medium md:mt-4 md:text-sm">Browse everything →</p>
    </Link>
  );
}

function CategoryTile({ category, active, count, className = '' }) {
  return (
    <Link href={category.href} className={`block ${className}`}>
      <div
        className={`aspect-[4/3] overflow-hidden rounded-[18px] bg-brand-soft md:aspect-auto md:h-52 md:rounded-[24px] ${
          active ? 'ring-2 ring-brand-text' : ''
        }`}
      >
        <img src={category.image} alt="" className="h-full w-full object-cover" />
      </div>
      <h3 className="mt-2.5 font-sans text-base text-brand-text md:mt-4 md:text-2xl">{category.name}</h3>
      <p className="mt-1 line-clamp-2 text-xs text-brand-muted md:text-sm">{category.description}</p>
      {count > 0 && (
        <p className="mt-1.5 text-[10px] uppercase tracking-[0.14em] text-brand-muted-light md:mt-2 md:text-xs">
          {count} {count === 1 ? 'item' : 'items'}
        </p>
      )}
      <p className="mt-2 text-xs font-medium text-brand-text md:mt-3 md:text-sm">Explore →</p>
    </Link>
  );
}

export default function CategoryRail({ categories, activeSlug, counts = {} }) {
  if (!categories?.length) return null;

  return (
    <section>
      <SectionHead
        eyebrow="Collections"
        title="Shop by category"
        subtitle="Fresh aisles from the store delivering to you."
      />

      {/* Mobile: compact 2-col grid */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        {activeSlug ? <AllTile /> : null}
        {categories.map((category) => (
          <CategoryTile
            key={category.id}
            category={category}
            active={activeSlug === category.slug}
            count={counts[category.slug] || 0}
          />
        ))}
      </div>

      {/* Desktop: keep carousel UI */}
      <div className="hidden md:block">
        <Carousel label="categories">
          {activeSlug ? (
            <div className="w-auto min-w-[280px] shrink grow basis-0">
              <AllTile />
            </div>
          ) : null}
          {categories.map((category) => (
            <CategoryTile
              key={category.id}
              category={category}
              active={activeSlug === category.slug}
              count={counts[category.slug] || 0}
              className="w-auto min-w-[280px] shrink grow basis-0"
            />
          ))}
        </Carousel>
      </div>
    </section>
  );
}
