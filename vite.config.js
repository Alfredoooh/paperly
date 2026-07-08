import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';
import { cpSync, mkdirSync, existsSync } from 'fs';

// nome da pasta no disco -> nome da rota final em dist/
// APENAS as apps reais do site. A página de erro 404 NÃO entra aqui.
const apps = [
  { dir: 'home', route: 'home', nested: ['apps-modelos'] },
  { dir: 'auth', route: 'auth', nested: [] },
  { dir: 'ai', route: 'ai', nested: ['settings'] },
  { dir: 'profilelens', route: 'profilelens', nested: ['settings'] },
  { dir: 'docs', route: 'docs', nested: ['settings'] },
  { dir: 'sheets', route: 'sheets', nested: ['settings'] },
  { dir: 'slides', route: 'slides', nested: ['settings'] },
  { dir: 'drive', route: 'drive', nested: ['settings'] },
  { dir: 'calendar', route: 'calendar', nested: ['settings'] },
  { dir: 'chat', route: 'chat', nested: ['settings'] },
  { dir: 'tasks', route: 'tasks', nested: ['settings'] },
  { dir: 'notes', route: 'notes', nested: ['settings'] },
  { dir: 'forms', route: 'forms', nested: ['settings'] },
  { dir: 'projects', route: 'projects', nested: ['settings'] },
  { dir: 'wiki', route: 'wiki', nested: ['settings'] },
  { dir: 'whiteboard', route: 'whiteboard', nested: ['settings'] },
  { dir: 'analytics', route: 'analytics', nested: ['settings'] },
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
        
        for (const { dir, route, nested } of apps) {
          const src = resolve(dist, 'src', dir, 'index.html');
          const dest = resolve(dist, route, 'index.html');
          if (existsSync(src)) {
            mkdirSync(resolve(dist, route), { recursive: true });
            cpSync(src, dest);
            console.log(`✓ dist/${route}/index.html`);
            
            for (const sub of nested || []) {
              const subDir = resolve(dist, route, sub);
              const subDest = resolve(subDir, 'index.html');
              mkdirSync(subDir, { recursive: true });
              cpSync(src, subDest);
              console.log(`✓ dist/${route}/${sub}/index.html`);
            }
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
        home: resolve(__dirname, 'src/home/index.html'),
        auth: resolve(__dirname, 'src/auth/index.html'),
        ai: resolve(__dirname, 'src/ai/index.html'),
        profilelens: resolve(__dirname, 'src/profilelens/index.html'),
        docs: resolve(__dirname, 'src/docs/index.html'),
        sheets: resolve(__dirname, 'src/sheets/index.html'),
        slides: resolve(__dirname, 'src/slides/index.html'),
        drive: resolve(__dirname, 'src/drive/index.html'),
        calendar: resolve(__dirname, 'src/calendar/index.html'),
        chat: resolve(__dirname, 'src/chat/index.html'),
        tasks: resolve(__dirname, 'src/tasks/index.html'),
        notes: resolve(__dirname, 'src/notes/index.html'),
        forms: resolve(__dirname, 'src/forms/index.html'),
        projects: resolve(__dirname, 'src/projects/index.html'),
        wiki: resolve(__dirname, 'src/wiki/index.html'),
        whiteboard: resolve(__dirname, 'src/whiteboard/index.html'),
        analytics: resolve(__dirname, 'src/analytics/index.html'),
        notfound: resolve(__dirname, 'src/notfound/index.html'),
      }
    }
  }
});