"use client";

import { useEffect } from "react";
import { Fixture, Table } from "@/lib/types";
import { tableNumber, tableTitle } from "@/lib/tableDisplay";

interface RoomMapProps {
  tables: Table[];
  fixtures: Fixture[];
  selectedId: string | null;
  onSelect: (tableId: string) => void;
}

function box(fixture: Fixture) {
  return {
    x: fixture.x - fixture.width / 2,
    y: fixture.y - fixture.height / 2,
    width: fixture.width,
    height: fixture.height,
  };
}

/** Pull the dance floor off the head tables so they read as sitting beside it. */
function clearOfHeadTables(dance: Fixture, tables: Table[]) {
  const base = box(dance);
  const x = base.x;
  const width = base.width;
  let y = base.y;
  let height = base.height;
  const pad = 0.9;
  for (const table of tables) {
    if (!/^rect/i.test(table.label)) continue;
    const tw = table.width ?? 7.2;
    const th = table.height ?? 3.6;
    const left = table.x - tw / 2 - pad;
    const right = table.x + tw / 2 + pad;
    const top = table.y - th / 2 - pad;
    const bottom = table.y + th / 2 + pad;
    const overlapX = right > x && left < x + width;
    const overlapY = bottom > y && top < y + height;
    if (!overlapX || !overlapY) continue;
    if (table.y < y + height / 2) {
      const cut = bottom - y;
      if (cut > 0 && cut < height * 0.45) {
        y += cut;
        height -= cut;
      }
    } else {
      const cut = y + height - top;
      if (cut > 0 && cut < height * 0.45) height -= cut;
    }
  }
  return { x, y, width, height };
}

export default function RoomMap({ tables, fixtures, selectedId, onSelect }: RoomMapProps) {
  const dance = fixtures.find((fixture) => fixture.type === "dancefloor");
  const stage = fixtures.find((fixture) => fixture.type === "stage");
  const cake = fixtures.find((fixture) => fixture.type === "cake");
  const dj = fixtures.find((fixture) => fixture.type === "dj");
  const bars = fixtures.filter((fixture) => fixture.type === "bar");

  useEffect(() => {
    if (!selectedId) return;
    const node = document.getElementById(`seat-${selectedId}`);
    const scroller = document.getElementById("room-map");
    if (!node || !scroller) return;
    const nodeRect = node.getBoundingClientRect();
    const boxRect = scroller.getBoundingClientRect();
    const delta = nodeRect.left - boxRect.left - boxRect.width / 2 + nodeRect.width / 2;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller.scrollTo({ left: scroller.scrollLeft + delta, behavior: reduce ? "auto" : "smooth" });
  }, [selectedId]);

  return (
    <div>
      <p className="text-[13px] text-[#5c564c] mb-3">
        Entrance is at the top. The stage is on the left, the DJ is on the right, and the bars are along the bottom. Swipe if the room is wider than your screen.
      </p>
      <div id="room-map" className="overflow-auto rounded-2xl border border-[#e4dccb] bg-[#f7f3ea] shadow-sm">
        <svg
          viewBox="0 0 100 100"
          className="block h-auto w-full min-w-[840px]"
          role="group"
          aria-label="Tables in the reception room"
        >
          <rect x="1.2" y="1.2" width="97.6" height="97.6" rx="1.2" fill="#fbf8f2" stroke="#cfc4b0" strokeWidth="0.4" />
          <rect x="40.2" y="0.7" width="12.2" height="1.3" fill="#f7f3ea" />
          <text x="46.3" y="3.6" textAnchor="middle" fill="#5c564c" fontSize="1.45" letterSpacing="0.16">
            Entrance
          </text>

          {dance && (
            <g>
              <rect {...clearOfHeadTables(dance, tables)} rx="0.6" fill="#efe4cc" stroke="#e0d3b8" strokeWidth="0.3" />
              <text
                x={dance.x}
                y={dance.y + 1.2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#8a7b62"
                fontSize="1.7"
                letterSpacing="0.2"
              >
                Dance floor
              </text>
            </g>
          )}

          {stage && (
            <g>
              <rect {...box(stage)} rx="0.3" fill="#3d5c3d" />
              <text
                x={stage.x}
                y={stage.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#f6f1e7"
                fontSize="1.5"
                transform={`rotate(-90 ${stage.x} ${stage.y})`}
              >
                Stage
              </text>
            </g>
          )}

          {dj && (
            <g>
              <rect {...box(dj)} rx="0.3" fill="#3d5c3d" />
              <text
                x={dj.x}
                y={dj.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#f6f1e7"
                fontSize="1.5"
                transform={`rotate(90 ${dj.x} ${dj.y})`}
              >
                DJ
              </text>
            </g>
          )}

          {bars.map((bar) => (
            <g key={bar.id}>
              <rect {...box(bar)} rx="0.3" fill="#1c2b24" />
              <text x={bar.x} y={bar.y} textAnchor="middle" dominantBaseline="middle" fill="#f6f1e7" fontSize="1.45">
                Bar
              </text>
            </g>
          ))}

          {cake && (
            <g>
              <circle cx={cake.x} cy={cake.y} r="1.5" fill="#f3e6c8" stroke="#b08948" strokeWidth="0.2" />
              <text x={cake.x} y={cake.y + 2.6} textAnchor="middle" fill="#6d5b38" fontSize="1.35">
                Cake
              </text>
            </g>
          )}

          {tables.map((table) => {
            const selected = table.id === selectedId;
            const label = tableNumber(table);
            const head = /^rect/i.test(table.label);
            const fill = selected ? "#3d5c3d" : "#fffdf8";
            const ink = selected ? "#f6f1e7" : "#1c2b24";
            const stroke = selected ? "#b08948" : "#3d5c3d";
            return (
              <g
                key={table.id}
                id={`seat-${table.id}`}
                role="button"
                tabIndex={0}
                aria-label={tableTitle(table)}
                aria-pressed={selected}
                onClick={() => onSelect(table.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(table.id);
                  }
                }}
                className="cursor-pointer"
              >
                {head ? (
                  <>
                    {selected && (
                      <rect
                        x={table.x - (table.width ?? 7.2) / 2 - 0.45}
                        y={table.y - (table.height ?? 3.6) / 2 - 0.45}
                        width={(table.width ?? 7.2) + 0.9}
                        height={(table.height ?? 3.6) + 0.9}
                        rx="0.6"
                        fill="none"
                        stroke="#b08948"
                        strokeWidth="0.28"
                      />
                    )}
                    <rect
                      x={table.x - (table.width ?? 7.2) / 2}
                      y={table.y - (table.height ?? 3.6) / 2}
                      width={table.width ?? 7.2}
                      height={table.height ?? 3.6}
                      rx="0.45"
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={selected ? 0.4 : 0.28}
                    />
                  </>
                ) : (
                  <>
                    {selected && (
                      <circle cx={table.x} cy={table.y} r="2.85" fill="none" stroke="#b08948" strokeWidth="0.28" />
                    )}
                    <circle cx={table.x} cy={table.y} r="2.25" fill={fill} stroke={stroke} strokeWidth={selected ? 0.4 : 0.28} />
                  </>
                )}
                <text
                  x={table.x}
                  y={table.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={ink}
                  fontSize={label.length > 2 ? 1.5 : 1.85}
                  fontWeight="600"
                  style={{ fontFamily: "var(--font-inter), sans-serif" }}
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="mt-3 text-[12px] tracking-[0.14em] uppercase text-[#5c564c]">
        H1 to H4 are the head tables beside the dance floor. V is the vendor table.
      </p>
    </div>
  );
}
