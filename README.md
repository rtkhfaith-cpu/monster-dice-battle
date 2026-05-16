# Monster Dice Battle — local save & optional online server

## Offline play (Expo)

```bash
cd monster-dice-battle
npm install
npm run start
```

- All progression (coins, owned monsters, levels, EXP, cosmetics, equipped rows) persists with AsyncStorage key **`MONSTER_DICE_BATTLE_SAVE`**.
- Legacy cosmetic save `monster_dice_battle_v2` is migrated once into the new file.
- **1 Player vs AI**: CPU team is scaled to ~**+10%** “power score” vs your monster (adjust with guest `meta.difficultyMode` / `meta.aiBias` in `utils/gameStorage.js`). Streak-based nudges tweak `aiBias` after wins/losses.
- **2 Players Same Device**: unchanged flow, now using picked owned monsters instead of random stat rolls.

## Monster Mart & balance

Templates, rarity, roles, base stats, and growth live in **`utils/monsterTemplates.js`**. Combat stats are built in **`utils/statsCalc.js`**; runtime fighters use **`utils/fighterFromOwned.js`**.

## Online multiplayer (optional)

Uses **Socket.io**. This is a **stub lobby** (`server/index.js`) so the app never crashes when the server is missing.

### Env (Amplify web)

In **Amplify Console → Environment variables**, set:

`VITE_SOCKET_SERVER_URL` — your public Socket.io server URL (e.g. `https://api.yourgame.com`)

The client reads `import.meta.env.VITE_SOCKET_SERVER_URL` (inlined at build time via `babel.config.js`). Redeploy after changing the variable.

### Run app + server together

```bash
npm run dev:all
```

Or separately:

```bash
npm run server    # listens on 0.0.0.0:PORT (default 3000)
npm run start     # Expo
```

### AWS Lightsail (later)

Deploy `server/index.js` to a small Node VM, open TCP **3000** (or set `PORT`), set Amplify `VITE_SOCKET_SERVER_URL` to that server’s public URL.

## Profiles & PIN API (saved, UI optional)

`utils/gameStorage.js` exports **`createPlayer`**, **`updatePlayer`**, **`deletePlayer`**, **`verifyPlayerPin`**, etc. The current UI uses the **guest** wallet by default (`session.activeProfileId === null`). You can wire a profile picker without changing storage layout.
