/**
 * Writes public/socket-config.json for Amplify runtime (and local export).
 * Run before `expo export` — uses VITE_SOCKET_SERVER_URL from the environment.
 */
const fs = require('fs');
const path = require('path');

const CANONICAL = 'https://monster-dice.rtkhfaith.com';
const url = String(process.env.VITE_SOCKET_SERVER_URL || CANONICAL).trim().replace(/\/+$/, '');
const outDir = path.join(__dirname, '..', 'public');
const outFile = path.join(outDir, 'socket-config.json');

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify({ socketUrl: url }, null, 2)}\n`, 'utf8');

if (url.length > 5) {
  console.log('[socket-config] wrote', outFile, '→', url);
} else {
  console.warn('[socket-config] VITE_SOCKET_SERVER_URL is empty — multiplayer will be offline until you set it in Amplify env vars and redeploy.');
}
