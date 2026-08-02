import { getTheme, syncTheme } from './shared/theme.js';
import App from './App.svelte';

syncTheme(getTheme() === 'dark');

const app = new App({
  target: document.getElementById('app'),
});

export default app;
