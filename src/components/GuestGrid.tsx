import { Guest, Table } from "@/lib/types";
import GuestCard from "./GuestCard";

interface GuestGridProps {
  guests: Guest[];
  tables: Record<string, Table>;
  searchQuery: string;
}

export default function GuestGrid({ guests, tables, searchQuery }: GuestGridProps) {
  if (guests.length === 0) {
    return (
      <div className="text-center py-16 animate-fade-in">
        <svg className="w-12 h-12 mx-auto text-muted/30 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p className="text-muted text-lg">No guests found</p>
        {searchQuery && (
          <p className="text-muted/60 text-sm mt-1">
            Try a different search term
          </p>
        )}
      </div>
    );
  }

  const isFiltered = searchQuery.trim().length > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {guests.map((guest, i) => (
        <GuestCard
          key={guest.id}
          guest={guest}
          table={tables[guest.tableId]}
          highlighted={isFiltered}
          animationDelay={i * 30}
        />
      ))}
    </div>
  );
}
