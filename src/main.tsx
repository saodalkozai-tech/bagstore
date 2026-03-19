import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import {
  hydrateAuthSession,
  initializeStorage,
  refreshProductsFromSupabase,
  syncLocalDataToSupabase
} from './lib/storage.ts'

const root = createRoot(document.getElementById("root")!);
let hasRendered = false;

function renderApp() {
  if (hasRendered) return;
  hasRendered = true;
  root.render(<App />);
}

async function bootstrap() {
  try {
    await hydrateAuthSession();
    await initializeStorage();
    await refreshProductsFromSupabase();
    await syncLocalDataToSupabase();
  } catch (error) {
    console.error('Application bootstrap failed. Falling back to local mode:', error);
  } finally {
    renderApp();
  }
}

void bootstrap();

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
