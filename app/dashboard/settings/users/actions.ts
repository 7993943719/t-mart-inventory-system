"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addNewUser(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const fullName = String(formData.get("full_name") || "");
  const phone = String(formData.get("phone") || "");
  const role = String(formData.get("role") || "STOCK_KEEPER");

  const supabase = await createClient();

  // Create user using Supabase Auth admin or signUp
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  // Also ensure profile record exists
  if (data.user) {
    await supabase.from("profiles").upsert([
      {
        id: data.user.id,
        full_name: fullName,
        phone,
        role,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
    ]);
  }

  revalidatePath("/dashboard/settings/users");
  return { success: true };
}
