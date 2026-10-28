import { redirect } from "next/navigation";

export default function UsersSettingsRedirect() {
  redirect("/dashboard/staff");
}
