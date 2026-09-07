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
    {
      /* v2.3.1718: emit dist/version.json so a RUNNING client can notice it
         is stale.  Cloudflare Pages revalidates index.html and Vite hashes
         every asset, so a reload always gets the new build — but a tab left
         OPEN across a deploy keeps executing the old bundle indefinitely, and
         no cache header can fix that.  On judging day four client deploys
         went out in an hour and a judge ended up on a build old enough to
         land in a different room, invisible to everyone with no error shown.
         This file is the thing the client polls to find out. */
      name: 'emit-version-json',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({ sha: GIT_SHA + GIT_DIRTY, version: pkg.version, time: BUILD_TIME }),
        });
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
    /* v2.3.2328: source maps OFF for the deployed build.  `sourcemap: true`
       emitted dist/assets/index-*.js.map at 11.95 MB -- 12% of a 98 MB Pages
       deploy, rebuilt and re-uploaded on every push, for a file no player ever
       fetches (a browser only requests a .map with devtools open).
       NOTHING IS LOST by dropping it, and that is worth stating plainly rather
       than dressing this up as a security fix: the repo is PUBLIC, so the map
       disclosed nothing that github.com does not.  And any deployed build can be
       symbolicated after the fact, exactly, because dist/version.json records
       the git sha it was built from:
         git checkout <sha> && npm run build -- --sourcemap
       reproduces the same bundle and its map.  crashTrap.js does not consult a
       map either -- it POSTs the raw stack string (crashTrap.js:66). */
    sourcemap: false,
  },
  server: {
    port: 3000,
    open: true,
  },
});
