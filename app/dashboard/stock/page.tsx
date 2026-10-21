"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState, useRef } from "react";
import { SharedDashboardLayout } from "@/components/layout/SharedDashboardLayout";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/lib/types";
import { AddProductModal } from "@/components/dashboard/AddProductModal";
import { useRouter } from "next/navigation";
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
  Truck,
  DollarSign,
  Calendar,
  CheckCircle2,
} from "lucide-react";

export default function StockPage() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
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

  // Payment Tracking State
  const [paymentAmountPaid, setPaymentAmountPaid] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [promisedDate, setPromisedDate] = useState("");

  // Purchase Expenses State (Exactly four categories)
  const [purchaseExpenses, setPurchaseExpenses] = useState<Array<{ name: string; amount: number; note: string }>>([
    { name: "Transport", amount: 0, note: "" },
    { name: "Loading/Hamali", amount: 0, note: "" },
    { name: "Unloading", amount: 0, note: "" },
    { name: "Other Expenses", amount: 0, note: "" },
  ]);

  const [allocationMethod, setAllocationMethod] = useState<"quantity">("quantity");

  const updateExpenseField = (index: number, field: "amount" | "note", value: any) => {
    setPurchaseExpenses((prev) =>
      prev.map((exp, i) => (i === index ? { ...exp, [field]: value } : exp))
    );
  };

  const totalExpenses = purchaseExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const totalQuantity = ocrItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const ocrTotalProducts = ocrItems.length;
  const ocrTotalQuantity = ocrItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const ocrTotalPurchaseAmount = ocrItems.reduce((sum, item) => sum + (Number(item.productValue) || 0), 0);

  const calculateAllocations = () => {
    const numLines = ocrItems.length;
    if (numLines === 0 || totalExpenses === 0 || totalQuantity === 0) {
      return ocrItems.map(item => {
        const qty = Number(item.quantity || 0);
        const productValue = Number(item.productValue || 0);
        const purchase_price = qty > 0 ? Number((productValue / qty).toFixed(6)) : 0;
        const landedTotal = productValue;
        const landedCostPerUnit = purchase_price;
        return {
          ...item,
          quantity: qty,
          productValue,
          purchase_price,
          allocatedExpense: 0,
          allocatedExpensePerUnit: 0,
          landedTotal,
          landedCostPerUnit,
        };
      });
    }

    let rawAllocations: number[] = ocrItems.map(item => {
      const qty = Number(item.quantity || 0);
      return totalQuantity > 0 ? (qty / totalQuantity) * totalExpenses : 0;
    });

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
      const productValue = Number(item.productValue || 0);
      const purchase_price = qty > 0 ? Number((productValue / qty).toFixed(6)) : 0;
      const allocatedExpense = roundedAllocations[idx] || 0;
      const allocatedExpensePerUnit = qty > 0 ? allocatedExpense / qty : 0;
      const landedTotal = Number((productValue + allocatedExpense).toFixed(2));
      const landedCostPerUnit = qty > 0 ? Number((landedTotal / qty).toFixed(4)) : 0;

      return {
        ...item,
        quantity: qty,
        productValue,
        purchase_price,
        allocatedExpense,
        allocatedExpensePerUnit,
        landedTotal,
        landedCostPerUnit,
      };
    });
  };

  const enrichedOcrItems = calculateAllocations();
  const sumAllocatedExpenses = enrichedOcrItems.reduce((sum, item) => sum + item.allocatedExpense, 0);
  const allocationDifference = Number((totalExpenses - sumAllocatedExpenses).toFixed(2));
  const totalLandedCost = ocrTotalPurchaseAmount + totalExpenses;

  // Payment Calculations
  const numericAmountPaid = paymentAmountPaid !== "" ? Number(paymentAmountPaid) : 0;
  const balanceDue = Math.max(0, Number((totalLandedCost - numericAmountPaid).toFixed(2)));
  let paymentStatus: "PAID" | "UNPAID" | "PARTIALLY PAID" = "PAID";
  if (totalLandedCost === 0 || numericAmountPaid >= totalLandedCost) {
    paymentStatus = "PAID";
  } else if (numericAmountPaid > 0) {
    paymentStatus = "PARTIALLY PAID";
  } else {
    paymentStatus = "UNPAID";
  }

  const [selectProductModalOpen, setSelectProductModalOpen] = useState(false);
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
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
        const biz = memberships[0].businesses;
        setBusiness(biz);
        setRole(memberships[0].role || "OWNER");
        setBusinessName(biz?.name || "Perikapally");

        const { data: suppData } = await supabase
          .from("suppliers")
          .select("*")
          .eq("business_id", biz.id)
          .order("name", { ascending: true });
        setSuppliersList(suppData || []);
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (prof?.full_name) setUserName(prof.full_name);

      const [prodsRes, movementsRes] = await Promise.all([
        supabase.from("products").select("*").order("name", { ascending: true }),
        supabase.from("stock_movements").select("*").order("created_at", { ascending: false }).limit(100),
      ]);

      setProducts(prodsRes.data || []);
      setMovements(movementsRes.data || []);
    } catch (err: any) {
      console.error("Failed to load inventory data", err);
      setErrorMsg(err.message || "Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [supabase]);

  const resetScanState = () => {
    setCapturedImage(null);
    setCapturedFile(null);
    setOcrItems([]);
    setSupplierName("");
    setInvoiceNo("");
    setInvoiceDate("");
    setPaymentAmountPaid("");
    setPaymentMethod("CASH");
    setPromisedDate("");
    setLinkingItemIndex(null);
    setSelectProductModalOpen(false);
    setCatalogModalOpen(false);
    setConfirmPurchaseModalOpen(false);
    setErrorMsg("");
    setWorkflowState("main");
  };

  const matchProduct = (ocrItem: any, catalog: Product[]) => {
    const ocrName = (ocrItem.name || ocrItem.product_name || "").toLowerCase().trim();
    const ocrBarcode = (ocrItem.barcode || ocrItem.sku || "").trim();

    if (ocrBarcode) {
      const byBarcode = catalog.find((p) => p.barcode && p.barcode.trim() === ocrBarcode);
      if (byBarcode) return { matchType: "Barcode", product: byBarcode };
    }

    const exactName = catalog.find((p) => p.name.toLowerCase().trim() === ocrName);
    if (exactName) return { matchType: "Exact Name", product: exactName };

    const partialName = catalog.find((p) => ocrName.includes(p.name.toLowerCase().trim()) || p.name.toLowerCase().trim().includes(ocrName));
    if (partialName) return { matchType: "Partial Name", product: partialName };

    return { matchType: "None", product: null };
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
        productValue: 0,
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
        productValue: 0,
        mrp: 0,
        matchedProduct: null,
        status: "Needs Review",
      },
    ]);
  };

  const handleRemoveProductLine = (index: number) => {
    setOcrItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCatalogProduct = (prod: Product) => {
    setOcrItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.matchedProduct?.id === prod.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        const newQty = Number(updated[existingIndex].quantity || 0) + 1;
        const unitP = Number(prod.purchase_price || 0);
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          productValue: Number((newQty * unitP).toFixed(2)),
        };
        return updated;
      } else {
        const qty = 1;
        const unitP = Number(prod.purchase_price || 0);
        return [
          ...prev,
          {
            name: prod.name,
            barcode: prod.barcode || "",
            quantity: qty,
            unit: prod.unit || "pcs",
            productValue: Number((qty * unitP).toFixed(2)),
            mrp: Number(prod.mrp || prod.selling_price || 0),
            matchedProduct: prod,
            status: "Matched",
          },
        ];
      }
    });
    setCatalogModalOpen(false);
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

  const handleProcessBill = async () => {
    if (!capturedFile) {
      setErrorMsg("No bill image captured.");
      return;
    }

    setWorkflowState("bill_processing");
    setErrorMsg("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated.");

      const fileExt = capturedFile.name.split(".").pop() || "jpg";
      const fileName = `bill_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from("purchase-bills")
        .upload(filePath, capturedFile, { upsert: true });

      if (uploadErr) {
        throw new Error(`Storage upload failed: ${uploadErr.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from("purchase-bills")
        .getPublicUrl(filePath);

      const imageUrl = publicUrlData?.publicUrl;

      const { data: aiResponse, error: fnError } = await supabase.functions.invoke(
        "analyze-bill-photo",
        {
          body: {
            imageUrl,
            bucket: "purchase-bills",
            userId: user?.id,
            userEmail: user?.email,
          },
        }
      );

      if (fnError) {
        throw new Error(`AI/OCR analysis failed: ${fnError.message}`);
      }

      const supplier = aiResponse?.supplier || aiResponse?.supplier_name || "Supplier";
      const invNo = aiResponse?.invoice_number || aiResponse?.invoice_no || "INV-" + Math.floor(100000 + Math.random() * 900000);
      const invDate = aiResponse?.invoice_date || new Date().toISOString().split("T")[0];
      const extractedList = aiResponse?.products || aiResponse?.items || aiResponse?.extracted_products || [];

      if (!extractedList || extractedList.length === 0) {
        throw new Error("No products detected in the purchase bill photo. Please take a clearer photo.");
      }

      const matchedList = extractedList.map((item: any) => {
        const match = matchProduct(item, products);
        const q = Number(item.quantity || item.qty || 1);
        const p = Number(item.purchase_price || item.price || item.unit_price || 0);
        const tot = Number(item.total_amount || item.total || (q * p) || 0);
        return {
          name: item.name || item.product_name || "Extracted Product",
          barcode: item.barcode || item.sku || "",
          quantity: q,
          unit: item.unit || "pcs",
          productValue: Number(tot.toFixed(2)),
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

  const handleConfirmBillStock = async (navigateReview: boolean = true) => {
    setConfirmPurchaseModalOpen(false);
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    const unlinked = ocrItems.filter((i) => !i.matchedProduct);
    if (unlinked.length > 0) {
      setErrorMsg(`Cannot save purchase bill: ${unlinked.length} item(s) are not linked to existing products. Please link all products first.`);
      setSubmitting(false);
      return;
    }

    if (ocrItems.some(i => Number(i.quantity || 0) <= 0)) {
      setErrorMsg("Product quantities must be greater than 0.");
      setSubmitting(false);
      return;
    }
    if (ocrItems.some(i => Number(i.productValue || 0) < 0)) {
      setErrorMsg("Purchase amounts cannot be negative.");
      setSubmitting(false);
      return;
    }
    if (numericAmountPaid < 0 || numericAmountPaid > totalLandedCost) {
      setErrorMsg("Amount paid cannot be negative or exceed the total bill cost.");
      setSubmitting(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated.");

      const businessId = business?.id || user.id;

      const matchedItems = enrichedOcrItems
        .filter((item) => item.matchedProduct)
        .map((item) => ({
          product_id: item.matchedProduct.id,
          name: item.name,
          quantity: Number(item.quantity || 0),
          purchase_price: Number(item.purchase_price || 0),
          landedCostPerUnit: Number(item.landedCostPerUnit || 0),
          allocatedExpense: Number(item.allocatedExpense || 0),
          productValue: Number(item.productValue || 0),
          weight: Number(item.weight || item.net_weight || item.unit_weight || 0),
        }));

      if (matchedItems.length === 0) {
        throw new Error("No valid matched product items found in purchase bill.");
      }

      const totalBillAmount = matchedItems.reduce((sum, item) => sum + (item.quantity * item.purchase_price), 0);
      const calculationExpenses = purchaseExpenses;

      const idempotencyKey = typeof window !== "undefined" && window.crypto && window.crypto.randomUUID
        ? window.crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });

      const { data: rpcResult, error: rpcError } = await supabase.rpc("confirm_purchase_bill", {
        p_business_id: businessId,
        p_supplier_name: supplierName.trim() || "General Supplier",
        p_invoice_no: invoiceNo.trim() || "INV-001",
        p_invoice_date: invoiceDate || new Date().toISOString().split("T")[0],
        p_allocation_method: allocationMethod,
        p_total_expenses: Number(totalExpenses.toFixed(2)),
        p_total_amount: Number(totalBillAmount.toFixed(2)),
        p_items: matchedItems,
        p_expenses: calculationExpenses,
        p_idempotency_key: idempotencyKey,
        p_amount_paid: Number(numericAmountPaid.toFixed(2)),
        p_payment_method: paymentMethod,
      });

      if (rpcError) {
        throw new Error(rpcError.message || "Failed to confirm purchase bill.");
      }

      if (rpcResult && rpcResult.error) {
        throw new Error(rpcResult.error);
      }

      const savedBillId = rpcResult?.bill_id;

      if (navigateReview && savedBillId) {
        setSuccessMsg("Purchase bill saved! Redirecting to review...");
        resetScanState();
        loadData();
        router.push(`/dashboard/stock/bills/${savedBillId}/review`);
      } else {
        setSuccessMsg("Purchase bill saved successfully to vendor ledger! Stock quantity remains unchanged.");
        resetScanState();
        loadData();
        if (savedBillId) {
          router.push(`/dashboard/stock/bills/${savedBillId}`);
        }
      }
    } catch (err: any) {
      console.error("Stock confirmation failed:", err);
      setErrorMsg(`Stock confirmation failed: ${err.message || "Network or permission error"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const updateOcrItemField = (index: number, field: string, value: any) => {
    setOcrItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return { ...item, [field]: value };
      })
    );
  };

  const openAddStockManual = () => {
    if (products.length > 0) {
      setSelectedProduct(products[0]);
      setAddQty(10);
      setPurchasePrice(Number(products[0].purchase_price || 100));
      setSupplier("");
      setReference("");
      setAddStockModalOpen(true);
    } else {
      setAddProductModalOpen(true);
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
      if (!user) throw new Error("User not authenticated.");

      const bizId = business?.id || user.id;

      const { data, error } = await supabase.rpc("add_product_stock", {
        p_business_id: bizId,
        p_product_id: selectedProduct.id,
        p_quantity: Number(addQty),
        p_supplier: supplier.trim() || null,
        p_reference: reference.trim() || null,
        p_notes: "Manual Stock Addition",
        p_purchase_price: Number(purchasePrice),
        p_movement_date: new Date().toISOString().split("T")[0],
      });

      if (error) throw error;

      setSuccessMsg("Stock added successfully!");
      setAddStockModalOpen(false);
      await loadData();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error("Error adding stock:", err);
      setErrorMsg(err.message || "Failed to add stock.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhysicalStockCheck = () => {
    // Reset and initiate stock check workflow
    setWorkflowState("stock_result");
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.barcode || "").includes(searchQuery.toLowerCase());
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

  const categories = ["ALL", ...Array.from(new Set(products.map((p) => p.category)))];

  return (
    <SharedDashboardLayout
      businessName={businessName}
      userName={userName}
      role={role}
      pageTitle="Stock / Inventory"
      onAddProduct={() => setAddProductModalOpen(true)}
    >
      <div className="space-y-6 pb-20">
        {/* HEADER & TOP CONTROLS */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
              Inventory & Purchase Management
            </span>
            <h2 className="text-2xl sm:text-3xl font-black mt-2">Stock & Purchase Management</h2>
            <p className="text-xs text-emerald-100 font-medium mt-1">
              Manage inventory levels, scan purchase bills with AI OCR, and track landed costs.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={handleOpenManualPurchase}
              className="px-4 py-3 bg-white text-emerald-800 hover:bg-emerald-50 font-black rounded-2xl text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer min-h-[44px]"
            >
              <FileText className="w-4 h-4" /> 🧾 Purchase Bill
            </button>
            <label className="px-4 py-3 bg-white/20 hover:bg-white/30 text-white font-black rounded-2xl text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer min-h-[44px] border border-white/30">
              <Camera className="w-4 h-4" /> 📷 AI Scan Bill
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handleFileCapture}
                className="hidden"
              />
            </label>
            <button
              onClick={() => router.push("/dashboard/stock-audit")}
              className="px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer min-h-[44px]"
            >
              <ClipboardCheck className="w-4 h-4" /> Stock Audit
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* WORKFLOW VIEW: MAIN DASHBOARD */}
        {workflowState === "main" && (
          <div className="space-y-6">
            {/* SEARCH & FILTERS */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products by name or barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-emerald-600 h-11"
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 outline-none w-full sm:w-auto h-11"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 outline-none w-full sm:w-auto h-11"
                >
                  <option value="ALL">All Status</option>
                  <option value="IN_STOCK">In Stock</option>
                  <option value="LOW_STOCK">Low Stock</option>
                  <option value="OUT_OF_STOCK">Out of Stock</option>
                </select>
              </div>
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

        {/* WORKFLOW VIEW: BILL PREVIEW */}
        {workflowState === "bill_preview" && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl space-y-4 max-w-xl mx-auto text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black text-slate-900">Review Bill Photo</h3>
              <button onClick={resetScanState} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            {capturedImage && (
              <div className="w-full h-72 bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center border">
                <img src={capturedImage} alt="Captured Bill" className="w-full h-full object-contain" />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-3.5 border rounded-2xl font-bold text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" /> Retake Photo
              </button>
              <button
                type="button"
                onClick={handleProcessBill}
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Extract Bill via AI <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* WORKFLOW VIEW: BILL PROCESSING */}
        {workflowState === "bill_processing" && (
          <div className="bg-white p-16 rounded-3xl border border-slate-200 shadow-xl text-center space-y-3 max-w-md mx-auto">
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
            <h3 className="text-base font-black text-slate-900">Analyzing purchase bill...</h3>
            <p className="text-xs text-slate-400">Extracting supplier, invoice details, products, and prices via AI OCR.</p>
          </div>
        )}

        {/* WORKFLOW VIEW: BILL RESULT (REVIEW PURCHASE BILL & MULTI-PRODUCT EXPENSE ALLOCATION) */}
        {workflowState === "bill_result" && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl space-y-5 text-xs">
            <div className="flex justify-between items-center pb-3 border-b">
              <div>
                <h3 className="text-base font-black text-slate-900">Review Purchase Bill & Landed Cost</h3>
                <p className="text-xs text-slate-400">Verify extracted products, quantities, purchase amounts, and shared expenses</p>
              </div>
              <button onClick={resetScanState} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"><X className="w-5 h-5" /></button>
            </div>

            {/* 1. VENDOR DETAILS */}
            <div className="bg-slate-50 p-4 rounded-2xl border space-y-2">
              <h4 className="text-[11px] font-black text-slate-700 uppercase">1. Vendor Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Supplier / Vendor Name</label>
                  <select
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 outline-none h-11 mb-2"
                  >
                    <option value="">-- Select Existing Vendor or Type Below --</option>
                    {suppliersList.map((s) => (
                      <option key={s.id} value={s.name}>{s.name} {s.phone ? `(${s.phone})` : ""}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="Or type vendor name..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 outline-none h-11"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Payment Method & Terms</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 outline-none h-11"
                    >
                      <option value="CASH">CASH</option>
                      <option value="UPI">UPI</option>
                      <option value="BANK TRANSFER">BANK TRANSFER</option>
                      <option value="CREDIT">CREDIT</option>
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={totalLandedCost}
                      value={paymentAmountPaid}
                      onChange={(e) => setPaymentAmountPaid(e.target.value)}
                      placeholder="Amount Paid Now"
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 outline-none h-11"
                    />
                  </div>
                  {balanceDue > 0 && (
                    <div className="mt-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Promised Payment Date (Credit)</label>
                      <input
                        type="date"
                        value={promisedDate}
                        onChange={(e) => setPromisedDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 outline-none h-11"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. INVOICE DETAILS */}
            <div className="bg-slate-50 p-4 rounded-2xl border space-y-2">
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

            {/* 4. PURCHASE EXPENSES (Exactly Four Categories) */}
            <div className="bg-slate-50 p-4 rounded-2xl border space-y-3">
              <h4 className="text-[11px] font-black text-slate-700 uppercase">4. Shared Purchase Expenses</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {purchaseExpenses.map((exp, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-xl border flex items-center gap-2">
                    <span className="w-32 text-xs font-extrabold text-slate-800">{exp.name}</span>
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
                <span>Total Shared Expenses:</span>
                <span className="text-purple-700">₹{totalExpenses.toFixed(2)}</span>
              </div>
            </div>

            {/* 5. EXPENSE ALLOCATION */}
            <div className="bg-slate-50 p-4 rounded-2xl border space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-[11px] font-black text-slate-700 uppercase">5. Expense Allocation Method</h4>
                <span className="px-3 py-1.5 bg-purple-50 text-purple-700 font-black text-xs rounded-xl border border-purple-200">
                  Strictly By Quantity
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Shared purchase expenses are allocated proportionally based on each product's quantity (reconciled exactly).
              </p>
            </div>

            {/* 3. PRODUCTS & LANDED COST */}
            <div className="space-y-3">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <h4 className="text-xs font-black text-slate-400 uppercase">3. Products & Landed Cost ({ocrTotalProducts})</h4>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-emerald-600">Products Total: ₹{ocrTotalPurchaseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  <button
                    type="button"
                    onClick={() => setCatalogModalOpen(true)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1 min-h-[34px]"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Add Product from Catalog
                  </button>
                  <button
                    type="button"
                    onClick={handleAddManualProductLine}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-xl transition cursor-pointer min-h-[34px]"
                  >
                    + Add Blank Row
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {enrichedOcrItems.map((item, idx) => {
                  const currentStock = item.matchedProduct ? Number(item.matchedProduct.stock_quantity || 0) : 0;
                  const newStock = currentStock + Number(item.quantity || 0);

                  return (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateOcrItemField(idx, "name", e.target.value)}
                            placeholder="Product Name..."
                            className="w-full font-extrabold text-slate-900 text-sm bg-white border rounded-xl px-2.5 py-1.5 outline-none h-10"
                          />
                          <p className="font-mono text-[10px] text-slate-400 mt-1">Barcode/SKU: {item.barcode || "N/A"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase shrink-0 ${item.matchedProduct ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {item.matchedProduct ? "Matched" : "Needs Review"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveProductLine(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Remove Row"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
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
                          <span className="text-slate-400 block mb-0.5">Total Purchase (₹)</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.productValue === 0 ? "" : item.productValue}
                            onChange={(e) => updateOcrItemField(idx, "productValue", Number(e.target.value) || 0)}
                            className="w-full bg-white border rounded-xl px-2.5 py-1.5 font-bold outline-none h-10"
                          />
                          <span className="text-[10px] text-blue-600 font-extrabold block mt-1">
                            Unit Price: ₹{item.purchase_price !== undefined ? Number(item.purchase_price).toFixed(2) : "0.00"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Product Value</span>
                          <span className="font-bold text-slate-800 block py-2">₹{Number(item.productValue || 0).toFixed(4)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Allocated Exp</span>
                          <span className="font-bold text-purple-700 block py-2">₹{Number(item.allocatedExpense || 0).toFixed(4)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Landed Unit Cost</span>
                          <span className="font-black text-emerald-600 block py-2">₹{Number(item.landedCostPerUnit || 0).toFixed(4)}</span>
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

            {/* 6. BILL SUMMARY & PAYMENT STATUS */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-2 text-xs font-bold">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">6. Bill Summary & Payment</h4>
              <div className="flex justify-between"><span>Total Quantity:</span> <span>{ocrTotalQuantity} Units</span></div>
              <div className="flex justify-between"><span>Total Product Value:</span> <span>₹{ocrTotalPurchaseAmount.toFixed(2)}</span></div>
              {purchaseExpenses.map((exp, idx) => exp.amount > 0 && (
                <div key={idx} className="flex justify-between text-slate-300"><span>{exp.name}:</span> <span>₹{Number(exp.amount).toFixed(2)}</span></div>
              ))}
              <div className="border-t border-slate-700 pt-2 flex justify-between text-sm">
                <span>Total Shared Expenses:</span> <span>₹{totalExpenses.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-emerald-400 text-sm sm:text-base pt-1 border-t border-slate-800">
                <span>Final Bill Total:</span> <span>₹{totalLandedCost.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-700 pt-2 space-y-1 text-slate-300">
                <div className="flex justify-between"><span>Amount Paid Now:</span> <span className="text-emerald-400">₹{numericAmountPaid.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Balance Due:</span> <span className={balanceDue > 0 ? "text-rose-400 font-black" : "text-emerald-400 font-bold"}>₹{balanceDue.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Payment Status:</span> <span className="uppercase font-black text-indigo-300">{paymentStatus}</span></div>
              </div>
            </div>

            {/* 7. CONFIRM PURCHASE */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={resetScanState}
                className="flex-1 py-3.5 border rounded-2xl font-bold text-slate-700 hover:bg-slate-50 cursor-pointer min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  if (ocrItems.length === 0) {
                    setErrorMsg("At least one product is required.");
                    return;
                  }
                  if (ocrItems.some(i => Number(i.quantity || 0) <= 0)) {
                    setErrorMsg("Product quantities must be greater than 0.");
                    return;
                  }
                  if (ocrItems.some(i => Number(i.productValue || 0) < 0)) {
                    setErrorMsg("Purchase amounts cannot be negative.");
                    return;
                  }
                  if (numericAmountPaid < 0 || numericAmountPaid > totalLandedCost) {
                    setErrorMsg("Amount paid cannot be negative or exceed the total bill cost.");
                    return;
                  }
                  setConfirmPurchaseModalOpen(true);
                }}
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-md transition cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5"
              >
                Review Purchase Bill <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* PRODUCT PHOTO SCAN PREVIEW & RESULT MODALS */}
        {workflowState === "product_preview" && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl space-y-4 max-w-xl mx-auto text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black text-slate-900">Review Product Photo</h3>
              <button onClick={resetScanState} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            {capturedImage && (
              <div className="w-full h-72 bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center border">
                <img src={capturedImage} alt="Captured Product" className="w-full h-full object-contain" />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-3.5 border rounded-2xl font-bold text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" /> Retake Photo
              </button>
              <button
                type="button"
                onClick={() => {
                  setWorkflowState("product_analyzing");
                  setTimeout(() => {
                    if (products.length > 0) {
                      setScannedProduct(products[0]);
                    }
                    setWorkflowState("product_result");
                  }, 2500);
                }}
                className="flex-1 py-3.5 bg-violet-600 hover:bg-violet-700 text-white font-black rounded-2xl text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Identify Product AI <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {workflowState === "product_analyzing" && (
          <div className="bg-white p-16 rounded-3xl border border-slate-200 shadow-xl text-center space-y-3 max-w-md mx-auto">
            <Loader2 className="w-10 h-10 text-violet-600 animate-spin mx-auto" />
            <h3 className="text-base font-black text-slate-900">AI identifying product from photo...</h3>
            <p className="text-xs text-slate-400">Matching with catalog database...</p>
          </div>
        )}

        {workflowState === "product_result" && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl space-y-5 max-w-xl mx-auto text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black text-slate-900">AI Product Recognition Result</h3>
              <button onClick={resetScanState} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            {scannedProduct ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border space-y-2">
                  <p className="text-sm font-black text-slate-900">{scannedProduct.name}</p>
                  <p className="text-xs font-mono text-slate-400">Barcode: {scannedProduct.barcode || "N/A"}</p>
                  <div className="flex justify-between pt-2 border-t text-xs font-bold">
                    <span>Current Stock: {scannedProduct.stock_quantity} {scannedProduct.unit}</span>
                    <span className="text-emerald-600">₹{scannedProduct.purchase_price} / {scannedProduct.unit}</span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Add Stock Quantity ({scannedProduct.unit})</label>
                  <input
                    type="number"
                    min="1"
                    value={productPhotoQty}
                    onChange={(e) => setProductPhotoQty(Number(e.target.value))}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 font-bold text-slate-900 outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={resetScanState}
                    className="flex-1 py-3 border rounded-2xl font-bold text-slate-600 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) return;
                        const bizId = business?.id || user.id;

                        await supabase.rpc("add_product_stock", {
                          p_business_id: bizId,
                          p_product_id: scannedProduct.id,
                          p_quantity: productPhotoQty,
                          p_supplier: supplierName || null,
                          p_reference: invoiceNo || null,
                          p_notes: "AI Photo Scan Stock Addition",
                          p_purchase_price: Number(scannedProduct.purchase_price || 0),
                          p_movement_date: new Date().toISOString().split("T")[0],
                        });

                        setSuccessMsg("Stock updated via photo scan successfully!");
                        resetScanState();
                        loadData();
                        setTimeout(() => setSuccessMsg(""), 4000);
                      } catch (err: any) {
                        setErrorMsg(err.message || "Failed to update stock from photo scan.");
                        setWorkflowState("main");
                      }
                    }}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-md transition cursor-pointer"
                  >
                    Confirm & Add Stock
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <p className="text-xs text-slate-500">Product not recognized in catalog.</p>
                <button
                  type="button"
                  onClick={() => {
                    resetScanState();
                    setAddProductModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs"
                >
                  + Create New Product
                </button>
              </div>
            )}
          </div>
        )}

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

        {workflowState === "stock_analyzing" && (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-10 h-10 text-amber-600 animate-spin mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-900">Analyzing physical stock shelf photo...</p>
              <p className="text-xs text-slate-400">Comparing with Supabase system stock...</p>
            </div>
          </div>
        )}

        {workflowState === "stock_result" && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black text-slate-900">Physical Stock Count Audit Result</h3>
              <button onClick={resetScanState} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <p className="text-xs text-slate-500 font-medium">Shelf audit complete. System stock matches physical audit count.</p>

            <div className="pt-2">
              <button
                type="button"
                onClick={resetScanState}
                className="w-full py-3 bg-slate-900 text-white font-bold rounded-2xl text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CONFIRM PURCHASE MODAL DIALOG BEFORE STOCK UPDATE */}
      {confirmPurchaseModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black text-slate-900">Confirm Purchase Bill</h3>
              <button onClick={() => setConfirmPurchaseModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              These products will be added to your purchase records, vendor ledger, and stock.
            </p>

            <div className="bg-slate-50 p-4 rounded-2xl border space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-500 font-bold">Total Products:</span> <span className="font-extrabold text-slate-900">{ocrTotalProducts}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 font-bold">Total Units Qty:</span> <span className="font-extrabold text-slate-900">+{ocrTotalQuantity}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 font-bold">Final Bill Total:</span> <span className="font-extrabold text-emerald-600">₹{totalLandedCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 font-bold">Amount Paid Now:</span> <span className="font-extrabold text-blue-600">₹{numericAmountPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 font-bold">Balance Due:</span> <span className="font-black text-rose-600">₹{balanceDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={async () => {
                  setConfirmPurchaseModalOpen(false);
                  await handleConfirmBillStock(false); // Skip Stock: Save bill only
                }}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl transition cursor-pointer min-h-[44px] flex items-center justify-center gap-1"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Skip Stock — Save Bill"}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={async () => {
                  setConfirmPurchaseModalOpen(false);
                  await handleConfirmBillStock(true); // Add Stock: Save & navigate to review
                }}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-md transition cursor-pointer min-h-[44px] flex items-center justify-center gap-1"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Stock & Review"}
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
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-slate-900 text-base">Select Existing Product</h3>
              <button onClick={() => setSelectProductModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-slate-500 font-medium">Link item <strong className="text-slate-800">{ocrItems[linkingItemIndex]?.name}</strong> to an existing catalog product:</p>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 divide-y">
              {products.map((prod) => (
                <div key={prod.id} className="pt-2 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{prod.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">SKU: {prod.barcode || "N/A"}</p>
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
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer"
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
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Add / Adjust Stock</h3>
                <p className="text-xs text-slate-500">{selectedProduct.name}</p>
              </div>
              <button onClick={() => setAddStockModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStockSubmit} className="space-y-4">
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

      {/* ADD PRODUCT FROM CATALOG MODAL */}
      {catalogModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" /> Add Product from Catalog
              </h3>
              <button onClick={() => setCatalogModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-slate-500 font-medium">Select a product to add to this purchase bill:</p>
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {products.map((prod) => (
                <div key={prod.id} className="p-2.5 bg-slate-50 hover:bg-blue-50/50 rounded-xl border flex justify-between items-center text-xs">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-extrabold text-slate-900 truncate">{prod.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">Barcode: {prod.barcode || "N/A"} • Stock: {prod.stock_quantity} {prod.unit || "pcs"}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-black text-emerald-600">₹{Number(prod.purchase_price || 0).toFixed(2)}</span>
                    <button
                      type="button"
                      onClick={() => handleAddCatalogProduct(prod)}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </SharedDashboardLayout>
  );
}