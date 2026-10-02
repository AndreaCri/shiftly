/* Shiftly - uso senza connessione.
   Pagina principale: prima la rete (così gli aggiornamenti arrivano), se manca la rete usa la copia salvata.
   Icone: copia salvata. I dati dell'utente non passano da qui. */
const VERSION = "v14";
const CACHE = "shiftly-" + VERSION;
const PRECACHE = ["./", "./index.html", "./manifest.webmanifest",
  "./icon-180.png", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(PRECACHE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => (k.indexOf("shiftly-") === 0 || k.indexOf("turnigtt-") === 0) && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
function networkFirst(req) {
  return new Promise(resolve => {
    let done = false;
    const fallback = () => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("./index.html")).then(r => { if (!done) { done = true; resolve(r || Response.error()); } });
    const timer = setTimeout(fallback, 5000);
    fetch(req, { cache: "no-cache" }).then(res => {
      clearTimeout(timer);
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      if (!done) { done = true; resolve(res); }
    }).catch(() => { clearTimeout(timer); fallback(); });
  });
}
function cacheFirst(req) {
  return caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }));
}
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const isPage = req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("/index.html");
  e.respondWith(isPage ? networkFirst(req) : cacheFirst(req));
});
