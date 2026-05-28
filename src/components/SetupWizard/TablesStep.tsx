"use client";

import { Table, Fixture } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import FloorPlanEditor from "@/components/FloorPlanEditor";

interface TablesStepProps {
  tables: Table[];
  onChange: (tables: Table[]) => void;
  fixtures: Fixture[];
  onFixturesChange: (fixtures: Fixture[]) => void;
  onNext: () => void;
  onBack: () => void;
  backgroundImage?: string;
}

export default function TablesStep({
  tables,
  onChange,
  fixtures,
  onFixturesChange,
  onNext,
  onBack,
  backgroundImage,
}: TablesStepProps) {
  const addTable = () => {
    const num = tables.length + 1;
    const cols = 4;
    const row = Math.floor((num - 1) / cols);
    const col = (num - 1) % cols;
    const x = 15 + col * 22;
    const y = 15 + (row % 4) * 22;
    onChange([
      ...tables,
      {
        id: uuidv4(),
        label: `Table ${num}`,
        shape: "round",
        seats: 8,
        x: Math.min(x, 90),
        y: Math.min(y, 90),
      },
    ]);
  };

  const updateTable = (index: number, updates: Partial<Table>) => {
    const next = [...tables];
    next[index] = { ...next[index], ...updates };
    onChange(next);
  };

  const removeTable = (index: number) => {
    onChange(tables.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Tables & Layout</h2>
        <p className="text-muted text-sm">Add tables, doors, stages, and other elements to your layout</p>
      </div>

      <div className="space-y-3">
        {tables.map((table, i) => (
          <div
            key={table.id}
            className="flex flex-wrap items-center gap-3 p-3 bg-card-bg border border-card-border rounded-lg"
          >
            <input
              type="text"
              value={table.label}
              onChange={(e) => updateTable(i, { label: e.target.value })}
              className="flex-1 min-w-[120px] px-3 py-2 bg-background border border-card-border rounded-md
                text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />

            <select
              value={table.shape}
              onChange={(e) => updateTable(i, { shape: e.target.value as "round" | "rectangle" })}
              className="px-3 py-2 bg-background border border-card-border rounded-md
                text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="round">Round</option>
              <option value="rectangle">Rectangle</option>
            </select>

            <div className="flex items-center gap-2">
              <label className="text-xs text-muted">Seats:</label>
              <input
                type="number"
                min={1}
                max={20}
                value={table.seats}
                onChange={(e) => updateTable(i, { seats: parseInt(e.target.value) || 1 })}
                className="w-16 px-2 py-2 bg-background border border-card-border rounded-md
                  text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <button
              onClick={() => removeTable(i)}
              className="p-2 text-muted hover:text-red-500 transition-colors"
              title="Remove table"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addTable}
        className="w-full py-2.5 border-2 border-dashed border-card-border text-muted rounded-lg
          hover:border-primary-light hover:text-primary transition-colors text-sm font-medium"
      >
        + Add Table
      </button>

      {(tables.length > 0 || fixtures.length > 0) && (
        <div>
          <p className="text-sm font-medium text-foreground mb-2">Arrange Layout</p>
          <FloorPlanEditor
            tables={tables}
            onTablesChange={onChange}
            fixtures={fixtures}
            onFixturesChange={onFixturesChange}
            backgroundImage={backgroundImage}
          />
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
          disabled={tables.length === 0}
          className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium
            hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next: Guests
        </button>
      </div>
    </div>
  );
}
