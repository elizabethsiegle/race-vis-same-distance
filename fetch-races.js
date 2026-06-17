const https = require('https');
const fs = require('fs');

// ─── Constants ────────────────────────────────────────────────────────────────

const RACE_KEYWORDS = ['race', 'half', 'marathon', '10k', '10 k', 'hm', '5k', '5 k'];

const STANDARD_DISTANCES = [
  { category: '5k',       meters: 5000  },
  { category: '10k',      meters: 10000 },
  { category: 'half',     meters: 21097 },
  { category: 'marathon', meters: 42195 },
];

const TOLERANCE = 0.10;

// ─── Pure functions (exported for testing) ────────────────────────────────────

function getCategory(distanceMeters) {
  for (const { category, meters } of STANDARD_DISTANCES) {
    if (Math.abs(distanceMeters - meters) / meters <= TOLERANCE) return category;
  }
  return null;
}

function isRace(activity) {
  const name = (activity.name || '').toLowerCase();
  const hasKeyword = RACE_KEYWORDS.some((kw) => name.includes(kw));
  return hasKeyword || getCategory(activity.distance) !== null;
}

function formatTime(totalSeconds) {
  const s = Math.round(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function formatPace(distanceMeters, durationSeconds) {
  if (!distanceMeters) return '—';
  const secsPerKm = durationSeconds / (distanceMeters / 1000);
  const m = Math.floor(secsPerKm / 60);
  const s = Math.round(secsPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

module.exports = { getCategory, isRace, formatTime, formatPace };
