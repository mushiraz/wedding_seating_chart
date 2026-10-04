import type { Metadata } from "next";
import PhotoBooth from "@/components/photos/PhotoBooth";

export const metadata: Metadata = {
  title: "Photo booth · Ahad & Rehnuba",
  description: "Share your photos from the wedding and play the side quests.",
};

export default function PhotosPage() {
  return <PhotoBooth />;
}
