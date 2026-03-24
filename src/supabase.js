// src/supabase.js — Supabase client & helpers
// No changes to any logic, just extracted from App.jsx

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";

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

const IS_DEMO = SUPABASE_URL === "YOUR_SUPABASE_URL";

export { supabase, SUPABASE_URL, SUPABASE_ANON_KEY, IS_DEMO };
