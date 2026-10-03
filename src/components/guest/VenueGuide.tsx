import { EventData } from "@/lib/types";
import { weddingDay } from "@/data/wedding-day";
import SeatFinder from "./SeatFinder";

const links = [
  { href: "#find", label: "Seat" },
  { href: "#today", label: "Schedule" },
  { href: "#know", label: "Details" },
  { href: "#party", label: "Wedding party" },
];

export default function VenueGuide({ data }: { data: EventData }) {
  return (
    <div className="min-h-screen text-ink">
      <nav className="sticky top-0 z-20 border-b border-line/80 bg-cream/90 backdrop-blur-md">
        <div className="max-w-xl mx-auto flex items-center gap-1 overflow-x-auto px-3 py-2 text-sm [scrollbar-width:none]">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="shrink-0 rounded-full px-3 py-1.5 text-body hover:bg-white hover:text-ink">
              {link.label}
            </a>
          ))}
        </div>
      </nav>

      <header className="max-w-xl mx-auto px-5 pt-8 pb-6 text-center animate-fade-in-up">
        <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-label">{weddingDay.dateLabel}</p>
        <h1 className="font-script text-6xl sm:text-7xl mt-2 leading-none">{weddingDay.couple}</h1>
        <p className="font-serif text-xl mt-2 text-sage">{weddingDay.occasion}</p>
        <p className="mt-2 text-sm text-soft">{weddingDay.place}</p>
      </header>

      <main className="px-4 pb-20 space-y-14">
        <SeatFinder data={data} />

        <section id="today" className="max-w-xl mx-auto">
          <SectionTitle>Schedule</SectionTitle>
          <ol className="mt-5 space-y-5 border-l border-[#d9c7a1] ml-2">
            {weddingDay.timeline.map((item) => (
              <li key={item.title} className="relative pl-5">
                <span className="absolute -left-[5px] top-2 h-2.5 w-2.5 rounded-full bg-gold" />
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-label tabular-nums">{item.time}</p>
                <h3 className="font-serif text-2xl leading-snug">{item.title}</h3>
                <p className="text-sm leading-relaxed text-body">{item.detail}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="know" className="max-w-xl mx-auto">
          <SectionTitle>Details</SectionTitle>
          <dl className="mt-5 divide-y divide-line rounded-2xl border border-line bg-paper">
            {weddingDay.notes.map((note) => (
              <div key={note.title} className="px-4 py-3.5">
                <dt className="font-semibold">{note.title}</dt>
                <dd className="mt-0.5 text-sm leading-relaxed text-body">{note.detail}</dd>
              </div>
            ))}
            <div className="px-4 py-3.5">
              <dt className="font-semibold">Venue</dt>
              <dd className="mt-0.5 text-sm leading-relaxed text-body">
                {weddingDay.place}
                <br />
                {weddingDay.address}
              </dd>
              <a
                href={weddingDay.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center rounded-full bg-sage px-4 py-2 text-sm font-medium text-cream"
              >
                Open in Maps
              </a>
            </div>
          </dl>
        </section>

        <section id="party" className="max-w-xl mx-auto">
          <SectionTitle>Wedding party</SectionTitle>
          <div className="mt-5 space-y-6">
            <PartyGroup title="Parents" people={weddingDay.parents} />
            <PartyGroup title="With the bride" people={weddingDay.bridalParty} />
            <PartyGroup title="With the groom" people={weddingDay.groomParty} />
          </div>
        </section>
      </main>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-serif text-3xl sm:text-4xl">{children}</h2>;
}

function PartyGroup({ title, people }: { title: string; people: readonly { name: string; role: string }[] }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-label">{title}</h3>
      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2.5">
        {people.map((person) => (
          <li key={person.name}>
            <p className="font-medium leading-tight">{person.name}</p>
            <p className="text-[13px] text-soft leading-snug">{person.role}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
