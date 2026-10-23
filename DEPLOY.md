# AetixCloud — Deploy Guide (Frontend + Backend + Domain)

## Architecture

```
Browser (Netlify/Vercel)
    │
    ├── Static HTML/CSS/JS
    │
    └── HTTPS API calls
            │
            ▼
    Cloudflare Worker (aetixcloud-api)
            ├── bKash Tokenized API
            ├── Pterodactyl Application API
            └── Discord Webhook
```

Secrets থাকবে শুধু Worker এ — frontend এ API key যাবে না।

---

## 1. Backend — Cloudflare Worker

### Install
```bash
cd backend
npm install
npx wrangler login
```

### Secrets
```bash
npx wrangler secret put BKASH_APP_KEY
npx wrangler secret put BKASH_APP_SECRET
npx wrangler secret put BKASH_USERNAME
npx wrangler secret put BKASH_PASSWORD
npx wrangler secret put BKASH_BASE_URL
# Sandbox: https://tokenized.sandbox.bka.sh/v1.2.0-beta
# Live:    https://tokenized.pay.bka.sh/v1.2.0-beta

npx wrangler secret put PTERO_PANEL_URL
npx wrangler secret put PTERO_API_KEY
npx wrangler secret put PTERO_USER_ID
npx wrangler secret put PTERO_EGG_ID
npx wrangler secret put PTERO_LOCATION_ID

npx wrangler secret put ADMIN_API_KEY
# random long string — same value in config.js adminApiKey

npx wrangler secret put DISCORD_WEBHOOK
```

### Frontend URL (vars)
`wrangler.toml` এ:
```toml
FRONTEND_URL = "https://your-site.netlify.app"
```

### Deploy
```bash
npx wrangler deploy
```
পাবে: `https://aetixcloud-api.<subdomain>.workers.dev`

### Test
```bash
curl https://aetixcloud-api.xxx.workers.dev/health
```

---

## 2. Frontend — Netlify

1. GitHub এ repo push করো (aetixcloud ফোল্ডার)
2. https://app.netlify.com → Add new site → Import from Git
3. Publish directory: `.` (root যেখানে index.html)
4. Deploy

অথবা drag & drop: Netlify → Sites → Deploy manually

### config.js আপডেট (deploy এর আগে)
```js
apiBase: "https://aetixcloud-api.xxx.workers.dev",
adminApiKey: "same-as-ADMIN_API_KEY-secret",
payNumber: "01XXXXXXXXX",
```

---

## 3. Frontend — Vercel

```bash
npm i -g vercel
cd aetixcloud
vercel
```

Root এ `index.html` থাকলেই কাজ করবে।

---

## 4. Frontend — cPanel / traditional hosting

1. সব ফাইল `public_html/` এ আপলোড
2. SSL: cPanel → Let's Encrypt / AutoSSL
3. `config.js` এ `apiBase` সেট করো

---

## 5. Custom Domain + SSL

### Netlify
- Domain settings → Add custom domain → DNS:
  - `A` → Netlify IP অথবা
  - `CNAME` → `your-site.netlify.app`
- SSL অটো (Let's Encrypt)

### Cloudflare (domain proxy)
1. Domain Cloudflare এ add করো
2. Netlify/Vercel এর জন্য CNAME
3. Worker এর জন্য:
   ```bash
   npx wrangler deploy
   # routes in wrangler.toml:
   # routes = [{ pattern = "api.yourdomain.com/*", zone_name = "yourdomain.com" }]
   ```
4. `config.js` → `apiBase: "https://api.yourdomain.com"`

---

## 6. bKash Merchant

1. https://pgw-docs.bka.sh বা merchant portal
2. Tokenized Checkout credentials নাও
3. Sandbox দিয়ে টেস্ট → তারপর live BASE_URL
4. Callback URL Worker handle করে (`/api/bkash/callback`)

Flow:
1. User Cart → **bKash Auto Checkout**
2. Frontend → `POST /api/bkash/create`
3. Redirect → bKash page
4. Pay → callback → Worker execute → redirect cart?bkash=success
5. Order saved as pending → Admin approve → Pterodactyl server

---

## 7. Pterodactyl

1. Panel → Application API → Create key (servers write)
2. Note: User ID, Egg ID (Minecraft), Location ID
3. Worker secrets এ সেট করো
4. Admin → Approve order → `POST /api/orders/approve` → server create

CORS: Worker থেকে panel call হয় (server-side) — browser CORS সমস্যা নেই।

---

## 8. Checklist

- [ ] Worker deployed + `/health` OK
- [ ] Secrets set (bKash / Ptero / Admin key)
- [ ] `config.js` → `apiBase` + `adminApiKey`
- [ ] Frontend on Netlify/Vercel/cPanel
- [ ] Custom domain + HTTPS
- [ ] Test: Add to cart → bKash Auto (sandbox)
- [ ] Test: Admin approve → server on panel

---

## Local dev

```bash
cd backend && npx wrangler dev
# API at http://127.0.0.1:8787
```

`config.js`:
```js
apiBase: "http://127.0.0.1:8787",
```

Frontend: Live Server / `npx serve .`
