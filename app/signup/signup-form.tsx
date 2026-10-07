"use client";

import React, { useState } from "react";
import { signup } from "@/app/login/actions";
import Link from "next/link";
import {
  Store,
  Lock,
  Mail,
  User,
  ArrowRight,
  ArrowLeft,
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

export default function SignupForm({ error, message }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: "", color: "bg-slate-200" };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score, label: "Weak", color: "#e11d48" };
    if (score <= 4) return { score, label: "Medium", color: "#d97706" };
    return { score, label: "Strong", color: "#059669" };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!termsAccepted) {
      e.preventDefault();
      alert("Please accept the terms and conditions to continue.");
      return;
    }
    setLoading(true);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #1e3a8a 0%, #312e81 50%, #581c87 100%)", padding: "16px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Background glow effects */}
      <div style={{ position: "absolute", top: "-100px", left: "-100px", width: "400px", height: "400px", background: "rgba(6, 182, 212, 0.15)", borderRadius: "50%", filter: "blur(60px)", pointerEvents: "none" }}></div>
      <div style={{ position: "absolute", bottom: "-100px", right: "-100px", width: "400px", height: "400px", background: "rgba(168, 85, 247, 0.15)", borderRadius: "50%", filter: "blur(60px)", pointerEvents: "none" }}></div>

      {/* Center Signup Card */}
      <div style={{ width: "100%", maxWidth: "420px", background: "#ffffff", borderRadius: "24px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", border: "1px solid rgba(255, 255, 255, 0.2)", padding: "40px", position: "relative", zIndex: 10, boxSizing: "border-box" }} className="sm:p-10 p-6">

        {/* T MART Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: "20px" }}>
          <div style={{ width: "56px", height: "56px", background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.3)", marginBottom: "12px" }}>
            <Store style={{ width: "28px", height: "28px", color: "#ffffff" }} />
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: 900, color: "#0f172a", letterSpacing: "0.05em", margin: 0 }}>T MART</h1>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "2px" }}>Business Management Platform</p>
        </div>

        {/* Signup Header */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#0f172a", margin: "0 0 4px 0" }}>Create Your Account</h2>
          <p style={{ fontSize: "13px", color: "#64748b", fontWeight: 500, margin: 0 }}>Start managing your business with T MART</p>
        </div>

        {/* Error / Success Alerts */}
        {error && (
          <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c", padding: "12px 16px", borderRadius: "12px", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <AlertCircle style={{ width: "16px", height: "16px", color: "#e11d48", flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#047857", padding: "12px 16px", borderRadius: "12px", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <CheckCircle2 style={{ width: "16px", height: "16px", color: "#059669", flexShrink: 0 }} />
            <span>{message}</span>
          </div>
        )}

        {/* Form */}
        <form action={signup} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* Full Name */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em" }}>Full Name</label>
            <div style={{ position: "relative", width: "100%" }}>
              <User style={{ width: "18px", height: "18px", color: "#94a3b8", position: "absolute", left: "16px", top: "17px", pointerEvents: "none" }} />
              <input
                name="full_name"
                type="text"
                required
                style={{ width: "100%", height: "52px", paddingLeft: "48px", paddingRight: "16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "13px", fontWeight: 600, color: "#0f172a", outline: "none", boxSizing: "border-box", transition: "all 0.2s" }}
                placeholder="John Doe"
                onFocus={(e) => { e.target.style.borderColor = "#6366f1"; e.target.style.background = "#ffffff"; e.target.style.boxShadow = "0 0 0 4px rgba(99, 102, 241, 0.1)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc"; e.target.style.boxShadow = "none"; }}
              />
            </div>
          </div>

          {/* Email Address */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
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

          {/* Password */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em" }}>Password</label>
            <div style={{ position: "relative", width: "100%" }}>
              <Lock style={{ width: "18px", height: "18px", color: "#94a3b8", position: "absolute", left: "16px", top: "17px", pointerEvents: "none" }} />
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: "100%", height: "52px", paddingLeft: "48px", paddingRight: "48px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "13px", fontWeight: 600, color: "#0f172a", outline: "none", boxSizing: "border-box", transition: "all 0.2s" }}
                placeholder="At least 6 characters"
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
            {password && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", fontWeight: 700, marginTop: "2px" }}>
                <span style={{ color: "#64748b" }}>Password Strength:</span>
                <span style={{ color: strength.color }}>{strength.label}</span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em" }}>Confirm Password</label>
            <div style={{ position: "relative", width: "100%" }}>
              <Lock style={{ width: "18px", height: "18px", color: "#94a3b8", position: "absolute", left: "16px", top: "17px", pointerEvents: "none" }} />
              <input
                name="confirm_password"
                type={showConfirmPassword ? "text" : "password"}
                required
                minLength={6}
                style={{ width: "100%", height: "52px", paddingLeft: "48px", paddingRight: "48px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "13px", fontWeight: 600, color: "#0f172a", outline: "none", boxSizing: "border-box", transition: "all 0.2s" }}
                placeholder="Re-enter password"
                onFocus={(e) => { e.target.style.borderColor = "#6366f1"; e.target.style.background = "#ffffff"; e.target.style.boxShadow = "0 0 0 4px rgba(99, 102, 241, 0.1)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc"; e.target.style.boxShadow = "none"; }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{ position: "absolute", right: "16px", top: "17px", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0 }}
              >
                {showConfirmPassword ? <EyeOff style={{ width: "18px", height: "18px" }} /> : <Eye style={{ width: "18px", height: "18px" }} />}
              </button>
            </div>
          </div>

          {/* Terms Checkbox */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
            <input
              type="checkbox"
              id="terms"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              style={{ width: "16px", height: "16px", borderRadius: "4px", accentColor: "#4f46e5", cursor: "pointer" }}
            />
            <label htmlFor="terms" style={{ fontSize: "12px", color: "#475569", fontWeight: 500, cursor: "pointer" }}>
              I agree to the <span style={{ color: "#4f46e5", fontWeight: 700 }}>Terms of Service</span> & <span style={{ color: "#4f46e5", fontWeight: 700 }}>Privacy Policy</span>
            </label>
          </div>

          {/* Create Account Button */}
          <button
            type="submit"
            disabled={loading || !termsAccepted}
            style={{ width: "100%", height: "52px", background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #7c3aed 100%)", color: "#ffffff", fontWeight: 900, fontSize: "13px", borderRadius: "12px", border: "none", cursor: "pointer", boxShadow: "0 10px 20px -5px rgba(79, 70, 229, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "transform 0.1s ease, opacity 0.2s ease", marginTop: "4px" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
          >
            {loading ? (
              <>
                <Loader2 style={{ width: "18px", height: "18px", animation: "spin 1s linear infinite" }} /> Creating account...
              </>
            ) : (
              <>
                Create Account <ArrowRight style={{ width: "18px", height: "18px" }} />
              </>
            )}
          </button>
        </form>

        {/* Bottom: Sign In Link */}
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <p style={{ fontSize: "12px", color: "#64748b", fontWeight: 500, margin: "0 0 12px 0" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ fontWeight: 800, color: "#4f46e5", textDecoration: "none" }}>
              Sign In
            </Link>
          </p>
          <p style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600, margin: 0, letterSpacing: "0.02em" }}>
            T MART • Business Management Platform
          </p>
        </div>

      </div>
    </div>
  );
}
