// src/Site.jsx — Public-facing website
// Nav, Hero, Divider, ServicesList, TeamSection, BookingFlow, CancelPage, ClientPortal, BookingSuccess

import React, { useState, useEffect, useRef } from "react";
import { supabase, IS_DEMO, SUPABASE_URL } from "./supabase.js";
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

function Nav({ scrolled, onNav, onBook, onDash, onViewBookings }) {
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
<li><a onClick={onViewBookings}>My Bookings</a></li>
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
            { label: "My Bookings", fn: () => { onViewBookings(); close(); } },
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>
    Follow Us
  </a>
</div>
<div className="nn-scroll-hint">
  <div className="nn-scroll-line"/>
  <span>scroll</span>
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
// CONTACT FORM
// ============================================================

function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [emailTouched, setEmailTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const emailValid = isValidEmail(email);
  const canSend = name.trim() && emailValid && message.trim() && !sending;

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/contact-message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim(), company }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSent(true);
    } catch (e) {
      console.error(e);
      alert("Sorry, your message couldn't be sent. Please try again, or DM us on Instagram @ninetyninebyk.");
    }
    setSending(false);
  }

  if (sent) {
    return (
      <div style={{ maxWidth: 520, margin: "48px auto 0", textAlign: "center", padding: "32px 24px", background: "var(--warm-white)", border: "1px solid var(--border)" }}>
        <div className="nn-success-icon" style={{ width: 56, height: 56, margin: "0 auto 20px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 300, marginBottom: 8 }}>Message sent</div>
        <p style={{ fontSize: 14, color: "var(--warm-gray)", fontWeight: 300, lineHeight: 1.7 }}>
          Thanks {name.trim().split(" ")[0]} — we'll get back to you as soon as we can.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: "48px auto 0" }}>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 400, marginBottom: 8, textAlign: "center" }}>Send us a message</div>
      <p style={{ fontSize: 14, color: "var(--warm-gray)", fontWeight: 300, lineHeight: 1.7, textAlign: "center", marginBottom: 28 }}>
        Have a question? Drop us a message and we'll reply by email.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label className="nn-input-label">Your Name</label>
          <input className="nn-input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
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
          <input className="nn-input" type="email" value={email}
            onChange={e => setEmail(e.target.value)} onBlur={() => setEmailTouched(true)}
            placeholder="your@email.com"
            style={emailTouched && !emailValid ? { borderColor: "var(--red)" } : {}} />
        </div>
        <div>
          <label className="nn-input-label">Message</label>
          <textarea className="nn-input" value={message} onChange={e => setMessage(e.target.value)}
            placeholder="How can we help?" rows={5}
            style={{ resize: "vertical", minHeight: 110, lineHeight: 1.6, fontFamily: "'Outfit',sans-serif" }} />
        </div>
        {/* Honeypot — hidden from people, visible to bots */}
        <input type="text" value={company} onChange={e => setCompany(e.target.value)}
          tabIndex={-1} autoComplete="off" aria-hidden="true"
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />
        <button className="nn-btn nn-btn-dark" onClick={handleSend} disabled={!canSend}
          style={{ width: "100%", marginTop: 6, opacity: canSend ? 1 : 0.35 }}>
          {sending ? "Sending..." : "Send Message"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// VIEW BOOKINGS MODAL (homepage — request magic link by email)
// ============================================================

function ViewBookingsModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [emailTouched, setEmailTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const emailValid = isValidEmail(email);
  const canSend = emailValid && !sending;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

async function handleSend() {
    if (!canSend) return;
    setSending(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-bookings-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email: email.trim(), company }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Request failed");
      setSent(true);
    } catch (e) {
      console.error(e);
      alert("Sorry, something went wrong. Please try again, or DM us on Instagram @ninetyninebyk.");
    }
    setSending(false);
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 2000, padding: 20,
      }}
    >
      <div style={{ background: "var(--warm-white)", border: "1px solid var(--border)", padding: 32, maxWidth: 400, width: "100%", position: "relative" }}>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--warm-gray)" }}
        >
          ✕
        </button>
        {sent ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div className="nn-success-icon" style={{ width: 48, height: 48, margin: "0 auto 16px" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 400, marginBottom: 8 }}>Check your inbox</div>
            <p style={{ fontSize: 13, color: "var(--warm-gray)", fontWeight: 300, lineHeight: 1.7 }}>
              If you have any upcoming bookings with us, we've sent a link to {email.trim()} to view them.
            </p>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 400, marginBottom: 8 }}>View your bookings</div>
            <p style={{ fontSize: 13, color: "var(--warm-gray)", fontWeight: 300, marginBottom: 20, lineHeight: 1.7 }}>
              Enter the email you booked with and we'll send you a link to view and manage your appointments.
            </p>
            <input className="nn-input" type="email" value={email}
              onChange={e => setEmail(e.target.value)} onBlur={() => setEmailTouched(true)}
              placeholder="your@email.com"
              style={emailTouched && !emailValid ? { borderColor: "var(--red)" } : {}} />
<input type="text" value={company} onChange={e => setCompany(e.target.value)}
  name="nn-hp-field" tabIndex={-1} autoComplete="new-password" aria-hidden="true"
  style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />
            <button className="nn-btn nn-btn-dark" onClick={handleSend} disabled={!canSend}
              style={{ width: "100%", marginTop: 16, opacity: canSend ? 1 : 0.35 }}>
              {sending ? "Sending..." : "Send Me The Link"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// WAITLIST JOIN (shown when no slots available on selected date)
// ============================================================

function WaitlistJoin({ prac, date, serviceId, serviceTitle, duration, price }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [alreadyOn, setAlreadyOn] = useState(false);
  const emailValid = isValidEmail(email);
  const canSubmit = name.trim() && phone.trim() && emailValid && !saving;

  async function handleJoin() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const existing = await supabase.query("waitlist", {
        filters: `&practitioner_id=eq.${prac.id}&waitlist_date=eq.${dateStr(date.year, date.month, date.day)}&client_email=eq.${encodeURIComponent(email.toLowerCase().trim())}&status=eq.waiting`,
      });
      if (existing.length > 0) { setAlreadyOn(true); setSaving(false); return; }

      await supabase.insert("waitlist", {
        practitioner_id: prac.id,
        waitlist_date: dateStr(date.year, date.month, date.day),
        client_name: name.trim(),
        client_email: email.toLowerCase().trim(),
        client_phone: phone.trim(),
        service_id: serviceId,
        service_title: serviceTitle,
        duration: duration,
        price: price,
      });

      try {
        await fetch(`${SUPABASE_URL}/functions/v1/waitlist-confirmation`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            client_name: name.trim(),
            client_email: email.toLowerCase().trim(),
            practitioner_name: prac.name,
            waitlist_date: dateStr(date.year, date.month, date.day),
          }),
        });
      } catch (emailErr) {
        console.error("Waitlist confirmation email failed:", emailErr);
      }

      setDone(true);
    } catch (e) {
      console.error(e);
      alert("Something went wrong. Please try again.");
    }
    setSaving(false);
  }

  const formattedDate = `${getDayName(date.year, date.month, date.day)} ${date.day} ${getMonthName(date.month)}`;

  if (done) {
    return (
      <div style={{ padding: "20px 0" }}>
        <div className="nn-success-icon" style={{ width: 48, height: 48, margin: "0 0 16px" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 400, marginBottom: 8 }}>You're on the list</div>
        <p style={{ fontSize: 13, color: "var(--warm-gray)", fontWeight: 300, lineHeight: 1.7 }}>
          We'll email you at {email} if a slot becomes available with {prac.name} on {formattedDate}.
          Book fast — we notify everyone on the list at the same time.
        </p>
      </div>
    );
  }

  if (alreadyOn) {
    return (
      <div style={{ padding: "16px 0" }}>
        <div style={{ fontSize: 13, color: "var(--warm-gray)", fontWeight: 300, lineHeight: 1.7 }}>
          You're already on the waitlist for {prac.name} on {formattedDate}. We'll be in touch if a slot opens up.
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 13, color: "var(--red)", fontWeight: 300, marginBottom: 16 }}>
        No available slots on this day.
      </div>
      <div style={{ padding: "20px", background: "var(--cream)", border: "1.5px solid var(--border)" }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Join the waitlist</div>
        <div style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300, marginBottom: 16, lineHeight: 1.6 }}>
          We'll email you if a cancellation comes up for your {serviceTitle} on {formattedDate} with {prac.name}.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input className="nn-input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={{ fontSize: 13, padding: "10px 14px" }} />
          <input className="nn-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" style={{ fontSize: 13, padding: "10px 14px" }} />
          <input
            className="nn-input" type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            onBlur={() => setEmailTouched(true)}
            placeholder="Email address"
            style={{ fontSize: 13, padding: "10px 14px", ...(emailTouched && !emailValid ? { borderColor: "var(--red)" } : {}) }}
          />
          <button onClick={handleJoin} disabled={!canSubmit}
            style={{ padding: "11px", background: "var(--charcoal)", color: "var(--cream)", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", opacity: canSubmit ? 1 : 0.35, marginTop: 4 }}>
            {saving ? "Joining..." : "Join Waitlist"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// WAITLIST BOOK PAGE — /waitlist-book?token=xxx
// Linked from the waitlist notification email
// Checks slot is still free, then drops into normal booking confirm step
// ============================================================

export function WaitlistBookPage({ token }) {
  const [status, setStatus] = useState("loading");
  const [entry, setEntry] = useState(null);
  const [prac, setPrac] = useState(null);
  const [slots, setSlots] = useState([]);
  const [time, setTime] = useState(null);
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    
    async function load() {
  try {
    // Load waitlist entry without the join — fetch practitioner separately
    const entries = await supabase.query("waitlist", {
      filters: "&booking_token=eq." + token + "&status=eq.waiting",
    });
    if (!entries || entries.length === 0) { setStatus("taken"); return; }
    const e = entries[0];
    setEntry(e);

    // Fetch practitioner separately
    const pracs = await supabase.query("practitioners", {
      filters: "&id=eq." + e.practitioner_id,
    });
    if (!pracs || pracs.length === 0) { setStatus("error"); return; }
    const p = pracs[0];
    setPrac(p);

    setClientName(e.client_name);
    setPhone(e.client_phone);
    setEmail(e.client_email);

    // Check available slots using the stored duration
    const rows = await supabase.rpc("get_available_slots", {
      p_practitioner_id: e.practitioner_id,
      p_date: e.waitlist_date,
      p_duration: e.duration || 30,
      p_interval: p.slot_interval || 30,
      p_min_hours: 0,
    });
    const available = rows.map(r => r.slot_time.slice(0, 5));
    if (available.length === 0) { setStatus("taken"); return; }
    setSlots(available);
    setStatus("ready");
  } catch (err) {
    console.error(err);
    setStatus("error");
  }
}
    load();
  }, [token]);

  async function handleBook() {
    if (!time || !clientName || !phone || !email) return;
    setSaving(true);
    try {
      // Re-check slots haven't been taken since page load
      const rows = await supabase.rpc("get_available_slots", {
        p_practitioner_id: entry.practitioner_id,
        p_date: entry.waitlist_date,
        p_duration: entry.duration || 30,
        p_interval: prac?.slot_interval || 30,
        p_min_hours: 0,
      });
      const stillAvailable = rows.map(r => r.slot_time.slice(0, 5));
      if (!stillAvailable.includes(time)) {
        setStatus("taken");
        return;
      }

      // Create the booking
      await supabase.insert("bookings", {
  practitioner_id: entry.practitioner_id,
  service_id: entry.service_id || null,
  service_title: entry.service_title || "Appointment",
  client_name: clientName.trim(),
  client_phone: phone.trim(),
  client_email: email.trim(),
  booking_date: entry.waitlist_date,
  booking_time: time + ":00",
  duration: entry.duration || 30,
  price: entry.price || 0,
  notes: "Booked via waitlist",
  deposit_paid: false,
});

      // Mark waitlist entry as booked
      await supabase.update("waitlist", { status: "booked" }, `booking_token=eq.${token}`);

      setDone(true);
    } catch (e) {
      console.error(e);
      alert("Something went wrong. Please try again or DM us on Instagram.");
    }
    setSaving(false);
  }

  const formattedDate = entry?.waitlist_date
    ? new Date(entry.waitlist_date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontStyle: "italic", fontWeight: 300, marginBottom: 8 }}>ninety nine.</div>
      <div style={{ width: 36, height: 1.5, background: "var(--gold)", margin: "0 auto 40px" }} />

      {status === "loading" && <div style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300 }}>Checking availability...</div>}

      {status === "taken" && (
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 300, marginBottom: 14 }}>Slot no longer available</div>
          <p style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300, lineHeight: 1.7, marginBottom: 32 }}>
            Sorry — someone else got there first. Head back to the booking page to choose another date.
          </p>
          <a href="/" style={{ display: "inline-block", padding: "14px 36px", background: "var(--charcoal)", color: "var(--cream)", textDecoration: "none", fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "2px", textTransform: "uppercase" }}>
            Book Another Date
          </a>
        </div>
      )}

      {status === "invalid" && (
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 300, marginBottom: 14 }}>Invalid link</div>
          <p style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300, lineHeight: 1.7 }}>
            This link isn't valid. Please DM us on Instagram <a href="https://www.instagram.com/ninetyninebyk/" style={{ color: "var(--gold)" }}>@ninetyninebyk</a>.
          </p>
        </div>
      )}

      {status === "error" && (
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 300, marginBottom: 14 }}>Something went wrong</div>
          <p style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300, lineHeight: 1.7 }}>
            Please DM us on Instagram <a href="https://www.instagram.com/ninetyninebyk/" style={{ color: "var(--gold)" }}>@ninetyninebyk</a>.
          </p>
        </div>
      )}

      {status === "ready" && !done && entry && (
        <div style={{ maxWidth: 440, width: "100%" }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 30, fontWeight: 300, marginBottom: 8, textAlign: "center" }}>Book your slot</div>
          <p style={{ textAlign: "center", color: "var(--warm-gray)", fontSize: 14, fontWeight: 300, marginBottom: 32 }}>
            {prac?.name} · {formattedDate}
          </p>
          <div style={{ background: "var(--warm-white)", border: "1px solid var(--border)", padding: "20px", marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--warm-gray)", marginBottom: 12 }}>Choose a time</div>
            <div className="nn-times">
              {slots.map(t => (
                <button key={t} className={"nn-time" + (time === t ? " on" : "")} onClick={() => setTime(t)}>{t}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
            <input className="nn-input" type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Your name" />
            <input className="nn-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" />
            <input className="nn-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" />
          </div>
          <div style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300, lineHeight: 1.6, marginBottom: 20, padding: "14px 16px", background: "var(--cream)", border: "1px solid var(--border)" }}>
            This slot is available to everyone on the waitlist. Complete your booking now to secure it.
          </div>
          <button onClick={handleBook} disabled={!time || !clientName || !phone || !email || saving}
            style={{ width: "100%", padding: "16px", background: "var(--gold)", color: "var(--charcoal)", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", opacity: time && clientName && phone && email && !saving ? 1 : 0.35 }}>
            {saving ? "Booking..." : "Confirm Booking"}
          </button>
        </div>
      )}

      {done && (
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div className="nn-success-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 30, fontWeight: 300, marginBottom: 14 }}>You're all booked</div>
          <p style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300, lineHeight: 1.7, marginBottom: 32 }}>
            {clientName}, your appointment with {prac?.name} is confirmed for {formattedDate} at {time}. See you at 99 Banks Road!
          </p>
          <a href="/" style={{ display: "inline-block", padding: "14px 36px", background: "var(--charcoal)", color: "var(--cream)", textDecoration: "none", fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "2px", textTransform: "uppercase" }}>
            Back to Website
          </a>
        </div>
      )}
    </div>
  );
}

// ============================================================
// BOOKING FLOW
// ============================================================

function BookingFlow({ practitioners, preselectedPrac, onClearPreselect, drawerMode = false, onClose }) {
  // stage: "prac" | "service" | "addons" | "cart" | "date" | "confirm"
  const [stage, setStage] = useState(preselectedPrac ? "service" : "prac");
  const [prac, setPrac] = useState(preselectedPrac || null);
  const [cart, setCart] = useState([]);              // [{ uid, service, addons }]
  const [draft, setDraft] = useState(null);          // service being configured before it's added
  const [draftAddons, setDraftAddons] = useState([]);
  const uidRef = useRef(0);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [customServices, setCustomServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const now = new Date();
  const [cM, setCM] = useState(now.getMonth());
  const [cY, setCY] = useState(now.getFullYear());

  const emailValid = isValidEmail(email);
  const depositsConfigured = !IS_DEMO && prac?.deposits_enabled && prac?.stripe_account_id;
  const canConfirm = clientName.trim() && phone.trim() && emailValid && termsAccepted && !saving;
  
  useEffect(() => {
    if (preselectedPrac) {
      setPrac(preselectedPrac); setStage("service");
      setCart([]); setDraft(null); setDraftAddons([]);
      setDate(null); setTime(null); setDone(false);
      if (onClearPreselect) onClearPreselect();
    }
  }, [preselectedPrac]);

  useEffect(() => {
    if (!prac) { setCustomServices([]); return; }
    if (IS_DEMO) { setCustomServices(DEMO_SERVICES_LIST); return; }
    setLoadingServices(true);
    supabase.query("custom_services", {
      select: "*,addons:custom_service_addons(*)",
      filters: "&practitioner_id=eq." + prac.id + "&is_active=eq.true&order=group_order,service_order,created_at",
    }).then(rows => {
      setCustomServices(rows.map(s => ({ ...s, addons: s.addons || [] })));
      setLoadingServices(false);
    }).catch(() => setLoadingServices(false));
  }, [prac]);

const [availability, setAvailability] = useState([]);
  const [blockedDays, setBlockedDays] = useState([]);
  const [overrideDays, setOverrideDays] = useState([]);
  useEffect(() => {
    if (!prac) { setAvailability([]); setBlockedDays([]); setOverrideDays([]); return; }
    if (IS_DEMO) {
      setAvailability([0,1,2,3,4,5].map(d => ({ day_of_week: d, is_available: true })));
      setBlockedDays([]); setOverrideDays([]);
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    Promise.all([
      supabase.query("availability", {
        filters: "&practitioner_id=eq." + prac.id + "&is_available=eq.false",
      }),
      supabase.query("blocked_dates", {
        select: "blocked_date",
        filters: "&practitioner_id=eq." + prac.id + "&blocked_date=gte." + today + "&start_time=is.null",
      }),
      supabase.query("date_overrides", {
        select: "override_date",
        filters: "&practitioner_id=eq." + prac.id + "&override_date=gte." + today,
      }),
    ]).then(([avail, blocked, overrides]) => {
      setAvailability(avail);
      setBlockedDays(blocked.map(b => b.blocked_date));
      setOverrideDays(overrides.map(o => o.override_date));
    }).catch(() => { setAvailability([]); setBlockedDays([]); setOverrideDays([]); });
  }, [prac]);

  const unavailableDays = new Set(availability.map(r => [1,2,3,4,5,6,0][r.day_of_week]));

  // Totals across the whole cart (each item = service + its add-ons)
  const itemDuration = (it) => it.service.duration + it.addons.reduce((s, a) => s + a.duration, 0);
  const itemPrice = (it) => it.service.price + it.addons.reduce((s, a) => s + a.price, 0);
  const itemTitle = (it) => it.service.title + (it.addons.length ? " + " + it.addons.map(a => a.title).join(" + ") : "");
  const totalDuration = cart.reduce((s, it) => s + itemDuration(it), 0);
  const totalPrice = cart.reduce((s, it) => s + itemPrice(it), 0);
  const serviceTitle = cart.map(itemTitle).join(" + ");

const { slots, loading: slotsLoading } = useAvailableSlots(prac?.id, date, totalDuration, prac?.slot_interval || 30);

  // Deposit, computed identically to the Edge Function: over-threshold only, round up.
  const depositPercent = prac?.deposit_percent ?? 20;
  const depositThreshold = prac?.deposit_threshold ?? 10;
  const depositAmount = depositsConfigured && totalPrice > depositThreshold
    ? Math.ceil(totalPrice * depositPercent / 100)
    : 0;
  const depositDue = depositAmount > 0;
  const bookingWindowWeeks = prac?.booking_window_weeks || 8;
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + bookingWindowWeeks * 7);

  const [slotCounts, setSlotCounts] = useState({});
  useEffect(() => {
    if (!prac || stage !== "date") { setSlotCounts({}); return; }
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

  const groups = [...new Set(customServices.filter(s => s.group_name).map(s => s.group_name))];
  const ungrouped = customServices.filter(s => !s.group_name);

  // Picking a service from the list → configure add-ons, or drop straight into the cart
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

  // Both timing & price depend on the cart, so any change to it invalidates a chosen slot
  function goAddAnother() { setDate(null); setTime(null); setStage("service"); }

  async function handleConfirm() {
    if (!canConfirm) return;
    if (IS_DEMO) { setDone(true); return; }
    setSaving(true);
    try {
      const allAddons = cart.flatMap(it => it.addons.map(a => a.title));
      const notes = allAddons.length ? "Add-ons: " + allAddons.join(", ") : "";
      const primaryServiceId = cart[0]?.service.id;

      if (depositDue) {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            practitioner_id: prac.id,
            service_id: primaryServiceId,
            service_title: serviceTitle,
            client_name: clientName.trim(),
            client_phone: phone.trim(),
            client_email: email.trim(),
            booking_date: dateStr(date.year, date.month, date.day),
            booking_time: time + ":00",
            duration: totalDuration,
            price: totalPrice,
            notes,
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        // Safety net: if the server decided no deposit is due, fall through to a normal booking.
        if (!data.skip) {
          window.location.href = data.url;
          return;
        }
      }

      await supabase.insert("bookings", {
        practitioner_id: prac.id,
        service_id: primaryServiceId,
        service_title: serviceTitle,
        client_name: clientName.trim(),
        client_phone: phone.trim(),
        client_email: email.trim(),
        booking_date: dateStr(date.year, date.month, date.day),
        booking_time: time + ":00",
        duration: totalDuration,
        price: totalPrice,
        notes,
        deposit_paid: false,
      });
      setDone(true);
    } catch (e) {
      console.error(e);
      alert("Sorry, there was an error creating your booking. Please try again.");
      setSaving(false);
    }
  }

  const H3 = ({ children }) => (
    <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: drawerMode ? 20 : 24, fontWeight: 400, marginBottom: 20 }}>{children}</h3>
  );

  // Linear stage list for the progress indicator (addons is folded into "Service")
  const stageOrder = ["prac", "service", "cart", "date", "confirm"];
  const stageLabels = { prac: "Practitioner", service: "Service", cart: "Service", date: "Date & Time", confirm: "Confirm" };
  const indicatorStage = stage === "addons" ? "service" : stage;
  const stageIndex = stageOrder.indexOf(indicatorStage);

  const StepIndicator = () => drawerMode ? (
    <div className="nn-booking-drawer-step-indicator">
      Step <span>{Math.max(stageIndex, 0) + 1}</span> of <span>{stageOrder.length}</span>
      {stageLabels[indicatorStage] && <> · {stageLabels[indicatorStage]}</>}
    </div>
  ) : (
    <div className="nn-steps">
      {stageOrder.map((st, i) => (
        <React.Fragment key={st}>
          {i > 0 && <div className="nn-step-line" />}
          <div className={"nn-step" + (i === stageIndex ? " active" : "") + (i < stageIndex ? " done" : "")}>
            <div className="nn-step-num">{i < stageIndex ? "✓" : i + 1}</div>
            <span>{stageLabels[st]}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );

  // Running cart summary (shown on cart + date + confirm stages)
  const CartSummary = ({ editable = false }) => (
    <div style={{ background: "var(--cream)", border: "1.5px solid var(--border)", padding: "16px 20px", marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", color: "var(--warm-gray)", marginBottom: 12 }}>Your booking</div>
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

      {stage === "prac" && (
        <div>
          <H3>Who would you like to see?</H3>
          <div className="nn-prac-grid">
            {practitioners.map(p => (
              <div key={p.id} className={"nn-prac-card" + (prac?.id === p.id ? " picked" : "")} onClick={() => { setPrac(p); setStage("service"); }}>
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

      {stage === "service" && (
        <div>
          <H3>{cart.length > 0 ? "Add another service" : prac?.name + "'s services"}</H3>
          {loadingServices ? (
            <div style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300 }}>Loading services...</div>
          ) : customServices.length === 0 ? (
            <div style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300 }}>No services available yet. Please DM us on Instagram.</div>
          ) : (
            <div>
              {groups.map(group => (
                <div key={group} style={{ marginBottom: 20 }}>
                  <div className="nn-svc-group-label">{group}</div>
                  <ServiceGroup services={customServices.filter(s => s.group_name === group)} selectedId={null} onSelect={handleSelectService} />
                </div>
              ))}
              {ungrouped.length > 0 && (
                <div>
                  {groups.length > 0 && <div className="nn-svc-group-label">Other</div>}
                  <ServiceGroup services={ungrouped} selectedId={null} onSelect={handleSelectService} />
                </div>
              )}
            </div>
          )}
          <div className="nn-booking-nav">
            <button className="nn-btn-back" onClick={() => cart.length > 0 ? setStage("cart") : setStage("prac")}>Back</button>
          </div>
        </div>
      )}

      {stage === "addons" && draft && (
        <div>
          <H3>Would you like to add anything?</H3>
          <p style={{ fontSize: 13, color: "var(--warm-gray)", fontWeight: 300, marginBottom: 24, lineHeight: 1.7 }}>
            Optional extras for your {draft.title}. Tap any that apply.
          </p>
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
            <button className="nn-btn nn-btn-dark" onClick={commitDraft}>
              {draftAddons.length === 0
                ? "No extras, continue"
                : `Add ${draftAddons.length} extra${draftAddons.length > 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      )}

      {stage === "cart" && (
        <div>
          <H3>Your booking so far</H3>
          <CartSummary editable />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button className="nn-btn nn-btn-outline" onClick={goAddAnother} style={{ width: "100%", justifyContent: "center" }}>
              + Add another service
            </button>
            <button className="nn-btn nn-btn-dark" onClick={() => setStage("date")} disabled={cart.length === 0} style={{ width: "100%", opacity: cart.length ? 1 : .35 }}>
              Continue to Date &amp; Time
            </button>
          </div>
        </div>
      )}

      {stage === "date" && (
        <div>
          <H3>Pick a date &amp; time</H3>
          <CartSummary />
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
            <div className="nn-cal">
              <div className="nn-cal-head">
                <button className="nn-cal-btn" onClick={() => { if (cM === 0) { setCM(11); setCY(cY - 1); } else setCM(cM - 1); }}>‹</button>
                <h3>{getMonthName(cM)} {cY}</h3>
                <button className="nn-cal-btn" onClick={() => { if (cM === 11) { setCM(0); setCY(cY + 1); } else setCM(cM + 1); }}
                  disabled={(() => {
                    const max = new Date();
                    max.setDate(1);
                    max.setMonth(max.getMonth() + Math.ceil(bookingWindowWeeks * 7 / 30));
                    return new Date(cY, cM, 1) >= max;
                  })()}>›</button>
              </div>
              <div className="nn-cal-weekdays">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => <span key={d}>{d}</span>)}</div>
              <div className="nn-cal-days">
                {(() => {
                  const first = (new Date(cY, cM, 1).getDay() + 6) % 7;
                  const total = getDaysInMonth(cY, cM);
                  const cells = [];
                  for (let i = 0; i < first; i++) cells.push(<div className="nn-cal-day nil" key={"e" + i} />);
                  for (let d = 1; d <= total; d++) {
                    const dt = new Date(cY, cM, d);
                    const isNow = d === now.getDate() && cM === now.getMonth() && cY === now.getFullYear();
                    const past = dt < new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const beyondWindow = dt > maxDate;
                    const jsDay = dt.getDay();
                    const unavail = unavailableDays.has(jsDay);
                    const blocked = blockedDays.includes(dateStr(cY, cM, d));
                    const sel = date && date.day === d && date.month === cM && date.year === cY;
                    const ds = dateStr(cY, cM, d);
                    const count = slotCounts[ds];
                    const hasOverride = overrideDays.includes(ds);
                    const disabled = past || beyondWindow || blocked || (unavail && !hasOverride);
                    const dotColor = disabled ? null
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
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 13, color: "var(--warm-gray)", marginBottom: 12, fontWeight: 300 }}>
                  {getDayName(date.year, date.month, date.day)} {date.day} {getMonthName(date.month)}
                </div>
                {slotsLoading ? (
                  <div style={{ color: "var(--warm-gray)", fontSize: 13, fontWeight: 300 }}>Loading times...</div>
                ) : slots.length === 0 ? (
                  <WaitlistJoin
                    prac={prac}
                    date={date}
                    serviceId={cart[0]?.service.id}
                    serviceTitle={serviceTitle}
                    duration={totalDuration}
                    price={totalPrice}
                  />
                ) : (
                  <div className="nn-times">{slots.map(t => <button key={t} className={"nn-time" + (time === t ? " on" : "")} onClick={() => setTime(t)}>{t}</button>)}</div>
                )}
              </div>
            )}
          </div>
          <div className="nn-booking-nav">
            <button className="nn-btn-back" onClick={() => setStage("cart")}>Back</button>
            <button className="nn-btn nn-btn-dark" onClick={() => setStage("confirm")} disabled={!date || !time} style={{ opacity: date && time ? 1 : .35 }}>Continue</button>
          </div>
        </div>
      )}

      {stage === "confirm" && (
        <div>
          <H3>Confirm your booking</H3>
          <div className="nn-confirm">
            <div className="nn-confirm-row"><span className="nn-confirm-label">Practitioner</span><span className="nn-confirm-val">{prac?.name}</span></div>
            {cart.map(it => (
              <React.Fragment key={it.uid}>
                <div className="nn-confirm-row"><span className="nn-confirm-label">Treatment</span><span className="nn-confirm-val">{it.service.title}</span></div>
                {it.addons.map(a => (
                  <div className="nn-confirm-row" key={a.id}><span className="nn-confirm-label">Add-on</span><span className="nn-confirm-val">{a.title}</span></div>
                ))}
              </React.Fragment>
            ))}
            <div className="nn-confirm-row"><span className="nn-confirm-label">Date</span><span className="nn-confirm-val">{getDayName(date.year, date.month, date.day)} {date.day} {getMonthName(date.month)} {date.year}</span></div>
            <div className="nn-confirm-row"><span className="nn-confirm-label">Time</span><span className="nn-confirm-val">{time}</span></div>
            <div className="nn-confirm-row"><span className="nn-confirm-label">Duration</span><span className="nn-confirm-val">{totalDuration} min</span></div>
            <div className="nn-confirm-row"><span className="nn-confirm-label">Price</span><span className="nn-confirm-val" style={{ color: "var(--gold)", fontWeight: 600 }}>£{totalPrice}</span></div>
            {depositDue && (
              <div className="nn-confirm-row">
                <span className="nn-confirm-label">Deposit due now</span>
                <span className="nn-confirm-val" style={{ color: "var(--gold)", fontWeight: 600 }}>£{depositAmount}</span>
              </div>
            )}
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
            <div style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"16px 20px", background:"var(--cream)", border:"1.5px solid var(--border)" }}>
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={e => setTermsAccepted(e.target.checked)}
                style={{ marginTop:3, accentColor:"var(--charcoal)", width:16, height:16, flexShrink:0, cursor:"pointer" }}
              />
              <label htmlFor="terms" style={{ fontSize:13, color:"var(--warm-gray)", fontWeight:300, lineHeight:1.6, cursor:"pointer" }}>
                I agree to the{" "}
                <span
                  onClick={e => { e.preventDefault(); setShowPolicy(o => !o); }}
                  style={{ color:"var(--gold)", textDecoration:"underline", cursor:"pointer" }}
                >
                  booking & cancellation policy
                </span>
                {" "}and consent to my details being stored to manage my appointment.
                {showPolicy && (
                  <span style={{ display:"block", marginTop:12, padding:"14px 16px", background:"var(--warm-white)", border:"1px solid var(--border)", color:"var(--warm-gray)", fontSize:12, lineHeight:1.7 }}>
                    Cancellations made with less than 48 hours' notice may be subject to a charge at your practitioner's discretion. Your name, phone number and email address are stored solely for the purpose of managing your booking and will not be shared with third parties.
                  </span>
                )}
              </label>
            </div>
            {depositDue && (
              <div style={{ marginTop: 20, padding: "16px 20px", background: "var(--warm-white)", border: "1px solid var(--border)", fontSize: 13, color: "var(--warm-gray)", fontWeight: 300, lineHeight: 1.6 }}>
                A £{depositAmount} deposit is required to secure your appointment. You'll be taken to our secure payment page. Free cancellation up to 48 hours before your appointment.
              </div>
            )}
          </div>
          <div className="nn-booking-nav">
            <button className="nn-btn-back" onClick={() => setStage("date")}>Back</button>
            <button className="nn-btn nn-btn-gold" onClick={handleConfirm} disabled={!canConfirm} style={{ opacity: canConfirm ? 1 : .35 }}>
              {saving
                ? (depositDue ? "Redirecting to payment..." : "Booking...")
                : depositDue
                  ? `Pay £${depositAmount} & Confirm`
                  : "Confirm Booking"
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// BOOKING SUCCESS PAGE — /booking-success?session_id=xxx&...
// Called by Stripe Checkout on successful payment
// Creates the booking and shows confirmation
// ============================================================

export function BookingSuccess({ params }) {
  const [status, setStatus] = useState("loading");
  const [bookingData, setBookingData] = useState(null);

  useEffect(() => {
    const sessionId = params.get("session_id");
    const practitionerId = params.get("practitioner_id");
    const serviceId = params.get("service_id");
    const serviceTitle = params.get("service_title");
    const clientName = params.get("client_name");
    const clientPhone = params.get("client_phone");
    const clientEmail = params.get("client_email");
    const bookingDate = params.get("booking_date");
    const bookingTime = params.get("booking_time");
    const duration = parseInt(params.get("duration") || "0");
    const price = parseFloat(params.get("price") || "0");
    const depositAmount = parseInt(params.get("deposit_amount") || "0");
    const notes = params.get("notes") || "";

    if (!sessionId || !practitionerId || !clientName) {
      setStatus("invalid");
      return;
    }

    // Verify Stripe session and create booking via Edge Function
    async function createBooking() {
      try {
        // Verify the Stripe session was paid
        const verifyRes = await fetch(`${SUPABASE_URL}/functions/v1/verify-checkout-session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ session_id: sessionId }),
        });
        const verifyData = await verifyRes.json();

        if (verifyData.error) throw new Error(verifyData.error);
        if (verifyData.payment_status !== "paid") throw new Error("Payment not completed");

        // Create the booking
        await supabase.insert("bookings", {
          practitioner_id: practitionerId,
          service_id: serviceId,
          service_title: serviceTitle,
          client_name: clientName,
          client_phone: clientPhone,
          client_email: clientEmail,
          booking_date: bookingDate,
          booking_time: bookingTime,
          duration,
          price,
          notes,
          deposit_paid: true,
          deposit_amount: depositAmount,
          stripe_payment_intent_id: verifyData.payment_intent,
        });

        setBookingData({ clientName, serviceTitle, bookingDate, bookingTime, clientEmail, depositAmount });
        setStatus("done");
      } catch (e) {
        console.error(e);
        setStatus("error");
      }
    }

    createBooking();
  }, []);

  const formattedDate = bookingData?.bookingDate
    ? new Date(bookingData.bookingDate + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "";
  const formattedTime = bookingData?.bookingTime?.slice(0, 5) || "";

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontStyle: "italic", fontWeight: 300, marginBottom: 8 }}>ninety nine.</div>
      <div style={{ width: 36, height: 1.5, background: "var(--gold)", margin: "0 auto 40px" }} />

      {status === "loading" && (
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300, marginBottom: 8 }}>Confirming your booking...</div>
          <div style={{ fontSize: 12, color: "var(--taupe)", fontWeight: 300 }}>Please don't close this page</div>
        </div>
      )}

      {status === "done" && bookingData && (
        <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
          <div className="nn-success-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, fontWeight: 300, marginBottom: 12 }}>You're all booked</h2>
          <p style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300, lineHeight: 1.7, marginBottom: 32 }}>
            {bookingData.clientName}, your {bookingData.serviceTitle} is confirmed for {formattedDate} at {formattedTime}.<br />
            A confirmation has been sent to {bookingData.clientEmail}.<br />
            Your £{bookingData.depositAmount} deposit has been taken and will be deducted from your total on the day.<br />
            See you at 99 Banks Road!
          </p>
          <a href="/" style={{ display: "inline-block", padding: "14px 36px", background: "var(--charcoal)", color: "var(--cream)", textDecoration: "none", fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "2px", textTransform: "uppercase" }}>
            Back to Website
          </a>
        </div>
      )}

      {status === "invalid" && (
        <div style={{ textAlign: "center", maxWidth: 380 }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 300, marginBottom: 14 }}>Invalid link</div>
          <p style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300, lineHeight: 1.7 }}>
            This booking link is not valid. Please DM us on Instagram <a href="https://www.instagram.com/ninetyninebyk/" style={{ color: "var(--gold)" }}>@ninetyninebyk</a>.
          </p>
        </div>
      )}

      {status === "error" && (
        <div style={{ textAlign: "center", maxWidth: 380 }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 300, marginBottom: 14 }}>Something went wrong</div>
          <p style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300, lineHeight: 1.7 }}>
            Your payment was taken but we couldn't confirm the booking. Please DM us on Instagram <a href="https://www.instagram.com/ninetyninebyk/" style={{ color: "var(--gold)" }}>@ninetyninebyk</a> with your name and we'll sort it immediately.
          </p>
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
  const [refundResult, setRefundResult] = useState(null);

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
      const res = await fetch(`${SUPABASE_URL}/functions/v1/cancel-booking`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ cancellation_token: token }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRefundResult(data);
      setStatus("done");
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  }

  const dateObj = booking ? new Date(booking.booking_date + "T12:00:00") : null;
  const formattedDate = dateObj?.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const treatmentName = booking?.service_title || booking?.notes || "Your treatment";

  // Calculate refund eligibility for display
const hoursUntil = booking ? (new Date(`${booking.booking_date}T${booking.booking_time}`) - new Date()) / (1000 * 60 * 60) : 0;
  const eligibleForRefund = booking?.deposit_paid && hoursUntil >= 48;
  const withinWindow = booking && hoursUntil < 48;

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

      {status === "confirm" && booking && withinWindow && (
        <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 30, fontWeight: 300, marginBottom: 14 }}>Within the cancellation window</div>
          <p style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300, lineHeight: 1.7, marginBottom: 28 }}>
            This appointment is less than 48 hours away, so it can't be cancelled online. Please message your practitioner directly{booking.practitioner?.name ? " (" + booking.practitioner.name + ")" : ""} as soon as you can — the quickest way is to DM us on Instagram <a href="https://www.instagram.com/ninetyninebyk/" style={{ color: "var(--gold)" }}>@ninetyninebyk</a> and we'll pass it on.
          </p>
          <a href="/" style={{ display: "inline-block", padding: "14px 36px", background: "var(--charcoal)", color: "var(--cream)", textDecoration: "none", fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "2px", textTransform: "uppercase" }}>Back to Website</a>
        </div>
      )}

      {status === "confirm" && booking && !withinWindow && (
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
            {booking.deposit_paid && (
              <div style={{ padding: "14px 0 0", fontSize: 13, color: "var(--warm-gray)", fontWeight: 300, lineHeight: 1.6 }}>
                {eligibleForRefund
                  ? `Your £${booking.deposit_amount} deposit will be refunded automatically.`
                  : `This appointment is within 48 hours — your £${booking.deposit_amount} deposit is non-refundable.`
                }
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <a href="/" style={{ flex: 1, padding: "14px", background: "none", border: "1.5px solid var(--border)", fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "2px", textTransform: "uppercase", textAlign: "center", textDecoration: "none", color: "var(--charcoal)" }}>Keep Booking</a>
            <button onClick={handleCancel} style={{ flex: 1, padding: "14px", background: "var(--red)", color: "#fff", border: "none", fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "2px", textTransform: "uppercase", cursor: "pointer" }}>Yes, Cancel</button>
          </div>
        </div>
      )}

      {status === "cancelling" && (
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300, marginBottom: 4 }}>Cancelling your appointment...</div>
          {booking?.deposit_paid && eligibleForRefund && (
            <div style={{ fontSize: 12, color: "var(--taupe)", fontWeight: 300 }}>Processing your refund</div>
          )}
        </div>
      )}

      {status === "done" && (
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 30, fontWeight: 300, marginBottom: 14 }}>Booking cancelled</div>
          <p style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300, lineHeight: 1.7, marginBottom: refundResult?.deposit_refunded || refundResult?.deposit_forfeited ? 24 : 32 }}>
            Your appointment has been cancelled. We hope to see you again soon.
          </p>
          {refundResult?.deposit_refunded && (
            <div style={{ background: "#f0f7f0", border: "1px solid #7BA87B", padding: "16px 20px", marginBottom: 32, textAlign: "left" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#7BA87B", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Deposit Refunded</div>
              <div style={{ fontSize: 13, fontWeight: 300, color: "var(--charcoal)", lineHeight: 1.6 }}>
                Your £{refundResult.deposit_amount} deposit will be returned to your original payment method within 5–10 business days.
              </div>
            </div>
          )}
          {refundResult?.deposit_forfeited && (
            <div style={{ background: "#fdf5f5", border: "1px solid #C46E6E", padding: "16px 20px", marginBottom: 32, textAlign: "left" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--red)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Deposit Not Refunded</div>
              <div style={{ fontSize: 13, fontWeight: 300, color: "var(--charcoal)", lineHeight: 1.6 }}>
                As this appointment was cancelled within 48 hours, your £{refundResult.deposit_amount} deposit is non-refundable.
              </div>
            </div>
          )}
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
// ============================================================

export function ClientPortal({ email, token }) {
  const [status, setStatus] = useState("loading");
  const [bookings, setBookings] = useState([]);
  const [editingBooking, setEditingBooking] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const now = new Date();
  const [cM, setCM] = useState(now.getMonth());
  const [cY, setCY] = useState(now.getFullYear());
  const [editDate, setEditDate] = useState(null);
  const [editTime, setEditTime] = useState(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [bookingWindowWeeks, setBookingWindowWeeks] = useState(9);

  useEffect(() => {
    if (!editingBooking?.practitioner_id) return;
    
    supabase.query("practitioners", {
      filters: "&id=eq." + editingBooking.practitioner_id
    }).then(rows => {
      if (rows && rows[0]?.advance_booking_limit_weeks) {
        setBookingWindowWeeks(rows[0].advance_booking_limit_weeks);
      } else {
        setBookingWindowWeeks(9); // Fallback if not configured
      }
    }).catch(() => setBookingWindowWeeks(9));
  }, [editingBooking]);

  const { slots, loading: slotsLoading } = useAvailableSlots(
    editingBooking?.practitioner_id, editDate, editingBooking?.duration, editingBooking?.practitioner?.slot_interval || 30
  );
  
const [editSlotCounts, setEditSlotCounts] = useState({});
  useEffect(() => {
    if (!editingBooking) { setEditSlotCounts({}); return; }
    supabase.rpc("get_monthly_slot_counts", {
      p_practitioner_id: editingBooking.practitioner_id,
      p_year: cY,
      p_month: cM + 1,
      p_duration: editingBooking.duration || 30,
      p_interval: editingBooking.practitioner?.slot_interval || 30,
    }).then(rows => {
      const map = {};
      rows.forEach(r => { map[r.slot_date] = r.slot_count; });
      setEditSlotCounts(map);
    }).catch(() => setEditSlotCounts({}));
  }, [editingBooking, cM, cY]);
  const [editAvail, setEditAvail] = useState({ unavailable: new Set(), blocked: [], overrides: [] });
  useEffect(() => {
    if (!editingBooking) { setEditAvail({ unavailable: new Set(), blocked: [], overrides: [] }); return; }
    const pid = editingBooking.practitioner_id;
    const today = new Date().toISOString().split("T")[0];
    Promise.all([
      supabase.query("availability", { filters: "&practitioner_id=eq." + pid + "&is_available=eq.false" }),
      supabase.query("blocked_dates", { select: "blocked_date", filters: "&practitioner_id=eq." + pid + "&blocked_date=gte." + today + "&start_time=is.null" }),
      supabase.query("date_overrides", { select: "override_date", filters: "&practitioner_id=eq." + pid + "&override_date=gte." + today }),
    ]).then(([avail, blocked, overrides]) => {
      setEditAvail({
        unavailable: new Set(avail.map(r => [1,2,3,4,5,6,0][r.day_of_week])),
        blocked: blocked.map(b => b.blocked_date),
        overrides: overrides.map(o => o.override_date),
      });
    }).catch(() => setEditAvail({ unavailable: new Set(), blocked: [], overrides: [] }));
  }, [editingBooking]);

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
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/booking-rescheduled`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ booking_id: editingBooking.id, source: "client", old_date: editingBooking.booking_date, old_time: editingBooking.booking_time }),
        });
      } catch (e) { console.error("Reschedule email failed:", e); }
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
    const res = await fetch(`${SUPABASE_URL}/functions/v1/cancel-booking`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ cancellation_token: booking.cancellation_token }),
    });
const data = await res.json();
    if (data.blocked) {
      alert("This appointment is less than 48 hours away, so it can't be cancelled online. Please message your practitioner directly — DM us on Instagram @ninetyninebyk and we'll help.");
      setCancellingId(null);
      return;
    }
    if (data.error) throw new Error(data.error);
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
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <img src="/logo-dark.png" alt="ninety nine." style={{ height: 28, marginBottom: 20 }} />
          <div style={{ width: 36, height: 1.5, background: "var(--gold)", margin: "0 auto 24px" }} />
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 300, marginBottom: 8 }}>Your Bookings</div>
          <div style={{ fontSize: 13, color: "var(--warm-gray)", fontWeight: 300 }}>{email}</div>
        </div>

        {status === "loading" && <div style={{ textAlign: "center", color: "var(--warm-gray)", fontSize: 14, fontWeight: 300 }}>Loading your bookings...</div>}
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
            <p style={{ color: "var(--warm-gray)", fontSize: 14, fontWeight: 300, lineHeight: 1.7, marginBottom: 32 }}>You don't have any upcoming appointments. Ready to book again?</p>
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "20px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 400, marginBottom: 4 }}>{b.service_title || "Appointment"}</div>
                      <div style={{ fontSize: 13, color: "var(--warm-gray)", fontWeight: 300, marginBottom: 2 }}>with {b.practitioner?.name}</div>
                      <div style={{ fontSize: 13, fontWeight: 500, marginTop: 8, color: isToday ? "var(--gold)" : "var(--charcoal)" }}>
                        {isToday ? "Today" : formattedDate} at {b.booking_time?.slice(0, 5)}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--warm-gray)", fontWeight: 300, marginTop: 2 }}>{b.duration} min · £{b.price}</div>
                      {b.deposit_paid && <div style={{ fontSize: 11, color: "var(--green)", fontWeight: 500, marginTop: 4 }}>£{b.deposit_amount} deposit paid</div>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                      <button onClick={() => isEditing ? cancelEdit() : startEdit(b)}
                        style={{ padding: "8px 16px", background: isEditing ? "var(--charcoal)" : "none", color: isEditing ? "var(--cream)" : "var(--charcoal)", border: "1px solid " + (isEditing ? "var(--charcoal)" : "var(--border)"), cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "'Outfit',sans-serif" }}>
                        {isEditing ? "Close" : "Edit"}
                      </button>
                      <button onClick={() => handleCancel(b)} disabled={isCancelling || isEditing}
                        style={{ padding: "8px 16px", background: "none", color: "var(--red)", border: "1px solid var(--red)", cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "'Outfit',sans-serif", opacity: isCancelling || isEditing ? 0.4 : 1 }}>
                        {isCancelling ? "..." : "Cancel"}
                      </button>
                    </div>
                  </div>
                  {isEditing && (
                    <div style={{ borderTop: "1px solid var(--border)", padding: "20px", background: "var(--cream)" }}>
                      <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--warm-gray)", marginBottom: 16 }}>Choose a new date &amp; time</div>
                      <div className="nn-cal" style={{ maxWidth: "100%", marginBottom: 16 }}>
                        <div className="nn-cal-head">
                          <button className="nn-cal-btn" onClick={() => { if (cM === 0) { setCM(11); setCY(cY - 1); } else setCM(cM - 1); }}>‹</button>
                          <h3>{getMonthName(cM)} {cY}</h3>
                          <button className="nn-cal-btn" onClick={() => {
     if (cM === 11) { setCM(0); setCY(cY + 1); } else setCM(cM + 1);
   }} disabled={(() => {
     const max = new Date();
     max.setDate(1);
     // Blocks going further than the practitioner's rolling week limit allows
     max.setMonth(max.getMonth() + Math.ceil(bookingWindowWeeks * 7 / 30));
     return new Date(cY, cM, 1) >= max;
   })()}>›</button>
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

// Calculate the maximum rolling horizon date using your state variable
const maxAllowedDate = new Date();
maxAllowedDate.setDate(maxAllowedDate.getDate() + (bookingWindowWeeks * 7));
const isTooFar = new Date(cY, cM, d) > maxAllowedDate;

const jsDay = new Date(cY, cM, d).getDay();
const ds = dateStr(cY, cM, d);
const unavail = editAvail.unavailable.has(jsDay);
const blocked = editAvail.blocked.includes(ds);
const hasOverride = editAvail.overrides.includes(ds);

// Added isTooFar here to disable dates past the rolling boundary
const disabled = past || isTooFar || blocked || (unavail && !hasOverride);
                              const sel = editDate && editDate.day === d && editDate.month === cM && editDate.year === cY;
                              const count = editSlotCounts[ds];
                              const dotColor = disabled ? null
                                : count === undefined ? null
                                : count === 0 ? "var(--red)"
                                : count <= 3 ? "#C9963E"
                                : "var(--green)";
                              cells.push(
                                <button key={d}
                                  className={"nn-cal-day" + (sel ? " on" : "") + (disabled ? " off" : "") + (isNow ? " now" : "")}
                                  onClick={() => { if (!disabled) { setEditDate({ day: d, month: cM, year: cY }); setEditTime(null); } }}
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
                              {slots.map(t => <button key={t} className={"nn-time" + (editTime === t ? " on" : "")} onClick={() => setEditTime(t)}>{t}</button>)}
                            </div>
                          )}
                        </div>
                      )}
                      <button onClick={handleReschedule} disabled={!editDate || !editTime || rescheduling}
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
  const [viewBookingsOpen, setViewBookingsOpen] = useState(false);
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
      <Nav scrolled={scrolled} onNav={scrollTo} onBook={handleBook} onDash={onDash} onViewBookings={() => setViewBookingsOpen(true)} />
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

      {viewBookingsOpen && <ViewBookingsModal onClose={() => setViewBookingsOpen(false)} />}

      <div className="nn-fade">
        <section className="nn-section" id="contact">
          <div className="nn-section-label">Find Us</div>
          <h2 className="nn-section-title">Visit the Salon</h2>
          <div className="nn-contact-grid">
            <div className="nn-contact-block"><h4>Location</h4><p>ninety nine.<br />99 Banks Road<br />West Kirby, Wirral<br />CH48 4DN</p></div>
            <div className="nn-contact-block"><h4>Opening Hours</h4><p>Varies depending on practitioner</p></div>
            <div className="nn-contact-block"><h4>Get in Touch</h4><p>Instagram: <a href="https://www.instagram.com/ninetyninebyk/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold)", textDecoration: "none" }}>@ninetyninebyk</a><br />Book online</p></div>
          </div>
          <ContactForm />
        </section>
      </div>

      <footer className="nn-footer">
        <img src="/logo-light.png" alt="ninety nine." className="nn-footer-logo" />
        99 Banks Road · West Kirby · Wirral &nbsp;·&nbsp; © {new Date().getFullYear()}
      </footer>
    </>
  );
}
