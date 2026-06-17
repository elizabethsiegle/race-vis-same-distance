const https = require('https');
const http = require('http');
const url = require('url');
const fs = require('fs');

function loadEnv() {
  const text = fs.readFileSync('.env', 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const eq = line.indexOf('=');
    if (eq > 0) env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return env;
}

function post(hostname, path, body) {
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

async function main() {
  const env = loadEnv();
  const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET } = env;

  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
    console.error('Missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET in .env');
    process.exit(1);
  }

  const authUrl =
    `https://www.strava.com/oauth/authorize` +
    `?client_id=${STRAVA_CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=http://localhost:8080/callback` +
    `&approval_prompt=force` +
    `&scope=activity:read_all`;

  console.log('\nOpen this URL in your browser:\n');
  console.log(authUrl);
  console.log('\nWaiting for callback on http://localhost:8080/callback ...\n');

  const code = await new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const { query } = url.parse(req.url, true);
      res.end('<html><body><h2>Authorized! You can close this tab.</h2></body></html>');
      server.close();
      resolve(query.code);
    });
    server.listen(8080);
  });

  const tokens = await post('www.strava.com', '/oauth/token', {
    client_id: STRAVA_CLIENT_ID,
    client_secret: STRAVA_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
  });

  if (!tokens.refresh_token) {
    console.error('Token exchange failed:', JSON.stringify(tokens, null, 2));
    process.exit(1);
  }

  console.log('\nAdd this line to your .env:\n');
  console.log(`STRAVA_REFRESH_TOKEN=${tokens.refresh_token}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
