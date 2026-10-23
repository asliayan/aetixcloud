# উপায় ১ — GitHub + Netlify (অন্য ইউজারের অর্ডার Admin এ আসবে)

## ধাপ ১: GitHub এ আপলোড
1. https://github.com → Login
2. New repository → নাম: `aetixcloud` → Create
3. সব ফাইল (index.html, netlify/ ফোল্ডার সহ) upload করো
   - অথবা GitHub Desktop / git push ব্যবহার করো

## ধাপ ২: Netlify এ Git থেকে Deploy
1. https://app.netlify.com → Login
2. **Add new site** → **Import an existing project**
3. GitHub → `aetixcloud` repo সিলেক্ট
4. Build settings:
   - Build command: (খালি রাখো)
   - Publish directory: `.`  (বা যেখানে index.html আছে)
5. **Deploy site** চাপো

## ধাপ ৩: চেক করো
Deploy শেষ হলে:
- সাইট URL খোলো
- একটা টেস্ট অর্ডার দাও
- `/admin.html` → password: `aetix2026`
- অর্ডার দেখা যাবে

API টেস্ট (ব্রাউজারে):
`https://YOUR-SITE.netlify.app/.netlify/functions/orders`

JSON আসলে Functions কাজ করছে ✅

## গুরুত্বপূর্ণ
❌ Drag & drop দিলে Functions চলবে না  
✅ শুধু GitHub/Git import দিলেই অন্য ইউজারের অর্ডার Admin এ আসবে
