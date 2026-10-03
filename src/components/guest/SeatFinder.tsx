"use client";

import { useMemo, useState } from "react";
import { EventData, Table } from "@/lib/types";
import { findGuests, isHeadTable, tableNumber, tableTitle, tablesInOrder } from "@/lib/tableDisplay";
import RoomMap from "./RoomMap";

interface SeatFinderProps {
  data: EventData;
}

export default function SeatFinder({ data }: SeatFinderProps) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const ordered = useMemo(() => tablesInOrder(data.tables), [data.tables]);
  const front = ordered.filter((table) => !isHeadTable(table) && !/vendor/i.test(table.label) && table.y < 50);
  const back = ordered.filter((table) => !isHeadTable(table) && (table.y >= 50 || /vendor/i.test(table.label)));
  const heads = ordered.filter((table) => isHeadTable(table));

  const matches = useMemo(() => findGuests(data.guests, query), [data.guests, query]);
  const specificMatch = matches.length === 1 || query.trim().split(/\s+/).filter(Boolean).length >= 2;
  const matchTableIds = new Set(matches.map((guest) => guest.tableId).filter(Boolean));

  const activeId =
    selectedId ??
    (query.trim() && matchTableIds.size === 1 ? [...matchTableIds][0] : null);

  const activeTable = data.tables.find((table) => table.id === activeId) ?? null;
  const seatedHere = activeTable
    ? data.guests.filter((guest) => guest.tableId === activeTable.id).sort((a, b) => a.name.localeCompare(b.name))
    : [];
  const matchedNames = new Set(matches.map((guest) => guest.id));

  function choose(tableId: string) {
    setSelectedId(tableId);
  }

  return (
    <section id="find" className="scroll-mt-20">
      <div className="max-w-3xl mx-auto">
        <p className="text-[11px] tracking-[0.28em] uppercase text-[#6a624f]">Your seat</p>
        <h2 className="font-serif text-4xl text-[#1c2b24] mt-1">Find your name</h2>
        <p className="mt-2 text-sm text-[#5c564c]">
          Type your name. Your table number lights up on the plan below.
        </p>
        <label htmlFor="seat-search" className="sr-only">
          Search for your name
        </label>
        <input
          id="seat-search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedId(null);
          }}
          placeholder="First or last name"
          autoComplete="off"
          enterKeyHint="search"
          className="mt-5 w-full rounded-full border border-[#d9d0c2] bg-white px-5 py-3.5 text-base text-[#1c2b24] placeholder:text-[#8c8578] shadow-sm outline-none focus:border-[#3d5c3d] focus:ring-2 focus:ring-[#3d5c3d]/20"
        />

        <div aria-live="polite" className="mt-4">
          {query.trim() && matches.length === 0 && (
            <p className="rounded-2xl border border-[#e4dccb] bg-white px-4 py-3 text-sm text-[#3f4a42]">
              No guest matches {query.trim()}. Try a first name, then a last name. If you still do not appear, ask someone from either family.
            </p>
          )}
          {matches.length > 0 && (
            <ul className="space-y-2">
              {matches.slice(0, 6).map((guest) => {
                const table = data.tables.find((item) => item.id === guest.tableId);
                const note = kitchenNote(guest.dietaryRestrictions, specificMatch);
                return (
                  <li key={guest.id}>
                    <button
                      type="button"
                      onClick={() => guest.tableId && choose(guest.tableId)}
                      className="w-full rounded-2xl border border-[#e4dccb] bg-white px-4 py-3 text-left shadow-sm hover:border-[#3d5c3d]"
                    >
                      <span className="block font-medium text-[#1c2b24]">{guest.name}</span>
                      <span className="mt-1 block font-serif text-2xl text-[#3d5c3d]">
                        {table ? tableTitle(table) : "No table assigned yet"}
                      </span>
                      {note && (
                        <span className="mt-1 block text-[13px] text-[#5c564c]">Kitchen note: {note}</span>
                      )}
                    </button>
                  </li>
                );
              })}
              {matches.length > 6 && (
                <li className="text-sm text-[#5c564c]">Keep typing. {matches.length - 6} more names match.</li>
              )}
            </ul>
          )}
        </div>
      </div>

      <div id="room" className="scroll-mt-20 max-w-5xl mx-auto mt-10">
        <p className="text-[11px] tracking-[0.28em] uppercase text-[#6a624f]">The room</p>
        <h2 className="font-serif text-4xl text-[#1c2b24] mt-1 mb-4">Where the tables are</h2>
        <RoomMap
          tables={data.tables}
          fixtures={data.fixtures ?? []}
          selectedId={activeId}
          onSelect={choose}
        />

        <div className="mt-6 space-y-4">
          <TableChips label="Front of the room" tables={front} activeId={activeId} onSelect={choose} />
          <TableChips label="Head tables" tables={heads} activeId={activeId} onSelect={choose} />
          <TableChips label="Back of the room" tables={back} activeId={activeId} onSelect={choose} />
        </div>

        {activeTable && (
          <div className="mt-6 rounded-2xl border border-[#e4dccb] bg-white p-5 shadow-sm">
            <p className="text-[11px] tracking-[0.22em] uppercase text-[#6a624f]">Seated here</p>
            <h3 className="font-serif text-3xl text-[#1c2b24]">{tableTitle(activeTable)}</h3>
            {seatedHere.length === 0 ? (
              <p className="mt-2 text-sm text-[#5c564c]">No guests are assigned to this table.</p>
            ) : (
              <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                {seatedHere.map((guest) => (
                  <li
                    key={guest.id}
                    className={matchedNames.has(guest.id) ? "font-semibold text-[#3d5c3d]" : "text-[#1c2b24]"}
                  >
                    {guest.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function kitchenNote(note: string | undefined, specific: boolean): string | null {
  if (!specific || !note) return null;
  const text = note.trim();
  if (!text || /^halal$/i.test(text)) return null;
  return text;
}

function TableChips({
  label,
  tables,
  activeId,
  onSelect,
}: {
  label: string;
  tables: Table[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <p className="text-[11px] tracking-[0.18em] uppercase text-[#6a624f] mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {tables.map((table) => {
          const active = table.id === activeId;
          return (
            <button
              key={table.id}
              type="button"
              aria-pressed={active}
              aria-label={tableTitle(table)}
              onClick={() => onSelect(table.id)}
              className={`min-w-11 rounded-full px-3 py-1.5 text-sm border ${
                active
                  ? "bg-[#3d5c3d] text-[#f6f1e7] border-[#3d5c3d]"
                  : "bg-white text-[#1c2b24] border-[#d9d0c2] hover:border-[#3d5c3d]"
              }`}
            >
              {tableNumber(table)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
