"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createBusiness(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    redirect(
      `/dashboard/create-business?error=${encodeURIComponent(
        "Business name is required."
      )}`
    );
  }

  // Use the same atomic RPC as the main business-creation page.
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "create_business_with_trial",
    {
      p_business_name: name,
      p_business_type: "Supermarket",
      p_billing_cycle: "monthly",
    }
  );

  if (rpcError || !rpcData || !rpcData.success) {
    console.error("create_business_with_trial failed:", rpcError);

    const errorMessage =
      rpcError?.message ||
      rpcData?.error ||
      "Failed to create business and trial subscription.";

    redirect(
      `/dashboard/create-business?error=${encodeURIComponent(errorMessage)}`
    );
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");

  redirect("/dashboard?success=business_created");
}
