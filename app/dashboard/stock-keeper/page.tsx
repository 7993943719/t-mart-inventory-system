import { redirect } from "next/navigation";

export default function StockKeeperRedirect() {
  redirect("/dashboard/stock");
}
