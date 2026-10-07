"use client";

import React, { useEffect, useState } from "react";
import { SharedDashboardLayout } from "@/components/layout/SharedDashboardLayout";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/lib/types";
import { AddProductModal } from "@/components/dashboard/AddProductModal";

export default function ProductsPage() {
  const [supabase] = useState(() => createClient());
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");

  // Single Add Product State as requested
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [businessName, setBusinessName] = useState("Perikapally");
  const [userName, setUserName] = useState("Admin");
  const [role, setRole] = useState("OWNER");

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberships } = await supabase
        .from("business_members")
        .select("*, businesses(*)")
        .eq("user_id", user.id);

      if (memberships && memberships.length > 0) {
        setBusinessName(memberships[0].businesses?.name || "Perikapally");
        setRole(memberships[0].role || "OWNER");
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (prof?.full_name) setUserName(prof.full_name);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching products:", error);
        setErrorMsg(error.message);
      } else {
        setProducts(data || []);
      }
    } catch (err: any) {
      console.error("Failed to load products", err);
      setErrorMsg(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [supabase]);

  const totalProducts = products.length;
  const inStockCount = products.filter((p) => Number(p.stock_quantity || 0) > Number(p.minimum_stock || 10)).length;
  const lowStockCount = products.filter((p) => Number(p.stock_quantity || 0) > 0 && Number(p.stock_quantity || 0) <= Number(p.minimum_stock || 10)).length;

  const categories = Array.from(new Set(products.map((p) => p.category)));

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode || "").includes(search.toLowerCase());
    const matchesCat = categoryFilter === "all" || p.category === categoryFilter;
    const qty = Number(p.stock_quantity || 0);
    const min = Number(p.minimum_stock || 10);
    const isOut = qty === 0;
    const isLow = qty > 0 && qty <= min;

    let matchesStatus = true;
    if (stockFilter === "in_stock") matchesStatus = !isOut && !isLow;
    if (stockFilter === "low_stock") matchesStatus = isLow;
    if (stockFilter === "out_of_stock") matchesStatus = isOut;

    return matchesSearch && matchesCat && matchesStatus;
  });

  const openAddProduct = () => {
    setEditingProduct(null);
    setShowAddProduct(true);
  };

  const handleEdit = (p: Product) => {
    setEditingProduct(p);
    setShowAddProduct(true);
  };

  const handleDelete = (id: string) => {
    const target = products.find((p) => p.id === id);
    if (target) {
      setProductToDelete(target);
      setDeleteConfirmOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { data: saleRefs } = await supabase
        .from("sale_items")
        .select("id")
        .eq("product_id", productToDelete.id)
        .limit(1);

      const { data: stockRefs } = await supabase
        .from("stock_movements")
        .select("id")
        .eq("product_id", productToDelete.id)
        .limit(1);

      if ((saleRefs && saleRefs.length > 0) || (stockRefs && stockRefs.length > 0)) {
        setErrorMsg("This product is used in existing records and cannot be deleted. You can disable it instead.");
        setDeleteConfirmOpen(false);
        setProductToDelete(null);
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productToDelete.id);

      if (error) throw new Error(error.message);

      setSuccessMsg("Product deleted successfully");
      setDeleteConfirmOpen(false);
      setProductToDelete(null);
      loadProducts();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete product");
    } finally {
      setLoading(false);
    }
  };

  const openAddStock = (product: Product) => {
    handleEdit(product);
  };

  return (
    <SharedDashboardLayout
      businessName={businessName}
      userName={userName}
      role={role}
      pageTitle="Products"
      onAddProduct={openAddProduct}
    >
      {/* PAGE HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#172033", margin: 0 }}>Products</h2>
          <p style={{ fontSize: "13px", color: "#8791a5", marginTop: "4px", margin: 0 }}>Manage your products and inventory.</p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddProduct(true)}
          style={buttonStyles.primary}
        >
          + Add Product
        </button>
      </div>

      {errorMsg && !showAddProduct && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold mb-4">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold mb-4">
          {successMsg}
        </div>
      )}

      {/* PRODUCT SUMMARY (3 small cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Products</p>
          <h3 className="text-2xl font-black text-slate-900">{totalProducts}</h3>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">In Stock</p>
          <h3 className="text-2xl font-black text-emerald-600">{inStockCount + lowStockCount}</h3>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Low Stock</p>
          <h3 className="text-2xl font-black text-amber-600">{lowStockCount}</h3>
        </div>
      </div>

      {/* SEARCH / FILTER BAR */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-5 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <input
          type="text"
          placeholder="🔍 Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full flex-1 h-11 border border-slate-300 rounded-xl px-4 text-xs font-semibold outline-none focus:border-blue-600 bg-white"
        />

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-auto h-11 px-3.5 border border-slate-300 rounded-xl bg-white font-semibold text-xs text-slate-700 outline-none cursor-pointer"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value)}
          className="w-full sm:w-auto h-11 px-3.5 border border-slate-300 rounded-xl bg-white font-semibold text-xs text-slate-700 outline-none cursor-pointer"
        >
          <option value="all">All Stock</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
      </div>

      {/* PRODUCT TABLE / EMPTY STATE */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading products...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center space-y-3 shadow-xs">
          <div className="text-4xl">📦</div>
          <h3 className="text-sm font-bold text-slate-800">No products yet</h3>
          <p className="text-xs text-slate-400">Add your first product to start managing your inventory.</p>
          <button
            type="button"
            onClick={() => setShowAddProduct(true)}
            style={buttonStyles.primary}
          >
            + Add Product
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-extrabold text-slate-900 text-base">Products List</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="p-4">Product</th>
                  <th className="p-4">SKU</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Purchase Price</th>
                  <th className="p-4">Selling Price</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const qty = Number(p.stock_quantity || 0);
                  const min = Number(p.minimum_stock || 10);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-4 font-bold text-slate-900">{p.name}</td>
                      <td className="p-4 font-mono text-[11px] text-slate-500">{p.barcode}</td>
                      <td className="p-4">{p.category}</td>
                      <td className="p-4 text-slate-600">₹{p.purchase_price}</td>
                      <td className="p-4 font-bold text-emerald-600">₹{p.selling_price}</td>
                      <td className="p-4 font-black">{qty} {p.unit}</td>
                      <td className="p-4">
                        <span
                          style={{
                            ...getStatusStyle(qty, min),
                            padding: "5px 10px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: 700,
                          }}
                        >
                          {qty <= 0
                            ? "Out of Stock"
                            : qty <= min
                            ? "Low Stock"
                            : "In Stock"}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => openAddStock(p)}
                          style={buttonStyles.addStock}
                        >
                          ＋ Add Stock
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(p)}
                          style={buttonStyles.edit}
                        >
                          ✎ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          style={buttonStyles.delete}
                        >
                          🗑 Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ONE SHARED MODAL RENDERED AT END */}
      {showAddProduct && (
        <AddProductModal
          onClose={() => {
            setShowAddProduct(false);
            setEditingProduct(null);
          }}
          onSuccess={loadProducts}
          initialProduct={editingProduct}
        />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmOpen && productToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 text-center">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              🗑
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">Delete this product?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete <strong className="text-slate-800">{productToDelete.name}</strong>? This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                style={buttonStyles.secondary}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                style={buttonStyles.delete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </SharedDashboardLayout>
  );
}

const buttonStyles = {
  primary: {
    background: "#2563EB",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "10px",
    padding: "11px 18px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 10px rgba(37,99,235,0.20)",
  },

  secondary: {
    background: "#EFF6FF",
    color: "#2563EB",
    border: "1px solid #BFDBFE",
    borderRadius: "9px",
    padding: "8px 14px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },

  edit: {
    background: "#EFF6FF",
    color: "#2563EB",
    border: "1px solid #BFDBFE",
    borderRadius: "8px",
    padding: "7px 13px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },

  delete: {
    background: "#FEF2F2",
    color: "#DC2626",
    border: "1px solid #FECACA",
    borderRadius: "8px",
    padding: "7px 13px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },

  addStock: {
    background: "#16A34A",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "8px",
    padding: "7px 13px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
};

const getStatusStyle = (stock: number, minimumStock: number) => {
  if (stock <= 0) {
    return {
      background: "#FEF2F2",
      color: "#DC2626",
    };
  }

  if (stock <= minimumStock) {
    return {
      background: "#FFF7ED",
      color: "#EA580C",
    };
  }

  return {
    background: "#F0FDF4",
    color: "#16A34A",
  };
};
