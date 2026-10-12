import { createClient } from "./client";
import { Product } from "../types";

export async function getProducts(): Promise<Product[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let activeBusinessId: string | null = null;
  const { data: memberships } = await supabase
    .from("business_members")
    .select("business_id, role, businesses(*)")
    .eq("user_id", user.id);

  if (memberships && memberships.length > 0) {
    const firstMem: any = memberships[0];
    const joinedBiz = Array.isArray(firstMem.businesses)
      ? firstMem.businesses[0]
      : firstMem.businesses;
    activeBusinessId = firstMem.business_id || joinedBiz?.id || null;
  }

  if (!activeBusinessId) return [];

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("business_id", activeBusinessId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching products:", error);
    return [];
  }

  return data || [];
}

export async function addProduct(product: Omit<Product, "id" | "created_at" | "updated_at">): Promise<Product | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required.");

  let activeBusinessId: string | null = product.business_id || null;
  if (!activeBusinessId) {
    const { data: memberships } = await supabase
      .from("business_members")
      .select("business_id, role, businesses(*)")
      .eq("user_id", user.id);

    if (memberships && memberships.length > 0) {
      const firstMem: any = memberships[0];
      const joinedBiz = Array.isArray(firstMem.businesses)
        ? firstMem.businesses[0]
        : firstMem.businesses;
      activeBusinessId = firstMem.business_id || joinedBiz?.id || null;
    }
  }

  if (!activeBusinessId) {
    throw new Error("No active business workspace found. Please select a valid business.");
  }

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
