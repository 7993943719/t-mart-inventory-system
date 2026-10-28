import { redirect } from "next/navigation";

export default function StockCountRedirect() {
  redirect("/dashboard/stock");
}
