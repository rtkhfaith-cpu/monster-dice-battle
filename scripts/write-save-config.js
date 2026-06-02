/**
 * Writes public/save-config.json for Amplify runtime (and local export).
 * Run before `expo export` — uses VITE_SAVE_API_URL from the environment.
 */
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'public');
const outFile = path.join(outDir, 'save-config.json');
const CANONICAL = 'https://monster-dice.rtkhfaith.com';
const envUrl = String(process.env.VITE_SAVE_API_URL || CANONICAL).trim().replace(/\/+$/, '');
let existingUrl = '';

try {
  existingUrl = JSON.parse(fs.readFileSync(outFile, 'utf8'))?.saveApiUrl || '';
} catch {
  existingUrl = '';
}

const url = envUrl || String(existingUrl).trim().replace(/\/+$/, '');

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify({ saveApiUrl: url }, null, 2)}\n`, 'utf8');

if (url.length > 5) {
  console.log('[save-config] wrote', outFile, '→', url);
} else {
  console.warn(
    '[save-config] VITE_SAVE_API_URL is empty — cloud save will be device-only until you set it in Amplify env vars and redeploy.',
  );
}
