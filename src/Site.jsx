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
  return (
    <>
      <nav className={"nn-nav" + (scrolled ? " scrolled" : "")}>
        <img src="/logo-dark.png" alt="ninety nine." className="nn-logo" onClick={() => onNav("home")} />
        <ul className="nn-nav-links">
          <li><a onClick={() => onNav("services")}>Services</a></li>
          <li><a onClick={() => onNav("team")}>Team</a></li>
          <li><a onClick={() => onNav("contact")}>Contact</a></li>
          <li><a onClick={onDash} style={{ opacity:0.5, fontSize:11 }}>Staff Login</a></li>
          <li><button className="nn-nav-book" onClick={onBook}>Book Now</button></li>
        </ul>
        <button className="nn-mobile-toggle" onClick={() => setMobileOpen(o => !o)}>
          {mobileOpen
            ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          }
        </button>
      </nav>
      {mobileOpen && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, zIndex:99, background:"var(--cream)", display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", gap:8 }}>
          {[
            { label:"Services", action:() => { onNav("services"); setMobileOpen(false); }},
            { label:"Team", action:() => { onNav("team"); setMobileOpen(false); }},
            { label:"Contact", action:() => { onNav("contact"); setMobileOpen(false); }},
          ].map(item => (
            <button key={item.label} onClick={item.action} style={{ background:"none", border:"none", cursor:"pointer", fontFamily:"'Cormorant Garamond',serif", fontSize:42, fontWeight:300, fontStyle:"italic", color:"var(--charcoal)", padding:"12px 0" }}>{item.label}</button>
          ))}
          <div style={{ width:40, height:1, background:"var(--border)", margin:"16px 0" }}/>
          <button onClick={() => { onBook(); setMobileOpen(false); }} style={{ padding:"16px 48px", background:"var(--charcoal)", color:"var(--cream)", border:"none", cursor:"pointer", fontFamily:"'Outfit',sans-serif", fontSize:12, fontWeight:500, letterSpacing:"2.5px", textTransform:"uppercase" }}>Book Now</button>
          <button onClick={() => { onDash(); setMobileOpen(false); }} style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, color:"var(--warm-gray)", letterSpacing:"1.5px", textTransform:"uppercase", marginTop:8, fontFamily:"'Outfit',sans-serif" }}>Staff Login</button>
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

// ============================================================
// DIVIDER
// ============================================================

function Divider() {
  return <div className="nn-divider"><div className="nn-divider-line"/><div className="nn-divider-diamond"/><div className="nn-divider-line"/></div>;
}

// ============================================================
// SERVICES LIST (treatments page)
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
          <div className="nn-team-card" key={p.id} style={p.name === "Kristen" ? { border:"2px solid var(--gold)" } : {}}>
            {p.photo
              ? <div className="nn-team-avatar" style={{ backgroundImage:"url(" + p.photo + ")" }}/>
              : <div className="nn-team-avatar" style={{ background:p.color }}>{p.name[0]}</div>
            }
            <div className="nn-team-name">{p.name}</div>
            <div className="nn-team-role">{p.role}</div>
            {p.instagram && (
              <a href={"https://www.instagram.com/" + p.instagram.replace("@","") + "/"} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:"var(--gold)", textDecoration:"none", marginTop:6, display:"inline-block" }}>{p.instagram}</a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// BOOKING FLOW (4-step public booking)
// ============================================================

function BookingFlow({ practitioners, preselectedPrac, onClearPreselect }) {
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
  const [customServices, setCustomServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const now = new Date();
  const [cM, setCM] = useState(now.getMonth());
  const [cY, setCY] = useState(now.getFullYear());
  const labels = ["Practitioner", "Service", "Date & Time", "Confirm"];

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

  const totalDuration = (svc?.duration || 0) + (addon ? addon.duration : 0);
  const totalPrice = (svc?.price || 0) + (addon ? addon.price : 0);
  const { slots, loading: slotsLoading } = useAvailableSlots(prac?.id, date, totalDuration, prac?.slot_interval || 30);
  const dateStep = svc?.addon ? 4 : 3;
  const confirmStep = svc?.addon ? 5 : 4;

  const groups = [...new Set(customServices.filter(s => s.group_name).map(s => s.group_name))];
  const ungrouped = customServices.filter(s => !s.group_name);

  function handleSelectService(s) { setSvc(s); setAddon(null); if (s?.addon) setStep(3); else setStep(dateStep); }

  async function handleConfirm() {
    if (IS_DEMO) { setDone(true); return; }
    setSaving(true);
    try {
      await supabase.insert("bookings", {
        practitioner_id: prac.id, service_id: svc.id,
        service_title: svc.title + (addon ? " + " + addon.title : ""),
        client_name: clientName, client_phone: phone, client_email: email,
        booking_date: dateStr(date.year, date.month, date.day),
        booking_time: time + ":00", duration: totalDuration, price: totalPrice,
        notes: addon ? "Add-on: " + addon.title : "",
      });
      setDone(true);
    } catch (e) { console.error(e); alert("Sorry, there was an error creating your booking. Please try again."); }
    setSaving(false);
  }

  if (done) {
    return (
      <div style={{ padding:"60px 0", maxWidth:480, margin:"0 auto" }}>
        <div className="nn-success-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
        <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:300, textAlign:"center", marginBottom:10 }}>You're all booked</h2>
        <p style={{ textAlign:"center", color:"var(--warm-gray)", fontSize:15, fontWeight:300, lineHeight:1.6 }}>
          {clientName}, your appointment with {prac.name} is confirmed for {getDayName(date.year,date.month,date.day)} {date.day} {getMonthName(date.month)} at {time}.<br/>See you at 99 Banks Road!
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
            <div className={"nn-step" + (step===i+1?" active":"") + (step>i+1?" done":"")}>
              <div className="nn-step-num">{step>i+1?"✓":i+1}</div><span>{l}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <div>
          <H3>Who would you like to see?</H3>
          <div className="nn-prac-grid">
            {practitioners.map(p => (
              <div key={p.id} className={"nn-prac-card"+(prac?.id===p.id?" picked":"")} onClick={() => { setPrac(p); setStep(2); }}>
                {p.photo
                  ? <div className="nn-team-avatar" style={{ backgroundImage:"url("+p.photo+")", width:48, height:48, margin:"0 auto 14px" }}/>
                  : <div className="nn-team-avatar" style={{ background:p.color, width:48, height:48, fontSize:18, margin:"0 auto 14px" }}>{p.name[0]}</div>
                }
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:400, marginBottom:4 }}>{p.name}</div>
                <div style={{ fontSize:11, color:"var(--warm-gray)", fontWeight:300 }}>{p.specialty}</div>
              </div>
            ))}
          </div>
          <div className="nn-booking-nav">
            <button className="nn-btn nn-btn-dark" onClick={() => setStep(2)} disabled={!prac} style={{ opacity:prac?1:.35 }}>Continue</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <H3>{prac?.name}'s services</H3>
          {loadingServices ? (
            <div style={{ color:"var(--warm-gray)", fontSize:14, fontWeight:300 }}>Loading services...</div>
          ) : customServices.length === 0 ? (
            <div style={{ color:"var(--warm-gray)", fontSize:14, fontWeight:300 }}>No services available yet. Please DM us on Instagram.</div>
          ) : (
            <div>
              {groups.map(group => (
                <div key={group} style={{ marginBottom:24 }}>
                  <div className="nn-svc-group-label">{group}</div>
                  <ServiceGroup services={customServices.filter(s => s.group_name===group)} selectedId={svc?.id} onSelect={handleSelectService}/>
                </div>
              ))}
              {ungrouped.length > 0 && (
                <div>
                  {groups.length > 0 && <div className="nn-svc-group-label">Other</div>}
                  <ServiceGroup services={ungrouped} selectedId={svc?.id} onSelect={handleSelectService}/>
                </div>
              )}
            </div>
          )}
          <div className="nn-booking-nav">
            <button className="nn-btn-back" onClick={() => setStep(1)}>Back</button>
            <button className="nn-btn nn-btn-dark" onClick={() => { if (svc?.addon) setStep(3); else setStep(dateStep); }} disabled={!svc} style={{ opacity:svc?1:.35 }}>Continue</button>
          </div>
        </div>
      )}

      {step === 3 && svc?.addon && (
        <div>
          <H3>Would you like to add anything?</H3>
          <p style={{ fontSize:14, color:"var(--warm-gray)", fontWeight:300, marginBottom:28, lineHeight:1.7 }}>
            You can add the following optional extra to your {svc.title} appointment.
          </p>
          <div className={"nn-svc-item"+(addon===null?" picked":"")} onClick={() => setAddon(null)} style={{ marginBottom:8 }}>
            <div><div style={{ fontWeight:500 }}>No add-on</div><div style={{ fontSize:13, color:"var(--warm-gray)", fontWeight:300 }}>Just the {svc.title}</div></div>
            <div style={{ fontSize:14, color:"var(--warm-gray)" }}>—</div>
          </div>
          <div className={"nn-svc-item"+(addon?.id===svc.addon.id?" picked":"")} onClick={() => setAddon(svc.addon)}>
            <div><div style={{ fontWeight:500 }}>{svc.addon.title}</div><div style={{ fontSize:13, color:"var(--warm-gray)", fontWeight:300 }}>{svc.addon.duration} min extra</div></div>
            <div style={{ fontSize:17, fontWeight:600, color:"var(--gold)" }}>+£{svc.addon.price}</div>
          </div>
          <div className="nn-booking-nav">
            <button className="nn-btn-back" onClick={() => setStep(2)}>Back</button>
            <button className="nn-btn nn-btn-dark" onClick={() => setStep(dateStep)}>Continue</button>
          </div>
        </div>
      )}

      {step === dateStep && (
        <div>
          <H3>Pick a date &amp; time</H3>
          <div style={{ display:"flex", gap:48, flexWrap:"wrap" }}>
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
              <div style={{ flex:1, minWidth:200 }}>
                <div style={{ fontSize:14, color:"var(--warm-gray)", marginBottom:14, fontWeight:300 }}>
                  {getDayName(date.year,date.month,date.day)} {date.day} {getMonthName(date.month)}
                </div>
                {slotsLoading ? (
                  <div style={{ color:"var(--warm-gray)", fontSize:14, fontWeight:300 }}>Loading available times...</div>
                ) : slots.length === 0 ? (
                  <div style={{ color:"var(--red)", fontSize:14, fontWeight:300 }}>No available slots on this date. Try another day.</div>
                ) : (
                  <div className="nn-times">{slots.map(t => <button key={t} className={"nn-time"+(time===t?" on":"")} onClick={() => setTime(t)}>{t}</button>)}</div>
                )}
              </div>
            )}
          </div>
          <div className="nn-booking-nav">
            <button className="nn-btn-back" onClick={() => setStep(svc?.addon?3:2)}>Back</button>
            <button className="nn-btn nn-btn-dark" onClick={() => setStep(confirmStep)} disabled={!date||!time} style={{ opacity:date&&time?1:.35 }}>Continue</button>
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
            <div className="nn-confirm-row"><span className="nn-confirm-label">Date</span><span className="nn-confirm-val">{getDayName(date.year,date.month,date.day)} {date.day} {getMonthName(date.month)} {date.year}</span></div>
            <div className="nn-confirm-row"><span className="nn-confirm-label">Time</span><span className="nn-confirm-val">{time}</span></div>
            <div className="nn-confirm-row"><span className="nn-confirm-label">Duration</span><span className="nn-confirm-val">{totalDuration} min</span></div>
            <div className="nn-confirm-row"><span className="nn-confirm-label">Price</span><span className="nn-confirm-val">£{totalPrice}</span></div>
            <div style={{ marginTop:28, display:"flex", flexDirection:"column", gap:16 }}>
              <div><label className="nn-input-label">Your Name</label><input className="nn-input" type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Full name"/></div>
              <div><label className="nn-input-label">Phone Number</label><input className="nn-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="07xxx xxxxxx"/></div>
              <div><label className="nn-input-label">Email (optional)</label><input className="nn-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="for confirmation email"/></div>
            </div>
          </div>
          <div className="nn-booking-nav">
            <button className="nn-btn-back" onClick={() => setStep(dateStep)}>Back</button>
            <button className="nn-btn nn-btn-gold" onClick={handleConfirm} disabled={!clientName||!phone||saving} style={{ opacity:clientName&&phone&&!saving?1:.35 }}>
              {saving ? "Booking..." : "Confirm Booking"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// CANCEL PAGE (accessed via /cancel?token=xxx)
// ============================================================

export function CancelPage({ token }) {
  const [status, setStatus] = useState("loading");
  const [booking, setBooking] = useState(null);
  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    supabase.query("bookings", {
      select:"*,practitioner:practitioners(name)",
      filters:"&cancellation_token=eq."+token+"&status=eq.confirmed",
    }).then(rows => {
      if (rows.length===0) { setStatus("notfound"); return; }
      setBooking(rows[0]); setStatus("confirm");
    }).catch(() => {
      setStatus("error");
    });
  }, [token]);

  async function handleCancel() {
    setStatus("cancelling");
    try {
      await supabase.update("bookings", { status:"cancelled" }, "cancellation_token=eq."+token);
      setStatus("done");
    } catch (e) { console.error(e); setStatus("error"); }
  }

  const dateObj = booking ? new Date(booking.booking_date+"T12:00:00") : null;
  const formattedDate = dateObj?.toLocaleDateString("en-GB",{ weekday:"long", day:"numeric", month:"long", year:"numeric" });
  const treatmentName = booking?.service_title || booking?.notes || "Your treatment";

  return (
    <div style={{ minHeight:"100vh", background:"var(--cream)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 24px" }}>
      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, fontStyle:"italic", fontWeight:300, marginBottom:8 }}>ninety nine.</div>
      <div style={{ width:40, height:1.5, background:"var(--gold)", margin:"0 auto 48px" }}/>
      {status==="loading" && <div style={{ color:"var(--warm-gray)", fontSize:15, fontWeight:300 }}>Loading...</div>}
      {status==="notfound" && (
        <div style={{ textAlign:"center", maxWidth:400 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, fontWeight:300, marginBottom:16 }}>Booking not found</div>
          <p style={{ color:"var(--warm-gray)", fontSize:15, fontWeight:300, lineHeight:1.7 }}>This booking may have already been cancelled. DM us on Instagram <a href="https://www.instagram.com/ninetyninebyk/" style={{ color:"var(--gold)" }}>@ninetyninebyk</a> if you need help.</p>
        </div>
      )}
      {status==="confirm" && booking && (
        <div style={{ maxWidth:480, width:"100%" }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:300, marginBottom:8, textAlign:"center" }}>Cancel appointment</div>
          <p style={{ textAlign:"center", color:"var(--warm-gray)", fontSize:15, fontWeight:300, marginBottom:40 }}>Are you sure you want to cancel this booking?</p>
          <div style={{ background:"var(--warm-white)", border:"1px solid var(--border)", padding:32, marginBottom:32 }}>
            {[["Treatment",treatmentName],["Practitioner",booking.practitioner?.name],["Date",formattedDate],["Time",booking.booking_time?.slice(0,5)]].map(([label,val]) => (
              <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"12px 0", borderBottom:"1px solid var(--border)", fontSize:15 }}>
                <span style={{ color:"var(--warm-gray)", fontWeight:300 }}>{label}</span>
                <span style={{ fontWeight:500 }}>{val}</span>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:12 }}>
            <a href="/" style={{ flex:1, padding:"16px", background:"none", border:"1.5px solid var(--border)", fontFamily:"'Outfit',sans-serif", fontSize:12, fontWeight:500, letterSpacing:"2px", textTransform:"uppercase", textAlign:"center", textDecoration:"none", color:"var(--charcoal)" }}>Keep Booking</a>
            <button onClick={handleCancel} style={{ flex:1, padding:"16px", background:"var(--red)", color:"#fff", border:"none", fontFamily:"'Outfit',sans-serif", fontSize:12, fontWeight:500, letterSpacing:"2px", textTransform:"uppercase", cursor:"pointer" }}>Yes, Cancel</button>
          </div>
        </div>
      )}
      {status==="cancelling" && <div style={{ color:"var(--warm-gray)", fontSize:15, fontWeight:300 }}>Cancelling your appointment...</div>}
      {status==="done" && (
        <div style={{ textAlign:"center", maxWidth:400 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:300, marginBottom:16 }}>Booking cancelled</div>
          <p style={{ color:"var(--warm-gray)", fontSize:15, fontWeight:300, lineHeight:1.7, marginBottom:32 }}>Your appointment has been cancelled. We hope to see you again soon.</p>
          <a href="/" style={{ display:"inline-block", padding:"16px 40px", background:"var(--charcoal)", color:"var(--cream)", textDecoration:"none", fontFamily:"'Outfit',sans-serif", fontSize:12, fontWeight:500, letterSpacing:"2px", textTransform:"uppercase" }}>Back to Website</a>
        </div>
      )}
      {status==="error" && (
        <div style={{ textAlign:"center", maxWidth:400 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, fontWeight:300, marginBottom:16 }}>Something went wrong</div>
          <p style={{ color:"var(--warm-gray)", fontSize:15, fontWeight:300, lineHeight:1.7 }}>Please DM us on Instagram <a href="https://www.instagram.com/ninetyninebyk/" style={{ color:"var(--gold)" }}>@ninetyninebyk</a> and we'll sort it for you.</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SITE (main public wrapper — exported as default)
// ============================================================

export default function Site({ onDash }) {
  const [scrolled, setScrolled] = useState(false);
  const [preselectedPrac, setPreselectedPrac] = useState(null);
  const bookRef = useRef(null);
  const practitioners = usePractitioners();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("vis"); }),
      { threshold:0.08 }
    );
    document.querySelectorAll(".nn-fade").forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior:"smooth" });
  const goBook = () => bookRef.current?.scrollIntoView({ behavior:"smooth" });
  const bookWithPrac = (prac) => { setPreselectedPrac(prac); bookRef.current?.scrollIntoView({ behavior:"smooth" }); };

  return (
    <>
      <Nav scrolled={scrolled} onNav={scrollTo} onBook={goBook} onDash={onDash}/>
      <Hero onBook={goBook}/>
      <Divider/>
      <div className="nn-fade"><ServicesList practitioners={practitioners} onBookWith={bookWithPrac}/></div>
      <Divider/>
      <div className="nn-fade"><TeamSection practitioners={practitioners}/></div>
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
        <BookingFlow practitioners={practitioners} preselectedPrac={preselectedPrac} onClearPreselect={() => setPreselectedPrac(null)}/>
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
        <img src="/logo-light.png" alt="ninety nine." className="nn-footer-logo"/>
        99 Banks Road · West Kirby · Wirral &nbsp;·&nbsp; © {new Date().getFullYear()}
      </footer>
    </>
  );
}
