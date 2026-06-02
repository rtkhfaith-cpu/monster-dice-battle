# Socket.io event map

## Important: “Could not fetch cloud players” is **not** Socket.io

That message comes from **`fetch(GET …/players)`** via `listCloudPlayers()` in `src/services/cloudSaveService.js` → API Gateway → Lambda. It will **never** appear in Nginx `/socket.io` logs or PM2 socket connect lines.

`{"message":"Internal Server Error"}` on `/players` is an **HTTP API Gateway** response, not a socket ack.

---

## Client → server (`socket.emit` from `utils/onlineSocketManager.js`)

| Event | Handler | Ack | Notes |
|--------|---------|-----|--------|
| `rejoinRoom` | `bindSocketHandler` in `index.js` | Yes `{ ok, roomCode, room }` | |
| `requestRoomState` | `bindSocketHandler` | Yes `{ ok, room }` | |
| `createRoom` | `bindSocketHandler` | Yes `{ ok, roomCode, room }` | |
| `joinRoom` | `bindSocketHandler` | Yes `{ ok, roomCode, room }` | |
| `syncProfile` | `registerSyncProfileHandler` | Yes `{ ok, cloud?, error?, details? }` | Lobby + optional cloud save |
| `battleAction` | `bindSocketHandler` | Yes `{ ok }` or `{ ok: false, error }` | |
| `leaveRoom` | `bindSocketHandler` | Yes `{ ok }` | |

**Not implemented on socket (use HTTPS):**

| App need | Client | Transport |
|----------|--------|-----------|
| List cloud players | `listCloudPlayers()` | `GET /players` |
| Login | `loginCloudProfile()` | `POST /login` |
| Load profile | `GET /save/{id}` | fetch |
| Save profile | `saveCloudProfile()` / `syncProfileToCloud()` | `POST /save` |
| Delete player | `deleteCloudProfile()` | `DELETE` or `POST /save/delete` |

If the client emits unknown events (e.g. `listCloudPlayers`), `registerUnknownEventGuard` logs a warning and acks with `UNKNOWN_SOCKET_EVENT`.

---

## Server logging (PM2)

Every handled event logs:

- `[socket] <event> received` — `socketId`, `profileId`, `roomCode`
- `[socket] <event> error` — `errorName`, `errorMessage`, `stack`, `awsMetadata` (DynamoDB)
- `[syncProfile] DynamoDB Put started/success` — `table`, `operation`, `profileID` (no PIN)

---

## `syncProfile` cloud persist

When payload includes `cloudDocument` + 4-digit `playerKey`:

1. `SAVE_API_URL` set → `POST {SAVE_API_URL}/save`
2. Else → DynamoDB `PutItem` on `TABLE_NAME` (default `MonsterBattleSaves`)

Env on socket host: see `server/deploy/DEPLOY-UBUNTU.md`.

---

## Server → client

`serverStatus`, `roomUpdate`, `opponentJoined`, `opponentDisconnected`, `battleStarted`, `battle_started`, `battleUpdate`, `battle_state_updated`, `turn_changed`, `action_result`, `battleEnded`, `errorMessage`

---

## Frontend ack failures

Browser console: `[online-socket] ack failure` with `event`, `error`, `details`, `errorName`, `awsMetadata`.
