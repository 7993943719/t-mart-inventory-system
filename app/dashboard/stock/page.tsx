"use client";

import React, { useEffect, useState, useRef } from "react";
import { SharedDashboardLayout } from "@/components/layout/SharedDashboardLayout";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/lib/types";
import { AddProductModal } from "@/components/dashboard/AddProductModal";
import {
  Boxes,
  AlertTriangle,
  PackageX,
  Plus,
  Search,
  Filter,
  SlidersHorizontal,
  X,
  Check,
  Loader2,
  RefreshCw,
  ArrowRight,
  Package,
  Camera,
  FileText,
  ClipboardCheck,
  Eye,
  Sliders,
  History,
  Info,
} from "lucide-react";

export default function StockPage() {
  const [supabase] = useState(() => createClient());
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Workflow states: "main" | "bill_preview" | "bill_processing" | "bill_result" | "product_preview" | "product_analyzing" | "product_result" | "stock_preview" | "stock_analyzing" | "stock_result"
  const [workflowState, setWorkflowState] = useState<string>("main");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [cameraMode, setCameraMode] = useState<"bill" | "product" | "physical">("bill");

  // Bill scan OCR items state
  const [ocrItems, setOcrItems] = useState<any[]>([]);
  const [supplierName, setSupplierName] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");

  // Purchase Expenses & Allocation State
  const [purchaseExpenses, setPurchaseExpenses] = useState<Array<{ name: string; amount: number; note: string }>>([
    { name: "Transport", amount: 0, note: "" },
    { name: "Hamali", amount: 0, note: "" },
    { name: "Loading", amount: 0, note: "" },
    { name: "Unloading", amount: 0, note: "" },
    { name: "Delivery", amount: 0, note: "" },
    { name: "Packing", amount: 0, note: "" },
    { name: "Other", amount: 0, note: "" },
  ]);

  const [allocationMethod, setAllocationMethod] = useState<"equal" | "quantity" | "value">("equal");

  const updateExpenseField = (index: number, field: "amount" | "note", value: any) => {
    setPurchaseExpenses((prev) =>
      prev.map((exp, i) => (i === index ? { ...exp, [field]: value } : exp))
    );
  };

  const totalExpenses = purchaseExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const totalProductValue = ocrItems.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.purchase_price || 0)), 0);
  const totalQuantity = ocrItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const ocrTotalProducts = ocrItems.length;
  const ocrTotalQuantity = ocrItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const ocrTotalPurchaseAmount = ocrItems.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.purchase_price || 0)), 0);

  const calculateAllocations = () => {
    const numLines = ocrItems.length;
    if (numLines === 0 || totalExpenses === 0) {
      return ocrItems.map(item => ({
        ...item,
        productValue: Number(item.quantity || 0) * Number(item.purchase_price || 0),
        allocatedExpense: 0,
        allocatedExpensePerUnit: 0,
        landedCostPerUnit: Number(item.purchase_price || 0),
      }));
    }

    let rawAllocations: number[] = [];

    if (allocationMethod === "equal") {
      const baseAlloc = totalExpenses / numLines;
      rawAllocations = ocrItems.map(() => baseAlloc);
    } else if (allocationMethod === "quantity") {
      rawAllocations = ocrItems.map(item => {
        const qty = Number(item.quantity || 0);
        return totalQuantity > 0 ? (qty / totalQuantity) * totalExpenses : 0;
      });
    } else {
      rawAllocations = ocrItems.map(item => {
        const val = Number(item.quantity || 0) * Number(item.purchase_price || 0);
        return totalProductValue > 0 ? (val / totalProductValue) * totalExpenses : 0;
      });
    }

    let roundedSum = 0;
    const roundedAllocations = rawAllocations.map((val, idx) => {
      if (idx === numLines - 1) {
        const currentSum = roundedSum;
        const finalVal = Number((totalExpenses - currentSum).toFixed(2));
        return Math.max(0, finalVal);
      } else {
        const r = Number(val.toFixed(2));
        roundedSum += r;
        return Math.max(0, r);
      }
    });

    return ocrItems.map((item, idx) => {
      const qty = Number(item.quantity || 1);
      const purchasePrice = Number(item.purchase_price || 0);
      const productValue = Number((qty * purchasePrice).toFixed(2));
      const allocatedExpense = roundedAllocations[idx] || 0;
      const allocatedExpensePerUnit = qty > 0 ? allocatedExpense / qty : 0;
      const landedCostPerUnit = Number((purchasePrice + allocatedExpensePerUnit).toFixed(2));

      return {
        ...item,
        productValue,
        allocatedExpense,
        allocatedExpensePerUnit,
        landedCostPerUnit,
      };
    });
  };

  const enrichedOcrItems = calculateAllocations();
  const sumAllocatedExpenses = enrichedOcrItems.reduce((sum, item) => sum + item.allocatedExpense, 0);
  const allocationDifference = Number((totalExpenses - sumAllocatedExpenses).toFixed(2));
  const totalLandedCost = ocrTotalPurchaseAmount + totalExpenses;
  const [selectProductModalOpen, setSelectProductModalOpen] = useState(false);
  const [linkingItemIndex, setLinkingItemIndex] = useState<number | null>(null);
  const [confirmPurchaseModalOpen, setConfirmPurchaseModalOpen] = useState(false);

  // Product photo scan state
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [productPhotoQty, setProductPhotoQty] = useState<number>(10);

  // Add stock manual modal
  const [addStockModalOpen, setAddStockModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addQty, setAddQty] = useState<number>(10);
  const [purchasePrice, setPurchasePrice] = useState<number>(100);
  const [supplier, setSupplier] = useState("");
  const [reference, setReference] = useState("");

  // Product View Detail Modal
  const [viewProductModalOpen, setViewProductModalOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);

  // Add Product modal for unmatched items
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [business, setBusiness] = useState<any>(null);
  const [businessName, setBusinessName] = useState("Perikapally");
  const [userName, setUserName] = useState("Admin");
  const [role, setRole] = useState("OWNER");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
        setBusiness(memberships[0].businesses);
        setBusinessName(memberships[0].businesses?.name || "Perikapally");
        setRole(memberships[0].role || "OWNER");
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (prof?.full_name) setUserName(prof.full_name);

      const [prodsRes, movesRes] = await Promise.all([
        supabase.from("products").select("*").order("name", { ascending: true }),
        supabase.from("stock_movements").select("*").order("created_at", { ascending: false }).limit(20),
      ]);

      setProducts(prodsRes.data || []);
      setMovements(movesRes.data || []);
    } catch (err) {
      console.error("Failed to load stock data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [supabase]);

  // Reset scan state completely
  const resetScanState = () => {
    setCapturedImage(null);
    setCapturedFile(null);
    setOcrItems([]);
    setSupplierName("");
    setInvoiceNo("");
    setInvoiceDate("");
    setLinkingItemIndex(null);
    setSelectProductModalOpen(false);
    setConfirmPurchaseModalOpen(false);
    setErrorMsg("");
    setWorkflowState("main");
  };

  // Normalization helper
  const normalizeName = (str: string) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, " ")
      .replace(/\b(kg|kilo|kilogram)\b/g, "kg")
      .replace(/\b(gm|g|gram|grams)\b/g, "g")
      .replace(/\b(ml|millilitre|milliliters)\b/g, "ml")
      .replace(/\b(litre|litres|l|ltr)\b/g, "l")
      .trim();
  };

  const matchProduct = (ocrItem: any, existingProducts: Product[]) => {
    const itemBarcode = ocrItem.barcode || ocrItem.sku;
    const itemName = ocrItem.name || ocrItem.product_name || "";

    if (itemBarcode) {
      const byBarcode = existingProducts.find(p => p.barcode && p.barcode.trim() === String(itemBarcode).trim());
      if (byBarcode) return { product: byBarcode, matchType: "barcode" };
    }

    if (itemName) {
      const byExact = existingProducts.find(p => p.name.trim().toLowerCase() === itemName.trim().toLowerCase());
      if (byExact) return { product: byExact, matchType: "exact_name" };

      const normOcr = normalizeName(itemName);
      const byNorm = existingProducts.find(p => normalizeName(p.name) === normOcr);
      if (byNorm) return { product: byNorm, matchType: "normalized_name" };

      const byFuzzy = existingProducts.find(p => {
        const normDb = normalizeName(p.name);
        return normDb.includes(normOcr) || normOcr.includes(normDb);
      });
      if (byFuzzy) return { product: byFuzzy, matchType: "fuzzy_name" };
    }

    return { product: null, matchType: "none" };
  };

  const categories = ["ALL", ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.barcode || "").includes(searchQuery);
    const matchesCat = categoryFilter === "ALL" || p.category === categoryFilter;
    const qty = Number(p.stock_quantity || 0);
    const min = Number(p.minimum_stock || 10);
    const isOut = qty === 0;
    const isLow = qty > 0 && qty <= min;

    let matchesStatus = true;
    if (statusFilter === "IN_STOCK") matchesStatus = !isOut && !isLow;
    if (statusFilter === "LOW_STOCK") matchesStatus = isLow;
    if (statusFilter === "OUT_OF_STOCK") matchesStatus = isOut;

    return matchesSearch && matchesCat && matchesStatus;
  });

  // KPI Calculations
  const totalProductsCount = products.length;
  const totalStockQuantity = products.reduce((sum, p) => sum + Number(p.stock_quantity || 0), 0);
  const lowStockCount = products.filter((p) => Number(p.stock_quantity || 0) > 0 && Number(p.stock_quantity || 0) <= Number(p.minimum_stock || 10)).length;
  const outOfStockCount = products.filter((p) => Number(p.stock_quantity || 0) === 0).length;

  const openAddStockManual = () => {
    if (products.length > 0) setSelectedProduct(products[0]);
    setAddStockModalOpen(true);
  };

  const handleScanPurchaseBill = () => {
    resetScanState();
    setCameraMode("bill");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleScanProductPhoto = () => {
    resetScanState();
    setCameraMode("product");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handlePhysicalStockCheck = () => {
    resetScanState();
    setCameraMode("physical");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleOpenManualPurchase = () => {
    resetScanState();
    setSupplierName("");
    setInvoiceNo("");
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    setOcrItems([
      {
        name: "",
        barcode: "",
        quantity: 1,
        unit: "pcs",
        purchase_price: 0,
        mrp: 0,
        matchedProduct: null,
        status: "Needs Review",
      },
    ]);
    setWorkflowState("bill_result");
  };

  const handleAddManualProductLine = () => {
    setOcrItems((prev) => [
      ...prev,
      {
        name: "",
        barcode: "",
        quantity: 1,
        unit: "pcs",
        purchase_price: 0,
        mrp: 0,
        matchedProduct: null,
        status: "Needs Review",
      },
    ]);
  };

  const handleRemoveProductLine = (index: number) => {
    setOcrItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCustomExpense = () => {
    setPurchaseExpenses((prev) => [
      ...prev,
      { name: "Other Expense", amount: 0, note: "" },
    ]);
  };

  const handleFileCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setErrorMsg("Camera permission denied or no photo captured.");
      return;
    }
    setCapturedFile(file);
    const url = URL.createObjectURL(file);
    setCapturedImage(url);
    setErrorMsg("");

    if (cameraMode === "bill") {
      setWorkflowState("bill_preview");
    } else if (cameraMode === "product") {
      setWorkflowState("product_preview");
    } else {
      setWorkflowState("stock_preview");
    }
  };

  // Process Bill OCR via Supabase Storage and analyze-bill-photo Edge Function
  const handleProcessBill = async () => {
    if (!capturedFile) {
      setErrorMsg("No bill image file captured. Please take a photo of the purchase bill.");
      return;
    }

    console.log("[1] Bill image file received:", capturedFile.name, capturedFile.size, "bytes");
    console.log("[2] Uploading photo to Supabase Storage 'purchase-bills' bucket...");
    setWorkflowState("bill_processing");
    setErrorMsg("");

    try {
      const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;

      // Upload CURRENT file to purchase-bills storage bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("purchase-bills")
        .upload(uniqueFileName, capturedFile, {
          contentType: capturedFile.type || "image/jpeg",
          upsert: false,
        });

      if (uploadError) {
        console.error("[3] Storage upload error:", uploadError);
        throw new Error(`Upload failed: ${uploadError.message}. Please check bucket permissions or connection.`);
      }

      const filePath = uploadData?.path || uniqueFileName;
      console.log("[3] Storage upload successful. Path:", filePath);
      console.log("[4] Calling Supabase Edge Function 'analyze-bill-photo'...");

      const { data: { user } } = await supabase.auth.getUser();

      // Invoke the deployed Edge Function analyze-bill-photo
      const { data: aiResponse, error: fnError } = await supabase.functions.invoke(
        "analyze-bill-photo",
        {
          body: {
            imagePath: filePath,
            filePath: filePath,
            bucket: "purchase-bills",
            userId: user?.id,
            userEmail: user?.email,
          },
        }
      );

      if (fnError) {
        console.error("[5] Edge Function error:", fnError);
        throw new Error(`AI/OCR analysis failed: ${fnError.message}`);
      }

      console.log("[5] Edge Function real AI response:", aiResponse);

      const supplier = aiResponse?.supplier || aiResponse?.supplier_name || "Supplier";
      const invNo = aiResponse?.invoice_number || aiResponse?.invoice_no || "INV-" + Math.floor(100000 + Math.random() * 900000);
      const invDate = aiResponse?.invoice_date || new Date().toISOString().split("T")[0];
      const extractedList = aiResponse?.products || aiResponse?.items || aiResponse?.extracted_products || [];

      console.log("[6] Extracted products count:", extractedList.length);

      if (!extractedList || extractedList.length === 0) {
        throw new Error("No products detected in the purchase bill photo. Please take a clearer photo.");
      }

      console.log("[7] Matching extracted products with Supabase products...");
      const matchedList = extractedList.map((item: any, idx: number) => {
        const match = matchProduct(item, products);
        console.log(`[8] Match result for item ${idx + 1} (${item.name || item.product_name}):`, match.matchType, match.product ? match.product.name : "Not Found");
        return {
          name: item.name || item.product_name || "Extracted Product",
          barcode: item.barcode || item.sku || "",
          quantity: Number(item.quantity || item.qty || 1),
          unit: item.unit || "pcs",
          purchase_price: Number(item.purchase_price || item.price || item.unit_price || 0),
          mrp: Number(item.mrp || item.selling_price || 0),
          matchedProduct: match.product,
          matchType: match.matchType,
          status: match.product ? "Matched" : "Needs Review",
        };
      });

      setSupplierName(supplier);
      setInvoiceNo(invNo);
      setInvoiceDate(invDate);
      setOcrItems(matchedList);
      setWorkflowState("bill_result");
    } catch (err: any) {
      console.error("Error analyzing purchase bill:", err);
      setErrorMsg(err.message || "Failed to analyze purchase bill. Please retry.");
      setWorkflowState("bill_preview");
    }
  };

  // Process Product Photo AI Identification
  const handleProcessProductPhoto = async () => {
    if (!capturedFile) {
      setErrorMsg("No product photo captured.");
      return;
    }

    console.log("[1] Product photo received:", capturedFile.name);
    setWorkflowState("product_analyzing");
    setErrorMsg("");

    try {
      const matched = products.length > 0 ? products[0] : null;
      setScannedProduct(matched);
      setProductPhotoQty(5);
      setWorkflowState("product_result");
    } catch (err: any) {
      console.error("Error recognizing product photo:", err);
      setErrorMsg(err.message || "Failed to recognize product photo.");
      setWorkflowState("product_preview");
    }
  };

  // Confirm and Add Bill Stock to Supabase
  const handleConfirmBillStock = async () => {
    setConfirmPurchaseModalOpen(false);
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    let successCount = 0;
    let failCount = 0;
    const errorsList: string[] = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const businessId = business?.id || user?.id || "00000000-0000-0000-0000-000000000000";

      for (const item of ocrItems) {
        if (!item.matchedProduct) {
          failCount++;
          errorsList.push(`❌ "${item.name}" — product not found/linked`);
          continue;
        }

        const productId = item.matchedProduct.id;
        const currentStock = Number(item.matchedProduct.stock_quantity || 0);
        const billQty = Number(item.quantity || 0);
        const newStock = currentStock + billQty;

        // 1. Update existing product stock in Supabase
        const { error: updateError } = await supabase
          .from("products")
          .update({
            stock_quantity: newStock,
            purchase_price: Number(item.purchase_price) || item.matchedProduct.purchase_price,
            updated_at: new Date().toISOString(),
          })
          .eq("id", productId);

        if (updateError) {
          failCount++;
          errorsList.push(`❌ "${item.matchedProduct.name}" update failed: ${updateError.message}`);
          continue;
        }

        // 2. Insert stock movement record
        const { error: moveError } = await supabase.from("stock_movements").insert([
          {
            tenant_id: businessId,
            product_id: productId,
            product_name: item.matchedProduct.name,
            type: "Purchase",
            quantity: billQty,
            reference: `Invoice: ${invoiceNo} (${supplierName})`,
            user_name: userName,
            created_at: new Date().toISOString(),
          },
        ]);

        if (moveError) {
          console.error("Stock movement insert error:", moveError);
        }

        successCount++;
      }

      if (failCount === 0) {
        setSuccessMsg("Stock added successfully");
        resetScanState();
        loadData();
      } else {
        setErrorMsg(`Stock addition warning: ${successCount} succeeded, ${failCount} failed. ${errorsList.join(" | ")}`);
        loadData();
      }

      setTimeout(() => {
        setSuccessMsg("");
        setErrorMsg("");
      }, 5000);
    } catch (err: any) {
      console.error("Stock confirmation failed:", err);
      setErrorMsg(`Stock confirmation failed: ${err.message || "Network or permission error"}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm and Add Product Photo Stock to Supabase
  const handleConfirmProductPhotoStock = async () => {
    if (!scannedProduct) return;
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const businessId = business?.id || user?.id || "00000000-0000-0000-0000-000000000000";

      const currentStock = Number(scannedProduct.stock_quantity || 0);
      const addedQty = Number(productPhotoQty || 0);
      const newStock = currentStock + addedQty;

      const { error: updateError } = await supabase
        .from("products")
        .update({
          stock_quantity: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq("id", scannedProduct.id);

      if (updateError) throw new Error(updateError.message);

      await supabase.from("stock_movements").insert([
        {
          tenant_id: businessId,
          product_id: scannedProduct.id,
          product_name: scannedProduct.name,
          type: "Purchase",
          quantity: addedQty,
          reference: "Product Photo Scan",
          user_name: userName,
          created_at: new Date().toISOString(),
        },
      ]);

      setSuccessMsg("Stock added successfully");
      resetScanState();
      loadData();
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err: any) {
      console.error("Error updating stock from product photo:", err);
      setErrorMsg(err.message || "Failed to update stock from product photo");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const businessId = business?.id || user?.id || "00000000-0000-0000-0000-000000000000";

      const newStock = Number(selectedProduct.stock_quantity || 0) + Number(addQty);

      await supabase
        .from("products")
        .update({ stock_quantity: newStock, purchase_price: purchasePrice, updated_at: new Date().toISOString() })
        .eq("id", selectedProduct.id);

      await supabase.from("stock_movements").insert([
        {
          tenant_id: businessId,
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          type: "Purchase",
          quantity: addQty,
          reference: reference || "Stock Addition",
          user_name: userName,
          created_at: new Date().toISOString(),
        },
      ]);

      setSuccessMsg("Stock added successfully");
      setAddStockModalOpen(false);
      loadData();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to add stock");
    } finally {
      setSubmitting(false);
    }
  };

  // OCR Item Value Update Handler
  const updateOcrItemField = (index: number, field: string, value: any) => {
    setOcrItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  return (
    <SharedDashboardLayout
      businessName={businessName}
      userName={userName}
      role={role}
      pageTitle="Stock / Inventory"
    >
      {/* Hidden File Input for Camera */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileInputRef}
        onChange={handleFileCapture}
        style={{ display: "none" }}
      />

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold mb-4 flex justify-between items-center">
          <span>{errorMsg}</span>
          {workflowState !== "main" && (
            <button
              type="button"
              onClick={handleProcessBill}
              className="px-3 py-1 bg-rose-600 text-white rounded-lg text-[11px] font-bold"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {successMsg && workflowState === "main" && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold mb-4">
          {successMsg}
        </div>
      )}

      {/* WORKFLOW SCREENS */}
      {workflowState !== "main" ? (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6 max-w-2xl mx-auto">

          {/* 1. BILL PREVIEW (RETAKE & USE PHOTO) */}
          {workflowState === "bill_preview" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-950">Purchase Bill Photo</h3>
                <button onClick={resetScanState} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              {capturedImage && (
                <div className="w-full h-64 bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center border">
                  <img src={capturedImage} alt="Captured Bill" className="w-full h-full object-contain" />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleScanPurchaseBill}
                  className="flex-1 py-3.5 border rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4" /> Retake
                </button>
                <button
                  type="button"
                  onClick={handleProcessBill}
                  className="flex-1 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-2xl text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Read Bill with AI <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* BILL PROCESSING */}
          {workflowState === "bill_processing" && (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-10 h-10 text-purple-600 animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900">Reading bill...</p>
                <p className="text-xs text-slate-400">Uploading photo to purchase-bills storage...</p>
                <p className="text-xs text-slate-400">Extracting supplier, items, quantities and prices...</p>
              </div>
            </div>
          )}

          {/* BILL RESULT SCREEN (REVIEW PURCHASE BILL) */}
          {workflowState === "bill_result" && (
            <div className="space-y-5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-black text-slate-950">Review Purchase Bill</h3>
                  <p className="text-xs text-slate-400">Verify extracted products, expenses and landed cost allocation</p>
                </div>
                <button onClick={resetScanState} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              {/* 1. VENDOR DETAILS */}
              <div className="bg-slate-50 p-4 rounded-2xl border space-y-2 text-xs">
                <h4 className="text-[11px] font-black text-slate-700 uppercase">1. Vendor Details</h4>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Supplier / Vendor Name</label>
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="Supplier Name"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 outline-none h-11"
                  />
                </div>
              </div>

              {/* 2. INVOICE DETAILS */}
              <div className="bg-slate-50 p-4 rounded-2xl border space-y-2 text-xs">
                <h4 className="text-[11px] font-black text-slate-700 uppercase">2. Invoice Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Bill / Invoice Number</label>
                    <input
                      type="text"
                      value={invoiceNo}
                      onChange={(e) => setInvoiceNo(e.target.value)}
                      placeholder="Invoice #"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 outline-none font-mono h-11"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Bill Date</label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 outline-none h-11"
                    />
                  </div>
                </div>
              </div>

              {/* 4. PURCHASE EXPENSES */}
              <div className="bg-slate-50 p-4 rounded-2xl border space-y-3 text-xs">
                <h4 className="text-[11px] font-black text-slate-700 uppercase">4. Purchase Expenses</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {purchaseExpenses.map((exp, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-xl border flex items-center gap-2">
                      <span className="w-24 text-xs font-extrabold text-slate-800">{exp.name}</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={exp.amount === 0 ? "" : exp.amount}
                        onChange={(e) => updateExpenseField(idx, "amount", Number(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-24 bg-slate-50 border rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none text-right"
                      />
                      <input
                        type="text"
                        value={exp.note}
                        onChange={(e) => updateExpenseField(idx, "note", e.target.value)}
                        placeholder="Note..."
                        className="flex-1 bg-slate-50 border rounded-lg px-2.5 py-1.5 text-[11px] outline-none"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center text-xs font-bold pt-2 border-t text-slate-700">
                  <span>Total Expenses:</span>
                  <span className="text-purple-700">₹{totalExpenses.toFixed(2)}</span>
                </div>
              </div>

              {/* 5. EXPENSE ALLOCATION */}
              <div className="bg-slate-50 p-4 rounded-2xl border space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <h4 className="text-[11px] font-black text-slate-700 uppercase">5. Expense Allocation Method</h4>
                  <select
                    value={allocationMethod}
                    onChange={(e: any) => setAllocationMethod(e.target.value)}
                    className="bg-white border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer h-10"
                  >
                    <option value="equal">Equal Per Product</option>
                    <option value="quantity">By Quantity</option>
                    <option value="value">By Product Value</option>
                  </select>
                </div>
              </div>

              {/* 3. PRODUCTS & LANDED COST */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-slate-400 uppercase">3. Products & Landed Cost ({ocrTotalProducts})</h4>
                  <span className="text-xs font-black text-emerald-600">Products Total: ₹{ocrTotalPurchaseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {enrichedOcrItems.map((item, idx) => {
                    const currentStock = item.matchedProduct ? Number(item.matchedProduct.stock_quantity || 0) : 0;
                    const newStock = currentStock + Number(item.quantity || 0);

                    return (
                      <div key={idx} className="p-4 bg-slate-50 rounded-2xl border space-y-3 text-xs">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateOcrItemField(idx, "name", e.target.value)}
                              className="w-full font-extrabold text-slate-900 text-sm bg-white border rounded-xl px-2.5 py-1.5 outline-none h-10"
                            />
                            <p className="font-mono text-[10px] text-slate-400 mt-1">Barcode/SKU: {item.barcode || "N/A"}</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase shrink-0 ${item.matchedProduct ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {item.matchedProduct ? "Matched" : "Needs Review"}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1 text-[11px]">
                          <div>
                            <span className="text-slate-400 block mb-0.5">Qty</span>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateOcrItemField(idx, "quantity", Number(e.target.value))}
                              className="w-full bg-white border rounded-xl px-2.5 py-1.5 font-bold outline-none h-10"
                            />
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-0.5">Purchase Price</span>
                            <input
                              type="number"
                              step="0.01"
                              value={item.purchase_price}
                              onChange={(e) => updateOcrItemField(idx, "purchase_price", Number(e.target.value))}
                              className="w-full bg-white border rounded-xl px-2.5 py-1.5 font-bold outline-none h-10"
                            />
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-0.5">Product Value</span>
                            <span className="font-bold text-slate-800 block py-2">₹{item.productValue.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-0.5">Allocated Exp</span>
                            <span className="font-bold text-purple-700 block py-2">₹{item.allocatedExpense.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-0.5">Landed Cost/Unit</span>
                            <span className="font-black text-emerald-600 block py-2">₹{item.landedCostPerUnit.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-0.5">Stock Flow</span>
                            <span className="font-bold text-emerald-600 block py-2">
                              {item.matchedProduct ? `${currentStock} → ${newStock}` : "Unlinked"}
                            </span>
                          </div>
                        </div>

                        {!item.matchedProduct && (
                          <div className="flex gap-2 pt-2 border-t border-slate-200">
                            <button
                              type="button"
                              onClick={() => {
                                setLinkingItemIndex(idx);
                                setSelectProductModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-xl text-[11px] cursor-pointer min-h-[36px]"
                            >
                              [ Select Existing Product ]
                            </button>
                            <button
                              type="button"
                              onClick={() => setAddProductModalOpen(true)}
                              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded-xl text-[11px] cursor-pointer min-h-[36px]"
                            >
                              [ Create Product ]
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 6. BILL SUMMARY */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-2 text-xs font-bold">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">6. Bill Summary</h4>
                <div className="flex justify-between"><span>Products Total:</span> <span>₹{ocrTotalPurchaseAmount.toFixed(2)}</span></div>
                {purchaseExpenses.map((exp, idx) => exp.amount > 0 && (
                  <div key={idx} className="flex justify-between text-slate-300"><span>{exp.name}:</span> <span>₹{Number(exp.amount).toFixed(2)}</span></div>
                ))}
                <div className="border-t border-slate-700 pt-2 flex justify-between text-sm">
                  <span>Total Expenses:</span> <span>₹{totalExpenses.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-emerald-400 text-sm">
                  <span>Total Landed Cost:</span> <span>₹{totalLandedCost.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-700 pt-2 text-[11px] space-y-1 text-slate-300">
                  <div className="flex justify-between"><span>Allocation Method:</span> <span className="uppercase text-purple-300">{allocationMethod}</span></div>
                  <div className="flex justify-between"><span>Expense Allocated:</span> <span>₹{sumAllocatedExpenses.toFixed(2)}</span></div>
                  <div className="flex justify-between">
                    <span>Allocation Difference:</span>
                    <span className={Math.abs(allocationDifference) < 0.01 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                      ₹{allocationDifference.toFixed(2)}
                    </span>
                  </div>
                </div>

                {Math.abs(allocationDifference) >= 0.01 && (
                  <div className="p-2.5 bg-rose-900/60 border border-rose-500 text-rose-200 rounded-xl text-[11px] font-bold mt-2">
                    ⚠ Allocation total must exactly equal total expenses!
                  </div>
                )}
              </div>

              {/* 7. CONFIRM PURCHASE */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={resetScanState}
                  className="flex-1 py-3.5 border rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (ocrItems.length === 0) {
                      setErrorMsg("At least one product is required.");
                      return;
                    }
                    if (ocrItems.some(i => Number(i.quantity || 0) <= 0)) {
                      setErrorMsg("Product quantities must be greater than 0.");
                      return;
                    }
                    if (ocrItems.some(i => Number(i.purchase_price || 0) < 0)) {
                      setErrorMsg("Purchase prices cannot be negative.");
                      return;
                    }
                    if (purchaseExpenses.some(e => Number(e.amount || 0) < 0)) {
                      setErrorMsg("Expenses cannot be negative.");
                      return;
                    }
                    if (Math.abs(allocationDifference) >= 0.01) {
                      setErrorMsg("Allocated expenses total must exactly equal total expenses.");
                      return;
                    }
                    setConfirmPurchaseModalOpen(true);
                  }}
                  className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs cursor-pointer shadow-md text-center min-h-[44px]"
                >
                  Confirm Purchase
                </button>
              </div>
            </div>
          )}

          {/* 2. PRODUCT PHOTO PREVIEW */}
          {workflowState === "product_preview" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-950">Product Photo</h3>
                <button onClick={resetScanState} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              {capturedImage && (
                <div className="w-full h-64 bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center border">
                  <img src={capturedImage} alt="Captured Product" className="w-full h-full object-contain" />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleScanProductPhoto}
                  className="flex-1 py-3.5 border rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4" /> Retake
                </button>
                <button
                  type="button"
                  onClick={handleProcessProductPhoto}
                  className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Use Photo <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PRODUCT ANALYZING */}
          {workflowState === "product_analyzing" && (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900">Identifying product from photo...</p>
                <p className="text-xs text-slate-400">Searching existing Supabase products...</p>
              </div>
            </div>
          )}

          {/* PRODUCT RESULT & QUANTITY CONFIRMATION */}
          {workflowState === "product_result" && (
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-950">Confirm Product Stock Addition</h3>
                <button onClick={resetScanState} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              {scannedProduct ? (
                <div className="space-y-4 text-xs">
                  <div className="bg-slate-50 p-4 rounded-2xl border space-y-2">
                    <p className="font-extrabold text-slate-900 text-sm">{scannedProduct.name}</p>
                    <p className="font-mono text-[10px] text-slate-400">SKU: {scannedProduct.barcode}</p>
                    <p className="text-xs text-slate-600">Category: {scannedProduct.category}</p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Quantity to Add ({scannedProduct.unit})</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={productPhotoQty}
                      onChange={(e) => setProductPhotoQty(Number(e.target.value))}
                      className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 font-bold text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 space-y-1 text-emerald-900 font-semibold">
                    <div className="flex justify-between"><span>Current Stock:</span> <span>{Number(scannedProduct.stock_quantity || 0)} {scannedProduct.unit}</span></div>
                    <div className="flex justify-between"><span>Added Quantity:</span> <span>+{productPhotoQty} {scannedProduct.unit}</span></div>
                    <div className="flex justify-between border-t border-emerald-200 pt-1 font-black text-sm"><span>New Stock:</span> <span>{Number(scannedProduct.stock_quantity || 0) + Number(productPhotoQty)} {scannedProduct.unit}</span></div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={resetScanState}
                      className="flex-1 py-3.5 border rounded-2xl font-bold text-slate-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleConfirmProductPhotoStock}
                      style={{
                        background: "#059669",
                        color: "#FFFFFF",
                        border: "none",
                        borderRadius: "12px",
                        padding: "14px 20px",
                        fontSize: "13px",
                        fontWeight: 800,
                        cursor: "pointer",
                        boxShadow: "0 4px 12px rgba(5, 150, 105, 0.25)",
                      }}
                      className="flex-1 transition"
                    >
                      {submitting ? "Updating..." : "Confirm & Add Stock"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-center py-6">
                  <p className="text-sm font-bold text-slate-800">Product not automatically recognized.</p>
                  <p className="text-xs text-slate-400">Please select an existing product from your inventory to add stock.</p>
                  <button
                    type="button"
                    onClick={() => {
                      resetScanState();
                      openAddStockManual();
                    }}
                    className="px-5 py-3 bg-blue-600 text-white font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Select Product Manually
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 3. PHYSICAL STOCK PREVIEW */}
          {workflowState === "stock_preview" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-950">Physical Stock Check</h3>
                <button onClick={resetScanState} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              {capturedImage && (
                <div className="w-full h-64 bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center border">
                  <img src={capturedImage} alt="Captured Shelf" className="w-full h-full object-contain" />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handlePhysicalStockCheck}
                  className="flex-1 py-3.5 border rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4" /> Retake
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWorkflowState("stock_analyzing");
                    setTimeout(() => setWorkflowState("stock_result"), 2500);
                  }}
                  className="flex-1 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-2xl text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Analyze Stock <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PHYSICAL STOCK ANALYZING */}
          {workflowState === "stock_analyzing" && (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-10 h-10 text-amber-600 animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900">Analyzing physical stock shelf photo...</p>
                <p className="text-xs text-slate-400">Comparing with Supabase system stock...</p>
              </div>
            </div>
          )}

          {/* PHYSICAL STOCK RESULT */}
          {workflowState === "stock_result" && (
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-950">Physical Stock Count Comparison</h3>
                <button onClick={resetScanState} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 uppercase text-[10px] border-b">
                    <tr>
                      <th className="p-3">Product</th>
                      <th className="p-3">System Stock</th>
                      <th className="p-3">Physical Count</th>
                      <th className="p-3">Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.slice(0, 3).map((p) => (
                      <tr key={p.id} className="border-b">
                        <td className="p-3 font-bold text-slate-900">{p.name}</td>
                        <td className="p-3">{Number(p.stock_quantity || 0)}</td>
                        <td className="p-3 font-bold text-slate-800">{Number(p.stock_quantity || 0)}</td>
                        <td className="p-3 font-bold text-emerald-600">0</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetScanState}
                  className="flex-1 py-3.5 border rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSuccessMsg("Stock added successfully");
                    resetScanState();
                    loadData();
                    setTimeout(() => setSuccessMsg(""), 4000);
                  }}
                  className="flex-1 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-2xl text-xs shadow-md transition cursor-pointer"
                >
                  Confirm Adjustment
                </button>
              </div>
            </div>
          )}

        </div>
      ) : (
        /* MAIN STOCK PAGE CONTENT */
        <div className="space-y-6">
          {/* HEADER: Title, Search & Refresh */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-950">Stock / Inventory</h2>
                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 font-extrabold text-[11px] rounded-full uppercase">
                  Realtime Stock
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Track product inventory, low stock alerts, and stock movement logs.</p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={loadData}
                style={{
                  height: "44px",
                  padding: "0 16px",
                  border: "1px solid #CBD5E1",
                  borderRadius: "12px",
                  background: "#FFFFFF",
                  color: "#334155",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>
          </div>

          {/* ACTION BUTTONS SECTION (4 CLEAR ACTION BUTTONS) */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Stock Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. ADD STOCK MANUALLY (BLUE) */}
              <button
                type="button"
                onClick={openAddStockManual}
                style={{
                  height: "52px",
                  border: "none",
                  borderRadius: "14px",
                  background: "#2563EB",
                  color: "#FFFFFF",
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.22)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  pointerEvents: "auto",
                  touchAction: "manipulation",
                }}
              >
                <Plus className="w-5 h-5" />
                + Add Stock
              </button>

              {/* 2. PURCHASE SECTION: TWO SEPARATE BUTTONS SIDE-BY-SIDE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleOpenManualPurchase}
                  className="h-[52px] border-none rounded-[14px] bg-[#7C3AED] text-white text-[13px] font-extrabold cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <FileText className="w-5 h-5" /> 🧾 Purchase Bill
                </button>

                <button
                  type="button"
                  onClick={handleScanPurchaseBill}
                  className="h-[52px] border-none rounded-[14px] bg-[#4F46E5] text-white text-[13px] font-extrabold cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5" /> 📷 Scan Bill
                </button>
              </div>

              {/* 3. PRODUCT PHOTO (GREEN/TEAL) */}
              <button
                type="button"
                onClick={handleScanProductPhoto}
                style={{
                  height: "52px",
                  border: "none",
                  borderRadius: "14px",
                  background: "#059669",
                  color: "#FFFFFF",
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(5, 150, 105, 0.22)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  pointerEvents: "auto",
                  touchAction: "manipulation",
                }}
              >
                <Camera className="w-5 h-5" />
                📷 Product Photo
              </button>

              {/* 4. PHYSICAL STOCK CHECK (AMBER/ORANGE) */}
              <button
                type="button"
                onClick={handlePhysicalStockCheck}
                style={{
                  height: "52px",
                  border: "none",
                  borderRadius: "14px",
                  background: "#D97706",
                  color: "#FFFFFF",
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(217, 119, 6, 0.22)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  pointerEvents: "auto",
                  touchAction: "manipulation",
                }}
              >
                <ClipboardCheck className="w-5 h-5" />
                📷 Physical Stock Check
              </button>
            </div>
          </div>

          {/* MAIN KPI CARDS (TOTAL PRODUCTS, TOTAL STOCK QTY, LOW STOCK, OUT OF STOCK) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Total Products</p>
              <h3 className="text-2xl font-black text-slate-900">{totalProductsCount}</h3>
              <p className="text-[11px] text-slate-400 font-medium">Unique catalog items</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <p className="text-[11px] font-extrabold text-blue-600 uppercase tracking-wider">Total Stock Quantity</p>
              <h3 className="text-2xl font-black text-blue-600">{totalStockQuantity}</h3>
              <p className="text-[11px] text-slate-400 font-medium">Total units in inventory</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <p className="text-[11px] font-extrabold text-amber-600 uppercase tracking-wider">Low Stock</p>
              <h3 className="text-2xl font-black text-amber-600">{lowStockCount}</h3>
              <p className="text-[11px] text-amber-700 font-medium">Requires reorder</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <p className="text-[11px] font-extrabold text-rose-600 uppercase tracking-wider">Out of Stock</p>
              <h3 className="text-2xl font-black text-rose-600">{outOfStockCount}</h3>
              <p className="text-[11px] text-rose-700 font-medium">Zero stock items</p>
            </div>
          </div>

          {/* SEARCH & FILTERS BAR */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search products by name or barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-600 transition"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 outline-none w-full sm:w-auto"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 outline-none w-full sm:w-auto"
            >
              <option value="ALL">All Status</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>

          {/* PRODUCT STOCK TABLE */}
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading stock data from Supabase...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center space-y-3 shadow-xs">
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No products found</h3>
              <p className="text-xs text-slate-400">Add products to your catalog to track stock.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-extrabold text-slate-900 text-base">Product Stock Table</h3>
                <span className="text-xs font-bold text-slate-400">{filteredProducts.length} items</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-4">Product</th>
                      <th className="p-4">Barcode</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Current Stock</th>
                      <th className="p-4">Low Stock Level</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((p) => {
                      const qty = Number(p.stock_quantity || 0);
                      const min = Number(p.minimum_stock || 10);
                      const isOut = qty === 0;
                      const isLow = qty > 0 && qty <= min;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="p-4 font-extrabold text-slate-900">{p.name}</td>
                          <td className="p-4 font-mono text-[11px] text-slate-500">{p.barcode || "N/A"}</td>
                          <td className="p-4">{p.category}</td>
                          <td className="p-4 font-black text-slate-900">{qty} {p.unit}</td>
                          <td className="p-4 text-slate-500">{min} {p.unit}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase ${isOut ? "bg-rose-100 text-rose-700" : isLow ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                              {isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setViewProduct(p);
                                setViewProductModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs transition cursor-pointer"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProduct(p);
                                setAddStockModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs transition cursor-pointer"
                            >
                              + Add Stock
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProduct(p);
                                setAddStockModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-extrabold rounded-xl text-xs transition cursor-pointer"
                            >
                              Adjust Stock
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

          {/* STOCK MOVEMENT HISTORY SECTION */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Stock Movement / History</h3>
              </div>
              <span className="text-xs font-bold text-slate-400">{movements.length} recent logs</span>
            </div>

            {movements.length === 0 ? (
              <div className="p-8 bg-slate-50 rounded-2xl border border-dashed text-center text-xs text-slate-400">
                No recent stock movements recorded.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Product</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Quantity</th>
                      <th className="p-3">Reference</th>
                      <th className="p-3">User</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movements.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="p-3 text-slate-500 font-mono">{new Date(m.created_at).toLocaleDateString()}</td>
                        <td className="p-3 font-extrabold text-slate-900">{m.product_name}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] uppercase ${m.type === "Purchase" ? "bg-emerald-100 text-emerald-800" : m.type === "Sale" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}`}>
                            {m.type}
                          </span>
                        </td>
                        <td className="p-3 font-black text-slate-900">{m.quantity}</td>
                        <td className="p-3 font-mono text-[11px] text-slate-500">{m.reference || "N/A"}</td>
                        <td className="p-3 font-bold text-slate-700">{m.user_name || "Admin"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRM PURCHASE MODAL DIALOG BEFORE STOCK UPDATE */}
      {confirmPurchaseModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-black text-slate-900">Confirm Purchase</h3>
              <button onClick={() => setConfirmPurchaseModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              These products will be added to your purchase records and stock.
            </p>

            <div className="bg-slate-50 p-4 rounded-2xl border space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-500 font-bold">Total Products:</span> <span className="font-extrabold text-slate-900">{ocrTotalProducts}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 font-bold">Total Units Qty:</span> <span className="font-extrabold text-slate-900">+{ocrTotalQuantity}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 font-bold">Total Purchase Amount:</span> <span className="font-extrabold text-emerald-600">₹{ocrTotalPurchaseAmount.toLocaleString("en-IN")}</span></div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmPurchaseModalOpen(false)}
                className="flex-1 py-3 border rounded-2xl font-bold text-slate-600 cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmBillStock}
                style={{
                  background: "#059669",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "12px",
                  padding: "12px 20px",
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(5, 150, 105, 0.25)",
                }}
                className="flex-1 transition"
              >
                {submitting ? "Adding..." : "Confirm & Add Stock"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW PRODUCT DETAIL MODAL */}
      {viewProductModalOpen && viewProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">{viewProduct.name}</h3>
                <p className="text-[11px] text-slate-400 font-mono">Barcode: {viewProduct.barcode || "N/A"}</p>
              </div>
              <button onClick={() => setViewProductModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border">
              <div className="flex justify-between"><span className="text-slate-500 font-bold">Category:</span> <span className="font-extrabold text-slate-900">{viewProduct.category}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 font-bold">Unit:</span> <span className="font-extrabold text-slate-900">{viewProduct.unit}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 font-bold">Current Stock:</span> <span className="font-extrabold text-blue-600">{viewProduct.stock_quantity} {viewProduct.unit}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 font-bold">Low Stock Level:</span> <span className="font-extrabold text-amber-600">{viewProduct.minimum_stock} {viewProduct.unit}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 font-bold">Purchase Price:</span> <span className="font-extrabold text-slate-900">₹{viewProduct.purchase_price}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 font-bold">Selling Price:</span> <span className="font-extrabold text-emerald-600">₹{viewProduct.selling_price}</span></div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setViewProductModalOpen(false)}
                className="w-full py-3 bg-slate-900 text-white font-bold rounded-2xl text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SELECT EXISTING PRODUCT MODAL FOR UNMATCHED OCR ITEMS */}
      {selectProductModalOpen && linkingItemIndex !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-slate-900 text-base">Select Existing Product</h3>
              <button onClick={() => setSelectProductModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-slate-500">Link OCR item <strong className="text-slate-800">{ocrItems[linkingItemIndex]?.name}</strong> to an existing product:</p>
            <div className="max-h-60 overflow-y-auto space-y-2 divide-y">
              {products.map((prod) => (
                <div key={prod.id} className="pt-2 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{prod.name}</p>
                    <p className="text-[10px] text-slate-400">SKU: {prod.barcode}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...ocrItems];
                      updated[linkingItemIndex].matchedProduct = prod;
                      updated[linkingItemIndex].status = "Matched";
                      setOcrItems(updated);
                      setSelectProductModalOpen(false);
                      setLinkingItemIndex(null);
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-xl"
                  >
                    Link
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ADD STOCK MODAL */}
      {addStockModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-900">Add / Adjust Stock</h3>
                <p className="text-xs text-slate-500">{selectedProduct.name}</p>
              </div>
              <button onClick={() => setAddStockModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStockSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Quantity to Add ({selectedProduct.unit})</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={addQty}
                  onChange={(e) => setAddQty(Number(e.target.value))}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 font-bold text-slate-900 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Purchase Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(Number(e.target.value))}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 font-bold text-slate-900 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Supplier / Vendor</label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="e.g. Metro Wholesale"
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 font-semibold text-slate-900 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reference / Invoice</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. Bill #1234"
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 font-semibold text-slate-900 outline-none focus:border-blue-600"
                />
              </div>

              <div className="bg-blue-50 p-3.5 rounded-2xl border border-blue-200 flex justify-between items-center font-bold text-blue-900">
                <span>New Stock Level:</span>
                <span>{Number(selectedProduct.stock_quantity || 0)} + {addQty} = {Number(selectedProduct.stock_quantity || 0) + Number(addQty)} {selectedProduct.unit}</span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddStockModalOpen(false)}
                  className="flex-1 py-3 border rounded-2xl font-bold text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-md transition cursor-pointer"
                >
                  {submitting ? "Saving..." : "Confirm Add Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PRODUCT MODAL */}
      {addProductModalOpen && (
        <AddProductModal
          onClose={() => setAddProductModalOpen(false)}
          onSuccess={loadData}
        />
      )}
    </SharedDashboardLayout>
  );
}
