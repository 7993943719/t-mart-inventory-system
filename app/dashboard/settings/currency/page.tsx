import { redirect } from "next/navigation";

export default function CurrencySettingsRedirect() {
  redirect("/dashboard/settings");
}
