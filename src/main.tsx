import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { hydrateAuthSession, initializeStorage } from './lib/storage.ts'

const root = createRoot(document.getElementById("root")!);

async function bootstrap() {
  await hydrateAuthSession();
  await initializeStorage();
  root.render(<App />);
}

bootstrap();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    let isRefreshing = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (isRefreshing) return;
      isRefreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        registration.update();
      })
      .catch((error) => {
        console.error("Service worker registration failed:", error);
      });
  });
}
