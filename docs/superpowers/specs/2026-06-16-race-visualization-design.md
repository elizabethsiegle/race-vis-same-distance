# Race Visualization — Design Spec

**Date:** 2026-06-16  
**Status:** Approved

## Overview

A single-page personal race history site. Data comes from the Strava API, refreshed weekly by a Claude routine. No build step, no framework — plain HTML, Chart.js, and a Node.js fetch script.

---

## Goals

- Visualize half marathon, 10k, and marathon race times over time
- Show personal bests per distance at a glance
- Log all races in a sortable table
- Feel like a personal log, not a SaaS product — minimal, human, understated

---

## Data Source

**Strava API** (free personal tier). The user registers a free app at `strava.com/settings/api`, completes a one-time OAuth flow via a local auth script, and stores three credentials in a `.env` file:

```
STRAVA_CLIENT_ID=...
STRAVA_CLIENT_SECRET=...
STRAVA_REFRESH_TOKEN=...
```

The `.env` file is gitignored and never committed.

---

## File Structure

```
race-vis-same-distance/
├── index.html          # entire webpage — no build step
├── fetch-races.js      # node script: pulls strava, writes races.json
├── races.json          # generated output, committed by Claude routine
├── .env                # gitignored strava credentials
└── .gitignore
```

---

## fetch-races.js

A Node.js script with no external dependencies beyond the standard `https` module.

**Steps:**
1. Reads `CLIENT_ID`, `CLIENT_SECRET`, `REFRESH_TOKEN` from `.env`
2. POSTs to `https://www.strava.com/oauth/token` to get a fresh access token
3. Paginates `GET /athlete/activities?type=Run&per_page=200` until all runs are fetched
4. Filters to races using two signals (either is sufficient):
   - Activity name contains a keyword (case-insensitive): `race`, `half`, `marathon`, `10k`, `10 k`, `hm`, `5k`, `5 k`
   - Distance within ±10% of a standard distance: 5km, 10km, 21.097km, 42.195km
5. Assigns a category (`5k`, `10k`, `half`, `marathon`) based on distance
6. Writes `races.json`

**Failure behavior:** if the token refresh fails or the API returns an error, the script logs the error and exits non-zero without touching `races.json`. The existing file is left intact so the page keeps showing valid data.

### races.json shape

```json
[
  {
    "name": "Oakland Half Marathon",
    "date": "2025-04-06",
    "category": "half",
    "distanceKm": 21.1,
    "durationSeconds": 7530,
    "pacePerKm": "5:56",
    "stravaId": 123456789
  }
]
```

---

## index.html — Webpage Layout

Three stacked sections, rendered from `races.json` via `fetch()`.

### 1. Hero — Progress Timeline

- Chart.js line chart
- X-axis: date (chronological)
- Y-axis: finish time formatted as `h:mm:ss`, **inverted** so faster = visually higher
- One line per category — only rendered if that category has at least one data point
- Each point is a race; tooltip on hover shows: race name, date, pace per km
- Categories: 10k (one color), half (another), marathon (another)

### 2. PR Dashboard

- One stat card per category with data
- Shows: distance label, best time (bold), race name, date of that race
- No chart — just clean bold numbers
- Fastest time in each category is highlighted

### 3. Race History Table

- Columns: Date | Race | Distance | Time | Pace
- Sorted newest-first by default
- Column headers are clickable to re-sort
- Each race name links to its Strava activity (`https://www.strava.com/activities/{stravaId}`)

### Styling

- Dark background
- Monospace font for times and paces
- Minimal — no heavy shadows, no rounded-corner card stacks, no gradients
- Accent color marks fastest time in each category
- Feels handmade, not generated — sparse whitespace, simple horizontal rules as dividers

---

## Claude Routine

A scheduled Claude routine runs weekly (Monday 7am local time).

**Steps:**
1. Runs `node fetch-races.js` in the project directory
2. If `races.json` changed, commits it with message `chore: refresh race data`
3. Pushes to `main`
4. GitHub Pages deploys automatically on push

---

## One-Time Strava OAuth Setup

A separate `strava-auth.js` script handles the initial token exchange. The user runs it once locally:

1. Script prints an authorization URL
2. User visits URL in browser and authorizes
3. Strava redirects to `localhost:8080/callback` with an auth code
4. Script exchanges code for tokens, prints the `REFRESH_TOKEN`
5. User pastes it into `.env`

After this, `fetch-races.js` handles all token refreshes automatically using the refresh token.

---

## Hosting

GitHub Pages, deploying from `main`. No CI config needed — Pages picks up `index.html` at the root.

GitHub username: `elizabethsiegle`
Repo URL: `https://github.com/elizabethsiegle/race-vis-same-distance`
Live URL: `https://elizabethsiegle.github.io/race-vis-same-distance`

---

## Out of Scope

- No user auth, no accounts
- No manual race entry UI (if Strava is missing a race, edit `races.json` directly)
- No mobile-specific layout optimizations (readable on mobile but not a priority)
- No marathon support until there is actual marathon data
