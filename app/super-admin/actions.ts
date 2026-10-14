"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function superAdminLogin(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(`/super-admin/login?error=${encodeURIComponent("Email and password are required.")}`);
  }

  // 1. Authenticate user via Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data?.user) {
    redirect(`/super-admin/login?error=${encodeURIComponent(error?.message || "Invalid credentials.")}`);
  }

  // 2. Fail-closed server-side verification strictly via database-backed public.is_super_admin RPC
  const { data: isSuper, error: rpcError } = await supabase.rpc("is_super_admin", {
    p_user_id: data.user.id,
  });

  if (rpcError || !isSuper) {
    // Sign out unauthorized session from Super Owner login
    await supabase.auth.signOut();
    redirect(`/super-admin/login?error=${encodeURIComponent("Access Denied: Your account is not authorized as a Super Owner.")}`);
  }

  // 3. Authorized Super Owner -> revalidate and redirect to /super-admin
  revalidatePath("/", "layout");
  redirect("/super-admin");
}

export async function superAdminLogout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/super-admin/login");
}
