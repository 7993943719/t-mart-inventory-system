import { Suspense } from "react";
import SuperAdminLoginForm from "./login-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function LoginFormContainer({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  return <SuperAdminLoginForm error={params.error} message={params.message} />;
}

export default async function SuperAdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", color: "#94a3b8", fontSize: "12px" }}>Loading Super Owner Portal...</div>}>
      <LoginFormContainer searchParams={searchParams} />
    </Suspense>
  );
}
