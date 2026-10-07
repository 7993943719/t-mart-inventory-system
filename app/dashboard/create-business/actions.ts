"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createBusiness(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    redirect(`/dashboard/create-business?error=${encodeURIComponent("Business name is required.")}`);
  }

  // Attempt using existing Supabase RPC function public.create_business(p_business_name)
  const { data: rpcData, error: rpcError } = await supabase.rpc("create_business", {
    p_business_name: name,
  });

  if (rpcError) {
    console.error("RPC create_business error, falling back to direct insert:", rpcError);

    // Fallback direct insert
    const { data: biz, error: bizError } = await supabase
      .from("businesses")
      .insert([
        {
          name,
          business_type: "Supermarket",
          country: "India",
          owner_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (bizError || !biz) {
      redirect(`/dashboard/create-business?error=${encodeURIComponent(bizError?.message || "Failed to create business")}`);
    }

    await supabase.from("business_members").insert([
      {
        business_id: biz.id,
        user_id: user.id,
        role: "OWNER",
        created_at: new Date().toISOString(),
      },
    ]);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
