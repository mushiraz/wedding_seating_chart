# Wedding Seating Chart

The guest guide for Ahad and Rehnuba's wedding. A QR code at the venue opens this site: find a seat, see the room, and follow the day.

## What guests get

- **Find your seat**: search any part of a name (first, middle, last, nickname, any order). Small typos and Muhammad/Md spellings still match.
- **The room**: a map that fits the phone screen, with the guest's table highlighted, where it sits in the room, and who else is at it. Every table is also one tap away in the table grid.
- **Schedule, details, wedding party**: the day's timeline, dress code, dinner, gifts, the venue address and a Maps link.

`/event/<anything>` serves the same page so older links keep working.

## Data

- `src/data/ahad-rehnuba.json` holds the tables, room fixtures and guests (`id`, `name`, `tableId` only). It ships to the browser, so keep RSVP notes (dietary, songs, advice) out of it.
- `src/data/wedding-day.ts` holds the schedule, notes and wedding party.

## Development

```bash
npm install
npm run dev      # Next.js dev server
npm test         # search and table label tests
```

## Deployment

The site runs as a Cloudflare Worker (`wedding-seating-chart`) on `ahadandrehnuba.com` and `www.ahadandrehnuba.com`. The root path is the guest guide.

Put `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in `.env.local` (see `.env.example`), then:

```bash
npm run deploy:vinext
```

`npm run dev` still starts the Next.js dev server. `npm run dev:vinext` starts the Worker locally on port 3001.
