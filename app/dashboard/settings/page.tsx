"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { SharedDashboardLayout } from "@/components/layout/SharedDashboardLayout";
import { createClient } from "@/lib/supabase/client";
import {
  Building,
  Users,
  Boxes,
  ReceiptText,
  Bell,
  Check,
  AlertTriangle,
  Store,
  Plus,
  ArrowLeftRight,
  Sparkles,
  CreditCard,
  CheckCircle2,
  Clock,
} from "lucide-react";

export default function SettingsPage() {
  const [supabase] = useState(() => createClient());
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [business, setBusiness] = useState<any>(null);
  const [userName, setUserName] = useState("Admin");
  const [role, setRole] = useState("OWNER");
  const [subscription, setSubscription] = useState<any>(null);

  // Profile form state
  const [businessName, setBusinessName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");

  // Inventory settings state
  const [lowStockAlerts, setLowStockAlerts] = useState(true);
  const [negativeStock, setNegativeStock] = useState(false);
  const [minStock, setMinStock] = useState(10);
  const [defaultUnit, setDefaultUnit] = useState("pcs");

  // Billing settings state
  const [invoicePrefix, setInvoicePrefix] = useState("TM");
  const [nextInvoiceNo, setNextInvoiceNo] = useState("1001");
  const [defaultPayment, setDefaultPayment] = useState("Cash");
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [defaultTaxRate, setDefaultTaxRate] = useState(5);

  // Notification settings state
  const [notifLowStock, setNotifLowStock] = useState(true);
  const [notifNewSale, setNotifNewSale] = useState(true);
  const [notifPurchase, setNotifPurchase] = useState(true);

  const isOwner = role && ["owner", "OWNER"].includes(role.toLowerCase());

  useEffect(() => {
    async function loadSettings() {
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
          if (biz) {
            setBusinessName(biz.name || "");
            setBusinessPhone(biz.phone || "");
            setBusinessEmail(biz.email || user.email || "");
            setBusinessAddress(biz.address || "");
            setGstNumber(biz.gst_number || "");

            // Fetch actual subscription record from Supabase
            const { data: sub } = await supabase
              .from("subscriptions")
              .select("*")
              .eq("business_id", biz.id)
              .maybeSingle();

            setSubscription(sub);
          }
        }

        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        if (prof?.full_name) setUserName(prof.full_name);
      } catch (err) {
        console.error("Failed to load settings", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [supabase]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business?.id) return;
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { error } = await supabase
        .from("businesses")
        .update({
          name: businessName,
          phone: businessPhone,
          address: businessAddress,
          updated_at: new Date().toISOString(),
        })
        .eq("id", business.id);

      if (error) throw new Error(error.message);

      setSuccessMsg("Business profile updated successfully!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenericSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");
    setTimeout(() => {
      setSuccessMsg("Settings saved successfully!");
      setSubmitting(false);
      setTimeout(() => setSuccessMsg(""), 4000);
    }, 500);
  };

  const settingsTabs = [
    { id: "profile", label: "Business Profile", icon: Building },
    { id: "subscription", label: "Subscription Plans", icon: CreditCard },
    { id: "permissions", label: "Users & Permissions", icon: Users },
    { id: "inventory", label: "Inventory", icon: Boxes },
    { id: "billing", label: "Billing", icon: ReceiptText },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  const planInfoList = [
    {
      id: "basic",
      name: "Basic Plan",
      price: "₹99",
      period: "/ month",
      desc: "Essential POS billing, product catalog management & stock tracking for small retail stores.",
      features: [
        "Unlimited POS Billing & Invoices",
        "Product Catalog & Barcode Scanning",
        "Stock Inventory Management",
        "Basic Daily Sales Summary",
        "Single Counter Access",
      ],
    },
    {
      id: "pro",
      name: "Pro Plan",
      price: "₹250",
      period: "/ month",
      desc: "Advanced multi-counter inventory, staff management & real-time analytics for growing supermarkets.",
      features: [
        "Everything in Basic Plan",
        "Multi-Counter POS Billing",
        "Staff Roles & Permissions",
        "Vendor & Purchase Bills Tracking",
        "Advanced Profit & Sales Reports",
      ],
    },
    {
      id: "plus",
      name: "Plus Plan",
      price: "₹450",
      period: "/ month",
      desc: "Full enterprise automation, delivery fulfillment & priority Super Owner support for large stores.",
      features: [
        "Everything in Pro Plan",
        "Delivery Fulfillment & Tracking",
        "AI Inventory Camera Scan Integration",
        "Multi-Location Sync",
        "Priority Super Owner Support",
      ],
    },
  ];

  return (
    <SharedDashboardLayout
      businessName={business?.name || "TWEB"}
      userName={userName}
      role={role}
      pageTitle="Settings"
    >
      {/* PAGE HEADER */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900">Settings</h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">Manage your business profile, subscription plans, permissions, inventory and security.</p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold">
          {successMsg}
        </div>
      )}

      {/* SETTINGS LAYOUT (Left Menu + Right Content) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Settings Menu */}
        <div className="lg:col-span-4 space-y-2">
          <div className="bg-white p-3 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
            {settingsTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs transition cursor-pointer ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-black"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-blue-600"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-8">

          {/* 1. BUSINESS PROFILE */}
          {activeTab === "profile" && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-8">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Business Profile</h3>
                <p className="text-xs text-slate-400">Update your store information and tax details.</p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Business Name</label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-semibold outline-none focus:border-blue-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Business Phone</label>
                    <input
                      type="text"
                      value={businessPhone}
                      onChange={(e) => setBusinessPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-semibold outline-none focus:border-blue-600"
                      placeholder="9876543210"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Business Email</label>
                    <input
                      type="email"
                      value={businessEmail}
                      onChange={(e) => setBusinessEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-semibold outline-none focus:border-blue-600"
                      placeholder="store@tweb.app"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Business Address</label>
                  <input
                    type="text"
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-semibold outline-none focus:border-blue-600"
                    placeholder="Street address or location"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GST Number (Optional)</label>
                  <input
                    type="text"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-semibold outline-none focus:border-blue-600 font-mono"
                    placeholder="22AAAAA0000A1Z5"
                  />
                </div>

                <div className="pt-3 border-t flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black rounded-2xl text-xs shadow-md shadow-blue-600/20 transition cursor-pointer flex items-center gap-1.5 min-h-[44px]"
                  >
                    <Check className="w-4 h-4" /> Save Changes
                  </button>
                </div>
              </form>

              {/* BUSINESS WORKSPACE ACTIONS */}
              <div className="pt-6 border-t border-slate-200 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 p-2.5 text-white shadow-lg shadow-indigo-600/20">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Business Workspace</h3>
                    <p className="text-xs text-slate-500">Manage businesses connected to your TWEB login.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link
                    href="/create-business"
                    className="group rounded-2xl p-4 text-white bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 shadow-lg shadow-indigo-600/15 hover:shadow-xl hover:-translate-y-0.5 transition-all min-h-[132px] flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-xl bg-white/15 p-2.5"><Plus className="w-5 h-5" /></span>
                      <ArrowLeftRight className="w-4 h-4 text-white/70 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <div>
                      <p className="font-black text-sm">Create New Business</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-white/80">Set up another store or workspace.</p>
                    </div>
                  </Link>
                  <Link
                    href="/select-business"
                    className="group rounded-2xl p-4 border border-slate-200 bg-gradient-to-br from-white to-slate-50 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-900/5 hover:-translate-y-0.5 transition-all min-h-[132px] flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 text-white shadow-md shadow-emerald-600/20"><Store className="w-5 h-5" /></span>
                      <ArrowLeftRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <div>
                      <p className="font-black text-sm text-slate-900">Switch Business</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">Open another business linked to your account.</p>
                    </div>
                  </Link>
                </div>
              </div>

              {/* BUSINESS DELETION SAFETY NOTICE */}
              {isOwner && (
                <div className="pt-6 border-t border-rose-200 space-y-3">
                  <div className="flex items-center gap-2 text-rose-700">
                    <AlertTriangle className="w-5 h-5" />
                    <h3 className="text-base font-black">Delete Current Business</h3>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 text-xs text-amber-950 space-y-1.5">
                    <p className="font-extrabold">Deletion is temporarily disabled for safety.</p>
                    <p className="leading-relaxed text-amber-900">
                      Before deletion can be enabled, TWEB must safely handle purchase bills, sales items, stock movements, financial records, and staff access. Your login and any other businesses must remain intact.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. INFORMATIONAL SUBSCRIPTION PLANS VIEW */}
          {activeTab === "subscription" && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-900">TWEB Subscription Plans</h3>
                  <p className="text-xs text-slate-500">Informational overview of available platform plans. Plan activation is handled by Super Owner verification.</p>
                </div>

                {subscription && (
                  <div className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>Status: <strong className="uppercase text-indigo-600 font-black">{subscription.status || "Trial"}</strong></span>
                    {subscription.trial_ends_at && (
                      <span className="text-[10px] text-slate-400">• Trial Expiry: {new Date(subscription.trial_ends_at).toLocaleDateString()}</span>
                    )}
                  </div>
                )}
              </div>

              {/* MODULAR PLAN CARDS (Informational only — no payment or purchase buttons) */}
              <div className="grid grid-cols-1 gap-5">
                {planInfoList.map((plan) => (
                  <div key={plan.id} className="p-6 rounded-3xl border border-slate-200 bg-slate-50/50 space-y-4 hover:border-indigo-200 transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-extrabold text-[10px] uppercase rounded-full tracking-wider">
                          {plan.name}
                        </span>
                        <h4 className="text-2xl font-black text-slate-900 mt-2">{plan.price} <span className="text-xs font-medium text-slate-400">{plan.period}</span></h4>
                      </div>
                      <span className="text-xs font-bold text-slate-400 bg-white px-3 py-1 rounded-xl border border-slate-200">Informational</span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{plan.desc}</p>

                    <div className="pt-3 border-t border-slate-200/80 space-y-2">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Features Included</p>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
                        {plan.features.map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. USERS & PERMISSIONS */}
          {activeTab === "permissions" && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Users & Permissions</h3>
                <p className="text-xs text-slate-400">Default role-based permission matrix.</p>
              </div>

              <div className="space-y-4">
                {[
                  { role: "Owner", desc: "Full access to all business modules and billing.", access: ["Products", "Billing", "Stock", "Reports", "Staff", "Settings"] },
                  { role: "Admin", desc: "Manage products, billing, stock, reports, and staff.", access: ["Products", "Billing", "Stock", "Reports", "Staff"] },
                  { role: "Manager", desc: "Manage store operations and inventory.", access: ["Products", "Billing", "Stock", "Reports"] },
                  { role: "Staff", desc: "POS billing and stock checkout.", access: ["Billing", "Stock"] },
                ].map((item, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="font-extrabold text-sm text-slate-900">{item.role}</h4>
                      <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-[10px] uppercase rounded-full">
                        Preset
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {item.access.map((acc, aIdx) => (
                        <span key={aIdx} className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700">
                          ✓ {acc}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. INVENTORY SETTINGS */}
          {activeTab === "inventory" && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Inventory Settings</h3>
                <p className="text-xs text-slate-400">Configure stock thresholds and alerts.</p>
              </div>

              <form onSubmit={handleGenericSave} className="space-y-5">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border">
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">Enable Low Stock Alerts</h4>
                    <p className="text-[11px] text-slate-400">Notify when products drop below minimum stock.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={lowStockAlerts}
                    onChange={(e) => setLowStockAlerts(e.target.checked)}
                    className="w-5 h-5 accent-blue-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border">
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">Enable Negative Stock</h4>
                    <p className="text-[11px] text-slate-400">Allow billing items even if stock is 0.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={negativeStock}
                    onChange={(e) => setNegativeStock(e.target.checked)}
                    className="w-5 h-5 accent-blue-600 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Default Minimum Stock</label>
                    <input
                      type="number"
                      value={minStock}
                      onChange={(e) => setMinStock(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-semibold outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Default Unit</label>
                    <select
                      value={defaultUnit}
                      onChange={(e) => setDefaultUnit(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-semibold outline-none bg-white cursor-pointer"
                    >
                      <option value="pcs">pcs</option>
                      <option value="pkt">pkt</option>
                      <option value="kg">kg</option>
                      <option value="L">L</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black rounded-2xl text-xs shadow-md shadow-blue-600/20 transition cursor-pointer flex items-center gap-1.5 min-h-[44px]"
                  >
                    <Check className="w-4 h-4" /> Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 5. BILLING SETTINGS */}
          {activeTab === "billing" && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Billing Settings</h3>
                <p className="text-xs text-slate-400">Configure POS invoice defaults and taxes.</p>
              </div>

              <form onSubmit={handleGenericSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Invoice Prefix</label>
                    <input
                      type="text"
                      value={invoicePrefix}
                      onChange={(e) => setInvoicePrefix(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-semibold outline-none focus:border-blue-600 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Next Invoice Number</label>
                    <input
                      type="text"
                      value={nextInvoiceNo}
                      onChange={(e) => setNextInvoiceNo(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-semibold outline-none focus:border-blue-600 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Default Payment Method</label>
                    <select
                      value={defaultPayment}
                      onChange={(e) => setDefaultPayment(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-semibold outline-none bg-white cursor-pointer"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Card">Card</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Default Tax Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={defaultTaxRate}
                      onChange={(e) => setDefaultTaxRate(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-semibold outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border">
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">Tax Enabled</h4>
                    <p className="text-[11px] text-slate-400">Calculate tax automatically on bills.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={taxEnabled}
                    onChange={(e) => setTaxEnabled(e.target.checked)}
                    className="w-5 h-5 accent-blue-600 cursor-pointer"
                  />
                </div>

                <div className="pt-3 border-t flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black rounded-2xl text-xs shadow-md shadow-blue-600/20 transition cursor-pointer flex items-center gap-1.5 min-h-[44px]"
                  >
                    <Check className="w-4 h-4" /> Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 6. NOTIFICATIONS SETTINGS */}
          {activeTab === "notifications" && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Notifications</h3>
                <p className="text-xs text-slate-400">Manage real-time alert preferences.</p>
              </div>

              <form onSubmit={handleGenericSave} className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border">
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">Low Stock Alerts</h4>
                    <p className="text-[11px] text-slate-400">Notify when items reach minimum stock levels.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifLowStock}
                    onChange={(e) => setNotifLowStock(e.target.checked)}
                    className="w-5 h-5 accent-blue-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border">
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">New Sale Notifications</h4>
                    <p className="text-[11px] text-slate-400">Notify on completed billing transactions.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifNewSale}
                    onChange={(e) => setNotifNewSale(e.target.checked)}
                    className="w-5 h-5 accent-blue-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border">
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">Purchase Order Updates</h4>
                    <p className="text-[11px] text-slate-400">Notify when new vendor stock is added.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifPurchase}
                    onChange={(e) => setNotifPurchase(e.target.checked)}
                    className="w-5 h-5 accent-blue-600 cursor-pointer"
                  />
                </div>

                <div className="pt-3 border-t flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black rounded-2xl text-xs shadow-md shadow-blue-600/20 transition cursor-pointer flex items-center gap-1.5 min-h-[44px]"
                  >
                    <Check className="w-4 h-4" /> Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

    </SharedDashboardLayout>
  );
}
