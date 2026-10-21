'use client';

import Carousel from '@/components/home/Carousel';
import SectionHead from '@/components/home/SectionHead';
import StoreCard from '@/components/home/StoreCard';

export default function NearbyStores({ stores }) {
  if (!stores?.length) return null;

  return (
    <section>
      <SectionHead
        eyebrow="Near you"
        title="Stores delivering now"
        subtitle="These open stores can reach your live location."
      />
      <Carousel label="nearby stores">
        {stores.map((store) => (
          <div key={store.id} className="w-[86%] shrink-0 snap-start sm:w-[48%] lg:w-[32%] xl:w-[24%]">
            <StoreCard store={store} />
          </div>
        ))}
      </Carousel>
    </section>
  );
}
