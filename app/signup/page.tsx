import SignupForm from "./signup-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  return <SignupForm error={params.error} message={params.message} />;
}
