"use client";

import React, { useState } from "react";
import { login } from "./actions";
import Link from "next/link";
import {
  Store,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface Props {
  error?: string;
  message?: string;
}

export default function LoginForm({ error, message }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    setLoading(true);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #1e3a8a 0%, #312e81 50%, #581c87 100%)", padding: "16px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Background glow effects */}
      <div style={{ position: "absolute", top: "-100px", left: "-100px", width: "400px", height: "400px", background: "rgba(6, 182, 212, 0.15)", borderRadius: "50%", filter: "blur(60px)", pointerEvents: "none" }}></div>
      <div style={{ position: "absolute", bottom: "-100px", right: "-100px", width: "400px", height: "400px", background: "rgba(168, 85, 247, 0.15)", borderRadius: "50%", filter: "blur(60px)", pointerEvents: "none" }}></div>

      {/* Center Login Card */}
      <div style={{ width: "100%", maxWidth: "420px", background: "#ffffff", borderRadius: "24px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", border: "1px solid rgba(255, 255, 255, 0.2)", padding: "40px", position: "relative", zIndex: 10, boxSizing: "border-box" }} className="sm:p-10 p-6">

        {/* T MART Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: "24px" }}>
          <div style={{ width: "56px", height: "56px", background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.3)", marginBottom: "12px" }}>
            <Store style={{ width: "28px", height: "28px", color: "#ffffff" }} />
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: 900, color: "#0f172a", letterSpacing: "0.05em", margin: 0 }}>T MART</h1>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "2px" }}>Business Management Platform</p>
        </div>

        {/* Login Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#0f172a", margin: "0 0 4px 0" }}>Welcome Back</h2>
          <p style={{ fontSize: "13px", color: "#64748b", fontWeight: 500, margin: 0 }}>Sign in to continue to your business</p>
        </div>

        {/* Error Message Alert */}
        {error && (
          <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c", padding: "12px 16px", borderRadius: "12px", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <AlertCircle style={{ width: "16px", height: "16px", color: "#e11d48", flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#047857", padding: "12px 16px", borderRadius: "12px", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <CheckCircle2 style={{ width: "16px", height: "16px", color: "#059669", flexShrink: 0 }} />
            <span>{message}</span>
          </div>
        )}

        {/* Form */}
        <form action={login} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Email Field */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em" }}>Email Address</label>
            <div style={{ position: "relative", width: "100%" }}>
              <Mail style={{ width: "18px", height: "18px", color: "#94a3b8", position: "absolute", left: "16px", top: "17px", pointerEvents: "none" }} />
              <input
                name="email"
                type="email"
                required
                style={{ width: "100%", height: "52px", paddingLeft: "48px", paddingRight: "16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "13px", fontWeight: 600, color: "#0f172a", outline: "none", boxSizing: "border-box", transition: "all 0.2s" }}
                placeholder="store@tmart.com"
                onFocus={(e) => { e.target.style.borderColor = "#6366f1"; e.target.style.background = "#ffffff"; e.target.style.boxShadow = "0 0 0 4px rgba(99, 102, 241, 0.1)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc"; e.target.style.boxShadow = "none"; }}
              />
            </div>
          </div>

          {/* Password Field */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em" }}>Password</label>
              <Link
                href="/login/forgot-password"
                style={{ fontSize: "12px", fontWeight: 700, color: "#4f46e5", textDecoration: "none" }}
              >
                Forgot password?
              </Link>
            </div>
            <div style={{ position: "relative", width: "100%" }}>
              <Lock style={{ width: "18px", height: "18px", color: "#94a3b8", position: "absolute", left: "16px", top: "17px", pointerEvents: "none" }} />
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                style={{ width: "100%", height: "52px", paddingLeft: "48px", paddingRight: "48px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "13px", fontWeight: 600, color: "#0f172a", outline: "none", boxSizing: "border-box", transition: "all 0.2s" }}
                placeholder="••••••••"
                onFocus={(e) => { e.target.style.borderColor = "#6366f1"; e.target.style.background = "#ffffff"; e.target.style.boxShadow = "0 0 0 4px rgba(99, 102, 241, 0.1)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc"; e.target.style.boxShadow = "none"; }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: "16px", top: "17px", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0 }}
              >
                {showPassword ? <EyeOff style={{ width: "18px", height: "18px" }} /> : <Eye style={{ width: "18px", height: "18px" }} />}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", height: "52px", background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #7c3aed 100%)", color: "#ffffff", fontWeight: 900, fontSize: "13px", borderRadius: "12px", border: "none", cursor: "pointer", boxShadow: "0 10px 20px -5px rgba(79, 70, 229, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "transform 0.1s ease, opacity 0.2s ease", marginTop: "4px" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
          >
            {loading ? (
              <>
                <Loader2 style={{ width: "18px", height: "18px", animation: "spin 1s linear infinite" }} /> Signing in...
              </>
            ) : (
              <>
                Sign In <ArrowRight style={{ width: "18px", height: "18px" }} />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", textAlign: "center", margin: "16px 0" }}>
          <div style={{ flex: 1, borderBottom: "1px solid #e2e8f0" }}></div>
          <span style={{ padding: "0 12px", fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>OR</span>
          <div style={{ flex: 1, borderBottom: "1px solid #e2e8f0" }}></div>
        </div>

        {/* Create Account Button */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Link
            href="/signup"
            style={{ width: "100%", height: "52px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "12px", color: "#334155", fontWeight: 800, fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", boxSizing: "border-box", transition: "background 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#ffffff"; }}
          >
            Create Account
          </Link>

          <div style={{ textAlign: "center", paddingTop: "4px" }}>
            <p style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600, margin: 0, letterSpacing: "0.02em" }}>
              T MART • Business Management Platform
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
