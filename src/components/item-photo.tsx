/**
 * A product photo, shown straight from the vendor's site. A plain <img> on
 * purpose: the photos live on hundreds of vendor domains, so they can't go
 * through the image optimizer's allow-list.
 */
export function ItemPhoto({
  src,
  alt = "",
  className = "",
  loading = "lazy",
}: {
  src: string | null;
  alt?: string;
  className?: string;
  /** "eager" on anything meant to be printed: a photo that hasn't loaded yet prints as a blank box. */
  loading?: "lazy" | "eager";
}) {
  if (!src) return <div aria-hidden className={`rounded-[var(--radius-sm)] bg-wash ${className}`} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading={loading} referrerPolicy="no-referrer" className={`rounded-[var(--radius-sm)] bg-wash object-cover ${className}`} />
  );
}
