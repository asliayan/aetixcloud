# অন্য ইউজারের অর্ডার Admin এ দেখতে

## উপায় ১ — Netlify Git Deploy (সবচেয়ে ভালো)

Drag & drop দিলে Functions চলে না। GitHub দিয়ে deploy করো:

1. GitHub এ নতুন repo বানাও
2. সব ফাইল push করো
3. Netlify → Add new site → Import from Git → সেই repo
4. Deploy

এরপর:
- কেউ অর্ডার করলে → `/.netlify/functions/orders` এ সেভ
- Admin panel → সব অর্ডার দেখাবে (যেকোনো ডিভাইস)

## উপায় ২ — crudcrud.com (Drag & drop চললেও কাজ করে)

1. https://crudcrud.com এ যাও
2. **Create a new endpoint** চাপো
3. যে URL পাবে তার শেষে `/orders` যোগ করো  
   উদাহরণ: `https://crudcrud.com/api/abc123xyz/orders`
4. `config.js` এ দাও:

```js
ordersApi: "https://crudcrud.com/api/abc123xyz/orders",
useNetlifyOrders: false,
```

5. আবার deploy করো

**নোট:** crudcrud free endpoint ~২৪ ঘণ্টা পর রিসেট হতে পারে। নতুন endpoint বানিয়ে আবার বসাতে হতে পারে।

## উপায় ৩ — Discord (দ্রুত নোটিফিকেশন)

`config.js`:
```js
discordWebhook: "https://discord.com/api/webhooks/...."
```

অর্ডার হলে Discord এ মেসেজ যাবে।
