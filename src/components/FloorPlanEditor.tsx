"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Table, Fixture, FixtureType, FIXTURE_PRESETS } from "@/lib/types";

interface FloorPlanEditorProps {
  tables: Table[];
  onTablesChange: (tables: Table[]) => void;
  fixtures: Fixture[];
  onFixturesChange: (fixtures: Fixture[]) => void;
  backgroundImage?: string;
}

type DragTarget =
  | { kind: "table"; index: number; offsetX: number; offsetY: number }
  | { kind: "fixture"; index: number; offsetX: number; offsetY: number };

type Selection =
  | { kind: "table"; index: number }
  | { kind: "fixture"; index: number }
  | null;

const FIXTURE_COLORS: Record<FixtureType, { fill: string; stroke: string; textColor: string }> = {
  door:       { fill: "#a88c6d", stroke: "#7a6344", textColor: "#ffffff" },
  stage:      { fill: "#8b7ec8", stroke: "#6558a8", textColor: "#ffffff" },
  walkway:    { fill: "#c9c2b5", stroke: "#a89e90", textColor: "#5a5550" },
  dancefloor: { fill: "#d4a0a0", stroke: "#b87878", textColor: "#ffffff" },
  bar:        { fill: "#5a8fa8", stroke: "#3d6e84", textColor: "#ffffff" },
  dj:         { fill: "#a85a8f", stroke: "#843d6e", textColor: "#ffffff" },
};

export default function FloorPlanEditor({
  tables,
  onTablesChange,
  fixtures,
  onFixturesChange,
  backgroundImage,
}: FloorPlanEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);
  const [dragging, setDragging] = useState<DragTarget | null>(null);
  const [selected, setSelected] = useState<Selection>(null);

  useEffect(() => {
    if (!backgroundImage) { setBgImg(null); return; }
    const img = new Image();
    img.onload = () => setBgImg(img);
    img.src = backgroundImage;
  }, [backgroundImage]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        setDimensions({ width: w, height: Math.max(400, w * 0.6) });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const getTableBounds = useCallback(
    (table: Table) => {
      const cx = (table.x / 100) * dimensions.width;
      const cy = (table.y / 100) * dimensions.height;
      if (table.shape === "round") {
        const r = Math.min(dimensions.width, dimensions.height) * 0.05;
        return { cx, cy, r, w: 0, h: 0, isRound: true };
      }
      const w = (table.width || 14) * (dimensions.width / 100);
      const h = (table.height || 6) * (dimensions.height / 100);
      return { cx, cy, r: 0, w, h, isRound: false };
    },
    [dimensions]
  );

  const getFixtureBounds = useCallback(
    (fixture: Fixture) => {
      const cx = (fixture.x / 100) * dimensions.width;
      const cy = (fixture.y / 100) * dimensions.height;
      const w = (fixture.width / 100) * dimensions.width;
      const h = (fixture.height / 100) * dimensions.height;
      return { cx, cy, w, h };
    },
    [dimensions]
  );

  const drawFixture = useCallback(
    (ctx: CanvasRenderingContext2D, fixture: Fixture, isSelected: boolean) => {
      const { cx, cy, w, h } = getFixtureBounds(fixture);
      const colors = FIXTURE_COLORS[fixture.type];

      if (isSelected) {
        ctx.strokeStyle = "#5a7d5a";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(cx - w / 2 - 4, cy - h / 2 - 4, w + 8, h + 8);
        ctx.setLineDash([]);
      }

      ctx.save();
      if (fixture.rotation) {
        ctx.translate(cx, cy);
        ctx.rotate((fixture.rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }

      if (fixture.type === "dancefloor") {
        const tileSize = Math.min(w, h) / 4;
        for (let r = 0; r < Math.ceil(h / tileSize); r++) {
          for (let c = 0; c < Math.ceil(w / tileSize); c++) {
            const tx = cx - w / 2 + c * tileSize;
            const ty = cy - h / 2 + r * tileSize;
            const tw = Math.min(tileSize, cx + w / 2 - tx);
            const th = Math.min(tileSize, cy + h / 2 - ty);
            ctx.fillStyle = (r + c) % 2 === 0 ? colors.fill : "#e8bfbf";
            ctx.fillRect(tx, ty, tw, th);
          }
        }
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
      } else if (fixture.type === "walkway") {
        ctx.fillStyle = colors.fill;
        ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = "#a89e90";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - w / 2 + 4, cy);
        ctx.lineTo(cx + w / 2 - 4, cy);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
      } else if (fixture.type === "door") {
        ctx.fillStyle = colors.fill;
        ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
        // Door arc indicator
        ctx.beginPath();
        ctx.arc(cx - w / 2, cy + h / 2, w * 0.6, -Math.PI / 2, 0);
        ctx.strokeStyle = "rgba(122, 99, 68, 0.4)";
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.fillStyle = colors.fill;
        ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
      }

      ctx.restore();

      ctx.fillStyle = colors.textColor;
      ctx.font = `bold ${Math.max(9, dimensions.width * 0.012)}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(fixture.label, cx, cy);
    },
    [dimensions, getFixtureBounds]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = "#f5f3ee";
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    if (bgImg) {
      ctx.globalAlpha = 0.2;
      ctx.drawImage(bgImg, 0, 0, dimensions.width, dimensions.height);
      ctx.globalAlpha = 1;
    }

    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "#d4cfc6";
    ctx.lineWidth = 1;
    const gridSpacing = dimensions.width / 10;
    for (let x = gridSpacing; x < dimensions.width; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, dimensions.height);
      ctx.stroke();
    }
    for (let y = gridSpacing; y < dimensions.height; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(dimensions.width, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.strokeStyle = "#c4bdb2";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, dimensions.width, dimensions.height);

    // Draw fixtures first (behind tables)
    fixtures.forEach((fixture, i) => {
      const isSel = selected?.kind === "fixture" && selected.index === i;
      drawFixture(ctx, fixture, isSel);
    });

    // Draw tables
    tables.forEach((table, i) => {
      const bounds = getTableBounds(table);
      const isSelected = selected?.kind === "table" && selected.index === i;

      if (bounds.isRound) {
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(bounds.cx, bounds.cy, bounds.r + 6, 0, 2 * Math.PI);
          ctx.strokeStyle = "#5a7d5a";
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.arc(bounds.cx, bounds.cy, bounds.r, 0, 2 * Math.PI);
        ctx.fillStyle = isSelected ? "#7da67d" : "#d4cfc6";
        ctx.fill();
        ctx.strokeStyle = isSelected ? "#3d5c3d" : "#b8b0a4";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const chairR = bounds.r * 0.7;
        for (let s = 0; s < table.seats; s++) {
          const angle = (2 * Math.PI * s) / table.seats - Math.PI / 2;
          const sx = bounds.cx + chairR * Math.cos(angle);
          const sy = bounds.cy + chairR * Math.sin(angle);
          ctx.beginPath();
          ctx.arc(sx, sy, 4, 0, 2 * Math.PI);
          ctx.fillStyle = isSelected ? "#5a7d5a" : "#b8b0a4";
          ctx.fill();
        }
      } else {
        if (isSelected) {
          ctx.strokeStyle = "#5a7d5a";
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 3]);
          ctx.strokeRect(
            bounds.cx - bounds.w / 2 - 6,
            bounds.cy - bounds.h / 2 - 6,
            bounds.w + 12,
            bounds.h + 12
          );
          ctx.setLineDash([]);
        }

        ctx.fillStyle = isSelected ? "#7da67d" : "#d4cfc6";
        ctx.fillRect(bounds.cx - bounds.w / 2, bounds.cy - bounds.h / 2, bounds.w, bounds.h);
        ctx.strokeStyle = isSelected ? "#3d5c3d" : "#b8b0a4";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bounds.cx - bounds.w / 2, bounds.cy - bounds.h / 2, bounds.w, bounds.h);
      }

      ctx.fillStyle = isSelected ? "#ffffff" : "#5a5550";
      ctx.font = `bold ${Math.max(10, dimensions.width * 0.013)}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(table.label, bounds.cx, bounds.cy);
    });
  }, [dimensions, tables, fixtures, bgImg, selected, getTableBounds, drawFixture]);

  useEffect(() => { draw(); }, [draw]);

  const hitTest = useCallback(
    (x: number, y: number): Selection => {
      // Check tables first (they render on top)
      for (let i = tables.length - 1; i >= 0; i--) {
        const bounds = getTableBounds(tables[i]);
        if (bounds.isRound) {
          if (Math.hypot(x - bounds.cx, y - bounds.cy) < bounds.r + 8) return { kind: "table", index: i };
        } else {
          if (
            x >= bounds.cx - bounds.w / 2 - 8 &&
            x <= bounds.cx + bounds.w / 2 + 8 &&
            y >= bounds.cy - bounds.h / 2 - 8 &&
            y <= bounds.cy + bounds.h / 2 + 8
          )
            return { kind: "table", index: i };
        }
      }
      // Then fixtures
      for (let i = fixtures.length - 1; i >= 0; i--) {
        const { cx, cy, w, h } = getFixtureBounds(fixtures[i]);
        if (
          x >= cx - w / 2 - 6 &&
          x <= cx + w / 2 + 6 &&
          y >= cy - h / 2 - 6 &&
          y <= cy + h / 2 + 6
        )
          return { kind: "fixture", index: i };
      }
      return null;
    },
    [tables, fixtures, getTableBounds, getFixtureBounds]
  );

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getCanvasCoords(e);
    const hit = hitTest(x, y);
    setSelected(hit);
    if (hit) {
      if (hit.kind === "table") {
        const bounds = getTableBounds(tables[hit.index]);
        setDragging({ kind: "table", index: hit.index, offsetX: x - bounds.cx, offsetY: y - bounds.cy });
      } else {
        const { cx, cy } = getFixtureBounds(fixtures[hit.index]);
        setDragging({ kind: "fixture", index: hit.index, offsetX: x - cx, offsetY: y - cy });
      }
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging) {
      const { x, y } = getCanvasCoords(e);
      const canvas = canvasRef.current;
      if (canvas) canvas.style.cursor = hitTest(x, y) !== null ? "grab" : "default";
      return;
    }
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    const newX = Math.max(2, Math.min(98, ((x - dragging.offsetX) / dimensions.width) * 100));
    const newY = Math.max(2, Math.min(98, ((y - dragging.offsetY) / dimensions.height) * 100));

    if (dragging.kind === "table") {
      const next = [...tables];
      next[dragging.index] = { ...next[dragging.index], x: newX, y: newY };
      onTablesChange(next);
    } else {
      const next = [...fixtures];
      next[dragging.index] = { ...next[dragging.index], x: newX, y: newY };
      onFixturesChange(next);
    }
  };

  const handlePointerUp = () => {
    setDragging(null);
  };

  const handleDeleteSelected = () => {
    if (!selected) return;
    if (selected.kind === "fixture") {
      onFixturesChange(fixtures.filter((_, i) => i !== selected.index));
    }
    setSelected(null);
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selected?.kind === "fixture") {
        e.preventDefault();
        handleDeleteSelected();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, fixtures]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div ref={containerRef} className="w-full space-y-3">
      {/* Fixture toolbar */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(FIXTURE_PRESETS) as FixtureType[]).map((type) => {
          const preset = FIXTURE_PRESETS[type];
          return (
            <button
              key={type}
              onClick={() => {
                const newFixture: Fixture = {
                  id: `fix-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  type,
                  label: preset.label,
                  x: 50,
                  y: 50,
                  width: preset.width,
                  height: preset.height,
                };
                onFixturesChange([...fixtures, newFixture]);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-card-border
                rounded-lg bg-card-bg hover:border-primary-light hover:bg-primary/5 transition-colors"
            >
              <span>{preset.icon}</span>
              <span>{preset.label}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-sm">
        <canvas
          ref={canvasRef}
          style={{ width: dimensions.width, height: dimensions.height, touchAction: "none" }}
          className="block"
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">
          Drag items to position them. {selected?.kind === "fixture" && "Press Delete to remove fixture."}
        </p>
        {selected?.kind === "fixture" && (
          <button
            onClick={handleDeleteSelected}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-red-600 border border-red-200
              rounded-lg hover:bg-red-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
