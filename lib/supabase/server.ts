import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  const isDemo = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_TWEB_DEMO_MODE === "true";

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "demo-key",
    {
      db: {
        schema: "public",
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Cookies may be read-only in Server Components.
          }
        },
      },
    }
  );

  if (isDemo) {
    const mockUser = {
      id: "demo-user-id",
      email: "demo@tweb.local",
      user_metadata: { full_name: "Demo Admin" },
    };
    (client.auth as any).getUser = async () => ({ data: { user: mockUser }, error: null });
    (client.auth as any).getSession = async () => ({ data: { session: { user: mockUser } }, error: null });
  }

  return client;
}
