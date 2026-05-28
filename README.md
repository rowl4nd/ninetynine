# ninety nine. — Salon Website & Booking System

Website and online booking system for **ninety nine.**, a nails & beauty salon at 99 Banks Road, West Kirby, Wirral.

**Live site**: [ninetynine-wk.co.uk](https://ninetynine-wk.co.uk)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite (JavaScript) |
| Database | Supabase (Postgres, EU West) |
| Hosting | Vercel (auto-deploys from GitHub) |
| Emails | Resend API via Supabase Edge Functions |
| Cost | ~£10/year (domain only) |

---

## Project Structure

```
public/
  favicon.svg
  logo-dark.png          ← used in nav + hero
  logo-light.png         ← used in footer
  team/
    Kristen.jpg
    Lisa.jpg
    Inke.jpg
    Holly.jpg
src/
  App.jsx                ← routing shell (/, /cancel, /my-bookings, dashboard)
  App.css                ← all styles, mobile-first
  Site.jsx               ← public website + booking flow + client portal
  Dashboard.jsx          ← staff portal
  shared.jsx             ← shared hooks, data, components
  supabase.js            ← Supabase client (raw fetch, no SDK)
  main.jsx               ← React entry point
```

---

## Environment Variables

Set these in Vercel (Settings → Environment Variables):

```
VITE_SUPABASE_URL      = https://rousxlmxmjrkyvczbtan.supabase.co
VITE_SUPABASE_ANON_KEY = (legacy anon key — Supabase Settings → API → Legacy tab)
```

> **Important**: use the key from the **Legacy** tab in Supabase, not the newer publishable key format. The app uses raw fetch calls rather than the Supabase SDK and requires the legacy format.

---

## Running Locally

```bash
npm install
cp .env.example .env.local
# Add your Supabase keys to .env.local
npm run dev
# Opens at http://localhost:5173
```

---

## Database

Hosted on Supabase. Project ID: `rousxlmxmjrkyvczbtan`.

### Core tables
- `practitioners` — the five team members
- `custom_services` — each practitioner's own services and pricing
- `custom_service_addons` — optional add-ons linked to a service
- `availability` — weekly working hours per practitioner (0=Mon … 6=Sun)
- `blocked_dates` — specific dates or time ranges blocked off
- `bookings` — all client bookings

### Key booking columns
- `service_title` — service name stored as text at booking time (never joined)
- `booked_by` — set to `'staff'` for manual bookings; email notifications are skipped
- `cancellation_token` — uuid used in cancel links, requires no login
- `status` — `confirmed` / `cancelled` / `completed` / `no_show`

### Practitioners table extras
- `slot_interval` — how often slots appear (15/30/60 min)
- `booking_window_weeks` — how far ahead clients can book (2–26 weeks)
- `calendar_token` — used for iCal feed URL

> The full list of migrations that have been applied to the database is documented in `PROJECT-SUMMARY.md`.

---

## Supabase Edge Functions

### `booking-notification`
Triggered by a database webhook on every `bookings` INSERT. Sends:
- Confirmation email to the client (includes cancel link + "View my bookings" link)
- New booking notification to the practitioner

Skips all emails if `booked_by = 'staff'`.

### `booking-reminder`
Runs daily at 8am UTC via pg_cron. Finds all confirmed bookings for the next day and sends a reminder email to each client.

### `practitioner-calendar`
Returns an RFC 5545-compliant `.ics` feed for a practitioner's bookings. Used for subscribing in Google Calendar or Apple Calendar. Accessed via `?token=<calendar_token>`.

---

## URL Routes

| Path | Description |
|------|-------------|
| `/` | Public website |
| `/cancel?token=xxx` | Client cancels a booking (no login needed) |
| `/my-bookings?email=xxx&t=yyy` | Client views all their upcoming bookings |
| Staff dashboard | Accessed via "Staff Login" link in the nav — React state change, not a separate URL |

---

## Staff Dashboard

Each practitioner logs in with their Supabase auth account. Features:

- **Bookings** — month calendar, click a day to see bookings in time order, click a booking to view details, reschedule or cancel
- **My Services** — add/edit/remove their own services with custom pricing, grouping, and optional add-ons
- **My Schedule** — set working days and hours, booking window, block specific dates, slot interval, iCal feed link

---

## How Emails Work

The client portal link in every email uses a token derived from the client's email address:

```js
btoa(email.toLowerCase().trim()).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)
```

The same algorithm runs in both the Edge Functions (to generate the link) and the `ClientPortal` component in `Site.jsx` (to verify it). No server round-trip needed.

---

## Deploying Changes

1. Edit files on GitHub (web editor or `git push`)
2. Vercel auto-deploys on every commit to `main`
3. Build takes ~60 seconds

For Edge Function changes, update the function code directly in the Supabase dashboard (Edge Functions → select function → Code tab).

---

## Still To Do

- [ ] Get Melissa's photo — add as `public/team/Melissa.jpg`
- [ ] Verify actual service prices with each practitioner
- [ ] Confirm all practitioner Supabase auth accounts are set up with `user_id` linked in the practitioners table
