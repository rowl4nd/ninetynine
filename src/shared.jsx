// src/shared.js — Shared data, utilities, hooks & components
// Used by both Site.jsx and Dashboard.jsx

import React, { useState, useEffect } from "react";
import { supabase, IS_DEMO } from "./supabase.js";

// ============================================================
// DEMO DATA
// ============================================================

export const DEMO_PRACTITIONERS = [
  { id: "1", name: "Lisa", role: "Facial, Lash Lift & Brow Artist", specialty: "Facials & Skin", color: "#C9A96E", photo: "/team/Lisa.jpg", instagram: "@elisehouseuk" },
  { id: "2", name: "Inke", role: "Manicurist & Lash Lift Technician", specialty: "Nails & Lashes", color: "#B8A08A", photo: "/team/Inke.jpg", instagram: "@byinke_x" },
  { id: "3", name: "Holly", role: "Gel Toes & Toenail Reconstruction", specialty: "Gel Toes", color: "#C4A882", photo: "/team/Holly.jpg", instagram: "@painted__byholly" },
  { id: "4", name: "Kristen", role: "Salon Owner & Senior Manicurist", specialty: "Gel & Nail Art", color: "#A89080", photo: "/team/Kristen.jpg", instagram: "@nailsbykristen_x" },
  { id: "5", name: "Melissa", role: "Nail Technician", specialty: "Nail Art", color: "#BCA68E", photo: null, instagram: null },
];

export const DEMO_SERVICES_LIST = [
  { id: "s1", title: "Gel Manicure", group_name: null, duration: 45, price: 30, description: "", addon: null },
  { id: "s2", title: "BIAB Overlay", group_name: "BIAB Manicure", duration: 60, price: 38, description: "", addon: null },
  { id: "s3", title: "Acrylic Full Set", group_name: null, duration: 75, price: 40, description: "", addon: null },
  { id: "s4", title: "Gel Removal", group_name: null, duration: 20, price: 10, description: "", addon: null },
];

export const DEMO_TIMES = ["09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30"];

export const TREATMENT_CATEGORIES = [
  { id: "hands", title: "Hands", icon: "✦", description: "Gel manicures, acrylics, BIAB & nail art", practitioners: ["Kristen", "Inke", "Melissa"] },
  { id: "toes", title: "Toes", icon: "✦", description: "Gel toes & pedicures", practitioners: ["Holly"] },
  { id: "brows", title: "Brows", icon: "✦", description: "Lamination, wax & tint", practitioners: ["Lisa"] },
  { id: "lashes", title: "Lashes", icon: "✦", description: "Lash lifts, tints & extensions", practitioners: ["Inke", "Lisa"] },
  { id: "facials", title: "Facials", icon: "✦", description: "Express & luxury facials", practitioners: ["Lisa"] },
];

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

export function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
export function getMonthName(m) { return ["January","February","March","April","May","June","July","August","September","October","November","December"][m]; }
export function getDayName(y, m, d) { return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date(y, m, d).getDay()]; }
export function dateStr(y, m, d) { return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }

// ============================================================
// HOOKS
// ============================================================

export function usePractitioners() {
  const [data, setData] = useState([]);
  useEffect(() => {
    if (IS_DEMO) { setData(DEMO_PRACTITIONERS); return; }
    supabase.query("practitioners", { select: "*", filters: "&is_active=eq.true&order=sort_order" }).then(setData).catch(console.error);
  }, []);
  return data;
}

export function useAvailableSlots(pracId, date, duration, interval) {
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
      p_interval: interval || 30,
    }).then((rows) => { setSlots(rows.map((r) => r.slot_time.slice(0, 5))); setLoading(false); })
      .catch((e) => { console.error(e); setSlots([]); setLoading(false); });
  }, [pracId, date, duration]);
  return { slots, loading };
}

// ============================================================
// SHARED COMPONENTS
// ============================================================

export function SvcItem({ s, picked, onSelect }) {
  return (
    <div className={"nn-svc-item" + (picked ? " picked" : "")} onClick={() => onSelect(s)}>
      <div>
        <div style={{ fontWeight:500, marginBottom:3 }}>{s.title}</div>
        {s.description && <div style={{ fontSize:12, color:"var(--warm-gray)", fontWeight:300, marginTop:2 }}>{s.description}</div>}
        <div style={{ fontSize:13, color:"var(--warm-gray)", fontWeight:300, marginTop:4 }}>{s.duration} min</div>
        {s.addon && <div style={{ fontSize:11, color:"var(--gold)", marginTop:4 }}>+ {s.addon.title} available as add-on</div>}
      </div>
      <div style={{ fontSize:17, fontWeight:600, color:"var(--gold)" }}>£{s.price}</div>
    </div>
  );
}

export function ServiceGroup({ services, selectedId, onSelect }) {
  return (
    <>
      {services.map(s => <SvcItem key={s.id} s={s} picked={selectedId === s.id} onSelect={onSelect}/>)}
    </>
  );
}
