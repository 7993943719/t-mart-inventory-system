"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
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

export async function saveProductAction(input: {
  id?: string;
  businessId: string;
  name: string;
  barcode: string;
  category: string;
  categoryId?: string | null;
  purchasePrice?: number;
  sellingPrice: number;
  mrp?: number;
  stockQuantity?: number;
  minimumStock?: number;
  unit: string;
  trackExpiry?: boolean;
  openingBatchNumber?: string;
  openingExpiryDate?: string;
}) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please log in again.");
  }

  await enforceModulePermission(supabase, user.id, input.businessId, "inventory");

  // Check if caller is Owner or Admin for purchase_price write authority
  const { data: member } = await supabase
    .from("business_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("business_id", input.businessId)
    .maybeSingle();

  const role = (member?.role || "").toLowerCase();
  const isOwnerOrAdmin = role === "owner" || role === "admin";

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const client = (isOwnerOrAdmin && serviceRoleKey && supabaseUrl)
    ? createAdminClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    : supabase;

  const payload: any = {
    name: input.name.trim(),
    barcode: input.barcode.trim(),
    category: input.category.trim(),
    category_id: input.categoryId || null,
    selling_price: Number(input.sellingPrice) || 0,
    mrp: Number(input.mrp || input.sellingPrice) || 0,
    stock_quantity: Number(input.stockQuantity) || 0,
    minimum_stock: Number(input.minimumStock) || 10,
    unit: input.unit.trim(),
    business_id: input.businessId,
    track_expiry: Boolean(input.trackExpiry),
    updated_at: new Date().toISOString(),
  };

  // Include purchase_price only when caller is verified Owner or Admin
  if (isOwnerOrAdmin && input.purchasePrice !== undefined) {
    payload.purchase_price = Number(input.purchasePrice) || 0;
  }

  let savedProductId = input.id;

  if (input.id) {
    const { error } = await client
      .from("products")
      .update(payload)
      .eq("id", input.id);
    if (error) throw new Error(error.message);
  } else {
    const { data: newProd, error } = await client
      .from("products")
      .insert([{ ...payload, created_at: new Date().toISOString() }])
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    if (newProd) savedProductId = newProd.id;
  }

  // If trackExpiry is enabled and opening batch details provided, create opening stock batch
  if (Boolean(input.trackExpiry) && savedProductId && input.openingBatchNumber && input.openingExpiryDate) {
    try {
      await supabase.rpc("create_opening_stock_batch", {
        p_business_id: input.businessId,
        p_product_id: savedProductId,
        p_batch_number: input.openingBatchNumber.trim(),
        p_expiry_date: input.openingExpiryDate,
        p_quantity: Number(input.stockQuantity) || 0,
      });
    } catch (batchErr) {
      console.error("Error creating opening stock batch:", batchErr);
    }
  }

  revalidatePath("/dashboard/products");
  return { success: true, message: "Product saved successfully." };
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
  const { data: existing, error: checkErr } = await supabase
    .from("categories")
    .select("id")
    .eq("business_id", input.businessId)
    .ilike("name", name)
    .maybeSingle();

  if (checkErr) {
    if (checkErr.code === "42P01" || checkErr.message?.includes("does not exist")) {
      throw new Error("Categories table is not yet set up in database. Please apply Migration 025.");
    }
    throw new Error(checkErr.message);
  }

  if (existing) {
    throw new Error(`Category "${name}" already exists.`);
  }

  const { data, error } = await supabase
    .from("categories")
    .insert([{ business_id: input.businessId, name, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
    .select()
    .single();

  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      throw new Error("Categories table is not yet set up in database. Please apply Migration 025.");
    }
    throw new Error(error.message);
  }

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

  const { data: existing, error: checkErr } = await supabase
    .from("categories")
    .select("id")
    .eq("business_id", input.businessId)
    .ilike("name", name)
    .neq("id", input.categoryId)
    .maybeSingle();

  if (checkErr) {
    if (checkErr.code === "42P01" || checkErr.message?.includes("does not exist")) {
      throw new Error("Categories table is not yet set up in database. Please apply Migration 025.");
    }
    throw new Error(checkErr.message);
  }

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

  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      throw new Error("Categories table is not yet set up in database. Please apply Migration 025.");
    }
    throw new Error(error.message);
  }

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

  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      throw new Error("Categories table is not yet set up in database. Please apply Migration 025.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/products");
  return { success: true, message: "Category deleted successfully." };
}
