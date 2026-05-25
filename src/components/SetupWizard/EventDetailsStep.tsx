"use client";

import { WeddingEvent } from "@/lib/types";

interface EventDetailsStepProps {
  event: WeddingEvent;
  onChange: (event: WeddingEvent) => void;
  onNext: () => void;
}

export default function EventDetailsStep({ event, onChange, onNext }: EventDetailsStepProps) {
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: "heroImage" | "floorPlanBg") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onChange({ ...event, [field]: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Event Details</h2>
        <p className="text-muted text-sm">Set up the basic information for your wedding</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Event Title
          </label>
          <input
            type="text"
            value={event.title}
            onChange={(e) => onChange({ ...event, title: e.target.value })}
            placeholder="John & Sarah Wedding"
            className="w-full px-4 py-2.5 bg-card-bg border border-card-border rounded-lg
              text-foreground placeholder:text-muted/50 text-sm
              focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Wedding Date
          </label>
          <input
            type="text"
            value={event.date}
            onChange={(e) => onChange({ ...event, date: e.target.value })}
            placeholder="March 15, 2026"
            className="w-full px-4 py-2.5 bg-card-bg border border-card-border rounded-lg
              text-foreground placeholder:text-muted/50 text-sm
              focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Wedding Photo (optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageUpload(e, "heroImage")}
            className="w-full text-sm text-muted file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0 file:text-sm file:font-medium
              file:bg-primary/10 file:text-primary hover:file:bg-primary/20
              file:cursor-pointer cursor-pointer"
          />
          {event.heroImage && (
            <div className="mt-2 rounded-lg overflow-hidden border border-card-border">
              <img src={event.heroImage} alt="Preview" className="w-full h-32 object-cover" />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Floor Plan Background (optional)
          </label>
          <p className="text-muted text-xs mb-2">Upload an image of your venue layout</p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageUpload(e, "floorPlanBg")}
            className="w-full text-sm text-muted file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0 file:text-sm file:font-medium
              file:bg-primary/10 file:text-primary hover:file:bg-primary/20
              file:cursor-pointer cursor-pointer"
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={onNext}
          disabled={!event.title.trim()}
          className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium
            hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next: Tables
        </button>
      </div>
    </div>
  );
}
