// src/Site.jsx — Public-facing website
// Nav, Hero, Divider, ServicesList, TeamSection, BookingFlow, CancelPage

import React, { useState, useEffect, useRef } from "react";
import { supabase, IS_DEMO } from "./supabase.js";
import {
  DEMO_SERVICES_LIST,
  TREATMENT_CATEGORIES,
  getDaysInMonth,
  getMonthName,
  getDayName,
  dateStr,
  usePractitioners,
  useAvailableSlots,
  ServiceGroup,
} from "./shared.jsx";

// ============================================================
// NAV
// ============================================================

function Nav({ scrolled, onNav, onBook, onDash }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);

  return (
    <>
      <nav className={"nn-nav" + (scrolled ? " scrolled" : "")}>
        <img src="/logo-dark.png" alt="ninety nine." className="nn-logo" onClick={() => { onNav("home"); close(); }} />
        <ul className="nn-nav-links">
          <li><a onClick={() => onNav("services")}>Services</a></li>
          <li><a onClick={() => onNav("team")}>Team</a></li>
          <li><a onClick={() => onNav("contact")}>Contact</a></li>
          <li><a onClick={onDash} style={{ opacity: 0.5, fontSize: 11 }}>Staff Login</a></li>
          <li><button className="nn-nav-book" onClick={onBook}>Book Now</button></li>
        </ul>
        <button className="nn-mobile-toggle" onClick={() => setMobileOpen(o => !o)} aria-label="Menu">
          {mobileOpen
            ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          }
        </button>
      </nav>
      {mobileOpen && (
        <div className="nn-mobile-nav">
          {[
            { label: "Services", fn: () => { onNav("services"); close(); } },
            { label: "Team",     fn: () => { onNav("team");     close(); } },
            { label: "Contact",  fn: () => { onNav("contact");  close(); } },
          ].map(item => (
            <button key={item.label} className="nn-mobile-nav-link" onClick={item.fn}>{item.label}</button>
          ))}
          <div className="nn-mobile-nav-divider" />
          <button className="nn-mobile-nav-book" onClick={() => { onBook(); close(); }}>Book Now</button>
          <button className="nn-mobile-nav-staff" onClick={() => { onDash(); close(); }}>Staff Login</button>
        </div>
      )}
    </>
  );
}

// ============================================================
// HERO
// ============================================================

function Hero({ onBook }) {
  return (
    <section className="nn-hero" id="home">
      <div className="nn-hero-accent" />
      <img src="/logo-dark.png" alt="ninety nine." className="nn-hero-logo" />
      <div className="nn-hero-services">
        <span>Hands</span><span className="dot" /><span>Toes</span><span className="dot" /><span>Brows</span><span className="dot" /><span>Lashes</span><span className="dot" /><span>Facials</span>
      </div>
      <p className="nn-hero-address">99 Banks Road · West Kirby</p>
      <div className="nn-hero-cta">
        <button className="nn-btn nn-btn-dark" onClick={onBook}>Book Appointment</button>
        <a className="nn-btn nn-btn-outline" href="https://www.instagram.com/ninetyninebyk/" target="_blank" rel="noopener noreferrer">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>
          Follow Us
        </a>
      </div>
    </section>
  );
}

// ============================================================
// DIVIDER
// ============================================================

function Divider() {
  return (
    <div className="nn-divider">
      <div className="nn-divider-line" />
      <div className="nn-divider-diamond" />
      <div className="nn-divider-line" />
    </div>
  );
}

// ============================================================
// SERVICES LIST
// ============================================================

function ServicesList({ practitioners, onBookWith }) {
  const findPrac = (name) => practitioners.find(p => p.name === name);
  return (
    <section className="nn-section" id="services">
      <div className="nn-section-label">Our Services</div>
      <h2 className="nn-section-title">Treatments</h2>
      <p className="nn-section-desc">From gel manicures to luxury facials, every treatment is delivered with care in our warm, welcoming space on Banks Road. Tap a name to book.</p>
      <div className="nn-treat-grid">
        {TREATMENT_CATEGORIES.map(cat => (
          <div className="nn-treat-card" key={cat.id}>
            <div className="nn-treat-icon">{cat.icon}</div>
            <div className="nn-treat-title">{cat.title}</div>
            <div className="nn-treat-desc">{cat.description}</div>
            <div className="nn-treat-pracs">
              {cat.practitioners.map(name => {
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

// ============================================================
// TEAM SECTION
// ============================================================

function TeamSection({ practitioners }) {
  return (
    <section className="nn-section" id="team">
      <div className="nn-section-label">The Team</div>
      <h2 className="nn-section-title">Meet the Girls</h2>
      <p className="nn-section-desc">Each of our talented practitioners is self-employed, bringing their own unique expertise and loyal clientele to ninety nine.</p>
      <div className="nn-team-grid">
        {practitioners.map(p => (
          <div className="nn-team-card" key={p.id} style={p.name === "Kristen" ? { border: "2px solid var(--gold)" } : {}}>
            {p.photo
              ? <div className="nn-team-avatar" style={{ backgroundImage: "url(" + p.photo + ")" }} />
              : <div className="nn-team-avatar" style={{ background: p.color }}>{p.name[0]}</div>
            }
            <div className="nn-team-name">{p.name}</div>
            <div className="nn-team-role">{p.role}</div>
            {p.instagram && (
              <a href={"https://www.instagram.com/" + p.instagram.replace("@", "") + "/"} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, color: "var(--gold)", textDecoration: "none", marginTop: 6, display: "inline-block" }}>
                {p.instagram}
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// EMAIL VALIDATION HELPER
// ============================================================

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ============================================================
// BOOKING FLOW
// ============================================================

function BookingFlow({ practitioners, preselectedPrac, onClearPreselect, drawerMode = false, onClose }) {
  const [step, setStep] = useState(preselectedPrac ? 2 : 1);
  const [prac, setPrac] = useState(preselectedPrac || null);
  const [svc, setSvc] = useState(null);
  const [addon, setAddon] = useState(null);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [customServices, setCustomServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const now = new Date();
  const [cM, setCM] = useState(now.getMonth());
  const [cY, setCY] = useState(now.getFullYear());
  const labels = ["Practitioner", "Service", "Date & Time", "Confirm"];

  const emailValid = isValidEmail(email);
  const canConfirm = clientName.trim() && phone.trim() && emailValid && !saving;

  useEffect(() => {
    if (preselectedPrac) {
      setPrac(preselectedPrac); setStep(2); setSvc(null); setAddon(null);
      setDate(null); setTime(null); setDone(false);
      if (onClearPreselect) onClearPreselect();
    }
  }, [preselectedPrac]);

  useEffect(() => {
    if (!prac) { setCustomServices([]); return; }
    if (IS_DEMO) { setCustomServices(DEMO_SERVICES_LIST); return; }
    setLoadingServices(true);
    supabase.query("custom_services", {
      select: "*,addon:custom_service_addons(*)",
      filters: "&practitioner_id=eq." + prac.id + "&is_active=eq.true&order=group_order,service_order,created_at",
    }).then(rows => {
      setCustomServices(rows.map(s => ({ ...s, addon: s.addon?.[0] || null })));
      setLoadingServices(false);
    }).catch(() => setLoadingServices(false));
  }, [prac]);

  // Fetch practitioner's weekly availability so we can grey out days in the calendar
  const [availability, setAvailability] = useState([]);
  useEffect(() => {
    if (!prac) { setAvailability([]); return; }
    if (IS_DEMO) {
      // Mon–Sat available, Sun off
      setAvailability([0,1,2,3,4,5].map(d => ({ day_of_week: d, is_available: true })));
      return;
    }
    supabase.query("availability", {
      filters: "&practitioner_id=eq." + prac.id + "&is_available=eq.false",
    }).then(rows => setAvailability(rows)).catch(() => setAvailability([]));
  }, [prac]);

  // Set of day-of-week numbers (0=Mon…6=Sun) that are unavailable
  // Note: our schema uses 0=Monday; JS getDay() uses 0=Sunday
  // We convert: schema day 0=Mon → JS day 1, schema day 6=Sun → JS day 0
  const unavailableDays = new Set(availability.map(r => {
    // schema: 0=Mon,1=Tue,...,5=Sat,6=Sun → JS: Mon=1,Tue=2,...,Sat=6,Sun=0
    return r.day_of_week === 6 ? 0 : r.day_of_week + 1;
  }));

  const totalDuration = (svc?.duration || 0) + (addon ? addon.duration : 0);
  const totalPrice = (svc?.price || 0) + (addon ? addon.price : 0);
  const { slots, loading: slotsLoading } = useAvailableSlots(prac?.id, date, totalDuration, prac?.slot_interval || 30);
  const dateStep = svc?.addon ? 4 : 3;
  const confirmStep = svc?.addon ? 5 : 4;
  const totalSteps = svc?.addon ? 5 : 4;

  const groups = [...new Set(customServices.filter(s => s.group_name).map(s => s.group_name))];
  const ungrouped = customServices.filter(s => !s.group_name);

  function handleSelectService(s) {
    setSvc(s); setAddon(null);
    if (s.addon) { setStep(3); } else { setStep(dateStep); }
  }

  async function handleConfirm() {
    if (!canConfirm) return;
    if (IS_DEMO) { setDone(true); return; }
    setSaving(true);
    try {
      const serviceTitle = svc.title + (addon ? " + " + addon.title : "");
      await supabase.insert("bookings", {
        practitioner_id: prac.id,
        service_id: svc.id,
        service_title: serviceTitle,
        client_name: clientName.trim(),
        client_phone: phone.trim(),
        client_email: email.trim(),
        booking_date: dateStr(date.year, date.month, date.day),
        booking_time: time + ":00",
        duration: totalDuration,
        price: totalPrice,
        notes: addon ? "Add-on: " + addon.title : "",
      });
      setDone(true);
    } catch (e) { console.error(e); alert("Sorry, there was an error creating your booking. Please try again."); }
    setSaving(false);
  }

  const H3 = ({ children }) => (
    <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: drawerMode ? 20 : 24, fontWeight: 400, marginBottom: 20 }}>{children}</h3>
  );

  const StepIndicator = () => drawerMode ? (
    <div className="nn-booking-drawer-step-indicator">
      Step <span>{step}</span> of <span>{totalSteps}</span>
      {labels[step - 1] && <> · {labels[step - 1]}</>}
    </div>
  ) : (
    <div className="nn-steps">
      {labels.map((l, i) => (
        <React.Fragment key={i}>
          {i > 0 && <div className="nn-step-line" />}
          <div className={"nn-step" + (step === i + 1 ? " active" : "") + (step > i + 1 ? " done" : "")}>
            <div className="nn-step-num">{step > i + 1 ? "✓" : i + 1}</div>
            <span>{l}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );

  if (done) {
    return (
      <div style={{ padding: drawerMode ? "40px 0" : "60px 0", maxWidth: 480, margin: "0 auto" }}>
        <div className="nn-success-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 30, fontWeight: 300, textAlign: "center", marginBottom: 10 }}>You're all booked</h2>
        <p style={{ textAlign: "center", color: "var(--warm-gray)", fontSize: 14, fontWeight: 300, lineHeight: 1.65 }}>
          {clientName}, your appointment with {prac.name} is confirmed for {getDayName(date.year, date.month, date.day)} {date.day} {getMonthName(date.month)} at {time}.<br />
          A confirmation has been sent to {email}. See you at 99 Banks Road!
        </p>
        {drawerMode && onClose && (
          <div style={{ textAlign: "center", marginTop: 32 }}>
            <button className="nn-btn nn-btn-dark" onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <StepIndicator />

      {step === 1 && (
        <div>
          <H3>Who would you like to see?</H3>
          <div className="nn-prac-grid">
            {practitioners.map(p => (
              <div key={p.id} className={"nn-prac-card" + (prac?.id === p.id ? " picked" : "")} onClick={() => { setPrac(p); setStep(2); }}>
                {p.photo
                  ? <div className="nn-team-avatar" style={{ backgroundImage: "url(" + p.photo + ")", width: 44, height: 44, margin: "0 auto 10px" }} />
                  : <div className="nn-team-avatar" style={{ background: p.color, width: 44, height: 44, fontSize: 16, margin: "0 auto 10px" }}>{p.name[0]}</div>
                }
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 17, fontWeight: 400, marginBottom: 2 }}>{p.name}</div>
                <div style={{ fontSize: 10, color: "var(--warm-gray)", fontWeight: 300 }}>{p.specialty}</div>
              </div>
            ))}
          </div>

        </div>
      )}

      {step === 2 && (
        <div>
          <H3>{prac?.name}'s services</H3>
          {loadingServices ? (
            <div style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300 }}>Loading services...</div>
          ) : customServices.length === 0 ? (
            <div style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300 }}>No services available yet. Please DM us on Instagram.</div>
          ) : (
            <div>
              {groups.map(group => (
                <div key={group} style={{ marginBottom: 20 }}>
                  <div className="nn-svc-group-label">{group}</div>
                  <ServiceGroup services={customServices.filter(s => s.group_name === group)} selectedId={svc?.id} onSelect={handleSelectService} />
                </div>
              ))}
              {ungrouped.length > 0 && (
                <div>
                  {groups.length > 0 && <div className="nn-svc-group-label">Other</div>}
                  <ServiceGroup services={ungrouped} selectedId={svc?.id} onSelect={handleSelectService} />
                </div>
              )}
            </div>
          )}
          <div className="nn-booking-nav">
            <button className="nn-btn-back" onClick={() => setStep(1)}>Back</button>
          </div>
        </div>
      )}

      {step === 3 && svc?.addon && (
        <div>
          <H3>Would you like to add anything?</H3>
          <p style={{ fontSize: 13, color: "var(--warm-gray)", fontWeight: 300, marginBottom: 24, lineHeight: 1.7 }}>
            Optional extra for your {svc.title} appointment.
          </p>
          <div className={"nn-svc-item" + (addon === null ? " picked" : "")} onClick={() => { setAddon(null); setStep(dateStep); }} style={{ marginBottom: 8 }}>
            <div><div style={{ fontWeight: 500 }}>No add-on</div><div style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300 }}>Just the {svc.title}</div></div>
            <div style={{ fontSize: 13, color: "var(--warm-gray)" }}>—</div>
          </div>
          <div className={"nn-svc-item" + (addon?.id === svc.addon.id ? " picked" : "")} onClick={() => { setAddon(svc.addon); setStep(dateStep); }}>
            <div><div style={{ fontWeight: 500 }}>{svc.addon.title}</div><div style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300 }}>{svc.addon.duration} min extra</div></div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--gold)" }}>+£{svc.addon.price}</div>
          </div>
          <div className="nn-booking-nav">
            <button className="nn-btn-back" onClick={() => setStep(2)}>Back</button>
          </div>
        </div>
      )}

      {step === dateStep && (
        <div>
          <H3>Pick a date &amp; time</H3>
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
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
                    const jsDay = new Date(cY, cM, d).getDay();
                    const unavail = unavailableDays.has(jsDay);
                    const sel = date && date.day === d && date.month === cM && date.year === cY;
                    cells.push(
                      <button key={d} className={"nn-cal-day" + (sel ? " on" : "") + (past || unavail ? " off" : "") + (isNow ? " now" : "")}
                        onClick={() => { if (!past && !unavail) { setDate({ day: d, month: cM, year: cY }); setTime(null); } }}
                        disabled={past || unavail}>{d}</button>
                    );
                  }
                  return cells;
                })()}
              </div>
            </div>
            {date && (
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 13, color: "var(--warm-gray)", marginBottom: 12, fontWeight: 300 }}>
                  {getDayName(date.year, date.month, date.day)} {date.day} {getMonthName(date.month)}
                </div>
                {slotsLoading ? (
                  <div style={{ color: "var(--warm-gray)", fontSize: 13, fontWeight: 300 }}>Loading times...</div>
                ) : slots.length === 0 ? (
                  <div style={{ color: "var(--red)", fontSize: 13, fontWeight: 300 }}>No available slots. Try another day.</div>
                ) : (
                  <div className="nn-times">{slots.map(t => <button key={t} className={"nn-time" + (time === t ? " on" : "")} onClick={() => setTime(t)}>{t}</button>)}</div>
                )}
              </div>
            )}
          </div>
          <div className="nn-booking-nav">
            <button className="nn-btn-back" onClick={() => setStep(svc?.addon ? 3 : 2)}>Back</button>
            <button className="nn-btn nn-btn-dark" onClick={() => setStep(confirmStep)} disabled={!date || !time} style={{ opacity: date && time ? 1 : .35 }}>Continue</button>
          </div>
        </div>
      )}

      {step === confirmStep && (
        <div>
          <H3>Confirm your booking</H3>
          <div className="nn-confirm">
            <div className="nn-confirm-row"><span className="nn-confirm-label">Practitioner</span><span className="nn-confirm-val">{prac?.name}</span></div>
            <div className="nn-confirm-row"><span className="nn-confirm-label">Treatment</span><span className="nn-confirm-val">{svc?.title}</span></div>
            {addon && <div className="nn-confirm-row"><span className="nn-confirm-label">Add-on</span><span className="nn-confirm-val">{addon.title}</span></div>}
            <div className="nn-confirm-row"><span className="nn-confirm-label">Date</span><span className="nn-confirm-val">{getDayName(date.year, date.month, date.day)} {date.day} {getMonthName(date.month)} {date.year}</span></div>
            <div className="nn-confirm-row"><span className="nn-confirm-label">Time</span><span className="nn-confirm-val">{time}</span></div>
            <div className="nn-confirm-row"><span className="nn-confirm-label">Duration</span><span className="nn-confirm-val">{totalDuration} min</span></div>
            <div className="nn-confirm-row"><span className="nn-confirm-label">Price</span><span className="nn-confirm-val" style={{ color: "var(--gold)", fontWeight: 600 }}>£{totalPrice}</span></div>
            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="nn-input-label">Your Name</label>
                <input className="nn-input" type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Full name" />
              </div>
              <div>
                <label className="nn-input-label">Phone Number</label>
                <input className="nn-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="07xxx xxxxxx" />
              </div>
              <div>
                <label className="nn-input-label">
                  Email Address
                  {emailTouched && !emailValid && (
                    <span style={{ color: "var(--red)", fontWeight: 400, letterSpacing: 0, textTransform: "none", marginLeft: 8, fontSize: 11 }}>
                      Please enter a valid email
                    </span>
                  )}
                </label>
                <input
                  className="nn-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  placeholder="your@email.com"
                  style={emailTouched && !emailValid ? { borderColor: "var(--red)" } : {}}
                />
                <div style={{ fontSize: 11, color: "var(--warm-gray)", marginTop: 5, fontWeight: 300 }}>
                  Your confirmation and reminder will be sent here.
                </div>
              </div>
            </div>
          </div>
          <div className="nn-booking-nav">
            <button className="nn-btn-back" onClick={() => setStep(dateStep)}>Back</button>
            <button
              className="nn-btn nn-btn-gold"
              onClick={handleConfirm}
              disabled={!canConfirm}
              style={{ opacity: canConfirm ? 1 : .35 }}
            >
              {saving ? "Booking..." : "Confirm Booking"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// CANCEL PAGE
// ============================================================

export function CancelPage({ token }) {
  const [status, setStatus] = useState("loading");
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    supabase.query("bookings", {
      select: "*,practitioner:practitioners(name)",
      filters: "&cancellation_token=eq." + token + "&status=eq.confirmed",
    }).then(rows => {
      if (rows.length === 0) { setStatus("notfound"); return; }
      setBooking(rows[0]); setStatus("confirm");
    }).catch(() => setStatus("error"));
  }, [token]);

  async function handleCancel() {
    setStatus("cancelling");
    try {
      await supabase.update("bookings", { status: "cancelled", cancelled_by: "client" }, "cancellation_token=eq." + token);
      setStatus("done");
    } catch (e) { console.error(e); setStatus("error"); }
  }

  const dateObj = booking ? new Date(booking.booking_date + "T12:00:00") : null;
  const formattedDate = dateObj?.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const treatmentName = booking?.service_title || booking?.notes || "Your treatment";

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontStyle: "italic", fontWeight: 300, marginBottom: 8 }}>ninety nine.</div>
      <div style={{ width: 36, height: 1.5, background: "var(--gold)", margin: "0 auto 40px" }} />
      {status === "loading" && <div style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300 }}>Loading...</div>}
      {status === "notfound" && (
        <div style={{ textAlign: "center", maxWidth: 380 }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 300, marginBottom: 14 }}>Booking not found</div>
          <p style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300, lineHeight: 1.7 }}>This booking may have already been cancelled. DM us on Instagram <a href="https://www.instagram.com/ninetyninebyk/" style={{ color: "var(--gold)" }}>@ninetyninebyk</a> if you need help.</p>
        </div>
      )}
      {status === "confirm" && booking && (
        <div style={{ maxWidth: 440, width: "100%" }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 30, fontWeight: 300, marginBottom: 8, textAlign: "center" }}>Cancel appointment</div>
          <p style={{ textAlign: "center", color: "var(--warm-gray)", fontSize: 14, fontWeight: 300, marginBottom: 32 }}>Are you sure you want to cancel this booking?</p>
          <div style={{ background: "var(--warm-white)", border: "1px solid var(--border)", padding: "24px 20px", marginBottom: 24 }}>
            {[["Treatment", treatmentName], ["Practitioner", booking.practitioner?.name], ["Date", formattedDate], ["Time", booking.booking_time?.slice(0, 5)]].map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid var(--border)", fontSize: 14 }}>
                <span style={{ color: "var(--warm-gray)", fontWeight: 300 }}>{label}</span>
                <span style={{ fontWeight: 500 }}>{val}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <a href="/" style={{ flex: 1, padding: "14px", background: "none", border: "1.5px solid var(--border)", fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "2px", textTransform: "uppercase", textAlign: "center", textDecoration: "none", color: "var(--charcoal)" }}>Keep Booking</a>
            <button onClick={handleCancel} style={{ flex: 1, padding: "14px", background: "var(--red)", color: "#fff", border: "none", fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "2px", textTransform: "uppercase", cursor: "pointer" }}>Yes, Cancel</button>
          </div>
        </div>
      )}
      {status === "cancelling" && <div style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300 }}>Cancelling your appointment...</div>}
      {status === "done" && (
        <div style={{ textAlign: "center", maxWidth: 380 }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 30, fontWeight: 300, marginBottom: 14 }}>Booking cancelled</div>
          <p style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300, lineHeight: 1.7, marginBottom: 28 }}>Your appointment has been cancelled. We hope to see you again soon.</p>
          <a href="/" style={{ display: "inline-block", padding: "14px 36px", background: "var(--charcoal)", color: "var(--cream)", textDecoration: "none", fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "2px", textTransform: "uppercase" }}>Back to Website</a>
        </div>
      )}
      {status === "error" && (
        <div style={{ textAlign: "center", maxWidth: 380 }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 300, marginBottom: 14 }}>Something went wrong</div>
          <p style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300, lineHeight: 1.7 }}>Please DM us on Instagram <a href="https://www.instagram.com/ninetyninebyk/" style={{ color: "var(--gold)" }}>@ninetyninebyk</a> and we'll sort it for you.</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// CLIENT PORTAL — /my-bookings?email=xxx&token=yyy
// Shown when a client clicks "View my bookings" from their email.
// Token is a simple HMAC-style hash of the email — no password needed.
// ============================================================

export function ClientPortal({ email, token }) {
  const [status, setStatus] = useState("loading");
  const [bookings, setBookings] = useState([]);
  const [editingBooking, setEditingBooking] = useState(null); // booking being rescheduled
  const [cancellingId, setCancellingId] = useState(null);
  const now = new Date();
  const [cM, setCM] = useState(now.getMonth());
  const [cY, setCY] = useState(now.getFullYear());
  const [editDate, setEditDate] = useState(null);
  const [editTime, setEditTime] = useState(null);
  const [rescheduling, setRescheduling] = useState(false);

  const { slots, loading: slotsLoading } = useAvailableSlots(
    editingBooking?.practitioner_id, editDate, editingBooking?.duration, 30
  );

  useEffect(() => {
    if (!email || !token) { setStatus("invalid"); return; }
    const expected = btoa(email.toLowerCase().trim()).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
    if (token !== expected) { setStatus("invalid"); return; }
    loadBookings();
  }, [email, token]);

  function loadBookings() {
    supabase.query("bookings", {
      select: "*,practitioner:practitioners(name,color,slot_interval)",
      filters: "&client_email=eq." + encodeURIComponent(email.toLowerCase().trim()) +
               "&status=eq.confirmed" +
               "&booking_date=gte." + new Date().toISOString().split("T")[0] +
               "&order=booking_date.asc,booking_time.asc",
    }).then(rows => {
      setBookings(rows);
      setStatus("ready");
    }).catch(() => setStatus("error"));
  }

  function startEdit(booking) {
    setEditingBooking(booking);
    setEditDate(null);
    setEditTime(null);
    setCM(now.getMonth());
    setCY(now.getFullYear());
  }

  function cancelEdit() {
    setEditingBooking(null);
    setEditDate(null);
    setEditTime(null);
  }

  async function handleReschedule() {
    if (!editDate || !editTime || !editingBooking) return;
    setRescheduling(true);
    try {
      await supabase.update("bookings", {
        booking_date: dateStr(editDate.year, editDate.month, editDate.day),
        booking_time: editTime + ":00",
        rescheduled_by: "client",
      }, "id=eq." + editingBooking.id);
      setEditingBooking(null);
      setEditDate(null);
      setEditTime(null);
      loadBookings();
    } catch (e) {
      console.error(e);
      alert("Something went wrong. Please DM us on Instagram @ninetyninebyk.");
    }
    setRescheduling(false);
  }

  async function handleCancel(booking) {
    if (!window.confirm(`Cancel your ${booking.service_title} on ${new Date(booking.booking_date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}?`)) return;
    setCancellingId(booking.id);
    try {
      await supabase.update("bookings", { status: "cancelled", cancelled_by: "client" }, "cancellation_token=eq." + booking.cancellation_token);
      setBookings(prev => prev.filter(b => b.id !== booking.id));
    } catch (e) {
      console.error(e);
      alert("Something went wrong. Please DM us on Instagram @ninetyninebyk.");
    }
    setCancellingId(null);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "40px 24px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <img src="/logo-dark.png" alt="ninety nine." style={{ height: 28, marginBottom: 20 }} />
          <div style={{ width: 36, height: 1.5, background: "var(--gold)", margin: "0 auto 24px" }} />
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 300, marginBottom: 8 }}>Your Bookings</div>
          <div style={{ fontSize: 13, color: "var(--warm-gray)", fontWeight: 300 }}>{email}</div>
        </div>

        {status === "loading" && (
          <div style={{ textAlign: "center", color: "var(--warm-gray)", fontSize: 14, fontWeight: 300 }}>Loading your bookings...</div>
        )}

        {status === "invalid" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 300, marginBottom: 12 }}>Link not valid</div>
            <p style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300, lineHeight: 1.7 }}>
              This link may have expired. Please check your confirmation email for a fresh link, or DM us on Instagram{" "}
              <a href="https://www.instagram.com/ninetyninebyk/" style={{ color: "var(--gold)", textDecoration: "none" }}>@ninetyninebyk</a>.
            </p>
          </div>
        )}

        {status === "error" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 300, marginBottom: 12 }}>Something went wrong</div>
            <p style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300, lineHeight: 1.7 }}>
              Please DM us on Instagram <a href="https://www.instagram.com/ninetyninebyk/" style={{ color: "var(--gold)", textDecoration: "none" }}>@ninetyninebyk</a>.
            </p>
          </div>
        )}

        {status === "ready" && bookings.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 300, marginBottom: 12 }}>No upcoming bookings</div>
            <p style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300, lineHeight: 1.7, marginBottom: 32 }}>
              You don't have any upcoming appointments. Ready to book again?
            </p>
            <a href="/" style={{ display: "inline-block", padding: "14px 36px", background: "var(--charcoal)", color: "var(--cream)", textDecoration: "none", fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "2px", textTransform: "uppercase" }}>
              Book an Appointment
            </a>
          </div>
        )}

        {status === "ready" && bookings.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "2.5px", textTransform: "uppercase", color: "var(--warm-gray)", marginBottom: 16 }}>
              {bookings.length} upcoming appointment{bookings.length !== 1 ? "s" : ""}
            </div>

            {bookings.map(b => {
              const dateObj = new Date(b.booking_date + "T12:00:00");
              const formattedDate = dateObj.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
              const isToday = b.booking_date === new Date().toISOString().split("T")[0];
              const isEditing = editingBooking?.id === b.id;
              const isCancelling = cancellingId === b.id;

              return (
                <div key={b.id} style={{ background: "var(--warm-white)", border: "1px solid var(--border)", marginBottom: 12, position: "relative", overflow: "hidden" }}>
                  {isToday && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "var(--gold)" }} />}

                  {/* Booking summary row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "20px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 400, marginBottom: 4 }}>
                        {b.service_title || "Appointment"}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--warm-gray)", fontWeight: 300, marginBottom: 2 }}>
                        with {b.practitioner?.name}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 500, marginTop: 8, color: isToday ? "var(--gold)" : "var(--charcoal)" }}>
                        {isToday ? "Today" : formattedDate} at {b.booking_time?.slice(0, 5)}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300, marginTop: 2 }}>
                        {b.duration} min · £{b.price}
                      </div>
                    </div>
                    {/* Action buttons */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={() => isEditing ? cancelEdit() : startEdit(b)}
                        style={{ padding: "8px 16px", background: isEditing ? "var(--charcoal)" : "none", color: isEditing ? "var(--cream)" : "var(--charcoal)", border: "1px solid " + (isEditing ? "var(--charcoal)" : "var(--border)"), cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "'Outfit',sans-serif" }}>
                        {isEditing ? "Close" : "Edit"}
                      </button>
                      <button
                        onClick={() => handleCancel(b)}
                        disabled={isCancelling || isEditing}
                        style={{ padding: "8px 16px", background: "none", color: "var(--red)", border: "1px solid var(--red)", cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "'Outfit',sans-serif", opacity: isCancelling || isEditing ? 0.4 : 1 }}>
                        {isCancelling ? "..." : "Cancel"}
                      </button>
                    </div>
                  </div>

                  {/* Inline edit panel */}
                  {isEditing && (
                    <div style={{ borderTop: "1px solid var(--border)", padding: "20px", background: "var(--cream)" }}>
                      <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--warm-gray)", marginBottom: 16 }}>
                        Choose a new date &amp; time
                      </div>

                      {/* Calendar */}
                      <div className="nn-cal" style={{ maxWidth: "100%", marginBottom: 16 }}>
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
                              const jsDay = new Date(cY, cM, d).getDay();
                              const sun = jsDay === 0;
                              const sel = editDate && editDate.day === d && editDate.month === cM && editDate.year === cY;
                              cells.push(
                                <button key={d}
                                  className={"nn-cal-day" + (sel ? " on" : "") + (past || sun ? " off" : "") + (isNow ? " now" : "")}
                                  onClick={() => { if (!past && !sun) { setEditDate({ day: d, month: cM, year: cY }); setEditTime(null); } }}
                                  disabled={past || sun}>{d}</button>
                              );
                            }
                            return cells;
                          })()}
                        </div>
                      </div>

                      {/* Time slots */}
                      {editDate && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 12, color: "var(--warm-gray)", marginBottom: 10, fontWeight: 300 }}>
                            {getDayName(editDate.year, editDate.month, editDate.day)} {editDate.day} {getMonthName(editDate.month)}
                          </div>
                          {slotsLoading ? (
                            <div style={{ color: "var(--warm-gray)", fontSize: 13, fontWeight: 300 }}>Loading times...</div>
                          ) : slots.length === 0 ? (
                            <div style={{ color: "var(--red)", fontSize: 13, fontWeight: 300 }}>No available slots on this day. Try another.</div>
                          ) : (
                            <div className="nn-times">
                              {slots.map(t => (
                                <button key={t} className={"nn-time" + (editTime === t ? " on" : "")} onClick={() => setEditTime(t)}>{t}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        onClick={handleReschedule}
                        disabled={!editDate || !editTime || rescheduling}
                        style={{ width: "100%", padding: "13px", background: "var(--charcoal)", color: "var(--cream)", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", opacity: editDate && editTime && !rescheduling ? 1 : 0.35 }}>
                        {rescheduling ? "Saving..." : "Confirm New Time"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ marginTop: 32, textAlign: "center" }}>
              <a href="/" style={{ display: "inline-block", padding: "14px 36px", background: "var(--charcoal)", color: "var(--cream)", textDecoration: "none", fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "2px", textTransform: "uppercase" }}>
                Book Another Appointment
              </a>
            </div>
          </div>
        )}

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--border)", textAlign: "center", fontSize: 12, color: "var(--warm-gray)", fontWeight: 300 }}>
          99 Banks Road · West Kirby · Wirral
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SITE
// ============================================================

export default function Site({ onDash }) {
  const [scrolled, setScrolled] = useState(false);
  const [preselectedPrac, setPreselectedPrac] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const bookRef = useRef(null);
  const practitioners = usePractitioners();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("vis"); }),
      { threshold: 0.08 }
    );
    document.querySelectorAll(".nn-fade").forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (drawerOpen) { document.body.style.overflow = "hidden"; }
    else { document.body.style.overflow = ""; }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const handleBook = () => {
    if (isMobile) { setDrawerOpen(true); }
    else { bookRef.current?.scrollIntoView({ behavior: "smooth" }); }
  };

  const bookWithPrac = (prac) => {
    setPreselectedPrac(prac);
    if (isMobile) { setDrawerOpen(true); }
    else { bookRef.current?.scrollIntoView({ behavior: "smooth" }); }
  };

  const closeDrawer = () => { setDrawerOpen(false); setPreselectedPrac(null); };

  return (
    <>
      <Nav scrolled={scrolled} onNav={scrollTo} onBook={handleBook} onDash={onDash} />
      <Hero onBook={handleBook} />
      <Divider />
      <div className="nn-fade"><ServicesList practitioners={practitioners} onBookWith={bookWithPrac} /></div>
      <Divider />
      <div className="nn-fade"><TeamSection practitioners={practitioners} /></div>
      <div className="nn-fade">
        <div className="nn-insta">
          <div className="nn-insta-title">Follow our work</div>
          <a href="https://www.instagram.com/ninetyninebyk/" target="_blank" rel="noopener noreferrer">@ninetyninebyk</a>
          <p>See our latest nails, brows, lashes and more on Instagram</p>
        </div>
      </div>

      {/* Desktop inline booking */}
      <section className="nn-section nn-booking nn-booking-inline" id="booking" ref={bookRef} style={{ display: isMobile ? "none" : undefined }}>
        <div style={{ marginBottom: 52 }}>
          <div className="nn-section-label">Book Online</div>
          <h2 className="nn-section-title">Book Your Appointment</h2>
          <p className="nn-section-desc">Choose your practitioner, pick a treatment, and find a time that suits. Payment is taken at the salon.</p>
        </div>
        <BookingFlow
          practitioners={practitioners}
          preselectedPrac={isMobile ? null : preselectedPrac}
          onClearPreselect={() => setPreselectedPrac(null)}
          drawerMode={false}
        />
      </section>

      {/* Mobile booking drawer */}
      <div className={"nn-booking-drawer" + (drawerOpen ? " open" : "")} aria-hidden={!drawerOpen}>
        <div className="nn-booking-drawer-header">
          <div className="nn-booking-drawer-title">Book an appointment</div>
          <button className="nn-booking-drawer-close" onClick={closeDrawer} aria-label="Close">✕</button>
        </div>
        <div className="nn-booking-drawer-body">
          {drawerOpen && (
            <BookingFlow
              practitioners={practitioners}
              preselectedPrac={drawerOpen ? preselectedPrac : null}
              onClearPreselect={() => setPreselectedPrac(null)}
              drawerMode={true}
              onClose={closeDrawer}
            />
          )}
        </div>
      </div>

      <div className="nn-fade">
        <section className="nn-section" id="contact">
          <div className="nn-section-label">Find Us</div>
          <h2 className="nn-section-title">Visit the Salon</h2>
          <div className="nn-contact-grid">
            <div className="nn-contact-block"><h4>Location</h4><p>ninety nine.<br />99 Banks Road<br />West Kirby, Wirral<br />CH48 4DN</p></div>
            <div className="nn-contact-block"><h4>Opening Hours</h4><p>Varies depending on practitioner</p></div>
            <div className="nn-contact-block"><h4>Get in Touch</h4><p>Instagram: <a href="https://www.instagram.com/ninetyninebyk/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold)", textDecoration: "none" }}>@ninetyninebyk</a><br />Book online</p></div>
          </div>
        </section>
      </div>

      <footer className="nn-footer">
        <img src="/logo-light.png" alt="ninety nine." className="nn-footer-logo" />
        99 Banks Road · West Kirby · Wirral &nbsp;·&nbsp; © {new Date().getFullYear()}
      </footer>
    </>
  );
}
