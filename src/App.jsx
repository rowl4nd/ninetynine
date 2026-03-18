import React, { useState, useEffect, useRef, useCallback } from "react";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// These pull from environment variables (set in Vercel or .env.local)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";

// Simple Supabase client (no SDK needed)
const supabase = {
  headers: (token) => ({
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
  }),
  async query(table, { select = "*", filters = "", token } = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${select}${filters}`, { headers: this.headers(token) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async insert(table, data, token) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST", headers: { ...this.headers(token), Prefer: "return=representation" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async update(table, data, filters, token) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filters}`, {
      method: "PATCH", headers: { ...this.headers(token), Prefer: "return=representation" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async rpc(fn, params, token) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: "POST", headers: this.headers(token), body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async signIn(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST", headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("Invalid email or password");
    return res.json();
  },
};

// ─── DEMO MODE (when Supabase isn't configured yet) ──────────────────────────
const IS_DEMO = SUPABASE_URL === "YOUR_SUPABASE_URL";

const DEMO_PRACTITIONERS = [
  { id: "1", name: "Lisa", role: "Facial, Lash Lift & Brow Artist", specialty: "Facials & Skin", color: "#C9A96E", photo: "/team/Lisa.jpg", instagram: "@elisehouseuk" },
  { id: "2", name: "Inke", role: "Manicurist & Lash Lift Technician", specialty: "Nails & Lashes", color: "#B8A08A", photo: "/team/Inke.jpg", instagram: "@byinke_x" },
  { id: "3", name: "Holly", role: "Gel Toes & Toenail Reconstruction", specialty: "Gel Toes", color: "#C4A882", photo: "/team/Holly.jpg", instagram: "@painted__byholly" },
  { id: "4", name: "Kristen", role: "Salon Owner & Senior Manicurist", specialty: "Gel & Nail Art", color: "#A89080", photo: "/team/Kristen.jpg", instagram: "@nailsbykristen_x" },
  { id: "5", name: "Melissa", role: "Nail Technician", specialty: "Nail Art", color: "#BCA68E", photo: null, instagram: null },
];

const DEMO_SERVICES = {
  nails: [
    { id: "s1", name: "Gel Manicure", category: "nails", duration: 45, price: 30 },
    { id: "s2", name: "Gel Toes", category: "nails", duration: 45, price: 30 },
    { id: "s3", name: "Gel Manicure & Toes", category: "nails", duration: 75, price: 50 },
    { id: "s4", name: "BIAB Overlay", category: "nails", duration: 60, price: 38 },
    { id: "s5", name: "Acrylic Full Set", category: "nails", duration: 75, price: 40 },
    { id: "s6", name: "Acrylic Infill", category: "nails", duration: 60, price: 30 },
    { id: "s7", name: "Nail Art (add-on)", category: "nails", duration: 15, price: 10 },
    { id: "s8", name: "Gel Removal", category: "nails", duration: 20, price: 10 },
    { id: "s9", name: "Luxury Manicure", category: "nails", duration: 60, price: 45 },
  ],
  beauty: [
    { id: "s10", name: "Lash Lift & Tint", category: "beauty", duration: 60, price: 40 },
    { id: "s11", name: "Brow Lamination", category: "beauty", duration: 45, price: 35 },
    { id: "s12", name: "Brow Wax & Tint", category: "beauty", duration: 20, price: 15 },
    { id: "s13", name: "Express Facial", category: "beauty", duration: 30, price: 30 },
    { id: "s14", name: "Luxury Facial", category: "beauty", duration: 60, price: 55 },
    { id: "s15", name: "Classic Lash Extensions", category: "beauty", duration: 90, price: 55 },
    { id: "s16", name: "Waxing (from)", category: "beauty", duration: 15, price: 8 },
    { id: "s17", name: "Lash or Brow Tint", category: "beauty", duration: 15, price: 10 },
  ],
};

const DEMO_TIMES = ["09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30"];

// Which practitioners offer which services (for demo mode)
const DEMO_SERVICE_PRACTITIONERS = {
  "Gel Manicure": ["Kristen", "Inke", "Melissa"],
  "Gel Toes": ["Holly"],
  "Gel Manicure & Toes": ["Holly", "Inke"],
  "BIAB Overlay": ["Kristen", "Inke", "Melissa"],
  "Acrylic Full Set": ["Kristen", "Melissa"],
  "Acrylic Infill": ["Kristen", "Melissa"],
  "Nail Art (add-on)": ["Kristen", "Melissa"],
  "Gel Removal": ["Kristen", "Inke", "Holly", "Melissa"],
  "Luxury Manicure": ["Inke"],
  "Lash Lift & Tint": ["Inke", "Lisa"],
  "Brow Lamination": ["Lisa"],
  "Brow Wax & Tint": ["Lisa"],
  "Express Facial": ["Lisa"],
  "Luxury Facial": ["Lisa"],
  "Classic Lash Extensions": ["Inke", "Lisa"],
  "Waxing (from)": ["Lisa"],
  "Lash or Brow Tint": ["Inke", "Lisa"],
};

// Each practitioner's available services (used to filter in booking flow)
const PRACTITIONER_SERVICE_LIST = {
  "Kristen": ["Gel Manicure", "BIAB Overlay", "Acrylic Full Set", "Acrylic Infill", "Nail Art (add-on)", "Gel Removal"],
  "Inke": ["Gel Manicure", "Gel Manicure & Toes", "BIAB Overlay", "Luxury Manicure", "Gel Removal", "Lash Lift & Tint", "Brow Lamination", "Brow Wax & Tint", "Classic Lash Extensions", "Lash or Brow Tint"],
  "Melissa": ["Gel Manicure", "BIAB Overlay", "Acrylic Full Set", "Acrylic Infill", "Nail Art (add-on)", "Gel Removal"],
  "Holly": ["Gel Toes", "Gel Manicure & Toes", "Gel Removal"],
  "Lisa": ["Lash Lift & Tint", "Brow Lamination", "Brow Wax & Tint", "Express Facial", "Luxury Facial", "Classic Lash Extensions", "Waxing (from)", "Lash or Brow Tint"],
};

// Treatment categories for the services page
const TREATMENT_CATEGORIES = [
  { id: "hands", title: "Hands", icon: "✦", description: "Gel manicures, acrylics, BIAB & nail art", practitioners: ["Kristen", "Inke", "Melissa"] },
  { id: "toes", title: "Toes", icon: "✦", description: "Gel toes & pedicures", practitioners: ["Holly"] },
  { id: "brows", title: "Brows", icon: "✦", description: "Lamination, wax & tint", practitioners: ["Lisa"] },
  { id: "lashes", title: "Lashes", icon: "✦", description: "Lash lifts, tints & extensions", practitioners: ["Inke", "Lisa"] },
  { id: "facials", title: "Facials", icon: "✦", description: "Express & luxury facials", practitioners: ["Lisa"] },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getMonthName(m) { return ["January","February","March","April","May","June","July","August","September","October","November","December"][m]; }
function getDayName(y, m, d) { return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date(y, m, d).getDay()]; }
function dateStr(y, m, d) { return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }

// ─── Styles ──────────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Outfit:wght@300;400;500;600&display=swap');
:root{--cream:#FAF6F1;--warm-white:#FFFCF8;--charcoal:#2C2825;--warm-gray:#9A918A;--gold:#C9A96E;--gold-light:#E8D5B0;--blush:#EDE4DA;--taupe:#B8A08A;--border:#E8E2DC;--white:#FFFFFF;--red:#C46E6E;--green:#7BA87B}
*{margin:0;padding:0;box-sizing:border-box}html{scroll-behavior:smooth}body{font-family:'Outfit',sans-serif;background:var(--cream);color:var(--charcoal);-webkit-font-smoothing:antialiased}

.nn-nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:24px 48px;display:flex;justify-content:space-between;align-items:center;transition:all .5s cubic-bezier(.22,1,.36,1)}
.nn-nav.scrolled{background:rgba(250,246,241,.92);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);box-shadow:0 1px 0 var(--border);padding:16px 48px}
.nn-logo{height:28px;cursor:pointer;transition:opacity .3s}
.nn-logo:hover{opacity:.7}
.nn-hero-logo{max-width:clamp(280px,50vw,520px);height:auto;opacity:0;transform:translateY(30px);animation:fadeUp 1s cubic-bezier(.22,1,.36,1) .3s forwards}
.nn-nav-links{display:flex;gap:40px;list-style:none;align-items:center}
.nn-nav-links li a{text-decoration:none;color:var(--charcoal);font-size:13px;font-weight:400;letter-spacing:1.8px;text-transform:uppercase;cursor:pointer;position:relative;transition:color .3s}
.nn-nav-links li a:hover{color:var(--gold)}
.nn-nav-links li a::after{content:'';position:absolute;bottom:-6px;left:50%;width:0;height:1.5px;background:var(--gold);transition:all .3s ease;transform:translateX(-50%)}
.nn-nav-links li a:hover::after{width:100%}
.nn-nav-book{padding:10px 28px;background:var(--charcoal);color:var(--cream);font-family:'Outfit',sans-serif;font-size:12px;font-weight:500;letter-spacing:2px;text-transform:uppercase;border:none;cursor:pointer;transition:all .3s ease}
.nn-nav-book:hover{background:var(--gold);color:var(--charcoal)}
.nn-mobile-toggle{display:none;background:none;border:none;cursor:pointer;padding:8px;color:var(--charcoal)}

.nn-hero{min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:140px 40px 100px;position:relative;overflow:hidden;background:linear-gradient(170deg,var(--cream) 0%,var(--warm-white) 40%,var(--blush) 100%)}
.nn-hero::before{content:'';position:absolute;top:-100px;right:-100px;width:500px;height:500px;background:radial-gradient(circle,rgba(201,169,110,.12) 0%,transparent 70%);pointer-events:none}
.nn-hero-accent{width:48px;height:1.5px;background:var(--gold);margin:0 auto 28px;opacity:0;animation:fadeIn .8s ease .2s forwards}
.nn-hero-name{font-family:'Cormorant Garamond',serif;font-size:clamp(56px,10vw,110px);font-weight:300;font-style:italic;line-height:1;letter-spacing:2px;color:var(--charcoal);opacity:0;transform:translateY(30px);animation:fadeUp 1s cubic-bezier(.22,1,.36,1) .3s forwards}
.nn-hero-dot{color:var(--gold)}
.nn-hero-services{display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;margin-top:24px;opacity:0;transform:translateY(20px);animation:fadeUp .8s ease .6s forwards}
.nn-hero-services span{font-size:12px;font-weight:400;letter-spacing:2.5px;text-transform:uppercase;color:var(--warm-gray)}
.nn-hero-services .dot{width:3px;height:3px;background:var(--gold);border-radius:50%;display:inline-block}
.nn-hero-address{font-size:13px;font-weight:300;letter-spacing:3px;text-transform:uppercase;color:var(--taupe);margin-top:20px;opacity:0;animation:fadeUp .8s ease .8s forwards}
.nn-hero-cta{margin-top:52px;display:flex;gap:16px;align-items:center;opacity:0;animation:fadeUp .8s ease 1s forwards;flex-wrap:wrap;justify-content:center}

.nn-btn{display:inline-block;padding:18px 52px;font-family:'Outfit',sans-serif;font-size:12px;font-weight:500;letter-spacing:2.5px;text-transform:uppercase;border:none;cursor:pointer;transition:all .4s cubic-bezier(.22,1,.36,1);text-decoration:none}
.nn-btn-dark{background:var(--charcoal);color:var(--cream)}
.nn-btn-dark:hover{background:var(--gold);color:var(--charcoal);transform:translateY(-2px);box-shadow:0 12px 32px rgba(201,169,110,.25)}
.nn-btn-gold{background:var(--gold);color:var(--charcoal)}
.nn-btn-gold:hover{background:var(--charcoal);color:var(--cream);transform:translateY(-2px)}
.nn-btn-outline{background:none;border:1.5px solid var(--border);color:var(--charcoal);display:inline-flex;align-items:center;gap:8px;padding:18px 32px}
.nn-btn-outline:hover{border-color:var(--charcoal)}
.nn-btn-back{padding:16px 36px;background:none;border:1.5px solid var(--border);font-family:'Outfit',sans-serif;font-size:12px;font-weight:500;letter-spacing:2px;text-transform:uppercase;cursor:pointer;transition:all .3s;color:var(--charcoal)}
.nn-btn-back:hover{border-color:var(--charcoal)}

.nn-divider{display:flex;align-items:center;justify-content:center;gap:16px;padding:0 40px}
.nn-divider-line{flex:1;height:1px;background:var(--border);max-width:200px}
.nn-divider-diamond{width:6px;height:6px;background:var(--gold);transform:rotate(45deg)}

.nn-section{padding:100px 48px;max-width:1200px;margin:0 auto}
.nn-section-label{font-size:11px;font-weight:500;letter-spacing:3.5px;text-transform:uppercase;color:var(--gold);margin-bottom:14px}
.nn-section-title{font-family:'Cormorant Garamond',serif;font-size:clamp(32px,5vw,50px);font-weight:300;letter-spacing:.5px;color:var(--charcoal);margin-bottom:16px}
.nn-section-desc{font-size:15px;line-height:1.75;color:var(--warm-gray);max-width:520px;font-weight:300}

.nn-services-grid{display:grid;grid-template-columns:1fr 1fr;gap:64px;margin-top:60px}
.nn-service-cat-title{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:400;margin-bottom:28px;padding-bottom:14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px}
.nn-service-cat-title::before{content:'';width:20px;height:1.5px;background:var(--gold)}
.nn-service-row{display:flex;justify-content:space-between;align-items:center;padding:16px 0;transition:all .3s;border-bottom:1px solid transparent}
.nn-service-row:hover{padding-left:8px;border-bottom-color:var(--border)}
.nn-service-name{font-size:15px;font-weight:500}
.nn-service-dur{font-size:13px;color:var(--warm-gray);font-weight:300;margin-top:4px}
.nn-service-pracs{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
.nn-prac-tag{padding:4px 12px;font-size:11px;font-weight:500;letter-spacing:.5px;color:var(--gold);border:1px solid var(--gold-light);cursor:pointer;transition:all .25s;background:none;font-family:'Outfit',sans-serif}
.nn-prac-tag:hover{background:var(--gold);color:var(--charcoal);border-color:var(--gold)}

.nn-treat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:20px;margin-top:60px}
.nn-treat-card{padding:40px 28px;background:var(--warm-white);border:1px solid var(--border);transition:all .5s cubic-bezier(.22,1,.36,1);position:relative;overflow:hidden}
.nn-treat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--gold);transform:scaleX(0);transition:transform .4s}
.nn-treat-card:hover{transform:translateY(-4px);box-shadow:0 12px 40px rgba(44,40,37,.08)}
.nn-treat-card:hover::before{transform:scaleX(1)}
.nn-treat-icon{font-size:14px;color:var(--gold);margin-bottom:16px;letter-spacing:4px}
.nn-treat-title{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:400;margin-bottom:8px}
.nn-treat-desc{font-size:13px;color:var(--warm-gray);font-weight:300;line-height:1.6;margin-bottom:20px}
.nn-treat-pracs{display:flex;flex-direction:column;gap:8px}
.nn-treat-prac-btn{display:flex;align-items:center;gap:10px;padding:10px 14px;background:none;border:1.5px solid var(--border);cursor:pointer;transition:all .3s;font-family:'Outfit',sans-serif;font-size:13px;font-weight:400;color:var(--charcoal);text-align:left;width:100%}
.nn-treat-prac-btn:hover{border-color:var(--gold);background:var(--cream)}
.nn-treat-prac-dot{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:13px;font-style:italic;color:#fff;flex-shrink:0;overflow:hidden;background-size:cover;background-position:center top}
.nn-treat-prac-arrow{margin-left:auto;color:var(--gold);font-size:14px;opacity:0;transition:opacity .3s}
.nn-treat-prac-btn:hover .nn-treat-prac-arrow{opacity:1}

.nn-team-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:20px;margin-top:60px}
.nn-team-card{padding:44px 20px 36px;text-align:center;background:var(--warm-white);border:1px solid var(--border);transition:all .5s cubic-bezier(.22,1,.36,1);cursor:default;position:relative;overflow:hidden}
.nn-team-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--gold);transform:scaleX(0);transition:transform .4s}
.nn-team-card:hover{transform:translateY(-6px);box-shadow:0 12px 40px rgba(44,40,37,.10)}
.nn-team-card:hover::before{transform:scaleX(1)}
.nn-team-avatar{width:72px;height:72px;border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:22px;font-style:italic;color:#fff;overflow:hidden;background-size:130%;background-position:center 35%}
.nn-team-name{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:400;margin-bottom:6px}
.nn-team-role{font-size:12px;color:var(--warm-gray);font-weight:300;margin-bottom:4px}
.nn-team-spec{font-size:11px;color:var(--gold);font-weight:500;letter-spacing:1px;text-transform:uppercase}

.nn-insta{padding:80px 48px;text-align:center;background:var(--warm-white);border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.nn-insta-title{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:300;font-style:italic;margin-bottom:8px}
.nn-insta a{font-size:14px;color:var(--gold);font-weight:500;text-decoration:none}
.nn-insta a:hover{text-decoration:underline}
.nn-insta p{font-size:14px;color:var(--warm-gray);font-weight:300;margin-top:12px}

.nn-booking{background:var(--warm-white);border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.nn-steps{display:flex;gap:6px;margin:0 0 52px;flex-wrap:wrap}
.nn-step{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:400;color:var(--warm-gray);opacity:.35;transition:all .4s}
.nn-step.active{opacity:1;color:var(--charcoal)}
.nn-step.done{opacity:.6;color:var(--gold)}
.nn-step-num{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:500;border:1.5px solid var(--border);transition:all .4s}
.nn-step.active .nn-step-num{background:var(--charcoal);border-color:var(--charcoal);color:var(--cream)}
.nn-step.done .nn-step-num{background:var(--gold);border-color:var(--gold);color:#fff}
.nn-step-line{width:28px;height:1px;background:var(--border);margin:0 2px}

.nn-prac-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:14px}
.nn-prac-card{padding:32px 16px;text-align:center;border:1.5px solid var(--border);cursor:pointer;transition:all .35s cubic-bezier(.22,1,.36,1);background:var(--warm-white)}
.nn-prac-card:hover{border-color:var(--gold);transform:translateY(-3px);box-shadow:0 4px 24px rgba(44,40,37,.06)}
.nn-prac-card.picked{border-color:var(--charcoal);background:var(--cream)}

.nn-svc-item{display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border:1.5px solid var(--border);cursor:pointer;transition:all .3s;margin-bottom:8px;background:var(--warm-white)}
.nn-svc-item:hover{border-color:var(--gold)}
.nn-svc-item.picked{border-color:var(--charcoal);background:var(--cream)}

.nn-cat-tabs{display:flex;gap:0;margin-bottom:24px}
.nn-cat-tab{padding:12px 28px;font-size:12px;font-weight:500;letter-spacing:1.5px;text-transform:uppercase;border:1.5px solid var(--border);background:none;cursor:pointer;transition:all .3s;font-family:'Outfit',sans-serif;color:var(--charcoal);margin-right:-1px}
.nn-cat-tab:hover{border-color:var(--gold);z-index:1}
.nn-cat-tab.on{background:var(--charcoal);border-color:var(--charcoal);color:var(--cream);z-index:2}

.nn-cal{max-width:400px}
.nn-cal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
.nn-cal-head h3{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:400}
.nn-cal-btn{background:none;border:1px solid var(--border);width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;transition:all .2s;color:var(--charcoal)}
.nn-cal-btn:hover{border-color:var(--charcoal)}
.nn-cal-weekdays{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:6px}
.nn-cal-weekdays span{text-align:center;font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--warm-gray);padding:8px 0}
.nn-cal-days{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
.nn-cal-day{aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:14px;border:none;background:none;cursor:pointer;transition:all .2s;color:var(--charcoal)}
.nn-cal-day:hover:not(.off):not(.nil){background:var(--blush)}
.nn-cal-day.on{background:var(--charcoal);color:var(--cream)}
.nn-cal-day.off{color:var(--border);cursor:default}
.nn-cal-day.now{font-weight:600;box-shadow:inset 0 -2px 0 var(--gold)}
.nn-cal-day.nil{cursor:default}

.nn-times{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:20px}
.nn-time{padding:13px;text-align:center;font-size:14px;border:1.5px solid var(--border);background:var(--warm-white);cursor:pointer;transition:all .25s}
.nn-time:hover{border-color:var(--gold)}
.nn-time.on{border-color:var(--charcoal);background:var(--charcoal);color:var(--cream)}

.nn-confirm{max-width:500px;padding:44px;background:var(--cream);border:1px solid var(--border)}
.nn-confirm-row{display:flex;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--border);font-size:15px}
.nn-confirm-row:last-of-type{border-bottom:none}
.nn-confirm-label{color:var(--warm-gray);font-weight:300}
.nn-confirm-val{font-weight:500}

.nn-input{width:100%;padding:14px 18px;border:1.5px solid var(--border);background:var(--warm-white);font-family:'Outfit',sans-serif;font-size:15px;outline:none;transition:border-color .3s;color:var(--charcoal)}
.nn-input:focus{border-color:var(--gold)}
.nn-input::placeholder{color:var(--taupe);font-weight:300}
.nn-input-label{font-size:12px;color:var(--warm-gray);font-weight:400;letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:8px}

.nn-contact-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:40px;margin-top:48px}
.nn-contact-block h4{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:400;margin-bottom:12px}
.nn-contact-block p{font-size:14px;line-height:1.8;color:var(--warm-gray);font-weight:300}

.nn-footer{padding:48px;text-align:center;background:var(--charcoal);color:rgba(250,246,241,.5);font-size:12px;font-weight:300;letter-spacing:1px}
.nn-footer-logo{height:32px;margin:0 auto 12px;display:block}

.nn-booking-nav{display:flex;gap:14px;margin-top:44px}

/* ── Dashboard ──────────────────────────── */
.nn-dash{min-height:100vh;background:var(--cream);padding:32px}
.nn-dash-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:40px;padding-bottom:20px;border-bottom:1px solid var(--border)}
.nn-dash-greeting{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:300}
.nn-dash-tabs{display:flex;gap:4px;margin-bottom:32px}
.nn-dash-tab{padding:12px 24px;font-size:13px;font-weight:500;letter-spacing:1px;text-transform:uppercase;border:1.5px solid var(--border);background:none;cursor:pointer;transition:all .2s;font-family:'Outfit',sans-serif;color:var(--charcoal)}
.nn-dash-tab.on{background:var(--charcoal);border-color:var(--charcoal);color:var(--cream)}
.nn-booking-card{padding:20px 24px;background:var(--warm-white);border:1px solid var(--border);margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;transition:all .3s}
.nn-booking-card:hover{box-shadow:0 4px 16px rgba(44,40,37,.06)}
.nn-booking-status{padding:4px 12px;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;border-radius:2px}
.nn-booking-status.confirmed{background:rgba(123,168,123,.15);color:var(--green)}
.nn-booking-status.cancelled{background:rgba(196,110,110,.15);color:var(--red)}
.nn-booking-status.completed{background:rgba(201,169,110,.15);color:var(--gold)}

/* Login */
.nn-login{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(170deg,var(--cream),var(--blush))}
.nn-login-card{width:100%;max-width:400px;padding:48px;background:var(--warm-white);border:1px solid var(--border)}
.nn-login-title{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:300;margin-bottom:8px;text-align:center}
.nn-login-sub{font-size:14px;color:var(--warm-gray);text-align:center;margin-bottom:32px;font-weight:300}
.nn-login-error{padding:12px 16px;background:rgba(196,110,110,.1);color:var(--red);font-size:13px;margin-bottom:16px;border:1px solid rgba(196,110,110,.2)}

/* Demo banner */
.nn-demo-banner{background:var(--gold);color:var(--charcoal);text-align:center;padding:10px 20px;font-size:13px;font-weight:500;letter-spacing:.5px;position:fixed;bottom:0;left:0;right:0;z-index:200}

@keyframes fadeUp{to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{to{opacity:1}}
.nn-fade{opacity:0;transform:translateY(24px);transition:all .7s cubic-bezier(.22,1,.36,1)}
.nn-fade.vis{opacity:1;transform:translateY(0)}

.nn-success-icon{width:72px;height:72px;border-radius:50%;background:var(--gold);display:flex;align-items:center;justify-content:center;margin:0 auto 28px;animation:scaleIn .5s cubic-bezier(.22,1,.36,1)}
@keyframes scaleIn{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}

@media(max-width:900px){.nn-team-grid{grid-template-columns:repeat(3,1fr)}.nn-contact-grid{grid-template-columns:1fr}}
@media(max-width:768px){.nn-nav{padding:16px 24px}.nn-nav.scrolled{padding:12px 24px}.nn-nav-links{display:none}.nn-mobile-toggle{display:block}.nn-section{padding:60px 24px}.nn-services-grid{grid-template-columns:1fr;gap:40px}.nn-team-grid{grid-template-columns:repeat(2,1fr)}.nn-prac-grid{grid-template-columns:repeat(2,1fr)}.nn-times{grid-template-columns:repeat(2,1fr)}.nn-confirm{padding:28px}.nn-hero{padding:120px 24px 80px}.nn-insta{padding:60px 24px}.nn-dash{padding:20px}}
`;

// ─── Data Hooks ──────────────────────────────────────────────────────────────

function usePractitioners() {
  const [data, setData] = useState([]);
  useEffect(() => {
    if (IS_DEMO) { setData(DEMO_PRACTITIONERS); return; }
    supabase.query("practitioners", { filters: "&is_active=eq.true&order=sort_order" }).then(setData).catch(console.error);
  }, []);
  return data;
}

function useServices() {
  const [data, setData] = useState({});
  useEffect(() => {
    if (IS_DEMO) { setData(DEMO_SERVICES); return; }
    supabase.query("services", { filters: "&is_active=eq.true&order=name" }).then((rows) => {
      const grouped = {};
      rows.forEach((s) => { if (!grouped[s.category]) grouped[s.category] = []; grouped[s.category].push(s); });
      setData(grouped);
    }).catch(console.error);
  }, []);
  return data;
}

function useAvailableSlots(pracId, date, duration) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!pracId || !date) { setSlots([]); return; }
    if (IS_DEMO) { setSlots(DEMO_TIMES); return; }
    setLoading(true);
    supabase.rpc("get_available_slots", {
      p_practitioner_id: pracId,
      p_date: dateStr(date.year, date.month, date.day),
      p_duration: duration || 30,
    }).then((rows) => { setSlots(rows.map((r) => r.slot_time.slice(0, 5))); setLoading(false); })
      .catch((e) => { console.error(e); setSlots([]); setLoading(false); });
  }, [pracId, date, duration]);
  return { slots, loading };
}

// ─── Public Components ───────────────────────────────────────────────────────

function Nav({ scrolled, onNav, onBook, onDash }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav className={`nn-nav ${scrolled ? "scrolled" : ""}`}>
        <img src="/logo-dark.png" alt="ninety nine." className="nn-logo" onClick={() => onNav("home")} />
        <ul className="nn-nav-links">
          <li><a onClick={() => onNav("services")}>Services</a></li>
          <li><a onClick={() => onNav("team")}>Team</a></li>
          <li><a onClick={() => onNav("contact")}>Contact</a></li>
          <li><a onClick={onDash} style={{ opacity: 0.5, fontSize: 11 }}>Staff Login</a></li>
          <li><button className="nn-nav-book" onClick={onBook}>Book Now</button></li>
        </ul>
        <button className="nn-mobile-toggle" onClick={() => setMobileOpen(o => !o)}>
          {mobileOpen
            ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          }
        </button>
      </nav>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div style={{
          position:"fixed", top:0, left:0, right:0, bottom:0, zIndex:99,
          background:"var(--cream)", display:"flex", flexDirection:"column",
          justifyContent:"center", alignItems:"center", gap:8
        }}>
          {[
            { label:"Services", action:() => { onNav("services"); setMobileOpen(false); }},
            { label:"Team", action:() => { onNav("team"); setMobileOpen(false); }},
            { label:"Contact", action:() => { onNav("contact"); setMobileOpen(false); }},
          ].map(item => (
            <button key={item.label} onClick={item.action} style={{
              background:"none", border:"none", cursor:"pointer",
              fontFamily:"'Cormorant Garamond',serif", fontSize:42, fontWeight:300,
              fontStyle:"italic", color:"var(--charcoal)", padding:"12px 0",
              letterSpacing:"1px", transition:"color .2s"
            }}>{item.label}</button>
          ))}
          <div style={{ width:40, height:1, background:"var(--border)", margin:"16px 0" }}/>
          <button onClick={() => { onBook(); setMobileOpen(false); }} style={{
            padding:"16px 48px", background:"var(--charcoal)", color:"var(--cream)",
            border:"none", cursor:"pointer", fontFamily:"'Outfit',sans-serif",
            fontSize:12, fontWeight:500, letterSpacing:"2.5px", textTransform:"uppercase"
          }}>Book Now</button>
          <button onClick={() => { onDash(); setMobileOpen(false); }} style={{
            background:"none", border:"none", cursor:"pointer",
            fontSize:12, color:"var(--warm-gray)", letterSpacing:"1.5px",
            textTransform:"uppercase", marginTop:8, fontFamily:"'Outfit',sans-serif"
          }}>Staff Login</button>
        </div>
      )}
    </>
  );
}

function Hero({ onBook }) {
  return (
    <section className="nn-hero" id="home">
      <div className="nn-hero-accent"/>
      <img src="/logo-dark.png" alt="ninety nine." className="nn-hero-logo" />
      <div className="nn-hero-services">
        <span>Hands</span><span className="dot"/><span>Toes</span><span className="dot"/><span>Brows</span><span className="dot"/><span>Lashes</span><span className="dot"/><span>Facials</span>
      </div>
      <p className="nn-hero-address">99 Banks Road · West Kirby</p>
      <div className="nn-hero-cta">
        <button className="nn-btn nn-btn-dark" onClick={onBook}>Book Appointment</button>
        <a className="nn-btn nn-btn-outline" href="https://www.instagram.com/ninetyninebyk/" target="_blank" rel="noopener noreferrer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>
          Follow Us
        </a>
      </div>
    </section>
  );
}

function Divider() {
  return <div className="nn-divider"><div className="nn-divider-line"/><div className="nn-divider-diamond"/><div className="nn-divider-line"/></div>;
}

function ServicesList({ services, practitioners, onBookWith }) {
  const findPrac = (name) => practitioners.find((p) => p.name === name);

  return (
    <section className="nn-section" id="services">
      <div className="nn-section-label">Our Services</div>
      <h2 className="nn-section-title">Treatments</h2>
      <p className="nn-section-desc">From gel manicures to luxury facials, every treatment is delivered with care in our warm, welcoming space on Banks Road. Tap a name to book.</p>
      <div className="nn-treat-grid">
        {TREATMENT_CATEGORIES.map((cat) => (
          <div className="nn-treat-card" key={cat.id}>
            <div className="nn-treat-icon">{cat.icon}</div>
            <div className="nn-treat-title">{cat.title}</div>
            <div className="nn-treat-desc">{cat.description}</div>
            <div className="nn-treat-pracs">
              {cat.practitioners.map((name) => {
                const p = findPrac(name);
                return (
                  <button key={name} className="nn-treat-prac-btn" onClick={() => { if (p) onBookWith(p); }}>
                    <span>{name}</span>
                    <span className="nn-treat-prac-arrow">→</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TeamSection({ practitioners }) {
  return (
    <section className="nn-section" id="team">
      <div className="nn-section-label">The Team</div>
      <h2 className="nn-section-title">Meet the Girls</h2>
      <p className="nn-section-desc">Each of our talented practitioners is self-employed, bringing their own unique expertise and loyal clientele to ninety nine.</p>
      <div className="nn-team-grid">
        {practitioners.map((p) => (
          <div className="nn-team-card" key={p.id} style={p.name === "Kristen" ? {border:"2px solid var(--gold)"} : {}}>
            {p.photo ? (
              <div className="nn-team-avatar" style={{ backgroundImage: `url(${p.photo})` }} />
            ) : (
              <div className="nn-team-avatar" style={{ background: p.color }}>{p.name[0]}</div>
            )}
            <div className="nn-team-name">{p.name}</div>
            <div className="nn-team-role">{p.role}</div>
            {p.instagram && (
              <a href={`https://www.instagram.com/${p.instagram.replace('@','')}/`} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:"var(--gold)", textDecoration:"none", marginTop:6, display:"inline-block" }}>{p.instagram}</a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Booking Flow ────────────────────────────────────────────────────────────

function BookingFlow({ practitioners, services, preselectedPrac, onClearPreselect }) {
  const [step, setStep] = useState(preselectedPrac ? 2 : 1);
  const [prac, setPrac] = useState(preselectedPrac || null);
  const [svc, setSvc] = useState(null);

  // When a practitioner is pre-selected from the services section
  useEffect(() => {
    if (preselectedPrac) {
      setPrac(preselectedPrac);
      setStep(2);
      setSvc(null);
      setDate(null);
      setTime(null);
      setDone(false);
      if (onClearPreselect) onClearPreselect();
    }
  }, [preselectedPrac]);

  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [cat, setCat] = useState("nails");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const now = new Date();
  const [cM, setCM] = useState(now.getMonth());
  const [cY, setCY] = useState(now.getFullYear());
  const labels = ["Practitioner", "Service", "Date & Time", "Confirm"];

  const { slots, loading: slotsLoading } = useAvailableSlots(prac?.id, date, svc?.duration);

  async function handleConfirm() {
    if (IS_DEMO) { setDone(true); return; }
    setSaving(true);
    try {
      await supabase.insert("bookings", {
        practitioner_id: prac.id,
        service_id: svc.id,
        client_name: name,
        client_phone: phone,
        client_email: email,
        booking_date: dateStr(date.year, date.month, date.day),
        booking_time: time + ":00",
        duration: svc.duration,
        price: svc.price,
      });
      setDone(true);
    } catch (e) {
      console.error(e);
      alert("Sorry, there was an error creating your booking. Please try again.");
    }
    setSaving(false);
  }

  if (done) {
    return (
      <div style={{ padding: "60px 0", maxWidth: 480, margin: "0 auto" }}>
        <div className="nn-success-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
        <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:300, textAlign:"center", marginBottom:10 }}>You're all booked</h2>
        <p style={{ textAlign:"center", color:"var(--warm-gray)", fontSize:15, fontWeight:300, lineHeight:1.6 }}>
          {name}, your appointment with {prac.name} is confirmed for {getDayName(date.year,date.month,date.day)} {date.day} {getMonthName(date.month)} at {time}.<br/>See you at 99 Banks Road!
        </p>
      </div>
    );
  }

  const H3 = ({ children }) => <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:400, marginBottom:24 }}>{children}</h3>;

  return (
    <div>
      <div className="nn-steps">
        {labels.map((l, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div className="nn-step-line"/>}
            <div className={`nn-step ${step === i+1 ? "active" : ""} ${step > i+1 ? "done" : ""}`}>
              <div className="nn-step-num">{step > i+1 ? "✓" : i+1}</div><span>{l}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (<div>
        <H3>Who would you like to see?</H3>
        <div className="nn-prac-grid">
          {practitioners.map((p) => (
            <div key={p.id} className={`nn-prac-card ${prac?.id===p.id?"picked":""}`} onClick={() => setPrac(p)}>
              {p.photo ? (
                <div className="nn-team-avatar" style={{ backgroundImage:`url(${p.photo})`, width:48, height:48, margin:"0 auto 14px" }} />
              ) : (
                <div className="nn-team-avatar" style={{ background:p.color, width:48, height:48, fontSize:18, margin:"0 auto 14px" }}>{p.name[0]}</div>
              )}
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:400, marginBottom:4 }}>{p.name}</div>
              <div style={{ fontSize:11, color:"var(--warm-gray)", fontWeight:300 }}>{p.specialty}</div>
            </div>
          ))}
        </div>
        <div className="nn-booking-nav"><button className="nn-btn nn-btn-dark" onClick={() => setStep(2)} disabled={!prac} style={{ opacity:prac?1:.35 }}>Continue</button></div>
      </div>)}

      {step === 2 && (<div>
        <H3>{prac?.name}'s treatments</H3>
        {(() => {
          // Get services this practitioner offers
          const pracServiceNames = PRACTITIONER_SERVICE_LIST[prac?.name] || [];
          const allServices = [...(services.nails || []), ...(services.beauty || [])];
          const filtered = allServices.filter((s) => pracServiceNames.includes(s.name));
          if (filtered.length === 0) return <div style={{ color:"var(--warm-gray)", fontSize:14, fontWeight:300 }}>No services found for this practitioner.</div>;
          return filtered.map((s) => (
            <div key={s.id} className={`nn-svc-item ${svc?.id===s.id?"picked":""}`} onClick={() => setSvc(s)}>
              <div>
                <div style={{ fontWeight:500, marginBottom:3 }}>{s.name}</div>
                <div style={{ fontSize:13, color:"var(--warm-gray)", fontWeight:300 }}>{s.duration} minutes</div>
              </div>
              <div style={{ fontSize:17, fontWeight:600, color:"var(--gold)" }}>£{s.price}</div>
            </div>
          ));
        })()}
        <div className="nn-booking-nav">
          <button className="nn-btn-back" onClick={() => setStep(1)}>Back</button>
          <button className="nn-btn nn-btn-dark" onClick={() => setStep(3)} disabled={!svc} style={{ opacity:svc?1:.35 }}>Continue</button>
        </div>
      </div>)}

      {step === 3 && (<div>
        <H3>Pick a date &amp; time</H3>
        <div style={{ display:"flex", gap:48, flexWrap:"wrap" }}>
          <div className="nn-cal">
            <div className="nn-cal-head">
              <button className="nn-cal-btn" onClick={() => { if(cM===0){setCM(11);setCY(cY-1)}else setCM(cM-1) }}>‹</button>
              <h3>{getMonthName(cM)} {cY}</h3>
              <button className="nn-cal-btn" onClick={() => { if(cM===11){setCM(0);setCY(cY+1)}else setCM(cM+1) }}>›</button>
            </div>
            <div className="nn-cal-weekdays">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => <span key={d}>{d}</span>)}</div>
            <div className="nn-cal-days">
              {(() => {
                const first = (new Date(cY,cM,1).getDay()+6)%7;
                const total = getDaysInMonth(cY,cM);
                const cells = [];
                for(let i=0;i<first;i++) cells.push(<div className="nn-cal-day nil" key={`e${i}`}/>);
                for(let d=1;d<=total;d++){
                  const isNow=d===now.getDate()&&cM===now.getMonth()&&cY===now.getFullYear();
                  const past=new Date(cY,cM,d)<new Date(now.getFullYear(),now.getMonth(),now.getDate());
                  const sun=new Date(cY,cM,d).getDay()===0;
                  const sel=date&&date.day===d&&date.month===cM&&date.year===cY;
                  cells.push(<button key={d} className={`nn-cal-day ${sel?"on":""} ${past||sun?"off":""} ${isNow?"now":""}`}
                    onClick={() => { if(!past&&!sun){ setDate({day:d,month:cM,year:cY}); setTime(null); }}} disabled={past||sun}>{d}</button>);
                }
                return cells;
              })()}
            </div>
          </div>
          {date && (
            <div style={{ flex:1, minWidth:200 }}>
              <div style={{ fontSize:14, color:"var(--warm-gray)", marginBottom:14, fontWeight:300 }}>
                {getDayName(date.year,date.month,date.day)} {date.day} {getMonthName(date.month)}
              </div>
              {slotsLoading ? (
                <div style={{ color:"var(--warm-gray)", fontSize:14, fontWeight:300 }}>Loading available times...</div>
              ) : slots.length === 0 ? (
                <div style={{ color:"var(--red)", fontSize:14, fontWeight:300 }}>No available slots on this date. Try another day.</div>
              ) : (
                <div className="nn-times">{slots.map((t) => <button key={t} className={`nn-time ${time===t?"on":""}`} onClick={() => setTime(t)}>{t}</button>)}</div>
              )}
            </div>
          )}
        </div>
        <div className="nn-booking-nav">
          <button className="nn-btn-back" onClick={() => setStep(2)}>Back</button>
          <button className="nn-btn nn-btn-dark" onClick={() => setStep(4)} disabled={!date||!time} style={{ opacity:date&&time?1:.35 }}>Continue</button>
        </div>
      </div>)}

      {step === 4 && (<div>
        <H3>Confirm your booking</H3>
        <div className="nn-confirm">
          <div className="nn-confirm-row"><span className="nn-confirm-label">Practitioner</span><span className="nn-confirm-val">{prac?.name}</span></div>
          <div className="nn-confirm-row"><span className="nn-confirm-label">Treatment</span><span className="nn-confirm-val">{svc?.name}</span></div>
          <div className="nn-confirm-row"><span className="nn-confirm-label">Date</span><span className="nn-confirm-val">{getDayName(date.year,date.month,date.day)} {date.day} {getMonthName(date.month)} {date.year}</span></div>
          <div className="nn-confirm-row"><span className="nn-confirm-label">Time</span><span className="nn-confirm-val">{time}</span></div>
          <div className="nn-confirm-row"><span className="nn-confirm-label">Duration</span><span className="nn-confirm-val">{svc?.duration} min</span></div>
          <div className="nn-confirm-row"><span className="nn-confirm-label">Price</span><span className="nn-confirm-val">£{svc?.price}</span></div>
          <div style={{ marginTop:28, display:"flex", flexDirection:"column", gap:16 }}>
            <div><label className="nn-input-label">Your Name</label><input className="nn-input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name"/></div>
            <div><label className="nn-input-label">Phone Number</label><input className="nn-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07xxx xxxxxx"/></div>
            <div><label className="nn-input-label">Email (optional)</label><input className="nn-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="for confirmation email"/></div>
          </div>
        </div>
        <div className="nn-booking-nav">
          <button className="nn-btn-back" onClick={() => setStep(3)}>Back</button>
          <button className="nn-btn nn-btn-gold" onClick={handleConfirm} disabled={!name||!phone||saving} style={{ opacity:name&&phone&&!saving?1:.35 }}>
            {saving ? "Booking..." : "Confirm Booking"}
          </button>
        </div>
      </div>)}
    </div>
  );
}

// ─── Practitioner Dashboard ──

function Dashboard({ onBack }) {
  const [auth, setAuth] = useState(null);
  const [prac, setPrac] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [tab, setTab] = useState("bookings");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  // ── Services state ──
  const [allServices, setAllServices] = useState([]);
  const [myServices, setMyServices] = useState([]); // practitioner_services rows
  const [servicesSaving, setServicesSaving] = useState({});

  // ── Schedule state ──
  const [availability, setAvailability] = useState([]); // 7 rows, one per day
  const [blockedDates, setBlockedDates] = useState([]);
  const [schedSaving, setSchedSaving] = useState(false);
  const [newBlock, setNewBlock] = useState("");
  const [blockSaving, setBlockSaving] = useState(false);

  const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  async function handleLogin(e) {
    e.preventDefault();
    setLoginErr("");
    if (IS_DEMO) {
      setAuth({ access_token: "demo" });
      setPrac(DEMO_PRACTITIONERS[0]);
      return;
    }
    try {
      const session = await supabase.signIn(loginEmail, loginPass);
      setAuth(session);
      const pracs = await supabase.query("practitioners", {
        filters: `&user_id=eq.${session.user.id}`,
        token: session.access_token,
      });
      if (pracs.length > 0) setPrac(pracs[0]);
      else setLoginErr("No practitioner account linked to this email. Please contact Kristen.");
    } catch (e) {
      setLoginErr(e.message);
    }
  }

  // ── Load bookings ──
  useEffect(() => {
    if (!auth || !prac || tab !== "bookings") return;
    if (IS_DEMO) {
      setBookings([
        { id: "d1", client_name: "Sarah J.", client_phone: "07700 123456", booking_date: "2026-03-18", booking_time: "10:00:00", duration: 45, price: 30, status: "confirmed", service: { name: "Gel Manicure" } },
        { id: "d2", client_name: "Emma W.", client_phone: "07700 654321", booking_date: "2026-03-18", booking_time: "11:30:00", duration: 60, price: 40, status: "confirmed", service: { name: "Lash Lift & Tint" } },
        { id: "d3", client_name: "Rachel K.", client_phone: "07700 111222", booking_date: "2026-03-19", booking_time: "09:30:00", duration: 60, price: 55, status: "confirmed", service: { name: "Luxury Facial" } },
        { id: "d4", client_name: "Amy T.", client_phone: "07700 333444", booking_date: "2026-03-17", booking_time: "14:00:00", duration: 45, price: 30, status: "completed", service: { name: "Gel Manicure" } },
      ]);
      return;
    }
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    supabase.query("bookings", {
      select: "*,service:services(name)",
      filters: `&practitioner_id=eq.${prac.id}&booking_date=gte.${today}&status=eq.confirmed&order=booking_date,booking_time`,
      token: auth.access_token,
    }).then(setBookings).catch(console.error).finally(() => setLoading(false));
  }, [auth, prac, tab]);

  // ── Load services ──
  useEffect(() => {
    if (!auth || !prac || tab !== "services") return;
    if (IS_DEMO) {
      const all = [...DEMO_SERVICES.nails, ...DEMO_SERVICES.beauty];
      setAllServices(all);
      const myNames = PRACTITIONER_SERVICE_LIST[prac.name] || [];
      setMyServices(all.filter(s => myNames.includes(s.name)).map(s => ({ service_id: s.id, custom_price: null })));
      return;
    }
    Promise.all([
      supabase.query("services", { filters: "&is_active=eq.true&order=category,name" }),
      supabase.query("practitioner_services", {
        filters: `&practitioner_id=eq.${prac.id}`,
        token: auth.access_token,
      }),
    ]).then(([svcs, myS]) => {
      setAllServices(svcs);
      setMyServices(myS);
    }).catch(console.error);
  }, [auth, prac, tab]);

  // ── Load schedule ──
  useEffect(() => {
    if (!auth || !prac || tab !== "schedule") return;
    if (IS_DEMO) {
      setAvailability(DAY_NAMES.map((_, i) => ({
        day_of_week: i,
        start_time: "09:00",
        end_time: i < 5 ? "17:30" : "17:00",
        is_available: i < 6,
      })));
      setBlockedDates([]);
      return;
    }
    Promise.all([
      supabase.query("availability", {
        filters: `&practitioner_id=eq.${prac.id}&order=day_of_week`,
        token: auth.access_token,
      }),
      supabase.query("blocked_dates", {
        filters: `&practitioner_id=eq.${prac.id}&blocked_date=gte.${new Date().toISOString().split("T")[0]}&order=blocked_date`,
        token: auth.access_token,
      }),
    ]).then(([avail, blocked]) => {
      // Fill in any missing days
      const filled = DAY_NAMES.map((_, i) => {
        const found = avail.find(a => a.day_of_week === i);
        return found || { day_of_week: i, start_time: "09:00", end_time: "17:30", is_available: false };
      });
      setAvailability(filled);
      setBlockedDates(blocked);
    }).catch(console.error);
  }, [auth, prac, tab]);

  // ── Bookings actions ──
  async function updateStatus(bookingId, status) {
    if (IS_DEMO) {
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));
      return;
    }
    await supabase.update("bookings", { status }, `id=eq.${bookingId}`, auth.access_token);
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));
  }

  // ── Service toggle ──
  function isMyService(serviceId) {
    return myServices.some(s => s.service_id === serviceId);
  }

  function getCustomPrice(serviceId) {
    const row = myServices.find(s => s.service_id === serviceId);
    return row?.custom_price ?? null;
  }

  async function toggleService(svc) {
    const on = isMyService(svc.id);
    setServicesSaving(prev => ({ ...prev, [svc.id]: true }));
    if (IS_DEMO) {
      if (on) setMyServices(prev => prev.filter(s => s.service_id !== svc.id));
      else setMyServices(prev => [...prev, { service_id: svc.id, custom_price: null }]);
      setServicesSaving(prev => ({ ...prev, [svc.id]: false }));
      return;
    }
    try {
      if (on) {
        await fetch(`${SUPABASE_URL}/rest/v1/practitioner_services?practitioner_id=eq.${prac.id}&service_id=eq.${svc.id}`, {
          method: "DELETE", headers: supabase.headers(auth.access_token),
        });
        setMyServices(prev => prev.filter(s => s.service_id !== svc.id));
      } else {
        const res = await supabase.insert("practitioner_services", {
          practitioner_id: prac.id, service_id: svc.id,
        }, auth.access_token);
        setMyServices(prev => [...prev, res[0]]);
      }
    } catch (e) { console.error(e); }
    setServicesSaving(prev => ({ ...prev, [svc.id]: false }));
  }

  async function savePrice(svc, price) {
    if (IS_DEMO) {
      setMyServices(prev => prev.map(s => s.service_id === svc.id ? { ...s, custom_price: price || null } : s));
      return;
    }
    try {
      await supabase.update("practitioner_services",
        { custom_price: price || null },
        `practitioner_id=eq.${prac.id}&service_id=eq.${svc.id}`,
        auth.access_token
      );
      setMyServices(prev => prev.map(s => s.service_id === svc.id ? { ...s, custom_price: price || null } : s));
    } catch (e) { console.error(e); }
  }

  // ── Schedule actions ──
  async function saveAvailability(day) {
    const row = availability[day];
    setSchedSaving(true);
    if (IS_DEMO) { setSchedSaving(false); return; }
    try {
      // Upsert availability row
      const res = await fetch(`${SUPABASE_URL}/rest/v1/availability?practitioner_id=eq.${prac.id}&day_of_week=eq.${day}`, {
        method: "PATCH",
        headers: { ...supabase.headers(auth.access_token), Prefer: "return=representation" },
        body: JSON.stringify({ is_available: row.is_available, start_time: row.start_time, end_time: row.end_time }),
      });
      if (!res.ok) {
        // Row might not exist yet — insert it
        await supabase.insert("availability", {
          practitioner_id: prac.id,
          day_of_week: day,
          start_time: row.start_time,
          end_time: row.end_time,
          is_available: row.is_available,
        }, auth.access_token);
      }
    } catch (e) { console.error(e); }
    setSchedSaving(false);
  }

  function updateAvail(day, field, value) {
    setAvailability(prev => prev.map((r, i) => i === day ? { ...r, [field]: value } : r));
  }

  async function addBlockedDate() {
    if (!newBlock) return;
    setBlockSaving(true);
    if (IS_DEMO) {
      setBlockedDates(prev => [...prev, { id: Date.now(), blocked_date: newBlock }]);
      setNewBlock("");
      setBlockSaving(false);
      return;
    }
    try {
      const res = await supabase.insert("blocked_dates", {
        practitioner_id: prac.id, blocked_date: newBlock,
      }, auth.access_token);
      setBlockedDates(prev => [...prev, res[0]]);
      setNewBlock("");
    } catch (e) { console.error(e); }
    setBlockSaving(false);
  }

  async function removeBlockedDate(id) {
    if (IS_DEMO) { setBlockedDates(prev => prev.filter(b => b.id !== id)); return; }
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/blocked_dates?id=eq.${id}`, {
        method: "DELETE", headers: supabase.headers(auth.access_token),
      });
      setBlockedDates(prev => prev.filter(b => b.id !== id));
    } catch (e) { console.error(e); }
  }

  // ── Login screen ──
  if (!auth) {
    return (
      <div className="nn-login">
        <div className="nn-login-card">
          <div className="nn-login-title">Staff Login</div>
          <div className="nn-login-sub">ninety nine. practitioner portal</div>
          {loginErr && <div className="nn-login-error">{loginErr}</div>}
          <div onKeyDown={(e) => e.key === "Enter" && handleLogin(e)} style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div><label className="nn-input-label">Email</label><input className="nn-input" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="your@email.com"/></div>
            <div><label className="nn-input-label">Password</label><input className="nn-input" type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} placeholder="••••••••"/></div>
            <button className="nn-btn nn-btn-dark" onClick={handleLogin} style={{ width:"100%", marginTop:8 }}>Sign In</button>
            <button className="nn-btn-back" onClick={onBack} style={{ width:"100%", textAlign:"center" }}>← Back to Website</button>
          </div>
          {IS_DEMO && <p style={{ marginTop:16, fontSize:12, color:"var(--warm-gray)", textAlign:"center" }}>Demo mode — click Sign In to preview</p>}
        </div>
      </div>
    );
  }

  const upcoming = bookings.filter(b => b.status === "confirmed");

  // Group all services by category for the services tab
  const nailServices = allServices.filter(s => s.category === "nails");
  const beautyServices = allServices.filter(s => s.category === "beauty");

  return (
    <div className="nn-dash">
      <div className="nn-dash-header">
        <div>
          <div className="nn-dash-greeting">Hello, {prac?.name}</div>
          <div style={{ fontSize:14, color:"var(--warm-gray)", fontWeight:300, marginTop:4 }}>{prac?.specialty}</div>
        </div>
        <div style={{ display:"flex", gap:12 }}>
          <button className="nn-btn-back" onClick={() => { setAuth(null); setPrac(null); }}>Sign Out</button>
          <button className="nn-btn-back" onClick={onBack}>Website</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="nn-dash-tabs">
        <button className={`nn-dash-tab ${tab === "bookings" ? "on" : ""}`} onClick={() => setTab("bookings")}>
          Bookings {tab === "bookings" && upcoming.length > 0 ? `(${upcoming.length})` : ""}
        </button>
        <button className={`nn-dash-tab ${tab === "services" ? "on" : ""}`} onClick={() => setTab("services")}>
          My Services
        </button>
        <button className={`nn-dash-tab ${tab === "schedule" ? "on" : ""}`} onClick={() => setTab("schedule")}>
          My Schedule
        </button>
      </div>

      {/* ── BOOKINGS TAB ── */}
      {tab === "bookings" && (
        loading ? (
          <div style={{ color:"var(--warm-gray)", padding:40, textAlign:"center" }}>Loading bookings...</div>
        ) : upcoming.length === 0 ? (
          <div style={{ padding:48, textAlign:"center", color:"var(--warm-gray)", fontSize:15, fontWeight:300 }}>
            No upcoming bookings — enjoy the break!
          </div>
        ) : (
          <div>
            {upcoming.map(b => (
              <div className="nn-booking-card" key={b.id}>
                <div>
                  <div style={{ fontWeight:500, marginBottom:4 }}>{b.client_name}</div>
                  <div style={{ fontSize:13, color:"var(--warm-gray)", fontWeight:300 }}>
                    {b.service?.name || "Service"} · {b.duration} min · £{b.price}
                  </div>
                  <div style={{ fontSize:13, color:"var(--warm-gray)", fontWeight:300, marginTop:2 }}>
                    {b.booking_date} at {b.booking_time?.slice(0,5)} · {b.client_phone}
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span className="nn-booking-status confirmed">confirmed</span>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={() => updateStatus(b.id, "completed")}
                      style={{ padding:"6px 14px", background:"var(--green)", color:"#fff", border:"none", cursor:"pointer", fontSize:11, fontWeight:600, letterSpacing:.5, textTransform:"uppercase", fontFamily:"'Outfit',sans-serif" }}>Done</button>
                    <button onClick={() => updateStatus(b.id, "cancelled")}
                      style={{ padding:"6px 14px", background:"none", color:"var(--red)", border:"1px solid var(--red)", cursor:"pointer", fontSize:11, fontWeight:600, letterSpacing:.5, textTransform:"uppercase", fontFamily:"'Outfit',sans-serif" }}>Cancel</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── SERVICES TAB ── */}
      {tab === "services" && (
        <div style={{ maxWidth:680 }}>
          <p style={{ fontSize:14, color:"var(--warm-gray)", fontWeight:300, marginBottom:32, lineHeight:1.7 }}>
            Toggle your services on or off — only active services will show in the booking flow. Set your own price for each treatment.
          </p>

          {[["Nails", nailServices], ["Beauty", beautyServices]].map(([catLabel, svcs]) => (
            svcs.length > 0 && (
              <div key={catLabel} style={{ marginBottom:40 }}>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:400, marginBottom:16, paddingBottom:12, borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ width:20, height:1.5, background:"var(--gold)", display:"inline-block" }}/>
                  {catLabel}
                </div>
                {svcs.map(svc => {
                  const active = isMyService(svc.id);
                  const customPrice = getCustomPrice(svc.id);
                  const saving = servicesSaving[svc.id];
                  return (
                    <div key={svc.id} style={{
                      display:"flex", alignItems:"center", gap:16, padding:"16px 20px",
                      background: active ? "var(--warm-white)" : "transparent",
                      border: `1.5px solid ${active ? "var(--border)" : "var(--border)"}`,
                      marginBottom:8, opacity: saving ? 0.5 : 1, transition:"all .2s"
                    }}>
                      {/* Toggle */}
                      <button onClick={() => toggleService(svc)} style={{
                        width:44, height:24, borderRadius:12, border:"none", cursor:"pointer",
                        background: active ? "var(--charcoal)" : "var(--border)",
                        position:"relative", transition:"background .2s", flexShrink:0
                      }}>
                        <span style={{
                          position:"absolute", top:3, left: active ? 23 : 3,
                          width:18, height:18, borderRadius:"50%", background:"#fff",
                          transition:"left .2s", display:"block"
                        }}/>
                      </button>

                      {/* Name + duration */}
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:500, fontSize:14, color: active ? "var(--charcoal)" : "var(--warm-gray)" }}>{svc.name}</div>
                        <div style={{ fontSize:12, color:"var(--warm-gray)", fontWeight:300, marginTop:2 }}>{svc.duration} min</div>
                      </div>

                      {/* Price input — only show when active */}
                      {active && (
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontSize:14, color:"var(--warm-gray)" }}>£</span>
                          <input
                            type="number"
                            defaultValue={customPrice ?? svc.price}
                            onBlur={(e) => savePrice(svc, parseFloat(e.target.value))}
                            style={{
                              width:72, padding:"8px 10px", border:"1.5px solid var(--border)",
                              background:"var(--cream)", fontFamily:"'Outfit',sans-serif",
                              fontSize:14, fontWeight:500, color:"var(--gold)", outline:"none",
                              textAlign:"center"
                            }}
                          />
                        </div>
                      )}

                      {/* Default price when off */}
                      {!active && (
                        <div style={{ fontSize:14, color:"var(--border)", fontWeight:300 }}>£{svc.price}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ))}
        </div>
      )}

      {/* ── SCHEDULE TAB ── */}
      {tab === "schedule" && (
        <div style={{ maxWidth:680 }}>
          <p style={{ fontSize:14, color:"var(--warm-gray)", fontWeight:300, marginBottom:32, lineHeight:1.7 }}>
            Set your working days and hours. Block out specific dates for holidays or days off — these won't show as available in the booking system.
          </p>

          {/* Weekly schedule */}
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:400, marginBottom:20, paddingBottom:12, borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ width:20, height:1.5, background:"var(--gold)", display:"inline-block" }}/>
            Weekly Hours
          </div>

          {availability.map((row, i) => (
            <div key={i} style={{
              display:"flex", alignItems:"center", gap:16, padding:"14px 20px",
              background: row.is_available ? "var(--warm-white)" : "transparent",
              border:"1.5px solid var(--border)", marginBottom:8,
              opacity: row.is_available ? 1 : 0.5, transition:"all .2s"
            }}>
              {/* Day toggle */}
              <button onClick={() => {
                updateAvail(i, "is_available", !row.is_available);
                setTimeout(() => saveAvailability(i), 100);
              }} style={{
                width:44, height:24, borderRadius:12, border:"none", cursor:"pointer",
                background: row.is_available ? "var(--charcoal)" : "var(--border)",
                position:"relative", transition:"background .2s", flexShrink:0
              }}>
                <span style={{
                  position:"absolute", top:3, left: row.is_available ? 23 : 3,
                  width:18, height:18, borderRadius:"50%", background:"#fff",
                  transition:"left .2s", display:"block"
                }}/>
              </button>

              <div style={{ width:96, fontSize:14, fontWeight: row.is_available ? 500 : 300, color: row.is_available ? "var(--charcoal)" : "var(--warm-gray)" }}>
                {DAY_NAMES[i]}
              </div>

              {row.is_available && (
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:12, color:"var(--warm-gray)" }}>From</span>
                    <input type="time" value={row.start_time} onChange={(e) => updateAvail(i, "start_time", e.target.value)}
                      onBlur={() => saveAvailability(i)}
                      style={{ padding:"8px 10px", border:"1.5px solid var(--border)", background:"var(--cream)", fontFamily:"'Outfit',sans-serif", fontSize:13, outline:"none" }}
                    />
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:12, color:"var(--warm-gray)" }}>Until</span>
                    <input type="time" value={row.end_time} onChange={(e) => updateAvail(i, "end_time", e.target.value)}
                      onBlur={() => saveAvailability(i)}
                      style={{ padding:"8px 10px", border:"1.5px solid var(--border)", background:"var(--cream)", fontFamily:"'Outfit',sans-serif", fontSize:13, outline:"none" }}
                    />
                  </div>
                </>
              )}

              {!row.is_available && (
                <span style={{ fontSize:13, color:"var(--warm-gray)", fontWeight:300 }}>Not working</span>
              )}
            </div>
          ))}

          {/* Blocked dates */}
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:400, margin:"40px 0 20px", paddingBottom:12, borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ width:20, height:1.5, background:"var(--gold)", display:"inline-block" }}/>
            Blocked Dates
          </div>

          <div style={{ display:"flex", gap:12, marginBottom:24 }}>
            <input type="date" value={newBlock} onChange={(e) => setNewBlock(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              style={{ flex:1, padding:"12px 16px", border:"1.5px solid var(--border)", background:"var(--warm-white)", fontFamily:"'Outfit',sans-serif", fontSize:14, outline:"none" }}
            />
            <button onClick={addBlockedDate} disabled={!newBlock || blockSaving}
              style={{ padding:"12px 28px", background:"var(--charcoal)", color:"var(--cream)", border:"none", cursor:"pointer", fontFamily:"'Outfit',sans-serif", fontSize:12, fontWeight:500, letterSpacing:"2px", textTransform:"uppercase", opacity: newBlock && !blockSaving ? 1 : 0.35 }}>
              Block
            </button>
          </div>

          {blockedDates.length === 0 ? (
            <div style={{ fontSize:14, color:"var(--warm-gray)", fontWeight:300, padding:"20px 0" }}>No dates blocked.</div>
          ) : (
            blockedDates.map(b => (
              <div key={b.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 20px", background:"var(--warm-white)", border:"1.5px solid var(--border)", marginBottom:8 }}>
                <div style={{ fontSize:14, fontWeight:500 }}>
                  {new Date(b.blocked_date + "T12:00:00").toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
                </div>
                <button onClick={() => removeBlockedDate(b.id)}
                  style={{ padding:"6px 14px", background:"none", color:"var(--red)", border:"1px solid var(--red)", cursor:"pointer", fontSize:11, fontWeight:600, letterSpacing:.5, textTransform:"uppercase", fontFamily:"'Outfit',sans-serif" }}>
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function CancelPage({ token }) {
  const [status, setStatus] = useState("loading");
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    supabase.query("bookings", {
      select: "*,service:services(name),practitioner:practitioners(name)",
      filters: `&cancellation_token=eq.${token}&status=eq.confirmed`,
    }).then((rows) => {
      if (rows.length === 0) { setStatus("notfound"); return; }
      setBooking(rows[0]);
      setStatus("confirm");
    }).catch(() => setStatus("error"));
  }, [token]);

  async function handleCancel() {
    setStatus("cancelling");
    try {
      await supabase.update("bookings",
        { status: "cancelled", cancelled_by: "client" },
        `cancellation_token=eq.${token}`
      );
      setStatus("done");
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  }

  const dateObj = booking ? new Date(booking.booking_date + "T12:00:00") : null;
  const formattedDate = dateObj?.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  return (
    <div style={{ minHeight:"100vh", background:"var(--cream)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 24px" }}>
      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, fontStyle:"italic", fontWeight:300, marginBottom:8 }}>ninety nine.</div>
      <div style={{ width:40, height:1.5, background:"var(--gold)", margin:"0 auto 48px" }}/>

      {status === "loading" && (
        <div style={{ color:"var(--warm-gray)", fontSize:15, fontWeight:300 }}>Loading...</div>
      )}

      {status === "notfound" && (
        <div style={{ textAlign:"center", maxWidth:400 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, fontWeight:300, marginBottom:16 }}>Booking not found</div>
          <p style={{ color:"var(--warm-gray)", fontSize:15, fontWeight:300, lineHeight:1.7 }}>
            This booking may have already been cancelled, or the link may have expired.
            DM us on Instagram <a href="https://www.instagram.com/ninetyninebyk/" style={{ color:"var(--gold)" }}>@ninetyninebyk</a> if you need help.
          </p>
        </div>
      )}

      {status === "confirm" && booking && (
        <div style={{ maxWidth:480, width:"100%" }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:300, marginBottom:8, textAlign:"center" }}>Cancel appointment</div>
          <p style={{ textAlign:"center", color:"var(--warm-gray)", fontSize:15, fontWeight:300, marginBottom:40 }}>Are you sure you want to cancel this booking?</p>
          <div style={{ background:"var(--warm-white)", border:"1px solid var(--border)", padding:32, marginBottom:32 }}>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 0", borderBottom:"1px solid var(--border)", fontSize:15 }}>
              <span style={{ color:"var(--warm-gray)", fontWeight:300 }}>Treatment</span>
              <span style={{ fontWeight:500 }}>{booking.service?.name}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 0", borderBottom:"1px solid var(--border)", fontSize:15 }}>
              <span style={{ color:"var(--warm-gray)", fontWeight:300 }}>Practitioner</span>
              <span style={{ fontWeight:500 }}>{booking.practitioner?.name}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 0", borderBottom:"1px solid var(--border)", fontSize:15 }}>
              <span style={{ color:"var(--warm-gray)", fontWeight:300 }}>Date</span>
              <span style={{ fontWeight:500 }}>{formattedDate}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 0", fontSize:15 }}>
              <span style={{ color:"var(--warm-gray)", fontWeight:300 }}>Time</span>
              <span style={{ fontWeight:500 }}>{booking.booking_time?.slice(0,5)}</span>
            </div>
          </div>
          <div style={{ display:"flex", gap:12 }}>
            <a href="/" style={{ flex:1, padding:"16px", background:"none", border:"1.5px solid var(--border)", fontFamily:"'Outfit',sans-serif", fontSize:12, fontWeight:500, letterSpacing:"2px", textTransform:"uppercase", cursor:"pointer", textAlign:"center", textDecoration:"none", color:"var(--charcoal)" }}>
              Keep Booking
            </a>
            <button onClick={handleCancel} style={{ flex:1, padding:"16px", background:"var(--red)", color:"#fff", border:"none", fontFamily:"'Outfit',sans-serif", fontSize:12, fontWeight:500, letterSpacing:"2px", textTransform:"uppercase", cursor:"pointer" }}>
              Yes, Cancel
            </button>
          </div>
        </div>
      )}

      {status === "cancelling" && (
        <div style={{ color:"var(--warm-gray)", fontSize:15, fontWeight:300 }}>Cancelling your appointment...</div>
      )}

      {status === "done" && (
        <div style={{ textAlign:"center", maxWidth:400 }}>
          <div style={{ width:64, height:64, borderRadius:"50%", background:"var(--border)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--warm-gray)" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:300, marginBottom:16 }}>Booking cancelled</div>
          <p style={{ color:"var(--warm-gray)", fontSize:15, fontWeight:300, lineHeight:1.7, marginBottom:32 }}>
            Your appointment has been cancelled. We hope to see you again soon.
          </p>
          <a href="/" style={{ display:"inline-block", padding:"16px 40px", background:"var(--charcoal)", color:"var(--cream)", textDecoration:"none", fontFamily:"'Outfit',sans-serif", fontSize:12, fontWeight:500, letterSpacing:"2px", textTransform:"uppercase" }}>
            Back to Website
          </a>
        </div>
      )}

      {status === "error" && (
        <div style={{ textAlign:"center", maxWidth:400 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, fontWeight:300, marginBottom:16 }}>Something went wrong</div>
          <p style={{ color:"var(--warm-gray)", fontSize:15, fontWeight:300, lineHeight:1.7 }}>
            Please DM us on Instagram <a href="https://www.instagram.com/ninetyninebyk/" style={{ color:"var(--gold)" }}>@ninetyninebyk</a> and we'll sort it for you.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [scrolled, setScrolled] = useState(false);
  const cancelToken = new URLSearchParams(window.location.search).get("token");
const isCancelPage = window.location.pathname === "/cancel" && cancelToken;
const [page, setPage] = useState("site"); // "site" | "dashboard"
  const [preselectedPrac, setPreselectedPrac] = useState(null);
  const bookRef = useRef(null);
  const practitioners = usePractitioners();
  const services = useServices();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("vis"); }),
      { threshold: 0.08 }
    );
    document.querySelectorAll(".nn-fade").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [page]);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior:"smooth" });
  const goBook = () => bookRef.current?.scrollIntoView({ behavior:"smooth" });
  const bookWithPrac = (prac) => {
    setPreselectedPrac(prac);
    bookRef.current?.scrollIntoView({ behavior:"smooth" });
  };
  
if (isCancelPage) {
  return (
    <>
      <style>{css}</style>
      <CancelPage token={cancelToken} />
    </>
  );
}
  
  if (page === "dashboard") {
    return (
      <>
        <style>{css}</style>
        <Dashboard onBack={() => setPage("site")} />
        {IS_DEMO && <div className="nn-demo-banner">Demo Mode — Connect your Supabase project to go live</div>}
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <Nav scrolled={scrolled} onNav={scrollTo} onBook={goBook} onDash={() => setPage("dashboard")} />
      <Hero onBook={goBook} />
      <Divider />
      <div className="nn-fade"><ServicesList services={services} practitioners={practitioners} onBookWith={bookWithPrac} /></div>
      <Divider />
      <div className="nn-fade"><TeamSection practitioners={practitioners} /></div>
      <div className="nn-fade">
        <div className="nn-insta">
          <div className="nn-insta-title">Follow our work</div>
          <a href="https://www.instagram.com/ninetyninebyk/" target="_blank" rel="noopener noreferrer">@ninetyninebyk</a>
          <p>See our latest nails, brows, lashes and more on Instagram</p>
        </div>
      </div>
      <section className="nn-section nn-booking" id="booking" ref={bookRef}>
        <div style={{ marginBottom:60 }}>
          <div className="nn-section-label">Book Online</div>
          <h2 className="nn-section-title">Book Your Appointment</h2>
          <p className="nn-section-desc">Choose your practitioner, pick a treatment, and find a time that suits. Payment is taken at the salon.</p>
        </div>
        <BookingFlow practitioners={practitioners} services={services} preselectedPrac={preselectedPrac} onClearPreselect={() => setPreselectedPrac(null)} />
      </section>
      <div className="nn-fade">
        <section className="nn-section" id="contact">
          <div className="nn-section-label">Find Us</div>
          <h2 className="nn-section-title">Visit the Salon</h2>
          <div className="nn-contact-grid">
            <div className="nn-contact-block"><h4>Location</h4><p>ninety nine.<br/>99 Banks Road<br/>West Kirby, Wirral<br/>CH48</p></div>
            <div className="nn-contact-block"><h4>Opening Hours</h4><p>Monday – Friday: 9am – 6pm<br/>Saturday: 9am – 5pm<br/>Sunday: Closed</p></div>
            <div className="nn-contact-block"><h4>Get in Touch</h4><p>Instagram: <a href="https://www.instagram.com/ninetyninebyk/" target="_blank" rel="noopener noreferrer" style={{ color:"var(--gold)", textDecoration:"none" }}>@ninetyninebyk</a><br/>Book online or DM us<br/>on Instagram</p></div>
          </div>
        </section>
      </div>
      <footer className="nn-footer">
        <img src="/logo-light.png" alt="ninety nine." className="nn-footer-logo" />
        99 Banks Road · West Kirby · Wirral &nbsp;·&nbsp; © {new Date().getFullYear()}
      </footer>
      {IS_DEMO && <div className="nn-demo-banner">Demo Mode — Connect your Supabase project to go live</div>}
    </>
  );
}
