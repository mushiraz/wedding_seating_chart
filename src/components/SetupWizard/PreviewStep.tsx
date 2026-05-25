"use client";

import { EventData } from "@/lib/types";
import { useState } from "react";
import Header from "@/components/Header";
import GuestGrid from "@/components/GuestGrid";
import FloorPlan from "@/components/FloorPlan";
import QRCodeDisplay from "@/components/QRCodeDisplay";

interface PreviewStepProps {
  data: EventData;
  onBack: () => void;
  onPublish: () => void;
}

export default function PreviewStep({ data, onBack, onPublish }: PreviewStepProps) {
  const [copied, setCopied] = useState(false);
  const eventUrl = typeof window !== "undefined"
    ? `${window.location.origin}/event/${data.event.slug}`
    : `/event/${data.event.slug}`;

  const tableMap = Object.fromEntries(data.tables.map((t) => [t.id, t]));

  const copyLink = async () => {
    await navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Preview & Share</h2>
        <p className="text-muted text-sm">Review your seating chart and share it with guests</p>
      </div>

      <div className="border border-card-border rounded-xl overflow-hidden bg-background">
        <div className="max-h-[500px] overflow-y-auto">
          <Header event={data.event} />
          <div className="px-4 pb-4">
            <GuestGrid guests={data.guests} tables={tableMap} searchQuery="" />
          </div>
        </div>
      </div>

      <div className="border border-card-border rounded-xl overflow-hidden bg-background">
        <div className="p-4">
          <p className="text-sm font-medium text-foreground mb-3">Floor Plan Preview</p>
          <FloorPlan
            tables={data.tables}
            guests={data.guests}
            backgroundImage={data.event.floorPlanBg}
          />
        </div>
      </div>

      <div className="bg-card-bg border border-card-border rounded-xl p-6 text-center space-y-4">
        <p className="text-sm font-medium text-foreground">Share with your guests</p>
        <div className="flex justify-center">
          <QRCodeDisplay url={eventUrl} />
        </div>
        <div className="flex gap-2 justify-center">
          <button
            onClick={copyLink}
            className="px-4 py-2 border border-card-border text-foreground rounded-lg text-sm font-medium
              hover:border-primary-light transition-colors"
          >
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-2.5 border border-card-border text-foreground rounded-lg font-medium
            hover:bg-card-bg transition-colors"
        >
          Back
        </button>
        <button
          onClick={onPublish}
          className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium
            hover:bg-primary-dark transition-colors"
        >
          Publish Seating Chart
        </button>
      </div>
    </div>
  );
}
