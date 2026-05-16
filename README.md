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

### Env (Expo)

Set:

`EXPO_PUBLIC_SOCKET_SERVER_URL` — e.g. `http://192.168.1.10:3000` (LAN IP of the machine running the server)

Restart Expo after changing env. The value is injected via **`app.config.js`** → `expo.extra.socketServerUrl`.

> This project is **Expo / React Native**, not Vite. Use `EXPO_PUBLIC_*`, not `VITE_*`.

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

Deploy `server/index.js` to a small Node VM, open TCP **3000** (or set `PORT`), point `EXPO_PUBLIC_SOCKET_SERVER_URL` at `http://YOUR_IP:3000`.

## Profiles & PIN API (saved, UI optional)

`utils/gameStorage.js` exports **`createPlayer`**, **`updatePlayer`**, **`deletePlayer`**, **`verifyPlayerPin`**, etc. The current UI uses the **guest** wallet by default (`session.activeProfileId === null`). You can wire a profile picker without changing storage layout.
