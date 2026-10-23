'use client';

import Link from 'next/link';
import Carousel from '@/components/home/Carousel';
import SectionHead from '@/components/home/SectionHead';

export default function CategoryRail({ categories, activeSlug, counts = {} }) {
  if (!categories?.length) return null;

  return (
    <section>
      <SectionHead
        eyebrow="Collections"
        title="Shop by category"
        subtitle="Fresh aisles from the store delivering to you."
      />
      <Carousel label="categories">
        {activeSlug && (
          <Link href="/" className="block w-[82%] shrink-0 snap-start sm:w-[48%] lg:w-auto lg:min-w-[280px] lg:shrink lg:grow lg:basis-0">
            <div className="grid h-44 place-items-center rounded-[24px] bg-brand-text text-white sm:h-48 md:h-52">
              <span className="font-sans text-3xl">All</span>
            </div>
            <p className="mt-4 text-sm font-medium">Browse everything →</p>
          </Link>
        )}
        {categories.map((category) => {
          const active = activeSlug === category.slug;
          const count = counts[category.slug] || 0;
          return (
            <Link
              key={category.id}
              href={category.href}
              className="block w-[82%] shrink-0 snap-start sm:w-[48%] lg:w-auto lg:min-w-[280px] lg:shrink lg:grow lg:basis-0"
            >
              <div className={`h-44 overflow-hidden rounded-[24px] bg-brand-soft sm:h-48 md:h-52 ${active ? 'ring-2 ring-brand-text' : ''}`}>
                <img src={category.image} alt="" className="h-full w-full object-cover" />
              </div>
              <h3 className="mt-4 font-sans text-2xl text-brand-text">{category.name}</h3>
              <p className="mt-1 text-sm text-brand-muted">{category.description}</p>
              {count > 0 && (
                <p className="mt-2 text-xs uppercase tracking-[0.14em] text-brand-muted-light">
                  {count} {count === 1 ? 'item' : 'items'}
                </p>
              )}
              <p className="mt-3 text-sm font-medium text-brand-text">Explore →</p>
            </Link>
          );
        })}
      </Carousel>
    </section>
  );
}
