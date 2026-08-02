
import App from './App.svelte';
import { getTheme, syncTheme } from './shared/theme.js';

if (typeof window !== 'undefined') {
  syncTheme(getTheme() === 'dark');
}

const app = new App({
  target: document.getElementById('app'),
});

export default app;
