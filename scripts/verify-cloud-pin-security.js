#!/usr/bin/env node
/**
 * Quick check that the deployed save API rejects wrong PINs.
 * Usage: node scripts/verify-cloud-pin-security.js <API_BASE_URL> <PROFILE_ID>
 */
const base = String(process.argv[2] || '').replace(/\/+$/, '');
const profileID = String(process.argv[3] || '').trim();

if (!base || !profileID) {
  console.error('Usage: node scripts/verify-cloud-pin-security.js <API_BASE_URL> <PROFILE_ID>');
  process.exit(1);
}

async function post(path, body) {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

async function del(profileId, playerKey) {
  const res = await fetch(`${base}/save/${encodeURIComponent(profileId)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ playerKey }),
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

async function main() {
  const wrong = await post('/login', { profileID, playerKey: '0000' });
  const okWrong = wrong.status === 401;
  console.log('POST /login wrong PIN:', wrong.status, wrong.json?.error || wrong.json);
  console.log(okWrong ? 'PASS' : 'FAIL — expected HTTP 401');

  const delWrong = await del(profileID, '0000');
  const okDel = delWrong.status === 401;
  console.log('DELETE wrong PIN:', delWrong.status, delWrong.json?.error || delWrong.json);
  console.log(okDel ? 'PASS' : 'FAIL — expected HTTP 401');

  process.exit(okWrong && okDel ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
