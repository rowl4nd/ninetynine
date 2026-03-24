// src/App.jsx — Routing shell only
// All logic lives in Site.jsx, Dashboard.jsx, shared.js, and supabase.js

import React, { useState } from "react";
import "./App.css";
import { IS_DEMO } from "./supabase.js";
import Site, { CancelPage } from "./Site.jsx";
import Dashboard from "./Dashboard.jsx";

export default function App() {
  const [page, setPage] = useState("site");
  const cancelToken = new URLSearchParams(window.location.search).get("token");
  const isCancelPage = window.location.pathname === "/cancel" && cancelToken;

  if (isCancelPage) return <CancelPage token={cancelToken} />;

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
