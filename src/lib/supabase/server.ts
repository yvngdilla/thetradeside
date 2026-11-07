import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { demoClient, isDemo } from "@/lib/demo/store";

type UserClient = ReturnType<typeof createServerClient>;

/** Supabase client acting as the signed-in user (RLS applies). */
export async function createUserClient(): Promise<UserClient> {
  if (isDemo()) return demoClient() as unknown as UserClient;
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl(), env.supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component; the proxy refreshes the session instead.
        }
      },
    },
  });
}

/** Service-role client. Bypasses RLS, so callers must check workspace membership first. */
export function createAdminClient() {
  if (isDemo()) return demoClient() as unknown as ReturnType<typeof createClient>;
  return createClient(env.supabaseUrl(), env.supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const BUCKET = "workspace-files";
