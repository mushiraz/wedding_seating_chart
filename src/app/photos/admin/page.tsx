import type { Metadata } from "next";
import AdminBoard from "@/components/photos/AdminBoard";

export const metadata: Metadata = {
  title: "Photo booth admin",
  robots: { index: false },
};

export default function AdminPage() {
  return <AdminBoard />;
}
