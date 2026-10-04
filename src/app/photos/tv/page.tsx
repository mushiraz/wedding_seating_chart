import type { Metadata } from "next";
import Slideshow from "@/components/photos/Slideshow";

export const metadata: Metadata = {
  title: "Photos · Ahad & Rehnuba",
  robots: { index: false },
};

export default function TvPage() {
  return <Slideshow />;
}
