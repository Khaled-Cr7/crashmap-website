/* ==========================================================================
   CrashMap — Data Loader
   Fetches blackspot rows from the shared Google Sheet via the opensheet API
   and hands back a clean array of blackspot objects.
   ========================================================================== */

const OPENSHEET_URL = "https://opensheet.elk.sh/1DA1hbZ_7j1CpNOnc5mptklVvHVJ0Fkhb2VA3OT0wQeA/1";

/**
 * Fetches and normalises blackspot data from the Google Sheet.
 * Returns a Promise that resolves to an array of blackspot objects:
 * { name, lat, lng, cause, severity, tip, source }
 */
async function loadBlackspots() {
  const response = await fetch(OPENSHEET_URL);

  if (!response.ok) {
    throw new Error(`Failed to load blackspot data (status ${response.status})`);
  }

  const rawRows = await response.json();

  // Normalise: trim strings, convert lat/lng to numbers, drop any
  // incomplete rows (e.g. a blank row left in the Sheet).
  const blackspots = rawRows
    .map((row) => ({
      name: (row.name || "").trim(),
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      cause: (row.cause || "").trim(),
      severity: (row.severity || "").trim(),
      tip: (row.tip || "").trim(),
      source: (row.source || "").trim(),
    }))
    .filter((spot) => spot.name && !isNaN(spot.lat) && !isNaN(spot.lng));

  return blackspots;
}