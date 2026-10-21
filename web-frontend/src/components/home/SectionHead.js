import Link from 'next/link';

export default function SectionHead({ eyebrow, title, subtitle, href }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#8a837b]">{eyebrow}</p>
        )}
        <h2 className="mt-2 font-serif text-3xl text-[#161616] md:text-4xl">{title}</h2>
        {subtitle && <p className="mt-2 max-w-xl text-sm text-[#6f6a64]">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="shrink-0 text-sm font-medium text-[#161616]">
          View all →
        </Link>
      )}
    </div>
  );
}
