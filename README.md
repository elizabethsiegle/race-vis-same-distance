# race log

a personal race history page — charts progress over time, shows PRs, and keeps a full sortable log. data comes from strava, updated weekly on autopilot.

built with plain HTML, Chart.js, and a Node.js fetch script. no framework, no build step, one file to open in a browser.

---

## what it shows

- **progress chart** — your finish times plotted over time, one line per distance (10k, half marathon, marathon). faster times sit higher since the y-axis is inverted.
- **personal bests** — fastest time per distance, race name, date
- **race table** — every race sorted by date (or any column you click), with a link out to the strava activity

---

## setup

**1. create a strava app**

go to [strava.com/settings/api](https://www.strava.com/settings/api) and create a free app. copy the client ID and client secret into a `.env` file at the project root:

```
STRAVA_CLIENT_ID=your_id_here
STRAVA_CLIENT_SECRET=your_secret_here
```

**2. get your refresh token**

```bash
node strava-auth.js
```

this opens a browser tab, you authorize, and it prints a refresh token. paste it into `.env`:

```
STRAVA_REFRESH_TOKEN=the_token_it_printed
```

you only do this once. the fetch script handles token refreshes from here on.

**3. pull your races**

```bash
node fetch-races.js
```

fetches all your strava runs, filters to races by name (anything with "half", "marathon", "10k", "race", etc. in the title), and writes `races.json`. worth opening the file and checking — if something looks wrong just delete it from the JSON directly.

**4. preview**

```bash
python3 -m http.server 3000
```

open [localhost:3000](http://localhost:3000). `fetch()` requires a server so the plain file:// path won't work.

**5. deploy**

push to a public GitHub repo, go to settings → pages, set source to `main` / `/(root)`. takes about a minute.

---

## how the weekly refresh works

a [Claude routine](https://www.anthropic.com/claude-code) runs every Monday morning. it:

1. runs `node fetch-races.js`
2. checks if `races.json` changed
3. if it did, commits and pushes to main
4. github pages redeploys automatically

Claude routines are scheduled agents in [Claude Code](https://www.anthropic.com/claude-code) — you describe the task in plain language and set a schedule, and claude runs it autonomously on a cron. set one up with `/schedule` in Claude Code.

---

## if a race is missing

some activities don't get picked up because the name doesn't mention the race type. just add it to `races.json` directly:

```json
{
  "name": "Some Race Name",
  "date": "2024-04-07",
  "category": "half",
  "distanceKm": 21.1,
  "durationSeconds": 7530,
  "pacePerKm": "5:56",
  "stravaId": 0
}
```

valid categories: `5k`, `10k`, `half`, `marathon`.

---

## built with [Entire](https://entire.io)

this project was built with Claude Code and [Entire](https://entire.io) — a tool that captures AI agent sessions alongside your git commits so you can see the reasoning behind every change. every commit in this repo has the full conversation that produced it attached to the git history.

```bash
# install entire
curl -fsSL https://entire.io/install.sh | sh
```
