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
  // Word-boundary matching prevents 'hm' from matching 'richmond', etc.
  return RACE_KEYWORDS.some((kw) =>
    new RegExp(`\\b${kw.replace(/\s+/, '\\s+')}\\b`).test(name)
  );
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

// ─── API client (only runs when executed directly) ────────────────────────────

function loadEnv() {
  const text = fs.readFileSync('.env', 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const eq = line.indexOf('=');
    if (eq > 0) env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return env;
}

function httpsPost(hostname, path, body) {
  return new Promise((resolve, reject) => {
    const data = new URLSearchParams(body).toString();
    const req = https.request(
      {
        hostname,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => resolve(JSON.parse(raw)));
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function httpsGet(path, token) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'www.strava.com',
        path,
        headers: { Authorization: `Bearer ${token}` },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => resolve(JSON.parse(raw)));
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function refreshAccessToken(env) {
  const result = await httpsPost('www.strava.com', '/oauth/token', {
    client_id: env.STRAVA_CLIENT_ID,
    client_secret: env.STRAVA_CLIENT_SECRET,
    refresh_token: env.STRAVA_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  });
  if (!result.access_token) throw new Error(`Token refresh failed: ${JSON.stringify(result)}`);
  return result.access_token;
}

async function fetchAllActivities(token) {
  const activities = [];
  let page = 1;
  while (true) {
    const batch = await httpsGet(
      `/api/v3/athlete/activities?per_page=200&page=${page}`,
      token
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    // Strava deprecated ?type=Run query param — filter client-side
    const runs = batch.filter((a) => a.sport_type === 'Run' || a.type === 'Run');
    activities.push(...runs);
    if (batch.length < 200) break;
    page++;
  }
  return activities;
}

function toRace(activity) {
  return {
    name: activity.name,
    date: activity.start_date_local.slice(0, 10),
    category: getCategory(activity.distance) || 'other',
    distanceKm: Math.round(activity.distance / 10) / 100,
    durationSeconds: Math.round(activity.moving_time),
    pacePerKm: formatPace(activity.distance, activity.moving_time),
    stravaId: activity.id,
  };
}

async function main() {
  let env;
  try {
    env = loadEnv();
  } catch {
    console.error('Could not read .env');
    process.exit(1);
  }

  const missing = ['STRAVA_CLIENT_ID', 'STRAVA_CLIENT_SECRET', 'STRAVA_REFRESH_TOKEN']
    .filter((k) => !env[k]);
  if (missing.length) {
    console.error(`Missing from .env: ${missing.join(', ')}`);
    process.exit(1);
  }

  let token;
  try {
    token = await refreshAccessToken(env);
  } catch (err) {
    console.error('Token refresh failed:', err.message);
    process.exit(1);
  }

  console.log('Fetching activities...');
  const activities = await fetchAllActivities(token);
  console.log(`Fetched ${activities.length} activities`);

  const races = activities.filter(isRace).map(toRace);
  races.sort((a, b) => a.date.localeCompare(b.date));
  console.log(`Found ${races.length} races`);

  fs.writeFileSync('races.json', JSON.stringify(races, null, 2));
  console.log('Wrote races.json');
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
