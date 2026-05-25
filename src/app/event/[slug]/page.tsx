"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { EventData } from "@/lib/types";
import { loadEvent, saveEvent } from "@/lib/storage";
import sampleData from "@/data/sample.json";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import ViewToggle from "@/components/ViewToggle";
import GuestGrid from "@/components/GuestGrid";
import FloorPlan from "@/components/FloorPlan";
import QRCodeDisplay from "@/components/QRCodeDisplay";

export default function EventPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [data, setData] = useState<EventData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "map">("list");
  const [highlightedTableId, setHighlightedTableId] = useState<string | null>(null);

  useEffect(() => {
    let loaded = loadEvent(slug);
    if (!loaded && slug === "john-sarah-wedding") {
      loaded = sampleData as EventData;
      saveEvent(loaded);
    }
    if (loaded) {
      setData(loaded);
    } else {
      setNotFound(true);
    }
  }, [slug]);

  const filteredGuests = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data.guests;
    const q = search.toLowerCase();
    return data.guests.filter((g) => g.name.toLowerCase().includes(q));
  }, [data, search]);

  useEffect(() => {
    if (filteredGuests.length === 1) {
      setHighlightedTableId(filteredGuests[0].tableId);
    } else if (search.trim() && filteredGuests.length > 0) {
      const tableIds = new Set(filteredGuests.map((g) => g.tableId));
      if (tableIds.size === 1) {
        setHighlightedTableId(filteredGuests[0].tableId);
      } else {
        setHighlightedTableId(null);
      }
    } else {
      setHighlightedTableId(null);
    }
  }, [filteredGuests, search]);

  if (notFound) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center animate-fade-in">
          <p className="font-script text-3xl text-foreground mb-2">Event Not Found</p>
          <p className="text-muted text-sm mb-6">This seating chart doesn&apos;t exist or has been removed.</p>
          <a href="/" className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors inline-block">
            Go Home
          </a>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center animate-fade-in">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted text-sm">Loading seating chart...</p>
        </div>
      </div>
    );
  }

  const tableMap = Object.fromEntries(data.tables.map((t) => [t.id, t]));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header event={data.event} />

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 pb-8">
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
          <div className="flex-1 w-full">
            <SearchBar value={search} onChange={setSearch} />
          </div>
          <ViewToggle view={view} onChange={setView} />
        </div>

        <div key={view} className="animate-fade-in">
          {view === "list" ? (
            <GuestGrid
              guests={filteredGuests}
              tables={tableMap}
              searchQuery={search}
            />
          ) : (
            <FloorPlan
              tables={data.tables}
              guests={data.guests}
              highlightedTableId={highlightedTableId}
              onTableClick={(tableId) => {
                setHighlightedTableId(tableId);
              }}
              backgroundImage={data.event.floorPlanBg}
            />
          )}
        </div>

        {data.event.heroImage && (
          <div className="mt-8 rounded-xl overflow-hidden shadow-md">
            <img
              src={data.event.heroImage}
              alt="Wedding"
              className="w-full h-64 object-cover"
            />
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <QRCodeDisplay
            url={typeof window !== "undefined" ? window.location.href : `/event/${slug}`}
            size={120}
          />
        </div>
      </div>
    </div>
  );
}
