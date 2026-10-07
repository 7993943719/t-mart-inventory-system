import React from "react";
import Link from "next/link";
import { Store, ArrowLeft, ShieldCheck, Lock, Database, UserCheck, Mail } from "lucide-react";

export default function PrivacyPolicyPage() {
  const lastUpdated = "March 31, 2026";

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-md">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-black text-base text-slate-900 tracking-wider">TWEB</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Privacy Policy</p>
            </div>
          </Link>

          <Link
            href="/login"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-8">
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="space-y-2 border-b border-slate-100 pb-6">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 font-extrabold text-[10px] uppercase tracking-widest rounded-full border border-blue-200">
              Legal Document
            </span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Privacy Policy for TWEB</h2>
            <p className="text-xs text-slate-400 font-medium">Last Updated: {lastUpdated}</p>
          </div>

          <div className="prose prose-slate max-w-none space-y-6 text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
            <section className="space-y-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" /> 1. Introduction
              </h3>
              <p>
                Welcome to TWEB ("we", "our", or "us"). TWEB is a comprehensive business management platform designed for inventory, POS billing, stock management, customer tracking, and delivery operations. We respect your privacy and are committed to protecting your business and personal information. This Privacy Policy outlines how we collect, use, store, and safeguard your data when you access our web application or Android mobile application (collectively, the "Service").
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" /> 2. Information We Collect
              </h3>
              <p>To deliver our inventory and billing services, we collect the following categories of information:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Account Information:</strong> Email address and encrypted authentication credentials required to create and secure your user account.</li>
                <li><strong>Business & Team Data:</strong> Business name, business type, staff member roles, and multi-tenant business memberships.</li>
                <li><strong>Customer & Vendor Records:</strong> Customer names, phone numbers, alternate contact numbers, addresses, city, email, and GSTIN details.</li>
                <li><strong>Product & Sales Data:</strong> Product catalog details (names, SKUs, barcodes, purchase prices, selling prices, stock quantities), point-of-sale invoices, transaction amounts, and payment methods.</li>
                <li><strong>User-Uploaded Photos:</strong> Optional images uploaded to cloud storage for product catalog photos or purchase bill OCR scanning.</li>
                <li><strong>Technical & Device Data:</strong> Standard browser or device logs (IP address, browser type, device operating system) for security diagnostics and app performance monitoring.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-600" /> 3. Authentication & Cloud Infrastructure
              </h3>
              <p>
                TWEB utilizes Supabase as our secure backend cloud infrastructure. Authentication is handled securely via Supabase Auth, and all business data, customer records, and transaction history are stored in encrypted PostgreSQL databases protected by Row Level Security (RLS) policies. User-uploaded images are stored in secure Supabase Storage buckets.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-extrabold text-slate-900">4. How We Use Your Information</h3>
              <p>We use the collected information strictly for business operations, including:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Providing, maintaining, and improving TWEB inventory, billing, and stock tracking features.</li>
                <li>Enforcing secure multi-tenant isolation so that your business data remains private to your authorized members.</li>
                <li>Managing role-based access permissions across Owners, Admins, Billing staff, Stock Keepers, and Delivery personnel.</li>
                <li>Processing transactions, generating receipts, and maintaining audit logs.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-extrabold text-slate-900">5. Data Sharing & Disclosure</h3>
              <p>
                We do not sell, rent, or trade your personal or business data to third parties. Data is only processed through our secure cloud hosting and database provider (Supabase) to operate the Service, or when required by applicable law.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-extrabold text-slate-900">6. Data Security & Retention</h3>
              <p>
                We employ industry-standard security measures, including HTTPS encryption in transit, encrypted storage at rest, and strict database RLS rules. Your data is retained for as long as your business account remains active. You may request data deletion or account termination through your account settings.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-extrabold text-slate-900">7. User Rights</h3>
              <p>
                You retain full ownership of your business data. You have the right to access, correct, export, or delete your business inventory, customer lists, and transaction records at any time through the TWEB dashboard.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-extrabold text-slate-900">8. Children's Privacy</h3>
              <p>
                TWEB is a business-to-business enterprise application intended for use by merchants, retailers, and business professionals. We do not knowingly collect personal information from individuals under the age of 13.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-extrabold text-slate-900">9. Changes to This Privacy Policy</h3>
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our platform features or legal requirements. We will notify users of any significant updates by updating the "Last Updated" date at the top of this policy.
              </p>
            </section>

            <section className="space-y-3 pt-4 border-t border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" /> 10. Contact Us
              </h3>
              <p>
                If you have any questions, concerns, or requests regarding this Privacy Policy or your data, please contact us through your TWEB business admin settings or support portal.
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-4 sm:px-6 py-8 text-center text-xs text-slate-400 font-medium space-y-1">
        <p>© {new Date().getFullYear()} TWEB Platform. All rights reserved.</p>
        <p>Business Inventory, Billing, Stock Management & Delivery</p>
      </footer>
    </div>
  );
}
