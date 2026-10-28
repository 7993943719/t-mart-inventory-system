"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { saveProductAction } from "@/app/dashboard/products/actions";

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
  const [categoryId, setCategoryId] = useState(initialProduct?.category_id || null);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const [purchasePrice, setPurchasePrice] = useState<number>(initialProduct?.purchase_price ?? 100);
  const [sellingPrice, setSellingPrice] = useState<number>(initialProduct?.selling_price ?? 120);
  const [openingStock, setOpeningStock] = useState<number>(initialProduct?.stock_quantity ?? 50);
  const [minimumStock, setMinimumStock] = useState<number>(initialProduct?.minimum_stock ?? 10);
  const [unit, setUnit] = useState(initialProduct?.unit || "Piece");

  // Expiry & Batch Tracking State
  const [trackExpiry, setTrackExpiry] = useState<boolean>(Boolean(initialProduct?.track_expiry));
  const [openingBatchNumber, setOpeningBatchNumber] = useState("");
  const [openingExpiryDate, setOpeningExpiryDate] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadCategories() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: memberships } = await supabase
          .from("business_members")
          .select("business_id")
          .eq("user_id", user.id);

        if (memberships && memberships.length > 0) {
          const bizId = memberships[0].business_id;
          const { data: cats } = await supabase
            .from("categories")
            .select("*")
            .eq("business_id", bizId)
            .order("name", { ascending: true });
          if (cats && cats.length > 0) {
            setCategoriesList(cats);
            if (!initialProduct) {
              const defaultCat = cats.find(c => c.name.toLowerCase() === "grocery") || cats[0];
              setCategory(defaultCat.name);
              setCategoryId(defaultCat.id);
            }
          }
        }
      } catch (err) {
        console.error("Error loading categories in modal:", err);
      }
    }
    loadCategories();
  }, [supabase, initialProduct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !barcode) {
      setErrorMsg("Product name and SKU/barcode are required.");
      return;
    }

    if (trackExpiry && openingStock > 0 && (!openingBatchNumber.trim() || !openingExpiryDate)) {
      setErrorMsg("Batch number and expiry date are required when enabling expiry tracking for existing stock.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User authentication required to save product.");
      }

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

      if (!activeBusinessId) {
        throw new Error("No active business workspace found. Please select or join a valid business before adding products.");
      }

      let resolvedCatId = categoryId;
      const catNameTrim = category.trim();
      if (!resolvedCatId && catNameTrim) {
        const matched = categoriesList.find((c) => c.name.toLowerCase() === catNameTrim.toLowerCase());
        if (matched) {
          resolvedCatId = matched.id;
        } else {
          // Create new category inline
          const { data: newCat, error: catInsErr } = await supabase
            .from("categories")
            .insert([{ business_id: activeBusinessId, name: catNameTrim }])
            .select()
            .single();
          if (!catInsErr && newCat) {
            resolvedCatId = newCat.id;
          }
        }
      }

      const res = await saveProductAction({
        id: initialProduct?.id,
        businessId: activeBusinessId,
        name: name.trim(),
        barcode: barcode.trim(),
        category: catNameTrim || "General",
        categoryId: resolvedCatId,
        purchasePrice: Number(purchasePrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        mrp: Number(sellingPrice) || 0,
        stockQuantity: Number(openingStock) || 0,
        minimumStock: Number(minimumStock) || 10,
        unit: unit.trim(),
        trackExpiry: Boolean(trackExpiry),
        openingBatchNumber: openingBatchNumber.trim(),
        openingExpiryDate: openingExpiryDate,
      });

      if (res && res.success) {
        if (onSuccess) onSuccess();
        onClose();
      }
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
          display: "flex",
          flexDirection: "column",
          background: "#FFFFFF",
          borderRadius: "16px",
          boxShadow: "0 25px 60px rgba(15,23,42,.25)",
          boxSizing: "border-box",
          margin: "12px",
          overflow: "hidden",
        }}
      >
        {/* HEADER */}
        <div style={{
          flexShrink: 0,
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
          <div style={{ flexShrink: 0, margin: "16px 24px 0 24px", padding: "12px", background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c", borderRadius: "10px", fontSize: "12px", fontWeight: 700 }}>
            {errorMsg}
          </div>
        )}

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            flex: 1,
            overflow: "hidden",
          }}
        >
          {/* SCROLLABLE FORM BODY */}
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "24px" }}>
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
                    value={isAddingNewCat ? "__NEW__" : category}
                    onChange={(e) => {
                      if (e.target.value === "__NEW__") {
                        setIsAddingNewCat(true);
                        setCategory("");
                        setCategoryId(null);
                      } else {
                        setIsAddingNewCat(false);
                        const found = categoriesList.find(c => c.name === e.target.value);
                        setCategory(e.target.value);
                        setCategoryId(found ? found.id : null);
                      }
                    }}
                    style={inputStyle}
                  >
                    {categoriesList.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                    <option value="__NEW__">+ Add New Category...</option>
                  </select>

                  {isAddingNewCat && (
                    <input
                      type="text"
                      required
                      placeholder="Enter new category name..."
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      style={{ ...inputStyle, marginTop: "8px" }}
                    />
                  )}
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

            {/* EXPIRY TRACKING & BATCHES */}
            <div style={{
              background: "#FFFBEB",
              border: "1px solid #FDE68A",
              borderRadius: "14px",
              padding: "16px",
              marginTop: "16px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <h3 style={{ fontSize: "13px", color: "#D97706", margin: 0, fontWeight: 800, textTransform: "uppercase" }}>
                  Expiry & Batch Tracking
                </h3>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "#92400E" }}>
                  <input
                    type="checkbox"
                    checked={trackExpiry}
                    onChange={(e) => setTrackExpiry(e.target.checked)}
                    style={{ width: "16px", height: "16px" }}
                  />
                  Enable Expiry Tracking
                </label>
              </div>

              <p style={{ fontSize: "11px", color: "#78350F", margin: "0 0 12px 0" }}>
                Enables First-Expired, First-Out (FEFO) batch inventory allocation at checkout and expiry alert tracking.
              </p>

              {trackExpiry && (
                <div style={{ display: "grid", gap: "12px", paddingTop: "8px", borderTop: "1px border-dashed #FCD34D" }}>
                  {openingStock > 0 && (
                    <div style={{ padding: "8px 12px", background: "#FEF3C7", borderRadius: "8px", fontSize: "11px", color: "#92400E", fontWeight: 600 }}>
                      ⚠️ <strong>Opening Stock Assignment:</strong> Please specify batch number and expiry date to assign your opening stock ({openingStock} {unit}) to an initial batch.
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label style={labelStyle}>Batch Number *</label>
                      <input
                        type="text"
                        required={trackExpiry && openingStock > 0}
                        placeholder="e.g. BATCH-2025-01"
                        value={openingBatchNumber}
                        onChange={(e) => setOpeningBatchNumber(e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Expiry Date *</label>
                      <input
                        type="date"
                        required={trackExpiry && openingStock > 0}
                        min={new Date().toISOString().split("T")[0]}
                        value={openingExpiryDate}
                        onChange={(e) => setOpeningExpiryDate(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* STICKY FOOTER BUTTONS */}
          <div style={{
            flexShrink: 0,
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            padding: "16px 24px",
            borderTop: "1px solid #E2E8F0",
            background: "#FFFFFF",
          }}>
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
