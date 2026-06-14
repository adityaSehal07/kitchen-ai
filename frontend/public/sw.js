const CACHE = "kitchenai-v3";
const STATIC = ["/", "/index.html"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC).catch(()=>{})));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  
  // Handle Web Share Target
  if(url.searchParams.get("share") === "1") {
    const title = url.searchParams.get("title") || "";
    const text = url.searchParams.get("text") || "";
    const sharedUrl = url.searchParams.get("url") || "";
    
    // Extract YouTube video ID
    const combined = title + " " + text + " " + sharedUrl;
    const ytMatch = combined.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/);
    const videoId = ytMatch ? ytMatch[1] : "";
    
    const redirectTo = `/?sv=${videoId}&st=${encodeURIComponent(title)}&su=${encodeURIComponent(sharedUrl)}`;
    e.respondWith(Response.redirect(redirectTo, 303));
    return;
  }

  // Skip API calls
  if(url.pathname.startsWith("/api/")) return;

  // Network first, cache fallback
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if(res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
