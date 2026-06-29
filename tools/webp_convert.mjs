/* webp_convert.mjs — in-session image compressor (v2.3.1103).
 *
 * WHY this exists: this sandbox can't install image tooling (npm + PyPI are
 * both firewalled, and the bundled Playwright ffmpeg is stripped of libwebp).
 * The one image engine present is the pre-installed Chromium, whose <canvas>
 * can encode WebP. So we drive a headless Chromium at a tiny local page that
 * loads each source image, (optionally) downscales it on a canvas, re-encodes
 * via canvas.toBlob(), and POSTs the bytes back to this Node server, which
 * writes the output file. No npm deps (Node 22 http + global fetch only).
 *
 * It commits already-small files to the repo, so there is NO build-time
 * dependency and NO Cloudflare `npm ci` impact.
 *
 * Usage:
 *   node tools/webp_convert.mjs --format webp --q 80 [--scale 0.5] FILE...
 *   node tools/webp_convert.mjs --format png  --scale 0.5        FILE...
 *
 *   --format webp|png   output codec (default webp). png = lossless re-encode,
 *                       used for recolour-sensitive player/gear downscales.
 *   --q <0-100>         webp quality (default 80). Ignored for png.
 *   --scale <frac>      multiply width & height by this (default 1.0). Frame
 *                       strips keep their aspect, so a 0.5 scale on a
 *                       N*256 x 256 strip yields N*128 x 128 (still N frames).
 *   --outdir <dir>      write outputs under here mirroring basename; default is
 *                       alongside the source with the new extension.
 *   --replace           for webp: delete the source file after a successful
 *                       write (used when migrating PNG->WebP). png keeps both
 *                       unless --replace (overwrites same path when ext matches).
 *
 * Outputs a per-file before/after size table and a total.
 */

import http from 'node:http';
import { readFile, writeFile, stat, unlink, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

function parseArgs(argv) {
  const o = { format: 'webp', q: 80, scale: 1.0, outdir: null, replace: false, force: false, files: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--format') o.format = argv[++i];
    else if (a === '--q') o.q = parseInt(argv[++i], 10);
    else if (a === '--scale') o.scale = parseFloat(argv[++i]);
    else if (a === '--outdir') o.outdir = argv[++i];
    else if (a === '--replace') o.replace = true;
    else if (a === '--nearest') o.nearest = true; // nearest-neighbour resample (preserve exact palette for recolour-safe downscales)
    else if (a === '--force') o.force = true;   // write the webp even if it's not smaller (keeps a PNG->WebP migration's references consistent)
    else o.files.push(a);
  }
  return o;
}

const mime = (f) => {
  const e = path.extname(f).toLowerCase();
  return e === '.png' ? 'image/png'
    : e === '.jpg' || e === '.jpeg' ? 'image/jpeg'
    : e === '.webp' ? 'image/webp' : 'application/octet-stream';
};

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const files = opts.files.filter((f) => existsSync(f));
  if (!files.length) { console.error('no input files'); process.exit(1); }
  if (!existsSync(CHROME)) { console.error('chromium not found at ' + CHROME); process.exit(1); }

  // Job list: index -> {src, out}
  const jobs = files.map((src, i) => {
    const base = path.basename(src, path.extname(src));
    const ext = opts.format === 'png' ? '.png' : '.webp';
    let out;
    if (opts.outdir) out = path.join(opts.outdir, base + ext);
    else out = path.join(path.dirname(src), base + ext);
    return { i, src, out };
  });

  const results = [];
  let done = 0;

  const server = http.createServer(async (req, res) => {
    try {
      const u = new URL(req.url, 'http://localhost');
      if (u.pathname === '/') {
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end(PAGE(opts));
      } else if (u.pathname === '/jobs') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(jobs.map((j) => ({ i: j.i }))));
      } else if (u.pathname === '/src') {
        const j = jobs[parseInt(u.searchParams.get('i'), 10)];
        const buf = await readFile(j.src);
        res.writeHead(200, { 'content-type': mime(j.src) });
        res.end(buf);
      } else if (u.pathname === '/out' && req.method === 'POST') {
        const i = parseInt(u.searchParams.get('i'), 10);
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const out = Buffer.concat(chunks);
        const j = jobs[i];
        await mkdir(path.dirname(j.out), { recursive: true });
        const beforeBytes = (await stat(j.src)).size;
        // Keep the new file if: it's smaller, OR png-downscale (smaller dims is
        // the point), OR --force (migration wants every ref to flip to .webp).
        // Never write a zero-byte result (that's a page-side conversion failure).
        let wrote = false;
        if (out.length > 0 && (opts.force || opts.format === 'png' || out.length < beforeBytes)) {
          await writeFile(j.out, out);
          wrote = true;
          if (opts.replace && path.resolve(j.src) !== path.resolve(j.out)) {
            await unlink(j.src).catch(() => {});
          }
        }
        results.push({ src: j.src, out: j.out, before: beforeBytes, after: out.length, wrote });
        done++;
        res.writeHead(200); res.end('ok');
      } else if (u.pathname === '/log' && req.method === 'POST') {
        const chunks = []; for await (const c of req) chunks.push(c);
        console.error('[page]', Buffer.concat(chunks).toString());
        res.writeHead(200); res.end('ok');
      } else { res.writeHead(404); res.end(); }
    } catch (e) {
      console.error('server error', e);
      res.writeHead(500); res.end(String(e));
    }
  });

  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/`;

  const profile = `/tmp/webp-convert-profile-${port}`;
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--disable-dev-shm-usage', `--user-data-dir=${profile}`, url,
  ], { stdio: 'ignore' });

  // Wait for all jobs to report back (with a timeout safety net).
  const total = jobs.length;
  const t0 = Date.now();
  await new Promise((resolve, reject) => {
    const iv = setInterval(() => {
      if (done >= total) { clearInterval(iv); resolve(); }
      else if (Date.now() - t0 > 1000 * 60 * 10) { clearInterval(iv); reject(new Error('timeout')); }
    }, 200);
  });

  chrome.kill();
  server.close();

  // Report
  let tb = 0, ta = 0, wrote = 0;
  results.sort((a, b) => a.src.localeCompare(b.src));
  for (const r of results) {
    tb += r.before; ta += r.wrote ? r.after : r.before; if (r.wrote) wrote++;
    const kb = (n) => (n / 1024).toFixed(0) + 'KB';
    const tag = r.wrote ? '' : '  (kept original — not smaller)';
    console.log(`${kb(r.before).padStart(8)} -> ${kb(r.after).padStart(8)}  ${r.src}${tag}`);
  }
  const mb = (n) => (n / 1048576).toFixed(2) + 'MB';
  console.log(`\n${wrote}/${total} written. total ${mb(tb)} -> ${mb(ta)} (${(100 * (1 - ta / tb)).toFixed(1)}% smaller)`);
  process.exit(0);
}

function PAGE(opts) {
  return `<!doctype html><meta charset=utf8><body><script>
const FORMAT=${JSON.stringify(opts.format)}, Q=${opts.q/100}, SCALE=${opts.scale}, NEAREST=${opts.nearest ? 'true' : 'false'};
const log=(m)=>{try{fetch('/log',{method:'POST',body:String(m)})}catch(e){}};
function loadImg(src){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>rej(new Error('img load '+src));im.src=src;});}
function toBlob(c){return new Promise((res)=>{c.toBlob(res, FORMAT==='png'?'image/png':'image/webp', Q);});}
(async()=>{
  let jobs;
  try{ jobs=await (await fetch('/jobs')).json(); }catch(e){ log('jobs fetch failed '+e); return; }
  for(const j of jobs){
    try{
      const im=await loadImg('/src?i='+j.i);
      const w=Math.max(1,Math.round(im.naturalWidth*SCALE));
      const h=Math.max(1,Math.round(im.naturalHeight*SCALE));
      const c=document.createElement('canvas'); c.width=w; c.height=h;
      const ctx=c.getContext('2d'); ctx.imageSmoothingEnabled=!NEAREST; ctx.imageSmoothingQuality='high';
      ctx.clearRect(0,0,w,h); ctx.drawImage(im,0,0,w,h);
      const blob=await toBlob(c);
      const buf=await blob.arrayBuffer();
      await fetch('/out?i='+j.i,{method:'POST',body:buf});
    }catch(e){ log('job '+j.i+' failed: '+e); await fetch('/out?i='+j.i,{method:'POST',body:new ArrayBuffer(0)}); }
  }
  log('DONE');
})();
</script></body>`;
}

main();
