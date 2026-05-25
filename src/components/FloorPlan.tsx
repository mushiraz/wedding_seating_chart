"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Table, Guest } from "@/lib/types";

interface FloorPlanProps {
  tables: Table[];
  guests: Guest[];
  highlightedTableId?: string | null;
  onTableClick?: (tableId: string) => void;
  backgroundImage?: string;
}

function getChairPositions(
  shape: "round" | "rectangle",
  seats: number,
  cx: number,
  cy: number,
  tableW: number,
  tableH: number
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];

  if (shape === "round") {
    const radius = tableW * 0.7;
    for (let i = 0; i < seats; i++) {
      const angle = (2 * Math.PI * i) / seats - Math.PI / 2;
      positions.push({
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      });
    }
  } else {
    const perimeter = 2 * (tableW + tableH);
    const spacing = perimeter / seats;
    for (let i = 0; i < seats; i++) {
      const dist = i * spacing;
      const halfW = tableW / 2;
      const halfH = tableH / 2;
      const pad = 8;

      if (dist < tableW) {
        positions.push({ x: cx - halfW + dist, y: cy - halfH - pad });
      } else if (dist < tableW + tableH) {
        positions.push({ x: cx + halfW + pad, y: cy - halfH + (dist - tableW) });
      } else if (dist < 2 * tableW + tableH) {
        positions.push({ x: cx + halfW - (dist - tableW - tableH), y: cy + halfH + pad });
      } else {
        positions.push({ x: cx - halfW - pad, y: cy + halfH - (dist - 2 * tableW - tableH) });
      }
    }
  }
  return positions;
}

export default function FloorPlan({
  tables,
  guests,
  highlightedTableId,
  onTableClick,
  backgroundImage,
}: FloorPlanProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const animFrameRef = useRef<number>(0);
  const pulseRef = useRef(0);

  useEffect(() => {
    if (!backgroundImage) return;
    const img = new Image();
    img.onload = () => setBgImage(img);
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

  const guestsByTable = useCallback(() => {
    const map: Record<string, Guest[]> = {};
    for (const g of guests) {
      if (!map[g.tableId]) map[g.tableId] = [];
      map[g.tableId].push(g);
    }
    return map;
  }, [guests]);

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

    if (bgImage) {
      ctx.globalAlpha = 0.15;
      ctx.drawImage(bgImage, 0, 0, dimensions.width, dimensions.height);
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = "#e0dbd3";
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, dimensions.width - 20, dimensions.height - 20);

    const gMap = guestsByTable();
    pulseRef.current += 0.05;
    const pulse = Math.sin(pulseRef.current) * 0.3 + 0.7;

    for (const table of tables) {
      const cx = (table.x / 100) * dimensions.width;
      const cy = (table.y / 100) * dimensions.height;
      const isHighlighted = highlightedTableId === table.id;
      const isHovered = hoveredTable === table.id;

      if (table.shape === "round") {
        const r = Math.min(dimensions.width, dimensions.height) * 0.055;

        if (isHighlighted) {
          ctx.beginPath();
          ctx.arc(cx, cy, r + 12, 0, 2 * Math.PI);
          ctx.fillStyle = `rgba(90, 125, 90, ${pulse * 0.2})`;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.fillStyle = isHighlighted ? "#5a7d5a" : isHovered ? "#7da67d" : "#d4cfc6";
        ctx.fill();
        ctx.strokeStyle = isHighlighted ? "#3d5c3d" : "#b8b0a4";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const chairs = getChairPositions("round", table.seats, cx, cy, r, r);
        for (const ch of chairs) {
          ctx.beginPath();
          ctx.arc(ch.x, ch.y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = isHighlighted ? "#7da67d" : "#c4bdb2";
          ctx.fill();
          ctx.strokeStyle = isHighlighted ? "#5a7d5a" : "#a8a096";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      } else {
        const w = (table.width || 14) * (dimensions.width / 100);
        const h = (table.height || 6) * (dimensions.height / 100);

        if (isHighlighted) {
          ctx.fillStyle = `rgba(90, 125, 90, ${pulse * 0.2})`;
          ctx.fillRect(cx - w / 2 - 10, cy - h / 2 - 10, w + 20, h + 20);
        }

        ctx.fillStyle = isHighlighted ? "#5a7d5a" : isHovered ? "#7da67d" : "#d4cfc6";
        ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
        ctx.strokeStyle = isHighlighted ? "#3d5c3d" : "#b8b0a4";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);

        const chairs = getChairPositions("rectangle", table.seats, cx, cy, w, h);
        for (const ch of chairs) {
          ctx.beginPath();
          ctx.arc(ch.x, ch.y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = isHighlighted ? "#7da67d" : "#c4bdb2";
          ctx.fill();
          ctx.strokeStyle = isHighlighted ? "#5a7d5a" : "#a8a096";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      ctx.fillStyle = isHighlighted ? "#ffffff" : "#5a5550";
      ctx.font = `bold ${Math.max(10, dimensions.width * 0.014)}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(table.label, cx, cy);

      const tGuests = gMap[table.id] || [];
      if (isHighlighted && tGuests.length > 0) {
        const listY = cy + (table.shape === "round"
          ? Math.min(dimensions.width, dimensions.height) * 0.055 + 25
          : ((table.height || 6) * (dimensions.height / 100)) / 2 + 25);

        ctx.font = `${Math.max(9, dimensions.width * 0.011)}px Inter, sans-serif`;
        ctx.fillStyle = "#3d5c3d";
        for (let i = 0; i < Math.min(tGuests.length, 4); i++) {
          ctx.fillText(tGuests[i].name, cx, listY + i * 14);
        }
        if (tGuests.length > 4) {
          ctx.fillStyle = "#8c8578";
          ctx.fillText(`+${tGuests.length - 4} more`, cx, listY + 4 * 14);
        }
      }
    }
  }, [dimensions, tables, guests, highlightedTableId, hoveredTable, bgImage, guestsByTable]);

  useEffect(() => {
    let running = true;
    const animate = () => {
      if (!running) return;
      draw();
      if (highlightedTableId) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };
    animate();
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [draw, highlightedTableId]);

  useEffect(() => {
    if (!highlightedTableId) {
      draw();
    }
  }, [draw, highlightedTableId]);

  const handleCanvasInteraction = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      for (const table of tables) {
        const cx = (table.x / 100) * dimensions.width;
        const cy = (table.y / 100) * dimensions.height;
        let hit = false;

        if (table.shape === "round") {
          const r = Math.min(dimensions.width, dimensions.height) * 0.055;
          hit = Math.hypot(x - cx, y - cy) < r + 10;
        } else {
          const w = (table.width || 14) * (dimensions.width / 100);
          const h = (table.height || 6) * (dimensions.height / 100);
          hit =
            x >= cx - w / 2 - 10 &&
            x <= cx + w / 2 + 10 &&
            y >= cy - h / 2 - 10 &&
            y <= cy + h / 2 + 10;
        }

        if (hit) {
          if (e.type === "click") {
            onTableClick?.(table.id);
          } else {
            setHoveredTable(table.id);
            canvas.style.cursor = "pointer";
          }
          return;
        }
      }

      setHoveredTable(null);
      if (canvas) canvas.style.cursor = "default";
    },
    [tables, dimensions, onTableClick]
  );

  return (
    <div ref={containerRef} className="w-full">
      <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden shadow-sm">
        <canvas
          ref={canvasRef}
          style={{ width: dimensions.width, height: dimensions.height }}
          className="block"
          onClick={handleCanvasInteraction}
          onMouseMove={handleCanvasInteraction}
          onMouseLeave={() => {
            setHoveredTable(null);
            if (canvasRef.current) canvasRef.current.style.cursor = "default";
          }}
        />
      </div>
    </div>
  );
}
