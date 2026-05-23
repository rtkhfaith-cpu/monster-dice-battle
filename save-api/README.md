# Cloud save — single-device login

When a player logs in, the client sends `deviceId` and `sessionToken` on `POST /login`.
The API must store `activeSession` on the profile and return the same token.

On `POST /save`, reject uploads when `sessionToken` (or `activeSession.sessionToken`)
does not match the stored `activeSession.sessionToken` — respond with **409** and
`{ "error": "SESSION_SUPERSEDED" }`.

Reference logic: `save-api/sessionHandlers.js`

Without this server check, the game still compares sessions client-side before upload,
but a modified client could bypass that. Deploy the API change for full protection.
