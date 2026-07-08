// src/shared/pwa-install.js
// Gere o evento beforeinstallprompt e o registo do service worker,
// para ser usado em qualquer app do Nexa.

let deferredPrompt = null;
let installAvailable = false;
const listeners = new Set();

function notify() {
  listeners.forEach((fn) => fn(installAvailable));
}

export function initPwaInstall() {
  if (typeof window === 'undefined') return;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installAvailable = true;
    notify();
  });
  
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installAvailable = false;
    notify();
  });
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

export function isPwaInstalled() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export function canInstallPwa() {
  return installAvailable && !isPwaInstalled();
}

export function onPwaInstallAvailable(callback) {
  listeners.add(callback);
  callback(installAvailable);
  return () => listeners.delete(callback);
}

export async function promptPwaInstall() {
  if (!deferredPrompt) return { outcome: 'unavailable' };
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  installAvailable = false;
  notify();
  return choice;
}