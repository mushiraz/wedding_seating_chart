"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import { EventData, Guest, Table } from "@/lib/types";
import { loadEvent, saveEvent } from "@/lib/storage";
import { v4 as uuidv4 } from "uuid";
import sampleData from "@/data/sample.json";
import ahadRehnubaData from "@/data/ahad-rehnuba.json";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import ViewToggle from "@/components/ViewToggle";
import GuestGrid from "@/components/GuestGrid";
import FloorPlan from "@/components/FloorPlan";
import FloorPlanEditor from "@/components/FloorPlanEditor";
import QRCodeDisplay from "@/components/QRCodeDisplay";

export default function EventPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [data, setData] = useState<EventData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "map">("list");
  const [highlightedTableId, setHighlightedTableId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editNewName, setEditNewName] = useState("");
  const [editNewTableId, setEditNewTableId] = useState("");
  const [editSearch, setEditSearch] = useState("");

  useEffect(() => {
    let loaded = loadEvent(slug);
    if (slug === "john-sarah-wedding") {
      if (!loaded || !loaded.fixtures) {
        loaded = sampleData as EventData;
        saveEvent(loaded);
      }
    }
    if (slug === "ahad-and-rehnuba") {
      const venueLayout = ahadRehnubaData as EventData;
      if (!loaded) {
        // First load — seed everything from JSON
        loaded = venueLayout;
      } else {
        // Always use JSON as source of truth
        loaded.tables = venueLayout.tables;
        loaded.fixtures = venueLayout.fixtures;
        loaded.guests = venueLayout.guests;
      }
      saveEvent(loaded);
    }
    if (loaded) {
      setData(loaded);
    } else {
      setNotFound(true);
    }
  }, [slug]);

  const persist = useCallback((updated: EventData) => {
    setData(updated);
    saveEvent(updated);
  }, []);

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

  const updateGuest = useCallback((guestId: string, updates: Partial<Guest>) => {
    if (!data) return;
    persist({
      ...data,
      guests: data.guests.map((g) => (g.id === guestId ? { ...g, ...updates } : g)),
    });
  }, [data, persist]);

  const removeGuest = useCallback((guestId: string) => {
    if (!data) return;
    persist({
      ...data,
      guests: data.guests.filter((g) => g.id !== guestId),
    });
  }, [data, persist]);

  const addGuest = useCallback(() => {
    if (!data || !editNewName.trim()) return;
    persist({
      ...data,
      guests: [...data.guests, { id: uuidv4(), name: editNewName.trim(), tableId: editNewTableId }],
    });
    setEditNewName("");
  }, [data, editNewName, editNewTableId, persist]);

  const guestsByTable = useMemo(() => {
    if (!data) return {};
    const map: Record<string, Guest[]> = {};
    for (const g of data.guests) {
      const key = g.tableId || "__unassigned";
      if (!map[key]) map[key] = [];
      map[key].push(g);
    }
    return map;
  }, [data]);

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

      {/* Edit mode toggle */}
      <div className="max-w-5xl mx-auto w-full px-4 mb-2">
        <div className="flex justify-end">
          <button
            onClick={() => setEditing(!editing)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${editing
                ? "bg-primary text-white shadow-sm"
                : "border border-card-border text-muted hover:text-foreground hover:border-primary-light"
              }
            `}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {editing ? "Done Editing" : "Edit Seating"}
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 pb-8">
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
          <div className="flex-1 w-full">
            <SearchBar value={search} onChange={setSearch} />
          </div>
          <ViewToggle view={view} onChange={setView} />
        </div>

        {/* Edit panel */}
        {editing && (
          <div className="mb-6 animate-fade-in space-y-4">
            {/* Add guest inline */}
            <div className="bg-card-bg border border-primary/30 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-medium text-foreground uppercase tracking-wider mb-3">Add a Guest</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editNewName}
                  onChange={(e) => setEditNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addGuest()}
                  placeholder="Guest name"
                  className="flex-1 px-3 py-2 bg-background border border-card-border rounded-lg
                    text-sm text-foreground placeholder:text-muted/50
                    focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <select
                  value={editNewTableId}
                  onChange={(e) => setEditNewTableId(e.target.value)}
                  className="px-3 py-2 bg-background border border-card-border rounded-lg
                    text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Unassigned</option>
                  {data.tables.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
                <button
                  onClick={addGuest}
                  disabled={!editNewName.trim()}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium
                    hover:bg-primary-dark transition-colors disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Table overview with guest assignments */}
            <div className="bg-card-bg border border-primary/30 rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-2.5 border-b border-card-border flex items-center gap-3">
                <p className="text-xs font-medium text-foreground uppercase tracking-wider shrink-0">Seating Assignments</p>
                <div className="relative flex-1">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={editSearch}
                    onChange={(e) => setEditSearch(e.target.value)}
                    placeholder="Search guest name..."
                    className="w-full pl-7 pr-7 py-1.5 bg-background border border-card-border rounded-lg
                      text-xs text-foreground placeholder:text-muted/50
                      focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary"
                  />
                  {editSearch && (
                    <button
                      onClick={() => setEditSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-[420px] overflow-y-auto divide-y divide-card-border">
                {(() => {
                  const q = editSearch.toLowerCase().trim();
                  const filterGuests = (guests: Guest[]) =>
                    q ? guests.filter((g) => g.name.toLowerCase().includes(q)) : guests;

                  return (
                    <>
                      {data.tables.map((table) => {
                        const assigned = guestsByTable[table.id] || [];
                        const filtered = filterGuests(assigned);
                        if (q && filtered.length === 0) return null;
                        return (
                          <TableEditSection
                            key={table.id}
                            table={table}
                            guests={filtered}
                            totalAssigned={assigned.length}
                            allTables={data.tables}
                            guestsByTable={guestsByTable}
                            onUpdateGuest={updateGuest}
                            onRemoveGuest={removeGuest}
                            forceOpen={!!q && filtered.length > 0}
                          />
                        );
                      })}
                      {/* Unassigned section */}
                      {(() => {
                        const unassigned = guestsByTable["__unassigned"] || [];
                        const filtered = filterGuests(unassigned);
                        if (filtered.length === 0) return null;
                        return (
                          <div className="p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-semibold text-orange-600">Unassigned</span>
                              <span className="text-[10px] font-mono text-orange-500">
                                {filtered.length}{q ? ` / ${unassigned.length}` : ""}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {filtered.map((guest) => (
                                <div key={guest.id} className="flex items-center gap-2">
                                  <span className="flex-1 text-xs text-foreground truncate">{guest.name}</span>
                                  <select
                                    value=""
                                    onChange={(e) => updateGuest(guest.id, { tableId: e.target.value })}
                                    className="px-1.5 py-0.5 bg-background border border-card-border rounded text-[11px]
                                      text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                                  >
                                    <option value="">Unassigned</option>
                                    {data.tables.map((t) => (
                                      <option key={t.id} value={t.id}>{t.label}</option>
                                    ))}
                                  </select>
                                  <button onClick={() => removeGuest(guest.id)} className="p-0.5 text-muted hover:text-red-500 transition-colors">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      {q && data.guests.filter((g) => g.name.toLowerCase().includes(q)).length === 0 && (
                        <div className="p-4 text-center">
                          <p className="text-xs text-muted">No guests matching &ldquo;{editSearch}&rdquo;</p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        <div key={view} className="animate-fade-in">
          {view === "list" ? (
            <GuestGrid
              guests={filteredGuests}
              tables={tableMap}
              searchQuery={search}
            />
          ) : editing ? (
            <FloorPlanEditor
              tables={data.tables}
              onTablesChange={(tables) => persist({ ...data, tables })}
              fixtures={data.fixtures || []}
              onFixturesChange={(fixtures) => persist({ ...data, fixtures })}
              backgroundImage={data.event.floorPlanBg}
            />
          ) : (
            <FloorPlan
              tables={data.tables}
              guests={data.guests}
              fixtures={data.fixtures}
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

function TableEditSection({
  table,
  guests,
  totalAssigned,
  allTables,
  guestsByTable,
  onUpdateGuest,
  onRemoveGuest,
  forceOpen,
}: {
  table: Table;
  guests: Guest[];
  totalAssigned?: number;
  allTables: Table[];
  guestsByTable: Record<string, Guest[]>;
  onUpdateGuest: (guestId: string, updates: Partial<Guest>) => void;
  onRemoveGuest: (guestId: string) => void;
  forceOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const total = totalAssigned ?? guests.length;
  const isFull = total >= table.seats;
  const isOver = total > table.seats;
  const isOpen = forceOpen || open;

  return (
    <div className="p-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 text-left"
      >
        <svg
          className={`w-3 h-3 text-muted transition-transform ${open ? "rotate-90" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-xs font-semibold text-foreground">{table.label}</span>
        <span className={`text-[10px] font-mono ${isOver ? "text-red-500 font-bold" : isFull ? "text-primary font-bold" : "text-muted"}`}>
          {total}/{table.seats}
        </span>
        <div className="flex-1" />
        <div className="w-16 h-1.5 bg-card-border rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isOver ? "bg-red-400" : isFull ? "bg-primary" : "bg-primary-light"}`}
            style={{ width: `${Math.min(100, (total / table.seats) * 100)}%` }}
          />
        </div>
      </button>
      {isOpen && (
        <div className="mt-2 ml-5 space-y-1 animate-fade-in">
          {guests.length === 0 && (
            <p className="text-[11px] text-muted italic">No guests assigned</p>
          )}
          {guests.map((guest) => (
            <div key={guest.id} className="flex items-center gap-2">
              <span className="flex-1 text-xs text-foreground truncate">{guest.name}</span>
              <select
                value={guest.tableId}
                onChange={(e) => onUpdateGuest(guest.id, { tableId: e.target.value })}
                className="px-1.5 py-0.5 bg-background border border-card-border rounded text-[11px]
                  text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
              >
                <option value="">Unassigned</option>
                {allTables.map((t) => {
                  const count = (guestsByTable[t.id] || []).length;
                  return (
                    <option key={t.id} value={t.id}>
                      {t.label} ({count}/{t.seats})
                    </option>
                  );
                })}
              </select>
              <button onClick={() => onRemoveGuest(guest.id)} className="p-0.5 text-muted hover:text-red-500 transition-colors">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
