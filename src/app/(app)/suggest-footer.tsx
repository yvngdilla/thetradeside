"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Invites a feature suggestion from every signed-in page except the suggestion page itself. */
export function SuggestFooter() {
  if (usePathname() === "/suggest") return null;
  return (
    <footer className="mx-auto max-w-[960px] px-4 sm:px-8 pb-10">
      <p className="border-t border-rule pt-6 text-sm text-muted">
        Is there another chore Trade Side could take off your plate?{" "}
        <Link href="/suggest" className="link">
          Suggest a feature
        </Link>
      </p>
    </footer>
  );
}
