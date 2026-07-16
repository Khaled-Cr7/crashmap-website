/* ==========================================================================
   CrashMap — Blackspot Map
   Initialises the Leaflet map centred on Shah Alam, then loads and plots
   blackspot pins once data-loader.js has fetched the Sheet data.
   ========================================================================== */

// Shah Alam's approximate centre point
const SHAH_ALAM_CENTER = [3.0733, 101.5185];
const DEFAULT_ZOOM = 12;

// Colour per severity, matching css/style.css variables
const SEVERITY_COLORS = {
  Critical: "#ef4444",
  High: "#f5a623",
  Low: "#2dd4bf",
};

function initMap() {
  const map = L.map("map", {
    scrollWheelZoom: true,
  }).setView(SHAH_ALAM_CENTER, DEFAULT_ZOOM);

  // Free OpenStreetMap tiles — no API key required
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  return map;
}

function severityColor(severity) {
  return SEVERITY_COLORS[severity] || "#94a3b8";
}

function buildPopupHTML(spot) {
  const severityClass = (spot.severity || "").toLowerCase();

  return `
    <div class="popup-title">${spot.name}</div>
    <span class="popup-severity ${severityClass}">${spot.severity}</span>
    <div class="popup-cause">${spot.cause}</div>
    <div class="popup-tip"><strong>Drive safe:</strong> ${spot.tip}</div>
  `;
}

function plotBlackspots(map, blackspots) {
  blackspots.forEach((spot) => {
    const marker = L.circleMarker([spot.lat, spot.lng], {
      radius: 9,
      fillColor: severityColor(spot.severity),
      fillOpacity: 0.9,
      color: "#0a1420",
      weight: 2,
    }).addTo(map);

    marker.bindPopup(buildPopupHTML(spot));
  });
}

// ---------- Boot sequence ----------
document.addEventListener("DOMContentLoaded", async () => {
  const statusEl = document.getElementById("map-status");
  const map = initMap();

  try {
    const blackspots = await loadBlackspots(); // from data-loader.js
    plotBlackspots(map, blackspots);
    statusEl.textContent = `Showing ${blackspots.length} documented blackspots in Shah Alam.`;
  } catch (err) {
    console.error(err);
    statusEl.textContent =
      "Couldn't load blackspot data right now. Please refresh the page or check back later.";
  }
});