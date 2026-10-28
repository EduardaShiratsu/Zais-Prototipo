// Service worker mínimo: deixa o site instalável como aplicativo.
// Não guarda nada em cache (as reservas precisam estar sempre atualizadas).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
