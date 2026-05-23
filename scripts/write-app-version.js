/**
 * Sync app.version.json → public/version.json + utils/bakedAppVersion.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sourcePath = path.join(root, 'app.version.json');
const version = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

if (!version.version || typeof version.build !== 'number') {
  console.error('app.version.json must include "version" (string) and "build" (number).');
  process.exit(1);
}

fs.writeFileSync(path.join(root, 'public', 'version.json'), `${JSON.stringify(version, null, 2)}\n`);

const baked = `/** Auto-generated — bump app.version.json and run npm run prebuild. */
export const BAKED_APP_VERSION = ${JSON.stringify(version, null, 2)};
`;
fs.writeFileSync(path.join(root, 'utils', 'bakedAppVersion.js'), baked);

console.log(`[app-version] ${version.version} (build ${version.build})`);
