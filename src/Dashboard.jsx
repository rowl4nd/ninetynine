// src/Dashboard.jsx — Staff-facing portal
// Login, Bookings (week view calendar), My Services, My Schedule

import React, { useState, useEffect, useRef } from "react";
import { supabase, SUPABASE_URL, IS_DEMO } from "./supabase.js";
import {
  DEMO_PRACTITIONERS, DEMO_SERVICES_LIST,
  getDaysInMonth, getMonthName, getDayName, dateStr,
  useAvailableSlots, SvcItem,
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
  const [hasAddon, setHasAddon] = useState(!!existingService?.addon);
  const [addonTitle, setAddonTitle] = useState(existingService?.addon?.title || "");
  const [addonDuration, setAddonDuration] = useState(existingService?.addon?.duration?.toString() || "15");
  const [addonPrice, setAddonPrice] = useState(existingService?.addon?.price?.toString() || "");
  const [saving, setSaving] = useState(false);
  const finalGroupName = showNewGroup ? newGroupName : groupName;

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
      if (hasAddon && addonTitle && addonDuration && addonPrice) {
        if (existingService?.addon) {
          await supabase.update("custom_service_addons",
            { title: addonTitle, duration: parseInt(addonDuration), price: parseFloat(addonPrice) },
            "id=eq." + existingService.addon.id, token);
        } else {
          await supabase.insert("custom_service_addons", {
            service_id: serviceId, title: addonTitle,
            duration: parseInt(addonDuration), price: parseFloat(addonPrice),
          }, token);
        }
      } else if (!hasAddon && existingService?.addon) {
        await fetch(SUPABASE_URL + "/rest/v1/custom_service_addons?id=eq." + existingService.addon.id, {
          method: "DELETE", headers: supabase.headers(token),
        });
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
        <div><label className="nn-input-label">Description (optional)</label><input className="nn-input" type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Includes removal of previous set" /></div>
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ flex: 1 }}><label className="nn-input-label">Duration (minutes)</label><input className="nn-input" type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="45" /></div>
          <div style={{ flex: 1 }}><label className="nn-input-label">Price (£)</label><input className="nn-input" type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="30" /></div>
        </div>
        <div style={{ padding: "16px 20px", background: "var(--warm-white)", border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: hasAddon ? 16 : 0 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Optional add-on</div>
              <div style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300, marginTop: 2 }}>e.g. Nail Art, Brow Tint</div>
            </div>
            <button onClick={() => setHasAddon(o => !o)} style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: hasAddon ? "var(--charcoal)" : "var(--border)", position: "relative", transition: "background .2s", flexShrink: 0 }}>
              <span style={{ position: "absolute", top: 3, left: hasAddon ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s", display: "block" }} />
            </button>
          </div>
          {hasAddon && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><label className="nn-input-label">Add-on Title</label><input className="nn-input" type="text" value={addonTitle} onChange={e => setAddonTitle(e.target.value)} placeholder="e.g. Nail Art" /></div>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}><label className="nn-input-label">Duration (minutes)</label><input className="nn-input" type="number" value={addonDuration} onChange={e => setAddonDuration(e.target.value)} placeholder="15" /></div>
                <div style={{ flex: 1 }}><label className="nn-input-label">Price (£)</label><input className="nn-input" type="number" value={addonPrice} onChange={e => setAddonPrice(e.target.value)} placeholder="10" /></div>
              </div>
            </div>
          )}
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
        {svc.description && <div style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300, marginTop: 2 }}>{svc.description}</div>}
        <div style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300, marginTop: 4 }}>{svc.duration} min · £{svc.price}</div>
        {svc.addon && (
          <div style={{ marginTop: 8, padding: "8px 12px", background: "var(--cream)", border: "1px solid var(--border)", fontSize: 12 }}>
            <span style={{ color: "var(--gold)", fontWeight: 500 }}>+ Add-on: </span>
            {svc.addon.title} · {svc.addon.duration} min · £{svc.addon.price}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button onClick={onEdit} style={{ padding: "6px 14px", background: "none", color: "var(--charcoal)", border: "1px solid var(--border)", cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: .5, textTransform: "uppercase", fontFamily: "'Outfit',sans-serif" }}>Edit</button>
        <button onClick={onRemove} style={{ padding: "6px 14px", background: "none", color: "var(--red)", border: "1px solid var(--red)", cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: .5, textTransform: "uppercase", fontFamily: "'Outfit',sans-serif" }}>Remove</button>
      </div>
    </div>
  );
}

// ============================================================
// STAFF BOOKING FORM
// ============================================================

function StaffBookingForm({ prac, services, token, onDone, onCancel }) {
  const [step, setStep] = useState(1);
  const [svc, setSvc] = useState(null);
  const [addon, setAddon] = useState(null);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const now = new Date();
  const [cM, setCM] = useState(now.getMonth());
  const [cY, setCY] = useState(now.getFullYear());

  const totalDuration = (svc?.duration || 0) + (addon ? addon.duration : 0);
  const totalPrice = (svc?.price || 0) + (addon ? addon.price : 0);
  const { slots, loading: slotsLoading } = useAvailableSlots(prac?.id, date, totalDuration, prac?.slot_interval || 30);

  const groups = [...new Set(services.filter(s => s.group_name).map(s => s.group_name))];
  const ungrouped = services.filter(s => !s.group_name);

  async function handleSave() {
    if (!svc || !date || !time || !clientName || !phone) return;
    setSaving(true);
    try {
      if (IS_DEMO) { setDone(true); setSaving(false); return; }
      await supabase.insert("bookings", {
        practitioner_id: prac.id,
        service_id: svc.id,
        service_title: svc.title + (addon ? " + " + addon.title : ""),
        client_name: clientName,
        client_phone: phone,
        client_email: email,
        booking_date: dateStr(date.year, date.month, date.day),
        booking_time: time + ":00",
        duration: totalDuration,
        price: totalPrice,
        booked_by: "staff",
        notes: (addon ? "Add-on: " + addon.title + ". " : "") + (notes || ""),
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
          {clientName} is booked in for {svc?.title} on {getDayName(date.year, date.month, date.day)} {date.day} {getMonthName(date.month)} at {time}.
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
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 300 }}>Add a booking</div>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--warm-gray)", fontFamily: "'Outfit',sans-serif" }}>✕ Cancel</button>
      </div>

      {step === 1 && (
        <div>
          <H3>Select a service</H3>
          {services.length === 0 ? (
            <div style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300, padding: "20px 0" }}>No services set up yet. Add services in the "My Services" tab first.</div>
          ) : (
            <div>
              {groups.map(group => (
                <div key={group} style={{ marginBottom: 24 }}>
                  <div className="nn-svc-group-label">{group}</div>
                  {services.filter(s => s.group_name === group).map(s => (
                    <SvcItem key={s.id} s={s} picked={svc?.id === s.id} onSelect={() => { setSvc(s); setAddon(null); }} />
                  ))}
                </div>
              ))}
              {ungrouped.length > 0 && (
                <div>
                  {groups.length > 0 && <div className="nn-svc-group-label">Other</div>}
                  {ungrouped.map(s => (
                    <SvcItem key={s.id} s={s} picked={svc?.id === s.id} onSelect={() => { setSvc(s); setAddon(null); }} />
                  ))}
                </div>
              )}
            </div>
          )}
          {svc?.addon && (
            <div style={{ marginTop: 24, padding: "20px", background: "var(--cream)", border: "1.5px solid var(--border)" }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Optional add-on</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setAddon(null)} style={{ flex: 1, padding: "12px", background: !addon ? "var(--charcoal)" : "var(--warm-white)", color: !addon ? "var(--cream)" : "var(--charcoal)", border: "1.5px solid " + (addon ? "var(--border)" : "var(--charcoal)"), cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 13 }}>No add-on</button>
                <button onClick={() => setAddon(svc.addon)} style={{ flex: 1, padding: "12px", background: addon ? "var(--charcoal)" : "var(--warm-white)", color: addon ? "var(--cream)" : "var(--charcoal)", border: "1.5px solid " + (addon ? "var(--charcoal)" : "var(--border)"), cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 13 }}>{svc.addon.title} (+£{svc.addon.price})</button>
              </div>
            </div>
          )}
          <div className="nn-booking-nav">
            <button className="nn-btn-back" onClick={onCancel}>Cancel</button>
            <button className="nn-btn nn-btn-dark" onClick={() => setStep(2)} disabled={!svc} style={{ opacity: svc ? 1 : .35 }}>Continue</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <H3>Pick a date &amp; time</H3>
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
                    const sun = new Date(cY, cM, d).getDay() === 0;
                    const sel = date && date.day === d && date.month === cM && date.year === cY;
                    cells.push(<button key={d} className={"nn-cal-day" + (sel ? " on" : "") + (past || sun ? " off" : "") + (isNow ? " now" : "")}
                      onClick={() => { if (!past && !sun) { setDate({ day: d, month: cM, year: cY }); setTime(null); } }} disabled={past || sun}>{d}</button>);
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
                {slotsLoading ? (
                  <div style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300 }}>Loading times...</div>
                ) : slots.length === 0 ? (
                  <div style={{ color: "var(--red)", fontSize: 14, fontWeight: 300 }}>No available slots. Try another day.</div>
                ) : (
                  <div className="nn-times">{slots.map(t => <button key={t} className={"nn-time" + (time === t ? " on" : "")} onClick={() => setTime(t)}>{t}</button>)}</div>
                )}
              </div>
            )}
          </div>
          <div className="nn-booking-nav">
            <button className="nn-btn-back" onClick={() => setStep(1)}>Back</button>
            <button className="nn-btn nn-btn-dark" onClick={() => setStep(3)} disabled={!date || !time} style={{ opacity: date && time ? 1 : .35 }}>Continue</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <H3>Client details</H3>
          <div style={{ background: "var(--cream)", border: "1px solid var(--border)", padding: 32, marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: 14 }}>
              <span style={{ color: "var(--warm-gray)", fontWeight: 300 }}>Service</span>
              <span style={{ fontWeight: 500 }}>{svc?.title}{addon ? " + " + addon.title : ""}</span>
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
            <button className="nn-btn-back" onClick={() => setStep(2)}>Back</button>
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

function WeekView({ bookings, loading, prac, token, onAddBooking, onStatusChange, onReschedule }) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [sheet, setSheet] = useState(null);
  const [sheetMode, setSheetMode] = useState("detail");
  const [clientHistory, setClientHistory] = useState(null);
  const [clientHistoryLoading, setClientHistoryLoading] = useState(false);
  const [nowTop, setNowTop] = useState(null);
  const [nowDayIdx, setNowDayIdx] = useState(null);
  const datePickerRef = useRef(null);
  const scrollContainerRef = useRef(null);

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

  const { slots: editSlots, loading: editSlotsLoading } = useAvailableSlots(
    sheet?.practitioner_id, editDate, sheet?.duration, prac?.slot_interval || 30
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
  setSheet(b);
  setSheetMode("detail");
  setEditDate(null);
  setEditTime(null);
  setEditCM(now.getMonth());
  setEditCY(now.getFullYear());
  setClientHistory(null);
}

  function closeSheet() {
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

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekLabel = `${fmtShortDate(weekStart)} – ${fmtShortDate(addDays(weekStart, 6))}`;
  const DAY_NAMES_SHORT = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  const bookingsByDate = {};
  bookings.forEach(b => {
    if (!bookingsByDate[b.booking_date]) bookingsByDate[b.booking_date] = [];
    bookingsByDate[b.booking_date].push(b);
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
                    {dayBookings.map(b => {
                      const { top, height } = bookingStyle(b);
                      return (
                        <div key={b.id} onClick={() => openSheet(b)}
                          style={{ position: "absolute", top, height, left: 2, right: 2, background: "var(--gold)", borderLeft: "3px solid var(--charcoal)", borderRadius: 2, padding: "3px 6px", cursor: "pointer", overflow: "hidden", zIndex: 2, transition: "filter .15s" }}
                          onMouseEnter={e => e.currentTarget.style.filter = "brightness(.9)"}
                          onMouseLeave={e => e.currentTarget.style.filter = "none"}>
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

      {sheet && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(44,40,37,.4)", zIndex: 300 }} onClick={closeSheet} />
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
                <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
                  <button onClick={closeSheet} style={{ flex: 1, padding: "14px", background: "none", border: "1.5px solid var(--border)", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--charcoal)" }}>Close</button>
                  <button onClick={() => setSheetMode("edit")} style={{ flex: 1, padding: "14px", background: "var(--charcoal)", color: "var(--cream)", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase" }}>Edit</button>
                  <button onClick={() => { if (window.confirm("Are you sure you want to cancel this booking for " + sheet.client_name + "?")) { onStatusChange(sheet.id, "cancelled"); closeSheet(); } }}
                    style={{ flex: 1, padding: "14px", background: "none", color: "var(--red)", border: "1px solid var(--red)", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase" }}>Cancel</button>
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
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================

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
  const [blockSaving, setBlockSaving] = useState(false);
const [dateOverrides, setDateOverrides] = useState([]);
const [newOverrideDate, setNewOverrideDate] = useState("");
const [newOverrideStart, setNewOverrideStart] = useState("");
const [newOverrideEnd, setNewOverrideEnd] = useState("");
const [overrideSaving, setOverrideSaving] = useState(false);
  const [showStaffBooking, setShowStaffBooking] = useState(false);
  const [staffBookServices, setStaffBookServices] = useState([]);
  const [stripeConnecting, setStripeConnecting] = useState(false);
  const [depositSaving, setDepositSaving] = useState(false);
  const [depositAmountInput, setDepositAmountInput] = useState("");
  const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // Handle Stripe Connect return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeStatus = params.get("stripe");
    if (stripeStatus === "success") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

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
          setDepositAmountInput(String(pracs[0].deposit_amount || 10));
        } else localStorage.removeItem("nn_session");
      } catch (e) { localStorage.removeItem("nn_session"); }
    }
    restoreSession();
  }, []);

  async function handleLogin(e) {
    e.preventDefault(); setLoginErr("");
    if (IS_DEMO) { setAuth({ access_token: "demo" }); setPrac(DEMO_PRACTITIONERS[0]); return; }
    try {
      const session = await supabase.signIn(loginEmail, loginPass);
      setAuth(session);
      const pracs = await supabase.query("practitioners", { filters: "&user_id=eq." + session.user.id, token: session.access_token });
      if (pracs.length > 0) {
        setPrac(pracs[0]);
        setDepositAmountInput(String(pracs[0].deposit_amount || 10));
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

  async function saveDepositSettings(enabled, amount) {
    if (IS_DEMO) return;
    setDepositSaving(true);
    try {
      const amt = parseInt(amount) || 10;
      await supabase.update("practitioners",
        { deposits_enabled: enabled, deposit_amount: amt },
        "id=eq." + prac.id, auth.access_token
      );
      setPrac(prev => ({ ...prev, deposits_enabled: enabled, deposit_amount: amt }));
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
      filters: "&practitioner_id=eq." + prac.id + "&booking_date=gte." + rangeStart.toISOString().split("T")[0] + "&booking_date=lte." + rangeEnd.toISOString().split("T")[0] + "&status=eq.confirmed&order=booking_date,booking_time",
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
  }, [auth, prac, tab]);

  useEffect(() => {
    if (!auth || !prac || !showStaffBooking) return;
    if (IS_DEMO) { setStaffBookServices(DEMO_SERVICES_LIST); return; }
    supabase.query("custom_services", {
      select: "*,addon:custom_service_addons(*)",
      filters: "&practitioner_id=eq." + prac.id + "&is_active=eq.true&order=group_order,service_order,created_at",
      token: auth.access_token,
    }).then(rows => setStaffBookServices(rows.map(s => ({ ...s, addon: s.addon?.[0] || null })))).catch(console.error);
  }, [auth, prac, showStaffBooking]);

  function refreshBookings() {
    if (!auth || !prac || IS_DEMO) return;
    const n = new Date();
    const rangeStart = new Date(n); rangeStart.setMonth(rangeStart.getMonth() - 1);
    const rangeEnd = new Date(n); rangeEnd.setMonth(rangeEnd.getMonth() + 3);
    supabase.query("bookings", {
      select: "*",
      filters: "&practitioner_id=eq." + prac.id + "&booking_date=gte." + rangeStart.toISOString().split("T")[0] + "&booking_date=lte." + rangeEnd.toISOString().split("T")[0] + "&status=eq.confirmed&order=booking_date,booking_time",
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
}

  useEffect(() => {
    if (!auth || !prac || tab !== "services") return;
    if (IS_DEMO) { setCustomServices([]); return; }
    loadServices();
  }, [auth, prac, tab]);

  function loadServices() {
    if (!auth || !prac) return;
    supabase.query("custom_services", {
      select: "*,addon:custom_service_addons(*)",
      filters: "&practitioner_id=eq." + prac.id + "&is_active=eq.true&order=group_order,service_order,created_at",
      token: auth.access_token,
    }).then(rows => setCustomServices(rows.map(s => ({ ...s, addon: s.addon?.[0] || null })))).catch(console.error);
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
break_duration: row.break_start ? (parseInt(row.break_duration) || 60) : null,      };
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
  const stripeConnected = !!prac?.stripe_account_id;

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

      <div className="nn-dash-tabs">
        <button className={"nn-dash-tab" + (tab === "bookings" ? " on" : "")} onClick={() => setTab("bookings")}>Bookings</button>
        <button className={"nn-dash-tab" + (tab === "services" ? " on" : "")} onClick={() => setTab("services")}>My Services</button>
        <button className={"nn-dash-tab" + (tab === "schedule" ? " on" : "")} onClick={() => setTab("schedule")}>My Schedule</button>
      </div>

      {tab === "bookings" && (
        <div>
          {showStaffBooking ? (
            <StaffBookingForm prac={prac} services={staffBookServices} token={auth.access_token}
              onDone={() => { setShowStaffBooking(false); refreshBookings(); }}
              onCancel={() => setShowStaffBooking(false)} />
          ) : (
            <WeekView bookings={confirmedBookings} loading={loading} prac={prac} token={auth.access_token}
              onAddBooking={() => setShowStaffBooking(true)}
              onStatusChange={updateStatus}
              onReschedule={rescheduleBooking} />
          )}
        </div>
      )}

      {tab === "services" && (
        <div style={{ maxWidth: 680 }}>
          <p style={{ fontSize: 14, color: "var(--warm-gray)", fontWeight: 300, marginBottom: 32, lineHeight: 1.7 }}>
            Add and manage your own services. Clients will see these when booking with you.
          </p>
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

          {/* ── Stripe Connect ── */}
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 400, marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 20, height: 1.5, background: "var(--gold)", display: "inline-block" }} />Payments
          </div>
          <p style={{ fontSize: 14, color: "var(--warm-gray)", fontWeight: 300, marginBottom: 20, lineHeight: 1.7 }}>
            Connect your Stripe account to accept booking deposits. Deposits go directly to your account.
          </p>
          <div style={{ padding: "20px 24px", background: "var(--warm-white)", border: "1.5px solid var(--border)", marginBottom: 12 }}>
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
          <p style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300, lineHeight: 1.6, marginBottom: 40 }}>
            You'll be taken to Stripe to set up your account. This takes about 5 minutes. Once connected, you can enable deposits below.
          </p>

          {/* ── Deposits ── */}
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 400, marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 20, height: 1.5, background: "var(--gold)", display: "inline-block" }} />Deposits
          </div>
          <p style={{ fontSize: 14, color: "var(--warm-gray)", fontWeight: 300, marginBottom: 20, lineHeight: 1.7 }}>
            Require clients to pay a deposit when booking. Full refund if cancelled more than 48 hours before the appointment.
          </p>
          <div style={{ padding: "20px 24px", background: "var(--warm-white)", border: "1.5px solid var(--border)", marginBottom: 8, opacity: stripeConnected ? 1 : .45 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: prac?.deposits_enabled ? 20 : 0 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>Require deposit</div>
                <div style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300 }}>
                  {stripeConnected ? "Clients pay this when booking" : "Connect Stripe above to enable deposits"}
                </div>
              </div>
              <button
                disabled={!stripeConnected || depositSaving}
                onClick={() => saveDepositSettings(!prac?.deposits_enabled, depositAmountInput)}
                style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: stripeConnected ? "pointer" : "not-allowed", background: prac?.deposits_enabled ? "var(--charcoal)" : "var(--border)", position: "relative", transition: "background .2s", flexShrink: 0 }}>
                <span style={{ position: "absolute", top: 3, left: prac?.deposits_enabled ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s", display: "block" }} />
              </button>
            </div>
            {prac?.deposits_enabled && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                <span style={{ fontSize: 14, fontWeight: 300, color: "var(--warm-gray)" }}>Deposit amount</span>
                <div style={{ display: "flex", alignItems: "center", gap: 4, border: "1.5px solid var(--border)", background: "var(--cream)", padding: "8px 12px" }}>
                  <span style={{ fontSize: 15, fontWeight: 500, color: "var(--warm-gray)" }}>£</span>
                  <input
                    type="number" min="1" max="100"
                    value={depositAmountInput}
                    onChange={e => setDepositAmountInput(e.target.value)}
                    onBlur={() => saveDepositSettings(true, depositAmountInput)}
                    style={{ width: 56, border: "none", background: "transparent", fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 500, outline: "none", color: "var(--charcoal)" }}
                  />
                </div>
                <span style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300 }}>charged at booking</span>
                {depositSaving && <span style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300 }}>Saving...</span>}
              </div>
            )}
          </div>
          {!stripeConnected && (
            <p style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300, marginBottom: 40 }}>Connect Stripe above to enable deposits.</p>
          )}
          {stripeConnected && (
            <p style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300, lineHeight: 1.6, marginBottom: 40 }}>
              Deposits are refunded automatically if a client cancels more than 48 hours before their appointment.
            </p>
          )}

          {/* ── Weekly Hours ── */}
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 400, marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 20, height: 1.5, background: "var(--gold)", display: "inline-block" }} />Weekly Hours
          </div>
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
                    onBlur={() => saveAvailability(i)}
                    style={{ padding: "5px 8px", border: "1.5px solid var(--border)", background: "var(--warm-white)", fontFamily: "'Outfit',sans-serif", fontSize: 12, outline: "none", width: 90 }} />
                  <span style={{ fontSize: 11, color: "var(--warm-gray)", flexShrink: 0 }}>for</span>
                  <select value={row.break_duration || "60"}
  onChange={e => { updateAvail(i, "break_duration", e.target.value ? parseInt(e.target.value) : null); setTimeout(() => saveAvailability(i), 100); }}
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

          {/* ── Booking Window ── */}
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 400, margin: "40px 0 20px", paddingBottom: 12, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 20, height: 1.5, background: "var(--gold)", display: "inline-block" }} />Booking Window
          </div>
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

          {/* ── Blocked Dates ── */}
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:400, margin:"40px 0 20px", paddingBottom:12, borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ width:20, height:1.5, background:"var(--gold)", display:"inline-block" }}/>Custom Hours
          </div>
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
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:400, margin:"40px 0 20px", paddingBottom:12, borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ width:20, height:1.5, background:"var(--gold)", display:"inline-block" }}/>Blocked Dates
          </div>
          <p style={{ fontSize: 13, color: "var(--warm-gray)", fontWeight: 300, marginBottom: 20, lineHeight: 1.7 }}>Block a full day off, or just specific hours within a day.</p>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button onClick={() => setBlockType("full")} style={{ padding: "10px 20px", background: blockType === "full" ? "var(--charcoal)" : "none", color: blockType === "full" ? "var(--cream)" : "var(--charcoal)", border: blockType === "full" ? "1.5px solid var(--charcoal)" : "1.5px solid var(--border)", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", transition: "all .2s" }}>Full Day</button>
              <button onClick={() => setBlockType("partial")} style={{ padding: "10px 20px", background: blockType === "partial" ? "var(--charcoal)" : "none", color: blockType === "partial" ? "var(--cream)" : "var(--charcoal)", border: blockType === "partial" ? "1.5px solid var(--charcoal)" : "1.5px solid var(--border)", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", transition: "all .2s" }}>Time Range</button>
            </div>
            {blockType === "full" ? (
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

          {/* ── Booking Slots ── */}
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 400, margin: "40px 0 20px", paddingBottom: 12, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 20, height: 1.5, background: "var(--gold)", display: "inline-block" }} />Booking Slots
          </div>
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

          {/* ── Calendar Sync ── */}
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 400, margin: "40px 0 20px", paddingBottom: 12, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 20, height: 1.5, background: "var(--gold)", display: "inline-block" }} />Calendar Sync
          </div>
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
        </div>
      )}
    </div>
  );
}
