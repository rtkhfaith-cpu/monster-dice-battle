# Ubuntu + Nginx + Socket.io — fix **502 Bad Gateway**

A **502** means **nginx is running** but **nothing healthy is listening** on the upstream (usually `http://127.0.0.1:3000`).

## 1. On the server — is Node running?

```bash
curl -s http://127.0.0.1:3000/health
```

**Expected:** `{"ok":true,"service":"monster-dice-battle-socket",...}`

If this fails, fix Node first (nginx cannot help until this works).

```bash
cd /var/www/monster-dice-battle/server   # your path
npm ci --omit=dev
PORT=3000 node index.js
```

Optional — `syncProfile` can persist cloud saves when the client sends `cloudDocument` + `playerKey`:

```bash
# Preferred: proxy to API Gateway (same URL as VITE_SAVE_API_URL)
SAVE_API_URL=https://YOUR_API_GATEWAY/prod node index.js

# Or direct DynamoDB (Lambda IAM role / AWS credentials on the host)
TABLE_NAME=MonsterBattleSaves node index.js
```

You should see: `Server listening on 3000`

## 2. Run Node as a service (recommended)

```bash
sudo cp server/deploy/monster-battle.socket.service /etc/systemd/system/
# Edit paths/User if your install dir differs:
sudo nano /etc/systemd/system/monster-battle.socket.service

sudo systemctl daemon-reload
sudo systemctl enable monster-battle.socket
sudo systemctl start monster-battle.socket
sudo systemctl status monster-battle.socket
```

## 3. Nginx config (Socket.io needs WebSocket headers)

```bash
# In /etc/nginx/nginx.conf inside http { } add once if missing:
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

sudo cp server/deploy/nginx-socket.conf /etc/nginx/sites-available/monster-socket
sudo nano /etc/nginx/sites-available/monster-socket   # set server_name
sudo ln -sf /etc/nginx/sites-available/monster-socket /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**Important:** `proxy_pass` must point to the same port as Node (`3000` by default):

```nginx
proxy_pass http://127.0.0.1:3000;
```

Wrong port → **502**.

## 4. HTTPS (required if Amplify app is HTTPS)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d YOUR_DOMAIN
```

Then set Amplify:

`VITE_SOCKET_SERVER_URL=https://YOUR_DOMAIN`

Redeploy Amplify after changing the variable.

## 5. Firewall

```bash
sudo ufw allow 80
sudo ufw allow 443
# Do NOT need to expose 3000 publicly if nginx proxies on 80/443
```

## 6. Verify from your PC

```bash
curl -s https://YOUR_DOMAIN/health
```

Must return JSON with `"ok":true`. Then multiplayer in the game should connect.

## Common mistakes

| Symptom | Cause |
|--------|--------|
| 502 on `/health` | Node not running or wrong `proxy_pass` port |
| 502 only on game | WebSocket map missing in nginx |
| Browser “HTTPS” error | Amplify HTTPS + server HTTP only |
| Empty socket URL in game | `VITE_SOCKET_SERVER_URL` not set on Amplify build |
