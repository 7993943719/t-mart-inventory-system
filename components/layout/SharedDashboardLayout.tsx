"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";
import {
  Store,
  Home,
  Package,
  ReceiptText,
  ShoppingCart,
  Users,
  Boxes,
  UserCheck,
  Truck,
  LogOut,
} from "lucide-react";

interface Props {
  businessName?: string;
  userName?: string;
  role?: string;
  pageTitle?: string;
  onAddProduct?: () => void;
  children: React.ReactNode;
}

export function SharedDashboardLayout({
  businessName = "TWEB",
  userName = "Admin",
  role = "OWNER",
  pageTitle = "Dashboard",
  onAddProduct,
  children,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const go = (path: string) => {
    setMobileMenuOpen(false);
    router.push(path);
  };

  const navItems = [
    { label: "Home", icon: Home, path: "/dashboard" },
    { label: "Products", icon: Package, path: "/dashboard/products" },
    { label: "New Bill", icon: ReceiptText, path: "/dashboard/billing" },
    { label: "Bills", icon: ShoppingCart, path: "/dashboard/sales" },
    { label: "Customers", icon: UserCheck, path: "/dashboard/customers" },
    { label: "Vendors", icon: Truck, path: "/dashboard/purchases" },
    { label: "Stock", icon: Boxes, path: "/dashboard/stock" },
    { label: "Staff", icon: Users, path: "/dashboard/staff" },
  ];

  return (
    <div className="app-layout">
      {/* MOBILE MENU OVERLAY */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`sidebar ${mobileMenuOpen ? "mobile-open" : ""}`} style={{ zIndex: 50 }}>
        <div style={styles.logoArea}>
          <div style={styles.logo}>
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <div style={styles.logoText}>TWEB</div>
            <div style={styles.logoSub}>Supermarket POS</div>
          </div>
        </div>

        <div style={styles.divider} />

        <div style={styles.menuTitle}>MAIN NAVIGATION</div>

        <nav style={styles.nav}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => go(item.path)}
                style={{
                  ...styles.navButton,
                  ...(isActive ? styles.activeButton : {}),
                }}
              >
                <Icon style={{ width: "18px", height: "18px", flexShrink: 0 }} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div style={styles.sidebarBottom}>
          <div style={{ padding: "0 12px 12px 12px", fontSize: "11px", color: "#64748b" }}>
            <strong style={{ color: "#334155" }}>{userName}</strong> ({role})
          </div>
          <form action={logout}>
            <button type="submit" style={styles.logoutButton}>
              <span>↪</span>
              Logout
            </button>
          </form>
        </div>
      </aside>

      {/* MAIN AREA */}
      <main className="main-area">
        {/* TOP HEADER */}
        <header className="top-header">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="hamburger-btn"
              style={{
                ...styles.hamburgerBtn,
                position: "relative",
                zIndex: 2000,
                pointerEvents: "auto",
                touchAction: "manipulation",
              }}
            >
              ☰
            </button>
            <div>
              <div style={styles.pageTitle}>{pageTitle}</div>
              <div style={styles.pageSubtitle}>
                {businessName} • Welcome back, {userName}
              </div>
            </div>
          </div>

          <div style={styles.headerRight}>
            <button type="button" style={styles.profileButton} onClick={() => go("/dashboard/settings")}>
              <div style={styles.avatar}>{(userName || "A").charAt(0).toUpperCase()}</div>
              <div style={styles.profileText}>
                <strong>{role}</strong>
                <span>{businessName}</span>
              </div>
            </button>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <section className="page-content">
          {children}
        </section>
      </main>
    </div>
  );
}

const styles: any = {
  logoArea: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "20px 20px 16px",
  },
  logo: {
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #2563eb, #4f46e5)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
  },
  logoText: {
    fontSize: "18px",
    fontWeight: 800,
    color: "#172033",
    lineHeight: 1.1,
  },
  logoSub: {
    fontSize: "11px",
    color: "#8791a5",
    marginTop: "2px",
  },
  divider: {
    height: "1px",
    background: "#edf0f5",
    margin: "0 16px 16px",
  },
  menuTitle: {
    fontSize: "10px",
    fontWeight: 700,
    color: "#9aa3b5",
    letterSpacing: "1px",
    padding: "0 20px 10px",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "0 12px",
  },
  navButton: {
    width: "100%",
    minHeight: "44px",
    border: "none",
    borderRadius: "12px",
    background: "transparent",
    color: "#475569",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "0 14px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.2s",
  },
  activeButton: {
    background: "linear-gradient(135deg, #2563eb, #4f46e5)",
    color: "#ffffff",
    boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
  },
  sidebarBottom: {
    marginTop: "auto",
    padding: "16px 12px 20px",
    borderTop: "1px solid #edf0f5",
  },
  logoutButton: {
    width: "100%",
    minHeight: "44px",
    border: "none",
    borderRadius: "12px",
    background: "#fff1f2",
    color: "#dc2626",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "0 14px",
  },
  hamburgerBtn: {
    background: "#f1f5f9",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    width: "44px",
    height: "44px",
    display: "none",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: "18px",
  },
  pageTitle: {
    fontSize: "22px",
    fontWeight: 800,
    color: "#172033",
    margin: 0,
    lineHeight: 1.2,
  },
  pageSubtitle: {
    fontSize: "13px",
    color: "#8791a5",
    marginTop: "2px",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  profileButton: {
    border: "1px solid #e3e7ef",
    background: "#ffffff",
    borderRadius: "12px",
    padding: "6px 12px 6px 7px",
    display: "flex",
    alignItems: "center",
    gap: "9px",
    cursor: "pointer",
    minHeight: "44px",
  },
  avatar: {
    width: "34px",
    height: "34px",
    borderRadius: "9px",
    background: "#dbeafe",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
  },
  profileText: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    fontSize: "12px",
  },
};
