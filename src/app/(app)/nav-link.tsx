"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const path = usePathname();
  const active = href === "/" ? path === "/" || path.startsWith("/vendors") : path.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`px-3.5 py-2 rounded-full whitespace-nowrap ${active ? "bg-wash text-ink font-semibold" : "text-muted hover:text-ink"}`}
    >
      {children}
    </Link>
  );
}
