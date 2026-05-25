interface ViewToggleProps {
  view: "list" | "map";
  onChange: (view: "list" | "map") => void;
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-card-border bg-card-bg p-0.5 shadow-sm">
      <button
        onClick={() => onChange("list")}
        className={`
          px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
          ${view === "list"
            ? "bg-primary text-white shadow-sm"
            : "text-muted hover:text-foreground"
          }
        `}
      >
        List
      </button>
      <button
        onClick={() => onChange("map")}
        className={`
          px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
          ${view === "map"
            ? "bg-primary text-white shadow-sm"
            : "text-muted hover:text-foreground"
          }
        `}
      >
        Map
      </button>
    </div>
  );
}
