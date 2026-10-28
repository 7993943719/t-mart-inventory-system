import { redirect } from "next/navigation";

export default function StockReceivingRedirect() {
  redirect("/dashboard/stock");
}
