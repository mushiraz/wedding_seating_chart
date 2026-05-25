"use client";

import { Guest, Table } from "@/lib/types";
import { parseCsvToGuests } from "@/lib/csvParser";
import { v4 as uuidv4 } from "uuid";
import { useRef, useState } from "react";

interface GuestsStepProps {
  guests: Guest[];
  tables: Table[];
  onChange: (guests: Guest[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function GuestsStep({ guests, tables, onChange, onNext, onBack }: GuestsStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newName, setNewName] = useState("");
  const [newTableId, setNewTableId] = useState(tables[0]?.id || "");

  const addGuest = () => {
    if (!newName.trim() || !newTableId) return;
    onChange([
      ...guests,
      { id: uuidv4(), name: newName.trim(), tableId: newTableId },
    ]);
    setNewName("");
  };

  const removeGuest = (id: string) => {
    onChange(guests.filter((g) => g.id !== id));
  };

  const updateGuest = (id: string, updates: Partial<Guest>) => {
    onChange(guests.map((g) => (g.id === id ? { ...g, ...updates } : g)));
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const tableIdMap: Record<string, string> = {};
      tables.forEach((t) => {
        tableIdMap[t.label] = t.id;
        const num = t.label.replace(/\D/g, "");
        if (num) tableIdMap[num] = t.id;
      });

      const parsed = parseCsvToGuests(text, tableIdMap);
      onChange([...guests, ...parsed]);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const tableMap = Object.fromEntries(tables.map((t) => [t.id, t]));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Guests</h2>
        <p className="text-muted text-sm">Add guests manually or upload a CSV file</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 border border-card-border text-foreground rounded-lg text-sm font-medium
            hover:border-primary-light hover:bg-card-bg transition-colors"
        >
          Upload CSV
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleCsvUpload}
          className="hidden"
        />
        <span className="text-xs text-muted self-center">
          Format: name, table (e.g. &quot;John Smith, 1&quot;)
        </span>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addGuest()}
          placeholder="Guest name"
          className="flex-1 px-3 py-2 bg-card-bg border border-card-border rounded-lg
            text-sm text-foreground placeholder:text-muted/50
            focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
        <select
          value={newTableId}
          onChange={(e) => setNewTableId(e.target.value)}
          className="px-3 py-2 bg-card-bg border border-card-border rounded-lg
            text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {tables.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <button
          onClick={addGuest}
          disabled={!newName.trim()}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium
            hover:bg-primary-dark transition-colors disabled:opacity-40"
        >
          Add
        </button>
      </div>

      {guests.length > 0 && (
        <div className="border border-card-border rounded-lg overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            {guests.map((guest) => (
              <div
                key={guest.id}
                className="flex items-center gap-3 px-3 py-2 border-b border-card-border last:border-b-0
                  hover:bg-background/50"
              >
                <span className="flex-1 text-sm text-foreground">{guest.name}</span>
                <select
                  value={guest.tableId}
                  onChange={(e) => updateGuest(guest.id, { tableId: e.target.value })}
                  className="px-2 py-1 bg-background border border-card-border rounded text-xs
                    text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                >
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => removeGuest(guest.id)}
                  className="p-1 text-muted hover:text-red-500 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <div className="px-3 py-2 bg-background/50 text-xs text-muted border-t border-card-border">
            {guests.length} guest{guests.length !== 1 ? "s" : ""} total
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-2.5 border border-card-border text-foreground rounded-lg font-medium
            hover:bg-card-bg transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={guests.length === 0}
          className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium
            hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next: Preview
        </button>
      </div>
    </div>
  );
}
