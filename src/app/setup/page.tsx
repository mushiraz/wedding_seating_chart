"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WeddingEvent, Table, Guest, EventData } from "@/lib/types";
import { saveEvent, generateSlug } from "@/lib/storage";
import EventDetailsStep from "@/components/SetupWizard/EventDetailsStep";
import TablesStep from "@/components/SetupWizard/TablesStep";
import GuestsStep from "@/components/SetupWizard/GuestsStep";
import PreviewStep from "@/components/SetupWizard/PreviewStep";

const steps = ["Details", "Tables", "Guests", "Preview"];

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [event, setEvent] = useState<WeddingEvent>({
    slug: "",
    title: "",
    date: "",
  });
  const [tables, setTables] = useState<Table[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);

  const eventData: EventData = {
    event: { ...event, slug: generateSlug(event.title) },
    tables,
    guests,
  };

  const handlePublish = () => {
    const slug = generateSlug(event.title);
    const data: EventData = {
      event: { ...event, slug },
      tables,
      guests,
    };
    saveEvent(data);
    router.push(`/event/${slug}`);
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push("/")}
            className="text-muted hover:text-foreground text-sm transition-colors mb-4 inline-block"
          >
            &larr; Back to home
          </button>
          <h1 className="font-script text-3xl text-foreground">Create Seating Chart</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-8">
          {steps.map((label, i) => (
            <div key={label} className="flex items-center flex-1">
              <div className="flex items-center gap-2 flex-1">
                <div
                  className={`
                    w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0
                    ${i <= step
                      ? "bg-primary text-white"
                      : "bg-card-border text-muted"
                    }
                  `}
                >
                  {i < step ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`text-xs hidden sm:block ${
                    i <= step ? "text-foreground font-medium" : "text-muted"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`h-px flex-1 mx-2 ${
                    i < step ? "bg-primary" : "bg-card-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="bg-card-bg border border-card-border rounded-xl p-6 shadow-sm">
          {step === 0 && (
            <EventDetailsStep
              event={event}
              onChange={setEvent}
              onNext={() => setStep(1)}
            />
          )}
          {step === 1 && (
            <TablesStep
              tables={tables}
              onChange={setTables}
              onNext={() => setStep(2)}
              onBack={() => setStep(0)}
              backgroundImage={event.floorPlanBg}
            />
          )}
          {step === 2 && (
            <GuestsStep
              guests={guests}
              tables={tables}
              onChange={setGuests}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <PreviewStep
              data={eventData}
              onBack={() => setStep(2)}
              onPublish={handlePublish}
            />
          )}
        </div>
      </div>
    </div>
  );
}
