# Wedding Seating Chart

The guest guide for Ahad and Rehnuba's wedding. A QR code at the venue opens this site: find a seat, see the room, and follow the day.

## What guests get

- **Find your seat**: search any part of a name (first, middle, last, nickname, any order). Small typos and Muhammad/Md spellings still match.
- **The room**: a map that fits the phone screen, with the guest's table highlighted, where it sits in the room, and who else is at it. Every table is also one tap away in the table grid.
- **Schedule, details, wedding party**: the day's timeline, dress code, dinner, gifts, the venue address and a Maps link.

`/event/<anything>` serves the same page so older links keep working.

## Photo booth

- **`/photos`**: guests pick their name, share any number of photos from their camera roll, and play the side quests. Each guest gets 8 of the 15 quests in `src/lib/quests.ts`; the first to finish 5 wins. Photos are resized to a 2048px JPEG plus a thumbnail in the browser before upload, which also strips location data.
- **`/photos/tv`**: full-screen slideshow for the screen in the hall. New uploads play next, everything else cycles. Press "Full screen" once; the page keeps the screen awake.
- **`/photos/admin`**: leaderboard (ranked by when each guest's fifth quest photo landed), review each player's photos, disqualify or reinstate, and hide any photo from the TV. Sign in with `PHOTO_ADMIN_KEY`.

Storage is the R2 bucket `ahadwedding` (`PHOTOS`, the images) and the D1 database `wedding-photo-booth` (`DB`, who uploaded what, quest progress, disqualifications), set in `cloudflare.config.ts`. The bucket stays private: the Worker serves the images, so hidden photos stay hidden. The tables create themselves on first request.

The API routes read Cloudflare bindings, so work on the photo booth with `npm run dev:vinext` (port 3001, local D1 and R2). Put `PHOTO_ADMIN_KEY=anything` in `.dev.vars` for local admin sign-in.

### One-time setup before the first deploy

1. Enable R2 and create the `ahadwedding` bucket (done).
2. Give the API token in `.env.local` **D1 Edit** and **Workers R2 Storage Edit** on top of the Workers permissions.
3. Create the storage and the admin key:

```bash
npx cf d1 create --name wedding-photo-booth
# the password for /photos/admin
npx cf workers secrets update PHOTO_ADMIN_KEY --worker wedding-seating-chart --type secret_text --text '<password>'
npm run deploy:vinext
```

## Data

- `src/data/ahad-rehnuba.json` holds the tables, room fixtures and guests (`id`, `name`, `tableId` only). It ships to the browser, so keep RSVP notes (dietary, songs, advice) out of it.
- `src/data/wedding-day.ts` holds the schedule, notes and wedding party.

## Development

```bash
npm install
npm run dev      # Next.js dev server (seating guide only)
npm run dev:vinext  # Worker dev server with local D1/R2 (photo booth)
npm test         # search and table label tests
```

## Deployment

The site runs as a Cloudflare Worker (`wedding-seating-chart`) on `ahadandrehnuba.com` and `www.ahadandrehnuba.com`. The root path is the guest guide.

Put `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in `.env.local` (see `.env.example`), then:

```bash
npm run deploy:vinext
```

`npm run dev` still starts the Next.js dev server. `npm run dev:vinext` starts the Worker locally on port 3001.
