"use client";

import { Guest, Table } from "@/lib/types";
import { parseCsvToGuests } from "@/lib/csvParser";
import { v4 as uuidv4 } from "uuid";
import { useRef, useState, useMemo } from "react";

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
  const [filterTableId, setFilterTableId] = useState<string>("all");

  const addGuest = () => {
    if (!newName.trim()) return;
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

  const guestsByTable = useMemo(() => {
    const map: Record<string, Guest[]> = {};
    for (const g of guests) {
      const key = g.tableId || "__unassigned";
      if (!map[key]) map[key] = [];
      map[key].push(g);
    }
    return map;
  }, [guests]);

  const filteredGuests = useMemo(() => {
    if (filterTableId === "all") return guests;
    if (filterTableId === "__unassigned") return guests.filter((g) => !g.tableId);
    return guests.filter((g) => g.tableId === filterTableId);
  }, [guests, filterTableId]);

  const unassignedCount = guests.filter((g) => !g.tableId).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Guests</h2>
        <p className="text-muted text-sm">Add guests manually or upload a CSV file</p>
      </div>

      {/* Table occupancy overview */}
      {tables.length > 0 && (
        <div className="border border-card-border rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-background/50 border-b border-card-border">
            <p className="text-xs font-medium text-foreground uppercase tracking-wider">Table Overview</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-px bg-card-border">
            {tables.map((table) => {
              const assigned = guestsByTable[table.id] || [];
              const isFull = assigned.length >= table.seats;
              const isOver = assigned.length > table.seats;
              const isActive = filterTableId === table.id;

              return (
                <button
                  key={table.id}
                  onClick={() => setFilterTableId(isActive ? "all" : table.id)}
                  className={`
                    bg-card-bg p-2.5 text-left transition-all hover:bg-primary/5 relative
                    ${isActive ? "ring-2 ring-primary ring-inset" : ""}
                  `}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-foreground truncate">{table.label}</span>
                    <span className={`text-[10px] font-mono ${isOver ? "text-red-500 font-bold" : isFull ? "text-primary font-bold" : "text-muted"}`}>
                      {assigned.length}/{table.seats}
                    </span>
                  </div>
                  {/* Capacity bar */}
                  <div className="w-full h-1.5 bg-card-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isOver ? "bg-red-400" : isFull ? "bg-primary" : "bg-primary-light"}`}
                      style={{ width: `${Math.min(100, (assigned.length / table.seats) * 100)}%` }}
                    />
                  </div>
                  {/* Guest names preview */}
                  {assigned.length > 0 && (
                    <div className="mt-1.5 space-y-px">
                      {assigned.slice(0, 3).map((g) => (
                        <p key={g.id} className="text-[10px] text-muted truncate leading-tight">{g.name}</p>
                      ))}
                      {assigned.length > 3 && (
                        <p className="text-[10px] text-muted/60">+{assigned.length - 3} more</p>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
            {/* Unassigned tile */}
            {unassignedCount > 0 && (
              <button
                onClick={() => setFilterTableId(filterTableId === "__unassigned" ? "all" : "__unassigned")}
                className={`
                  bg-card-bg p-2.5 text-left transition-all hover:bg-orange-50 relative
                  ${filterTableId === "__unassigned" ? "ring-2 ring-orange-400 ring-inset" : ""}
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-orange-600">Unassigned</span>
                  <span className="text-[10px] font-mono text-orange-500 font-bold">{unassignedCount}</span>
                </div>
                <div className="w-full h-1.5 bg-orange-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-orange-400" style={{ width: "100%" }} />
                </div>
              </button>
            )}
          </div>
          {filterTableId !== "all" && (
            <div className="px-3 py-1.5 bg-primary/5 border-t border-card-border flex items-center justify-between">
              <span className="text-xs text-primary font-medium">
                Filtering: {filterTableId === "__unassigned" ? "Unassigned" : tables.find((t) => t.id === filterTableId)?.label}
              </span>
              <button
                onClick={() => setFilterTableId("all")}
                className="text-xs text-muted hover:text-foreground transition-colors"
              >
                Show all
              </button>
            </div>
          )}
        </div>
      )}

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
          <option value="">Unassigned</option>
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

      {filteredGuests.length > 0 && (
        <div className="border border-card-border rounded-lg overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            {filteredGuests.map((guest) => (
              <div
                key={guest.id}
                className="flex items-center gap-3 px-3 py-2 border-b border-card-border last:border-b-0
                  hover:bg-background/50"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-foreground block truncate">{guest.name}</span>
                  {guest.dietaryRestrictions && (
                    <span className="text-[10px] text-amber-600 block truncate" title={guest.dietaryRestrictions}>
                      🍽 {guest.dietaryRestrictions}
                    </span>
                  )}
                </div>
                <select
                  value={guest.tableId}
                  onChange={(e) => updateGuest(guest.id, { tableId: e.target.value })}
                  className="px-2 py-1 bg-background border border-card-border rounded text-xs
                    text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                >
                  <option value="">Unassigned</option>
                  {tables.map((t) => {
                    const count = (guestsByTable[t.id] || []).length;
                    const isFull = count >= t.seats;
                    return (
                      <option key={t.id} value={t.id}>
                        {t.label} ({count}/{t.seats}){isFull ? " ✓" : ""}
                      </option>
                    );
                  })}
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
          <div className="px-3 py-2 bg-background/50 text-xs text-muted border-t border-card-border flex gap-3 flex-wrap">
            <span>
              {filterTableId !== "all"
                ? `${filteredGuests.length} shown / ${guests.length} total`
                : `${guests.length} guest${guests.length !== 1 ? "s" : ""} total`
              }
            </span>
            {guests.filter((g) => g.dietaryRestrictions).length > 0 && (
              <span className="text-amber-600">
                🍽 {guests.filter((g) => g.dietaryRestrictions).length} with dietary notes
              </span>
            )}
            {unassignedCount > 0 && (
              <span className="text-orange-500">
                {unassignedCount} unassigned
              </span>
            )}
          </div>
        </div>
      )}

      {guests.length > 0 && filteredGuests.length === 0 && filterTableId !== "all" && (
        <div className="text-center py-8">
          <p className="text-muted text-sm">No guests in this table</p>
          <button onClick={() => setFilterTableId("all")} className="text-primary text-sm mt-1 hover:underline">
            Show all guests
          </button>
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
