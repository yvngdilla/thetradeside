import Link from "next/link";
import { getWorkspace } from "@/lib/workspace";
import { signOut } from "@/app/actions";
import { APP_NAME } from "@/lib/brand";
import { NavLink } from "./nav-link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ws = await getWorkspace();
  return (
    <div className="min-h-dvh">
      <header className="border-b border-rule bg-paper/95 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center gap-6">
          <Link href="/" className="font-display text-xl tracking-tight">
            {APP_NAME}
          </Link>
          <nav className="flex gap-1 text-sm">
            <NavLink href="/">Vendors</NavLink>
            <NavLink href="/settings">Settings</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-muted hidden sm:inline">{ws.teamName}</span>
            <form action={signOut}>
              <button className="text-muted hover:text-ink underline-offset-4 hover:underline">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-10">{children}</main>
    </div>
  );
}
