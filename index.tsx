import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './i18n/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { TourProvider } from './context/TourContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <TourProvider>
            <App />
          </TourProvider>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = new URL('./service-worker.ts', import.meta.url);
    navigator.serviceWorker
      .register(swUrl, { type: 'module' })
      .then((registration) => {
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission().catch((error) => {
            console.warn('[sw] Push permission request failed', error);
          });
        }
        return registration;
      })
      .catch((error) => {
        console.error('[sw] Registration failed', error);
      });
  });
}
