import { Guest, Table } from "@/lib/types";

interface GuestCardProps {
  guest: Guest;
  table?: Table;
  highlighted?: boolean;
  animationDelay?: number;
}

export default function GuestCard({ guest, table, highlighted, animationDelay = 0 }: GuestCardProps) {
  return (
    <div
      className={`
        animate-fade-in-up bg-card-bg border rounded-lg px-4 py-3.5 transition-all duration-300
        ${highlighted
          ? "border-primary shadow-lg ring-2 ring-primary/20 scale-[1.02] bg-primary/[0.03]"
          : "border-card-border shadow-sm hover:shadow-md hover:border-primary-light/50 hover:-translate-y-0.5"
        }
      `}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <p className="text-foreground font-medium text-sm md:text-base leading-tight">
        {guest.name}
      </p>
      <p className="text-muted text-[11px] tracking-[0.15em] uppercase mt-1.5 font-medium">
        {table?.label || `Table ${guest.tableId}`}
      </p>
    </div>
  );
}
