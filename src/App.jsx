// src/App.jsx — Routing shell only
import React, { useState } from "react";
import "./App.css";
import { IS_DEMO } from "./supabase.js";
import Site, { CancelPage, WaitlistBookPage, ClientPortal } from "./Site.jsx";
import Dashboard from "./Dashboard.jsx";

const PREVIEW_PASS = import.meta.env.VITE_PREVIEW_PASS;

function PreviewGate({ onUnlock }) {
  const [input, setInput] = useState("");
  const [err, setErr] = useState(false);
  function attempt() {
    if (input === PREVIEW_PASS) {
      sessionStorage.setItem("nn_unlocked", "1");
      onUnlock();
    } else {
      setErr(true);
      setInput("");
    }
  }
  return (
    <div style={{ minHeight:"100vh", background:"var(--cream)", display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 24px" }}>
      <div style={{ width:"100%", maxWidth:360, textAlign:"center" }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontStyle:"italic", fontWeight:300, marginBottom:8 }}>ninety nine.</div>
        <div style={{ width:40, height:1.5, background:"var(--gold)", margin:"0 auto 40px" }}/>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:300, marginBottom:8 }}>Coming soon</div>
        <p style={{ fontSize:14, color:"var(--warm-gray)", fontWeight:300, marginBottom:32, lineHeight:1.7 }}>
          We're putting the finishing touches on something lovely.<br/>
          If you have an access code, enter it below.
        </p>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <input
            className="nn-input"
            type="password"
            value={input}
            onChange={e => { setInput(e.target.value); setErr(false); }}
            onKeyDown={e => e.key === "Enter" && attempt()}
            placeholder="Access code"
            style={{ textAlign:"center", letterSpacing:"4px" }}
          />
          {err && <div style={{ fontSize:13, color:"var(--red)" }}>Incorrect code — try again.</div>}
          <button className="nn-btn nn-btn-dark" onClick={attempt} style={{ width:"100%", marginTop:4 }}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("site");
  const [unlocked, setUnlocked] = useState(
    !PREVIEW_PASS || sessionStorage.getItem("nn_unlocked") === "1"
  );
  const params = new URLSearchParams(window.location.search);
  const cancelToken = params.get("token");
  const isCancelPage = window.location.pathname === "/cancel" && cancelToken;
  const isPortalPage = window.location.pathname === "/my-bookings";
  const isWaitlistPage = window.location.pathname === "/waitlist-book" && params.get("token");

  // Token-based pages bypass the gate
  if (isCancelPage) return <CancelPage token={cancelToken} />;
  if (isWaitlistPage) return <WaitlistBookPage token={params.get("token")} />;
  if (isPortalPage) {
  const portalEmail = params.get("email");
  const portalToken = params.get("t");
  return <ClientPortal email={portalEmail} token={portalToken} />;
}

  if (!unlocked) return <PreviewGate onUnlock={() => setUnlocked(true)} />;

  if (page === "dashboard") {
    return (
      <>
        <Dashboard onBack={() => setPage("site")} />
        {IS_DEMO && <div className="nn-demo-banner">Demo Mode — Connect your Supabase project to go live</div>}
      </>
    );
  }

  return (
    <>
      <Site onDash={() => setPage("dashboard")} />
      {IS_DEMO && <div className="nn-demo-banner">Demo Mode — Connect your Supabase project to go live</div>}
    </>
  );
}
