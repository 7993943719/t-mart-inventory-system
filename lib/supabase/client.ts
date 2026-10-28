import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const isDemo = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_TWEB_DEMO_MODE === "true";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "demo-key";

  const client = createBrowserClient(supabaseUrl, supabaseKey, {
    db: {
      schema: "public",
    },
  });

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
