import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';
import { cpSync, mkdirSync, existsSync } from 'fs';

const apps = ['auth', 'home', 'ai', 'music', 'games', 'media', 'news', 'downloader'];

export default defineConfig({
  plugins: [
    svelte(),
    {
      name: 'post-build-copy',
      closeBundle() {
        const dist = resolve(__dirname, 'dist');
        for (const app of apps) {
          const src = resolve(dist, 'src', app, 'index.html');
          const dest = resolve(dist, app, 'index.html');
          if (existsSync(src)) {
            mkdirSync(resolve(dist, app), { recursive: true });
            cpSync(src, dest);
            console.log(`✓ dist/${app}/index.html`);
          } else {
            console.warn(`⚠ não encontrado: dist/src/${app}/index.html`);
          }
        }
      }
    }
  ],
  publicDir: 'static',
  resolve: {
    alias: {
      '$shared': resolve(__dirname, 'src/shared'),
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        auth: resolve(__dirname, 'src/auth/index.html'),
        home: resolve(__dirname, 'src/home/index.html'),
        ai: resolve(__dirname, 'src/ai/index.html'),
        music: resolve(__dirname, 'src/music/index.html'),
        games: resolve(__dirname, 'src/games/index.html'),
        media: resolve(__dirname, 'src/media/index.html'),
        news: resolve(__dirname, 'src/news/index.html'),
        downloader: resolve(__dirname, 'src/downloader/index.html'),
      }
    }
  }
});