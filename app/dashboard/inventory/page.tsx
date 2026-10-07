"use client";

import React, { useEffect, useState } from "react";
import { SharedDashboardLayout } from "@/components/layout/SharedDashboardLayout";
import { createClient } from "@/lib/supabase/client";
import { Boxes, AlertTriangle, PackageX } from "lucide-react";
import { AddProductModal } from "@/components/dashboard/AddProductModal";
import { StatCard } from "@/components/dashboard/StatCard";

export default function InventoryPage() {
  const [supabase] = useState(() => createClient());
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState("T MART");
  const [userName, setUserName] = useState("Pavan");
  const [role, setRole] = useState("OWNER");
  const [showAddProduct, setShowAddProduct] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberships } = await supabase
        .from("business_members")
        .select("*, businesses(*)")
        .eq("user_id", user.id);

      if (memberships && memberships.length > 0) {
        setBusinessName(memberships[0].businesses?.name || "T MART");
        setRole(memberships[0].role || "OWNER");
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (prof?.full_name) setUserName(prof.full_name);

      const { data } = await supabase
        .from("products")
        .select("*");

      setProducts(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [supabase]);

  const productList = products || [];
  const totalProducts = productList.length;
  const lowStock = productList.filter((p) => Number(p.stock_quantity || 0) <= Number(p.minimum_stock || 10)).length;
  const outOfStock = productList.filter((p) => Number(p.stock_quantity || 0) === 0).length;
  const stockValuation = productList.reduce((sum, p) => sum + (Number(p.stock_quantity || 0) * Number(p.purchase_price || 0)), 0);

  return (
    <SharedDashboardLayout
      businessName={businessName}
      userName={userName}
      role={role}
      pageTitle="Inventory"
      onAddProduct={() => setShowAddProduct(true)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#172033", margin: 0 }}>Inventory</h2>
          <p style={{ fontSize: "13px", color: "#8791a5", marginTop: "4px", margin: 0 }}>Track stock levels and inventory movements.</p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddProduct(true)}
          style={{
            background: "#2563EB",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "10px",
            padding: "11px 18px",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 4px 10px rgba(37,99,235,0.20)",
          }}
        >
          + Add Product
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        <StatCard title="Total Products" value={totalProducts} icon={<Boxes className="w-5 h-5 text-indigo-600" />} />
        <StatCard title="Low Stock" value={lowStock} icon={<AlertTriangle className="w-5 h-5 text-amber-600" />} />
        <StatCard title="Out of Stock" value={outOfStock} icon={<PackageX className="w-5 h-5 text-rose-600" />} />
        <StatCard title="Stock Value" value={`₹${stockValuation.toLocaleString("en-IN")}`} icon={<Boxes className="w-5 h-5 text-emerald-600" />} />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Inventory Table</h3>
        {loading ? (
          <p className="text-xs text-slate-400">Loading inventory...</p>
        ) : productList.length === 0 ? (
          <p className="text-xs text-slate-400">No products found in inventory.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">Product</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Stock</th>
                  <th className="p-3">Min Stock</th>
                  <th className="p-3">Purchase Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productList.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{p.name}</td>
                    <td className="p-3">{p.category}</td>
                    <td className="p-3 font-bold text-slate-800">{p.stock_quantity} {p.unit}</td>
                    <td className="p-3">{p.minimum_stock}</td>
                    <td className="p-3">₹{p.purchase_price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddProduct && (
        <AddProductModal
          onClose={() => setShowAddProduct(false)}
          onSuccess={loadData}
        />
      )}
    </SharedDashboardLayout>
  );
}
