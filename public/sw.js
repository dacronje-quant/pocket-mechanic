// Service worker: makes the game work offline once it has been opened once,
// and lets Chrome on Android offer "Install app".
//
// Strategy: the page and the media manifests are network-first (so a new
// deploy, or newly generated voices, music and pictures, show up on the next
// launch); everything else (hashed JS, icons, audio and art files) is
// cache-first, so the game keeps working offline.
// Bump VERSION if you ever need to force-clear old caches.
const VERSION = 'pm-v7-variety-offline';

// Cache the complete audio catalogue in the background, including lines the
// player has not heard yet. Keep downloads bounded and retry on next launch.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_AUDIO' || !Array.isArray(event.data.files)) return;
  const files = [...new Set(event.data.files)].filter(file =>
    typeof file === 'string' && /^(voice|music|sfx)\/[\w-]+\.mp3$/.test(file),
  );
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    let next = 0;
    let cached = 0;
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (next < files.length) {
        const file = files[next++];
        const url = new URL(`./audio/${file}`, self.registration.scope).href;
        try {
          if (!await cache.match(url)) {
            const response = await fetch(url);
            if (!response.ok) continue;
            await cache.put(url, response);
          }
          cached++;
        } catch { /* a temporary failure is retried at the next launch */ }
      }
    }));
    event.ports[0]?.postMessage({ type: 'AUDIO_CACHE_COMPLETE', cached, total: files.length });
  })());
});


// The illustrated rooms are bundled locally. Cache the complete pack once,
// including places a child has not visited yet, for the next offline session.
async function cacheArt(cache) {
  try {
    const response = await fetch('./art/manifest.json');
    if (!response.ok) return;
    const manifest = await response.clone().json();
    await cache.put('./art/manifest.json', response);
    const files = [...new Set(Object.values(manifest.images || {}))];
    await Promise.allSettled(files.map((file) => cache.add(`./art/${file}`)));
  } catch {
    // Installation still succeeds with the fully playable procedural artwork.
  }
}

// Initial scripts load before a new worker controls the page. Precache the
// hashed build from the saved HTML so a first visit also works offline.
async function cacheBuild(cache) {
  const page = await cache.match('./');
  if (!page) throw new Error('Missing offline game shell');
  const html = await page.text();
  const files = [...html.matchAll(/\b(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/gi)]
    .map(match => new URL(match[1], self.registration.scope))
    .filter(url => url.origin === self.location.origin)
    .map(url => url.href);
  await cache.addAll([...new Set(files)]);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then(async (c) => {
        await c.addAll(['./', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png']);
        await cacheBuild(c);
        // Audio may be absent in a source-only build; preserve its fallback.
        await c.add('./audio/manifest.json').catch(() => {});
        await cacheArt(c);
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./')),
    );
    return;
  }

  if (new URL(req.url).pathname.endsWith('manifest.json')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req)),
    );
    return;
  }

  event.respondWith(
    // Vite serves module scripts with Vary: Origin. Precache requests have no
    // Origin header, while browser module requests do. These are the same
    // same-origin static build files, so ignore that variation for JS/CSS only.
    caches.match(req, { ignoreVary: /\.(?:js|css)$/.test(new URL(req.url).pathname) }).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
