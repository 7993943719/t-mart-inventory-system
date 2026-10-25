"use server";

import { createClient } from "@/lib/supabase/server";
import { enforceModulePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function deleteProductAction(input: {
  businessId: string;
  productId: string;
}) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please log in again.");
  }

  await enforceModulePermission(supabase, user.id, input.businessId, "inventory");

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", input.productId)
    .eq("business_id", input.businessId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/products");
  return { success: true, message: "Product deleted successfully." };
}

export async function createCategoryAction(input: {
  businessId: string;
  name: string;
}) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please log in again.");
  }

  await enforceModulePermission(supabase, user.id, input.businessId, "inventory");

  const name = String(input.name || "").trim();
  if (!name) {
    throw new Error("Category name is required.");
  }

  // Check case-insensitive duplicate within business
  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("business_id", input.businessId)
    .ilike("name", name)
    .maybeSingle();

  if (existing) {
    throw new Error(`Category "${name}" already exists.`);
  }

  const { data, error } = await supabase
    .from("categories")
    .insert([{ business_id: input.businessId, name, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/products");
  return { success: true, message: "Category created successfully.", category: data };
}

export async function updateCategoryAction(input: {
  businessId: string;
  categoryId: string;
  name: string;
}) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please log in again.");
  }

  await enforceModulePermission(supabase, user.id, input.businessId, "inventory");

  const name = String(input.name || "").trim();
  if (!name) {
    throw new Error("Category name is required.");
  }

  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("business_id", input.businessId)
    .ilike("name", name)
    .neq("id", input.categoryId)
    .maybeSingle();

  if (existing) {
    throw new Error(`Category "${name}" already exists.`);
  }

  const { data: oldCat } = await supabase
    .from("categories")
    .select("name")
    .eq("id", input.categoryId)
    .single();

  const { error } = await supabase
    .from("categories")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", input.categoryId)
    .eq("business_id", input.businessId);

  if (error) throw new Error(error.message);

  if (oldCat?.name) {
    await supabase
      .from("products")
      .update({ category: name, updated_at: new Date().toISOString() })
      .eq("category_id", input.categoryId)
      .eq("business_id", input.businessId);
  }

  revalidatePath("/dashboard/products");
  return { success: true, message: "Category renamed successfully." };
}

export async function deleteCategoryAction(input: {
  businessId: string;
  categoryId: string;
}) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please log in again.");
  }

  await enforceModulePermission(supabase, user.id, input.businessId, "inventory");

  const { data: productsRef } = await supabase
    .from("products")
    .select("id")
    .eq("category_id", input.categoryId)
    .limit(1);

  if (productsRef && productsRef.length > 0) {
    throw new Error("Cannot delete category while products are assigned to it. Please reassign those products first.");
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", input.categoryId)
    .eq("business_id", input.businessId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/products");
  return { success: true, message: "Category deleted successfully." };
}
