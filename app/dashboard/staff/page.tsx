"use client";

import React, { useEffect, useState } from "react";
import { SharedDashboardLayout } from "@/components/layout/SharedDashboardLayout";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  Plus,
  Search,
  Filter,
  X,
  Check,
  Shield,
  Mail,
  Phone,
  UserCheck,
  UserX,
} from "lucide-react";

const roleMap = {
  Admin: "admin",
  Billing: "billing",
  "Stock Keeper": "stockkeeper",
  Delivery: "delivery",
  Staff: "staff",
  Owner: "owner",
  Manager: "manager",
} as const;

const reverseRoleMap: Record<string, string> = {
  admin: "Admin",
  billing: "Billing",
  stockkeeper: "Stock Keeper",
  delivery: "Delivery",
  staff: "Staff",
  owner: "Owner",
  manager: "Manager",
};

export default function StaffPage() {
  const [supabase] = useState(() => createClient());
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [disableModalOpen, setDisableModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);

  // Add Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("Admin");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [business, setBusiness] = useState<any>(null);
  const [currentUserName, setCurrentUserName] = useState("Admin");
  const [currentUserRole, setCurrentUserRole] = useState("OWNER");

  const isAdminOrOwner = currentUserRole && ["owner", "admin", "OWNER", "ADMIN"].includes(currentUserRole.toLowerCase());

  const loadStaff = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      console.log("AUTH USER:", user);
      if (userErr || !user) {
        setErrorMsg("Please log in again.");
        setLoading(false);
        return;
      }

      const { data: memberships, error: memErr } = await supabase
        .from("business_members")
        .select("*, businesses(*)")
        .eq("user_id", user.id);

      if (memErr) {
        console.error("Error fetching memberships:", memErr);
      }

      if (memberships && memberships.length > 0) {
        setBusiness(memberships[0].businesses);
        setCurrentUserRole(memberships[0].role || "owner");
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (prof?.full_name) setCurrentUserName(prof.full_name);

      let bizId = memberships?.[0]?.business_id || memberships?.[0]?.businesses?.id;

      if (!bizId) {
        const { data: ownedBiz } = await supabase
          .from("businesses")
          .select("id")
          .eq("owner_id", user.id)
          .single();
        if (ownedBiz) {
          bizId = ownedBiz.id;
        }
      }

      console.log("BUSINESS ID:", bizId);

      if (!bizId) {
        setLoading(false);
        return;
      }

      const { data: members, error } = await supabase
        .from("business_members")
        .select("id, business_id, user_id, role, created_at, status")
        .eq("business_id", bizId)
        .order("created_at", { ascending: false });

      console.log("BUSINESS MEMBERS:", members);
      console.log("MEMBER ERROR:", error);

      if (error) {
        console.error("Error fetching staff:", {
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code
        });
        setErrorMsg(`Error fetching staff: ${error.message}`);
        setStaffList([]);
      } else if (members && members.length > 0) {
        const userIds = members.map((m) => m.user_id).filter(Boolean);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("*")
          .in("id", userIds);

        const profileMap = new Map();
        (profilesData || []).forEach((p) => {
          profileMap.set(p.id, p);
        });

        const enrichedStaff = members.map((m) => {
          const profRec = profileMap.get(m.user_id);
          return {
            ...m,
            profiles: profRec || { full_name: `User (${m.user_id?.substring(0, 8) || "Member"})`, email: "" },
          };
        });

        console.log("number of members returned after refresh:", enrichedStaff.length);
        setStaffList(enrichedStaff);
      } else {
        console.log("number of members returned after refresh: 0");
        setStaffList([]);
      }
    } catch (err: any) {
      console.error("Failed to load staff data", err);
      setErrorMsg(`Failed to load staff data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, [supabase]);

  const totalStaff = staffList.length;
  const activeStaff = staffList.filter((m) => m.status !== "Inactive").length;
  const adminCount = staffList.filter((m) => (m.role || "").toLowerCase() === "admin").length;
  const billingCount = staffList.filter((m) => (m.role || "").toLowerCase() === "billing").length;
  const stockKeeperCount = staffList.filter((m) => (m.role || "").toLowerCase() === "stockkeeper").length;
  const deliveryCount = staffList.filter((m) => (m.role || "").toLowerCase() === "delivery").length;
  const staffCount = staffList.filter((m) => (m.role || "").toLowerCase() === "staff").length;

  const filteredStaff = staffList.filter((m) => {
    const name = m.profiles?.full_name || "Team Member";
    const matchesSearch = !searchQuery.trim() || name.toLowerCase().includes(searchQuery.toLowerCase()) || (m.profiles?.email || "").toLowerCase().includes(searchQuery.toLowerCase()) || (m.user_id || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "ALL" || (m.role || "").toLowerCase() === roleFilter.toLowerCase();
    const matchesStatus = statusFilter === "ALL" || (statusFilter === "ACTIVE" ? (m.status ? m.status !== "Inactive" : true) : m.status === "Inactive");
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getPermissionsList = (r: string) => {
    const lowercaseRole = (r || "").toLowerCase();
    if (lowercaseRole === "owner") return ["Full access"];
    if (lowercaseRole === "admin") return ["Products", "Billing", "Stock", "Reports", "Staff"];
    if (lowercaseRole === "manager") return ["Products", "Billing", "Stock", "Reports"];
    if (lowercaseRole === "staff" || lowercaseRole === "billing" || lowercaseRole === "stockkeeper") return ["Billing", "Stock"];
    if (lowercaseRole === "delivery") return ["Delivery"];
    return ["Billing"];
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password || !role) {
      setErrorMsg("All fields are required.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Temporary password must be at least 6 characters long.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setErrorMsg("Please log in again.");
        setSubmitting(false);
        return;
      }

      const dbRole = roleMap[role as keyof typeof roleMap] || "staff";

      const { data, error } = await supabase.functions.invoke("create-staff-user", {
        body: {
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          role: dbRole,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log("function error:", error);
      console.log("function response data:", data);

      if (error) {
        let errorText = error.message || "Failed to invoke create-staff-user";
        if (error.context && typeof error.context.json === "function") {
          try {
            const res: Response = error.context;
            const body = await res.json();
            if (body && typeof body === "object") {
              errorText = body.error || body.message || JSON.stringify(body);
            } else {
              errorText = String(body);
            }
          } catch {}
        }
        throw new Error(errorText);
      }

      if (!data || data.success !== true) {
        const errorText = data?.error || data?.message || "Failed to create staff member";
        throw new Error(errorText);
      }

      setSuccessMsg("Staff member created successfully.");
      setAddModalOpen(false);
      setFullName("");
      setEmail("");
      setPhone("");
      setRole("Admin");
      setPassword("");

      await new Promise((resolve) => setTimeout(resolve, 800));
      await loadStaff();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error("Create staff error:", err);
      setErrorMsg(err.message || "Failed to create staff member");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    if ((selectedStaff.role || "").toLowerCase() === "owner") {
      setErrorMsg("Cannot change the role of the Owner.");
      setEditModalOpen(false);
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const dbRole = roleMap[role as keyof typeof roleMap] || "staff";
      const { error: updateErr } = await supabase
        .from("business_members")
        .update({ role: dbRole })
        .eq("id", selectedStaff.id);

      if (updateErr) throw new Error(updateErr.message);

      setSuccessMsg("Staff member updated successfully!");
      setEditModalOpen(false);
      await loadStaff();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update staff");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisableStaff = async () => {
    if (!selectedStaff) return;
    if ((selectedStaff.role || "").toLowerCase() === "owner") {
      setErrorMsg("Cannot disable or delete the Owner.");
      setDisableModalOpen(false);
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { error: disErr } = await supabase
        .from("business_members")
        .update({ status: "Inactive" })
        .eq("id", selectedStaff.id);

      if (disErr) throw new Error(disErr.message);

      setSuccessMsg("Staff member disabled successfully.");
      setDisableModalOpen(false);
      await loadStaff();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to disable user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SharedDashboardLayout
      businessName={business?.name || "T MART"}
      userName={currentUserName}
      role={currentUserRole}
      pageTitle="Staff"
    >
      {/* PAGE HEADER */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
            Team & Permissions
          </span>
          <h2 className="text-2xl sm:text-3xl font-black mt-2">Staff Directory</h2>
          <p className="text-xs text-indigo-100 font-medium mt-1">Manage team members and role access across your supermarket.</p>
        </div>

        {isAdminOrOwner && (
          <button
            onClick={() => {
              setFullName("");
              setEmail("");
              setPhone("");
              setRole("Admin");
              setPassword("");
              setAddModalOpen(true);
            }}
            className="px-5 py-3.5 bg-white text-blue-700 hover:bg-blue-50 font-black rounded-2xl text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4" /> + Add Staff
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold mb-6">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold mb-6">
          {successMsg}
        </div>
      )}

      {/* SUMMARY CARDS (7 CARDS) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total</p>
          <h3 className="text-xl font-black text-slate-900">{totalStaff}</h3>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <p className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider">Active</p>
          <h3 className="text-xl font-black text-emerald-600">{activeStaff}</h3>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">Admin</p>
          <h3 className="text-xl font-black text-blue-600">{adminCount}</h3>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <p className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wider">Billing</p>
          <h3 className="text-xl font-black text-purple-600">{billingCount}</h3>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <p className="text-[10px] font-extrabold text-orange-600 uppercase tracking-wider">Stock Keeper</p>
          <h3 className="text-xl font-black text-orange-600">{stockKeeperCount}</h3>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <p className="text-[10px] font-extrabold text-teal-600 uppercase tracking-wider">Delivery</p>
          <h3 className="text-xl font-black text-teal-600">{deliveryCount}</h3>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <p className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">Staff</p>
          <h3 className="text-xl font-black text-indigo-600">{staffCount}</h3>
        </div>
      </div>

      {/* SEARCH / FILTER BAR */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between mb-6">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search staff by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-600 h-11"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none cursor-pointer h-11"
          >
            <option value="ALL">Role: All</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="billing">Billing</option>
            <option value="stockkeeper">Stock Keeper</option>
            <option value="delivery">Delivery</option>
            <option value="staff">Staff</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none cursor-pointer h-11"
          >
            <option value="ALL">Status: All</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* STAFF CARDS GRID */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading staff directory...</div>
      ) : filteredStaff.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center space-y-3 shadow-xs">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No staff members found</h3>
          <p className="text-xs text-slate-400">Add staff members to grant them access to T MART.</p>
          {isAdminOrOwner && (
            <button
              onClick={() => setAddModalOpen(true)}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer min-h-[44px]"
            >
              + Add Staff
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStaff.map((m) => {
            const memberName = m.profiles?.full_name || `User (${m.user_id?.substring(0, 8) || "Member"})`;
            const memberEmail = m.profiles?.email || m.user_id || "N/A";
            const isActive = m.status !== "Inactive";
            const isOwner = (m.role || "").toLowerCase() === "owner";

            return (
              <div key={m.id} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-black text-base border border-indigo-500/20 shadow-xs">
                      {memberName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{memberName}</h4>
                      <p className="text-[11px] text-slate-400 font-mono truncate max-w-[180px]">{memberEmail}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-full ${isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Role</span>
                    <span className="font-extrabold text-indigo-600 uppercase">{m.role}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Today's Billing</span>
                    <span className="font-black text-slate-900">₹0.00</span>
                  </div>
                </div>

                {isAdminOrOwner && (
                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    {!isOwner ? (
                      <>
                        <button
                          onClick={() => {
                            setSelectedStaff(m);
                            setRole(reverseRoleMap[(m.role || "").toLowerCase()] || "Admin");
                            setEditModalOpen(true);
                          }}
                          className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold rounded-xl text-xs transition cursor-pointer min-h-[38px]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStaff(m);
                            setDisableModalOpen(true);
                          }}
                          className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold rounded-xl text-xs transition cursor-pointer min-h-[38px]"
                        >
                          Disable
                        </button>
                      </>
                    ) : (
                      <span className="text-slate-400 italic text-xs py-1">Protected Owner</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ADD STAFF MODAL */}
      {addModalOpen && isAdminOrOwner && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-[calc(100%-24px)] p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black text-slate-900">Add Staff Member</h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-blue-600 h-11"
                  placeholder="Jane Smith"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-blue-600 h-11"
                  placeholder="jane@tmart.com"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-blue-600 h-11"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none bg-white cursor-pointer h-11"
                >
                  <option value="Admin">Admin</option>
                  <option value="Billing">Billing</option>
                  <option value="Stock Keeper">Stock Keeper</option>
                  <option value="Delivery">Delivery</option>
                  <option value="Staff">Staff</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Note: Owner role cannot be assigned here.</p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
                  {errorMsg}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="flex-1 py-3 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer min-h-[44px]"
                >
                  {submitting ? "Creating..." : "Save Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STAFF MODAL */}
      {editModalOpen && selectedStaff && isAdminOrOwner && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-[calc(100%-24px)] p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black text-slate-900">Edit Staff: {selectedStaff.profiles?.full_name}</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleEditStaff} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="text"
                  disabled
                  value={selectedStaff.profiles?.email || ""}
                  className="w-full bg-slate-100 border rounded-xl p-3 text-xs font-semibold text-slate-600 h-11"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none bg-white cursor-pointer h-11"
                >
                  <option value="Admin">Admin</option>
                  <option value="Billing">Billing</option>
                  <option value="Stock Keeper">Stock Keeper</option>
                  <option value="Delivery">Delivery</option>
                  <option value="Staff">Staff</option>
                </select>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <span className="text-xs font-bold text-slate-700 uppercase">Role Permissions</span>
                <ul className="text-xs text-slate-600 list-disc list-inside space-y-0.5">
                  {getPermissionsList(role).map((perm, pIdx) => (
                    <li key={pIdx}>{perm}</li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="flex-1 py-3 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer min-h-[44px]"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISABLE USER CONFIRMATION MODAL */}
      {disableModalOpen && selectedStaff && isAdminOrOwner && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 text-center text-xs">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <UserX className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">Disable this user?</h3>
              <p className="text-xs text-slate-500">
                This will revoke access for <strong className="text-slate-800">{selectedStaff.profiles?.full_name || "this user"}</strong> from this business.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDisableModalOpen(false)}
                className="flex-1 py-3 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisableStaff}
                disabled={submitting}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer min-h-[44px]"
              >
                {submitting ? "Disabling..." : "Disable User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </SharedDashboardLayout>
  );
}
