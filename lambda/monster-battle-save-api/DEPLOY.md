# Deploy Monster Battle save API (Lambda)

The live API must include **every** file in this folder. A common failure mode is uploading only `index.js` after adding `profileLookup.js` or `sanitizeProfileItem.js` — API Gateway then returns **500** on `GET /players` and the game shows **Could not fetch cloud players**.

## Package (from repo root)

```bash
cd lambda/monster-battle-save-api
npm install --omit=dev
cd ..
node ../scripts/package-save-api-lambda.js
```

Upload `lambda/monster-battle-save-api/dist/save-api.zip` to the Lambda function that backs API Gateway (`v9er9k1okb…/prod`).

Required files in the zip:

- `index.js`
- `profileLookup.js`
- `sanitizeProfileItem.js`
- `playerKeyHash.js`
- `node_modules/` (AWS SDK)

## Verify after deploy

```bash
curl -H "Origin: https://monster-dice-battle.rtkhfaith.com" \
  "https://YOUR_API/prod/players"
```

Expect **200** and JSON `{ "players": [ ... ] }`. If you see `{"message":"Internal Server Error"}` the zip is incomplete or DynamoDB permissions failed — check CloudWatch logs for `[save-api]`.

## Web app

Set `VITE_SAVE_API_URL` in Amplify to the same API base (no trailing slash), redeploy. `public/save-config.json` is written at build time from that env var.
