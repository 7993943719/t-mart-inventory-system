"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: password,
  });

  console.log("LOGIN EMAIL:", email.trim());
  console.log("LOGIN ERROR:", error);
  console.log("LOGIN USER:", data?.user);
  console.log("LOGIN SESSION:", !!data?.session);

  if (error) {
    console.log("Supabase Auth Error Details:", {
      message: error.message,
      status: error.status,
      code: error.code,
    });
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password !== confirmPassword) {
    redirect(`/signup?error=${encodeURIComponent("Passwords do not match")}`);
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password: password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  console.log("SIGNUP EMAIL:", email.trim());
  console.log("SIGNUP ERROR:", error);
  console.log("SIGNUP USER:", data?.user);
  console.log("SIGNUP SESSION:", !!data?.session);

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (data?.user && !data?.session) {
    redirect("/login?message=" + encodeURIComponent("Account created! Please check your email to confirm your account before signing in."));
  }

  if (data?.session) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }

  redirect("/login?message=Account%20created%20successfully!%20Please%20log%20in.");
}

export async function forgotPassword(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback?next=/dashboard`,
  });

  if (error) {
    redirect(`/login/forgot-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/login/forgot-password?message=Password%20reset%20link%20sent%20to%20your%20email");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
