# Public `/robots.txt` for private hosts

## Problem

Amplify **branch Basic Auth** returns `401` for every path, including `/robots.txt`, and Amplify has no path exception. CloudFront also cannot use an Amplify CloudFront hostname as an origin (CF→CF `403 Bad request`).

## Solution

Stack / distribution **`EVL1A0RG2G75I`** (`d6r1yxtztin85.cloudfront.net`):

| Host | Behavior |
|------|----------|
| `rtkhfaith.com` / `www.rtkhfaith.com` | Edge Function serves `/robots.txt` (`Disallow: /`). Other paths → `404`. |
| `monster-dice-battle.rtkhfaith.com` | Edge Function serves public `/robots.txt`. All other paths require **CloudFront Basic Auth**, then S3 (`monster-dice-battle-web-672755423057`). |

CloudFront Function: `rtkhfaith-robots-public-bypass` (viewer-request).

Amplify app `d4ud0u4vg91jy` remains for builds / `mb.rtkhfaith.com` (its own Basic Auth unchanged). The long hostname is served from S3 via this distribution.

## Credentials

Local file (gitignored):

`infra/robots-public/.basic-auth-credentials.txt`

Username is `family`. Rotate by regenerating the expected `Authorization` value in the CloudFront Function and republishing.

## Files

| Path | Purpose |
|------|---------|
| `public/robots.txt` | Source Disallow body (also synced to S3) |
| `public/_redirects` | SPA rewrite excludes `.txt` |
| `cloudfront-function.js` | Function source with `__BASIC_AUTH_B64__` placeholder |
| `template.yaml` | Initial cert + DNS scaffolding (origin evolved to S3) |

## External checks

```powershell
curl.exe -sI https://rtkhfaith.com/robots.txt
curl.exe -sI https://monster-dice-battle.rtkhfaith.com/robots.txt
curl.exe -sI https://monster-dice-battle.rtkhfaith.com/   # 401
```
