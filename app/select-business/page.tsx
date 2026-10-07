import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Store, Building, ArrowRight } from "lucide-react";

export default async function SelectBusinessPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: memberships } = await supabase
    .from("business_members")
    .select("*, businesses(*)")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) {
    redirect("/create-business");
  }

  if (memberships.length === 1) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans antialiased text-slate-100">
      <div className="w-full max-w-md bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-700 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-700">
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl text-white shadow-lg shadow-emerald-600/30">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-black text-xl tracking-wider text-white">Select Business</h1>
            <p className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest">Multi-Tenant Account</p>
          </div>
        </div>

        <div className="space-y-3">
          {memberships.map((m: any) => (
            <Link
              key={m.id}
              href="/dashboard"
              className="p-4 bg-slate-900/80 hover:bg-slate-900 border border-slate-700 rounded-2xl flex items-center justify-between transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm">{m.businesses?.name}</h3>
                  <p className="text-[11px] text-slate-400 uppercase font-bold">{m.role}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition" />
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
