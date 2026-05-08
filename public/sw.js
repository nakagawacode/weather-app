self.addEventListener("push", (event) => {
  const fallback = {
    title: "Weather Board",
    body: "今日の天気を確認してください。",
    url: "/",
  };

  const data = event.data ? event.data.json() : fallback;

  event.waitUntil(
    self.registration.showNotification(data.title || fallback.title, {
      body: data.body || fallback.body,
      icon: "/weather/clear-pictogram.png",
      badge: "/weather/clear-pictogram.png",
      data: {
        url: data.url || fallback.url,
      },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin)
    .href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existingClient = clients.find((client) => client.url === targetUrl);

        if (existingClient) {
          return existingClient.focus();
        }

        return self.clients.openWindow(targetUrl);
      })
  );
});
