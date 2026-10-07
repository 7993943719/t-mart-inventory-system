import { createClient } from "./client";
import { Product } from "../types";

export async function getProducts(): Promise<Product[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let businessId = user?.id;
  if (user) {
    const { data: memberships } = await supabase
      .from("business_members")
      .select("*, businesses(*)")
      .eq("user_id", user.id);
    if (memberships && memberships.length > 0) {
      businessId = memberships[0].businesses?.id || user.id;
    }
  }

  let query = supabase.from("products").select("*").order("name", { ascending: true });

  if (businessId) {
    query = query.eq("business_id", businessId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching products:", error);
    return [];
  }

  return data || [];
}

export async function addProduct(product: Omit<Product, "id" | "created_at" | "updated_at">): Promise<Product | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let businessId = product.business_id || user?.id;
  if (user && !product.business_id) {
    const { data: memberships } = await supabase
      .from("business_members")
      .select("*, businesses(*)")
      .eq("user_id", user.id);
    if (memberships && memberships.length > 0) {
      businessId = memberships[0].businesses?.id || user.id;
    }
  }

  const activeBusinessId = businessId || "00000000-0000-0000-0000-000000000000";

  const { data, error } = await supabase
    .from("products")
    .insert([
      {
        ...product,
        business_id: activeBusinessId,
        purchase_price: Number(product.purchase_price) || 0,
        selling_price: Number(product.selling_price) || 0,
        mrp: Number(product.mrp) || 0,
        stock_quantity: Number(product.stock_quantity) || 0,
        minimum_stock: Number(product.minimum_stock) || 10,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error adding product:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("products")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating product:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    console.error("Error deleting product:", error);
    throw new Error(error.message);
  }

  return true;
}
