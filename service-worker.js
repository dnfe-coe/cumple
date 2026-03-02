// service-worker.js
self.addEventListener("install", (event) => {
  console.log("Service Worker instalado");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activado");
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();

  self.registration.showNotification(data.title || "Notificación", {
    body: data.body || "",
    // Si tienes favicon.ico en frontend/, deja estas líneas
    // icon: "/favicon.ico",
    //badge: "/favicon.ico",
    vibrate: [200, 100, 200],
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
