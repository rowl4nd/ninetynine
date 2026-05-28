// src/Dashboard.jsx — Staff-facing portal

import React, { useState, useEffect, useRef } from "react";
import { supabase, SUPABASE_URL, IS_DEMO } from "./supabase.js";
import {
  DEMO_PRACTITIONERS, DEMO_SERVICES_LIST,
  getDaysInMonth, getMonthName, getDayName, dateStr,
  useAvailableSlots, SvcItem,
} from "./shared.jsx";

// ============================================================
// NEW MOBILE-FIRST WEEKLY SCHEDULE VIEW
// ============================================================
function WeeklyStaffSchedule({ bookings, prac, onOpenBooking }) {
  const START_HOUR = 7; // 7 AM
  const END_HOUR = 21;  // 9 PM
  const TOTAL_HOURS = END_HOUR - START_HOUR;

  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(
    new Date().toISOString().split("T")[0]
  );

  const getWeekDates = (start) => {
    const dates = [];
    const temp = new Date(start);
    const day = temp.getDay();
    const diff = temp.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(temp.setDate(diff));

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const weekDates = getWeekDates(currentWeekStart);

  const changeWeek = (direction) => {
    const next = new Date(currentWeekStart);
    next.setDate(currentWeekStart.getDate() + direction * 7);
    setCurrentWeekStart(next);
  };

  const getBookingStyles = (bookingTimeStr, durationMinutes) => {
    if (!bookingTimeStr) return { display: "none" };
    const [hours, minutes] = bookingTimeStr.split(":").map(Number);
    const decimalHours = hours + minutes / 60;
    const hoursFromStart = decimalHours - START_HOUR;
    const hourRowHeight = 60; // 1px = 1 minute

    const top = hoursFromStart * hourRowHeight;
    const height = (durationMinutes / 60) * hourRowHeight;

    return {
      position: "absolute",
      top: `${top}px`,
      height: `${height}px`,
      left: "12px",
      right: "12px",
    };
  };

  const activeDayBookings = bookings.filter(
    (b) => b.booking_date === selectedDateStr && b.status !== "cancelled"
  );

  return (
    <div style={{ background: "var(--cream)", fontFamily: "'Outfit', sans-serif" }}>
      
      {/* Week Navigation Header */}
      <div style={{ padding: "16px", background: "var(--warm-white)", borderBottom: "1.5px solid var(--border)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <button onClick={() => changeWeek(-1)} style={navBtnStyle}>‹ Prev Week</button>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px", fontWeight: 500 }}>
            {weekDates[0].toLocaleDateString("en-GB", { month: "short", day: "numeric" })} – {weekDates[6].toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" })}
          </span>
          <button onClick={() => changeWeek(1)} style={navBtnStyle}>Next Week ›</button>
        </div>

        {/* Horizontal Mobile Day Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: "4px" }}>
          {weekDates.map((date) => {
            const dStr = date.toISOString().split("T")[0];
            const isSelected = dStr === selectedDateStr;
            const dayName = date.toLocaleDateString("en-GB", { weekday: "short" });
            const dayNum = date.getDate();

            return (
              <button
                key={dStr}
                onClick={() => setSelectedDateStr(dStr)}
                style={{
                  flex: 1,
                  padding: "10px 4px",
                  background: isSelected ? "var(--charcoal)" : "none",
                  color: isSelected ? "var(--cream)" : "var(--charcoal)",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "11px", textTransform: "uppercase", opacity: isSelected ? 0.8 : 0.6, fontWeight: 300 }}>{dayName}</div>
                <div style={{ fontSize: "16px", fontWeight: 600, marginTop: "2px" }}>{dayNum}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hourly Timeline Grid */}
      <div style={{ padding: "20px 16px", position: "relative" }}>
        <div style={{ position: "relative", height: `${TOTAL_HOURS * 60}px` }}>
          
          {Array.from({ length: TOTAL_HOURS + 1 }).map((_, index) => {
            const currentHour = START_HOUR + index;
            const displayTime = currentHour > 12 ? `${currentHour - 12} PM` : currentHour === 12 ? "12 PM" : `${currentHour} AM`;
            
            return (
              <div key={currentHour} style={{ position: "absolute", top: `${index * 60}px`, left: 0, right: 0, height: "60px", borderTop: "1px dashed var(--border)" }}>
                <span style={{ position: "absolute", top: "-10px", left: 0, fontSize: "11px", color: "var(--warm-gray)", background: "var(--cream)", paddingRight: "6px", fontWeight: 300 }}>
                  {displayTime}
                </span>
              </div>
            );
          })}

          {/* Booking Cards Stacked Visually */}
          {activeDayBookings.map((booking) => {
            const blockStyle = getBookingStyles(booking.booking_time, booking.duration);
            return (
              <div
                key={booking.id}
                onClick={() => onOpenBooking(booking)}
                style={{
                  ...blockStyle,
                  background: "var(--warm-white)",
                  borderLeft: "4px solid var(--gold)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  borderTop: "1px solid var(--border)",
                  borderRight: "1px solid var(--border)",
                  borderBottom: "1px solid var(--border)",
                  borderRadius: "0 4px 4px 0",
                  padding: "6px 10px",
                  cursor: "pointer",
                  overflow: "hidden",
                  zIndex: 2,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}
              >
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--charcoal)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {booking.client_name}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--warm-gray)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {booking.service_title}
                  </div>
                </div>
                <div style={{ fontSize: "10px", color: "var(--warm-gray)", textAlign: "right" }}>
                  {booking.booking_time?.slice(0, 5)} ({booking.duration}m)
                </div>
              </div>
            );
          })}

          {activeDayBookings.length === 0 && (
            <div style={{ textAlign: "center", padding: "80px 0", color: "var(--warm-gray)", fontSize: "14px", fontWeight: 300 }}>
              No appointments scheduled for this day.
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

const navBtnStyle = {
  background: "none",
  border: "1px solid var(--border)",
  padding: "6px 12px",
  fontFamily: "'Outfit', sans-serif",
  fontSize: "12px",
  cursor: "pointer",
  color: "var(--charcoal)"
};

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
                style={{ flex: 1, padding: "14px 18px", border: "1.5px solid var(--border)", background: "var(--warm-white)", fontFamily: "'Outfit',sans-serif", fontSize: 15, outline: "none", color: "var(--charcoal)", cursor: "pointer" }}>
                <option value="">No group</option>
                {existingGroups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <button onClick={() => { setShowNewGroup(true); setGroupName(""); }}
                style={{ padding: "14px 20px", background: "none", border: "1.5px solid var(--border)", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: "1px", textTransform: "uppercase", color: "var(--charcoal)", whiteSpace: "nowrap" }}>
                + New Group
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
      const serviceTitle = svc.title + (addon ? " + " + addon.title : "");
      await supabase.insert("bookings", {
        practitioner_id: prac.id,
        service_id: svc.id,
        service_title: serviceTitle,
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
    } catch (e) {
      console.error(e);
      alert("Error creating booking. Please try again.");
    }
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
                <button onClick={() => setAddon(null)} style={{ flex: 1, padding: "12px", background: !addon ? "var(--charcoal)" : "var(--warm-white)", color: !addon ? "var(--cream)" : "var(--charcoal)", border: "1.5px solid " + (addon ? "var(--border)" : "var(--charcoal)"), cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 400 }}>No add-on</button>
                <button onClick={() => setAddon(svc.addon)} style={{ flex: 1, padding: "12px", background: addon ? "var(--charcoal)" : "var(--warm-white)", color: addon ? "var(--cream)" : "var(--charcoal)", border: "1.5px solid " + (addon ? "var(--charcoal)" : "var(--border)"), cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 400 }}>{svc.addon.title} (+£{svc.addon.price})</button>
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
              <div className="nn-cal-weekdays">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => <span key={d}>{d}</span>)}</div>
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
            {[
              ["Service", svc?.title + (addon ? " + " + addon.title : "")],
              ["Date & Time", getDayName(date.year, date.month, date.day) + " " + date.day + " " + getMonthName(date.month) + " at " + time],
              ["Duration", totalDuration + " min"],
              ["Price", "£" + totalPrice],
            ].map(([label, val], i, arr) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none", fontSize: 14 }}>
                <span style={{ color: "var(--warm-gray)", fontWeight: 300 }}>{label}</span>
                <span style={{ fontWeight: label === "Price" ? 600 : 500, color: label === "Price" ? "var(--gold)" : "inherit" }}>{val}</span>
              </div>
            ))}
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
// BOOKING MODAL
// ============================================================
function BookingModal({ booking, prac, token, onClose, onUpdated }) {
  const [view, setView] = useState("detail"); // "detail" | "edit" | "confirm_cancel"
  const [editDate, setEditDate] = useState(null);
  const [editTime, setEditTime] = useState(null);
  const [saving, setSaving] = useState(false);
  const now = new Date();
  const [cM, setCM] = useState(now.getMonth());
  const [cY, setCY] = useState(now.getFullYear());

  const treatmentName = booking.service_title || booking.service_name || "Service";
  const dateStr2 = booking.booking_date
    ? new Date(booking.booking_date + "T12:00:00").toLocaleDateString("en-GB", {
        weekday: "long", day: "numeric", month: "long",
      })
    : "";

  const { slots, loading: slotsLoading } = useAvailableSlots(
    prac?.id, editDate, booking.duration, prac?.slot_interval || 30
  );

  async function handleReschedule() {
    if (!editDate || !editTime) return;
    setSaving(true);
    try {
      if (!IS_DEMO) {
        await supabase.update("bookings", {
          booking_date: dateStr(editDate.year, editDate.month, editDate.day),
          booking_time: editTime + ":00",
        }, "id=eq." + booking.id, token);
      }
      onUpdated(booking.id, "rescheduled", {
        booking_date: dateStr(editDate.year, editDate.month, editDate.day),
        booking_time: editTime + ":00",
      });
      onClose();
    } catch (e) { console.error(e); setSaving(false); }
  }

  async function handleCancel() {
    setSaving(true);
    try {
      if (!IS_DEMO) {
        await supabase.update("bookings", { status: "cancelled" }, "id=eq." + booking.id, token);
      }
      onUpdated(booking.id, "cancelled");
      onClose();
    } catch (e) { console.error(e); setSaving(false); }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(44,40,37,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{ background: "var(--cream)", border: "1px solid var(--border)", padding: "28px 24px", maxWidth: 460, width: "100%", position: "relative", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--warm-gray)" }}>✕</button>

        {/* ── DETAIL VIEW ── */}
        {view === "detail" && (
          <>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 400, marginBottom: 20 }}>Booking details</div>
            {[
              ["Client", booking.client_name],
              ["Treatment", treatmentName],
              ["Date", dateStr2],
              ["Time", booking.booking_time?.slice(0, 5)],
              ["Duration", booking.duration + " min"],
              ["Price", "£" + booking.price],
              ["Phone", booking.client_phone],
              booking.client_email && ["Email", booking.client_email],
              booking.notes && ["Notes", booking.notes],
            ].filter(Boolean).map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                <span style={{ color: "var(--warm-gray)", fontWeight: 300 }}>{label}</span>
                <span style={{ fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>{val}</span>
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={() => setView("edit")} style={{ flex: 1, padding: "12px", background: "var(--charcoal)", color: "var(--cream)", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Edit</button>
              <button onClick={() => setView("confirm_cancel")} style={{ flex: 1, padding: "12px", background: "none", color: "var(--red)", border: "1.5px solid var(--red)", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Cancel</button>
            </div>
          </>
        )}

        {/* ── EDIT VIEW ── */}
        {view === "edit" && (
          <>
            <button onClick={() => setView("detail")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--warm-gray)", fontFamily: "'Outfit',sans-serif", letterSpacing: 1, textTransform: "uppercase", marginBottom: 16, padding: 0 }}>← Back</button>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 400, marginBottom: 6 }}>Reschedule</div>
            <div style={{ fontSize: 13, color: "var(--warm-gray)", fontWeight: 300, marginBottom: 20 }}>{booking.client_name} · {treatmentName}</div>

            <div className="nn-cal" style={{ maxWidth: "100%", marginBottom: 20 }}>
              <div className="nn-cal-head">
                <button className="nn-cal-btn" onClick={() => { if (cM === 0) { setCM(11); setCY(cY - 1); } else setCM(cM - 1); }}>‹</button>
                <h3>{getMonthName(cM)} {cY}</h3>
                <button className="nn-cal-btn" onClick={() => { if (cM === 11) { setCM(0); setCY(cY + 1); } else setCM(cM + 1); }}>›</button>
              </div>
              <div className="nn-cal-weekdays">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => <span key={d}>{d}</span>)}</div>
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
                    const sel = editDate && editDate.day === d && editDate.month === cM && editDate.year === cY;
                    cells.push(
                      <button key={d} className={"nn-cal-day" + (sel ? " on" : "") + (past || sun ? " off" : "") + (isNow ? " now" : "")}
                        onClick={() => { if (!past && !sun) { setEditDate({ day: d, month: cM, year: cY }); setEditTime(null); } }} disabled={past || sun}>{d}</button>
                    );
                  }
                  return cells;
                })()}
              </div>
            </div>

            {editDate && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: "var(--warm-gray)", marginBottom: 10, fontWeight: 300 }}>
                  {getDayName(editDate.year, editDate.month, editDate.day)} {editDate.day} {getMonthName(editDate.month)}
                </div>
                {slotsLoading ? (
                  <div style={{ color: "var(--warm-gray)", fontSize: 13, fontWeight: 300 }}>Loading available times...</div>
                ) : slots.length === 0 ? (
                  <div style={{ color: "var(--red)", fontSize: 13, fontWeight: 300 }}>No available slots on this day.</div>
                ) : (
                  <div className="nn-times">
                    {slots.map(t => <button key={t} className={"nn-time" + (editTime === t ? " on" : "")} onClick={() => setEditTime(t)}>{t}</button>)}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={() => setView("detail")} className="nn-btn-back" style={{ flex: 1 }}>Cancel</button>
              <button onClick={handleReschedule} disabled={!editDate || !editTime || saving}
                style={{ flex: 2, padding: "12px", background: "var(--charcoal)", color: "var(--cream)", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", opacity: editDate && editTime && !saving ? 1 : .35 }}>
                {saving ? "Saving..." : "Confirm New Time"}
              </button>
            </div>
          </>
        )}

        {/* ── CANCEL CONFIRMATION ── */}
        {view === "confirm_cancel" && (
          <>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 400, marginBottom: 12 }}>Cancel Appointment</div>
            <p style={{ fontSize: 14, color: "var(--warm-gray)", lineHeight: 1.5, marginBottom: 24 }}> Are you sure you want to cancel this booking for <strong>{booking.client_name}</strong>? This cannot be undone.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setView("detail")} className="nn-btn-back" style={{ flex: 1 }}>Back</button>
              <button onClick={handleCancel} disabled={saving} style={{ flex: 1, padding: "12px", background: "var(--red)", color: "#fff", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>
                {saving ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN DASHBOARD MANAGER
// ============================================================
export default function StaffDashboard() {
  const [token, setToken] = useState("demo-token");
  const [practitioner, setPractitioner] = useState(DEMO_PRACTITIONERS[0]);
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState(DEMO_SERVICES_LIST);
  const [activeTab, setActiveTab] = useState("bookings"); // "bookings" | "services"
  
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [showAddService, setShowAddService] = useState(false);

  // Load Initial Bookings Data
  useEffect(() => {
    async function loadDashboardData() {
      try {
        if (IS_DEMO) {
          // Mock data setup for demo sandbox mode
          setBookings([
            { id: 1, client_name: "Sarah Jenkins", service_title: "BIAB Overlay", booking_date: new Date().toISOString().split("T")[0], booking_time: "10:00:00", duration: 60, price: 35, client_phone: "07123456789", notes: "Prefers almond shape." },
            { id: 2, client_name: "Emma Watson", service_title: "Gel Extension Removal", booking_date: new Date().toISOString().split("T")[0], booking_time: "13:30:00", duration: 45, price: 20, client_phone: "07987654321" }
          ]);
          return;
        }
        // Normal Production Fetch Queries
        const data = await supabase.select("bookings", "practitioner_id=eq." + practitioner.id, token);
        setBookings(data || []);
        const svcs = await supabase.select("custom_services", "practitioner_id=eq." + practitioner.id, token);
        setServices(svcs || []);
      } catch (err) { console.error(err); }
    }
    loadDashboardData();
  } White, [practitioner, token]);

  const handleBookingUpdated = (id, action, payload) => {
    setBookings(prev => prev.map(b => {
      if (b.id === id) {
        if (action === "cancelled") return { ...b, status: "cancelled" };
        if (action === "rescheduled") return { ...b, ...payload };
      }
      return b;
    }));
  };

  const existingGroups = [...new Set(services.filter(s => s.group_name).map(s => s.group_name))];

  return (
    <div style={{ maxWidth: "100%", margin: "0 auto", padding: "0 0 60px 0", background: "var(--cream)", minHeight: "100vh" }}>
      
      {/* Dynamic Tab Navigation bar */}
      <div style={{ display: "flex", background: "var(--charcoal)", padding: "10px 16px", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--cream)", fontSize: "20px" }}>Salon Portal</span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setActiveTab("bookings")} style={{ background: activeTab === "bookings" ? "var(--cream)" : "transparent", color: activeTab === "bookings" ? "var(--charcoal)" : "var(--cream)", border: "none", padding: "8px 14px", cursor: "pointer", fontFamily: "'Outfit', sans-serif", fontSize: "12px", borderRadius: "4px" }}>Bookings</button>
          <button onClick={() => setActiveTab("services")} style={{ background: activeTab === "services" ? "var(--cream)" : "transparent", color: activeTab === "services" ? "var(--charcoal)" : "var(--cream)", border: "none", padding: "8px 14px", cursor: "pointer", fontFamily: "'Outfit', sans-serif", fontSize: "12px", borderRadius: "4px" }}>Services</button>
        </div>
      </div>

      <div style={{ padding: "16px" }}>
        {activeTab === "bookings" && (
          <>
            {!showAddBooking ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "26px", margin: 0, fontWeight: 400 }}>Schedule</h2>
                  <button onClick={() => setShowAddBooking(true)} style={{ background: "var(--charcoal)", color: "var(--cream)", border: "none", padding: "10px 16px", fontFamily: "'Outfit', sans-serif", fontSize: "12px", cursor: "pointer", textTransform: "uppercase", letterSpacing: "1px" }}>+ New Appointment</button>
                </div>
                <WeeklyStaffSchedule bookings={bookings} prac={practitioner} onOpenBooking={(b) => setSelectedBooking(b)} />
              </>
            ) : (
              <StaffBookingForm prac={practitioner} services={services} token={token} onDone={() => { setShowAddBooking(false); }} onCancel={() => setShowAddBooking(false)} />
            )}
          </>
        )}

        {activeTab === "services" && (
          <>
            {!showAddService && !editingService ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "26px", margin: 0, fontWeight: 400 }}>Menu List</h2>
                  <button onClick={() => setShowAddService(true)} style={{ background: "var(--charcoal)", color: "var(--cream)", border: "none", padding: "10px 16px", fontFamily: "'Outfit', sans-serif", fontSize: "12px", cursor: "pointer", textTransform: "uppercase", letterSpacing: "1px" }}>+ Add Service</button>
                </div>
                {services.map(svc => (
                  <ServiceCard key={svc.id} svc={svc} onEdit={() => setEditingService(svc)} onRemove={() => alert("Delete targeted.")} />
                ))}
              </>
            ) : (
              <ServiceForm practitionerId={practitioner.id} token={token} existingService={editingService} existingGroups={existingGroups} onSave={() => { setShowAddService(false); setEditingService(null); }} onCancel={() => { setShowAddService(false); setEditingService(null); }} />
            )}
          </>
        )}
      </div>

      {selectedBooking && (
        <BookingModal booking={selectedBooking} prac={practitioner} token={token} onClose={() => setSelectedBooking(null)} onUpdated={handleBookingUpdated} />
      )}
    </div>
  );
}
