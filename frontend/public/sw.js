const CACHE = "kitchenai-v2";

self.addEventListener("install", e => {
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  // Handle share target - redirect to main app with shared data
  const url = new URL(e.request.url);
  if(url.pathname === "/share-target") {
    const sharedUrl = url.searchParams.get("url") || "";
    const sharedText = url.searchParams.get("text") || "";
    const sharedTitle = url.searchParams.get("title") || "";
    
    // Extract YouTube video ID from shared URL or text
    const combined = sharedUrl + " " + sharedText;
    const ytMatch = combined.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    const videoId = ytMatch ? ytMatch[1] : null;
    
    // Redirect to app with video info
    const redirectUrl = `/?shared_video=${videoId || ""}&shared_title=${encodeURIComponent(sharedTitle)}&shared_url=${encodeURIComponent(sharedUrl)}`;
    
    e.respondWith(Response.redirect(redirectUrl, 303));
    return;
  }
  
  // Normal fetch - network first, fallback to cache
  if(e.request.url.includes("/api/")) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
