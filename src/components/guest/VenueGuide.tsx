"use client";

import { EventData } from "@/lib/types";
import { weddingDay } from "@/data/wedding-day";
import SeatFinder from "./SeatFinder";

interface VenueGuideProps {
  data: EventData;
  editUnlocked?: boolean;
  onEdit?: () => void;
}

const links = [
  { href: "#find", label: "Your seat" },
  { href: "#today", label: "Today" },
  { href: "#dinner", label: "Dinner" },
  { href: "#party", label: "Party" },
  { href: "#know", label: "Good to know" },
];

export default function VenueGuide({ data, editUnlocked, onEdit }: VenueGuideProps) {
  return (
    <div className="min-h-screen text-[#1c2b24]">
      <nav className="sticky top-0 z-20 border-b border-[#e4dccb]/80 bg-[#f6f1e8]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <a href="#top" className="font-script text-2xl text-[#1c2b24]">
            Ahad & Rehnuba
          </a>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm sm:ml-auto">
            {links.map((link) => (
              <a key={link.href} href={link.href} className="text-[#3f4a42] hover:text-[#1c2b24]">
                {link.label}
              </a>
            ))}
            {editUnlocked && onEdit && (
              <button type="button" onClick={onEdit} className="shrink-0 text-xs uppercase tracking-wider text-[#6a624f]">
                Edit
              </button>
            )}
          </div>
        </div>
      </nav>

      <header id="top" className="max-w-3xl mx-auto px-5 pt-10 pb-6 text-center animate-fade-in-up">
        <p className="text-[11px] tracking-[0.32em] uppercase text-[#6a624f]">{weddingDay.shortDate}</p>
        <h1 className="font-script text-6xl sm:text-7xl mt-3 leading-none">{weddingDay.couple}</h1>
        <p className="font-serif text-2xl mt-3 text-[#3d5c3d]">{weddingDay.occasion}</p>
        <div className="mx-auto mt-5 h-px w-16 bg-[#b08948]" />
        <p className="mt-4 text-sm text-[#3f4a42]">
          {weddingDay.place}
          <br />
          Caledon, Ontario
        </p>
      </header>

      <main className="px-4 pb-20 space-y-16">
        <SeatFinder data={data} />

        <section id="today" className="scroll-mt-20 max-w-3xl mx-auto">
          <p className="text-[11px] tracking-[0.28em] uppercase text-[#6a624f]">Today</p>
          <h2 className="font-serif text-4xl mt-1">How the day goes</h2>
          <p className="mt-2 text-sm text-[#5c564c]">{weddingDay.dateLabel}</p>
          <ol className="mt-6 border-l border-[#d9c7a1] ml-3 space-y-6">
            {weddingDay.timeline.map((item) => (
              <li key={item.title} className="pl-5 relative">
                <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#b08948]" />
                <p className="text-[13px] tracking-[0.16em] uppercase text-[#6a624f] tabular-nums">{item.time}</p>
                <h3 className="font-serif text-2xl">{item.title}</h3>
                <p className="text-sm leading-relaxed text-[#3f4a42]">{item.detail}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="dinner" className="scroll-mt-20 max-w-3xl mx-auto">
          <p className="text-[11px] tracking-[0.28em] uppercase text-[#6a624f]">At the table</p>
          <h2 className="font-serif text-4xl mt-1">{weddingDay.dinner.title}</h2>
          <ul className="mt-4 space-y-3">
            {weddingDay.dinner.points.map((point) => (
              <li key={point} className="rounded-2xl border border-[#e4dccb] bg-white px-4 py-3 text-sm leading-relaxed text-[#3f4a42]">
                {point}
              </li>
            ))}
          </ul>
        </section>

        <section id="party" className="scroll-mt-20 max-w-5xl mx-auto">
          <p className="text-[11px] tracking-[0.28em] uppercase text-[#6a624f]">With them today</p>
          <h2 className="font-serif text-4xl mt-1">Wedding party</h2>
          <div className="mt-6 grid gap-8 md:grid-cols-3">
            <PartyColumn title="Parents" people={weddingDay.parents} />
            <PartyColumn title="With the bride" people={weddingDay.bridalParty} />
            <PartyColumn title="With the groom" people={weddingDay.groomParty} />
          </div>
        </section>

        <section id="know" className="scroll-mt-20 max-w-3xl mx-auto">
          <p className="text-[11px] tracking-[0.28em] uppercase text-[#6a624f]">While you are here</p>
          <h2 className="font-serif text-4xl mt-1">Good to know</h2>
          <div className="mt-5 grid gap-3">
            {weddingDay.notes.map((note) => (
              <article key={note.title} className="rounded-2xl border border-[#e4dccb] bg-white px-4 py-4">
                <h3 className="font-serif text-2xl">{note.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[#3f4a42]">{note.detail}</p>
              </article>
            ))}
          </div>
          <p className="mt-6 text-sm text-[#3f4a42]">
            {weddingDay.place}
            <br />
            {weddingDay.address}
          </p>
          <a
            href={weddingDay.mapsUrl}
            className="inline-block mt-3 text-sm text-[#3d5c3d] underline underline-offset-4"
          >
            Open in Maps
          </a>
        </section>
      </main>
    </div>
  );
}

function PartyColumn({
  title,
  people,
}: {
  title: string;
  people: readonly { name: string; role: string }[];
}) {
  return (
    <div>
      <h3 className="font-serif text-2xl mb-3">{title}</h3>
      <ul className="space-y-3">
        {people.map((person) => (
          <li key={person.name}>
            <p className="font-medium">{person.name}</p>
            <p className="text-sm text-[#5c564c]">{person.role}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
