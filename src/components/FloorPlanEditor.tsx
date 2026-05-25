"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Table } from "@/lib/types";

interface FloorPlanEditorProps {
  tables: Table[];
  onChange: (tables: Table[]) => void;
  backgroundImage?: string;
}

export default function FloorPlanEditor({ tables, onChange, backgroundImage }: FloorPlanEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);
  const [dragging, setDragging] = useState<{ tableIndex: number; offsetX: number; offsetY: number } | null>(null);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

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
        const r = Math.min(dimensions.width, dimensions.height) * 0.055;
        return { cx, cy, r, w: 0, h: 0, isRound: true };
      }
      const w = (table.width || 14) * (dimensions.width / 100);
      const h = (table.height || 6) * (dimensions.height / 100);
      return { cx, cy, r: 0, w, h, isRound: false };
    },
    [dimensions]
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

    tables.forEach((table, i) => {
      const bounds = getTableBounds(table);
      const isSelected = selectedTable === i;

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
  }, [dimensions, tables, bgImg, selectedTable, getTableBounds]);

  useEffect(() => { draw(); }, [draw]);

  const hitTest = useCallback(
    (x: number, y: number): number | null => {
      for (let i = tables.length - 1; i >= 0; i--) {
        const bounds = getTableBounds(tables[i]);
        if (bounds.isRound) {
          if (Math.hypot(x - bounds.cx, y - bounds.cy) < bounds.r + 8) return i;
        } else {
          if (
            x >= bounds.cx - bounds.w / 2 - 8 &&
            x <= bounds.cx + bounds.w / 2 + 8 &&
            y >= bounds.cy - bounds.h / 2 - 8 &&
            y <= bounds.cy + bounds.h / 2 + 8
          )
            return i;
        }
      }
      return null;
    },
    [tables, getTableBounds]
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
    const idx = hitTest(x, y);
    setSelectedTable(idx);
    if (idx !== null) {
      const bounds = getTableBounds(tables[idx]);
      setDragging({ tableIndex: idx, offsetX: x - bounds.cx, offsetY: y - bounds.cy });
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
    const newX = Math.max(0, Math.min(100, ((x - dragging.offsetX) / dimensions.width) * 100));
    const newY = Math.max(0, Math.min(100, ((y - dragging.offsetY) / dimensions.height) * 100));
    const next = [...tables];
    next[dragging.tableIndex] = { ...next[dragging.tableIndex], x: newX, y: newY };
    onChange(next);
  };

  const handlePointerUp = () => {
    setDragging(null);
  };

  return (
    <div ref={containerRef} className="w-full">
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
      <p className="text-xs text-muted mt-2 text-center">
        Drag tables to position them on the floor plan
      </p>
    </div>
  );
}
