/* AetixCloud Config — edit these values */
const AETIX_CONFIG = {
  apiBase: "",
  adminApiKey: "",
  payNumber: "01XXXXXXXXX",
  adminPassword: "aetix2026",
  discordWebhook: "",
  // Optional shared orders API (so admin sees orders from any device)
  // Free option: https://crudcrud.com → Create → copy endpoint + "/orders"
  // Example: "https://crudcrud.com/api/YOUR_UNIQUE_KEY/orders"
  ordersApi: "",
  // Leave empty — auto uses Netlify Function: /.netlify/functions/orders
  // After deploy to Netlify, ALL users' orders appear in admin automatically.
  useNetlifyOrders: true,
  firebase: { enabled: false, apiKey: "", authDomain: "", projectId: "", storageBucket: "", messagingSenderId: "", appId: "" },
  emailjs: { enabled: false, publicKey: "", serviceId: "", templateOrderPlaced: "template_order_placed", templateOrderApproved: "template_order_approved", adminEmail: "" },
  crisp: { enabled: false, websiteId: "" },
  pterodactyl: { enabled: false, panelUrl: "", apiKey: "", nestId: 1, eggId: 1, locationId: 1 }
};

const COUPONS = {
  WELCOME10: { type: "percent", value: 10 },
  SAVE50: { type: "fixed", value: 50 },
  PRO20: { type: "percent", value: 20 },
  AETIX100: { type: "fixed", value: 100 }
};

const PLAN_DETAILS = {
  Starter:  { price: 299,  cpu: "100%", ram: "1 GB",  disk: "10 GB",  backup: "1",     ddos: "Standard", players: "~5" },
  Basic:    { price: 399,  cpu: "100%", ram: "2 GB",  disk: "15 GB",  backup: "1",     ddos: "Standard", players: "~10" },
  Pro:      { price: 599,  cpu: "100%", ram: "4 GB",  disk: "30 GB",  backup: "Daily", ddos: "Standard", players: "~20" },
  Plus:     { price: 799,  cpu: "150%", ram: "6 GB",  disk: "45 GB",  backup: "Daily", ddos: "Standard", players: "~30" },
  Premium:  { price: 999,  cpu: "200%", ram: "8 GB",  disk: "60 GB",  backup: "Daily", ddos: "Advanced", players: "~40" },
  Elite:    { price: 1299, cpu: "250%", ram: "12 GB", disk: "90 GB",  backup: "Daily", ddos: "Advanced", players: "~60" },
  Ultimate: { price: 1799, cpu: "300%", ram: "16 GB", disk: "120 GB", backup: "Hourly",ddos: "Advanced", players: "~80" },
  Extreme:  { price: 2999, cpu: "400%", ram: "32 GB", disk: "200 GB", backup: "Hourly",ddos: "Advanced", players: "150+" }
};
