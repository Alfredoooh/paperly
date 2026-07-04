import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';
import { cpSync, mkdirSync, existsSync } from 'fs';

// nome da pasta no disco -> nome da rota final em dist/
// APENAS as apps reais do site. A página de erro 404 NÃO entra aqui.
const apps = [
  { dir: 'auth', route: 'auth' },
  { dir: 'home', route: 'home' },
  { dir: 'ai', route: 'ai' },
  { dir: 'music', route: 'music' },
  { dir: 'games', route: 'games' },
  { dir: 'media', route: 'media' },
  { dir: 'profilelens', route: 'profilelens' },
  { dir: 'downloader', route: 'downloader' },
];

// página de erro 404, tratada à parte por não ser uma app do site
const notFound = { dir: 'notfound', route: '404' };

export default defineConfig({
  plugins: [
    svelte(),
    {
      name: 'post-build-copy',
      closeBundle() {
        const dist = resolve(__dirname, 'dist');
        
        for (const { dir, route } of apps) {
          const src = resolve(dist, 'src', dir, 'index.html');
          const dest = resolve(dist, route, 'index.html');
          if (existsSync(src)) {
            mkdirSync(resolve(dist, route), { recursive: true });
            cpSync(src, dest);
            console.log(`✓ dist/${route}/index.html`);
          } else {
            console.warn(`⚠ não encontrado: dist/src/${dir}/index.html`);
          }
        }
        
        const notFoundSrc = resolve(dist, 'src', notFound.dir, 'index.html');
        const notFoundDest = resolve(dist, notFound.route, 'index.html');
        if (existsSync(notFoundSrc)) {
          mkdirSync(resolve(dist, notFound.route), { recursive: true });
          cpSync(notFoundSrc, notFoundDest);
          console.log(`✓ dist/${notFound.route}/index.html`);
          
          cpSync(notFoundSrc, resolve(dist, '404.html'));
          console.log('✓ dist/404.html');
        } else {
          console.warn(`⚠ não encontrado: dist/src/${notFound.dir}/index.html`);
        }
        
        const rootSrc = resolve(__dirname, 'index.html');
        const rootDest = resolve(dist, 'index.html');
        if (existsSync(rootSrc)) {
          cpSync(rootSrc, rootDest);
          console.log('✓ dist/index.html (redirect root)');
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
        profilelens: resolve(__dirname, 'src/profilelens/index.html'),
        downloader: resolve(__dirname, 'src/downloader/index.html'),
        notfound: resolve(__dirname, 'src/notfound/index.html'),
      }
    }
  }
});