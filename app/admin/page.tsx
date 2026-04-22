import { requireAdminUser } from "@/lib/admin";
import { AdminCostClient } from "./AdminCostClient";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  try {
    await requireAdminUser();
  } catch {
    redirect("/dashboard");
  }
  return <AdminCostClient />;
}
