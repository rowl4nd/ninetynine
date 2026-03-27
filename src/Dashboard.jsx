// src/Dashboard.jsx — Staff-facing portal
// Login, Bookings (weekly view with drag), My Services, My Schedule

import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase, SUPABASE_URL, IS_DEMO } from "./supabase.js";
import {
  DEMO_PRACTITIONERS, DEMO_SERVICES_LIST,
  getDaysInMonth, getMonthName, getDayName, dateStr,
  useAvailableSlots, SvcItem,
} from "./shared.jsx";

// ============================================================
// WEEKLY VIEW HELPERS
// ============================================================

const HOUR_START = 7;  // 7am
const HOUR_END = 21;   // 9pm
const TOTAL_MINUTES = (HOUR_END - HOUR_START) * 60; // 840
const ROW_HEIGHT = 48; // px per 30-min slot
const PX_PER_MINUTE = ROW_HEIGHT / 30;

function getMonday(d) {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function addDays(d, n) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt;
}

function formatDateISO(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function formatDayHeader(d) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return { dayName: days[d.getDay()], dayNum: d.getDate(), monthName: months[d.getMonth()] };
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}

function timeLabels() {
  const labels = [];
  for (let h = HOUR_START; h < HOUR_END; h++) {
    const ampm = h < 12 ? "am" : "pm";
    const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
    labels.push({ time: String(h).padStart(2, "0") + ":00", label: display + ampm });
  }
  return labels;
}

const TIME_LABELS = timeLabels();
const SLOT_COUNT = (HOUR_END - HOUR_START) * 2; // 30-min slots

// ============================================================
// BOOKING BLOCK (individual booking in the weekly grid)
// ============================================================

function BookingBlock({ booking, dayIndex, onDragStart, onSelect, selected }) {
  const startMin = timeToMinutes(booking.booking_time) - HOUR_START * 60;
  const top = startMin * PX_PER_MINUTE;
  const height = Math.max((booking.duration || 30) * PX_PER_MINUTE, 20);
  const isStaff = booking.booked_by === "staff";
  const isSelected = selected?.id === booking.id;

  function handleMouseDown(e) {
    if (!isStaff) return;
    e.preventDefault();
    e.stopPropagation();
    onDragStart(e, booking, dayIndex, top);
  }

  function handleClick(e) {
    e.stopPropagation();
    onSelect(booking);
  }

  return (
    <div
      className={"nn-week-booking" + (isStaff ? " staff" : " client") + (isSelected ? " selected" : "")}
      style={{
        position: "absolute",
        top: top + "px",
        left: "2px",
        right: "2px",
        height: height + "px",
        zIndex: isSelected ? 20 : (isStaff ? 10 : 5),
        cursor: isStaff ? "grab" : "pointer",
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={(e) => { if (isStaff) { e.stopPropagation(); onDragStart(e, booking, dayIndex, top); } }}
      onClick={handleClick}
    >
      <div className="nn-week-booking-time">{booking.booking_time?.slice(0, 5)}</div>
      <div className="nn-week-booking-name">{booking.client_name}</div>
      {height > 40 && (
        <div className="nn-week-booking-svc">{booking.service_title || booking.service_name || "Service"}</div>
      )}
    </div>
  );
}

// ============================================================
// BOOKING DETAIL POPOVER
// ============================================================

function BookingDetail({ booking, onClose, onDone, onCancel }) {
  if (!booking) return null;
  const isStaff = booking.booked_by === "staff";
  const dateObj = new Date(booking.booking_date + "T12:00:00");
  const dayStr = dateObj.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className="nn-week-detail-overlay" onClick={onClose}>
      <div className="nn-week-detail" onClick={e => e.stopPropagation()}>
        <div className="nn-week-detail-header">
          <div>
            <div className="nn-week-detail-client">{booking.client_name}</div>
            <div className={"nn-week-detail-badge" + (isStaff ? " staff" : " client")}>
              {isStaff ? "Staff booking" : "Client booking"}
            </div>
          </div>
          <button className="nn-day-detail-close" onClick={onClose}>✕</button>
        </div>
        <div className="nn-week-detail-rows">
          <div className="nn-week-detail-row"><span>Service</span><span>{booking.service_title || booking.service_name || "Service"}</span></div>
          <div className="nn-week-detail-row"><span>Date</span><span>{dayStr}</span></div>
          <div className="nn-week-detail-row"><span>Time</span><span>{booking.booking_time?.slice(0, 5)}</span></div>
          <div className="nn-week-detail-row"><span>Duration</span><span>{booking.duration} min</span></div>
          <div className="nn-week-detail-row"><span>Price</span><span>£{booking.price}</span></div>
          <div className="nn-week-detail-row"><span>Phone</span><span>{booking.client_phone}</span></div>
          {booking.client_email && <div className="nn-week-detail-row"><span>Email</span><span>{booking.client_email}</span></div>}
          {booking.notes && <div className="nn-week-detail-row"><span>Notes</span><span>{booking.notes}</span></div>}
        </div>
        <div className="nn-week-detail-actions">
          <button onClick={() => onDone(booking.id)} className="nn-week-btn-done">Done</button>
          <button onClick={() => onCancel(booking.id)} className="nn-week-btn-cancel">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DRAG GHOST (shows while dragging a staff booking)
// ============================================================

function DragGhost({ booking, position }) {
  if (!booking || !position) return null;
  const height = Math.max((booking.duration || 30) * PX_PER_MINUTE, 20);
  return (
    <div
      className="nn-week-drag-ghost"
      style={{
        position: "fixed",
        top: position.y + "px",
        left: position.x + "px",
        width: position.width + "px",
        height: height + "px",
        pointerEvents: "none",
        zIndex: 1000,
      }}
    >
      <div className="nn-week-booking-time">{booking.booking_time?.slice(0, 5)}</div>
      <div className="nn-week-booking-name">{booking.client_name}</div>
    </div>
  );
}

// ============================================================
// WEEKLY VIEW COMPONENT
// ============================================================

function WeeklyView({ bookings, prac, auth, onUpdateBooking, onStatusChange, onAddBooking }) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragPos, setDragPos] = useState(null);
  const gridRef = useRef(null);
  const colRefs = useRef([]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = formatDateISO(today);

  function prevWeek() { setWeekStart(addDays(weekStart, -7)); }
  function nextWeek() { setWeekStart(addDays(weekStart, 7)); }
  function goToday() { setWeekStart(getMonday(new Date())); }

  // Get bookings for each day
  function bookingsForDay(dayDate) {
    const ds = formatDateISO(dayDate);
    return bookings.filter(b => b.booking_date === ds && b.status === "confirmed");
  }

  // ---- DRAG LOGIC ----
  const handleDragStart = useCallback((e, booking, dayIndex, originalTop) => {
    if (booking.booked_by !== "staff") return;
    const isTouch = e.type === "touchstart";
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;
    const col = colRefs.current[dayIndex];
    const colRect = col?.getBoundingClientRect();

    setDragging({
      booking,
      startX: clientX,
      startY: clientY,
      offsetY: clientY - (colRect?.top || 0) - originalTop,
      colWidth: colRect?.width || 120,
    });
    setDragPos({ x: clientX - 40, y: clientY - 10, width: colRect?.width || 120 });
  }, []);

  useEffect(() => {
    if (!dragging) return;

    function handleMove(e) {
      const isTouch = e.type === "touchmove";
      const clientX = isTouch ? e.touches[0].clientX : e.clientX;
      const clientY = isTouch ? e.touches[0].clientY : e.clientY;
      setDragPos({ x: clientX - 40, y: clientY - 10, width: dragging.colWidth });
    }

    function handleEnd(e) {
      const isTouch = e.type === "touchend";
      const clientX = isTouch ? e.changedTouches[0].clientX : e.clientX;
      const clientY = isTouch ? e.changedTouches[0].clientY : e.clientY;

      // Determine which column we dropped on
      let targetDayIndex = -1;
      let targetMinutes = -1;

      for (let i = 0; i < 7; i++) {
        const col = colRefs.current[i];
        if (!col) continue;
        const rect = col.getBoundingClientRect();
        if (clientX >= rect.left && clientX <= rect.right) {
          targetDayIndex = i;
          const relY = clientY - rect.top + col.scrollTop;
          // Snap to nearest 15 minutes
          const rawMin = (relY / PX_PER_MINUTE) + HOUR_START * 60;
          targetMinutes = Math.round(rawMin / 15) * 15;
          // Clamp
          targetMinutes = Math.max(HOUR_START * 60, Math.min(targetMinutes, HOUR_END * 60 - (dragging.booking.duration || 30)));
          break;
        }
      }

      if (targetDayIndex >= 0 && targetMinutes >= 0) {
        const newDate = formatDateISO(weekDays[targetDayIndex]);
        const newTime = minutesToTime(targetMinutes);
        if (newDate !== dragging.booking.booking_date || newTime !== dragging.booking.booking_time?.slice(0, 5)) {
          onUpdateBooking(dragging.booking.id, newDate, newTime + ":00");
        }
      }

      setDragging(null);
      setDragPos(null);
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [dragging, weekDays, onUpdateBooking]);

  // Week range label
  const weekEndDate = addDays(weekStart, 6);
  const rangeLabel = weekStart.getDate() + " " + ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][weekStart.getMonth()] +
    " – " + weekEndDate.getDate() + " " + ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][weekEndDate.getMonth()] + " " + weekEndDate.getFullYear();

  return (
    <div>
      {/* Week navigation */}
      <div className="nn-week-nav">
        <div className="nn-week-nav-left">
          <button className="nn-week-nav-btn" onClick={prevWeek}>‹</button>
          <button className="nn-week-nav-btn" onClick={nextWeek}>›</button>
          <button className="nn-week-today-btn" onClick={goToday}>Today</button>
        </div>
        <div className="nn-week-nav-title">{rangeLabel}</div>
        <button onClick={onAddBooking} className="nn-week-add-btn">
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add Booking
        </button>
      </div>

      {/* Legend */}
      <div className="nn-week-legend">
        <span className="nn-week-legend-item"><span className="nn-week-legend-dot client"/> Client booking</span>
        <span className="nn-week-legend-item"><span className="nn-week-legend-dot staff"/> Staff booking (draggable)</span>
      </div>

      {/* Grid */}
      <div className="nn-week-container" ref={gridRef}>
        {/* Time column */}
        <div className="nn-week-time-col">
          <div className="nn-week-corner"/>
          <div className="nn-week-time-body">
            {TIME_LABELS.map(t => (
              <div className="nn-week-time-label" key={t.time} style={{ height: ROW_HEIGHT * 2 + "px" }}>
                <span>{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Day columns */}
        {weekDays.map((day, i) => {
          const ds = formatDateISO(day);
          const isToday = ds === todayISO;
          const { dayName, dayNum, monthName } = formatDayHeader(day);
          const dayBookings = bookingsForDay(day);

          return (
            <div className={"nn-week-day-col" + (isToday ? " today" : "")} key={ds}>
              <div className={"nn-week-day-header" + (isToday ? " today" : "")}>
                <div className="nn-week-day-name">{dayName}</div>
                <div className={"nn-week-day-num" + (isToday ? " today" : "")}>{dayNum}</div>
              </div>
              <div
                className="nn-week-day-body"
                ref={el => colRefs.current[i] = el}
                style={{ height: SLOT_COUNT * ROW_HEIGHT + "px", position: "relative" }}
              >
                {/* Grid lines */}
                {Array.from({ length: SLOT_COUNT }, (_, si) => (
                  <div
                    key={si}
                    className={"nn-week-slot-line" + (si % 2 === 0 ? " hour" : "")}
                    style={{ top: si * ROW_HEIGHT + "px", height: ROW_HEIGHT + "px" }}
                  />
                ))}
                {/* Current time indicator */}
                {isToday && (() => {
                  const now = new Date();
                  const nowMin = now.getHours() * 60 + now.getMinutes() - HOUR_START * 60;
                  if (nowMin < 0 || nowMin > TOTAL_MINUTES) return null;
                  return <div className="nn-week-now-line" style={{ top: nowMin * PX_PER_MINUTE + "px" }}/>;
                })()}
                {/* Booking blocks */}
                {dayBookings.map(b => (
                  <BookingBlock
                    key={b.id}
                    booking={b}
                    dayIndex={i}
                    onDragStart={handleDragStart}
                    onSelect={setSelectedBooking}
                    selected={selectedBooking}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Drag ghost */}
      <DragGhost booking={dragging?.booking} position={dragPos}/>

      {/* Booking detail popover */}
      <BookingDetail
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onDone={(id) => { onStatusChange(id, "completed"); setSelectedBooking(null); }}
        onCancel={(id) => { onStatusChange(id, "cancelled"); setSelectedBooking(null); }}
      />
    </div>
  );
}

// ============================================================
// SERVICE FORM (add/edit a custom service) — UNCHANGED
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
          { title, description, duration:parseInt(duration), price:parseFloat(price), group_name:finalGroupName||null },
          "id=eq."+existingService.id, token);
      } else {
        const res = await supabase.insert("custom_services", {
          practitioner_id:practitionerId, title, description,
          duration:parseInt(duration), price:parseFloat(price), group_name:finalGroupName||null,
        }, token);
        serviceId = res[0].id;
      }
      if (hasAddon && addonTitle && addonDuration && addonPrice) {
        if (existingService?.addon) {
          await supabase.update("custom_service_addons",
            { title:addonTitle, duration:parseInt(addonDuration), price:parseFloat(addonPrice) },
            "id=eq."+existingService.addon.id, token);
        } else {
          await supabase.insert("custom_service_addons", {
            service_id:serviceId, title:addonTitle,
            duration:parseInt(addonDuration), price:parseFloat(addonPrice),
          }, token);
        }
      } else if (!hasAddon && existingService?.addon) {
        await fetch(SUPABASE_URL+"/rest/v1/custom_service_addons?id=eq."+existingService.addon.id, {
          method:"DELETE", headers:supabase.headers(token),
        });
      }
      onSave();
    } catch (e) { console.error(e); alert("Error saving service. Please try again."); }
    setSaving(false);
  }

  return (
    <div style={{ padding:"28px", background:"var(--cream)", border:"1.5px solid var(--border)", marginBottom:12 }}>
      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:400, marginBottom:24 }}>
        {existingService ? "Edit service" : "Add a service"}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <div>
          <label className="nn-input-label">Group (optional)</label>
          {!showNewGroup ? (
            <div style={{ display:"flex", gap:8 }}>
              <select value={groupName} onChange={e => setGroupName(e.target.value)}
                style={{ flex:1, padding:"14px 18px", border:"1.5px solid var(--border)", background:"var(--warm-white)", fontFamily:"'Outfit',sans-serif", fontSize:15, outline:"none", color:"var(--charcoal)", cursor:"pointer" }}>
                <option value="">No group</option>
                {existingGroups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <button onClick={() => { setShowNewGroup(true); setGroupName(""); }}
                style={{ padding:"14px 20px", background:"none", border:"1.5px solid var(--border)", cursor:"pointer", fontFamily:"'Outfit',sans-serif", fontSize:12, fontWeight:500, letterSpacing:"1px", textTransform:"uppercase", color:"var(--charcoal)", whiteSpace:"nowrap" }}>
                + New Group
              </button>
            </div>
          ) : (
            <div style={{ display:"flex", gap:8 }}>
              <input className="nn-input" type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="e.g. BIAB Manicure" style={{ flex:1 }}/>
              <button onClick={() => { setShowNewGroup(false); setNewGroupName(""); }}
                style={{ padding:"14px 20px", background:"none", border:"1.5px solid var(--border)", cursor:"pointer", fontFamily:"'Outfit',sans-serif", fontSize:12, fontWeight:500, color:"var(--warm-gray)" }}>
                Cancel
              </button>
            </div>
          )}
        </div>
        <div><label className="nn-input-label">Service Title</label><input className="nn-input" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. BIAB Overlay"/></div>
        <div><label className="nn-input-label">Description (optional)</label><input className="nn-input" type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Includes removal of previous set"/></div>
        <div style={{ display:"flex", gap:16 }}>
          <div style={{ flex:1 }}><label className="nn-input-label">Duration (minutes)</label><input className="nn-input" type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="45"/></div>
          <div style={{ flex:1 }}><label className="nn-input-label">Price (£)</label><input className="nn-input" type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="30"/></div>
        </div>
        <div style={{ padding:"16px 20px", background:"var(--warm-white)", border:"1px solid var(--border)" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:hasAddon?16:0 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:500 }}>Optional add-on</div>
              <div style={{ fontSize:12, color:"var(--warm-gray)", fontWeight:300, marginTop:2 }}>e.g. Nail Art, Brow Tint</div>
            </div>
            <button onClick={() => setHasAddon(o => !o)} style={{ width:44, height:24, borderRadius:12, border:"none", cursor:"pointer", background:hasAddon?"var(--charcoal)":"var(--border)", position:"relative", transition:"background .2s", flexShrink:0 }}>
              <span style={{ position:"absolute", top:3, left:hasAddon?23:3, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"left .2s", display:"block" }}/>
            </button>
          </div>
          {hasAddon && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div><label className="nn-input-label">Add-on Title</label><input className="nn-input" type="text" value={addonTitle} onChange={e => setAddonTitle(e.target.value)} placeholder="e.g. Nail Art"/></div>
              <div style={{ display:"flex", gap:16 }}>
                <div style={{ flex:1 }}><label className="nn-input-label">Duration (minutes)</label><input className="nn-input" type="number" value={addonDuration} onChange={e => setAddonDuration(e.target.value)} placeholder="15"/></div>
                <div style={{ flex:1 }}><label className="nn-input-label">Price (£)</label><input className="nn-input" type="number" value={addonPrice} onChange={e => setAddonPrice(e.target.value)} placeholder="10"/></div>
              </div>
            </div>
          )}
        </div>
        <div style={{ display:"flex", gap:12, marginTop:8 }}>
          <button onClick={onCancel} className="nn-btn-back">Cancel</button>
          <button onClick={handleSave} disabled={!title||!duration||!price||saving}
            style={{ padding:"14px 32px", background:"var(--charcoal)", color:"var(--cream)", border:"none", cursor:"pointer", fontFamily:"'Outfit',sans-serif", fontSize:12, fontWeight:500, letterSpacing:"2px", textTransform:"uppercase", opacity:title&&duration&&price&&!saving?1:.35 }}>
            {saving?"Saving...":existingService?"Save Changes":"Add Service"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SERVICE CARD — UNCHANGED
// ============================================================

function ServiceCard({ svc, onEdit, onRemove }) {
  return (
    <div style={{ padding:"18px 20px", background:"var(--warm-white)", border:"1.5px solid var(--border)", marginBottom:8, display:"flex", alignItems:"flex-start", gap:16 }}>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:500, fontSize:14 }}>{svc.title}</div>
        {svc.description && <div style={{ fontSize:12, color:"var(--warm-gray)", fontWeight:300, marginTop:2 }}>{svc.description}</div>}
        <div style={{ fontSize:12, color:"var(--warm-gray)", fontWeight:300, marginTop:4 }}>{svc.duration} min · £{svc.price}</div>
        {svc.addon && (
          <div style={{ marginTop:8, padding:"8px 12px", background:"var(--cream)", border:"1px solid var(--border)", fontSize:12 }}>
            <span style={{ color:"var(--gold)", fontWeight:500 }}>+ Add-on: </span>
            {svc.addon.title} · {svc.addon.duration} min · £{svc.addon.price}
          </div>
        )}
      </div>
      <div style={{ display:"flex", gap:8, flexShrink:0 }}>
        <button onClick={onEdit} style={{ padding:"6px 14px", background:"none", color:"var(--charcoal)", border:"1px solid var(--border)", cursor:"pointer", fontSize:11, fontWeight:600, letterSpacing:.5, textTransform:"uppercase", fontFamily:"'Outfit',sans-serif" }}>Edit</button>
        <button onClick={onRemove} style={{ padding:"6px 14px", background:"none", color:"var(--red)", border:"1px solid var(--red)", cursor:"pointer", fontSize:11, fontWeight:600, letterSpacing:.5, textTransform:"uppercase", fontFamily:"'Outfit',sans-serif" }}>Remove</button>
      </div>
    </div>
  );
}

// ============================================================
// STAFF BOOKING FORM — updated with booked_by: 'staff'
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
        notes: (addon ? "Add-on: " + addon.title + ". " : "") + (notes || ""),
        booked_by: "staff",
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
      <div style={{ maxWidth:500, padding:"48px 0" }}>
        <div className="nn-success-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
        <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, fontWeight:300, textAlign:"center", marginBottom:10 }}>Booking added</h3>
        <p style={{ textAlign:"center", color:"var(--warm-gray)", fontSize:14, fontWeight:300, lineHeight:1.6, marginBottom:32 }}>
          {clientName} is booked in for {svc?.title} on {getDayName(date.year,date.month,date.day)} {date.day} {getMonthName(date.month)} at {time}.
        </p>
        <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
          <button onClick={onDone} style={{ padding:"14px 32px", background:"var(--charcoal)", color:"var(--cream)", border:"none", cursor:"pointer", fontFamily:"'Outfit',sans-serif", fontSize:12, fontWeight:500, letterSpacing:"2px", textTransform:"uppercase" }}>Back to Bookings</button>
        </div>
      </div>
    );
  }

  const H3 = ({ children }) => <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:400, marginBottom:20 }}>{children}</h3>;

  return (
    <div style={{ maxWidth:680 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:32, paddingBottom:16, borderBottom:"1px solid var(--border)" }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:300 }}>Add a booking</div>
        <button onClick={onCancel} style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, color:"var(--warm-gray)", fontFamily:"'Outfit',sans-serif" }}>✕ Cancel</button>
      </div>

      {step === 1 && (
        <div>
          <H3>Select a service</H3>
          {services.length === 0 ? (
            <div style={{ color:"var(--warm-gray)", fontSize:14, fontWeight:300, padding:"20px 0" }}>No services set up yet. Add services in the "My Services" tab first.</div>
          ) : (
            <div>
              {groups.map(group => (
                <div key={group} style={{ marginBottom:24 }}>
                  <div className="nn-svc-group-label">{group}</div>
                  {services.filter(s => s.group_name===group).map(s => (
                    <SvcItem key={s.id} s={s} picked={svc?.id===s.id} onSelect={() => { setSvc(s); setAddon(null); }}/>
                  ))}
                </div>
              ))}
              {ungrouped.length > 0 && (
                <div>
                  {groups.length > 0 && <div className="nn-svc-group-label">Other</div>}
                  {ungrouped.map(s => (
                    <SvcItem key={s.id} s={s} picked={svc?.id===s.id} onSelect={() => { setSvc(s); setAddon(null); }}/>
                  ))}
                </div>
              )}
            </div>
          )}
          {svc?.addon && (
            <div style={{ marginTop:24, padding:"20px", background:"var(--cream)", border:"1.5px solid var(--border)" }}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:12 }}>Optional add-on</div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => setAddon(null)} style={{ flex:1, padding:"12px", background:!addon?"var(--charcoal)":"var(--warm-white)", color:!addon?"var(--cream)":"var(--charcoal)", border:"1.5px solid "+(addon?"var(--border)":"var(--charcoal)"), cursor:"pointer", fontFamily:"'Outfit',sans-serif", fontSize:13, fontWeight:400 }}>No add-on</button>
                <button onClick={() => setAddon(svc.addon)} style={{ flex:1, padding:"12px", background:addon?"var(--charcoal)":"var(--warm-white)", color:addon?"var(--cream)":"var(--charcoal)", border:"1.5px solid "+(addon?"var(--charcoal)":"var(--border)"), cursor:"pointer", fontFamily:"'Outfit',sans-serif", fontSize:13, fontWeight:400 }}>{svc.addon.title} (+£{svc.addon.price})</button>
              </div>
            </div>
          )}
          <div className="nn-booking-nav">
            <button className="nn-btn-back" onClick={onCancel}>Cancel</button>
            <button className="nn-btn nn-btn-dark" onClick={() => setStep(2)} disabled={!svc} style={{ opacity:svc?1:.35 }}>Continue</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <H3>Pick a date &amp; time</H3>
          <div style={{ display:"flex", gap:40, flexWrap:"wrap" }}>
            <div className="nn-cal">
              <div className="nn-cal-head">
                <button className="nn-cal-btn" onClick={() => { if(cM===0){setCM(11);setCY(cY-1)}else setCM(cM-1) }}>‹</button>
                <h3>{getMonthName(cM)} {cY}</h3>
                <button className="nn-cal-btn" onClick={() => { if(cM===11){setCM(0);setCY(cY+1)}else setCM(cM+1) }}>›</button>
              </div>
              <div className="nn-cal-weekdays">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => <span key={d}>{d}</span>)}</div>
              <div className="nn-cal-days">
                {(() => {
                  const first = (new Date(cY,cM,1).getDay()+6)%7;
                  const total = getDaysInMonth(cY,cM);
                  const cells = [];
                  for(let i=0;i<first;i++) cells.push(<div className="nn-cal-day nil" key={"e"+i}/>);
                  for(let d=1;d<=total;d++){
                    const isNow=d===now.getDate()&&cM===now.getMonth()&&cY===now.getFullYear();
                    const past=new Date(cY,cM,d)<new Date(now.getFullYear(),now.getMonth(),now.getDate());
                    const sun=new Date(cY,cM,d).getDay()===0;
                    const sel=date&&date.day===d&&date.month===cM&&date.year===cY;
                    cells.push(<button key={d} className={"nn-cal-day"+(sel?" on":"")+(past||sun?" off":"")+(isNow?" now":"")}
                      onClick={() => { if(!past&&!sun){ setDate({day:d,month:cM,year:cY}); setTime(null); }}} disabled={past||sun}>{d}</button>);
                  }
                  return cells;
                })()}
              </div>
            </div>
            {date && (
              <div style={{ flex:1, minWidth:180 }}>
                <div style={{ fontSize:14, color:"var(--warm-gray)", marginBottom:14, fontWeight:300 }}>
                  {getDayName(date.year,date.month,date.day)} {date.day} {getMonthName(date.month)}
                </div>
                {slotsLoading ? (
                  <div style={{ color:"var(--warm-gray)", fontSize:14, fontWeight:300 }}>Loading times...</div>
                ) : slots.length === 0 ? (
                  <div style={{ color:"var(--red)", fontSize:14, fontWeight:300 }}>No available slots. Try another day.</div>
                ) : (
                  <div className="nn-times">{slots.map(t => <button key={t} className={"nn-time"+(time===t?" on":"")} onClick={() => setTime(t)}>{t}</button>)}</div>
                )}
              </div>
            )}
          </div>
          <div className="nn-booking-nav">
            <button className="nn-btn-back" onClick={() => setStep(1)}>Back</button>
            <button className="nn-btn nn-btn-dark" onClick={() => setStep(3)} disabled={!date||!time} style={{ opacity:date&&time?1:.35 }}>Continue</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <H3>Client details</H3>
          <div style={{ background:"var(--cream)", border:"1px solid var(--border)", padding:32, marginBottom:24 }}>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid var(--border)", fontSize:14 }}>
              <span style={{ color:"var(--warm-gray)", fontWeight:300 }}>Service</span>
              <span style={{ fontWeight:500 }}>{svc?.title}{addon ? " + " + addon.title : ""}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid var(--border)", fontSize:14 }}>
              <span style={{ color:"var(--warm-gray)", fontWeight:300 }}>Date &amp; Time</span>
              <span style={{ fontWeight:500 }}>{getDayName(date.year,date.month,date.day)} {date.day} {getMonthName(date.month)} at {time}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid var(--border)", fontSize:14 }}>
              <span style={{ color:"var(--warm-gray)", fontWeight:300 }}>Duration</span>
              <span style={{ fontWeight:500 }}>{totalDuration} min</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", fontSize:14 }}>
              <span style={{ color:"var(--warm-gray)", fontWeight:300 }}>Price</span>
              <span style={{ fontWeight:600, color:"var(--gold)" }}>£{totalPrice}</span>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div><label className="nn-input-label">Client Name</label><input className="nn-input" type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Full name"/></div>
            <div><label className="nn-input-label">Phone Number</label><input className="nn-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="07xxx xxxxxx"/></div>
            <div><label className="nn-input-label">Email (optional)</label><input className="nn-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="client@email.com"/></div>
            <div><label className="nn-input-label">Notes (optional)</label><input className="nn-input" type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Walk-in, prefers short nails"/></div>
          </div>
          <div className="nn-booking-nav">
            <button className="nn-btn-back" onClick={() => setStep(2)}>Back</button>
            <button className="nn-btn nn-btn-gold" onClick={handleSave} disabled={!clientName||!phone||saving} style={{ opacity:clientName&&phone&&!saving?1:.35 }}>
              {saving ? "Saving..." : "Confirm Booking"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// DASHBOARD (main staff portal — exported as default)
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
  const [showStaffBooking, setShowStaffBooking] = useState(false);
  const [staffBookServices, setStaffBookServices] = useState([]);
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const DAY_NAMES = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

  async function handleLogin(e) {
    e.preventDefault(); setLoginErr("");
    if (IS_DEMO) { setAuth({ access_token:"demo" }); setPrac(DEMO_PRACTITIONERS[0]); return; }
    try {
      const session = await supabase.signIn(loginEmail, loginPass);
      setAuth(session);
      const pracs = await supabase.query("practitioners", { filters:"&user_id=eq."+session.user.id, token:session.access_token });
      if (pracs.length > 0) setPrac(pracs[0]);
      else setLoginErr("No practitioner account linked to this email. Please contact Kristen.");
    } catch (e) { setLoginErr(e.message); }
  }

  // Fetch bookings for current week
  useEffect(() => {
    if (!auth || !prac || tab !== "bookings") return;
    if (IS_DEMO) {
      const today = new Date();
      const todayStr = formatDateISO(today);
      const tomorrowStr = formatDateISO(addDays(today, 1));
      const dayAfterStr = formatDateISO(addDays(today, 2));
      setBookings([
        { id:"d1", client_name:"Sarah J.", client_phone:"07700 123456", booking_date:todayStr, booking_time:"10:00:00", duration:45, price:30, status:"confirmed", service_title:"Gel Manicure", booked_by:"client" },
        { id:"d2", client_name:"Emma W.", client_phone:"07700 654321", booking_date:todayStr, booking_time:"11:30:00", duration:60, price:40, status:"confirmed", service_title:"Lash Lift & Tint", booked_by:"client" },
        { id:"d3", client_name:"Lucy T.", client_phone:"07700 111222", booking_date:tomorrowStr, booking_time:"09:30:00", duration:45, price:35, status:"confirmed", service_title:"Brow Lamination", booked_by:"staff" },
        { id:"d4", client_name:"Hannah R.", client_phone:"07700 333444", booking_date:dayAfterStr, booking_time:"14:00:00", duration:60, price:55, status:"confirmed", service_title:"Luxury Facial", booked_by:"staff" },
        { id:"d5", client_name:"Megan P.", client_phone:"07700 555666", booking_date:todayStr, booking_time:"14:30:00", duration:75, price:50, status:"confirmed", service_title:"Gel Manicure & Toes", booked_by:"client" },
      ]);
      return;
    }
    setLoading(true);
    const weekEnd = addDays(weekStart, 6);
    const startStr = formatDateISO(weekStart);
    const endStr = formatDateISO(weekEnd);
    supabase.query("bookings", {
      select:"*",
      filters:"&practitioner_id=eq."+prac.id+"&booking_date=gte."+startStr+"&booking_date=lte."+endStr+"&status=eq.confirmed&order=booking_date,booking_time",
      token:auth.access_token,
    }).then(async (rows) => {
      if (rows.length > 0) {
        try {
          const svcIds = [...new Set(rows.map(r => r.service_id).filter(Boolean))];
          if (svcIds.length > 0) {
            const svcs = await supabase.query("custom_services", {
              select:"id,title",
              filters:"&id=in.(" + svcIds.join(",") + ")",
              token:auth.access_token,
            });
            const svcMap = Object.fromEntries(svcs.map(s => [s.id, s.title]));
            rows = rows.map(b => ({ ...b, service_name: svcMap[b.service_id] || null }));
          }
        } catch(e) {
          try {
            const svcIds = [...new Set(rows.map(r => r.service_id).filter(Boolean))];
            if (svcIds.length > 0) {
              const svcs = await supabase.query("services", {
                select:"id,name",
                filters:"&id=in.(" + svcIds.join(",") + ")",
                token:auth.access_token,
              });
              const svcMap = Object.fromEntries(svcs.map(s => [s.id, s.name]));
              rows = rows.map(b => ({ ...b, service_name: svcMap[b.service_id] || null }));
            }
          } catch(e2) { /* ignore */ }
        }
      }
      setBookings(rows);
    }).catch(console.error).finally(() => setLoading(false));
  }, [auth, prac, tab, weekStart]);

  useEffect(() => {
    if (!auth || !prac || !showStaffBooking) return;
    if (IS_DEMO) { setStaffBookServices(DEMO_SERVICES_LIST); return; }
    supabase.query("custom_services", {
      select:"*,addon:custom_service_addons(*)",
      filters:"&practitioner_id=eq."+prac.id+"&is_active=eq.true&order=group_order,service_order,created_at",
      token:auth.access_token,
    }).then(rows => setStaffBookServices(rows.map(s => ({ ...s, addon:s.addon?.[0]||null })))).catch(console.error);
  }, [auth, prac, showStaffBooking]);

  function refreshBookings() {
    if (IS_DEMO) return;
    const weekEnd = addDays(weekStart, 6);
    const startStr = formatDateISO(weekStart);
    const endStr = formatDateISO(weekEnd);
    supabase.query("bookings", {
      select:"*",
      filters:"&practitioner_id=eq."+prac.id+"&booking_date=gte."+startStr+"&booking_date=lte."+endStr+"&status=eq.confirmed&order=booking_date,booking_time",
      token:auth.access_token,
    }).then(async (rows) => {
      if (rows.length > 0) {
        try {
          const svcIds = [...new Set(rows.map(r => r.service_id).filter(Boolean))];
          if (svcIds.length > 0) {
            const svcs = await supabase.query("custom_services", {
              select:"id,title",
              filters:"&id=in.(" + svcIds.join(",") + ")",
              token:auth.access_token,
            });
            const svcMap = Object.fromEntries(svcs.map(s => [s.id, s.title]));
            rows = rows.map(b => ({ ...b, service_name: svcMap[b.service_id] || null }));
          }
        } catch(e) {
          try {
            const svcIds = [...new Set(rows.map(r => r.service_id).filter(Boolean))];
            if (svcIds.length > 0) {
              const svcs = await supabase.query("services", {
                select:"id,name",
                filters:"&id=in.(" + svcIds.join(",") + ")",
                token:auth.access_token,
              });
              const svcMap = Object.fromEntries(svcs.map(s => [s.id, s.name]));
              rows = rows.map(b => ({ ...b, service_name: svcMap[b.service_id] || null }));
            }
          } catch(e2) { /* ignore */ }
        }
      }
      setBookings(rows);
    }).catch(console.error);
  }

  async function handleUpdateBooking(bookingId, newDate, newTime) {
    if (IS_DEMO) {
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, booking_date: newDate, booking_time: newTime } : b));
      return;
    }
    try {
      await supabase.update("bookings", { booking_date: newDate, booking_time: newTime }, "id=eq." + bookingId, auth.access_token);
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, booking_date: newDate, booking_time: newTime } : b));
    } catch (e) {
      console.error(e);
      alert("Error moving booking. Please try again.");
    }
  }

  async function updateStatus(bookingId, status) {
    if (IS_DEMO) { setBookings(prev => prev.map(b => b.id===bookingId?{...b,status}:b)); return; }
    await supabase.update("bookings", { status }, "id=eq."+bookingId, auth.access_token);
    setBookings(prev => prev.map(b => b.id===bookingId?{...b,status}:b));
  }

  useEffect(() => {
    if (!auth || !prac || tab !== "services") return;
    if (IS_DEMO) { setCustomServices([]); return; }
    loadServices();
  }, [auth, prac, tab]);

  function loadServices() {
    if (!auth || !prac) return;
    supabase.query("custom_services", {
      select:"*,addon:custom_service_addons(*)",
      filters:"&practitioner_id=eq."+prac.id+"&is_active=eq.true&order=group_order,service_order,created_at",
      token:auth.access_token,
    }).then(rows => setCustomServices(rows.map(s => ({ ...s, addon:s.addon?.[0]||null })))).catch(console.error);
  }

  const existingGroups = [...new Set(customServices.filter(s => s.group_name).map(s => s.group_name))];

  useEffect(() => {
    if (!auth || !prac || tab !== "schedule") return;
    if (IS_DEMO) {
      setAvailability(DAY_NAMES.map((_,i) => ({ day_of_week:i, start_time:"09:00", end_time:i<5?"17:30":"17:00", is_available:i<6 })));
      setBlockedDates([]); return;
    }
    Promise.all([
      supabase.query("availability", { filters:"&practitioner_id=eq."+prac.id+"&order=day_of_week", token:auth.access_token }),
      supabase.query("blocked_dates", { filters:"&practitioner_id=eq."+prac.id+"&blocked_date=gte."+new Date().toISOString().split("T")[0]+"&order=blocked_date", token:auth.access_token }),
    ]).then(([avail, blocked]) => {
      const filled = DAY_NAMES.map((_,i) => avail.find(a => a.day_of_week===i) || { day_of_week:i, start_time:"09:00", end_time:"17:30", is_available:false });
      setAvailability(filled); setBlockedDates(blocked);
    }).catch(console.error);
  }, [auth, prac, tab]);

  async function saveAvailability(day) {
    const row = availability[day];
    if (IS_DEMO) return;
    try {
      const res = await fetch(SUPABASE_URL+"/rest/v1/availability?practitioner_id=eq."+prac.id+"&day_of_week=eq."+day, {
        method:"PATCH", headers:{ ...supabase.headers(auth.access_token), Prefer:"return=representation" },
        body:JSON.stringify({ is_available:row.is_available, start_time:row.start_time, end_time:row.end_time }),
      });
      if (!res.ok) await supabase.insert("availability", { practitioner_id:prac.id, day_of_week:day, start_time:row.start_time, end_time:row.end_time, is_available:row.is_available }, auth.access_token);
    } catch (e) { console.error(e); }
  }

  function updateAvail(day, field, value) {
    setAvailability(prev => prev.map((r,i) => i===day?{...r,[field]:value}:r));
  }

  async function addBlockedDate() {
    if (!newBlock) return;
    if (blockType === "partial" && (!newBlockStart || !newBlockEnd)) return;
    if (blockType === "partial" && newBlockStart >= newBlockEnd) { alert("End time must be after start time."); return; }
    setBlockSaving(true);
    const payload = { practitioner_id: prac.id, blocked_date: newBlock };
    if (blockType === "partial") {
      payload.start_time = newBlockStart;
      payload.end_time = newBlockEnd;
    }
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
    if (IS_DEMO) { setBlockedDates(prev => prev.filter(b => b.id!==id)); return; }
    try {
      await fetch(SUPABASE_URL+"/rest/v1/blocked_dates?id=eq."+id, { method:"DELETE", headers:supabase.headers(auth.access_token) });
      setBlockedDates(prev => prev.filter(b => b.id!==id));
    } catch (e) { console.error(e); }
  }

  if (!auth) {
    return (
      <div className="nn-login">
        <div className="nn-login-card">
          <div className="nn-login-title">Staff Login</div>
          <div className="nn-login-sub">ninety nine. practitioner portal</div>
          {loginErr && <div className="nn-login-error">{loginErr}</div>}
          <div onKeyDown={e => e.key==="Enter"&&handleLogin(e)} style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div><label className="nn-input-label">Email</label><input className="nn-input" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="your@email.com"/></div>
            <div><label className="nn-input-label">Password</label><input className="nn-input" type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="••••••••"/></div>
            <button className="nn-btn nn-btn-dark" onClick={handleLogin} style={{ width:"100%", marginTop:8 }}>Sign In</button>
            <button className="nn-btn-back" onClick={onBack} style={{ width:"100%", textAlign:"center" }}>← Back to Website</button>
          </div>
          {IS_DEMO && <p style={{ marginTop:16, fontSize:12, color:"var(--warm-gray)", textAlign:"center" }}>Demo mode — click Sign In to preview</p>}
        </div>
      </div>
    );
  }

  const upcoming = bookings.filter(b => b.status==="confirmed");
  const dashGroups = [...new Set(customServices.filter(s => s.group_name).map(s => s.group_name))];
  const dashUngrouped = customServices.filter(s => !s.group_name);

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

      <div className="nn-dash-tabs">
        <button className={"nn-dash-tab"+(tab==="bookings"?" on":"")} onClick={() => setTab("bookings")}>Bookings</button>
        <button className={"nn-dash-tab"+(tab==="services"?" on":"")} onClick={() => setTab("services")}>My Services</button>
        <button className={"nn-dash-tab"+(tab==="schedule"?" on":"")} onClick={() => setTab("schedule")}>My Schedule</button>
      </div>

      {tab === "bookings" && (
        <div>
          {showStaffBooking ? (
            <StaffBookingForm
              prac={prac}
              services={staffBookServices}
              token={auth.access_token}
              onDone={() => { setShowStaffBooking(false); refreshBookings(); }}
              onCancel={() => setShowStaffBooking(false)}
            />
          ) : loading ? (
            <div style={{ color:"var(--warm-gray)", padding:40, textAlign:"center" }}>Loading bookings...</div>
          ) : (
            <WeeklyView
              bookings={upcoming}
              prac={prac}
              auth={auth}
              onUpdateBooking={handleUpdateBooking}
              onStatusChange={updateStatus}
              onAddBooking={() => setShowStaffBooking(true)}
            />
          )}
        </div>
      )}

      {tab === "services" && (
        <div style={{ maxWidth:680 }}>
          <p style={{ fontSize:14, color:"var(--warm-gray)", fontWeight:300, marginBottom:32, lineHeight:1.7 }}>
            Add and manage your own services. Clients will see these when booking with you.
          </p>
          {customServices.length===0 && !showServiceForm && !editingCustomService ? (
            <div style={{ padding:"32px 0", color:"var(--warm-gray)", fontSize:14, fontWeight:300 }}>No services yet — add your first service below.</div>
          ) : (
            <div style={{ marginBottom:24 }}>
              {dashGroups.map(group => (
                <div key={group} style={{ marginBottom:24 }}>
                  <div style={{ fontSize:11, fontWeight:600, letterSpacing:"2.5px", textTransform:"uppercase", color:"var(--warm-gray)", marginBottom:10, paddingBottom:8, borderBottom:"1px solid var(--border)" }}>{group}</div>
                  {customServices.filter(s => s.group_name===group).map(svc => (
                    <div key={svc.id}>
                      {editingCustomService?.id===svc.id ? (
                        <ServiceForm practitionerId={prac.id} token={auth.access_token} existingService={editingCustomService} existingGroups={existingGroups}
                          onSave={() => { setEditingCustomService(null); loadServices(); }} onCancel={() => setEditingCustomService(null)}/>
                      ) : (
                        <ServiceCard svc={svc} onEdit={() => { setEditingCustomService(svc); setShowServiceForm(false); }}
                          onRemove={async () => { await supabase.update("custom_services",{is_active:false},"id=eq."+svc.id,auth.access_token); setCustomServices(prev => prev.filter(s => s.id!==svc.id)); }}/>
                      )}
                    </div>
                  ))}
                </div>
              ))}
              {dashUngrouped.length > 0 && (
                <div>
                  {dashGroups.length > 0 && <div style={{ fontSize:11, fontWeight:600, letterSpacing:"2.5px", textTransform:"uppercase", color:"var(--warm-gray)", marginBottom:10, paddingBottom:8, borderBottom:"1px solid var(--border)" }}>Other</div>}
                  {dashUngrouped.map(svc => (
                    <div key={svc.id}>
                      {editingCustomService?.id===svc.id ? (
                        <ServiceForm practitionerId={prac.id} token={auth.access_token} existingService={editingCustomService} existingGroups={existingGroups}
                          onSave={() => { setEditingCustomService(null); loadServices(); }} onCancel={() => setEditingCustomService(null)}/>
                      ) : (
                        <ServiceCard svc={svc} onEdit={() => { setEditingCustomService(svc); setShowServiceForm(false); }}
                          onRemove={async () => { await supabase.update("custom_services",{is_active:false},"id=eq."+svc.id,auth.access_token); setCustomServices(prev => prev.filter(s => s.id!==svc.id)); }}/>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {showServiceForm ? (
            <ServiceForm practitionerId={prac.id} token={auth.access_token} existingService={null} existingGroups={existingGroups}
              onSave={() => { setShowServiceForm(false); loadServices(); }} onCancel={() => setShowServiceForm(false)}/>
          ) : (
            !editingCustomService && (
              <button onClick={() => setShowServiceForm(true)} style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 24px", background:"none", border:"1.5px dashed var(--border)", cursor:"pointer", fontFamily:"'Outfit',sans-serif", fontSize:13, fontWeight:500, color:"var(--charcoal)", width:"100%" }}>
                <span style={{ fontSize:18, color:"var(--gold)", lineHeight:1 }}>+</span>Add a service
              </button>
            )
          )}
        </div>
      )}

      {tab === "schedule" && (
        <div style={{ maxWidth:680 }}>
          <p style={{ fontSize:14, color:"var(--warm-gray)", fontWeight:300, marginBottom:32, lineHeight:1.7 }}>Set your working days and hours. Block out specific dates or time ranges for holidays or days off.</p>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:400, marginBottom:20, paddingBottom:12, borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ width:20, height:1.5, background:"var(--gold)", display:"inline-block" }}/>Weekly Hours
          </div>
          {availability.map((row, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:16, padding:"14px 20px", background:row.is_available?"var(--warm-white)":"transparent", border:"1.5px solid var(--border)", marginBottom:8, opacity:row.is_available?1:.5, transition:"all .2s" }}>
              <button onClick={() => { updateAvail(i,"is_available",!row.is_available); setTimeout(() => saveAvailability(i),100); }} style={{ width:44, height:24, borderRadius:12, border:"none", cursor:"pointer", background:row.is_available?"var(--charcoal)":"var(--border)", position:"relative", transition:"background .2s", flexShrink:0 }}>
                <span style={{ position:"absolute", top:3, left:row.is_available?23:3, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"left .2s", display:"block" }}/>
              </button>
              <div style={{ width:96, fontSize:14, fontWeight:row.is_available?500:300, color:row.is_available?"var(--charcoal)":"var(--warm-gray)" }}>{DAY_NAMES[i]}</div>
              {row.is_available && (
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:12, color:"var(--warm-gray)" }}>From</span>
                    <input type="time" value={row.start_time} onChange={e => updateAvail(i,"start_time",e.target.value)} onBlur={() => saveAvailability(i)} style={{ padding:"8px 10px", border:"1.5px solid var(--border)", background:"var(--cream)", fontFamily:"'Outfit',sans-serif", fontSize:13, outline:"none" }}/>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:12, color:"var(--warm-gray)" }}>Until</span>
                    <input type="time" value={row.end_time} onChange={e => updateAvail(i,"end_time",e.target.value)} onBlur={() => saveAvailability(i)} style={{ padding:"8px 10px", border:"1.5px solid var(--border)", background:"var(--cream)", fontFamily:"'Outfit',sans-serif", fontSize:13, outline:"none" }}/>
                  </div>
                </>
              )}
              {!row.is_available && <span style={{ fontSize:13, color:"var(--warm-gray)", fontWeight:300 }}>Not working</span>}
            </div>
          ))}
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:400, margin:"40px 0 20px", paddingBottom:12, borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ width:20, height:1.5, background:"var(--gold)", display:"inline-block" }}/>Blocked Dates
          </div>
          <p style={{ fontSize:13, color:"var(--warm-gray)", fontWeight:300, marginBottom:20, lineHeight:1.7 }}>Block a full day off, or just specific hours within a day.</p>
          <div style={{ marginBottom:24 }}>
            <div style={{ display:"flex", gap:8, marginBottom:16 }}>
              <button onClick={() => setBlockType("full")} style={{ padding:"10px 20px", background:blockType==="full"?"var(--charcoal)":"none", color:blockType==="full"?"var(--cream)":"var(--charcoal)", border:blockType==="full"?"1.5px solid var(--charcoal)":"1.5px solid var(--border)", cursor:"pointer", fontFamily:"'Outfit',sans-serif", fontSize:12, fontWeight:500, letterSpacing:"1.5px", textTransform:"uppercase", transition:"all .2s" }}>Full Day</button>
              <button onClick={() => setBlockType("partial")} style={{ padding:"10px 20px", background:blockType==="partial"?"var(--charcoal)":"none", color:blockType==="partial"?"var(--cream)":"var(--charcoal)", border:blockType==="partial"?"1.5px solid var(--charcoal)":"1.5px solid var(--border)", cursor:"pointer", fontFamily:"'Outfit',sans-serif", fontSize:12, fontWeight:500, letterSpacing:"1.5px", textTransform:"uppercase", transition:"all .2s" }}>Time Range</button>
            </div>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"flex-end" }}>
              <div style={{ flex:"1 1 160px" }}>
                <label style={{ fontSize:11, color:"var(--warm-gray)", letterSpacing:"1px", textTransform:"uppercase", display:"block", marginBottom:6 }}>Date</label>
                <input type="date" value={newBlock} onChange={e => setNewBlock(e.target.value)} min={new Date().toISOString().split("T")[0]} style={{ width:"100%", padding:"12px 16px", border:"1.5px solid var(--border)", background:"var(--warm-white)", fontFamily:"'Outfit',sans-serif", fontSize:14, outline:"none" }}/>
              </div>
              {blockType === "partial" && (
                <>
                  <div style={{ flex:"0 1 130px" }}>
                    <label style={{ fontSize:11, color:"var(--warm-gray)", letterSpacing:"1px", textTransform:"uppercase", display:"block", marginBottom:6 }}>From</label>
                    <input type="time" value={newBlockStart} onChange={e => setNewBlockStart(e.target.value)} style={{ width:"100%", padding:"12px 16px", border:"1.5px solid var(--border)", background:"var(--warm-white)", fontFamily:"'Outfit',sans-serif", fontSize:14, outline:"none" }}/>
                  </div>
                  <div style={{ flex:"0 1 130px" }}>
                    <label style={{ fontSize:11, color:"var(--warm-gray)", letterSpacing:"1px", textTransform:"uppercase", display:"block", marginBottom:6 }}>Until</label>
                    <input type="time" value={newBlockEnd} onChange={e => setNewBlockEnd(e.target.value)} style={{ width:"100%", padding:"12px 16px", border:"1.5px solid var(--border)", background:"var(--warm-white)", fontFamily:"'Outfit',sans-serif", fontSize:14, outline:"none" }}/>
                  </div>
                </>
              )}
              <button onClick={addBlockedDate} disabled={!newBlock||blockSaving||(blockType==="partial"&&(!newBlockStart||!newBlockEnd))} style={{ padding:"12px 28px", background:"var(--charcoal)", color:"var(--cream)", border:"none", cursor:"pointer", fontFamily:"'Outfit',sans-serif", fontSize:12, fontWeight:500, letterSpacing:"2px", textTransform:"uppercase", opacity:newBlock&&!blockSaving&&(blockType==="full"||(newBlockStart&&newBlockEnd))?1:.35, alignSelf:"flex-end" }}>Block</button>
            </div>
          </div>
          {blockedDates.length===0 ? (
            <div style={{ fontSize:14, color:"var(--warm-gray)", fontWeight:300, padding:"20px 0" }}>No dates blocked.</div>
          ) : (
            blockedDates.map(b => (
              <div key={b.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 20px", background:"var(--warm-white)", border:"1.5px solid var(--border)", marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:500 }}>{new Date(b.blocked_date+"T12:00:00").toLocaleDateString("en-GB",{ weekday:"long", day:"numeric", month:"long", year:"numeric" })}</div>
                  <div style={{ fontSize:12, color:b.start_time?"var(--gold)":"var(--warm-gray)", fontWeight:300, marginTop:2 }}>
                    {b.start_time && b.end_time ? b.start_time.slice(0,5)+" – "+b.end_time.slice(0,5) : "All day"}
                  </div>
                </div>
                <button onClick={() => removeBlockedDate(b.id)} style={{ padding:"6px 14px", background:"none", color:"var(--red)", border:"1px solid var(--red)", cursor:"pointer", fontSize:11, fontWeight:600, letterSpacing:.5, textTransform:"uppercase", fontFamily:"'Outfit',sans-serif" }}>Remove</button>
              </div>
            ))
          )}
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:400, margin:"40px 0 20px", paddingBottom:12, borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ width:20, height:1.5, background:"var(--gold)", display:"inline-block" }}/>Booking Slots
          </div>
          <p style={{ fontSize:14, color:"var(--warm-gray)", fontWeight:300, marginBottom:20, lineHeight:1.7 }}>How often should available time slots appear in the booking calendar?</p>
          <div style={{ display:"flex", gap:12, alignItems:"center", padding:"16px 20px", background:"var(--warm-white)", border:"1.5px solid var(--border)", marginBottom:32 }}>
            <span style={{ fontSize:14, fontWeight:500, marginRight:8 }}>Show slots every</span>
            {[15, 30, 60].map(mins => (
              <button key={mins} onClick={async () => {
                if (IS_DEMO) return;
                try {
                  await supabase.update("practitioners", { slot_interval:mins }, "id=eq."+prac.id, auth.access_token);
                  setPrac(prev => ({ ...prev, slot_interval:mins }));
                } catch(e) { console.error(e); }
              }} style={{
                padding:"10px 20px",
                background:(prac?.slot_interval||30)===mins?"var(--charcoal)":"none",
                color:(prac?.slot_interval||30)===mins?"var(--cream)":"var(--charcoal)",
                border:(prac?.slot_interval||30)===mins?"1.5px solid var(--charcoal)":"1.5px solid var(--border)",
                cursor:"pointer", fontFamily:"'Outfit',sans-serif", fontSize:13, fontWeight:500, transition:"all .2s"
              }}>{mins} min</button>
            ))}
          </div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:400, margin:"40px 0 20px", paddingBottom:12, borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ width:20, height:1.5, background:"var(--gold)", display:"inline-block" }}/>Calendar Sync
          </div>
          <p style={{ fontSize:14, color:"var(--warm-gray)", fontWeight:300, lineHeight:1.7, marginBottom:20 }}>Subscribe to your personal calendar feed to see all your bookings in Google Calendar or Apple Calendar.</p>
          <div style={{ padding:"20px 24px", background:"var(--warm-white)", border:"1.5px solid var(--border)", marginBottom:12 }}>
            <div style={{ fontSize:12, color:"var(--warm-gray)", letterSpacing:"1px", textTransform:"uppercase", marginBottom:10 }}>Your calendar link</div>
            <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
              <input readOnly value={"https://rousxlmxmjrkyvczbtan.supabase.co/functions/v1/practitioner-calendar?token="+(prac?.calendar_token||"")}
                style={{ flex:1, padding:"10px 14px", border:"1.5px solid var(--border)", background:"var(--cream)", fontFamily:"'Outfit',sans-serif", fontSize:12, color:"var(--warm-gray)", outline:"none", minWidth:0 }}
                onClick={e => e.target.select()}/>
              <button onClick={() => { navigator.clipboard.writeText("https://rousxlmxmjrkyvczbtan.supabase.co/functions/v1/practitioner-calendar?token="+(prac?.calendar_token||"")); alert("Calendar link copied!"); }}
                style={{ padding:"10px 20px", background:"var(--charcoal)", color:"var(--cream)", border:"none", cursor:"pointer", fontFamily:"'Outfit',sans-serif", fontSize:12, fontWeight:500, letterSpacing:"1.5px", textTransform:"uppercase", whiteSpace:"nowrap" }}>Copy Link</button>
            </div>
          </div>
          <p style={{ fontSize:13, color:"var(--warm-gray)", fontWeight:300, lineHeight:1.7 }}>
            <strong>Google Calendar:</strong> Open Google Calendar → Other calendars → + → From URL → paste link<br/>
            <strong>Apple Calendar:</strong> File → New Calendar Subscription → paste link
          </p>
        </div>
      )}
    </div>
  );
}
