/* ==========================================================================
   CrashMap — Car Safety Check
   Scores the form answers client-side (instant result, no server needed),
   then silently logs the submission to a Google Form in the background
   so the team can count it toward the 50+ submissions objective.
   ========================================================================== */

const FORM_RESPONSE_URL = "https://docs.google.com/forms/d/e/1FAIpQLSeQRwI2XxPBjxUXj_adYCoCP3uh8POR4pnUvrAfJFX3scczug/formResponse";

const ENTRY_IDS = {
  brakes: "entry.1635832619",
  tyres: "entry.287398200",
  lights: "entry.308611467",
  service: "entry.1548196277",
  sleep: "entry.617895615",
  medication: "entry.1088836607",
};

// Leave as null if you didn't add a "Rating Given" question to the Form
const RATING_ENTRY_ID = "entry.808765501";

// --------------------------------------------------------------------------
// Scoring logic
// --------------------------------------------------------------------------
 
// Point values per answer — higher points = more dangerous
const POINTS = {
  brakes: { good: 0, worn: 2, replace: 4 },
  tyres: { good: 0, worn: 2, bald: 4 },
  lights: { yes: 0, no: 3 },
  service: { under6: 0, "6to12": 1, over12: 3 },
  sleep: { yes: 0, no: 2 },
  medication: { no: 0, yes: 2 },
};

const GOOGLE_FORM_VALUES = {
  brakes: { good: "Good", worn: "Worn", replace: "Needs replacement" },
  tyres: { good: "Good", worn: "Worn", bald: "Bald or damaged" },
  lights: { yes: "Yes, all working", no: "No, one or more not working" },
  service: { under6: "Under 6 months", "6to12": "6-12 months", over12: "Over 12 months / never serviced" },
  sleep: { yes: "Yes", no: "No" },
  medication: { yes: "Yes", no: "No" },
};
 
// Human-readable labels, used to build the flagged-issues list
const LABELS = {
  brakes: { worn: "worn brakes", replace: "brakes needing replacement" },
  tyres: { worn: "worn tyres", bald: "bald or damaged tyres" },
  lights: { no: "a light that isn't working" },
  service: { "6to12": "a service that's due soon", over12: "an overdue service" },
  sleep: { no: "insufficient rest" },
  medication: { yes: "drowsiness-inducing medication" },
};
 
/**
 * Calculates a roadworthiness rating from the form answers.
 * @param {Object} answers - e.g. { brakes: "worn", tyres: "good", ... }
 * @returns {{ rating: string, score: number, recommendation: string }}
 */
function calculateSafetyRating(answers) {
  let score = 0;
  const flaggedIssues = [];
 
  for (const field in answers) {
    const value = answers[field];
    score += POINTS[field]?.[value] || 0;
 
    const label = LABELS[field]?.[value];
    if (label) flaggedIssues.push(label);
  }
 
  let rating;
  if (score >= 10) {
    rating = "Critical";
  } else if (score >= 5) {
    rating = "High";
  } else {
    rating = "Low";
  }
 
  const recommendation = buildRecommendation(rating, flaggedIssues);
 
  return { rating, score, recommendation };
}
 
function buildRecommendation(rating, flaggedIssues) {
  const issuesText =
    flaggedIssues.length > 0
      ? `We noticed: ${flaggedIssues.join(", ")}. `
      : "";
 
  if (rating === "Critical") {
    return `${issuesText}Your car or readiness has serious issues right now. Please address these before driving, especially before a long trip.`;
  }
  if (rating === "High") {
    return `${issuesText}A few things need attention soon. Consider getting these checked before your next long drive.`;
  }
  return "Your vehicle looks roadworthy and you're fit to drive. Stay alert and drive safe out there.";
}
 
// --------------------------------------------------------------------------
// Google Form background submission
// --------------------------------------------------------------------------
 
/**
 * Silently submits the answers (and computed rating) to the linked
 * Google Form, so it lands in the Safety_Check_Responses Sheet.
 * Uses no-cors mode: we can't read the response, but the submission
 * still goes through — this is the standard pattern for this use case.
 */
async function logSubmissionToForm(answers, rating) {
  const formData = new URLSearchParams();
 
  for (const field in answers) {
    const entryId = ENTRY_IDS[field];
    const realValue = GOOGLE_FORM_VALUES[field]?.[answers[field]] || answers[field];
    if (entryId) formData.append(entryId, realValue);
  }
 
  if (RATING_ENTRY_ID) {
    formData.append(RATING_ENTRY_ID, rating);
  }

  console.log("Submitting to:", FORM_RESPONSE_URL);
  console.log("Payload:", formData.toString());
 
  try {
    await fetch(FORM_RESPONSE_URL, {
      method: "POST",
      mode: "no-cors",
      body: formData,
    });
    return true;
  } catch (err) {
    console.error("Failed to log submission:", err);
    return false;
  }
}
 
// --------------------------------------------------------------------------
// Form wiring
// --------------------------------------------------------------------------
 
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("sc-form");
  const errorEl = document.getElementById("sc-error");
  const resultEl = document.getElementById("sc-result");
  const badgeEl = document.getElementById("rating-badge");
  const recommendationEl = document.getElementById("rating-recommendation");
  const statusEl = document.getElementById("sc-status");
  const retryBtn = document.getElementById("sc-retry");
 
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
 
    const formData = new FormData(form);
    const answers = {
      brakes: formData.get("brakes"),
      tyres: formData.get("tyres"),
      lights: formData.get("lights"),
      service: formData.get("service"),
      sleep: formData.get("sleep"),
      medication: formData.get("medication"),
    };
 
    const allAnswered = Object.values(answers).every((v) => v !== null);
    if (!allAnswered) {
      errorEl.classList.add("visible");
      return;
    }
    errorEl.classList.remove("visible");
 
    // 1. Instant client-side scoring — no waiting on network for this part
    const { rating, recommendation } = calculateSafetyRating(answers);
 
    badgeEl.textContent = rating;
    badgeEl.className = "rating-badge " + rating.toLowerCase();
    recommendationEl.textContent = recommendation;
    statusEl.textContent = "Saving your submission…";
 
    form.classList.add("hidden");
    resultEl.classList.add("visible");
    resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
 
    // 2. Silent background log — doesn't block the result from showing
    const logged = await logSubmissionToForm(answers, rating);
    statusEl.textContent = logged
      ? "Submission recorded. Thanks for helping us track road safety!"
      : "Result shown, but we couldn't save your submission — please check your connection.";
  });
 
  retryBtn.addEventListener("click", () => {
    form.reset();
    form.classList.remove("hidden");
    resultEl.classList.remove("visible");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});