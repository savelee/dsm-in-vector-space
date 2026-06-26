import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register dynamic Service Worker with automatic reload on update
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Note: We use relative path so it works in subdirectories like /dsm-in-vector-space/
    navigator.serviceWorker.register('./sw.js').then((registration) => {
      // Check for updates immediately on load
      registration.update();

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New update is available and has been cached; reload immediately!
                console.log('New update detected; triggering automatic reload...');
                window.location.reload();
              }
            }
          };
        }
      };
    }).catch((err) => {
      console.error('Service Worker registration failed:', err);
    });
  });
}
