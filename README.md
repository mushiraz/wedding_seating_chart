# Wedding Seating Chart

A beautiful, QR-code-accessible wedding seating chart app. Guests scan a QR code to instantly find their assigned table and seat.

## Features

- **Guest Search** — Real-time name filtering to find seat assignments
- **Card Grid View** — Elegant 3-column grid showing each guest's name and table
- **Interactive Floor Plan** — Canvas-based map view with table layouts and chair positions
- **Setup Wizard** — Multi-step organizer flow to configure event details, tables, and guest assignments
- **Drag-and-Drop Editor** — Position tables on an optional floor plan background image
- **CSV Import** — Bulk upload guests from a CSV file (`name, table`)
- **QR Code Sharing** — Auto-generated QR code for guests to scan
- **Mobile Responsive** — Optimized for phones (the primary way guests will access it)

## Tech Stack

- [Next.js 16](https://nextjs.org/) (App Router)
- [Tailwind CSS](https://tailwindcss.com/)
- [qrcode.react](https://github.com/zpao/qrcode.react) for QR generation
- [PapaParse](https://www.papaparse.com/) for CSV parsing
- HTML Canvas for the interactive floor plan
- localStorage for data persistence (no database needed)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landing page.

### Quick Demo

Visit `/event/john-sarah-wedding` to see a pre-loaded demo with sample data.

### Creating a Seating Chart

1. Click **"Create Your Seating Chart"** on the landing page
2. Enter event details (title, date, optional photo and floor plan background)
3. Add tables (round or rectangle, set number of seats)
4. Drag tables into position on the floor plan
5. Add guests manually or upload a CSV file
6. Preview and publish — a shareable URL and QR code are generated

### CSV Format

```
name,table
John Smith,1
Jane Doe,2
```

## Deployment

Deploy to Vercel with one click:

```bash
npx vercel
```

Or push to GitHub and connect the repo to [Vercel](https://vercel.com) for automatic deployments.
