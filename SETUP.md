# AetixCloud — Integration Setup Guide

সব API key `config.js` ফাইলে দাও।

---

## 1. Firebase (আসল Database)

1. https://console.firebase.google.com এ প্রজেক্ট তৈরি করো
2. **Build → Firestore Database → Create** (test mode শুরুতে OK)
3. Project Settings → Your apps → Web app অ্যাড করো
4. Config object কপি করে `config.js` এ দাও:

```js
firebase: {
    enabled: true,
    apiKey: "...",
    authDomain: "...",
    projectId: "...",
    storageBucket: "...",
    messagingSenderId: "...",
    appId: "..."
}
```

Firestore rules (production এ শক্ত করো):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // dev only
    }
  }
}
```

`enabled: true` না করলে localStorage ব্যবহার হবে।

---

## 2. EmailJS (Real Email)

1. https://www.emailjs.com এ সাইনআপ
2. **Email Services** → Gmail/Outlook কানেক্ট
3. **Email Templates** তৈরি করো:
   - `template_order_placed` — variables: `order_id`, `customer`, `customer_email`, `plans`, `amount`, `method`, `txid`, `to_email`
   - `template_order_approved` — variables: `order_id`, `customer`, `plans`, `amount`, `server_info`, `to_email`
4. Account → Public Key কপি করো
5. `config.js`:

```js
emailjs: {
    enabled: true,
    publicKey: "...",
    serviceId: "service_xxx",
    templateOrderPlaced: "template_order_placed",
    templateOrderApproved: "template_order_approved",
    adminEmail: "tomail@gmail.com"
}
```

---

## 3. Crisp Live Chat

1. https://crisp.chat এ সাইনআপ
2. Website settings → Setup → Website ID কপি
3. `config.js`:

```js
crisp: {
    enabled: true,
    websiteId: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

সাইটের নিচে চ্যাট বাবল আসবে।

---

## 4. Discord Webhook

1. Discord Server → Channel Settings → Integrations → Webhooks → New
2. URL কপি করে `config.js`:

```js
discordWebhook: "https://discord.com/api/webhooks/..."
```

নতুন অর্ডার এলে চ্যানেলে এমবেড পাঠাবে।

---

## 5. Pterodactyl (Auto Server Create)

⚠️ **সতর্কতা:** API key frontend এ রাখা insecure।  
Production এ Cloudflare Worker / Node backend দিয়ে proxy করো।

1. Panel → Application API → Create API key
2. Nest/Egg/Location ID জানো (Minecraft egg)
3. `config.js`:

```js
pterodactyl: {
    enabled: true,
    panelUrl: "https://panel.yourdomain.com",
    apiKey: "ptlc_...",
    nestId: 1,
    eggId: 5,
    locationId: 1
}
```

Admin থেকে Order **Approve** করলে server create API কল হবে।

CORS issue হতে পারে — panel এ CORS allow বা backend proxy লাগবে।

---

## 6. bKash / Nagad API

অফিসিয়াল Merchant API **server-side** credentials চায় (Client ID/Secret)।  
Browser থেকে সরাসরি কল করা যায় না (CORS + security)।

**অপশন:**
- এখনকার মতো TxID ম্যানুয়াল ভেরিফাই (Admin Approve)
- অথবা Backend (Node/PHP) বানিয়ে:
  - bKash Tokenized Checkout / Create Payment
  - Callback URL এ verify করে order auto-approve

Docs:
- bKash: https://developer.bka.sh
- Nagad: merchant portal docs

---

## 7. Admin Analytics

Admin প্যানেলে Chart.js দিয়ে:
- Monthly Revenue (line)
- Order Status (doughnut)
- Popular Plans (bar)

ডাটা localStorage / Firebase orders থেকে আসে — আলাদা setup লাগে না।

---

## Quick checklist

| Service        | File       | `enabled: true` | Notes                    |
|----------------|------------|-----------------|--------------------------|
| Firebase       | config.js  | হ্যাঁ           | Firestore                  |
| EmailJS        | config.js  | হ্যাঁ           | ২টা template             |
| Crisp          | config.js  | হ্যাঁ           | Website ID               |
| Discord        | config.js  | URL দাও         | Webhook URL              |
| Pterodactyl    | config.js  | হ্যাঁ           | Backend recommended      |
| bKash/Nagad    | —          | Backend লাগে    | Manual TxID এখন কাজ করে  |

`PAY_NUMBER` ও `adminPassword` ও `config.js` এ আছে।
