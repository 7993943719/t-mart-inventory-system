"use client";

import React, { useState } from "react";
import { superAdminLogin } from "../actions";
import Link from "next/link";
import {
  ShieldCheck,
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

export default function SuperAdminLoginForm({ error, message }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    setLoading(true);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)", padding: "16px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Background glow effects */}
      <div style={{ position: "absolute", top: "-100px", left: "-100px", width: "400px", height: "400px", background: "rgba(99, 102, 241, 0.15)", borderRadius: "50%", filter: "blur(60px)", pointerEvents: "none" }}></div>
      <div style={{ position: "absolute", bottom: "-100px", right: "-100px", width: "400px", height: "400px", background: "rgba(168, 85, 247, 0.15)", borderRadius: "50%", filter: "blur(60px)", pointerEvents: "none" }}></div>

      {/* Center Login Card */}
      <div style={{ width: "100%", maxWidth: "420px", background: "#0f172a", borderRadius: "24px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", border: "1px solid rgba(255, 255, 255, 0.1)", padding: "40px", position: "relative", zIndex: 10, boxSizing: "border-box" }} className="sm:p-10 p-6">

        {/* Super Owner Header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: "24px" }}>
          <div style={{ width: "56px", height: "56px", background: "linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 20px -3px rgba(147, 51, 234, 0.4)", marginBottom: "12px" }}>
            <ShieldCheck style={{ width: "28px", height: "28px", color: "#ffffff" }} />
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: 900, color: "#ffffff", letterSpacing: "0.05em", margin: 0 }}>TWEB</h1>
          <p style={{ fontSize: "11px", fontWeight: 800, color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "0.15em", marginTop: "4px" }}>Super Owner Administration</p>
        </div>

        {/* Login Title */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 900, color: "#ffffff", margin: "0 0 4px 0" }}>Super Owner Sign In</h2>
          <p style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 500, margin: 0 }}>Enter your credentials to access the global control panel</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{ background: "rgba(244, 63, 94, 0.1)", border: "1px solid rgba(244, 63, 94, 0.3)", color: "#fda4af", padding: "12px 16px", borderRadius: "12px", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <AlertCircle style={{ width: "16px", height: "16px", color: "#fb7185", flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#6ee7b7", padding: "12px 16px", borderRadius: "12px", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <CheckCircle2 style={{ width: "16px", height: "16px", color: "#34d399", flexShrink: 0 }} />
            <span>{message}</span>
          </div>
        )}

        {/* Form */}
        <form action={superAdminLogin} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Email Field */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.05em" }}>Super Owner Email</label>
            <div style={{ position: "relative", width: "100%" }}>
              <Mail style={{ width: "18px", height: "18px", color: "#64748b", position: "absolute", left: "16px", top: "17px", pointerEvents: "none" }} />
              <input
                name="email"
                type="email"
                required
                style={{ width: "100%", height: "52px", paddingLeft: "48px", paddingRight: "16px", background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", fontSize: "13px", fontWeight: 600, color: "#ffffff", outline: "none", boxSizing: "border-box", transition: "all 0.2s" }}
                placeholder="superadmin@tweb.app"
                onFocus={(e) => { e.target.style.borderColor = "#818cf8"; e.target.style.background = "#1e293b"; e.target.style.boxShadow = "0 0 0 4px rgba(129, 140, 248, 0.15)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#334155"; e.target.style.boxShadow = "none"; }}
              />
            </div>
          </div>

          {/* Password Field */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.05em" }}>Password</label>
            <div style={{ position: "relative", width: "100%" }}>
              <Lock style={{ width: "18px", height: "18px", color: "#64748b", position: "absolute", left: "16px", top: "17px", pointerEvents: "none" }} />
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                style={{ width: "100%", height: "52px", paddingLeft: "48px", paddingRight: "48px", background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", fontSize: "13px", fontWeight: 600, color: "#ffffff", outline: "none", boxSizing: "border-box", transition: "all 0.2s" }}
                placeholder="••••••••"
                onFocus={(e) => { e.target.style.borderColor = "#818cf8"; e.target.style.background = "#1e293b"; e.target.style.boxShadow = "0 0 0 4px rgba(129, 140, 248, 0.15)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#334155"; e.target.style.boxShadow = "none"; }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: "16px", top: "17px", background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 0 }}
              >
                {showPassword ? <EyeOff style={{ width: "18px", height: "18px" }} /> : <Eye style={{ width: "18px", height: "18px" }} />}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", height: "52px", background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #9333ea 100%)", color: "#ffffff", fontWeight: 900, fontSize: "13px", borderRadius: "12px", border: "none", cursor: "pointer", boxShadow: "0 10px 20px -5px rgba(124, 58, 237, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "transform 0.1s ease, opacity 0.2s ease", marginTop: "8px" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
          >
            {loading ? (
              <>
                <Loader2 style={{ width: "18px", height: "18px", animation: "spin 1s linear infinite" }} /> Authenticating Super Owner...
              </>
            ) : (
              <>
                Super Owner Sign In <ArrowRight style={{ width: "18px", height: "18px" }} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={{ textAlign: "center", paddingTop: "20px", marginTop: "12px", borderTop: "1px solid #1e293b" }}>
          <p style={{ fontSize: "10px", color: "#64748b", fontWeight: 700, margin: 0, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            TWEB • Restricted Platform Administration
          </p>
        </div>

      </div>
    </div>
  );
}
