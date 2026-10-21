'use client';

import Link from 'next/link';
import Carousel from '@/components/home/Carousel';

export default function HeroCarousel({ banners, eyebrow }) {
  if (!banners?.length) return null;

  return (
    <Carousel autoplay gapClass="gap-0" label="banner">
      {banners.map((banner) => (
        <Link
          key={banner.id}
          href={banner.href}
          className="relative block h-[70vh] min-h-[420px] max-h-[720px] w-full shrink-0 snap-start overflow-hidden rounded-[28px]"
        >
          <img src={banner.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-black/10" />
          <div className="relative flex h-full max-w-2xl flex-col justify-end p-6 text-white md:p-12">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/75">{eyebrow}</p>
            <h2 className="mt-3 font-serif text-4xl leading-none md:text-6xl">{banner.title}</h2>
            <p className="mt-4 max-w-md text-sm text-white/85 md:text-base">{banner.subtitle}</p>
            <span className="mt-8 inline-flex w-fit rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#161616]">
              Shop now
            </span>
          </div>
        </Link>
      ))}
    </Carousel>
  );
}
