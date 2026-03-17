# ninety nine. — Salon Website & Booking System

Nails & beauty salon website with built-in booking system for 99 Banks Road, West Kirby.

---

## How to get this live (step by step)

### Step 1: Set up Supabase (your database)

You've already created the project — now run the schema:

1. Go to your Supabase dashboard → **SQL Editor** (left sidebar)
2. Click **New query**
3. Open the file `supabase-schema.sql` from this folder in a text editor
4. Copy ALL the contents and paste into the SQL editor
5. Click **Run**
6. You should see "Success" — check **Table Editor** to verify tables exist

Now grab your API keys:

1. Go to **Settings → API** in Supabase
2. Copy the **Project URL** (looks like `https://abc123.supabase.co`)
3. Copy the **anon public** key (long string starting with `eyJ...`)
4. Keep these handy — you'll need them in Step 3

### Step 2: Push this code to GitHub

#### Option A: Using GitHub.com (no terminal needed)

1. Go to github.com and log in
2. Click the **+** in the top right → **New repository**
3. Name it `ninetynine` (or whatever you like)
4. Keep it **Public** or **Private** — either works
5. Click **Create repository**
6. On the next page, click **"uploading an existing file"**
7. Drag ALL the files from this folder into the upload area
   - Make sure you include the `src` folder and `public` folder
   - **Don't upload** `node_modules` if it exists
8. Click **Commit changes**

#### Option B: Using the terminal (if you're comfortable)

```bash
cd ninetynine-site
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ninetynine.git
git push -u origin main
```

### Step 3: Deploy on Vercel

1. Go to **vercel.com** and sign in with your GitHub account
2. Click **"Add New..."** → **Project**
3. Find your `ninetynine` repo and click **Import**
4. Under **Environment Variables**, add these two:

   | Name | Value |
   |------|-------|
   | `VITE_SUPABASE_URL` | Your Supabase Project URL |
   | `VITE_SUPABASE_ANON_KEY` | Your Supabase anon public key |

5. Click **Deploy**
6. Wait about 60 seconds — your site will be live at `ninetynine.vercel.app` (or similar)

### Step 4: Add a custom domain (optional)

1. Buy a domain (e.g. `ninetyninewk.co.uk`) from Namecheap, GoDaddy, etc.
2. In Vercel → your project → **Settings → Domains**
3. Add your domain
4. Vercel will show you DNS records to add at your domain registrar
5. Add the records, wait 10-30 minutes, and your site is live on your own domain

### Step 5: Set up practitioner accounts

1. In Supabase → **Authentication → Users**
2. Click **Add user → Send invite** (or Create user)
3. Add each practitioner's email
4. After they've signed up, go to **Table Editor → practitioners**
5. Copy each user's UUID from the Authentication page
6. Paste it into the matching practitioner's `user_id` column

---

## Running locally (for development)

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your Supabase keys
npm run dev
```

Opens at http://localhost:5173

---

## Project structure

```
ninetynine-site/
├── index.html              ← HTML entry point
├── package.json            ← Dependencies
├── vite.config.js          ← Build config
├── vercel.json             ← Vercel deployment config
├── .env.example            ← Template for environment variables
├── .gitignore              ← Files to exclude from git
├── supabase-schema.sql     ← Database schema (run in Supabase SQL Editor)
├── public/
│   └── favicon.svg         ← Browser tab icon
└── src/
    ├── main.jsx            ← React entry point
    └── App.jsx             ← The entire website + booking system + dashboard
```

## Costs

| Component | Cost |
|-----------|------|
| Supabase | Free (up to 50k monthly users) |
| Vercel | Free (personal projects) |
| Domain | ~£10/year |
| **Total** | **~£10/year** |
