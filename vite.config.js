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
    /* v2.3.1102: compress PNGs in the build output (dist/) so the deploy ships
       far smaller files without touching source art. Runs inside `vite build`
       (so it works on Cloudflare/CI where devDeps install). Path-aware: the
       runtime-RECOLOURED sheets (player body + gear) keep EXACT pixels via
       lossless re-deflate -- lossy palette quantization would shift the skin/
       pants RGB values the recolour pipeline keys on. All other (static) art --
       maps, UI, icons, weapons -- gets lossy palette quantization. Gracefully
       no-ops if sharp isn't installed, so a bare local `vite build` still works. */
    (() => {
      let outDir;
      return {
        name: 'optimize-dist-images',
        apply: 'build',
        configResolved(c) { outDir = c.build.outDir; },
        async closeBundle() {
          let sharp;
          try { sharp = (await import('sharp')).default; }
          catch { console.warn('[optimize-images] sharp not installed; skipping image compression'); return; }
          const fsp = await import('node:fs/promises');
          const np = await import('node:path');
          let before = 0, after = 0, count = 0;
          const walk = async (dir) => {
            let entries;
            try { entries = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
            for (const e of entries) {
              const p = np.join(dir, e.name);
              if (e.isDirectory()) { await walk(p); continue; }
              if (np.extname(e.name).toLowerCase() !== '.png') continue;
              let buf;
              try { buf = await fsp.readFile(p); } catch { continue; }
              if (buf.length < 1024) continue;
              const rel = np.relative(outDir, p).replace(/\\/g, '/');
              /* recoloured at runtime -> must preserve exact RGB. */
              const recolored = rel.includes('sprites/player/') || rel.includes('sprites/gear/');
              const opts = recolored
                ? { compressionLevel: 9, effort: 8 }            // lossless re-deflate
                : { palette: true, quality: 80, effort: 8 };     // lossy quantize
              try {
                const out = await sharp(buf).png(opts).toBuffer();
                before += buf.length;
                if (out.length < buf.length) { await fsp.writeFile(p, out); after += out.length; count++; }
                else { after += buf.length; }
              } catch { /* leave the original on any failure */ }
            }
          };
          await walk(outDir);
          const mb = (n) => (n / 1048576).toFixed(1);
          console.log(`[optimize-images] recompressed ${count} PNGs in dist: ${mb(before)}MB -> ${mb(after)}MB`);
        },
      };
    })(),
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
