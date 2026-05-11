import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const safeExec = (cmd) => {
  try { return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
  catch { return ''; }
};

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'));
const GIT_SHA = safeExec('git rev-parse --short HEAD') || 'nogit';
const GIT_DIRTY = safeExec('git status --porcelain') ? '+' : '';
const BUILD_TIME = new Date().toISOString().replace('T', ' ').slice(0, 16) + 'Z';

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  plugins: [
    react(),
    {
      /* Replace __BUILD_VERSION__ / __BUILD_SHA__ tokens in index.html
         so the loading-screen badge tracks the current build instead
         of a hardcoded value that goes stale on every push. */
      name: 'inject-build-info-html',
      transformIndexHtml(html) {
        return html
          .replaceAll('__BUILD_VERSION__', pkg.version)
          .replaceAll('__BUILD_SHA__', GIT_SHA + GIT_DIRTY);
      },
    },
  ],
  define: {
    __BUILD_VERSION__: JSON.stringify(pkg.version),
    __BUILD_SHA__: JSON.stringify(GIT_SHA + GIT_DIRTY),
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    port: 3000,
    open: true,
  },
});
