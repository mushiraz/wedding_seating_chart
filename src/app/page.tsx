"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { listEventSlugs, loadEvent } from "@/lib/storage";
import { FloralLeft, FloralRight } from "@/components/FloralDecoration";

export default function Home() {
  const router = useRouter();
  const [events, setEvents] = useState<{ slug: string; title: string }[]>([]);

  useEffect(() => {
    const slugs = listEventSlugs();
    const loaded = slugs
      .map((s) => {
        const data = loadEvent(s);
        return data ? { slug: s, title: data.event.title } : null;
      })
      .filter(Boolean) as { slug: string; title: string }[];
    setEvents(loaded);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="relative max-w-lg w-full text-center">
        <FloralLeft className="absolute -top-8 -left-12 w-28 h-28 pointer-events-none opacity-60" />
        <FloralRight className="absolute -top-8 -right-12 w-28 h-28 pointer-events-none opacity-60" />

        <h1 className="font-script text-5xl md:text-6xl text-foreground mb-3">
          Seating Chart
        </h1>
        <p className="text-muted text-sm tracking-[0.15em] uppercase mb-8">
          Beautiful wedding seating arrangements
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push("/setup")}
            className="w-full py-3 px-6 bg-primary text-white rounded-lg font-medium
              hover:bg-primary-dark transition-colors shadow-sm"
          >
            Create Your Seating Chart
          </button>

          <button
            onClick={() => router.push("/event/john-sarah-wedding")}
            className="w-full py-3 px-6 border border-card-border text-foreground rounded-lg font-medium
              hover:border-primary-light hover:bg-card-bg transition-colors"
          >
            View Demo
          </button>
        </div>

        {events.length > 0 && (
          <div className="mt-10">
            <p className="text-muted text-xs tracking-[0.15em] uppercase mb-3">
              Your Events
            </p>
            <div className="space-y-2">
              {events.map((ev) => (
                <button
                  key={ev.slug}
                  onClick={() => router.push(`/event/${ev.slug}`)}
                  className="w-full text-left px-4 py-3 bg-card-bg border border-card-border rounded-lg
                    hover:border-primary-light hover:shadow-sm transition-all text-sm"
                >
                  <span className="font-medium text-foreground">{ev.title}</span>
                  <span className="text-muted ml-2 text-xs">/{ev.slug}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
