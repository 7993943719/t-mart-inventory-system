"use client";

import React, { useEffect, useState } from "react";
import { SharedDashboardLayout } from "@/components/layout/SharedDashboardLayout";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/lib/types";
import { AddProductModal } from "@/components/dashboard/AddProductModal";
import { createCategoryAction, updateCategoryAction, deleteCategoryAction } from "./actions";

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

  // Manage Categories Modal State
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [submittingCat, setSubmittingCat] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [businessName, setBusinessName] = useState("Perikapally");
  const [userName, setUserName] = useState("Admin");
  const [role, setRole] = useState("OWNER");

  const isOwnerOrAdmin = ["OWNER", "ADMIN"].includes((role || "").toUpperCase().trim());

  const loadCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: memberships } = await supabase
        .from("business_members")
        .select("business_id")
        .eq("user_id", user.id);
      if (memberships && memberships.length > 0) {
        const bizId = memberships[0].business_id;
        setBusinessId(bizId);
        const { data: cats } = await supabase
          .from("categories")
          .select("*")
          .eq("business_id", bizId)
          .order("name", { ascending: true });
        if (cats) setCategoriesList(cats);
      }
    } catch (err) {
      console.error("Error loading categories:", err);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberships } = await supabase
        .from("business_members")
        .select("*, businesses(*)")
        .eq("user_id", user.id);

      let bizId = memberships[0]?.business_id || user.id;
      if (memberships && memberships.length > 0) {
        const mem = memberships[0];
        const biz = mem.businesses;
        setBusinessName(biz?.name || "Perikapally");
        setRole(mem.role || "OWNER");
        bizId = mem.business_id;
        setBusinessId(bizId);
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (prof?.full_name) setUserName(prof.full_name);

      const { data, error } = await supabase.rpc("get_business_products", {
        p_business_id: bizId,
      });

      if (error) {
        console.error("Error fetching products via RPC:", error);
        setErrorMsg(error.message);
      } else {
        setProducts((data || []) as unknown as Product[]);
      }

      await loadCategories();
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

  const categories = Array.from(new Set([...categoriesList.map(c => c.name), ...products.map((p) => p.category).filter(Boolean)]));

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

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim() || !businessId) return;
    setSubmittingCat(true);
    setErrorMsg("");
    try {
      const res = await createCategoryAction({ businessId, name: newCategoryName.trim() });
      if (res && res.success) {
        setSuccessMsg(res.message);
        setNewCategoryName("");
        await loadCategories();
        await loadProducts();
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create category");
    } finally {
      setSubmittingCat(false);
    }
  };

  const handleSaveRenameCategory = async (catId: string) => {
    if (!editCategoryName.trim() || !businessId) return;
    setErrorMsg("");
    try {
      const res = await updateCategoryAction({ businessId, categoryId: catId, name: editCategoryName.trim() });
      if (res && res.success) {
        setSuccessMsg(res.message);
        setEditingCategory(null);
        await loadCategories();
        await loadProducts();
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to rename category");
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!businessId) return;
    if (!confirm("Are you sure you want to delete this category?")) return;
    setErrorMsg("");
    try {
      const res = await deleteCategoryAction({ businessId, categoryId: catId });
      if (res && res.success) {
        setSuccessMsg(res.message);
        await loadCategories();
        await loadProducts();
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete category");
    }
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#172033", margin: 0 }}>Products</h2>
          <p style={{ fontSize: "13px", color: "#8791a5", marginTop: "4px", margin: 0 }}>Manage your products and inventory.</p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => {
              loadCategories();
              setManageCategoriesOpen(true);
            }}
            style={{
              height: "44px",
              padding: "0 16px",
              borderRadius: "10px",
              border: "1px solid #CBD5E1",
              background: "#FFFFFF",
              color: "#334155",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Manage Categories
          </button>
          <button
            type="button"
            onClick={() => setShowAddProduct(true)}
            style={buttonStyles.primary}
          >
            + Add Product
          </button>
        </div>
      </div>

      {errorMsg && !showAddProduct && !manageCategoriesOpen && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold mb-4">
          {errorMsg}
        </div>
      )}

      {successMsg && !showAddProduct && !manageCategoriesOpen && (
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
                  {isOwnerOrAdmin && <th className="p-4">Purchase Price</th>}
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
                      {isOwnerOrAdmin && <td className="p-4 text-slate-600">₹{p.purchase_price}</td>}
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

      {/* ADD/EDIT PRODUCT MODAL */}
      {showAddProduct && (
        <AddProductModal
          onClose={() => {
            setShowAddProduct(false);
            setEditingProduct(null);
          }}
          onSuccess={() => {
            loadProducts();
            setSuccessMsg("Product saved successfully!");
            setTimeout(() => setSuccessMsg(""), 4000);
          }}
          initialProduct={editingProduct}
        />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmOpen && productToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <h3 className="text-base font-black text-slate-900">Delete Product</h3>
            <p className="text-slate-600">
              Are you sure you want to delete <strong className="text-slate-900">{productToDelete.name}</strong>? This action cannot be undone.
            </p>
            {errorMsg && <div className="p-3 bg-rose-50 text-rose-700 rounded-xl font-bold">{errorMsg}</div>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setProductToDelete(null);
                }}
                className="px-4 py-2 border rounded-xl font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE CATEGORIES MODAL */}
      {manageCategoriesOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-[calc(100%-24px)] p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black text-slate-900">Manage Categories</h3>
              <button onClick={() => setManageCategoriesOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1">✕</button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl font-bold">{errorMsg}</div>
            )}
            {successMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold">{successMsg}</div>
            )}

            {/* Add new category form */}
            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">New Category Name *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Enter category name..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 h-11 border border-slate-300 rounded-xl px-3 text-xs font-semibold outline-none focus:border-blue-600 bg-white"
                  />
                  <button
                    type="submit"
                    disabled={submittingCat}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            </form>

            <div className="space-y-2 pt-2 border-t">
              <h4 className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">Existing Categories ({categoriesList.length})</h4>
              {categoriesList.length === 0 ? (
                <p className="text-slate-400 text-xs py-4 text-center">No categories created yet.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {categoriesList.map((cat) => (
                    <div key={cat.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                      {editingCategory?.id === cat.id ? (
                        <div className="flex items-center gap-2 flex-1 mr-2">
                          <input
                            type="text"
                            value={editCategoryName}
                            onChange={(e) => setEditCategoryName(e.target.value)}
                            className="flex-1 h-9 border border-blue-400 rounded-lg px-2 text-xs font-semibold outline-none bg-white text-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRenameCategory(cat.id)}
                            className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-lg text-[11px] cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCategory(null)}
                            className="px-2.5 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-bold text-slate-900">{cat.name}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategory(cat);
                                setEditCategoryName(cat.name);
                              }}
                              className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-lg text-[11px] cursor-pointer"
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold rounded-lg text-[11px] cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </SharedDashboardLayout>
  );
}

function getStatusStyle(qty: number, min: number) {
  if (qty <= 0) {
    return { background: "#FEF2F2", color: "#DC2626" };
  }
  if (qty <= min) {
    return { background: "#FFFBEB", color: "#D97706" };
  }
  return { background: "#ECFDF5", color: "#059669" };
}

const buttonStyles = {
  primary: {
    background: "#2563EB",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "10px",
    padding: "0 16px",
    height: "44px",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer",
  },
  addStock: {
    background: "#EFF6FF",
    color: "#2563EB",
    border: "none",
    borderRadius: "8px",
    padding: "6px 10px",
    fontWeight: 700,
    fontSize: "11px",
    cursor: "pointer",
  },
  edit: {
    background: "#F1F5F9",
    color: "#475569",
    border: "none",
    borderRadius: "8px",
    padding: "6px 10px",
    fontWeight: "700",
    fontSize: "11px",
    cursor: "pointer",
  },
  delete: {
    background: "#FFF1F2",
    color: "#E11D48",
    border: "none",
    borderRadius: "8px",
    padding: "6px 10px",
    fontWeight: 700,
    fontSize: "11px",
    cursor: "pointer",
  },
};
