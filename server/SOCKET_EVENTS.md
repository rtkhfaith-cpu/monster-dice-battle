# Socket.io event map (client ↔ `server/index.js`)

Online multiplayer uses **Socket.io only for rooms and battles**. Cloud player list, login, load, save, and delete use **HTTPS** (`src/services/cloudSaveService.js` → API Gateway Lambda → DynamoDB). Do not add those routes to the socket server unless you intentionally duplicate the API.

## Client → server (`socket.emit`)

| Event | Handler | Ack? | Purpose |
|--------|---------|------|---------|
| `rejoinRoom` | `socket.on('rejoinRoom')` | Yes | Reconnect to an existing room |
| `requestRoomState` | `socket.on('requestRoomState')` | Yes | Refresh lobby snapshot |
| `createRoom` | `socket.on('createRoom')` | Yes | Host a new room |
| `joinRoom` | `socket.on('joinRoom')` | Yes | Join by room code |
| `syncProfile` | `registerSyncProfileHandler` | **Yes** | Lobby fighter display; optional `cloudDocument` + `playerKey` → DynamoDB |
| `battleAction` | `socket.on('battleAction')` | Yes | Online battle turn |
| `leaveRoom` | `socket.on('leaveRoom')` | No | Leave room (fire-and-forget) |

## Cloud save (REST, not socket)

| App API | HTTP | Lambda route |
|---------|------|----------------|
| `listCloudPlayers()` | `GET /players` | `handleListPlayers` |
| `loginCloudProfile()` | `POST /login` | `handleLogin` |
| `loadCloudProfile()` / recall | `GET /save/{profileID}` | `handleGetSave` |
| `saveCloudProfile()` / `syncProfileToCloud()` | `POST /save` | `handlePostSave` |
| `deleteCloudProfile()` | `DELETE /save/{profileID}` or `POST /save/delete` | `handleDeleteSave` |

Configure the web app with `VITE_SAVE_API_URL` / `public/save-config.json`.

## `syncProfile` payload

**Lobby (always):** `name`, `profileId`, `ownedMonsterId`, `monsterName`, `fighter`, `roomCode`

**Optional cloud persist:** `cloudDocument` (from `toCloudProfile`) + `playerKey` (4 digits, never logged on server)

Server env for cloud persist on socket host:

- `SAVE_API_URL` — preferred; proxies to `POST /save` on API Gateway
- Or AWS credentials + `TABLE_NAME` — direct DynamoDB Put (same sanitizer as Lambda)

## Server → client (`io.emit` / `socket.emit`)

`serverStatus`, `roomUpdate`, `opponentJoined`, `opponentDisconnected`, `battleStarted`, `battle_started`, `battleUpdate`, `battle_state_updated`, `turn_changed`, `action_result`, `battleEnded`, `errorMessage`
