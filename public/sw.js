self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Kegel Live-Update', body: event.data.text() };
  }

  const title = payload.title || 'Kegel Live-Update';
  const options = {
    body: payload.body || '',
    data: {
      url: payload.url || '/tournaments',
    },
    badge: '/logo.png',
    icon: '/logo.png',
    tag: payload.gameId ? `kegel-live-${payload.gameId}` : 'kegel-live',
    renotify: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/tournaments';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});

