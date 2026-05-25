"use client";

import { QRCodeSVG } from "qrcode.react";

interface QRCodeDisplayProps {
  url: string;
  size?: number;
  showStatus?: boolean;
}

export default function QRCodeDisplay({ url, size = 160, showStatus = true }: QRCodeDisplayProps) {
  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div className="p-3 bg-white rounded-xl shadow-sm border border-card-border">
        <QRCodeSVG
          value={url}
          size={size}
          bgColor="#ffffff"
          fgColor="#2d2d2d"
          level="M"
        />
      </div>
      {showStatus && (
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-muted">Scan to find your seat</span>
        </div>
      )}
    </div>
  );
}
