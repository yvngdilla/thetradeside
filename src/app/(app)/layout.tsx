import Link from "next/link";
import { getWorkspace } from "@/lib/workspace";
import { signOut } from "@/app/actions";
import { Wordmark } from "@/components/wordmark";
import { NavLink } from "./nav-link";
import { isDemo } from "@/lib/demo/store";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ws = await getWorkspace();
  return (
    <div className="min-h-dvh">
      {isDemo() ? (
        <p className="bg-forest-wash text-forest text-sm text-center px-4 py-2">
          Demo mode: sample firm and vendors. Nothing is saved for long, and no emails are sent.
        </p>
      ) : null}
      <header className="border-b border-rule bg-paper/95 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-[960px] px-4 sm:px-8 h-16 flex items-center gap-3 sm:gap-6">
          <Link href="/" aria-label="Trade Side, vendors" className="shrink-0">
            <Wordmark className="h-6 sm:h-7 w-auto" />
          </Link>
          <nav className="flex gap-1 text-sm">
            <NavLink href="/">Vendors</NavLink>
            <NavLink href="/settings">Settings</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-muted hidden sm:inline">{ws.teamName}</span>
            <form action={signOut}>
              <button className="text-muted hover:text-ink underline-offset-4 hover:underline whitespace-nowrap">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[960px] px-4 sm:px-8 py-8 sm:py-10">{children}</main>
    </div>
  );
}
