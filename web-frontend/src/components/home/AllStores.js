import SectionHead from '@/components/home/SectionHead';
import StoreCard from '@/components/home/StoreCard';

export default function AllStores({ stores }) {
  if (!stores?.length) return null;

  return (
    <section>
      <SectionHead
        eyebrow="All stores"
        title="Every dark store"
        subtitle="Sorted by distance from your location, with the address on each card."
      />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {stores.map((store) => (
          <StoreCard key={store.id} store={store} showLocation />
        ))}
      </div>
    </section>
  );
}
