import { firebaseConfig } from './firebase';

export function generateAllInOneGitHubIndexHtml(): string {
  const cfg = JSON.stringify(
    {
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
      firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
    },
    null,
    2
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>ChargerLink — Dodge Charger Cockpit &amp; Live GPS Telemetry</title>
  <meta name="theme-color" content="#090A0D" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,800;1,800&family=JetBrains+Mono:wght@500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #090A0D;
      color: #F4F4F5;
      font-family: "Plus Jakarta Sans", system-ui, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      position: sticky; top: 0; z-index: 30;
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      padding: 0 24px; height: 64px;
      border-bottom: 1px solid #1E212A;
      background: rgba(9, 10, 13, 0.92);
      backdrop-filter: blur(10px);
    }
    .brand {
      font-family: "Barlow Condensed", sans-serif;
      font-size: 26px; font-weight: 800; letter-spacing: 0.04em;
      color: #FFFFFF; cursor: pointer; white-space: nowrap;
    }
    .brand span { color: #E11D2E; }
    nav { display: flex; gap: 20px; }
    .nav-btn {
      background: none; border: none; border-bottom: 2px solid transparent;
      color: #A1A1AA; font-size: 13px; font-weight: 600; padding: 6px 2px;
      cursor: pointer; white-space: nowrap;
    }
    .nav-btn.active { color: #FFFFFF; border-bottom-color: #E11D2E; }
    .btn {
      background: #E11D2E; color: #fff; border: none; border-radius: 10px;
      padding: 10px 16px; font-size: 12px; font-weight: 600; cursor: pointer;
      white-space: nowrap; min-height: 40px;
    }
    .btn:hover { background: #C81827; }
    .btn.secondary { background: #14171F; border: 1px solid #2D323E; color: #E4E4E7; }
    .btn.secondary:hover { background: #1E222D; }
    .btn.active-mode { background: #E11D2E; border-color: #E11D2E; color: #FFFFFF; }
    .btn:disabled { opacity: 0.45; cursor: not-allowed; }
    main {
      flex: 1; width: 100%; max-width: 1280px; margin: 0 auto;
      padding: 20px; display: flex; flex-direction: column; gap: 20px;
    }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
    @media (max-width: 960px) {
      .grid-2 { grid-template-columns: 1fr; }
      nav { gap: 12px; }
    }
    .panel {
      background: #0E1015; border: 1px solid #1F232D; border-radius: 16px;
      padding: 20px; display: flex; flex-direction: column; gap: 16px;
    }
    .row-between { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
    .seg-group { display: inline-flex; gap: 4px; padding: 4px; background: #090A0D; border: 1px solid #1F232D; border-radius: 10px; }
    .seg-btn {
      background: none; border: none; color: #A1A1AA; border-radius: 7px;
      padding: 7px 12px; font-size: 12px; font-weight: 600; cursor: pointer;
    }
    .seg-btn.active { background: #E11D2E; color: #FFFFFF; }
    .seg-btn.unit-active { background: #F4F4F5; color: #090A0D; }
    .controls-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; width: 100%; }
    .stats-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    @media (max-width: 600px) { .stats-4 { grid-template-columns: repeat(2, 1fr); } }
    .stat-box {
      background: #0E1015; border: 1px solid #1F232D; border-radius: 12px; padding: 12px 14px;
    }
    .stat-label { font-size: 11px; color: #A1A1AA; }
    .stat-val { font-family: "JetBrains Mono", monospace; font-size: 17px; font-weight: 700; margin-top: 4px; }
    .search-row { display: flex; gap: 8px; position: relative; }
    input[type="text"], input[type="email"], input[type="password"] {
      width: 100%; min-height: 42px; border-radius: 10px; border: 1px solid #272A34;
      background: #090A0D; color: #F4F4F5; padding: 0 12px; font-size: 13px;
    }
    .results-dropdown {
      position: absolute; top: 46px; left: 0; right: 0; z-index: 40;
      background: #101218; border: 1px solid #2D323E; border-radius: 12px; overflow: hidden;
    }
    .result-item {
      width: 100%; text-align: left; background: none; border: none; border-bottom: 1px solid #1E212A;
      color: #E4E4E7; padding: 10px 12px; font-size: 12px; cursor: pointer;
    }
    .result-item:hover { background: #1B1F29; }
    .map-wrap { position: relative; width: 100%; height: 440px; border-radius: 14px; overflow: hidden; border: 1px solid #1F232D; }
    #map { width: 100%; height: 100%; background: #0B0D12; }
    .map-overlay-tl {
      position: absolute; top: 12px; left: 12px; z-index: 10; pointer-events: none;
      background: rgba(9, 10, 13, 0.88); border: 1px solid #272A34; border-radius: 8px;
      padding: 6px 10px; font-size: 11px; font-family: "JetBrains Mono", monospace;
    }
    .map-controls-tr { position: absolute; top: 12px; right: 12px; z-index: 10; display: flex; gap: 6px; }
    .sim-box {
      width: 100%; background: #090A0D; border: 1px solid #1F232D; border-radius: 12px; padding: 14px;
      display: none; flex-direction: column; gap: 10px;
    }
    .sim-box.visible { display: flex; }
    .hidden { display: none !important; }
    .modal-backdrop {
      position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.75);
      display: flex; align-items: center; justify-content: center; padding: 16px;
    }
    .modal-card {
      width: 100%; max-width: 420px; background: #101218; border: 1px solid #272A34;
      border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 14px;
    }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 12px 14px; border-bottom: 1px solid #1E212A; text-align: left; }
    th { color: #A1A1AA; font-size: 12px; background: #0C0E13; }
  </style>
</head>
<body>
  <header>
    <div class="brand" id="brand-home">CHARGER<span>LINK</span></div>
    <nav>
      <button class="nav-btn active" data-view="cockpit">Cockpit</button>
      <button class="nav-btn" data-view="windows">Windows Map</button>
      <button class="nav-btn" data-view="trips">Trip Logs</button>
    </nav>
    <button id="auth-open-btn" class="btn">Sign In</button>
  </header>

  <main>
    <div id="verify-banner" class="panel hidden" style="border-color:#78350F;background:#1C1208;padding:14px 18px;">
      <div class="row-between">
        <span style="font-size:13px;color:#FDE68A;">Verify your email address in your inbox to enable live Firebase sync between Android and Windows.</span>
        <div style="display:flex;gap:8px;">
          <button id="verify-refresh-btn" class="btn">I Verified</button>
          <button id="verify-resend-btn" class="btn secondary">Resend Email</button>
        </div>
      </div>
    </div>

    <!-- COCKPIT / WINDOWS VIEW -->
    <section id="main-grid" class="grid-2">
      <div class="panel" style="align-items:center;">
        <div class="row-between" style="width:100%;font-size:12px;color:#A1A1AA;">
          <span id="view-title" style="font-weight:600;color:#F4F4F5;">2023 Charger SRT Hellcat · Android Cockpit</span>
          <span id="sync-status" style="font-family:'JetBrains Mono',monospace;">Local Mode</span>
        </div>

        <svg id="charger-gauge" viewBox="0 0 440 440" style="width:100%;max-width:410px;filter:drop-shadow(0 20px 40px rgba(0,0,0,0.85));">
          <defs>
            <linearGradient id="bezelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#3F4451"/><stop offset="50%" stop-color="#151820"/><stop offset="100%" stop-color="#2F3440"/>
            </linearGradient>
            <radialGradient id="dialGrad" cx="50%" cy="46%" r="54%">
              <stop offset="0%" stop-color="#14171F"/><stop offset="100%" stop-color="#06070A"/>
            </radialGradient>
          </defs>
          <circle cx="220" cy="220" r="212" fill="url(#bezelGrad)"/>
          <circle cx="220" cy="220" r="202" fill="#07080B" stroke="#272A34" stroke-width="1.5"/>
          <circle cx="220" cy="220" r="194" fill="url(#dialGrad)"/>
          <path id="track-arc-bg" d="" fill="none" stroke="#27272A" stroke-width="3" stroke-linecap="round"/>
          <path id="track-arc-fg" d="" fill="none" stroke="#E11D2E" stroke-width="5" stroke-linecap="round"/>
          <g id="gauge-ticks"></g>
          <text x="220" y="136" text-anchor="middle" fill="#71717A" font-size="11" font-weight="700" letter-spacing="3" font-family="Barlow Condensed">CHARGER INSTRUMENT CLUSTER</text>
          <text id="mode-readout" x="220" y="154" text-anchor="middle" fill="#E11D2E" font-size="13" font-weight="700" letter-spacing="2.5" font-family="Barlow Condensed">TRACK MODE</text>
          <rect x="130" y="264" width="180" height="108" rx="12" fill="#0B0D12" stroke="#272A34" stroke-width="1.5"/>
          <text id="evic-speed" x="220" y="314" text-anchor="middle" fill="#FFFFFF" font-size="56" font-weight="800" font-family="Barlow Condensed">0</text>
          <text id="evic-unit" x="220" y="334" text-anchor="middle" fill="#FB7185" font-size="12" font-weight="700" letter-spacing="2" font-family="JetBrains Mono">MPH</text>
          <line x1="146" y1="344" x2="294" y2="344" stroke="#1F242D" stroke-width="1"/>
          <text id="evic-gear" x="156" y="361" text-anchor="start" fill="#E11D2E" font-size="13" font-weight="700" font-family="JetBrains Mono">G:P</text>
          <text id="evic-peak" x="220" y="361" text-anchor="middle" fill="#A1A1AA" font-size="11" font-weight="600" font-family="JetBrains Mono">PK 0</text>
          <text id="evic-dist" x="284" y="361" text-anchor="end" fill="#A1A1AA" font-size="11" font-weight="600" font-family="JetBrains Mono">0.0mi</text>
          <rect x="148" y="382" width="144" height="5" rx="2.5" fill="#181B22"/>
          <rect id="rpm-bar" x="148" y="382" width="12" height="5" rx="2.5" fill="#E11D2E"/>
          <text id="evic-rpm" x="220" y="402" text-anchor="middle" fill="#71717A" font-size="10.5" font-weight="600" font-family="JetBrains Mono">780 RPM · N 0°</text>
          <g id="needle-group" transform="rotate(-135 220 220)">
            <polygon points="220,55 214,220 220,252 226,220" fill="#FF2438"/>
          </g>
          <circle cx="220" cy="220" r="23" fill="#181B22" stroke="#3F4451" stroke-width="2.5"/>
          <circle cx="220" cy="220" r="13" fill="#0B0D12" stroke="#272A34" stroke-width="1.5"/>
          <circle id="hub-led" cx="220" cy="220" r="5" fill="#52525B"/>
        </svg>

        <div id="cockpit-controls" style="width:100%;display:flex;flex-direction:column;gap:12px;">
          <div class="row-between">
            <div class="seg-group">
              <button class="seg-btn" data-mode="street">Street</button>
              <button class="seg-btn" data-mode="sport">Sport</button>
              <button class="seg-btn active" data-mode="track">Track</button>
            </div>
            <div class="seg-group">
              <button class="seg-btn unit-active" data-unit="mph">MPH</button>
              <button class="seg-btn" data-unit="kmh">KM/H</button>
            </div>
          </div>

          <div class="controls-3">
            <button id="gps-btn" class="btn">Start Live GPS</button>
            <button id="sim-btn" class="btn secondary">Test Drive</button>
            <button id="stop-btn" class="btn secondary" disabled>Stop</button>
          </div>

          <div id="sim-box" class="sim-box">
            <div class="row-between" style="font-size:12px;">
              <span>Test Throttle Target</span>
              <span id="sim-target-lbl" style="font-family:'JetBrains Mono',monospace;color:#FB7185;font-weight:700;">65 MPH</span>
            </div>
            <input id="sim-slider" type="range" min="0" max="200" value="65" style="width:100%;accent-color:#E11D2E;" />
            <div style="display:flex;gap:6px;">
              <button class="btn secondary sim-preset" data-speed="0" style="flex:1;padding:6px;">0</button>
              <button class="btn secondary sim-preset" data-speed="45" style="flex:1;padding:6px;">45</button>
              <button class="btn secondary sim-preset" data-speed="75" style="flex:1;padding:6px;">75</button>
              <button class="btn secondary sim-preset" data-speed="120" style="flex:1;padding:6px;">120</button>
              <button class="btn secondary sim-preset" data-speed="165" style="flex:1;padding:6px;">165</button>
            </div>
          </div>

          <div style="display:flex;gap:8px;border-top:1px solid #1F232D;padding-top:12px;">
            <input id="trip-label-input" type="text" value="Evening Run" placeholder="Trip label" />
            <button id="save-trip-btn" class="btn secondary" disabled>Save Trip</button>
            <button id="reset-trip-btn" class="btn secondary">Reset</button>
          </div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:14px;">
        <div class="search-row">
          <input id="dest-input" type="text" placeholder="Search destination on OpenStreetMap..." />
          <button id="dest-btn" class="btn">Go To</button>
          <div id="dest-results" class="results-dropdown hidden"></div>
        </div>
        <div id="route-banner" class="panel hidden" style="padding:10px 14px;border-color:#075985;background:#082F49;">
          <div class="row-between" style="font-size:12px;">
            <span id="route-info">Route</span>
            <button id="route-clear" class="btn secondary" style="min-height:30px;padding:4px 10px;">Clear</button>
          </div>
        </div>
        <div class="map-wrap">
          <div id="map"></div>
          <div id="map-overlay" class="map-overlay-tl">OpenStreetMap · 0 MPH</div>
          <div class="map-controls-tr">
            <button id="layer-btn" class="btn secondary" style="min-height:36px;padding:6px 10px;">OSM</button>
            <button id="locate-btn" class="btn secondary" style="min-height:36px;padding:6px 10px;">Me</button>
            <button id="follow-btn" class="btn" style="min-height:36px;padding:6px 10px;">Following</button>
          </div>
        </div>
        <div class="stats-4">
          <div class="stat-box"><div class="stat-label">Engine RPM</div><div id="stat-rpm" class="stat-val">780</div></div>
          <div class="stat-box"><div class="stat-label">Peak Speed</div><div id="stat-peak" class="stat-val">0 MPH</div></div>
          <div class="stat-box"><div class="stat-label">Trip Distance</div><div id="stat-dist" class="stat-val">0.00 mi</div></div>
          <div class="stat-box"><div class="stat-label">Heading</div><div id="stat-head" class="stat-val">0°</div></div>
        </div>
      </div>
    </section>

    <!-- TRIP LOGS VIEW -->
    <section id="trips-view" class="panel hidden" style="padding:0;overflow:hidden;">
      <div style="padding:16px 20px;border-bottom:1px solid #1E212A;" class="row-between">
        <strong>Saved Drive Sessions</strong>
        <span id="trips-count" style="font-size:12px;color:#A1A1AA;">0 recorded</span>
      </div>
      <div style="overflow-x:auto;">
        <table>
          <thead><tr><th>Trip</th><th>Mode</th><th>Peak</th><th>Distance</th><th>Duration</th><th></th></tr></thead>
          <tbody id="trips-tbody"></tbody>
        </table>
      </div>
    </section>
  </main>

  <!-- EMAIL/PASSWORD + GOOGLE AUTH MODAL -->
  <div id="auth-modal" class="modal-backdrop hidden">
    <div class="modal-card">
      <div class="row-between">
        <strong id="auth-modal-title" style="font-size:17px;">Sign in to ChargerLink</strong>
        <button id="auth-close-btn" class="btn secondary" style="min-height:32px;padding:4px 10px;">Close</button>
      </div>
      <div class="seg-group" style="width:100%;display:grid;grid-template-columns:1fr 1fr;">
        <button id="tab-signin" class="seg-btn unit-active">Sign In</button>
        <button id="tab-signup" class="seg-btn">Create Account</button>
      </div>
      <form id="email-auth-form" style="display:flex;flex-direction:column;gap:10px;">
        <input id="auth-email" type="email" required placeholder="Email address" />
        <input id="auth-password" type="password" required minlength="6" placeholder="Password (min 6 chars)" />
        <div id="auth-msg" style="font-size:12px;color:#FCA5A5;"></div>
        <button id="email-submit-btn" type="submit" class="btn">Sign In with Email</button>
      </form>
      <div style="text-align:center;font-size:11px;color:#71717A;">or</div>
      <button id="google-auth-btn" class="btn secondary">Continue with Google</button>
    </div>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script type="module">
    import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
    import {
      getAuth, GoogleAuthProvider, signInWithPopup, signOut,
      signInWithEmailAndPassword, createUserWithEmailAndPassword,
      sendEmailVerification, reload, onAuthStateChanged
    } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
    import {
      getFirestore, doc, setDoc, updateDoc, deleteDoc, collection,
      query, orderBy, limit, onSnapshot, serverTimestamp
    } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

    const firebaseConfig = ${cfg};
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    const googleProvider = new GoogleAuthProvider();

    const state = {
      view: "cockpit", authMode: "signin", user: null, vehicleExists: false,
      mode: "track", unit: "mph", speedMph: 0, rpm: 780, peakSpeedMph: 0,
      tripDistanceMiles: 0, lat: 34.052235, lng: -118.243683, heading: 0,
      isTracking: false, sourceMode: "idle", targetSimSpeed: 65,
      routePoints: [{ lat: 34.052235, lng: -118.243683 }],
      follow: true, mapStyle: "osm", simTimer: null, gpsWatch: null, lastSync: 0, startTime: null
    };

    // Build Dodge Charger 0..200 MPH dial
    function polar(cx, cy, r, deg) {
      const rad = ((deg - 90) * Math.PI) / 180;
      return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
    }
    function arcPath(cx, cy, r, a1, a2) {
      const s = polar(cx, cy, r, a2), e = polar(cx, cy, r, a1);
      return "M " + s.x + " " + s.y + " A " + r + " " + r + " 0 " + (a2 - a1 <= 180 ? 0 : 1) + " 0 " + e.x + " " + e.y;
    }
    document.getElementById("track-arc-bg").setAttribute("d", arcPath(220, 220, 186, 225, 495));

    const ticksEl = document.getElementById("gauge-ticks");
    function drawScale() {
      ticksEl.innerHTML = "";
      const maxVal = state.unit === "mph" ? 200 : 320;
      const major = state.unit === "mph" ? 20 : 40;
      const step = state.unit === "mph" ? 2 : 4;
      for (let v = 0; v <= maxVal; v += step) {
        const frac = v / maxVal, deg = 225 + frac * 270;
        const isMaj = v % major === 0, isMid = !isMaj && v % (major / 2) === 0, red = frac >= 0.8;
        const p1 = polar(220, 220, isMaj ? 156 : isMid ? 164 : 170, deg);
        const p2 = polar(220, 220, 178, deg);
        const ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
        ln.setAttribute("x1", p1.x); ln.setAttribute("y1", p1.y); ln.setAttribute("x2", p2.x); ln.setAttribute("y2", p2.y);
        ln.setAttribute("stroke", red ? "#E11D2E" : isMaj ? "#F4F4F5" : "#71717A");
        ln.setAttribute("stroke-width", isMaj ? "3" : isMid ? "2" : "1.1");
        ticksEl.appendChild(ln);
        if (isMaj) {
          const lp = polar(220, 220, 132, deg);
          const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
          t.setAttribute("x", lp.x); t.setAttribute("y", lp.y); t.setAttribute("text-anchor", "middle");
          t.setAttribute("dominant-baseline", "central"); t.setAttribute("fill", red ? "#FB7185" : "#F4F4F5");
          t.setAttribute("font-size", "20"); t.setAttribute("font-weight", "800"); t.setAttribute("font-style", "italic");
          t.setAttribute("font-family", "Barlow Condensed"); t.textContent = String(v);
          ticksEl.appendChild(t);
        }
      }
    }
    drawScale();

    // Leaflet + OpenStreetMap setup
    const map = L.map("map", { center: [state.lat, state.lng], zoom: 15, zoomControl: false });
    let tileLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap", maxZoom: 19 }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    const vehMarker = L.circleMarker([state.lat, state.lng], { radius: 9, color: "#fff", weight: 2, fillColor: "#E11D2E", fillOpacity: 1 }).addTo(map);
    const trailLine = L.polyline([], { color: "#E11D2E", weight: 4 }).addTo(map);
    const routeLine = L.polyline([], { color: "#38BDF8", weight: 5, dashArray: "8 6" }).addTo(map);
    map.on("dragstart", () => { state.follow = false; document.getElementById("follow-btn").textContent = "Follow"; });

    const MODE_COLORS = { street: "#E2E8F0", sport: "#F97316", track: "#E11D2E" };
    function renderGauge(d) {
      const mult = state.unit === "mph" ? 1 : 1.60934;
      const maxVal = state.unit === "mph" ? 200 : 320;
      const shown = d.speedMph * mult;
      const frac = Math.min(1, Math.max(0, shown / maxVal));
      const color = MODE_COLORS[d.driveMode || state.mode] || "#E11D2E";
      document.getElementById("needle-group").setAttribute("transform", "rotate(" + (-135 + frac * 270) + " 220 220)");
      document.getElementById("track-arc-fg").setAttribute("stroke", color);
      document.getElementById("track-arc-fg").setAttribute("d", frac > 0.005 ? arcPath(220, 220, 186, 225, 225 + frac * 270) : "");
      document.getElementById("mode-readout").textContent = (d.driveMode || state.mode).toUpperCase() + " MODE";
      document.getElementById("mode-readout").setAttribute("fill", color);
      document.getElementById("evic-speed").textContent = String(Math.round(shown));
      document.getElementById("evic-unit").textContent = state.unit.toUpperCase();
      document.getElementById("evic-peak").textContent = "PK " + Math.round((d.peakSpeedMph || 0) * mult);
      document.getElementById("evic-dist").textContent = ((d.tripDistanceMiles || 0) * mult).toFixed(1) + (state.unit === "mph" ? "mi" : "km");
      const gear = d.speedMph < 1 ? "P" : String(Math.min(8, Math.floor(d.speedMph / 24) + 1));
      document.getElementById("evic-gear").textContent = "G:" + gear;
      document.getElementById("rpm-bar").setAttribute("width", String(Math.max(4, Math.min(144, ((d.rpm || 780) / 7000) * 144))));
      document.getElementById("evic-rpm").textContent = Math.round(d.rpm || 780) + " RPM · " + Math.round(d.heading || 0) + "°";
      document.getElementById("hub-led").setAttribute("fill", d.isTracking ? "#E11D2E" : "#52525B");
      document.getElementById("stat-rpm").textContent = String(Math.round(d.rpm || 780));
      document.getElementById("stat-peak").textContent = Math.round((d.peakSpeedMph || 0) * mult) + " " + state.unit.toUpperCase();
      document.getElementById("stat-dist").textContent = ((d.tripDistanceMiles || 0) * mult).toFixed(2) + (state.unit === "mph" ? " mi" : " km");
      document.getElementById("stat-head").textContent = Math.round(d.heading || 0) + "°";
      document.getElementById("map-overlay").textContent = "OpenStreetMap · " + Math.round(shown) + " " + state.unit.toUpperCase();

      const ll = [d.lat, d.lng];
      vehMarker.setLatLng(ll);
      if (state.follow) map.panTo(ll);
    }

    async function syncFirestore(force = false) {
      if (!state.user || !state.user.emailVerified) return;
      const now = Date.now();
      if (!force && now - state.lastSync < 1100) return;
      state.lastSync = now;
      const ref = doc(db, "users", state.user.uid, "vehicles", "charger-01");
      const base = {
        ownerId: state.user.uid, vehicleName: "2023 Charger SRT Hellcat",
        driveMode: state.mode, unit: state.unit, speedMph: Number(state.speedMph.toFixed(1)),
        rpm: Math.round(state.rpm), latitude: state.lat, longitude: state.lng,
        heading: Math.round(state.heading), altitudeMeters: 85, accuracyMeters: 5,
        peakSpeedMph: Number(state.peakSpeedMph.toFixed(1)),
        tripDistanceMiles: Number(state.tripDistanceMiles.toFixed(3)),
        isTracking: state.isTracking, sourceDevice: state.sourceMode === "gps" ? "android-gps" : "charger-sim",
        updatedAt: serverTimestamp()
      };
      if (!state.vehicleExists) {
        await setDoc(ref, { ...base, createdAt: serverTimestamp() });
        state.vehicleExists = true;
      } else {
        await updateDoc(ref, base);
      }
      document.getElementById("sync-status").textContent = "Synced " + new Date().toLocaleTimeString();
    }

    function stopAll() {
      if (state.gpsWatch !== null) { navigator.geolocation.clearWatch(state.gpsWatch); state.gpsWatch = null; }
      if (state.simTimer !== null) { clearInterval(state.simTimer); state.simTimer = null; }
      state.sourceMode = "idle"; state.isTracking = false; state.speedMph = 0; state.rpm = 780;
      document.getElementById("sim-box").classList.remove("visible");
      document.getElementById("stop-btn").disabled = true;
      renderGauge(state); syncFirestore(true);
    }

    document.getElementById("gps-btn").onclick = () => {
      stopAll();
      if (!navigator.geolocation) return;
      state.sourceMode = "gps"; state.isTracking = true; state.startTime = Date.now();
      document.getElementById("stop-btn").disabled = false;
      state.gpsWatch = navigator.geolocation.watchPosition((pos) => {
        const c = pos.coords;
        const mph = c.speed && c.speed > 0 ? c.speed * 2.23694 : 0;
        state.speedMph = mph; state.rpm = 800 + mph * 40;
        state.lat = c.latitude; state.lng = c.longitude;
        state.heading = c.heading || state.heading;
        state.peakSpeedMph = Math.max(state.peakSpeedMph, mph);
        state.routePoints.push({ lat: c.latitude, lng: c.longitude });
        trailLine.setLatLngs(state.routePoints.map(p => [p.lat, p.lng]));
        renderGauge(state); syncFirestore();
      }, null, { enableHighAccuracy: true });
    };

    document.getElementById("sim-btn").onclick = () => {
      stopAll();
      state.sourceMode = "simulator"; state.isTracking = true; state.startTime = Date.now();
      document.getElementById("sim-box").classList.add("visible");
      document.getElementById("stop-btn").disabled = false;
      state.simTimer = setInterval(() => {
        const diff = state.targetSimSpeed - state.speedMph;
        state.speedMph = Math.max(0, Math.min(200, state.speedMph + (diff > 0 ? Math.min(diff, 4) : Math.max(diff, -5))));
        state.rpm = state.speedMph < 1 ? 780 : 1800 + ((state.speedMph % 32) / 32) * 4400;
        state.peakSpeedMph = Math.max(state.peakSpeedMph, state.speedMph);
        const step = state.speedMph * (0.25 / 3600);
        state.tripDistanceMiles += step;
        state.heading = (state.heading + 1.5) % 360;
        const rad = (state.heading * Math.PI) / 180;
        state.lat += (step / 69) * Math.cos(rad);
        state.lng += (step / (69 * Math.cos(state.lat * Math.PI / 180))) * Math.sin(rad);
        state.routePoints.push({ lat: state.lat, lng: state.lng });
        trailLine.setLatLngs(state.routePoints.slice(-120).map(p => [p.lat, p.lng]));
        renderGauge(state); syncFirestore();
      }, 250);
    };

    document.getElementById("stop-btn").onclick = stopAll;
    document.getElementById("sim-slider").oninput = (e) => {
      state.targetSimSpeed = Number(e.target.value);
      document.getElementById("sim-target-lbl").textContent = state.targetSimSpeed + " MPH";
    };
    document.querySelectorAll(".sim-preset").forEach((b) => {
      b.onclick = () => {
        state.targetSimSpeed = Number(b.dataset.speed);
        document.getElementById("sim-slider").value = state.targetSimSpeed;
        document.getElementById("sim-target-lbl").textContent = state.targetSimSpeed + " MPH";
      };
    });

    document.querySelectorAll("[data-mode]").forEach((b) => {
      b.onclick = () => {
        state.mode = b.dataset.mode;
        document.querySelectorAll("[data-mode]").forEach(x => x.classList.toggle("active", x === b));
        renderGauge(state); syncFirestore(true);
      };
    });
    document.querySelectorAll("[data-unit]").forEach((b) => {
      b.onclick = () => {
        state.unit = b.dataset.unit;
        document.querySelectorAll("[data-unit]").forEach(x => x.classList.toggle("unit-active", x === b));
        drawScale(); renderGauge(state); syncFirestore(true);
      };
    });

    document.getElementById("layer-btn").onclick = () => {
      state.mapStyle = state.mapStyle === "osm" ? "dark" : "osm";
      map.removeLayer(tileLayer);
      tileLayer = L.tileLayer(
        state.mapStyle === "osm"
          ? "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { maxZoom: 19 }
      ).addTo(map);
      document.getElementById("layer-btn").textContent = state.mapStyle === "osm" ? "OSM" : "Dark";
    };
    document.getElementById("follow-btn").onclick = () => { state.follow = true; map.setView([state.lat, state.lng], 16); document.getElementById("follow-btn").textContent = "Following"; };
    document.getElementById("locate-btn").onclick = () => navigator.geolocation?.getCurrentPosition(p => { state.follow = false; map.setView([p.coords.latitude, p.coords.longitude], 15); });

    // OpenStreetMap Nominatim + OSRM Destination Routing
    document.getElementById("dest-btn").onclick = async () => {
      const q = document.getElementById("dest-input").value.trim();
      if (!q) return;
      const res = await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=5&q=" + encodeURIComponent(q));
      const data = await res.json();
      const box = document.getElementById("dest-results");
      box.innerHTML = ""; box.classList.remove("hidden");
      data.forEach((item) => {
        const btn = document.createElement("button");
        btn.className = "result-item"; btn.textContent = item.display_name;
        btn.onclick = async () => {
          box.classList.add("hidden");
          const dLat = Number(item.lat), dLng = Number(item.lon);
          const rRes = await fetch("https://router.project-osrm.org/route/v1/driving/" + state.lng + "," + state.lat + ";" + dLng + "," + dLat + "?overview=full&geometries=geojson");
          const rData = await rRes.json();
          const rt = rData.routes?.[0];
          if (rt) {
            const coords = rt.geometry.coordinates.map(c => [c[1], c[0]]);
            routeLine.setLatLngs(coords);
            state.follow = false; map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
            document.getElementById("route-info").textContent = "Route: " + (rt.distance * 0.000621371).toFixed(1) + " mi · " + Math.round(rt.duration / 60) + " min";
            document.getElementById("route-banner").classList.remove("hidden");
          }
        };
        box.appendChild(btn);
      });
    };
    document.getElementById("route-clear").onclick = () => { routeLine.setLatLngs([]); document.getElementById("route-banner").classList.add("hidden"); };

    // View Navigation
    document.querySelectorAll(".nav-btn").forEach((b) => {
      b.onclick = () => {
        state.view = b.dataset.view;
        document.querySelectorAll(".nav-btn").forEach(x => x.classList.toggle("active", x === b));
        document.getElementById("main-grid").classList.toggle("hidden", state.view === "trips");
        document.getElementById("trips-view").classList.toggle("hidden", state.view !== "trips");
        document.getElementById("cockpit-controls").classList.toggle("hidden", state.view === "windows");
        document.getElementById("view-title").textContent = state.view === "windows" ? "Windows Live Sync Dashboard" : "2023 Charger SRT Hellcat · Android Cockpit";
        setTimeout(() => map.invalidateSize(), 80);
      };
    });

    // Firebase Auth (Email/Password + Google)
    const authModal = document.getElementById("auth-modal");
    document.getElementById("auth-open-btn").onclick = () => {
      if (state.user) signOut(auth);
      else authModal.classList.remove("hidden");
    };
    document.getElementById("auth-close-btn").onclick = () => authModal.classList.add("hidden");
    document.getElementById("tab-signin").onclick = () => { state.authMode = "signin"; document.getElementById("tab-signin").classList.add("unit-active"); document.getElementById("tab-signup").classList.remove("unit-active"); document.getElementById("email-submit-btn").textContent = "Sign In with Email"; };
    document.getElementById("tab-signup").onclick = () => { state.authMode = "signup"; document.getElementById("tab-signup").classList.add("unit-active"); document.getElementById("tab-signin").classList.remove("unit-active"); document.getElementById("email-submit-btn").textContent = "Create Account"; };
    document.getElementById("google-auth-btn").onclick = async () => { await signInWithPopup(auth, googleProvider); authModal.classList.add("hidden"); };
    document.getElementById("email-auth-form").onsubmit = async (e) => {
      e.preventDefault();
      const email = document.getElementById("auth-email").value.trim();
      const pass = document.getElementById("auth-password").value;
      const msg = document.getElementById("auth-msg"); msg.textContent = "";
      try {
        if (state.authMode === "signin") {
          await signInWithEmailAndPassword(auth, email, pass);
          authModal.classList.add("hidden");
        } else {
          const cred = await createUserWithEmailAndPassword(auth, email, pass);
          await sendEmailVerification(cred.user);
          msg.style.color = "#34D399";
          msg.textContent = "Verification email sent! Check your inbox.";
        }
      } catch (err) { msg.style.color = "#FCA5A5"; msg.textContent = err.message; }
    };
    document.getElementById("verify-resend-btn").onclick = () => state.user && sendEmailVerification(state.user);
    document.getElementById("verify-refresh-btn").onclick = async () => { if (state.user) { await reload(state.user); location.reload(); } };

    document.getElementById("save-trip-btn").onclick = async () => {
      if (!state.user || !state.user.emailVerified) return;
      const id = "trip-" + Date.now();
      await setDoc(doc(db, "users", state.user.uid, "vehicles", "charger-01", "trips", id), {
        ownerId: state.user.uid, vehicleId: "charger-01",
        label: document.getElementById("trip-label-input").value || "Drive Session",
        driveMode: state.mode, maxSpeedMph: state.peakSpeedMph, avgSpeedMph: state.speedMph,
        distanceMiles: Number(state.tripDistanceMiles.toFixed(2)),
        durationSeconds: state.startTime ? Math.round((Date.now() - state.startTime) / 1000) : 60,
        startLat: state.routePoints[0]?.lat || state.lat, startLng: state.routePoints[0]?.lng || state.lng,
        endLat: state.lat, endLng: state.lng, routePoints: state.routePoints.slice(-55),
        createdAt: serverTimestamp()
      });
    };
    document.getElementById("reset-trip-btn").onclick = () => { state.peakSpeedMph = 0; state.tripDistanceMiles = 0; state.routePoints = [{ lat: state.lat, lng: state.lng }]; trailLine.setLatLngs([]); renderGauge(state); };

    let unsubVeh = null, unsubTrips = null;
    onAuthStateChanged(auth, (user) => {
      state.user = user;
      if (unsubVeh) { unsubVeh(); unsubVeh = null; }
      if (unsubTrips) { unsubTrips(); unsubTrips = null; }
      document.getElementById("auth-open-btn").textContent = user ? "Sign Out" : "Sign In";
      document.getElementById("verify-banner").classList.toggle("hidden", !user || user.emailVerified);
      document.getElementById("save-trip-btn").disabled = !user || !user.emailVerified;
      if (!user || !user.emailVerified) return;

      document.getElementById("sync-status").textContent = "Firebase Connected";
      unsubVeh = onSnapshot(doc(db, "users", user.uid, "vehicles", "charger-01"), (snap) => {
        state.vehicleExists = snap.exists();
        if (!snap.exists() || state.sourceMode !== "idle") return;
        const d = snap.data();
        renderGauge({
          speedMph: Number(d.speedMph || 0), rpm: Number(d.rpm || 780),
          peakSpeedMph: Number(d.peakSpeedMph || 0), tripDistanceMiles: Number(d.tripDistanceMiles || 0),
          lat: Number(d.latitude || state.lat), lng: Number(d.longitude || state.lng),
          heading: Number(d.heading || 0), driveMode: d.driveMode || "track", isTracking: Boolean(d.isTracking)
        });
      });

      unsubTrips = onSnapshot(query(collection(db, "users", user.uid, "vehicles", "charger-01", "trips"), orderBy("createdAt", "desc"), limit(25)), (snap) => {
        const tbody = document.getElementById("trips-tbody");
        tbody.innerHTML = "";
        document.getElementById("trips-count").textContent = snap.size + " recorded";
        snap.forEach((docSnap) => {
          const t = docSnap.data();
          const tr = document.createElement("tr");
          tr.innerHTML = "<td>" + t.label + "</td><td>" + t.driveMode + "</td><td>" + Math.round(t.maxSpeedMph) + " MPH</td><td>" + Number(t.distanceMiles).toFixed(2) + " mi</td><td>" + t.durationSeconds + "s</td><td><button class='btn secondary' style='min-height:30px;padding:4px 10px;'>Delete</button></td>";
          tr.querySelector("button").onclick = () => deleteDoc(docSnap.ref);
          tbody.appendChild(tr);
        });
      });
    });
  </script>
</body>
</html>`;
}

export const ANDROID_SPEEDOMETER_KT = `package com.chargerlink.cockpit.ui

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.math.sin

enum class ChargerDriveMode(val accentColor: Color, val label: String) {
    STREET(Color(0xFFE2E8F0), "STREET"),
    SPORT(Color(0xFFF97316), "SPORT"),
    TRACK(Color(0xFFE11D2E), "TRACK")
}

@Composable
fun DodgeChargerSpeedometer(
    speedMph: Float,
    rpm: Int,
    peakSpeedMph: Float,
    tripMiles: Float,
    driveMode: ChargerDriveMode = ChargerDriveMode.TRACK,
    modifier: Modifier = Modifier
) {
    val animatedSpeed by animateFloatAsState(
        targetValue = speedMph.coerceIn(0f, 200f),
        animationSpec = spring(dampingRatio = 0.78f, stiffness = Spring.StiffnessLow),
        label = "charger_needle"
    )
    val textMeasurer = rememberTextMeasurer()

    Box(
        modifier = modifier
            .aspectRatio(1f)
            .background(Color(0xFF090A0D)),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.fillMaxSize().padding(12.dp)) {
            val cx = size.width / 2f
            val cy = size.height / 2f
            val radius = size.minDimension / 2f
            val startAngle = 135f
            val sweepSpan = 270f

            drawCircle(
                brush = Brush.linearGradient(
                    listOf(Color(0xFF3F4451), Color(0xFF14171F), Color(0xFF2D323E))
                ),
                radius = radius,
                center = Offset(cx, cy)
            )
            drawCircle(
                brush = Brush.radialGradient(
                    listOf(Color(0xFF14171F), Color(0xFF07080B)),
                    center = Offset(cx, cy),
                    radius = radius * 0.92f
                ),
                radius = radius * 0.92f,
                center = Offset(cx, cy)
            )

            val progressSweep = (animatedSpeed / 200f) * sweepSpan
            if (progressSweep > 1f) {
                drawArc(
                    color = driveMode.accentColor,
                    startAngle = startAngle,
                    sweepAngle = progressSweep,
                    useCenter = false,
                    topLeft = Offset(cx - radius * 0.85f, cy - radius * 0.85f),
                    size = Size(radius * 1.7f, radius * 1.7f),
                    style = Stroke(width = 10f, cap = StrokeCap.Round)
                )
            }

            for (v in 0..200 step 2) {
                val frac = v / 200f
                val deg = startAngle + frac * sweepSpan
                val rad = Math.toRadians(deg.toDouble())
                val isMajor = v % 20 == 0
                val isMid = !isMajor && v % 10 == 0
                val isRedline = v >= 160

                val rOut = radius * 0.82f
                val rIn = when {
                    isMajor -> radius * 0.71f
                    isMid -> radius * 0.75f
                    else -> radius * 0.78f
                }

                drawLine(
                    color = when {
                        isRedline -> Color(0xFFE11D2E)
                        isMajor -> Color(0xFFF4F4F5)
                        else -> Color(0xFF71717A)
                    },
                    start = Offset(cx + (rIn * cos(rad)).toFloat(), cy + (rIn * sin(rad)).toFloat()),
                    end = Offset(cx + (rOut * cos(rad)).toFloat(), cy + (rOut * sin(rad)).toFloat()),
                    strokeWidth = if (isMajor) 5f else if (isMid) 3f else 1.6f,
                    cap = StrokeCap.Round
                )

                if (isMajor) {
                    val labelRadius = radius * 0.59f
                    val measured = textMeasurer.measure(
                        text = v.toString(),
                        style = TextStyle(
                            color = if (isRedline) Color(0xFFFB7185) else Color(0xFFF4F4F5),
                            fontSize = 18.sp,
                            fontWeight = FontWeight.ExtraBold,
                            fontStyle = FontStyle.Italic
                        )
                    )
                    val tx = cx + (labelRadius * cos(rad)).toFloat() - measured.size.width / 2f
                    val ty = cy + (labelRadius * sin(rad)).toFloat() - measured.size.height / 2f
                    drawText(measured, topLeft = Offset(tx, ty))
                }
            }

            val needleDeg = startAngle + progressSweep
            val needleRad = Math.toRadians(needleDeg.toDouble())
            val tip = Offset(
                cx + (radius * 0.76f * cos(needleRad)).toFloat(),
                cy + (radius * 0.76f * sin(needleRad)).toFloat()
            )
            val tail = Offset(
                cx - (radius * 0.16f * cos(needleRad)).toFloat(),
                cy - (radius * 0.16f * sin(needleRad)).toFloat()
            )
            drawLine(
                color = Color(0xFFFF2438),
                start = tail,
                end = tip,
                strokeWidth = 10f,
                cap = StrokeCap.Round
            )

            drawCircle(color = Color(0xFF1B1E25), radius = radius * 0.11f, center = Offset(cx, cy))
            drawCircle(color = Color(0xFFE11D2E), radius = radius * 0.03f, center = Offset(cx, cy))
        }

        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 36.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = animatedSpeed.roundToInt().toString(),
                color = Color.White,
                fontSize = 44.sp,
                fontWeight = FontWeight.ExtraBold,
                fontFamily = FontFamily.Monospace
            )
            Text(
                text = "MPH · \${driveMode.label}",
                color = driveMode.accentColor,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 2.sp
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "$rpm RPM · PK \${peakSpeedMph.roundToInt()} · \${"%.1f".format(tripMiles)} mi",
                color = Color(0xFFA1A1AA),
                fontSize = 11.sp,
                fontFamily = FontFamily.Monospace
            )
        }
    }
}
`;

export const ANDROID_MAIN_ACTIVITY_KT = `package com.chargerlink.cockpit

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.Looper
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.chargerlink.cockpit.ui.ChargerDriveMode
import com.chargerlink.cockpit.ui.DodgeChargerSpeedometer
import com.google.android.gms.location.*
import com.google.firebase.FirebaseApp
import com.google.firebase.auth.ktx.auth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.ktx.firestore
import com.google.firebase.ktx.Firebase
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Configuration.getInstance().userAgentValue = packageName
        FirebaseApp.initializeApp(this)
        setContent {
            ChargerCockpitScreen()
        }
    }
}

@SuppressLint("MissingPermission")
@Composable
fun ChargerCockpitScreen() {
    val context = LocalContext.current
    val fusedLocation = remember { LocationServices.getFusedLocationProviderClient(context) }

    var speedMph by remember { mutableFloatStateOf(0f) }
    var peakSpeedMph by remember { mutableFloatStateOf(0f) }
    var geoPoint by remember { mutableStateOf(GeoPoint(34.052235, -118.243683)) }
    var driveMode by remember { mutableStateOf(ChargerDriveMode.TRACK) }
    var hasPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        )
    }

    val launcher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted -> hasPermission = granted }

    LaunchedEffect(Unit) {
        if (!hasPermission) launcher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
    }

    DisposableEffect(hasPermission) {
        if (!hasPermission) return@DisposableEffect onDispose {}
        val req = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 1000L)
            .setMinUpdateIntervalMillis(500L)
            .build()

        val callback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                val loc = result.lastLocation ?: return
                val mph = (loc.speed * 2.23694f).coerceIn(0f, 200f)
                speedMph = mph
                if (mph > peakSpeedMph) peakSpeedMph = mph
                geoPoint = GeoPoint(loc.latitude, loc.longitude)

                val user = Firebase.auth.currentUser ?: return
                Firebase.firestore
                    .collection("users").document(user.uid)
                    .collection("vehicles").document("charger-01")
                    .update(
                        mapOf(
                            "speedMph" to mph,
                            "latitude" to loc.latitude,
                            "longitude" to loc.longitude,
                            "heading" to loc.bearing,
                            "peakSpeedMph" to peakSpeedMph,
                            "isTracking" to true,
                            "sourceDevice" to "android-native",
                            "updatedAt" to FieldValue.serverTimestamp()
                        )
                    )
            }
        }
        fusedLocation.requestLocationUpdates(req, callback, Looper.getMainLooper())
        onDispose { fusedLocation.removeLocationUpdates(callback) }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF090A0D))
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        DodgeChargerSpeedometer(
            speedMph = speedMph,
            rpm = (800 + (speedMph * 42).toInt()).coerceAtMost(7000),
            peakSpeedMph = peakSpeedMph,
            tripMiles = 0f,
            driveMode = driveMode,
            modifier = Modifier.fillMaxWidth(0.9f)
        )
        Spacer(modifier = Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            ChargerDriveMode.entries.forEach { mode ->
                Button(
                    onClick = { driveMode = mode },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (driveMode == mode) Color(0xFFE11D2E) else Color(0xFF1A1D24)
                    )
                ) {
                    Text(mode.label, color = Color.White)
                }
            }
        }
        Spacer(modifier = Modifier.height(12.dp))

        AndroidView(
            modifier = Modifier.fillMaxWidth().weight(1f),
            factory = { ctx ->
                MapView(ctx).apply {
                    setTileSource(TileSourceFactory.MAPNIK)
                    setMultiTouchControls(true)
                    controller.setZoom(15.5)
                    controller.setCenter(geoPoint)
                }
            },
            update = { mapView ->
                mapView.controller.animateTo(geoPoint)
                mapView.overlays.clear()
                val marker = Marker(mapView).apply {
                    position = geoPoint
                    title = "Dodge Charger"
                }
                mapView.overlays.add(marker)
                mapView.invalidate()
            }
        )
    }
}
`;

export const ANDROID_GRADLE_AND_MANIFEST = `// app/build.gradle.kts (key dependencies — zero Maps API key needed!)
dependencies {
    implementation(platform("androidx.compose:compose-bom:2025.02.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.10.0")

    // OpenStreetMap (OSMdroid) & GPS Location
    implementation("org.osmdroid:osmdroid-android:6.1.20")
    implementation("com.google.android.gms:play-services-location:21.3.0")

    // Firebase (use the same projectId & firestoreDatabaseId: ${firebaseConfig.firestoreDatabaseId})
    implementation(platform("com.google.firebase:firebase-bom:33.10.0"))
    implementation("com.google.firebase:firebase-auth-ktx")
    implementation("com.google.firebase:firebase-firestore-ktx")
}

<!-- AndroidManifest.xml permissions -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
`;
