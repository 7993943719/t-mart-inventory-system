import SuperAdminLoginForm from "./login-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SuperAdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  return <SuperAdminLoginForm error={params.error} message={params.message} />;
}
