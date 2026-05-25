import { WeddingEvent } from "@/lib/types";
import { FloralLeft, FloralRight } from "./FloralDecoration";

interface HeaderProps {
  event: WeddingEvent;
}

export default function Header({ event }: HeaderProps) {
  return (
    <div className="relative text-center py-10 px-4 overflow-hidden">
      <FloralLeft className="absolute -top-2 -left-2 w-36 h-36 md:w-44 md:h-44 pointer-events-none" />
      <FloralRight className="absolute -top-2 -right-2 w-36 h-36 md:w-44 md:h-44 pointer-events-none" />

      <h1 className="font-script text-4xl md:text-5xl lg:text-6xl text-foreground mt-2 animate-fade-in">
        {event.title}
      </h1>
      <p className="text-muted text-sm md:text-base tracking-[0.25em] uppercase mt-3 animate-fade-in" style={{ animationDelay: "100ms" }}>
        {event.date}
      </p>

      <div className="mt-4 flex justify-center animate-fade-in" style={{ animationDelay: "200ms" }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-px bg-gradient-to-r from-transparent to-accent" />
          <div className="w-1.5 h-1.5 rounded-full bg-accent" />
          <div className="w-12 h-px bg-gradient-to-l from-transparent to-accent" />
        </div>
      </div>
    </div>
  );
}
