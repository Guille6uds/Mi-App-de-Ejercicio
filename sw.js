/* Service Worker — Mi vuelta a entrenar
   Estrategia: "red primero, caché de respaldo".
   - Con conexión: siempre descarga la última versión (así los cambios en
     plan.js aparecen sin tocar nada más) y actualiza la caché.
   - Sin conexión: sirve la última versión guardada.
   Solo hace falta cambiar VERSION si se añaden o renombran ficheros. */
const VERSION = "mva-v1";
const FICHEROS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./plan.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FICHEROS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    (async () => {
      const cache = await caches.open(VERSION);
      try {
        const controlador = new AbortController();
        const espera = setTimeout(() => controlador.abort(), 4000); // red lenta: no bloquear
        const res = await fetch(req, { signal: controlador.signal, cache: "no-cache" });
        clearTimeout(espera);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) {
        const guardada = await cache.match(req, { ignoreSearch: true });
        if (guardada) return guardada;
        if (req.mode === "navigate") return cache.match("./index.html");
        throw err;
      }
    })()
  );
});
