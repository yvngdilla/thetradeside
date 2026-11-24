/**
 * A product photo, shown straight from the vendor's site. A plain <img> on
 * purpose: the photos live on hundreds of vendor domains, so they can't go
 * through the image optimizer's allow-list.
 */
export function ItemPhoto({ src, alt = "", className = "" }: { src: string | null; alt?: string; className?: string }) {
  if (!src) return <div aria-hidden className={`rounded-[var(--radius-sm)] bg-plaster ${className}`} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" className={`rounded-[var(--radius-sm)] bg-plaster object-cover ${className}`} />
  );
}
