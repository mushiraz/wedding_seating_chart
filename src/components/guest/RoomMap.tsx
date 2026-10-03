"use client";

import { Fixture, Table } from "@/lib/types";
import { isHeadTable, tableNumber, tableTitle } from "@/lib/tableDisplay";

interface RoomMapProps {
  tables: Table[];
  fixtures: Fixture[];
  selectedId: string | null;
  onSelect: (tableId: string) => void;
}

const ROUND_R = 3.3;

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
  let y = base.y;
  let height = base.height;
  const pad = 0.9;
  for (const table of tables) {
    if (!isHeadTable(table)) continue;
    const tw = table.width ?? 7.2;
    const th = table.height ?? 3.6;
    const overlapX = table.x + tw / 2 + pad > base.x && table.x - tw / 2 - pad < base.x + base.width;
    const top = table.y - th / 2 - pad;
    const bottom = table.y + th / 2 + pad;
    if (!overlapX || bottom <= y || top >= y + height) continue;
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
  return { x: base.x, y, width: base.width, height };
}

/** The reception room, fitted to the screen. Tap a table to see who sits there. */
export default function RoomMap({ tables, fixtures, selectedId, onSelect }: RoomMapProps) {
  const dance = fixtures.find((fixture) => fixture.type === "dancefloor");
  const stage = fixtures.find((fixture) => fixture.type === "stage");
  const cake = fixtures.find((fixture) => fixture.type === "cake");
  const dj = fixtures.find((fixture) => fixture.type === "dj");
  const bars = fixtures.filter((fixture) => fixture.type === "bar");
  return (
    <div id="room-map" className="rounded-2xl border border-line bg-cream/60 p-1.5">
      <svg viewBox="0 0 100 100" className="block h-auto w-full" role="group" aria-label="Map of the reception room">
        <rect x="1" y="1" width="98" height="98" rx="1.5" fill="#fbf8f2" stroke="#cfc4b0" strokeWidth="0.35" />

        {dance && (
          <g>
            <rect {...clearOfHeadTables(dance, tables)} rx="0.8" fill="#efe4cc" />
            <text x={dance.x + 4} y={dance.y + 1.2} textAnchor="middle" dominantBaseline="middle" fill="#8a7b62" fontSize="2.4" letterSpacing="0.3">
              Dance floor
            </text>
          </g>
        )}

        {stage && (
          <g>
            <rect {...box(stage)} rx="0.4" fill="#3d5c3d" />
            <text x={stage.x} y={stage.y} textAnchor="middle" dominantBaseline="middle" fill="#f6f1e7" fontSize="1.8" transform={`rotate(-90 ${stage.x} ${stage.y})`}>
              Stage
            </text>
          </g>
        )}

        {dj && (
          <g>
            <rect {...box(dj)} rx="0.4" fill="#3d5c3d" />
            <text x={dj.x} y={dj.y} textAnchor="middle" dominantBaseline="middle" fill="#f6f1e7" fontSize="1.8" transform={`rotate(90 ${dj.x} ${dj.y})`}>
              DJ
            </text>
          </g>
        )}

        {bars.map((bar) => (
          <g key={bar.id}>
            <rect {...box(bar)} rx="0.4" fill="#1c2b24" />
            <text x={bar.x} y={bar.y} textAnchor="middle" dominantBaseline="middle" fill="#f6f1e7" fontSize="1.8">
              Bar
            </text>
          </g>
        ))}

        {/* Bottom-left entrance — gap in the wall */}
        <rect x="4" y="98.4" width="15" height="1.2" fill="#fbf8f2" />
        <text x="11.5" y="96" textAnchor="middle" fill="#6a624f" fontSize="2" fontWeight="600" letterSpacing="0.3">
          ENTRANCE
        </text>

        {/* Right-side entrance — gap in the wall */}
        <rect x="98.4" y="40" width="1.2" height="15" fill="#fbf8f2" />
        <text x="96" y="47.5" textAnchor="middle" fill="#6a624f" fontSize="2" fontWeight="600" letterSpacing="0.3" transform="rotate(90 96 47.5)">
          ENTRANCE
        </text>

        {cake && (
          <g>
            <circle cx={cake.x} cy={cake.y} r="1.6" fill="#f3e6c8" stroke="#b08948" strokeWidth="0.25" />
            <text x={cake.x} y={cake.y + 3.4} textAnchor="middle" fill="#6d5b38" fontSize="1.7">
              Cake
            </text>
          </g>
        )}

        {tables.map((table) => {
          const selected = table.id === selectedId;
          const label = tableNumber(table);
          const head = isHeadTable(table);
          const fill = selected ? "#3d5c3d" : "#fffdf8";
          const ink = selected ? "#f6f1e7" : "#1c2b24";
          const stroke = selected ? "#b08948" : "#3d5c3d";
          const w = table.width ?? 7.2;
          const h = table.height ?? 3.6;
          return (
            <g
              key={table.id}
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
              className="cursor-pointer outline-none"
              opacity={selectedId && !selected ? 0.6 : 1}
            >
              {head ? (
                <>
                  {selected && (
                    <rect className="seat-pulse" x={table.x - w / 2} y={table.y - h / 2} width={w} height={h} rx="0.6" fill="none" stroke="#b08948" strokeWidth="0.5" />
                  )}
                  <rect x={table.x - w / 2} y={table.y - h / 2} width={w} height={h} rx="0.6" fill={fill} stroke={stroke} strokeWidth={selected ? 0.5 : 0.3} />
                </>
              ) : (
                <>
                  {/* Invisible halo widens the tap target past the drawn circle. */}
                  <circle cx={table.x} cy={table.y} r={ROUND_R + 1.4} fill="transparent" />
                  {selected && (
                    <circle className="seat-pulse" cx={table.x} cy={table.y} r={ROUND_R} fill="none" stroke="#b08948" strokeWidth="0.5" />
                  )}
                  <circle cx={table.x} cy={table.y} r={ROUND_R} fill={fill} stroke={stroke} strokeWidth={selected ? 0.5 : 0.3} />
                </>
              )}
              <text
                x={table.x}
                y={table.y + 0.1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={ink}
                fontSize={label.length > 1 ? 2.4 : 2.7}
                fontWeight="600"
                style={{ fontFamily: "var(--font-inter), sans-serif", pointerEvents: "none" }}
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
