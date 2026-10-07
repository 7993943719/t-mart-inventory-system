"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface AddProductModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  initialProduct?: any;
}

export function AddProductModal({ onClose, onSuccess, initialProduct }: AddProductModalProps) {
  const [supabase] = useState(() => createClient());
  const [name, setName] = useState(initialProduct?.name || "");
  const [barcode, setBarcode] = useState(initialProduct?.barcode || String(Math.floor(8900000000000 + Math.random() * 999999999)));
  const [category, setCategory] = useState(initialProduct?.category || "Grocery");
  const [purchasePrice, setPurchasePrice] = useState<number>(initialProduct?.purchase_price ?? 100);
  const [sellingPrice, setSellingPrice] = useState<number>(initialProduct?.selling_price ?? 120);
  const [openingStock, setOpeningStock] = useState<number>(initialProduct?.stock_quantity ?? 50);
  const [minimumStock, setMinimumStock] = useState<number>(initialProduct?.minimum_stock ?? 10);
  const [unit, setUnit] = useState(initialProduct?.unit || "Piece");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !barcode) {
      setErrorMsg("Product name and SKU/barcode are required.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      let businessId = null;
      if (user) {
        const { data: memberships } = await supabase
          .from("business_members")
          .select("*, businesses(*)")
          .eq("user_id", user.id);
        if (memberships && memberships.length > 0) {
          businessId = memberships[0].businesses?.id;
        }
      }
      const activeBusinessId = businessId || user?.id || "00000000-0000-0000-0000-000000000000";

      const payload = {
        name: name.trim(),
        barcode: barcode.trim(),
        category: category.trim(),
        purchase_price: Number(purchasePrice) || 0,
        selling_price: Number(sellingPrice) || 0,
        mrp: Number(sellingPrice) || 0,
        stock_quantity: Number(openingStock) || 0,
        minimum_stock: Number(minimumStock) || 10,
        unit: unit.trim(),
        business_id: activeBusinessId,
        updated_at: new Date().toISOString(),
      };

      if (initialProduct?.id) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", initialProduct.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from("products")
          .insert([{ ...payload, created_at: new Date().toISOString() }]);
        if (error) throw new Error(error.message);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save product");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: "12px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "calc(100% - 24px)",
          maxWidth: "650px",
          maxHeight: "calc(100vh - 24px)",
          overflowY: "auto",
          background: "#FFFFFF",
          borderRadius: "16px",
          boxShadow: "0 25px 60px rgba(15,23,42,.25)",
          boxSizing: "border-box",
          margin: "12px",
        }}
      >
        {/* HEADER */}
        <div style={{
          background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
          padding: "20px 24px",
          color: "#FFFFFF",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTopLeftRadius: "16px",
          borderTopRightRadius: "16px",
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800 }}>
              {initialProduct ? "Edit Product" : "Add Product"}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "12px", opacity: 0.85 }}>
              Add a new product to your inventory
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: "36px",
              height: "36px",
              border: "none",
              borderRadius: "10px",
              background: "rgba(255,255,255,.18)",
              color: "#FFFFFF",
              fontSize: "18px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        {errorMsg && (
          <div style={{ margin: "20px 24px 0 24px", padding: "12px", background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c", borderRadius: "10px", fontSize: "12px", fontWeight: 700 }}>
            {errorMsg}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
          {/* PRODUCT INFORMATION */}
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ fontSize: "13px", color: "#2563EB", marginBottom: "12px", fontWeight: 800, textTransform: "uppercase" }}>
              Product Information
            </h3>

            <div style={{ display: "grid", gap: "14px" }}>
              <div>
                <label style={labelStyle}>Product Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter product name"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>SKU / Barcode</label>
                <input
                  type="text"
                  required
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Enter SKU or scan barcode"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={inputStyle}
                >
                  <option value="Grocery">Grocery</option>
                  <option value="Beverages">Beverages</option>
                  <option value="Snacks">Snacks</option>
                  <option value="Personal Care">Personal Care</option>
                  <option value="Household">Household</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>
          </div>

          {/* PRICING */}
          <div style={{
            background: "#F0FDF4",
            border: "1px solid #DCFCE7",
            borderRadius: "14px",
            padding: "16px",
            marginBottom: "16px",
          }}>
            <h3 style={{ fontSize: "13px", color: "#16A34A", marginTop: 0, marginBottom: "12px", fontWeight: 800, textTransform: "uppercase" }}>
              Pricing
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label style={labelStyle}>Purchase Price ₹</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(Number(e.target.value))}
                  placeholder="0.00"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Selling Price ₹</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(Number(e.target.value))}
                  placeholder="0.00"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* INVENTORY */}
          <div style={{
            background: "#EFF6FF",
            border: "1px solid #DBEAFE",
            borderRadius: "14px",
            padding: "16px",
            marginBottom: "20px",
          }}>
            <h3 style={{ fontSize: "13px", color: "#2563EB", marginTop: 0, marginBottom: "12px", fontWeight: 800, textTransform: "uppercase" }}>
              Inventory
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label style={labelStyle}>Opening Stock</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={openingStock}
                  onChange={(e) => setOpeningStock(Number(e.target.value))}
                  placeholder="0"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Minimum Stock</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={minimumStock}
                  onChange={(e) => setMinimumStock(Number(e.target.value))}
                  placeholder="10"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ marginTop: "14px" }}>
              <label style={labelStyle}>Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                style={inputStyle}
              >
                <option value="Piece">Piece</option>
                <option value="Kg">Kg</option>
                <option value="Gram">Gram</option>
                <option value="Litre">Litre</option>
                <option value="Packet">Packet</option>
                <option value="Box">Box</option>
                <option value="Dozen">Dozen</option>
              </select>
            </div>
          </div>

          {/* BUTTONS */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                height: "44px",
                padding: "0 20px",
                borderRadius: "10px",
                border: "1px solid #CBD5E1",
                background: "#FFFFFF",
                color: "#475569",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              style={{
                background: "#2563EB",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "10px",
                padding: "0 20px",
                height: "44px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 10px rgba(37,99,235,0.20)",
              }}
            >
              {submitting ? "Saving..." : "Save Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: "12px",
  fontWeight: 700,
  color: "#334155",
  marginBottom: "6px",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  height: "44px",
  border: "1px solid #CBD5E1",
  borderRadius: "10px",
  padding: "0 12px",
  background: "#FFFFFF",
  color: "#172033",
  fontSize: "14px",
  outline: "none",
};
