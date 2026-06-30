// src/Dashboard.jsx — Staff-facing portal
// Login, Bookings (week view calendar), My Services, My Schedule

import React, { useState, useEffect, useRef } from "react";
import { supabase, SUPABASE_URL, IS_DEMO } from "./supabase.js";
import {
  DEMO_PRACTITIONERS, DEMO_SERVICES_LIST,
  getDaysInMonth, getMonthName, getDayName, dateStr,
useAvailableSlots, SvcItem, ClampedDescription,
} from "./shared.jsx";

// ============================================================
// SERVICE FORM
// ============================================================

function ServiceForm({ practitionerId, token, existingService, existingGroups, onSave, onCancel }) {
  const [title, setTitle] = useState(existingService?.title || "");
  const [description, setDescription] = useState(existingService?.description || "");
  const [duration, setDuration] = useState(existingService?.duration?.toString() || "");
  const [price, setPrice] = useState(existingService?.price?.toString() || "");
  const [groupName, setGroupName] = useState(existingService?.group_name || "");
  const [newGroupName, setNewGroupName] = useState("");
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [addons, setAddons] = useState(
    (existingService?.addons || []).map(a => ({
      id: a.id,
      title: a.title || "",
      duration: a.duration?.toString() || "",
      price: a.price?.toString() || "",
    }))
  );
  const [saving, setSaving] = useState(false);
  const finalGroupName = showNewGroup ? newGroupName : groupName;

  function addAddon() { setAddons(prev => [...prev, { title: "", duration: "15", price: "" }]); }
  function updateAddon(i, field, val) { setAddons(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: val } : a)); }
  function removeAddon(i) { setAddons(prev => prev.filter((_, idx) => idx !== i)); }

  async function handleSave() {
    if (!title || !duration || !price) return;
    setSaving(true);
    try {
      let serviceId = existingService?.id;
      if (existingService) {
        await supabase.update("custom_services",
          { title, description, duration: parseInt(duration), price: parseFloat(price), group_name: finalGroupName || null },
          "id=eq." + existingService.id, token);
      } else {
        const res = await supabase.insert("custom_services", {
          practitioner_id: practitionerId, title, description,
          duration: parseInt(duration), price: parseFloat(price), group_name: finalGroupName || null,
        }, token);
        serviceId = res[0].id;
      }
      // Replace all add-ons: wipe existing, then insert the current valid list.
      // Add-on IDs aren't referenced anywhere persistent (bookings store service_title as text),
      // so a clean replace is the simplest correct way to handle add/edit/remove together.
      if (existingService) {
        await fetch(SUPABASE_URL + "/rest/v1/custom_service_addons?service_id=eq." + serviceId, {
          method: "DELETE", headers: supabase.headers(token),
        });
      }
      const validAddons = addons.filter(a => a.title && a.duration && a.price);
      if (validAddons.length > 0) {
        await supabase.insert("custom_service_addons",
          validAddons.map(a => ({
            service_id: serviceId, title: a.title,
            duration: parseInt(a.duration), price: parseFloat(a.price),
          })), token);
      }
      onSave();
    } catch (e) { console.error(e); alert("Error saving service. Please try again."); }
    setSaving(false);
  }

  return (
    <div style={{ padding: "28px", background: "var(--cream)", border: "1.5px solid var(--border)", marginBottom: 12 }}>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 400, marginBottom: 24 }}>
        {existingService ? "Edit service" : "Add a service"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label className="nn-input-label">Group (optional)</label>
          {!showNewGroup ? (
            <div style={{ display: "flex", gap: 8 }}>
              <select value={groupName} onChange={e => setGroupName(e.target.value)}
                style={{ flex: 1, minWidth: 0, padding: "10px 12px", border: "1.5px solid var(--border)", background: "var(--warm-white)", fontFamily: "'Outfit',sans-serif", fontSize: 14, outline: "none", color: "var(--charcoal)", cursor: "pointer" }}>
                <option value="">No group</option>
                {existingGroups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <button onClick={() => { setShowNewGroup(true); setGroupName(""); }}
                style={{ padding: "10px 12px", background: "none", border: "1.5px solid var(--border)", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", color: "var(--charcoal)", whiteSpace: "nowrap", flexShrink: 0 }}>
                + New
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <input className="nn-input" type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="e.g. BIAB Manicure" style={{ flex: 1 }} />
              <button onClick={() => { setShowNewGroup(false); setNewGroupName(""); }}
                style={{ padding: "14px 20px", background: "none", border: "1.5px solid var(--border)", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, color: "var(--warm-gray)" }}>
                Cancel
              </button>
            </div>
          )}
        </div>
        <div><label className="nn-input-label">Service Title</label><input className="nn-input" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. BIAB Overlay" /></div>
        <div>
          <label className="nn-input-label">Description (optional)</label>
          <textarea className="nn-input" value={description} onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Includes removal of previous set. Press Enter for a new line."
            rows={4} style={{ resize: "vertical", minHeight: 90, lineHeight: 1.6, fontFamily: "'Outfit',sans-serif" }} />
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ flex: 1 }}><label className="nn-input-label">Duration (minutes)</label><input className="nn-input" type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="45" /></div>
          <div style={{ flex: 1 }}><label className="nn-input-label">Price (£)</label><input className="nn-input" type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="30" /></div>
        </div>

        {/* Add-ons */}
        <div style={{ padding: "16px 20px", background: "var(--warm-white)", border: "1px solid var(--border)" }}>
          <div style={{ marginBottom: addons.length ? 16 : 12 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Optional add-ons</div>
            <div style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300, marginTop: 2 }}>e.g. Nail Art, Brow Tint — clients can pick any of these</div>
          </div>
          {addons.map((a, i) => (
            <div key={a.id ?? i} style={{ padding: "14px 16px", background: "var(--cream)", border: "1px solid var(--border)", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--warm-gray)" }}>Add-on {i + 1}</div>
                <button onClick={() => removeAddon(i)} style={{ padding: "4px 10px", background: "none", color: "var(--red)", border: "1px solid var(--red)", cursor: "pointer", fontSize: 10, fontWeight: 600, letterSpacing: .5, textTransform: "uppercase", fontFamily: "'Outfit',sans-serif" }}>Remove</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div><label className="nn-input-label">Title</label><input className="nn-input" type="text" value={a.title} onChange={e => updateAddon(i, "title", e.target.value)} placeholder="e.g. Nail Art" /></div>
                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ flex: 1 }}><label className="nn-input-label">Duration (minutes)</label><input className="nn-input" type="number" value={a.duration} onChange={e => updateAddon(i, "duration", e.target.value)} placeholder="15" /></div>
                  <div style={{ flex: 1 }}><label className="nn-input-label">Price (£)</label><input className="nn-input" type="number" value={a.price} onChange={e => updateAddon(i, "price", e.target.value)} placeholder="10" /></div>
                </div>
              </div>
            </div>
          ))}
          <button onClick={addAddon} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "none", border: "1.5px dashed var(--border)", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, color: "var(--charcoal)", width: "100%" }}>
            <span style={{ fontSize: 16, color: "var(--gold)", lineHeight: 1 }}>+</span>{addons.length ? "Add another add-on" : "Add an add-on"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button onClick={onCancel} className="nn-btn-back">Cancel</button>
          <button onClick={handleSave} disabled={!title || !duration || !price || saving}
            style={{ padding: "14px 32px", background: "var(--charcoal)", color: "var(--cream)", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: "2px", textTransform: "uppercase", opacity: title && duration && price && !saving ? 1 : .35 }}>
            {saving ? "Saving..." : existingService ? "Save Changes" : "Add Service"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SERVICE CARD
// ============================================================

function ServiceCard({ svc, onEdit, onRemove }) {
  return (
    <div style={{ padding: "18px 20px", background: "var(--warm-white)", border: "1.5px solid var(--border)", marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 16 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500, fontSize: 14 }}>{svc.title}</div>
{svc.description && <ClampedDescription text={svc.description} />}
        <div style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300, marginTop: 4 }}>{svc.duration} min · £{svc.price}</div>
        {svc.addons?.length > 0 && svc.addons.map(a => (
          <div key={a.id} style={{ marginTop: 8, padding: "8px 12px", background: "var(--cream)", border: "1px solid var(--border)", fontSize: 12 }}>
            <span style={{ color: "var(--gold)", fontWeight: 500 }}>+ Add-on: </span>
            {a.title} · {a.duration} min · £{a.price}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button onClick={onEdit} style={{ padding: "6px 14px", background: "none", color: "var(--charcoal)", border: "1px solid var(--border)", cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: .5, textTransform: "uppercase", fontFamily: "'Outfit',sans-serif" }}>Edit</button>
        <button onClick={onRemove} style={{ padding: "6px 14px", background: "none", color: "var(--red)", border: "1px solid var(--red)", cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: .5, textTransform: "uppercase", fontFamily: "'Outfit',sans-serif" }}>Remove</button>
      </div>
    </div>
  );
}

// ============================================================
// WAITLIST BOOKING FORM — place a waitlisted client into a slot
// Option B: no service selection — the waitlist entry already carries
// service_title, duration, price. Practitioner only picks date & time.
// On success: insert booking (booked_by 'staff'), delete waitlist entry.
// ============================================================

function WaitlistBookingForm({ prac, entry, token, onDone, onCancel }) {
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [manualTime, setManualTime] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const now = new Date();
  const [cM, setCM] = useState(now.getMonth());
  const [cY, setCY] = useState(now.getFullYear());

  const duration = entry.duration || 30;
  const { slots, loading: slotsLoading } = useAvailableSlots(prac?.id, date, duration, prac?.slot_interval || 30, 0);

  const [bookAvail, setBookAvail] = useState({ unavailable: new Set(), blocked: [], overrides: [] });
  useEffect(() => {
    if (!prac || IS_DEMO) { setBookAvail({ unavailable: new Set(), blocked: [], overrides: [] }); return; }
    const todayStr = new Date().toISOString().split("T")[0];
    Promise.all([
      supabase.query("availability", { filters: "&practitioner_id=eq." + prac.id + "&is_available=eq.false", token }),
      supabase.query("blocked_dates", { select: "blocked_date", filters: "&practitioner_id=eq." + prac.id + "&blocked_date=gte." + todayStr + "&start_time=is.null", token }),
      supabase.query("date_overrides", { select: "override_date", filters: "&practitioner_id=eq." + prac.id + "&override_date=gte." + todayStr, token }),
    ]).then(([avail, blocked, overrides]) => {
      setBookAvail({
        unavailable: new Set(avail.map(r => [1,2,3,4,5,6,0][r.day_of_week])),
        blocked: blocked.map(b => b.blocked_date),
        overrides: overrides.map(o => o.override_date),
      });
    }).catch(() => setBookAvail({ unavailable: new Set(), blocked: [], overrides: [] }));
  }, [prac, token]);

  const [slotCounts, setSlotCounts] = useState({});
  useEffect(() => {
    if (!prac || IS_DEMO) { setSlotCounts({}); return; }
    supabase.rpc("get_monthly_slot_counts", {
      p_practitioner_id: prac.id,
      p_year: cY,
      p_month: cM + 1,
      p_duration: duration,
      p_interval: prac.slot_interval || 30,
    }).then(rows => {
      const map = {};
      rows.forEach(r => { map[r.slot_date] = r.slot_count; });
      setSlotCounts(map);
    }).catch(() => setSlotCounts({}));
  }, [prac, cM, cY, duration]);

  async function handleSave() {
    if (!date || !time) return;
    setSaving(true);
    try {
      if (IS_DEMO) { setDone(true); setSaving(false); return; }
      // Insert FIRST — only delete the waitlist entry if the booking succeeds.
      await supabase.insert("bookings", {
        practitioner_id: prac.id,
        service_id: entry.service_id || null,
        service_title: entry.service_title || "Appointment",
        client_name: entry.client_name,
        client_phone: entry.client_phone,
        client_email: entry.client_email,
        booking_date: dateStr(date.year, date.month, date.day),
        booking_time: time + ":00",
        duration: duration,
        price: entry.price || 0,
        booked_by: "staff",
        notes: "Booked from waitlist",
      }, token);
      // Now safe to remove from waitlist
      const delRes = await fetch(SUPABASE_URL + "/rest/v1/waitlist?id=eq." + entry.id, {
        method: "DELETE", headers: supabase.headers(token),
      });
      if (!delRes.ok) throw new Error(await delRes.text());
      setDone(true);
    } catch (e) {
      console.error(e);
      alert("Error creating booking. The client is still on the waitlist. Please try again.");
    }
    setSaving(false);
  }

  if (done) {
    return (
      <div style={{ maxWidth: 500, padding: "48px 0" }}>
        <div className="nn-success-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg></div>
        <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 300, textAlign: "center", marginBottom: 10 }}>Booked in</h3>
        <p style={{ textAlign: "center", color: "var(--warm-gray)", fontSize: 14, fontWeight: 300, lineHeight: 1.6, marginBottom: 32 }}>
          {entry.client_name} is booked in for {entry.service_title || "their appointment"} on {getDayName(date.year, date.month, date.day)} {date.day} {getMonthName(date.month)} at {time}, and has been removed from the waitlist. A confirmation email has been sent to them.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={onDone} style={{ padding: "14px 32px", background: "var(--charcoal)", color: "var(--cream)", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: "2px", textTransform: "uppercase" }}>Back to Bookings</button>
        </div>
      </div>
    );
  }

  const H3 = ({ children }) => <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 400, marginBottom: 20 }}>{children}</h3>;

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 300 }}>Book from waitlist</div>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--warm-gray)", fontFamily: "'Outfit',sans-serif" }}>✕ Cancel</button>
      </div>

      <div style={{ background: "var(--cream)", border: "1.5px solid var(--border)", padding: "16px 20px", marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", color: "var(--warm-gray)", marginBottom: 12 }}>Placing this client</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 500 }}>{entry.client_name}</div>
            <div style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300, marginTop: 2 }}>{entry.service_title || "Appointment"} · {duration} min</div>
            <div style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300, marginTop: 2 }}>{entry.client_phone}{entry.client_email ? " · " + entry.client_email : ""}</div>
          </div>
          {entry.price ? <span style={{ fontWeight: 600, color: "var(--gold)" }}>£{entry.price}</span> : null}
        </div>
      </div>

      <H3>Pick a date &amp; time</H3>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", background: "var(--cream)", border: "1.5px solid var(--border)", marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Custom time</div>
          <div style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300, marginTop: 2 }}>Override hours, book any day, allow overlaps</div>
        </div>
        <button onClick={() => { setManualTime(o => !o); setTime(null); }}
          style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: manualTime ? "var(--charcoal)" : "var(--border)", position: "relative", transition: "background .2s", flexShrink: 0 }}>
          <span style={{ position: "absolute", top: 3, left: manualTime ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s", display: "block" }} />
        </button>
      </div>
      <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
        <div className="nn-cal">
          <div className="nn-cal-head">
            <button className="nn-cal-btn" onClick={() => { if (cM === 0) { setCM(11); setCY(cY - 1); } else setCM(cM - 1); }}>‹</button>
            <h3>{getMonthName(cM)} {cY}</h3>
            <button className="nn-cal-btn" onClick={() => { if (cM === 11) { setCM(0); setCY(cY + 1); } else setCM(cM + 1); }}>›</button>
          </div>
          <div className="nn-cal-weekdays">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => <span key={d}>{d}</span>)}</div>
          <div className="nn-cal-days">
            {(() => {
              const first = (new Date(cY, cM, 1).getDay() + 6) % 7;
              const total = getDaysInMonth(cY, cM);
              const cells = [];
              for (let i = 0; i < first; i++) cells.push(<div className="nn-cal-day nil" key={"e" + i} />);
              for (let d = 1; d <= total; d++) {
                const isNow = d === now.getDate() && cM === now.getMonth() && cY === now.getFullYear();
                const past = new Date(cY, cM, d) < new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const jsDay = new Date(cY, cM, d).getDay();
                const ds = dateStr(cY, cM, d);
                const unavail = bookAvail.unavailable.has(jsDay);
                const blocked = bookAvail.blocked.includes(ds);
                const hasOverride = bookAvail.overrides.includes(ds);
                const disabled = manualTime ? past : (past || blocked || (unavail && !hasOverride));
                const sel = date && date.day === d && date.month === cM && date.year === cY;
                const count = slotCounts[ds];
                const dotColor = (disabled || manualTime) ? null
                  : count === undefined ? null
                  : count === 0 ? "var(--red)"
                  : count <= 3 ? "#C9963E"
                  : "var(--green)";
                cells.push(
                  <button key={d}
                    className={"nn-cal-day" + (sel ? " on" : "") + (disabled ? " off" : "") + (isNow ? " now" : "")}
                    onClick={() => { if (!disabled) { setDate({ day: d, month: cM, year: cY }); setTime(null); } }}
                    disabled={disabled}>
                    <span style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, lineHeight: 1, width: "100%" }}>
                      <span>{d}</span>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: dotColor || "transparent" }} />
                    </span>
                  </button>
                );
              }
              return cells;
            })()}
          </div>
        </div>
        {date && (
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 14, color: "var(--warm-gray)", marginBottom: 14, fontWeight: 300 }}>
              {getDayName(date.year, date.month, date.day)} {date.day} {getMonthName(date.month)}
            </div>
            {manualTime ? (
              <div>
                <input type="time" value={time || ""} onChange={e => setTime(e.target.value || null)}
                  style={{ padding: "12px 16px", border: "1.5px solid var(--border)", background: "var(--warm-white)", fontFamily: "'Outfit',sans-serif", fontSize: 15, outline: "none", width: "100%" }} />
                <div style={{ fontSize: 12, color: "var(--gold)", fontWeight: 300, marginTop: 10, lineHeight: 1.6 }}>
                  Manual time — availability and clashes aren't checked. {duration} min from the time you set.
                </div>
              </div>
            ) : slotsLoading ? (
              <div style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300 }}>Loading times...</div>
            ) : slots.length === 0 ? (
              <div style={{ color: "var(--red)", fontSize: 14, fontWeight: 300 }}>No available slots. Try another day, or switch on Custom time.</div>
            ) : (
              <div className="nn-times">{slots.map(t => <button key={t} className={"nn-time" + (time === t ? " on" : "")} onClick={() => setTime(t)}>{t}</button>)}</div>
            )}
          </div>
        )}
      </div>
      <div className="nn-booking-nav">
        <button className="nn-btn-back" onClick={onCancel}>Cancel</button>
        <button className="nn-btn nn-btn-gold" onClick={handleSave} disabled={!date || !time || saving} style={{ opacity: date && time && !saving ? 1 : .35 }}>
          {saving ? "Booking..." : "Confirm Booking"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// STAFF BOOKING FORM
// ============================================================

function StaffBookingForm({ prac, services, token, onDone, onCancel }) {
  // stage: "service" | "addons" | "cart" | "date" | "details"
  const [stage, setStage] = useState("service");
  const [cart, setCart] = useState([]);              // [{ uid, service, addons }]
  const [draft, setDraft] = useState(null);          // service being configured
  const [draftAddons, setDraftAddons] = useState([]);
  const uidRef = useRef(0);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [manualTime, setManualTime] = useState(false);
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const now = new Date();
  const [cM, setCM] = useState(now.getMonth());
  const [cY, setCY] = useState(now.getFullYear());

  // Cart-wide totals (each item = service + its add-ons)
  const itemDuration = (it) => it.service.duration + it.addons.reduce((s, a) => s + a.duration, 0);
  const itemPrice = (it) => it.service.price + it.addons.reduce((s, a) => s + a.price, 0);
  const totalDuration = cart.reduce((s, it) => s + itemDuration(it), 0);
  const totalPrice = cart.reduce((s, it) => s + itemPrice(it), 0);
  const serviceTitle = cart.map(it => it.service.title + (it.addons.length ? " + " + it.addons.map(a => a.title).join(" + ") : "")).join(" + ");

  const { slots, loading: slotsLoading } = useAvailableSlots(prac?.id, date, totalDuration, prac?.slot_interval || 30, 0);

  const [bookAvail, setBookAvail] = useState({ unavailable: new Set(), blocked: [], overrides: [] });
  useEffect(() => {
    if (!prac || IS_DEMO) { setBookAvail({ unavailable: new Set(), blocked: [], overrides: [] }); return; }
    const todayStr = new Date().toISOString().split("T")[0];
    Promise.all([
      supabase.query("availability", { filters: "&practitioner_id=eq." + prac.id + "&is_available=eq.false", token }),
      supabase.query("blocked_dates", { select: "blocked_date", filters: "&practitioner_id=eq." + prac.id + "&blocked_date=gte." + todayStr + "&start_time=is.null", token }),
      supabase.query("date_overrides", { select: "override_date", filters: "&practitioner_id=eq." + prac.id + "&override_date=gte." + todayStr, token }),
    ]).then(([avail, blocked, overrides]) => {
      setBookAvail({
        unavailable: new Set(avail.map(r => [1,2,3,4,5,6,0][r.day_of_week])),
        blocked: blocked.map(b => b.blocked_date),
        overrides: overrides.map(o => o.override_date),
      });
}).catch(() => setBookAvail({ unavailable: new Set(), blocked: [], overrides: [] }));
  }, [prac, token]);

  const [slotCounts, setSlotCounts] = useState({});
  useEffect(() => {
    if (!prac || stage !== "date" || IS_DEMO) { setSlotCounts({}); return; }
    supabase.rpc("get_monthly_slot_counts", {
      p_practitioner_id: prac.id,
      p_year: cY,
      p_month: cM + 1,
      p_duration: totalDuration || 30,
      p_interval: prac.slot_interval || 30,
    }).then(rows => {
      const map = {};
      rows.forEach(r => { map[r.slot_date] = r.slot_count; });
      setSlotCounts(map);
    }).catch(() => setSlotCounts({}));
  }, [prac, cM, cY, stage, totalDuration]);

  const groups = [...new Set(services.filter(s => s.group_name).map(s => s.group_name))];
  const ungrouped = services.filter(s => !s.group_name);

  function handleSelectService(s) {
    if (s.addons?.length > 0) {
      setDraft(s); setDraftAddons([]); setStage("addons");
    } else {
      setCart(prev => [...prev, { uid: uidRef.current++, service: s, addons: [] }]);
      setStage("cart");
    }
  }
  function toggleDraftAddon(a) {
    setDraftAddons(prev => prev.some(x => x.id === a.id) ? prev.filter(x => x.id !== a.id) : [...prev, a]);
  }
  function commitDraft() {
    setCart(prev => [...prev, { uid: uidRef.current++, service: draft, addons: draftAddons }]);
    setDraft(null); setDraftAddons([]);
    setStage("cart");
  }
  function removeCartItem(uid) {
    setCart(prev => {
      const next = prev.filter(it => it.uid !== uid);
      if (next.length === 0) setStage("service");
      return next;
    });
    setDate(null); setTime(null);
  }
  function goAddAnother() { setDate(null); setTime(null); setStage("service"); }

  async function handleSave() {
    if (!cart.length || !date || !time || !clientName || !phone) return;
    setSaving(true);
    try {
      if (IS_DEMO) { setDone(true); setSaving(false); return; }
      const allAddons = cart.flatMap(it => it.addons.map(a => a.title));
      await supabase.insert("bookings", {
        practitioner_id: prac.id,
        service_id: cart[0]?.service.id,
        service_title: serviceTitle,
        client_name: clientName,
        client_phone: phone,
        client_email: email,
        booking_date: dateStr(date.year, date.month, date.day),
        booking_time: time + ":00",
        duration: totalDuration,
        price: totalPrice,
        booked_by: "staff",
        notes: (allAddons.length ? "Add-ons: " + allAddons.join(", ") + ". " : "") + (notes || ""),
      }, token);
      setDone(true);
    } catch (e) { console.error(e); alert("Error creating booking. Please try again."); }
    setSaving(false);
  }

  if (done) {
    return (
      <div style={{ maxWidth: 500, padding: "48px 0" }}>
        <div className="nn-success-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg></div>
        <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 300, textAlign: "center", marginBottom: 10 }}>Booking added</h3>
        <p style={{ textAlign: "center", color: "var(--warm-gray)", fontSize: 14, fontWeight: 300, lineHeight: 1.6, marginBottom: 32 }}>
          {clientName} is booked in for {serviceTitle} on {getDayName(date.year, date.month, date.day)} {date.day} {getMonthName(date.month)} at {time}.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={onDone} style={{ padding: "14px 32px", background: "var(--charcoal)", color: "var(--cream)", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: "2px", textTransform: "uppercase" }}>Back to Bookings</button>
        </div>
      </div>
    );
  }

  const H3 = ({ children }) => <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 400, marginBottom: 20 }}>{children}</h3>;

  const CartSummary = ({ editable = false }) => (
    <div style={{ background: "var(--cream)", border: "1.5px solid var(--border)", padding: "16px 20px", marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", color: "var(--warm-gray)", marginBottom: 12 }}>This booking</div>
      {cart.map(it => (
        <div key={it.uid} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 14, gap: 12 }}>
          <div>
            <div style={{ fontWeight: 500 }}>{it.service.title}</div>
            {it.addons.length > 0 && <div style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300, marginTop: 2 }}>+ {it.addons.map(a => a.title).join(", ")}</div>}
            <div style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300, marginTop: 2 }}>{itemDuration(it)} min</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <span style={{ fontWeight: 600, color: "var(--gold)" }}>£{itemPrice(it)}</span>
            {editable && (
              <button onClick={() => removeCartItem(it.uid)} aria-label="Remove"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--warm-gray)", fontSize: 16, lineHeight: 1, padding: 2 }}>✕</button>
            )}
          </div>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, fontSize: 14 }}>
        <span style={{ fontWeight: 500 }}>Total · {totalDuration} min</span>
        <span style={{ fontWeight: 600, color: "var(--gold)" }}>£{totalPrice}</span>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 300 }}>Add a booking</div>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--warm-gray)", fontFamily: "'Outfit',sans-serif" }}>✕ Cancel</button>
      </div>

      {stage === "service" && (
        <div>
          <H3>{cart.length > 0 ? "Add another service" : "Select a service"}</H3>
          {services.length === 0 ? (
            <div style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300, padding: "20px 0" }}>No services set up yet. Add services in the "My Services" tab first.</div>
          ) : (
            <div>
              {groups.map(group => (
                <div key={group} style={{ marginBottom: 24 }}>
                  <div className="nn-svc-group-label">{group}</div>
                  {services.filter(s => s.group_name === group).map(s => (
                    <SvcItem key={s.id} s={s} picked={false} onSelect={() => handleSelectService(s)} />
                  ))}
                </div>
              ))}
              {ungrouped.length > 0 && (
                <div>
                  {groups.length > 0 && <div className="nn-svc-group-label">Other</div>}
                  {ungrouped.map(s => (
                    <SvcItem key={s.id} s={s} picked={false} onSelect={() => handleSelectService(s)} />
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="nn-booking-nav">
            <button className="nn-btn-back" onClick={() => cart.length > 0 ? setStage("cart") : onCancel()}>{cart.length > 0 ? "Back" : "Cancel"}</button>
          </div>
        </div>
      )}

      {stage === "addons" && draft && (
        <div>
          <H3>Add anything to {draft.title}?</H3>
          <p style={{ fontSize: 13, color: "var(--warm-gray)", fontWeight: 300, marginBottom: 24, lineHeight: 1.7 }}>Optional extras. Tap any that apply.</p>
          {draft.addons.map(a => {
            const on = draftAddons.some(x => x.id === a.id);
            return (
              <div key={a.id} className={"nn-svc-item" + (on ? " picked" : "")} onClick={() => toggleDraftAddon(a)} style={{ marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{on ? "✓ " : ""}{a.title}</div>
                  <div style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300 }}>{a.duration} min extra</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--gold)" }}>+£{a.price}</div>
              </div>
            );
          })}
          <div className="nn-booking-nav">
            <button className="nn-btn-back" onClick={() => { setDraft(null); setDraftAddons([]); setStage("service"); }}>Back</button>
            <button className="nn-btn nn-btn-dark" onClick={commitDraft}>Add to Booking</button>
          </div>
        </div>
      )}

      {stage === "cart" && (
        <div>
          <H3>Booking so far</H3>
          <CartSummary editable />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button className="nn-btn nn-btn-outline" onClick={goAddAnother} style={{ width: "100%", justifyContent: "center" }}>+ Add another service</button>
            <button className="nn-btn nn-btn-dark" onClick={() => setStage("date")} disabled={cart.length === 0} style={{ width: "100%", opacity: cart.length ? 1 : .35 }}>Continue to Date &amp; Time</button>
          </div>
        </div>
      )}

      {stage === "date" && (
        <div>
          <H3>Pick a date &amp; time</H3>
          <CartSummary />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", background: "var(--cream)", border: "1.5px solid var(--border)", marginBottom: 20, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Custom time</div>
              <div style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300, marginTop: 2 }}>Override hours, book any day, allow overlaps</div>
            </div>
            <button onClick={() => { setManualTime(o => !o); setTime(null); }}
              style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: manualTime ? "var(--charcoal)" : "var(--border)", position: "relative", transition: "background .2s", flexShrink: 0 }}>
              <span style={{ position: "absolute", top: 3, left: manualTime ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s", display: "block" }} />
            </button>
          </div>
          <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
            <div className="nn-cal">
              <div className="nn-cal-head">
                <button className="nn-cal-btn" onClick={() => { if (cM === 0) { setCM(11); setCY(cY - 1); } else setCM(cM - 1); }}>‹</button>
                <h3>{getMonthName(cM)} {cY}</h3>
                <button className="nn-cal-btn" onClick={() => { if (cM === 11) { setCM(0); setCY(cY + 1); } else setCM(cM + 1); }}>›</button>
              </div>
              <div className="nn-cal-weekdays">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => <span key={d}>{d}</span>)}</div>
              <div className="nn-cal-days">
                {(() => {
                  const first = (new Date(cY, cM, 1).getDay() + 6) % 7;
                  const total = getDaysInMonth(cY, cM);
                  const cells = [];
                  for (let i = 0; i < first; i++) cells.push(<div className="nn-cal-day nil" key={"e" + i} />);
                  for (let d = 1; d <= total; d++) {
                    const isNow = d === now.getDate() && cM === now.getMonth() && cY === now.getFullYear();
                    const past = new Date(cY, cM, d) < new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const jsDay = new Date(cY, cM, d).getDay();
                    const ds = dateStr(cY, cM, d);
                    const unavail = bookAvail.unavailable.has(jsDay);
                    const blocked = bookAvail.blocked.includes(ds);
                    const hasOverride = bookAvail.overrides.includes(ds);
                    const disabled = manualTime ? past : (past || blocked || (unavail && !hasOverride));
                    const sel = date && date.day === d && date.month === cM && date.year === cY;
                    const count = slotCounts[ds];
                    const dotColor = (disabled || manualTime) ? null
                      : count === undefined ? null
                      : count === 0 ? "var(--red)"
                      : count <= 3 ? "#C9963E"
                      : "var(--green)";
                    cells.push(
                      <button key={d}
                        className={"nn-cal-day" + (sel ? " on" : "") + (disabled ? " off" : "") + (isNow ? " now" : "")}
                        onClick={() => { if (!disabled) { setDate({ day: d, month: cM, year: cY }); setTime(null); } }}
                        disabled={disabled}>
                        <span style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, lineHeight: 1, width: "100%" }}>
                          <span>{d}</span>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: dotColor || "transparent" }} />
                        </span>
                      </button>
                    );
                  }
                  return cells;
                })()}
              </div>
            </div>
            {date && (
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 14, color: "var(--warm-gray)", marginBottom: 14, fontWeight: 300 }}>
                  {getDayName(date.year, date.month, date.day)} {date.day} {getMonthName(date.month)}
                </div>
                {manualTime ? (
                  <div>
                    <input type="time" value={time || ""} onChange={e => setTime(e.target.value || null)}
                      style={{ padding: "12px 16px", border: "1.5px solid var(--border)", background: "var(--warm-white)", fontFamily: "'Outfit',sans-serif", fontSize: 15, outline: "none", width: "100%" }} />
                    <div style={{ fontSize: 12, color: "var(--gold)", fontWeight: 300, marginTop: 10, lineHeight: 1.6 }}>
                      Manual time — availability and clashes aren't checked. {totalDuration} min from the time you set.
                    </div>
                  </div>
                ) : slotsLoading ? (
                  <div style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300 }}>Loading times...</div>
                ) : slots.length === 0 ? (
                  <div style={{ color: "var(--red)", fontSize: 14, fontWeight: 300 }}>No available slots. Try another day, or switch on Custom time.</div>
                ) : (
                  <div className="nn-times">{slots.map(t => <button key={t} className={"nn-time" + (time === t ? " on" : "")} onClick={() => setTime(t)}>{t}</button>)}</div>
                )}
              </div>
            )}
          </div>
          <div className="nn-booking-nav">
            <button className="nn-btn-back" onClick={() => setStage("cart")}>Back</button>
            <button className="nn-btn nn-btn-dark" onClick={() => setStage("details")} disabled={!date || !time} style={{ opacity: date && time ? 1 : .35 }}>Continue</button>
          </div>
        </div>
      )}

      {stage === "details" && (
        <div>
          <H3>Client details</H3>
          <div style={{ background: "var(--cream)", border: "1px solid var(--border)", padding: 32, marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: 14 }}>
              <span style={{ color: "var(--warm-gray)", fontWeight: 300 }}>Service</span>
              <span style={{ fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>{serviceTitle}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: 14 }}>
              <span style={{ color: "var(--warm-gray)", fontWeight: 300 }}>Date &amp; Time</span>
              <span style={{ fontWeight: 500 }}>{getDayName(date.year, date.month, date.day)} {date.day} {getMonthName(date.month)} at {time}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: 14 }}>
              <span style={{ color: "var(--warm-gray)", fontWeight: 300 }}>Duration</span>
              <span style={{ fontWeight: 500 }}>{totalDuration} min</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: 14 }}>
              <span style={{ color: "var(--warm-gray)", fontWeight: 300 }}>Price</span>
              <span style={{ fontWeight: 600, color: "var(--gold)" }}>£{totalPrice}</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div><label className="nn-input-label">Client Name</label><input className="nn-input" type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Full name" /></div>
            <div><label className="nn-input-label">Phone Number</label><input className="nn-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="07xxx xxxxxx" /></div>
            <div><label className="nn-input-label">Email (optional)</label><input className="nn-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="client@email.com" /></div>
            <div><label className="nn-input-label">Notes (optional)</label><input className="nn-input" type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Walk-in, prefers short nails" /></div>
          </div>
          <div className="nn-booking-nav">
            <button className="nn-btn-back" onClick={() => setStage("date")}>Back</button>
            <button className="nn-btn nn-btn-gold" onClick={handleSave} disabled={!clientName || !phone || saving} style={{ opacity: clientName && phone && !saving ? 1 : .35 }}>
              {saving ? "Saving..." : "Confirm Booking"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// WEEK VIEW CALENDAR
// ============================================================

const HOUR_START = 7;
const HOUR_END = 22;
const SLOT_H = 32;
const TOTAL_SLOTS = (HOUR_END - HOUR_START) * 2;

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function fmtShortDate(date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function WeekView({ bookings, loading, prac, token, blocks = [], onAddBooking, onStatusChange, onReschedule, onUpdateDetails }) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [sheet, setSheet] = useState(null);
  const [sheetMode, setSheetMode] = useState("detail");
  const [clientHistory, setClientHistory] = useState(null);
  const [clientHistoryLoading, setClientHistoryLoading] = useState(false);
  const [nowTop, setNowTop] = useState(null);
  const [nowDayIdx, setNowDayIdx] = useState(null);
  const datePickerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [drag, setDrag] = useState(null);
  const [dragConfirm, setDragConfirm] = useState(null);
  const [dragSaving, setDragSaving] = useState(false);
  const [invalidFlash, setInvalidFlash] = useState(null);
  const longPressRef = useRef(null);
  const dragStateRef = useRef(null);
  const armedRef = useRef(false);
  const flashRef = useRef(null);
  const justDraggedRef = useRef(0);
  const sheetOpenedAtRef = useRef(0);

  function scrollToNow() {
    if (!scrollContainerRef.current) return;
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const startMins = HOUR_START * 60;
    const top = ((mins - startMins) / 30) * SLOT_H;
    const containerHeight = scrollContainerRef.current.clientHeight;
    scrollContainerRef.current.scrollTop = Math.max(0, top - containerHeight / 2);
    const jsDay = now.getDay();
    const dayIdx = jsDay === 0 ? 6 : jsDay - 1;
    const containerWidth = scrollContainerRef.current.clientWidth;
    const totalWidth = Math.max(scrollContainerRef.current.scrollWidth, 560);
    const timeColWidth = 48;
    const dayColWidth = (totalWidth - timeColWidth) / 7;
    const todayLeft = timeColWidth + dayIdx * dayColWidth;
    scrollContainerRef.current.scrollLeft = Math.max(0, todayLeft - containerWidth / 2 + dayColWidth / 2);
  }

  const now = new Date();
  const [editCM, setEditCM] = useState(now.getMonth());
  const [editCY, setEditCY] = useState(now.getFullYear());
  const [editDate, setEditDate] = useState(null);
  const [editTime, setEditTime] = useState(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [detailName, setDetailName] = useState("");
  const [detailPhone, setDetailPhone] = useState("");
  const [detailEmail, setDetailEmail] = useState("");
  const [detailNotes, setDetailNotes] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);

  const { slots: editSlots, loading: editSlotsLoading } = useAvailableSlots(
    sheet?.practitioner_id, editDate, sheet?.duration, prac?.slot_interval || 30, 0
  );

  useEffect(() => {
    function calcNow() {
      const n = new Date();
      const mins = n.getHours() * 60 + n.getMinutes();
      const startMins = HOUR_START * 60;
      const endMins = HOUR_END * 60;
      if (mins < startMins || mins > endMins) { setNowTop(null); return; }
      setNowTop(((mins - startMins) / 30) * SLOT_H);
      const day = n.getDay();
      setNowDayIdx(day === 0 ? 6 : day - 1);
    }
    calcNow();
    const t = setInterval(calcNow, 60000);
    setTimeout(scrollToNow, 150);
    return () => clearInterval(t);
  }, []);

  function openSheet(b) {
  sheetOpenedAtRef.current = Date.now();
  setSheet(b);
  setSheetMode("detail");
  setEditDate(null);
  setEditTime(null);
  setEditCM(now.getMonth());
  setEditCY(now.getFullYear());
  setClientHistory(null);
}

  function closeSheet() {
  if (Date.now() - sheetOpenedAtRef.current < 350) return; // ignore the echo click after open
  setSheet(null);
  setSheetMode("detail");
  setEditDate(null);
  setEditTime(null);
  setRescheduling(false);
  setClientHistory(null);
}

  async function loadClientHistory(booking) {
  if (IS_DEMO) { setClientHistory([]); return; }
  setClientHistoryLoading(true);
  try {
    const today = new Date().toISOString().split("T")[0];
    const rows = await supabase.query("bookings", {
      select: "*",
      filters: "&practitioner_id=eq." + booking.practitioner_id +
               "&client_phone=eq." + encodeURIComponent(booking.client_phone) +
               "&status=eq.confirmed" +
               "&booking_date=gte." + today +
               "&id=neq." + booking.id +
               "&order=booking_date.asc,booking_time.asc",
      token: token,
    });
    setClientHistory(rows);
  } catch (e) {
    console.error(e);
    setClientHistory([]);
  }
  setClientHistoryLoading(false);
}

  async function handleReschedule() {
    if (!editDate || !editTime || !sheet) return;
    setRescheduling(true);
    try {
      await onReschedule(sheet.id, dateStr(editDate.year, editDate.month, editDate.day), editTime + ":00");
      closeSheet();
    } catch (e) {
      console.error(e);
      alert("Error rescheduling. Please try again.");
    }
    setRescheduling(false);
  }
  function startEditDetails() {
    setDetailName(sheet.client_name || "");
    setDetailPhone(sheet.client_phone || "");
    setDetailEmail(sheet.client_email || "");
    setDetailNotes(sheet.notes || "");
    setSheetMode("editDetails");
  }

  async function handleSaveDetails() {
    if (!detailName.trim() || !detailPhone.trim()) return;
    setSavingDetails(true);
    try {
      await onUpdateDetails(sheet.id, {
        client_name: detailName.trim(),
        client_phone: detailPhone.trim(),
        client_email: detailEmail.trim(),
        notes: detailNotes.trim(),
      });
      setSheet(prev => ({ ...prev, client_name: detailName.trim(), client_phone: detailPhone.trim(), client_email: detailEmail.trim(), notes: detailNotes.trim() }));
      setSheetMode("detail");
    } catch (e) {
      console.error(e);
      alert("Error saving details. Please try again.");
    }
    setSavingDetails(false);
  }

  // ── Drag-to-reschedule (long-press lift, same-day vertical move) ──
  const interval = prac?.slot_interval || 30;

  function timeToMins(t) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
  function minsToTime(mins) { return String(Math.floor(mins / 60)).padStart(2, "0") + ":" + String(mins % 60).padStart(2, "0"); }
  function overlapsExisting(startMins, dur, others, dayBlocks) {
    const end = startMins + dur;
    for (const o of others) {
      const os = timeToMins(o.booking_time);
      const oe = os + (o.duration || 30);
      if (startMins < oe && end > os) return true;
    }
    for (const blk of dayBlocks) {
      if (!blk.start_time) return true;
      const bs = timeToMins(blk.start_time);
      const be = timeToMins(blk.end_time);
      if (startMins < be && end > bs) return true;
    }
    return false;
  }

  // Block native scroll ONLY while a booking is actively lifted.
  // Non-passive listener so preventDefault is honoured; armedRef gates it.
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onTouchMove = (ev) => { if (armedRef.current) ev.preventDefault(); };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, []);

  function onChipPointerDown(e, b) {
    if (e.button != null && e.button > 0) return;
    const el = e.currentTarget;
    const { top: originalTop } = bookingStyle(b);
    const ds = b.booking_date;
    const others = (bookingsByDate[ds] || []).filter(x => x.id !== b.id);
    const dayBlocks = blocksByDate[ds] || [];
    dragStateRef.current = {
      booking: b, el, pointerId: e.pointerId,
      startX: e.clientX, startY: e.clientY,
      originalTop, others, dayBlocks,
      moved: false, armed: false, live: null, startT: Date.now(),
    };
    clearTimeout(longPressRef.current);
    longPressRef.current = setTimeout(() => {
      const st = dragStateRef.current;
      if (!st || st.moved || st.booking.id !== b.id) return;
      st.armed = true;
      armedRef.current = true;
      try { st.el.setPointerCapture(st.pointerId); } catch {}
      if (navigator.vibrate) { try { navigator.vibrate(8); } catch {} }
      setDrag({ bookingId: b.id, top: originalTop, targetMins: timeToMins(b.booking_time), valid: true });
    }, 400);
  }

  function onChipPointerMove(e, b) {
    const st = dragStateRef.current;
    if (!st || st.booking.id !== b.id) return;
    const dy = e.clientY - st.startY;
    const dx = e.clientX - st.startX;
    if (!st.armed) {
      // Moved before the long-press fired → it's a scroll, abort the lift.
      if (Math.abs(dy) > 8 || Math.abs(dx) > 8) {
        st.moved = true;
        clearTimeout(longPressRef.current);
      }
      return;
    }
    const dur = st.booking.duration || 30;
    const rawTop = st.originalTop + dy;
    let mins = HOUR_START * 60 + Math.round((rawTop / SLOT_H * 30) / interval) * interval;
    mins = Math.max(HOUR_START * 60, Math.min(HOUR_END * 60 - dur, mins));
    const snappedTop = ((mins - HOUR_START * 60) / 30) * SLOT_H;
    const valid = !overlapsExisting(mins, dur, st.others, st.dayBlocks);
    st.live = { mins, valid };
    setDrag({ bookingId: b.id, top: snappedTop, targetMins: mins, valid });
  }

  function onChipPointerUp(e, b) {
    const st = dragStateRef.current;
    clearTimeout(longPressRef.current);
    if (!st) return;
    try { st.el.releasePointerCapture(st.pointerId); } catch {}
    if (!st.armed) {
      // Tap = small total travel, regardless of jitter Chrome's emulator reports.
      const dx = Math.abs(e.clientX - st.startX);
      const dy = Math.abs(e.clientY - st.startY);
      if (dx < 12 && dy < 12) openSheet(b);
      dragStateRef.current = null;
      return;
    }
    armedRef.current = false;
    justDraggedRef.current = Date.now();
    const live = st.live;
    dragStateRef.current = null;
    setDrag(null);
    if (!live) return;
    const origMins = timeToMins(b.booking_time);
    if (live.mins === origMins) return; // dropped where it started
    if (!live.valid) {
      setInvalidFlash("That overlaps another appointment");
      clearTimeout(flashRef.current);
      flashRef.current = setTimeout(() => setInvalidFlash(null), 1800);
      return;
    }
    const newTime = minsToTime(live.mins);
    setDragConfirm({
      booking: b,
      newDateStr: b.booking_date,
      newTime,
      pendingMins: live.mins,
      label: new Date(b.booking_date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) + " at " + newTime,
    });
  }

  function onChipPointerCancel(e) {
    const st = dragStateRef.current;
    clearTimeout(longPressRef.current);
    armedRef.current = false;
    // A quick tap on mobile often fires pointercancel (not pointerup) because the
    // chip sits in a scrollable area. If it never armed and never moved, treat it as a tap.
    if (st && !st.armed) {
      const dx = e ? Math.abs(e.clientX - st.startX) : 0;
      const dy = e ? Math.abs(e.clientY - st.startY) : 0;
      if (dx < 12 && dy < 12) openSheet(st.booking);
    }
    dragStateRef.current = null;
    setDrag(null);
  }

  async function confirmDragMove() {
    if (!dragConfirm) return;
    setDragSaving(true);
    try {
      await onReschedule(dragConfirm.booking.id, dragConfirm.newDateStr, dragConfirm.newTime + ":00");
      setDragConfirm(null);
    } catch (e) {
      console.error(e);
      alert("Error moving appointment. Please try again.");
    }
    setDragSaving(false);
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekLabel = `${fmtShortDate(weekStart)} – ${fmtShortDate(addDays(weekStart, 6))}`;
  const DAY_NAMES_SHORT = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  const bookingsByDate = {};
  bookings.forEach(b => {
    if (!bookingsByDate[b.booking_date]) bookingsByDate[b.booking_date] = [];
    bookingsByDate[b.booking_date].push(b);
  });
  const blocksByDate = {};
  blocks.forEach(b => {
    if (!blocksByDate[b.blocked_date]) blocksByDate[b.blocked_date] = [];
    blocksByDate[b.blocked_date].push(b);
  });

  function bookingStyle(b) {
    const [h, m] = b.booking_time.split(":").map(Number);
    const offsetMins = h * 60 + m - HOUR_START * 60;
    const top = (offsetMins / 30) * SLOT_H;
    const height = Math.max((b.duration / 30) * SLOT_H - 2, 22);
    return { top, height };
  }

  const timeLabels = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) {
    timeLabels.push({ label: `${h}:00`, top: ((h - HOUR_START) * 2) * SLOT_H });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button className="nn-cal-btn" onClick={() => setWeekStart(d => addDays(d, -7))}>‹</button>
          <span style={{ position: "relative", display: "inline-block" }}>
            <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, fontWeight: 400, display: "block", minWidth: 120, textAlign: "center", textDecoration: "underline dotted", textDecorationColor: "var(--border)", pointerEvents: "none" }}>
              {weekLabel}
            </span>
            <input ref={datePickerRef} type="date"
              style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
              onChange={e => { if (e.target.value) setWeekStart(getWeekStart(new Date(e.target.value + "T12:00:00"))); }} />
          </span>
          <button className="nn-cal-btn" onClick={() => setWeekStart(d => addDays(d, 7))}>›</button>
          <button onClick={() => { setWeekStart(getWeekStart(new Date())); setTimeout(scrollToNow, 150); }}
            style={{ padding: "5px 10px", background: "none", border: "1px solid var(--border)", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: "1px", textTransform: "uppercase", color: "var(--warm-gray)" }}>
            Today
          </button>
        </div>
        <button onClick={onAddBooking} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "var(--charcoal)", color: "var(--cream)", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "1px", textTransform: "uppercase", flexShrink: 0 }}>
          <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Add
        </button>
      </div>

      {loading ? (
        <div style={{ color: "var(--warm-gray)", padding: 40, textAlign: "center" }}>Loading bookings...</div>
      ) : (
        <div ref={scrollContainerRef} style={{ height: "70vh", overflowY: "auto", overflowX: "auto", WebkitOverflowScrolling: "touch", border: "1px solid var(--border)", borderRadius: 2 }}>
          <div style={{ minWidth: 560, userSelect: "none" }}>
            <div style={{ display: "grid", gridTemplateColumns: "48px repeat(7, 1fr)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 10 }}>
              <div style={{ background: "var(--charcoal)" }} />
              {days.map((d, i) => {
                const isToday = d.getTime() === today.getTime();
                return (
                  <div key={i} style={{ background: isToday ? "var(--gold)" : "var(--charcoal)", color: isToday ? "var(--charcoal)" : "var(--cream)", textAlign: "center", padding: "6px 4px", borderLeft: "1px solid rgba(255,255,255,.08)" }}>
                    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "1px" }}>{DAY_NAMES_SHORT[i]}</div>
                    <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, marginTop: 2 }}>{d.getDate()}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "48px repeat(7, 1fr)", position: "relative" }}>
              <div style={{ position: "sticky", left: 0, zIndex: 5, background: "var(--cream)", height: TOTAL_SLOTS * SLOT_H }}>
                {timeLabels.map(({ label, top }) => (
                  <div key={label} style={{ position: "absolute", top: top - 8, right: 6, fontSize: 10, color: "var(--warm-gray)", letterSpacing: ".3px", lineHeight: 1, whiteSpace: "nowrap" }}>{label}</div>
                ))}
              </div>
              {days.map((d, di) => {
                const ds = toDateStr(d);
                const dayBookings = bookingsByDate[ds] || [];
                const isToday = d.getTime() === today.getTime();
                return (
                  <div key={di} style={{ position: "relative", height: TOTAL_SLOTS * SLOT_H, borderLeft: "1px solid var(--border)", background: isToday ? "rgba(201,169,110,.04)" : "transparent" }}>
                    {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => (
                      <div key={i} style={{ position: "absolute", top: i * 2 * SLOT_H, left: 0, right: 0, borderTop: "1px solid var(--border)", pointerEvents: "none" }} />
                    ))}
                    {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                      <div key={"h" + i} style={{ position: "absolute", top: (i * 2 + 1) * SLOT_H, left: 0, right: 0, borderTop: "1px solid rgba(232,226,220,.4)", pointerEvents: "none" }} />
                    ))}
                    {nowDayIdx === di && nowTop !== null && (
                      <div style={{ position: "absolute", left: 0, right: 0, top: nowTop, height: 2, background: "var(--red)", zIndex: 3, pointerEvents: "none" }}>
                        <div style={{ position: "absolute", left: -1, top: -4, width: 8, height: 8, borderRadius: "50%", background: "var(--red)" }} />
                      </div>
                    )}
                    {(blocksByDate[ds] || []).map((blk, bi) => {
                      const full = !blk.start_time;
                      let top = 0, height = TOTAL_SLOTS * SLOT_H;
                      if (!full) {
                        const [sh, sm] = blk.start_time.split(":").map(Number);
                        const [eh, em] = blk.end_time.split(":").map(Number);
                        top = ((sh * 60 + sm - HOUR_START * 60) / 30) * SLOT_H;
                        height = (((eh * 60 + em) - (sh * 60 + sm)) / 30) * SLOT_H;
                      }
                      return (
                        <div key={"blk" + bi} style={{
                          position: "absolute", top, height, left: 0, right: 0,
                          background: "repeating-linear-gradient(45deg, rgba(154,145,138,.13), rgba(154,145,138,.13) 6px, rgba(154,145,138,.06) 6px, rgba(154,145,138,.06) 12px)",
                          borderTop: full ? "none" : "1px solid rgba(154,145,138,.3)",
                          borderBottom: full ? "none" : "1px solid rgba(154,145,138,.3)",
                          zIndex: 1, pointerEvents: "none",
                          display: "flex", alignItems: "flex-start", justifyContent: "center",
                        }}>
                          <span style={{ fontSize: 9, color: "var(--warm-gray)", letterSpacing: ".5px", textTransform: "uppercase", marginTop: 4, fontWeight: 500 }}>
                            {full ? "Blocked" : ""}
                          </span>
                        </div>
                      );
                    })}
                    {dayBookings.map(b => {
                      const base = bookingStyle(b);
                      const isDragging = drag?.bookingId === b.id;
                      const isPending = dragConfirm?.booking.id === b.id;
                      let top = base.top;
                      if (isDragging) top = drag.top;
                      else if (isPending) top = ((dragConfirm.pendingMins - HOUR_START * 60) / 30) * SLOT_H;
                      const height = base.height;
                      const lifted = isDragging || isPending;
                      const valid = isDragging ? drag.valid : true;
                      return (
                        <div key={b.id}
                          onPointerDown={e => onChipPointerDown(e, b)}
                          onPointerMove={e => onChipPointerMove(e, b)}
                          onPointerUp={e => onChipPointerUp(e, b)}
                          onPointerCancel={onChipPointerCancel}
                          onClick={() => {
                            if (dragStateRef.current) return;
                            if (Date.now() - justDraggedRef.current < 600) return;
                            openSheet(b);
                          }}
                          style={{ position: "absolute", top, height, left: 2, right: 2, background: "var(--gold)", borderLeft: "3px solid var(--charcoal)", borderRadius: 2, padding: "3px 6px", cursor: "pointer", overflow: lifted ? "visible" : "hidden", zIndex: lifted ? 20 : 2, boxShadow: isDragging ? "0 8px 24px rgba(44,40,37,.35)" : (isPending ? "0 4px 14px rgba(44,40,37,.22)" : "none"), transform: isDragging ? "scale(1.03)" : "none", opacity: isDragging ? 0.92 : 1, outline: lifted ? (valid ? "2px solid var(--charcoal)" : "2px solid var(--red)") : "none", transition: isDragging ? "none" : "filter .15s", touchAction: "auto" }}
                          onMouseEnter={e => { if (!lifted) e.currentTarget.style.filter = "brightness(.9)"; }}
                          onMouseLeave={e => e.currentTarget.style.filter = "none"}>
                          {isDragging && (
                            <div style={{ position: "absolute", top: -22, left: 0, background: drag.valid ? "var(--charcoal)" : "var(--red)", color: "var(--cream)", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 3, whiteSpace: "nowrap", letterSpacing: ".5px", zIndex: 21 }}>
                              {minsToTime(drag.targetMins)}{!drag.valid ? "  ✕" : ""}
                            </div>
                          )}
                          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--charcoal)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.client_name}</div>
                          {height >= 44 && <div style={{ fontSize: 10, color: "rgba(44,40,37,.65)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 1 }}>{b.service_title || b.service_name || "Service"}</div>}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {invalidFlash && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "var(--red)", color: "#fff", fontSize: 13, fontWeight: 500, padding: "12px 20px", borderRadius: 4, zIndex: 500, boxShadow: "0 4px 16px rgba(0,0,0,.2)" }}>
          {invalidFlash}
        </div>
      )}

      {dragConfirm && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(44,40,37,.4)", zIndex: 400 }} onClick={() => setDragConfirm(null)} />
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--cream)", borderTop: "1px solid var(--border)", borderRadius: "12px 12px 0 0", zIndex: 401, padding: "0 24px 40px", animation: "sheetUp .3s cubic-bezier(.22,1,.36,1)" }}>
            <div style={{ width: 36, height: 4, background: "var(--border)", borderRadius: 2, margin: "14px auto 24px" }} />
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 300, marginBottom: 8 }}>Move appointment?</div>
            <div style={{ fontSize: 14, color: "var(--warm-gray)", fontWeight: 300, lineHeight: 1.6, marginBottom: 28 }}>
              Move <strong style={{ color: "var(--charcoal)", fontWeight: 500 }}>{dragConfirm.booking.client_name}</strong> to <strong style={{ color: "var(--charcoal)", fontWeight: 500 }}>{dragConfirm.label}</strong>?
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDragConfirm(null)} style={{ flex: 1, padding: "14px", background: "none", border: "1.5px solid var(--border)", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--charcoal)" }}>Keep</button>
              <button onClick={confirmDragMove} disabled={dragSaving} style={{ flex: 2, padding: "14px", background: "var(--gold)", color: "var(--charcoal)", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", opacity: dragSaving ? .5 : 1 }}>{dragSaving ? "Saving..." : "Confirm"}</button>
            </div>
          </div>
        </>
      )}

      {sheet && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(44,40,37,.4)", zIndex: 300 }} onClick={(e) => { if (e.target === e.currentTarget) closeSheet(); }} />
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--cream)", borderTop: "1px solid var(--border)", borderRadius: "12px 12px 0 0", zIndex: 301, padding: "0 24px 48px", maxHeight: "90vh", overflowY: "auto", animation: "sheetUp .3s cubic-bezier(.22,1,.36,1)" }}>
            <div style={{ width: 36, height: 4, background: "var(--border)", borderRadius: 2, margin: "14px auto 24px" }} />
            {sheetMode === "detail" && (
              <>
<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 300 }}>{sheet.client_name}</div>
  <button
    onClick={() => {
      if (clientHistory !== null) { setClientHistory(null); return; }
      loadClientHistory(sheet);
    }}
    style={{ padding: "6px 12px", background: "none", border: "1px solid var(--border)", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--warm-gray)" }}>
    {clientHistory !== null ? "Hide" : "All bookings"}
  </button>
</div>
{clientHistory !== null && (
  <div style={{ marginBottom: 20, padding: "14px 16px", background: "var(--warm-white)", border: "1px solid var(--border)" }}>
    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", color: "var(--warm-gray)", marginBottom: 10 }}>
      Other upcoming appointments
    </div>
    {clientHistoryLoading ? (
      <div style={{ fontSize: 13, color: "var(--warm-gray)", fontWeight: 300 }}>Loading...</div>
    ) : clientHistory.length === 0 ? (
      <div style={{ fontSize: 13, color: "var(--warm-gray)", fontWeight: 300 }}>No other upcoming appointments.</div>
    ) : (
      clientHistory.map(b => (
<div key={b.id} onClick={() => openSheet(b)} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13, cursor: "pointer", transition: "opacity .15s" }}
  onMouseEnter={e => e.currentTarget.style.opacity = ".6"}
  onMouseLeave={e => e.currentTarget.style.opacity = "1"}>          <span style={{ color: "var(--warm-gray)", fontWeight: 300 }}>
            {new Date(b.booking_date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} at {b.booking_time?.slice(0, 5)}
          </span>
          <span style={{ fontWeight: 500 }}>{b.service_title || "Appointment"}</span>
        </div>
      ))
    )}
  </div>
)}                <div style={{ fontSize: 13, color: "var(--warm-gray)", fontWeight: 300, marginBottom: 24 }}>
                  {new Date(sheet.booking_date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} at {sheet.booking_time?.slice(0, 5)}
                </div>
                {[
                  ["Service", sheet.service_title || sheet.service_name || "Service"],
                  ["Duration", sheet.duration + " min"],
                  ["Price", "£" + sheet.price],
                  sheet.deposit_paid ? ["Deposit", "£" + sheet.deposit_amount + " paid ✓"] : null,
                  ["Phone", sheet.client_phone],
                  sheet.client_email ? ["Email", sheet.client_email] : null,
                  sheet.notes ? ["Notes", sheet.notes] : null,
                ].filter(Boolean).map(([label, val]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border)", fontSize: 14 }}>
                    <span style={{ color: label === "Deposit" ? "var(--green)" : "var(--warm-gray)", fontWeight: 300 }}>{label}</span>
                    <span style={{ fontWeight: 500, textAlign: "right", maxWidth: "60%", color: label === "Deposit" ? "var(--green)" : "inherit" }}>{val}</span>
                  </div>
                ))}
               <div style={{ display: "flex", gap: 10, marginTop: 28, flexWrap: "wrap" }}>
                  <button onClick={closeSheet} style={{ flex: "1 1 calc(50% - 5px)", padding: "14px", background: "none", border: "1.5px solid var(--border)", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--charcoal)" }}>Close</button>
                  <button onClick={startEditDetails} style={{ flex: "1 1 calc(50% - 5px)", padding: "14px", background: "none", border: "1.5px solid var(--charcoal)", color: "var(--charcoal)", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase" }}>Edit Details</button>
                  <button onClick={() => setSheetMode("edit")} style={{ flex: "1 1 calc(50% - 5px)", padding: "14px", background: "var(--charcoal)", color: "var(--cream)", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase" }}>Reschedule</button>
                  <button onClick={() => { if (window.confirm("Are you sure you want to cancel this booking for " + sheet.client_name + "?")) { onStatusChange(sheet.id, "cancelled"); closeSheet(); } }}
                    style={{ flex: "1 1 calc(50% - 5px)", padding: "14px", background: "none", color: "var(--red)", border: "1px solid var(--red)", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase" }}>Cancel</button>
                </div>
              </>
            )}
            {sheetMode === "edit" && (
              <>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 300, marginBottom: 4 }}>Reschedule</div>
                <div style={{ fontSize: 13, color: "var(--warm-gray)", fontWeight: 300, marginBottom: 24 }}>{sheet.client_name} · {sheet.service_title || sheet.service_name || "Service"}</div>
                <div className="nn-cal" style={{ maxWidth: "100%", marginBottom: 20 }}>
                  <div className="nn-cal-head">
                    <button className="nn-cal-btn" onClick={() => { if (editCM === 0) { setEditCM(11); setEditCY(editCY - 1); } else setEditCM(editCM - 1); }}>‹</button>
                    <h3>{getMonthName(editCM)} {editCY}</h3>
                    <button className="nn-cal-btn" onClick={() => { if (editCM === 11) { setEditCM(0); setEditCY(editCY + 1); } else setEditCM(editCM + 1); }}>›</button>
                  </div>
                  <div className="nn-cal-weekdays">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => <span key={d}>{d}</span>)}</div>
                  <div className="nn-cal-days">
                    {(() => {
                      const first = (new Date(editCY, editCM, 1).getDay() + 6) % 7;
                      const total = getDaysInMonth(editCY, editCM);
                      const cells = [];
                      for (let i = 0; i < first; i++) cells.push(<div className="nn-cal-day nil" key={"e" + i} />);
                      for (let d = 1; d <= total; d++) {
                        const isNow = d === now.getDate() && editCM === now.getMonth() && editCY === now.getFullYear();
                        const past = new Date(editCY, editCM, d) < new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        const sun = new Date(editCY, editCM, d).getDay() === 0;
                        const sel = editDate && editDate.day === d && editDate.month === editCM && editDate.year === editCY;
                        cells.push(
                          <button key={d} className={"nn-cal-day" + (sel ? " on" : "") + (past || sun ? " off" : "") + (isNow ? " now" : "")}
                            onClick={() => { if (!past && !sun) { setEditDate({ day: d, month: editCM, year: editCY }); setEditTime(null); } }}
                            disabled={past || sun}>{d}</button>
                        );
                      }
                      return cells;
                    })()}
                  </div>
                </div>
                {editDate && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, color: "var(--warm-gray)", marginBottom: 12, fontWeight: 300 }}>
                      {getDayName(editDate.year, editDate.month, editDate.day)} {editDate.day} {getMonthName(editDate.month)}
                    </div>
                    {editSlotsLoading ? (
                      <div style={{ color: "var(--warm-gray)", fontSize: 13, fontWeight: 300 }}>Loading times...</div>
                    ) : editSlots.length === 0 ? (
                      <div style={{ color: "var(--red)", fontSize: 13, fontWeight: 300 }}>No available slots. Try another day.</div>
                    ) : (
                      <div className="nn-times">{editSlots.map(t => <button key={t} className={"nn-time" + (editTime === t ? " on" : "")} onClick={() => setEditTime(t)}>{t}</button>)}</div>
                    )}
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <button onClick={() => setSheetMode("detail")} style={{ flex: 1, padding: "14px", background: "none", border: "1.5px solid var(--border)", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--charcoal)" }}>Back</button>
                  <button onClick={handleReschedule} disabled={!editDate || !editTime || rescheduling}
                    style={{ flex: 2, padding: "14px", background: "var(--gold)", color: "var(--charcoal)", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", opacity: editDate && editTime && !rescheduling ? 1 : .35 }}>
                    {rescheduling ? "Saving..." : "Confirm New Time"}
                  </button>
                </div>
              </>
            )}
            {sheetMode === "editDetails" && (
              <>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 300, marginBottom: 4 }}>Edit client details</div>
                <div style={{ fontSize: 13, color: "var(--warm-gray)", fontWeight: 300, marginBottom: 24 }}>
                  Correcting an email here means reminders go to the right place. It won't re-send the original confirmation.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div><label className="nn-input-label">Client Name</label><input className="nn-input" type="text" value={detailName} onChange={e => setDetailName(e.target.value)} placeholder="Full name" /></div>
                  <div><label className="nn-input-label">Phone Number</label><input className="nn-input" type="tel" value={detailPhone} onChange={e => setDetailPhone(e.target.value)} placeholder="07xxx xxxxxx" /></div>
                  <div><label className="nn-input-label">Email</label><input className="nn-input" type="email" value={detailEmail} onChange={e => setDetailEmail(e.target.value)} placeholder="client@email.com" /></div>
                  <div><label className="nn-input-label">Notes</label><input className="nn-input" type="text" value={detailNotes} onChange={e => setDetailNotes(e.target.value)} placeholder="e.g. prefers short nails" /></div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                  <button onClick={() => setSheetMode("detail")} style={{ flex: 1, padding: "14px", background: "none", border: "1.5px solid var(--border)", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--charcoal)" }}>Back</button>
                  <button onClick={handleSaveDetails} disabled={!detailName.trim() || !detailPhone.trim() || savingDetails}
                    style={{ flex: 2, padding: "14px", background: "var(--gold)", color: "var(--charcoal)", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", opacity: detailName.trim() && detailPhone.trim() && !savingDetails ? 1 : .35 }}>
                    {savingDetails ? "Saving..." : "Save Details"}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// REPORTS
// ============================================================

const GBP = (n) => "£" + Number(n || 0).toLocaleString("en-GB", { maximumFractionDigits: 0 });
const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function periodRange(period, customFrom, customTo) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (period === "daily") return { from: iso(today), to: iso(today) };
  if (period === "weekly") {
    const day = today.getDay();
    const start = new Date(today); start.setDate(today.getDate() + (day === 0 ? -6 : 1 - day));
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return { from: iso(start), to: iso(end) };
  }
  if (period === "monthly") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from: iso(start), to: iso(end) };
  }
  if (period === "12monthly") {
    const start = new Date(today); start.setMonth(start.getMonth() - 11); start.setDate(1);
    return { from: iso(start), to: iso(today) };
  }
  if (period === "yearly") {
    return { from: `${today.getFullYear()}-01-01`, to: `${today.getFullYear()}-12-31` };
  }
  // custom
  return { from: customFrom || iso(today), to: customTo || iso(today) };
}

function ReportTab({ prac, token }) {
  const [period, setPeriod] = useState("monthly");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [scope, setScope] = useState(prac?.is_owner ? "__all__" : (prac?.id || ""));
  const [practitioners, setPractitioners] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Owner: load practitioner list for the scope dropdown
  useEffect(() => {
    if (!prac?.is_owner || IS_DEMO) return;
    supabase.query("practitioners", { select: "id,name", filters: "&is_active=eq.true&order=name", token })
      .then(setPractitioners).catch(console.error);
  }, [prac?.is_owner]);

  const range = periodRange(period, customFrom, customTo);

  useEffect(() => {
    if (IS_DEMO) {
      setData({
        summary: { total_bookings: 42, completed: 38, upcoming: 4, cancelled: 3, no_show: 1, hours_booked: 51.5, booked_value: 1840, avg_value: 44, cancelled_value: 145 },
        daily: [], by_weekday: [{ dow: 1, bookings: 9, value: 380 }, { dow: 3, bookings: 12, value: 520 }, { dow: 5, bookings: 14, value: 610 }, { dow: 6, bookings: 7, value: 330 }],
        top_services: [{ service: "Gel Manicure", bookings: 18, value: 540 }, { service: "BIAB Overlay", bookings: 11, value: 418 }, { service: "Luxury Facial", bookings: 6, value: 330 }],
      });
      return;
    }
    if (period === "custom" && (!customFrom || !customTo)) { setData(null); return; }
    setLoading(true); setErr("");
    supabase.rpc("get_practitioner_report", {
      p_practitioner_id: prac?.is_owner ? (scope === "__all__" ? null : scope) : null,
      p_from: range.from,
      p_to: range.to,
    }, token).then((res) => {
      if (res?.error) { setErr("Couldn't load report."); setData(null); }
      else setData(res);
      setLoading(false);
    }).catch((e) => { console.error(e); setErr("Couldn't load report."); setLoading(false); });
  }, [period, customFrom, customTo, scope, prac?.id]);

  const s = data?.summary;

  // 12-monthly: bucket the daily rows into months for the trend
  const monthBuckets = (() => {
    if (period !== "12monthly" || !data?.daily?.length) return [];
    const map = {};
    data.daily.forEach(r => {
      const key = r.day.slice(0, 7); // YYYY-MM
      if (!map[key]) map[key] = { key, bookings: 0, value: 0, hours: 0 };
      map[key].bookings += r.bookings; map[key].value += Number(r.value); map[key].hours += Number(r.hours);
    });
    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
  })();
  const maxMonthVal = Math.max(1, ...monthBuckets.map(m => m.value));
  const maxWdBookings = Math.max(1, ...(data?.by_weekday || []).map(w => w.bookings));

  const PERIODS = [
    ["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"],
    ["12monthly", "12-Monthly"], ["yearly", "Yearly"], ["custom", "Custom"],
  ];

  const rangeLabel = (() => {
    const f = new Date(range.from + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const t = new Date(range.to + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    return range.from === range.to ? f : `${f} – ${t}`;
  })();

  const Card = ({ label, value, sub, accent }) => (
    <div style={{ padding: "18px 20px", background: "var(--warm-white)", border: "1.5px solid var(--border)", flex: "1 1 140px", minWidth: 130 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--warm-gray)", marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 30, fontWeight: 400, color: accent || "var(--charcoal)", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300, marginTop: 6 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ maxWidth: 820 }}>
      {prac?.is_owner && (
        <div style={{ marginBottom: 24 }}>
          <label className="nn-input-label">Viewing data for</label>
          <select value={scope} onChange={e => setScope(e.target.value)}
            style={{ padding: "12px 16px", border: "1.5px solid var(--border)", background: "var(--warm-white)", fontFamily: "'Outfit',sans-serif", fontSize: 15, outline: "none", color: "var(--charcoal)", cursor: "pointer", minWidth: 220 }}>
            <option value="__all__">Whole salon</option>
            {practitioners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {PERIODS.map(([val, lbl]) => (
          <button key={val} onClick={() => setPeriod(val)}
            style={{ padding: "8px 16px", background: period === val ? "var(--charcoal)" : "none", color: period === val ? "var(--cream)" : "var(--charcoal)", border: "1.5px solid " + (period === val ? "var(--charcoal)" : "var(--border)"), cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "1px", textTransform: "uppercase" }}>{lbl}</button>
        ))}
      </div>

      {period === "custom" && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16 }}>
          <div><label className="nn-input-label">From</label><input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ padding: "10px 14px", border: "1.5px solid var(--border)", background: "var(--warm-white)", fontFamily: "'Outfit',sans-serif", fontSize: 14, outline: "none" }} /></div>
          <div><label className="nn-input-label">To</label><input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ padding: "10px 14px", border: "1.5px solid var(--border)", background: "var(--warm-white)", fontFamily: "'Outfit',sans-serif", fontSize: 14, outline: "none" }} /></div>
        </div>
      )}

      <div style={{ fontSize: 13, color: "var(--warm-gray)", fontWeight: 300, marginBottom: 24 }}>{rangeLabel}</div>

      {loading ? (
        <div style={{ color: "var(--warm-gray)", padding: 40, textAlign: "center" }}>Loading...</div>
      ) : err ? (
        <div style={{ color: "var(--red)", padding: 20 }}>{err}</div>
      ) : !s ? (
        <div style={{ color: "var(--warm-gray)", padding: 20, fontWeight: 300 }}>{period === "custom" ? "Pick a date range to see your report." : "No data."}</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <Card label="Bookings" value={s.completed + s.upcoming} sub={`${s.completed} done · ${s.upcoming} upcoming`} />
            <Card label="Hours" value={s.hours_booked} sub="booked" />
            <Card label="Booked value" value={GBP(s.booked_value)} accent="var(--gold)" sub={`avg ${GBP(s.avg_value)}`} />
            <Card label="Cancelled" value={s.cancelled + s.no_show} sub={`${GBP(s.cancelled_value)} lost`} accent="var(--red)" />
          </div>
          <p style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300, lineHeight: 1.6, marginBottom: 36 }}>
            Booked value is the total treatment price for confirmed and completed appointments. Payment is taken in salon.
          </p>

          {period === "12monthly" && monthBuckets.length > 0 && (
            <div style={{ marginBottom: 36 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 400, marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>Monthly trend</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 160 }}>
                {monthBuckets.map(m => (
                  <div key={m.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ fontSize: 10, color: "var(--warm-gray)" }}>{GBP(m.value)}</div>
                    <div title={`${m.bookings} bookings`} style={{ width: "100%", maxWidth: 28, height: Math.max(2, (m.value / maxMonthVal) * 110), background: "var(--gold)", borderRadius: "2px 2px 0 0" }} />
                    <div style={{ fontSize: 10, color: "var(--warm-gray)", letterSpacing: ".3px" }}>{new Date(m.key + "-01T12:00:00").toLocaleDateString("en-GB", { month: "short" })}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.by_weekday?.length > 0 && (
            <div style={{ marginBottom: 36 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 400, marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>By day of week</div>
              {WD.map((name, i) => {
                const row = data.by_weekday.find(w => w.dow === i + 1);
                const b = row?.bookings || 0;
                return (
                  <div key={name} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <div style={{ width: 36, fontSize: 12, color: "var(--warm-gray)", fontWeight: 500 }}>{name}</div>
                    <div style={{ flex: 1, height: 18, background: "var(--cream)", border: "1px solid var(--border)", position: "relative" }}>
                      <div style={{ position: "absolute", inset: 0, width: `${(b / maxWdBookings) * 100}%`, background: "var(--gold)", opacity: .85 }} />
                    </div>
                    <div style={{ width: 90, fontSize: 12, color: "var(--warm-gray)", fontWeight: 300, textAlign: "right" }}>{b} · {GBP(row?.value)}</div>
                  </div>
                );
              })}
            </div>
          )}

          {data.top_services?.length > 0 && (
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 400, marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>Top services</div>
              {data.top_services.map((sv, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--warm-white)", border: "1.5px solid var(--border)", marginBottom: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{sv.service}</div>
                  <div style={{ fontSize: 13, color: "var(--warm-gray)", fontWeight: 300 }}>{sv.bookings} bookings · <span style={{ color: "var(--gold)", fontWeight: 500 }}>{GBP(sv.value)}</span></div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================

function CollapsibleHeader({ title, open, onToggle }) {
  return (
    <div onClick={onToggle}
      style={{ display: "flex", alignItems: "center", gap: 12, margin: "40px 0 20px", paddingBottom: 12, borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
      <span style={{ width: 20, height: 1.5, background: "var(--gold)", display: "inline-block", flexShrink: 0 }} />
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 400 }}>{title}</div>
      <span style={{ marginLeft: "auto", fontSize: 14, color: "var(--warm-gray)", transform: open ? "rotate(90deg)" : "none", transition: "transform .2s", flexShrink: 0 }}>›</span>
    </div>
  );
}

export default function Dashboard({ onBack }) {
  const [auth, setAuth] = useState(null);
  const [prac, setPrac] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [tab, setTab] = useState("bookings");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [customServices, setCustomServices] = useState([]);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingCustomService, setEditingCustomService] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [newBlock, setNewBlock] = useState("");
  const [newBlockStart, setNewBlockStart] = useState("");
  const [newBlockEnd, setNewBlockEnd] = useState("");
  const [blockType, setBlockType] = useState("full");
  const [newBlockRangeEnd, setNewBlockRangeEnd] = useState("");
  const [blockSaving, setBlockSaving] = useState(false);
const [dateOverrides, setDateOverrides] = useState([]);
const [newOverrideDate, setNewOverrideDate] = useState("");
const [newOverrideStart, setNewOverrideStart] = useState("");
const [newOverrideEnd, setNewOverrideEnd] = useState("");
const [overrideSaving, setOverrideSaving] = useState(false);
  const [showStaffBooking, setShowStaffBooking] = useState(false);
  const [bookingFromWaitlist, setBookingFromWaitlist] = useState(null);
  const [staffBookServices, setStaffBookServices] = useState([]);
 const [weekBlocks, setWeekBlocks] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [stripeConnecting, setStripeConnecting] = useState(false);
  const [depositSaving, setDepositSaving] = useState(false);
  const [statusRefreshing, setStatusRefreshing] = useState(false);
  const [depositPercentInput, setDepositPercentInput] = useState("");
  const [depositThresholdInput, setDepositThresholdInput] = useState("");
  const [depositsOpen, setDepositsOpen] = useState(false);
const [schedOpen, setSchedOpen] = useState({});
  const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const [allPracs, setAllPracs] = useState([]);
  const [viewedPracId, setViewedPracId] = useState(null);
  // Owner can view another practitioner's bookings; everyone else only sees their own.
  const viewedPrac = (prac?.is_owner && viewedPracId && viewedPracId !== prac.id)
    ? (allPracs.find(p => p.id === viewedPracId) || prac)
    : prac;

  // Owner-only: practitioner list for the Bookings scope dropdown
  useEffect(() => {
    if (!prac?.is_owner || !auth || IS_DEMO) return;
    supabase.query("practitioners", { filters: "&is_active=eq.true&order=name", token: auth.access_token })
      .then(setAllPracs).catch(console.error);
  }, [prac?.is_owner, auth]);

  // Handle Stripe Connect return
useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeStatus = params.get("stripe");
    if (stripeStatus === "success" && prac?.id && !IS_DEMO) {
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-account-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ practitioner_id: prac.id }),
      })
        .then(r => r.json())
        .then(d => { if (typeof d.charges_enabled === "boolean") setPrac(prev => ({ ...prev, stripe_charges_enabled: d.charges_enabled })); })
        .catch(e => console.error("Stripe status sync failed:", e));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [prac?.id]);

  // Session restore
  useEffect(() => {
    async function restoreSession() {
      try {
        const saved = localStorage.getItem("nn_session");
        if (!saved) return;
        const { session } = JSON.parse(saved);
        if (!session?.refresh_token) { localStorage.removeItem("nn_session"); return; }
        const res = await fetch(
          import.meta.env.VITE_SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token",
          { method: "POST", headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_ANON_KEY }, body: JSON.stringify({ refresh_token: session.refresh_token }) }
        );
        if (!res.ok) { localStorage.removeItem("nn_session"); return; }
        const newSession = await res.json();
        localStorage.setItem("nn_session", JSON.stringify({ session: newSession }));
        setAuth(newSession);
        const pracs = await supabase.query("practitioners", { filters: "&user_id=eq." + newSession.user.id, token: newSession.access_token });
        if (pracs.length > 0) {
          setPrac(pracs[0]);
          setDepositPercentInput(String(pracs[0].deposit_percent ?? 20));
          setDepositThresholdInput(String(pracs[0].deposit_threshold ?? 10));
        } else localStorage.removeItem("nn_session");
      } catch (e) { localStorage.removeItem("nn_session"); }
    }
    restoreSession();
  }, []);

  // Keep the access token fresh while the dashboard is open (tokens expire ~1hr)
  useEffect(() => {
    if (!auth?.refresh_token || IS_DEMO) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch(
          import.meta.env.VITE_SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token",
          { method: "POST", headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_ANON_KEY }, body: JSON.stringify({ refresh_token: auth.refresh_token }) }
        );
        if (!res.ok) return;
        const newSession = await res.json();
        localStorage.setItem("nn_session", JSON.stringify({ session: newSession }));
        setAuth(newSession);
      } catch (e) { /* will retry on next tick */ }
    }, 45 * 60 * 1000); // every 45 min, comfortably inside the ~60 min expiry
    return () => clearInterval(id);
  }, [auth?.refresh_token]);

  async function handleLogin(e) {
    e.preventDefault(); setLoginErr("");
    if (IS_DEMO) { setAuth({ access_token: "demo" }); setPrac(DEMO_PRACTITIONERS[0]); return; }
    try {
      const session = await supabase.signIn(loginEmail, loginPass);
      setAuth(session);
      const pracs = await supabase.query("practitioners", { filters: "&user_id=eq." + session.user.id, token: session.access_token });
      if (pracs.length > 0) {
        setPrac(pracs[0]);
        setDepositPercentInput(String(pracs[0].deposit_percent ?? 20));
        setDepositThresholdInput(String(pracs[0].deposit_threshold ?? 10));
        localStorage.setItem("nn_session", JSON.stringify({ session }));
      } else setLoginErr("No practitioner account linked to this email. Please contact Kristen.");
    } catch (e) { setLoginErr(e.message); }
  }

  async function handleStripeConnect() {
    if (IS_DEMO) { alert("Stripe Connect is not available in demo mode."); return; }
    setStripeConnecting(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect-onboard`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.access_token}` },
          body: JSON.stringify({ practitioner_id: prac.id }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      // Save account_id to prac state immediately if returned
      if (data.account_id) setPrac(prev => ({ ...prev, stripe_account_id: data.account_id }));
      // Redirect to Stripe onboarding
      window.location.href = data.url;
    } catch (e) {
      console.error(e);
      alert("Error connecting Stripe: " + e.message);
    }
    setStripeConnecting(false);
  }

  async function refreshStripeStatus() {
    if (IS_DEMO) return;
    setStatusRefreshing(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-account-status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ practitioner_id: prac.id }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPrac(prev => ({ ...prev, stripe_charges_enabled: data.charges_enabled }));
    } catch (e) {
      console.error(e);
      alert("Couldn't refresh Stripe status. Please try again in a moment.");
    }
    setStatusRefreshing(false);
  }

  async function saveDepositSettings(enabled, percent, threshold) {
    if (IS_DEMO) return;
    setDepositSaving(true);
    try {
      const pct = Math.min(100, Math.max(1, parseInt(percent) || 20));
      const thr = Math.max(0, parseFloat(threshold) || 10);
      await supabase.update("practitioners",
        { deposits_enabled: enabled, deposit_percent: pct, deposit_threshold: thr },
        "id=eq." + prac.id, auth.access_token
      );
      setPrac(prev => ({ ...prev, deposits_enabled: enabled, deposit_percent: pct, deposit_threshold: thr }));
    } catch (e) { console.error(e); alert("Error saving deposit settings."); }
    setDepositSaving(false);
  }

  useEffect(() => {
    if (!auth || !prac || tab !== "bookings") return;
    if (IS_DEMO) {
      const demoToday = new Date().toISOString().split("T")[0];
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];
      setBookings([
        { id: "d1", client_name: "Sarah J.", client_phone: "07700 123456", booking_date: demoToday, booking_time: "10:00:00", duration: 45, price: 30, status: "confirmed", service_title: "Gel Manicure" },
        { id: "d2", client_name: "Emma W.", client_phone: "07700 654321", booking_date: demoToday, booking_time: "11:30:00", duration: 60, price: 40, status: "confirmed", service_title: "Lash Lift & Tint" },
        { id: "d3", client_name: "Lucy T.", client_phone: "07700 111222", booking_date: tomorrowStr, booking_time: "09:30:00", duration: 45, price: 35, status: "confirmed", service_title: "Brow Lamination" },
        { id: "d4", client_name: "Hannah R.", client_phone: "07700 333444", booking_date: tomorrowStr, booking_time: "14:00:00", duration: 60, price: 55, status: "confirmed", service_title: "Luxury Facial" },
      ]);
      return;
    }
    setLoading(true);
    const n = new Date();
    const rangeStart = new Date(n); rangeStart.setMonth(rangeStart.getMonth() - 1);
    const rangeEnd = new Date(n); rangeEnd.setMonth(rangeEnd.getMonth() + 3);
supabase.query("bookings", {
      select: "*",
      filters: "&practitioner_id=eq." + viewedPrac.id + "&booking_date=gte." + rangeStart.toISOString().split("T")[0] + "&booking_date=lte." + rangeEnd.toISOString().split("T")[0] + "&status=eq.confirmed&order=booking_date,booking_time",
      token: auth.access_token,
    }).then(async (rows) => {
      if (rows.length > 0) {
        try {
          const svcIds = [...new Set(rows.map(r => r.service_id).filter(Boolean))];
          if (svcIds.length > 0) {
            const svcs = await supabase.query("custom_services", { select: "id,title", filters: "&id=in.(" + svcIds.join(",") + ")", token: auth.access_token });
            const svcMap = Object.fromEntries(svcs.map(s => [s.id, s.title]));
            rows = rows.map(b => ({ ...b, service_name: svcMap[b.service_id] || null }));
          }
        } catch (e) { /* ignore */ }
      }
      setBookings(rows);
    }).catch(console.error).finally(() => setLoading(false));
  }, [auth, viewedPrac, tab]);
  useEffect(() => {
    if (!auth || !prac || tab !== "bookings" || IS_DEMO) return;
    const todayStr = new Date().toISOString().split("T")[0];
    supabase.query("blocked_dates", {
      filters: "&practitioner_id=eq." + viewedPrac.id + "&blocked_date=gte." + todayStr + "&order=blocked_date",
      token: auth.access_token,
    }).then(setWeekBlocks).catch(console.error);
    // Waiting clients for upcoming dates only (past dates are moot).
    supabase.query("waitlist", {
      filters: "&practitioner_id=eq." + viewedPrac.id + "&status=eq.waiting&waitlist_date=gte." + todayStr + "&order=waitlist_date,created_at",
      token: auth.access_token,
    }).then(setWaitlist).catch(console.error);
  }, [auth, viewedPrac, tab]);

useEffect(() => {
    if (!auth || !prac || !showStaffBooking) return;
    if (IS_DEMO) { setStaffBookServices(DEMO_SERVICES_LIST); return; }
    supabase.query("custom_services", {
      select: "*,addons:custom_service_addons(*)",
      filters: "&practitioner_id=eq." + viewedPrac.id + "&is_active=eq.true&order=group_order,service_order,created_at",
      token: auth.access_token,
     }).then(rows => setStaffBookServices(rows.map(s => ({ ...s, addons: s.addons || [] })))).catch(console.error);
  }, [auth, viewedPrac, showStaffBooking]);

  async function removeWaitlistEntry(id) {
    if (IS_DEMO) { setWaitlist(prev => prev.filter(w => w.id !== id)); return; }
    try {
      const res = await fetch(SUPABASE_URL + "/rest/v1/waitlist?id=eq." + id, { method: "DELETE", headers: supabase.headers(auth.access_token) });
      if (!res.ok) throw new Error(await res.text());
      setWaitlist(prev => prev.filter(w => w.id !== id));
    } catch (e) { console.error(e); alert("Couldn't remove that entry. Please try again."); }
  }

function refreshBookings() {
    if (!auth || !prac || IS_DEMO) return;
    const n = new Date();
    const rangeStart = new Date(n); rangeStart.setMonth(rangeStart.getMonth() - 1);
    const rangeEnd = new Date(n); rangeEnd.setMonth(rangeEnd.getMonth() + 3);
    supabase.query("bookings", {
      select: "*",
      filters: "&practitioner_id=eq." + viewedPrac.id + "&booking_date=gte." + rangeStart.toISOString().split("T")[0] + "&booking_date=lte." + rangeEnd.toISOString().split("T")[0] + "&status=eq.confirmed&order=booking_date,booking_time",
      token: auth.access_token,
    }).then(async (rows) => {
      if (rows.length > 0) {
        try {
          const svcIds = [...new Set(rows.map(r => r.service_id).filter(Boolean))];
          if (svcIds.length > 0) {
            const svcs = await supabase.query("custom_services", { select: "id,title", filters: "&id=in.(" + svcIds.join(",") + ")", token: auth.access_token });
            const svcMap = Object.fromEntries(svcs.map(s => [s.id, s.title]));
            rows = rows.map(b => ({ ...b, service_name: svcMap[b.service_id] || null }));
          }
        } catch (e) { /* ignore */ }
      }
      setBookings(rows);
    }).catch(console.error);
  }

  async function updateStatus(bookingId, status) {
    if (IS_DEMO) { setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b)); return; }
    await supabase.update("bookings", { status }, "id=eq." + bookingId, auth.access_token);
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));
  }

  async function rescheduleBooking(bookingId, newDate, newTime) {
    if (IS_DEMO) {
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, booking_date: newDate, booking_time: newTime } : b));
      return;
    }
    await supabase.update("bookings", { booking_date: newDate, booking_time: newTime, reminder_sent: false }, "id=eq." + bookingId, auth.access_token);
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, booking_date: newDate, booking_time: newTime } : b));
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/booking-rescheduled`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ booking_id: bookingId, source: "staff" }),
      });
    } catch (e) { console.error("Reschedule email failed:", e); }
  }
  async function updateBookingDetails(bookingId, fields) {
    if (IS_DEMO) {
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, ...fields } : b));
      return;
    }
    await supabase.update("bookings", fields, "id=eq." + bookingId, auth.access_token);
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, ...fields } : b));
  }

  useEffect(() => {
    if (!auth || !prac || tab !== "services") return;
    if (IS_DEMO) { setCustomServices([]); return; }
    loadServices();
  }, [auth, prac, tab]);

  function loadServices() {
    if (!auth || !prac) return;
    supabase.query("custom_services", {
      select: "*,addons:custom_service_addons(*)",
      filters: "&practitioner_id=eq." + prac.id + "&is_active=eq.true&order=group_order,service_order,created_at",
      token: auth.access_token,
     }).then(rows => setCustomServices(rows.map(s => ({ ...s, addons: s.addons || [] })))).catch(console.error);
  }

  const existingGroups = [...new Set(customServices.filter(s => s.group_name).map(s => s.group_name))];

  useEffect(() => {
    if (!auth || !prac || tab !== "schedule") return;
    if (IS_DEMO) {
      setAvailability(DAY_NAMES.map((_,i) => ({ day_of_week:i, start_time:"09:00", end_time:i<5?"17:30":"17:00", is_available:i<6 })));
      setBlockedDates([]); setDateOverrides([]); return;
    }
    Promise.all([
      supabase.query("availability", { filters:"&practitioner_id=eq."+prac.id+"&order=day_of_week", token:auth.access_token }),
      supabase.query("blocked_dates", { filters:"&practitioner_id=eq."+prac.id+"&blocked_date=gte."+new Date().toISOString().split("T")[0]+"&order=blocked_date", token:auth.access_token }),
      supabase.query("date_overrides", { filters:"&practitioner_id=eq."+prac.id+"&override_date=gte."+new Date().toISOString().split("T")[0]+"&order=override_date", token:auth.access_token }),
    ]).then(([avail, blocked, overrides]) => {
      const filled = DAY_NAMES.map((_,i) => avail.find(a => a.day_of_week===i) || { day_of_week:i, start_time:"09:00", end_time:"17:30", is_available:false });
      setAvailability(filled); setBlockedDates(blocked); setDateOverrides(overrides);
    }).catch(console.error);
  }, [auth, prac, tab]);

  async function saveAvailability(day, overrides = {}) {
    const row = { ...availability[day], ...overrides };
    if (IS_DEMO) return;
    try {
      const payload = {
        is_available: row.is_available,
        start_time: row.start_time,
        end_time: row.end_time,
        break_start: row.break_start || null,
break_duration: row.break_start ? (parseInt(row.break_duration) || null) : null,      };
      await fetch(SUPABASE_URL + "/rest/v1/availability?practitioner_id=eq." + prac.id + "&day_of_week=eq." + day, {
        method: "PATCH",
        headers: { ...supabase.headers(auth.access_token), Prefer: "return=representation" },
        body: JSON.stringify(payload),
      });
    } catch (e) { console.error(e); }
  }

  function updateAvail(day, field, value) {
    setAvailability(prev => prev.map((r, i) => i === day ? { ...r, [field]: value } : r));
  }

  async function addBlockedDate() {
    if (!newBlock) return;

    // Date Range: one full-day block per day, inclusive
    if (blockType === "range") {
      if (!newBlockRangeEnd) return;
      if (newBlockRangeEnd < newBlock) { alert("End date must be on or after the start date."); return; }
      setBlockSaving(true);
      const days = [];
      for (let d = new Date(newBlock + "T12:00:00"); d <= new Date(newBlockRangeEnd + "T12:00:00"); d.setDate(d.getDate() + 1)) {
        days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
      }
      if (IS_DEMO) {
        setBlockedDates(prev => [...prev, ...days.map((dt, i) => ({ id: Date.now() + i, practitioner_id: prac.id, blocked_date: dt }))]);
        setNewBlock(""); setNewBlockRangeEnd(""); setBlockSaving(false); return;
      }
      try {
        const res = await supabase.insert("blocked_dates", days.map(dt => ({ practitioner_id: prac.id, blocked_date: dt })), auth.access_token);
        setBlockedDates(prev => [...prev, ...res].sort((a, b) => a.blocked_date.localeCompare(b.blocked_date)));
        setNewBlock(""); setNewBlockRangeEnd("");
      } catch (e) { console.error(e); alert("Error saving. Some of those days may already be blocked."); }
      setBlockSaving(false);
      return;
    }

    if (blockType === "partial" && (!newBlockStart || !newBlockEnd)) return;
    if (blockType === "partial" && newBlockStart >= newBlockEnd) { alert("End time must be after start time."); return; }
    setBlockSaving(true);
    const payload = { practitioner_id: prac.id, blocked_date: newBlock };
    if (blockType === "partial") { payload.start_time = newBlockStart; payload.end_time = newBlockEnd; }
    if (IS_DEMO) {
      setBlockedDates(prev => [...prev, { id: Date.now(), ...payload }]);
      setNewBlock(""); setNewBlockStart(""); setNewBlockEnd("");
      setBlockSaving(false); return;
    }
    try {
      const res = await supabase.insert("blocked_dates", payload, auth.access_token);
      setBlockedDates(prev => [...prev, res[0]]);
      setNewBlock(""); setNewBlockStart(""); setNewBlockEnd("");
    } catch (e) { console.error(e); }
    setBlockSaving(false);
  }

  async function removeBlockedDate(id) {
    if (IS_DEMO) { setBlockedDates(prev => prev.filter(b => b.id !== id)); return; }
    try {
      await fetch(SUPABASE_URL + "/rest/v1/blocked_dates?id=eq." + id, { method: "DELETE", headers: supabase.headers(auth.access_token) });
      setBlockedDates(prev => prev.filter(b => b.id !== id));
    } catch (e) { console.error(e); }
  }

  if (!auth) {
    return (
      <div className="nn-login">
        <div className="nn-login-card">
          <div className="nn-login-title">Staff Login</div>
          <div className="nn-login-sub">ninety nine. practitioner portal</div>
          {loginErr && <div className="nn-login-error">{loginErr}</div>}
          <div onKeyDown={e => e.key === "Enter" && handleLogin(e)} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div><label className="nn-input-label">Email</label><input className="nn-input" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="your@email.com" /></div>
            <div><label className="nn-input-label">Password</label><input className="nn-input" type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="••••••••" /></div>
            <button className="nn-btn nn-btn-dark" onClick={handleLogin} style={{ width: "100%", marginTop: 8 }}>Sign In</button>
            <button className="nn-btn-back" onClick={onBack} style={{ width: "100%", textAlign: "center" }}>← Back to Website</button>
          </div>
          {IS_DEMO && <p style={{ marginTop: 16, fontSize: 12, color: "var(--warm-gray)", textAlign: "center" }}>Demo mode — click Sign In to preview</p>}
        </div>
      </div>
    );
  }

  const confirmedBookings = bookings.filter(b => b.status === "confirmed");
  const dashGroups = [...new Set(customServices.filter(s => s.group_name).map(s => s.group_name))];
  const dashUngrouped = customServices.filter(s => !s.group_name);
const stripeConnected = !!prac?.stripe_account_id && !!prac?.stripe_charges_enabled;
  return (
    <div className="nn-dash">
      <div className="nn-dash-header">
        <div>
          <div className="nn-dash-greeting">Hello, {prac?.name}</div>
          <div style={{ fontSize: 14, color: "var(--warm-gray)", fontWeight: 300, marginTop: 4 }}>{prac?.specialty}</div>
        </div>
        <div className="nn-dash-header-btns">
          <button className="nn-btn-back" onClick={() => { setAuth(null); setPrac(null); setAvailability([]); localStorage.removeItem("nn_session"); }}>Sign Out</button>
          <button className="nn-btn-back" onClick={onBack}>Website</button>
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <select value={tab} onChange={e => setTab(e.target.value)}
          style={{ width: "100%", maxWidth: 320, padding: "14px 18px", border: "1.5px solid var(--charcoal)", background: "var(--charcoal)", color: "var(--cream)", fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", outline: "none", cursor: "pointer" }}>
          <option value="bookings">Bookings</option>
          <option value="services">My Services</option>
          <option value="schedule">My Schedule</option>
          <option value="reports">Reports</option>
        </select>
      </div>

{tab === "bookings" && (
        <div>
          {prac?.is_owner && allPracs.length > 0 && !showStaffBooking && !bookingFromWaitlist && (
            <div style={{ marginBottom: 24 }}>
              <label className="nn-input-label">Viewing bookings for</label>
              <select value={viewedPracId || prac.id}
                onChange={e => { setViewedPracId(e.target.value); setShowStaffBooking(false); setBookingFromWaitlist(null); }}
                style={{ padding: "12px 16px", border: "1.5px solid var(--border)", background: "var(--warm-white)", fontFamily: "'Outfit',sans-serif", fontSize: 15, outline: "none", color: "var(--charcoal)", cursor: "pointer", minWidth: 220 }}>
                {allPracs.map(p => <option key={p.id} value={p.id}>{p.id === prac.id ? p.name + " (you)" : p.name}</option>)}
              </select>
            </div>
          )}
          {bookingFromWaitlist ? (
            <WaitlistBookingForm prac={viewedPrac} entry={bookingFromWaitlist} token={auth.access_token}
              onDone={() => {
                setBookingFromWaitlist(null);
                refreshBookings();
                setWaitlist(prev => prev.filter(w => w.id !== bookingFromWaitlist.id));
              }}
              onCancel={() => setBookingFromWaitlist(null)} />
          ) : showStaffBooking ? (
            <StaffBookingForm prac={viewedPrac} services={staffBookServices} token={auth.access_token}
              onDone={() => { setShowStaffBooking(false); refreshBookings(); }}
              onCancel={() => setShowStaffBooking(false)} />
         ) : (
            <>
              <WeekView bookings={confirmedBookings} loading={loading} prac={viewedPrac} token={auth.access_token}
                blocks={weekBlocks}
                onAddBooking={() => setShowStaffBooking(true)}
                onStatusChange={updateStatus}
                onReschedule={rescheduleBooking}
                onUpdateDetails={updateBookingDetails} />

              {waitlist.length > 0 && (
                <div style={{ marginTop: 40 }}>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 400, marginBottom: 6, paddingBottom: 12, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 20, height: 1.5, background: "var(--gold)", display: "inline-block" }} />
                    Waitlist
                    <span style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300, fontFamily: "'Outfit',sans-serif" }}>
                      {waitlist.length} waiting
                    </span>
                  </div>
<p style={{ fontSize: 13, color: "var(--warm-gray)", fontWeight: 300, lineHeight: 1.6, marginBottom: 20 }}>
                    Clients hoping for a slot on these dates. If a gap opens up, get in touch to fill it.
                  </p>
                  <div style={{ maxHeight: "45vh", overflowY: "auto", paddingRight: 6, WebkitOverflowScrolling: "touch" }}>
                  {(() => {
                    const byDate = {};
                    waitlist.forEach(w => { (byDate[w.waitlist_date] ||= []).push(w); });
                    return Object.keys(byDate).sort().map(d => (
                      <div key={d} style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", color: "var(--warm-gray)", marginBottom: 10 }}>
                          {new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                        </div>
                        {byDate[d].map(w => (
                          <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "14px 18px", background: "var(--warm-white)", border: "1.5px solid var(--border)", marginBottom: 8 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 500 }}>{w.client_name}</div>
                              <div style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300, marginTop: 2 }}>{w.service_title || "Any service"}{w.duration ? " · " + w.duration + " min" : ""}{w.price ? " · £" + w.price : ""}</div>
                              <div style={{ display: "flex", gap: 14, marginTop: 8, flexWrap: "wrap" }}>
                                <a href={"tel:" + w.client_phone} style={{ fontSize: 13, color: "var(--gold)", textDecoration: "none", fontWeight: 500 }}>Call</a>
                                <a href={"sms:" + w.client_phone} style={{ fontSize: 13, color: "var(--gold)", textDecoration: "none", fontWeight: 500 }}>Text</a>
                                {w.client_email && <a href={"mailto:" + w.client_email} style={{ fontSize: 13, color: "var(--gold)", textDecoration: "none", fontWeight: 500 }}>Email</a>}
                                <span style={{ fontSize: 13, color: "var(--warm-gray)", fontWeight: 300 }}>{w.client_phone}</span>
                              </div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                              <button onClick={() => setBookingFromWaitlist(w)}
                                style={{ padding: "6px 14px", background: "var(--charcoal)", color: "var(--cream)", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: .5, textTransform: "uppercase", fontFamily: "'Outfit',sans-serif" }}>
                                Add
                              </button>
                              <button onClick={() => { if (window.confirm("Remove " + w.client_name + " from the waitlist?")) removeWaitlistEntry(w.id); }}
                                style={{ padding: "6px 14px", background: "none", color: "var(--red)", border: "1px solid var(--red)", cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: .5, textTransform: "uppercase", fontFamily: "'Outfit',sans-serif" }}>
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ));
                  })()}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "services" && (
        <div style={{ maxWidth: 680 }}>
          <p style={{ fontSize: 14, color: "var(--warm-gray)", fontWeight: 300, marginBottom: 32, lineHeight: 1.7 }}>
            Add and manage your own services. Clients will see these when booking with you.
          </p>
          {/* ── Deposits (collapsible) ── */}
          <div onClick={() => setDepositsOpen(o => !o)}
            style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: depositsOpen ? 20 : 32, paddingBottom: 12, borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
            <span style={{ width: 20, height: 1.5, background: "var(--gold)", display: "inline-block", flexShrink: 0 }} />
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 400 }}>Deposits</div>
            <div style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300, fontFamily: "'Outfit',sans-serif" }}>
              {stripeConnected
                ? "Stripe connected · deposits " + (prac?.deposits_enabled ? "on" : "off")
                : prac?.stripe_account_id ? "Stripe setup incomplete" : "Stripe not connected"}
            </div>
            <span style={{ marginLeft: "auto", fontSize: 14, color: "var(--warm-gray)", transform: depositsOpen ? "rotate(90deg)" : "none", transition: "transform .2s", flexShrink: 0 }}>›</span>
          </div>

          {depositsOpen && (
            <div style={{ marginBottom: 32 }}>
              <p style={{ fontSize: 14, color: "var(--warm-gray)", fontWeight: 300, marginBottom: 20, lineHeight: 1.7 }}>
                Connect your Stripe account to accept booking deposits. Deposits go directly to your account, and are deducted from the total on the day. Full refund if a client cancels more than 48 hours before the appointment.
              </p>
              <div style={{ padding: "20px 24px", background: "var(--warm-white)", border: "1.5px solid var(--border)", marginBottom: 16 }}>
                {stripeConnected ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", flexShrink: 0 }} />
                        <span style={{ fontSize: 14, fontWeight: 500 }}>Stripe connected</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300 }}>Account ID: {prac.stripe_account_id}</div>
                    </div>
                    <button onClick={handleStripeConnect} disabled={stripeConnecting}
                      style={{ padding: "8px 16px", background: "none", border: "1px solid var(--border)", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "1px", textTransform: "uppercase", color: "var(--warm-gray)", opacity: stripeConnecting ? .5 : 1 }}>
                      {stripeConnecting ? "Loading..." : "Manage Account"}
                    </button>
                  </div>
                ) : prac?.stripe_account_id ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#C9963E", flexShrink: 0 }} />
                        <span style={{ fontSize: 14, fontWeight: 500 }}>Setup incomplete</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300 }}>
                        Your Stripe account isn't ready to take payments yet. Finish onboarding, then refresh.
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button onClick={refreshStripeStatus} disabled={statusRefreshing}
                        style={{ padding: "12px 18px", background: "none", border: "1px solid var(--border)", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "1px", textTransform: "uppercase", color: "var(--warm-gray)", opacity: statusRefreshing ? .5 : 1 }}>
                        {statusRefreshing ? "Checking..." : "Refresh"}
                      </button>
                      <button onClick={handleStripeConnect} disabled={stripeConnecting}
                        style={{ padding: "12px 18px", background: "var(--charcoal)", color: "var(--cream)", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "1px", textTransform: "uppercase", opacity: stripeConnecting ? .5 : 1 }}>
                        {stripeConnecting ? "Loading..." : "Finish Setup"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>No Stripe account connected</div>
                      <div style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300 }}>Connect to start taking deposits from clients</div>
                    </div>
                    <button onClick={handleStripeConnect} disabled={stripeConnecting}
                      style={{ padding: "12px 24px", background: "var(--charcoal)", color: "var(--cream)", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", opacity: stripeConnecting ? .5 : 1, flexShrink: 0 }}>
                      {stripeConnecting ? "Loading..." : "Connect Stripe"}
                    </button>
                  </div>
                )}
              </div>

              <div style={{ padding: "20px 24px", background: "var(--warm-white)", border: "1.5px solid var(--border)", opacity: stripeConnected ? 1 : .45 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: prac?.deposits_enabled ? 20 : 0 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>Require deposit</div>
                    <div style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300 }}>
                      {stripeConnected ? "Clients pay a percentage when booking" : "Connect Stripe above to enable deposits"}
                    </div>
                  </div>
                  <button
                    disabled={!stripeConnected || depositSaving}
                    onClick={() => saveDepositSettings(!prac?.deposits_enabled, depositPercentInput, depositThresholdInput)}
                    style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: stripeConnected ? "pointer" : "not-allowed", background: prac?.deposits_enabled ? "var(--charcoal)" : "var(--border)", position: "relative", transition: "background .2s", flexShrink: 0 }}>
                    <span style={{ position: "absolute", top: 3, left: prac?.deposits_enabled ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s", display: "block" }} />
                  </button>
                </div>
                {prac?.deposits_enabled && (
                  <div style={{ paddingTop: 16, borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 300, color: "var(--warm-gray)", width: 130 }}>Deposit percentage</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, border: "1.5px solid var(--border)", background: "var(--cream)", padding: "8px 12px" }}>
                        <input type="number" min="1" max="100" value={depositPercentInput}
                          onChange={e => setDepositPercentInput(e.target.value)}
                          onBlur={() => saveDepositSettings(true, depositPercentInput, depositThresholdInput)}
                          style={{ width: 44, border: "none", background: "transparent", fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 500, outline: "none", color: "var(--charcoal)" }} />
                        <span style={{ fontSize: 15, fontWeight: 500, color: "var(--warm-gray)" }}>%</span>
                      </div>
                      <span style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300 }}>of the total</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 300, color: "var(--warm-gray)", width: 130 }}>Only on bookings over</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, border: "1.5px solid var(--border)", background: "var(--cream)", padding: "8px 12px" }}>
                        <span style={{ fontSize: 15, fontWeight: 500, color: "var(--warm-gray)" }}>£</span>
                        <input type="number" min="0" max="500" value={depositThresholdInput}
                          onChange={e => setDepositThresholdInput(e.target.value)}
                          onBlur={() => saveDepositSettings(true, depositPercentInput, depositThresholdInput)}
                          style={{ width: 56, border: "none", background: "transparent", fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 500, outline: "none", color: "var(--charcoal)" }} />
                      </div>
                      <span style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300 }}>no deposit below this</span>
                    </div>
                    {prac?.deposit_percent && (
                      <div style={{ fontSize: 12, color: "var(--gold)", fontWeight: 300, lineHeight: 1.6 }}>
                        e.g. a £50 booking would take a £{Math.ceil(50 * (parseInt(depositPercentInput) || 20) / 100)} deposit. Rounded up to the nearest pound.
                      </div>
                    )}
                    {depositSaving && <span style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300 }}>Saving...</span>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Services ── */}
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 400, marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 20, height: 1.5, background: "var(--gold)", display: "inline-block" }} />Services
          </div>
          {!showServiceForm && !editingCustomService && (
            <button onClick={() => setShowServiceForm(true)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", background: "none", border: "1.5px dashed var(--border)", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 500, color: "var(--charcoal)", width: "100%", marginBottom: 24 }}>
              <span style={{ fontSize: 18, color: "var(--gold)", lineHeight: 1 }}>+</span>Add a service
            </button>
          )}
          {showServiceForm && (
            <ServiceForm practitionerId={prac.id} token={auth.access_token} existingService={null} existingGroups={existingGroups}
              onSave={() => { setShowServiceForm(false); loadServices(); }} onCancel={() => setShowServiceForm(false)} />
          )}
          {customServices.length === 0 && !showServiceForm && !editingCustomService ? (
            <div style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300, paddingBottom: 16 }}>No services yet — tap above to add your first.</div>
          ) : (
            <div style={{ marginBottom: 24 }}>
              {dashGroups.map(group => (
                <div key={group} style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2.5px", textTransform: "uppercase", color: "var(--warm-gray)", marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>{group}</div>
                  {customServices.filter(s => s.group_name === group).map(svc => (
                    <div key={svc.id}>
                      {editingCustomService?.id === svc.id ? (
                        <ServiceForm practitionerId={prac.id} token={auth.access_token} existingService={editingCustomService} existingGroups={existingGroups}
                          onSave={() => { setEditingCustomService(null); loadServices(); }} onCancel={() => setEditingCustomService(null)} />
                      ) : (
                        <ServiceCard svc={svc} onEdit={() => { setEditingCustomService(svc); setShowServiceForm(false); }}
                          onRemove={async () => { await supabase.update("custom_services", { is_active: false }, "id=eq." + svc.id, auth.access_token); setCustomServices(prev => prev.filter(s => s.id !== svc.id)); }} />
                      )}
                    </div>
                  ))}
                </div>
              ))}
              {dashUngrouped.length > 0 && (
                <div>
                  {dashGroups.length > 0 && <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2.5px", textTransform: "uppercase", color: "var(--warm-gray)", marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>Other</div>}
                  {dashUngrouped.map(svc => (
                    <div key={svc.id}>
                      {editingCustomService?.id === svc.id ? (
                        <ServiceForm practitionerId={prac.id} token={auth.access_token} existingService={editingCustomService} existingGroups={existingGroups}
                          onSave={() => { setEditingCustomService(null); loadServices(); }} onCancel={() => setEditingCustomService(null)} />
                      ) : (
                        <ServiceCard svc={svc} onEdit={() => { setEditingCustomService(svc); setShowServiceForm(false); }}
                          onRemove={async () => { await supabase.update("custom_services", { is_active: false }, "id=eq." + svc.id, auth.access_token); setCustomServices(prev => prev.filter(s => s.id !== svc.id)); }} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "schedule" && (
        <div style={{ maxWidth: 680 }}>
          <p style={{ fontSize: 14, color: "var(--warm-gray)", fontWeight: 300, marginBottom: 32, lineHeight: 1.7 }}>Set your working days and hours. Block out specific dates or time ranges for holidays or days off.</p>

{/* ── Booking Window ── */}
          <CollapsibleHeader title="Booking Window" open={schedOpen.window} onToggle={() => setSchedOpen(o => ({ ...o, window: !o.window }))} />
          {schedOpen.window && <>
          <p style={{ fontSize: 14, color: "var(--warm-gray)", fontWeight: 300, marginBottom: 20, lineHeight: 1.7 }}>How far ahead can clients book? Dates beyond this window will not be available.</p>
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", background: "var(--warm-white)", border: "1.5px solid var(--border)", marginBottom: 32 }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Clients can book up to</span>
            <select value={prac?.booking_window_weeks || 8}
              onChange={async e => {
                const weeks = parseInt(e.target.value);
                if (IS_DEMO) return;
                try {
                  await supabase.update("practitioners", { booking_window_weeks: weeks }, "id=eq." + prac.id, auth.access_token);
                  setPrac(prev => ({ ...prev, booking_window_weeks: weeks }));
                } catch (err) { console.error(err); }
              }}
              style={{ padding: "10px 16px", border: "1.5px solid var(--border)", background: "var(--cream)", fontFamily: "'Outfit',sans-serif", fontSize: 14, outline: "none", color: "var(--charcoal)", cursor: "pointer" }}>
              {Array.from({ length: 16 }, (_, i) => i + 1).map(w => (
                <option key={w} value={w}>{w} week{w !== 1 ? "s" : ""}</option>
              ))}
            </select>
            <span style={{ fontSize: 14, color: "var(--warm-gray)", fontWeight: 300 }}>in advance</span>
          </div>
          </>}

          {/* ── Booking Slots ── */}
          <CollapsibleHeader title="Booking Slots" open={schedOpen.slots} onToggle={() => setSchedOpen(o => ({ ...o, slots: !o.slots }))} />
          {schedOpen.slots && <>
          <p style={{ fontSize: 14, color: "var(--warm-gray)", fontWeight: 300, marginBottom: 20, lineHeight: 1.7 }}>How often should available time slots appear in the booking calendar?</p>
          <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "16px 20px", background: "var(--warm-white)", border: "1.5px solid var(--border)", marginBottom: 32 }}>
            <span style={{ fontSize: 14, fontWeight: 500, marginRight: 8 }}>Show slots every</span>
            {[15, 30, 60].map(mins => (
              <button key={mins} onClick={async () => {
                if (IS_DEMO) return;
                try {
                  await supabase.update("practitioners", { slot_interval: mins }, "id=eq." + prac.id, auth.access_token);
                  setPrac(prev => ({ ...prev, slot_interval: mins }));
                } catch (e) { console.error(e); }
              }} style={{
                padding: "10px 20px",
                background: (prac?.slot_interval || 30) === mins ? "var(--charcoal)" : "none",
                color: (prac?.slot_interval || 30) === mins ? "var(--cream)" : "var(--charcoal)",
                border: (prac?.slot_interval || 30) === mins ? "1.5px solid var(--charcoal)" : "1.5px solid var(--border)",
                cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 500, transition: "all .2s"
              }}>{mins} min</button>
            ))}
          </div>
          </>}
          
          {/* ── Weekly Hours ── */}
          <CollapsibleHeader title="Weekly Hours" open={schedOpen.hours} onToggle={() => setSchedOpen(o => ({ ...o, hours: !o.hours }))} />
          {schedOpen.hours && <>
          {availability.map((row, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: row.is_available ? "var(--warm-white)" : "transparent", border: "1.5px solid var(--border)", opacity: row.is_available ? 1 : .5, transition: "all .2s" }}>
                <button onClick={() => { const newVal = !row.is_available; updateAvail(i, "is_available", newVal); saveAvailability(i, { is_available: newVal }); }}
                  style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: row.is_available ? "var(--charcoal)" : "var(--border)", position: "relative", transition: "background .2s", flexShrink: 0 }}>
                  <span style={{ position: "absolute", top: 3, left: row.is_available ? 20 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s", display: "block" }} />
                </button>
                <div style={{ width: 80, fontSize: 13, fontWeight: row.is_available ? 500 : 300, color: row.is_available ? "var(--charcoal)" : "var(--warm-gray)", flexShrink: 0 }}>{DAY_NAMES[i]}</div>
                {row.is_available && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 11, color: "var(--warm-gray)", flexShrink: 0 }}>From</span>
                    <input type="time" value={row.start_time} onChange={e => updateAvail(i, "start_time", e.target.value)} onBlur={() => saveAvailability(i)}
                      style={{ padding: "6px 8px", border: "1.5px solid var(--border)", background: "var(--cream)", fontFamily: "'Outfit',sans-serif", fontSize: 12, outline: "none", flex: 1, minWidth: 0 }} />
                    <span style={{ fontSize: 11, color: "var(--warm-gray)", flexShrink: 0 }}>Until</span>
                    <input type="time" value={row.end_time} onChange={e => updateAvail(i, "end_time", e.target.value)} onBlur={() => saveAvailability(i)}
                      style={{ padding: "6px 8px", border: "1.5px solid var(--border)", background: "var(--cream)", fontFamily: "'Outfit',sans-serif", fontSize: 12, outline: "none", flex: 1, minWidth: 0 }} />
                  </div>
                )}
                {!row.is_available && <span style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300 }}>Not working</span>}
              </div>
              {row.is_available && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px 8px 54px", background: "var(--cream)", border: "1.5px solid var(--border)", borderTop: "none" }}>
                  <span style={{ fontSize: 11, color: "var(--warm-gray)", flexShrink: 0 }}>Break</span>
                  <input type="time" value={row.break_start || ""} placeholder="--:--"
                    onChange={e => updateAvail(i, "break_start", e.target.value || null)}
onBlur={() => saveAvailability(i, { break_start: row.break_start || null })}
                    style={{ padding: "5px 8px", border: "1.5px solid var(--border)", background: "var(--warm-white)", fontFamily: "'Outfit',sans-serif", fontSize: 12, outline: "none", width: 90 }} />
                  <span style={{ fontSize: 11, color: "var(--warm-gray)", flexShrink: 0 }}>for</span>
                  <select value={row.break_duration ?? ""}
  onChange={e => { const newDuration = e.target.value ? parseInt(e.target.value) : null; updateAvail(i, "break_duration", newDuration); saveAvailability(i, { break_duration: newDuration }); }}
                    style={{ padding: "5px 8px", border: "1.5px solid var(--border)", background: "var(--warm-white)", fontFamily: "'Outfit',sans-serif", fontSize: 12, outline: "none", color: "var(--charcoal)", cursor: "pointer" }}>
                    <option value="">No break</option>
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">1 hour</option>
                    <option value="90">1 hour 30 min</option>
                    <option value="120">2 hours</option>
                  </select>
                  {row.break_start && row.break_duration && (
                    <span style={{ fontSize: 11, color: "var(--gold)", fontWeight: 300, marginLeft: 4 }}>
                      {row.break_start.slice(0, 5)} – {(() => {
                        const [h, m] = row.break_start.split(":").map(Number);
                        const end = new Date(0, 0, 0, h, m + parseInt(row.break_duration));
                        return String(end.getHours()).padStart(2, "0") + ":" + String(end.getMinutes()).padStart(2, "0");
                      })()}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
          </>}

          {/* ── Custom Hours ── */}
          <CollapsibleHeader title="Custom Hours" open={schedOpen.custom} onToggle={() => setSchedOpen(o => ({ ...o, custom: !o.custom }))} />
          {schedOpen.custom && <>
          <p style={{ fontSize:14, color:"var(--warm-gray)", fontWeight:300, marginBottom:20, lineHeight:1.7 }}>Override your usual hours for a specific date — useful after a holiday or for an unusually long day.</p>
          <div style={{ marginBottom:24 }}>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"flex-end" }}>
              <div style={{ flex:"1 1 160px" }}>
                <label style={{ fontSize:11, color:"var(--warm-gray)", letterSpacing:"1px", textTransform:"uppercase", display:"block", marginBottom:6 }}>Date</label>
                <input type="date" value={newOverrideDate} onChange={e => setNewOverrideDate(e.target.value)} min={new Date().toISOString().split("T")[0]}
                  style={{ width:"100%", padding:"12px 16px", border:"1.5px solid var(--border)", background:"var(--warm-white)", fontFamily:"'Outfit',sans-serif", fontSize:14, outline:"none" }}/>
              </div>
              <div style={{ flex:"0 1 130px" }}>
                <label style={{ fontSize:11, color:"var(--warm-gray)", letterSpacing:"1px", textTransform:"uppercase", display:"block", marginBottom:6 }}>From</label>
                <input type="time" value={newOverrideStart} onChange={e => setNewOverrideStart(e.target.value)}
                  style={{ width:"100%", padding:"12px 16px", border:"1.5px solid var(--border)", background:"var(--warm-white)", fontFamily:"'Outfit',sans-serif", fontSize:14, outline:"none" }}/>
              </div>
              <div style={{ flex:"0 1 130px" }}>
                <label style={{ fontSize:11, color:"var(--warm-gray)", letterSpacing:"1px", textTransform:"uppercase", display:"block", marginBottom:6 }}>Until</label>
                <input type="time" value={newOverrideEnd} onChange={e => setNewOverrideEnd(e.target.value)}
                  style={{ width:"100%", padding:"12px 16px", border:"1.5px solid var(--border)", background:"var(--warm-white)", fontFamily:"'Outfit',sans-serif", fontSize:14, outline:"none" }}/>
              </div>
              <button onClick={async () => {
                if (!newOverrideDate || !newOverrideStart || !newOverrideEnd) return;
                if (newOverrideStart >= newOverrideEnd) { alert("End time must be after start time."); return; }
                setOverrideSaving(true);
                try {
                  const res = await supabase.insert("date_overrides", {
                    practitioner_id: prac.id,
                    override_date: newOverrideDate,
                    start_time: newOverrideStart,
                    end_time: newOverrideEnd,
                  }, auth.access_token);
                  setDateOverrides(prev => [...prev, res[0]].sort((a,b) => a.override_date.localeCompare(b.override_date)));
                  setNewOverrideDate(""); setNewOverrideStart(""); setNewOverrideEnd("");
                } catch(e) { console.error(e); alert("Error saving. That date may already have an override."); }
                setOverrideSaving(false);
              }} disabled={!newOverrideDate||!newOverrideStart||!newOverrideEnd||overrideSaving}
                style={{ padding:"12px 28px", background:"var(--charcoal)", color:"var(--cream)", border:"none", cursor:"pointer", fontFamily:"'Outfit',sans-serif", fontSize:12, fontWeight:500, letterSpacing:"2px", textTransform:"uppercase", opacity:newOverrideDate&&newOverrideStart&&newOverrideEnd&&!overrideSaving?1:.35, alignSelf:"flex-end" }}>
                Save
              </button>
            </div>
          </div>
          {dateOverrides.length === 0 ? (
            <div style={{ fontSize:14, color:"var(--warm-gray)", fontWeight:300, padding:"20px 0", marginBottom:16 }}>No custom hours set.</div>
          ) : (
            <div style={{ marginBottom:32 }}>
              {dateOverrides.map(o => (
                <div key={o.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 20px", background:"var(--warm-white)", border:"1.5px solid var(--border)", marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:500 }}>{new Date(o.override_date+"T12:00:00").toLocaleDateString("en-GB",{ weekday:"long", day:"numeric", month:"long", year:"numeric" })}</div>
                    <div style={{ fontSize:12, color:"var(--gold)", fontWeight:300, marginTop:2 }}>{o.start_time.slice(0,5)} – {o.end_time.slice(0,5)}</div>
                  </div>
                  <button onClick={async () => {
                    try {
                      await fetch(SUPABASE_URL+"/rest/v1/date_overrides?id=eq."+o.id, { method:"DELETE", headers:supabase.headers(auth.access_token) });
                      setDateOverrides(prev => prev.filter(x => x.id !== o.id));
                    } catch(e) { console.error(e); }
                  }} style={{ padding:"6px 14px", background:"none", color:"var(--red)", border:"1px solid var(--red)", cursor:"pointer", fontSize:11, fontWeight:600, letterSpacing:.5, textTransform:"uppercase", fontFamily:"'Outfit',sans-serif" }}>Remove</button>
                </div>
              ))}
            </div>
          )}
          </>}

          {/* ── Blocked Dates ── */}
          <CollapsibleHeader title="Blocked Dates" open={schedOpen.blocked} onToggle={() => setSchedOpen(o => ({ ...o, blocked: !o.blocked }))} />
          {schedOpen.blocked && <>
          <p style={{ fontSize: 13, color: "var(--warm-gray)", fontWeight: 300, marginBottom: 20, lineHeight: 1.7 }}>Block a full day off, or just specific hours within a day.</p>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button onClick={() => setBlockType("full")} style={{ padding: "10px 20px", background: blockType === "full" ? "var(--charcoal)" : "none", color: blockType === "full" ? "var(--cream)" : "var(--charcoal)", border: blockType === "full" ? "1.5px solid var(--charcoal)" : "1.5px solid var(--border)", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", transition: "all .2s" }}>Full Day</button>
              <button onClick={() => setBlockType("partial")} style={{ padding: "10px 20px", background: blockType === "partial" ? "var(--charcoal)" : "none", color: blockType === "partial" ? "var(--cream)" : "var(--charcoal)", border: blockType === "partial" ? "1.5px solid var(--charcoal)" : "1.5px solid var(--border)", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", transition: "all .2s" }}>Time Range</button>
              <button onClick={() => setBlockType("range")} style={{ padding: "10px 20px", background: blockType === "range" ? "var(--charcoal)" : "none", color: blockType === "range" ? "var(--cream)" : "var(--charcoal)", border: blockType === "range" ? "1.5px solid var(--charcoal)" : "1.5px solid var(--border)", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", transition: "all .2s" }}>Date Range</button>
            </div>
            {blockType === "range" ? (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 140px", minWidth: 0 }}>
                  <label style={{ fontSize: 10, color: "var(--warm-gray)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: 5 }}>From</label>
                  <input type="date" value={newBlock} onChange={e => setNewBlock(e.target.value)} min={new Date().toISOString().split("T")[0]} style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--border)", background: "var(--warm-white)", fontFamily: "'Outfit',sans-serif", fontSize: 13, outline: "none" }} />
                </div>
                <div style={{ flex: "1 1 140px", minWidth: 0 }}>
                  <label style={{ fontSize: 10, color: "var(--warm-gray)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: 5 }}>To</label>
                  <input type="date" value={newBlockRangeEnd} onChange={e => setNewBlockRangeEnd(e.target.value)} min={newBlock || new Date().toISOString().split("T")[0]} style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--border)", background: "var(--warm-white)", fontFamily: "'Outfit',sans-serif", fontSize: 13, outline: "none" }} />
                </div>
                <button onClick={addBlockedDate} disabled={!newBlock || !newBlockRangeEnd || blockSaving} style={{ padding: "8px 16px", background: "var(--charcoal)", color: "var(--cream)", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", opacity: newBlock && newBlockRangeEnd && !blockSaving ? 1 : .35, flexShrink: 0, alignSelf: "flex-end" }}>Block</button>
              </div>
            ) : blockType === "full" ? (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={{ fontSize: 10, color: "var(--warm-gray)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Date</label>
                  <input type="date" value={newBlock} onChange={e => setNewBlock(e.target.value)} min={new Date().toISOString().split("T")[0]} style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--border)", background: "var(--warm-white)", fontFamily: "'Outfit',sans-serif", fontSize: 13, outline: "none" }} />
                </div>
                <button onClick={addBlockedDate} disabled={!newBlock || blockSaving} style={{ padding: "8px 16px", background: "var(--charcoal)", color: "var(--cream)", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", opacity: newBlock && !blockSaving ? 1 : .35, flexShrink: 0, alignSelf: "flex-end" }}>Block</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label style={{ fontSize: 10, color: "var(--warm-gray)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Date</label>
                    <input type="date" value={newBlock} onChange={e => setNewBlock(e.target.value)} min={new Date().toISOString().split("T")[0]} style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--border)", background: "var(--warm-white)", fontFamily: "'Outfit',sans-serif", fontSize: 13, outline: "none" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label style={{ fontSize: 10, color: "var(--warm-gray)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: 5 }}>From</label>
                    <input type="time" value={newBlockStart} onChange={e => setNewBlockStart(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--border)", background: "var(--warm-white)", fontFamily: "'Outfit',sans-serif", fontSize: 13, outline: "none" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label style={{ fontSize: 10, color: "var(--warm-gray)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Until</label>
                    <input type="time" value={newBlockEnd} onChange={e => setNewBlockEnd(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--border)", background: "var(--warm-white)", fontFamily: "'Outfit',sans-serif", fontSize: 13, outline: "none" }} />
                  </div>
                </div>
                <button onClick={addBlockedDate} disabled={!newBlock || blockSaving || !newBlockStart || !newBlockEnd} style={{ width: "100%", padding: "8px 16px", background: "var(--charcoal)", color: "var(--cream)", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", opacity: newBlock && newBlockStart && newBlockEnd && !blockSaving ? 1 : .35 }}>Block</button>
              </div>
            )}
          </div>
          {blockedDates.length === 0 ? (
            <div style={{ fontSize: 14, color: "var(--warm-gray)", fontWeight: 300, padding: "20px 0" }}>No dates blocked.</div>
          ) : (
            blockedDates.map(b => (
              <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", background: "var(--warm-white)", border: "1.5px solid var(--border)", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{new Date(b.blocked_date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
                  <div style={{ fontSize: 12, color: b.start_time ? "var(--gold)" : "var(--warm-gray)", fontWeight: 300, marginTop: 2 }}>
                    {b.start_time && b.end_time ? b.start_time.slice(0, 5) + " – " + b.end_time.slice(0, 5) : "All day"}
                  </div>
                </div>
                <button onClick={() => removeBlockedDate(b.id)} style={{ padding: "6px 14px", background: "none", color: "var(--red)", border: "1px solid var(--red)", cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: .5, textTransform: "uppercase", fontFamily: "'Outfit',sans-serif" }}>Remove</button>
              </div>
            ))
          )}
          </>}

          {/* ── Calendar Sync ── */}
          <CollapsibleHeader title="Calendar Sync" open={schedOpen.sync} onToggle={() => setSchedOpen(o => ({ ...o, sync: !o.sync }))} />
          {schedOpen.sync && <>
          <p style={{ fontSize: 14, color: "var(--warm-gray)", fontWeight: 300, lineHeight: 1.7, marginBottom: 20 }}>Subscribe to your personal calendar feed to see all your bookings in Google Calendar or Apple Calendar.</p>
          <div style={{ padding: "20px 24px", background: "var(--warm-white)", border: "1.5px solid var(--border)", marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "var(--warm-gray)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 10 }}>Your calendar link</div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <input readOnly value={"https://rousxlmxmjrkyvczbtan.supabase.co/functions/v1/practitioner-calendar?token=" + (prac?.calendar_token || "")}
                style={{ flex: 1, padding: "10px 14px", border: "1.5px solid var(--border)", background: "var(--cream)", fontFamily: "'Outfit',sans-serif", fontSize: 12, color: "var(--warm-gray)", outline: "none", minWidth: 0 }}
                onClick={e => e.target.select()} />
              <button onClick={() => { navigator.clipboard.writeText("https://rousxlmxmjrkyvczbtan.supabase.co/functions/v1/practitioner-calendar?token=" + (prac?.calendar_token || "")); alert("Calendar link copied!"); }}
                style={{ padding: "10px 20px", background: "var(--charcoal)", color: "var(--cream)", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", whiteSpace: "nowrap" }}>Copy Link</button>
            </div>
          </div>
          <p style={{ fontSize: 13, color: "var(--warm-gray)", fontWeight: 300, lineHeight: 1.7 }}>
            <strong>Google Calendar:</strong> Open Google Calendar → Other calendars → + → From URL → paste link<br />
            <strong>Apple Calendar:</strong> File → New Calendar Subscription → paste link
          </p>
          </>}
        </div>
      )}

      {tab === "reports" && <ReportTab prac={prac} token={auth.access_token} />}
    </div>
  );
}
