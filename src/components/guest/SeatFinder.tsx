"use client";

import { useMemo, useRef, useState } from "react";
import { EventData } from "@/lib/types";
import { findGuests, tableArea, tableNumber, tableTitle, tablesInOrder } from "@/lib/tableDisplay";
import RoomMap from "./RoomMap";

const SHOWN = 8;

export default function SeatFinder({ data }: { data: EventData }) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<{ tableId: string; guestId?: string } | null>(null);
  const roomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const ordered = useMemo(() => tablesInOrder(data.tables), [data.tables]);
  const tableById = useMemo(() => new Map(data.tables.map((table) => [table.id, table])), [data.tables]);
  const matches = useMemo(() => findGuests(data.guests, query), [data.guests, query]);
  const matchTableIds = new Set(matches.map((guest) => guest.tableId).filter(Boolean));

  // Typing narrows to one table on its own; tapping always wins.
  const activeId = picked?.tableId ?? (matchTableIds.size === 1 ? [...matchTableIds][0] : null);
  const activeTable = activeId ? tableById.get(activeId) ?? null : null;
  const highlighted = new Set(picked?.guestId ? [picked.guestId] : matches.map((guest) => guest.id));
  const seatedHere = activeTable
    ? data.guests.filter((guest) => guest.tableId === activeTable.id).sort((a, b) => a.name.localeCompare(b.name))
    : [];

  function choose(tableId: string, guestId?: string) {
    setPicked({ tableId, guestId });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => roomRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }));
  }

  return (
    <section id="find" className="max-w-xl mx-auto">
      <div className="rounded-3xl border border-line bg-paper p-5 sm:p-6 shadow-[0_1px_2px_rgba(28,43,36,0.04),0_12px_32px_-12px_rgba(28,43,36,0.18)]">
        <h2 className="font-serif text-3xl sm:text-4xl leading-tight">Find your seat</h2>
        <p className="mt-1 text-sm text-soft">Type any part of your name: first, middle, or last.</p>

        <div className="relative mt-4">
          <svg aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-label" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" d="m21 21-4.3-4.3M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
          </svg>
          <label htmlFor="seat-search" className="sr-only">Your name</label>
          <input
            ref={inputRef}
            id="seat-search"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPicked(null);
            }}
            placeholder="Your name"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="words"
            spellCheck={false}
            enterKeyHint="search"
            className="w-full rounded-2xl border border-line bg-white py-4 pl-12 pr-12 text-lg text-ink placeholder:text-[#a59d8f] outline-none transition focus:border-sage focus:ring-4 focus:ring-sage/15"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                setPicked(null);
                inputRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-label hover:bg-cream"
            >
              <svg aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          )}
        </div>

        <div aria-live="polite">
          {query.trim() && matches.length === 0 && (
            <p className="mt-4 rounded-2xl bg-cream px-4 py-3 text-sm text-body">
              No one matches &ldquo;{query.trim()}&rdquo;. Try just your first or last name. Still nothing? Ask anyone from either family and they will walk you to your seat.
            </p>
          )}
          {matches.length > 0 && (
            <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
              {matches.slice(0, SHOWN).map((guest) => {
                const table = tableById.get(guest.tableId);
                const active = picked?.guestId === guest.id;
                return (
                  <li key={guest.id}>
                    <button
                      type="button"
                      disabled={!table}
                      onClick={() => table && choose(table.id, guest.id)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${active ? "bg-sage-tint" : "hover:bg-cream/70"}`}
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block truncate font-medium text-ink">{guest.name}</span>
                        <span className="block text-[13px] text-soft">
                          {table ? tableTitle(table) : "Table to be confirmed at the door"}
                        </span>
                      </span>
                      {table && (
                        <span className="grid h-12 min-w-12 shrink-0 place-items-center rounded-xl bg-sage px-2 text-xl font-bold text-cream tabular-nums">
                          {tableNumber(table)}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
              {matches.length > SHOWN && (
                <li className="px-4 py-2.5 text-[13px] text-soft">
                  {matches.length - SHOWN} more. Add your last name to narrow it down.
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      <div ref={roomRef} id="room" className="mt-6 scroll-mt-16 rounded-3xl border border-line bg-paper p-4 sm:p-6 shadow-[0_1px_2px_rgba(28,43,36,0.04)]">
        {activeTable ? (
          <div key={activeTable.id} className="animate-fade-in-up flex items-start gap-4 px-1">
            <span className="grid h-16 min-w-16 shrink-0 place-items-center rounded-2xl bg-sage px-2 text-3xl font-bold text-cream tabular-nums">
              {tableNumber(activeTable)}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="font-serif text-3xl leading-tight">{tableTitle(activeTable)}</p>
              <p className="text-sm text-soft">{tableArea(activeTable)}</p>
            </div>
          </div>
        ) : (
          <div className="px-1">
            <p className="font-serif text-3xl leading-tight">The room</p>
            <p className="text-sm text-soft">Search your name above, or tap any table to see who is sitting there.</p>
          </div>
        )}

        <div className="mt-4">
          <RoomMap tables={data.tables} fixtures={data.fixtures ?? []} selectedId={activeId} onSelect={(id) => setPicked({ tableId: id })} />
          <p className="mt-2 px-1 text-xs text-label">Entrances are at the bottom left and on the right. H1 to H4 are the head tables, V is the vendor table.</p>
        </div>

        {activeTable && (
          <div className="mt-5 border-t border-line pt-4 px-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-label">
              At this table · {seatedHere.length}
            </p>
            {seatedHere.length === 0 ? (
              <p className="mt-2 text-sm text-soft">No one is seated here.</p>
            ) : (
              <ul className="mt-2 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                {seatedHere.map((guest) => (
                  <li
                    key={guest.id}
                    className={`py-1 ${query.trim() && highlighted.has(guest.id) ? "font-semibold text-sage" : "text-ink"}`}
                  >
                    {guest.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-5 border-t border-line pt-4">
          <p className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-label">All tables</p>
          <div className="mt-3 grid grid-cols-6 sm:grid-cols-9 gap-2">
            {ordered.map((table) => {
              const active = table.id === activeId;
              return (
                <button
                  key={table.id}
                  type="button"
                  aria-pressed={active}
                  aria-label={tableTitle(table)}
                  onClick={() => choose(table.id)}
                  className={`h-11 rounded-xl border text-[15px] font-semibold tabular-nums transition-colors ${
                    active ? "border-sage bg-sage text-cream" : "border-line bg-white text-ink hover:border-sage"
                  }`}
                >
                  {tableNumber(table)}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
