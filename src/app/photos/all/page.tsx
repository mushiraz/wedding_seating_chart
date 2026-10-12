import type { Metadata } from "next";
import Gallery from "@/components/photos/Gallery";

export const metadata: Metadata = {
  title: "All photos · Ahad & Rehnuba",
  description: "Every photo guests have shared at the wedding.",
};

export default function AllPhotosPage() {
  return <Gallery />;
}
