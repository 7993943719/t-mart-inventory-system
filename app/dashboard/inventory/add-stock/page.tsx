import { redirect } from "next/navigation";

export default function AddStockRedirect() {
  redirect("/dashboard/stock");
}
