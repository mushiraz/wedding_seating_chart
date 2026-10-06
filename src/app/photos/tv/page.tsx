import type { Metadata } from "next";
import Slideshow from "@/components/photos/Slideshow";
import { parseTv } from "@/lib/tvSettings";

export const metadata: Metadata = {
  title: "Photos · Ahad & Rehnuba",
  robots: { index: false },
};

export default async function TvPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <Slideshow initial={parseTv(await searchParams)} />;
}
