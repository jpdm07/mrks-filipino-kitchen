# Mr. K's Filipino Kitchen

Production website: Next.js 14 (App Router), TypeScript, Tailwind CSS, Prisma + **PostgreSQL** (e.g. Neon for Vercel), Twilio SMS, Google Sheets webhook, Yahoo SMTP (Nodemailer), admin panel, sample packs, and newsletter tools.

## Quick Start

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your credentials (or use .env — both work with Prisma)
# Set DATABASE_URL in .env.local to a Postgres URL (Neon free tier works).
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Windows note (Prisma engine)

If you see **“query_engine-windows.dll.node is not a valid Win32 application”**, you are likely on **Windows on ARM** or a mismatched Node architecture.

1. **Browse mode still works:** the app serves the **menu, home page, and cart** from built-in fallback data so Chrome won’t show a white “runtime error” screen.
2. **To enable the real database** (orders saved, votes stored, admin):
   - Prefer **64-bit (x64) Node.js**, or develop in **WSL2**, or deploy to **Vercel/Linux**.
   - Optional: before `npx prisma generate`, set **`PRISMA_CLIENT_FORCE_WASM=true`** (then generate again) to try Prisma’s WASM query engine.

## Admin Panel

- URL: [http://localhost:3000/admin](http://localhost:3000/admin)
- Username / password: set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env.local`

## Scripts

| Script        | Description        |
| ------------- | ------------------ |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production |
| `npm run db:push` | `prisma db push` |
| `npm run db:seed` | `prisma db seed` |
| `npm run db:studio` | Prisma Studio |

## Google Sheets Setup

1. Create a Google Sheet.
2. **Extensions → Apps Script** — paste the script from **`SHEETS_SCRIPT.md`** in this repo.
3. **Deploy → New deployment → Web app** — execute as you, access **Anyone**.
4. Copy the Web App URL into `GOOGLE_SHEETS_WEBHOOK_URL` in `.env.local`.
5. After you change the script in the repo, open Apps Script again and **Deploy → Manage deployments → Edit → New version → Deploy** so **Menu prices** sync works.

## Twilio Setup

1. Sign up at [twilio.com](https://www.twilio.com).
2. Add **Account SID**, **Auth Token**, and a **Twilio phone number** to `.env.local`.
3. Set **OWNER_PHONE** to the number that should receive new-order texts (E.164, e.g. `+19797033827`).

## Deployment (Vercel)

1. Create a **Postgres** database ([Neon](https://neon.tech) is free and works well with Vercel).
2. In Vercel → your project → **Settings → Environment Variables**, add at least:
   - `DATABASE_URL` — pooled connection string (often ends in `?sslmode=require`)
   - `NEXT_PUBLIC_SITE_URL` — `https://mrkskitchen.com`
   - Copy the rest from `.env.local` (Twilio, Google, admin, email, etc.).
3. Connect the GitHub repo and deploy, or run `npm run deploy:vercel`.
4. After the first successful deploy, seed the menu (from your machine, pointed at the same `DATABASE_URL`): `npx prisma db seed`
5. Add domain **mrkskitchen.com** under **Settings → Domains**.

The repo includes `vercel.json`; builds run `prisma migrate deploy` automatically on Vercel.

## Menu prices & photos (Google Sheets)

Retail prices and dish photos are defined in **`lib/menu-catalog.ts`**. That file is the single source for:

- The public menu (after `npx prisma db seed` or syncing rows in the database)
- The offline fallback menu if Prisma is unavailable

**Google Sheets:** The Apps Script webhook appends **one row per order** (names, sizes, **unit prices at checkout** in the Items column). It also maintains a **Menu prices** tab: whenever you create/update/delete a row in **Admin → Menu Manager**, the app pushes the full price list (or call **`POST /api/admin/sheets/sync-menu`** while logged into admin). The same script maintains a private **Monthly sales** tab with a **line chart** of orders and revenue by month (updated on every new order). Use the script in **`SHEETS_SCRIPT.md`** and **redeploy** the web app after pulling updates that change the script. After changing **`menu-catalog.ts`**, run **`npx prisma db seed`** then trigger a menu sync so the Sheet matches the DB.

## Project layout

Key paths: `app/` (routes + API), `components/` (UI, cart, admin), `lib/` (includes **`menu-catalog.ts`**), `prisma/` (schema + seed).
