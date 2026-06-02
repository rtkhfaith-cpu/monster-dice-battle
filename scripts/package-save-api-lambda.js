/**
 * Builds lambda/monster-battle-save-api/dist/save-api.zip for AWS upload.
 * Run from repo root after: cd lambda/monster-battle-save-api && npm install --omit=dev
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const apiDir = path.join(__dirname, '..', 'lambda', 'monster-battle-save-api');
const distDir = path.join(apiDir, 'dist');
const zipPath = path.join(distDir, 'save-api.zip');

const required = ['index.js', 'profileLookup.js', 'sanitizeProfileItem.js', 'playerKeyHash.js'];
for (const f of required) {
  const p = path.join(apiDir, f);
  if (!fs.existsSync(p)) {
    console.error('[package-save-api] missing', p);
    process.exit(1);
  }
}
if (!fs.existsSync(path.join(apiDir, 'node_modules'))) {
  console.error('[package-save-api] run: cd lambda/monster-battle-save-api && npm install --omit=dev');
  process.exit(1);
}

fs.mkdirSync(distDir, { recursive: true });
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

const isWin = process.platform === 'win32';
if (isWin) {
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${apiDir}\\index.js','${apiDir}\\profileLookup.js','${apiDir}\\sanitizeProfileItem.js','${apiDir}\\playerKeyHash.js','${apiDir}\\node_modules' -DestinationPath '${zipPath}' -Force"`,
    { stdio: 'inherit' },
  );
} else {
  execSync(
    `cd "${apiDir}" && zip -r "${zipPath}" index.js profileLookup.js sanitizeProfileItem.js playerKeyHash.js node_modules`,
    { stdio: 'inherit', shell: true },
  );
}

console.log('[package-save-api] wrote', zipPath);
