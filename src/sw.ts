/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

declare const self: ServiceWorkerGlobalScope;

// Precache assets gerados pelo Vite
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Offline fallback: serve index.html para todas as navegações (SPA + offline)
registerRoute(new NavigationRoute(createHandlerBoundToURL("/index.html")));

// ── Push notifications ────────────────────────────────────────────────────────

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  let payload: PushPayload;
  try {
    payload = event.data.json() as PushPayload;
  } catch {
    payload = { title: "FaceGlow", body: event.data.text() };
  }

  const { title, body, icon, badge, url, tag } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:  icon  ?? "/android-chrome-192x192.png",
      badge: badge ?? "/favicon-32x32.png",
      tag:   tag   ?? "faceglow",
      data:  { url: url ?? "/" },
      vibrate: [200, 100, 200],
    })
  );
});

// ── Notification click ────────────────────────────────────────────────────────

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl: string = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Foca janela existente se possível
        const existing = clientList.find(
          (c) => c.url.startsWith(self.location.origin) && "focus" in c
        );
        if (existing) return (existing as WindowClient).focus();
        return self.clients.openWindow(targetUrl);
      })
  );
});

// ── Lifecycle ────────────────────────────────────────────────────────────────

// Ativa imediatamente sem esperar as abas fecharem — evita chunks stale no PWA
self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    self.clients.claim().then(() =>
      self.clients.matchAll({ type: "window" }).then((clients) =>
        clients.forEach((c) => c.postMessage({ type: "SW_UPDATED" }))
      )
    )
  );
});

// Protocolo VitePWA: permite que o app force o skip waiting via postMessage
self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
