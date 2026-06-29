/* sheet_montage.mjs — render a sprite strip as a numbered grid montage so the
 * individual frames are big enough to read (e.g. to find foot-plant frames).
 * Output PNG written next to the source as <name>.montage.png.
 * Usage: node tools/sheet_montage.mjs FILE... [--cell 150] [--cols 7]
 */
import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const argv = process.argv.slice(2); const files = []; let cell = 150, cols = 7, outdir = null;
for (let i = 0; i < argv.length; i++) { const a = argv[i];
  if (a === '--cell') cell = +argv[++i]; else if (a === '--cols') cols = +argv[++i]; else if (a === '--outdir') outdir = argv[++i]; else if (existsSync(a)) files.push(a); }
if (!files.length) { console.error('no files'); process.exit(1); }

const out = []; let done = 0;
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(page(cell, cols)); }
  else if (u.pathname === '/list') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(files.map((f, i) => ({ i, name: path.basename(f) })))); }
  else if (u.pathname === '/img') { const b = await readFile(files[+u.searchParams.get('i')]); res.writeHead(200, { 'content-type': 'image/png' }); res.end(b); }
  else if (u.pathname === '/out' && req.method === 'POST') {
    const i = +u.searchParams.get('i'); const c = []; for await (const x of req) c.push(x);
    const src = files[i]; const dst = outdir ? path.join(outdir, path.basename(src, path.extname(src)) + '.montage.png') : src.replace(/\.[^.]+$/, '.montage.png');
    await writeFile(dst, Buffer.concat(c)); out.push(dst); done++; res.writeHead(200); res.end('ok');
  } else { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', `--user-data-dir=/tmp/montage-${port}`, `http://127.0.0.1:${port}/`], { stdio: 'ignore' });
const t0 = Date.now();
await new Promise((res, rej) => { const iv = setInterval(() => { if (done >= files.length) { clearInterval(iv); res(); } else if (Date.now() - t0 > 120000) { clearInterval(iv); rej(new Error('timeout')); } }, 200); });
chrome.kill(); server.close();
for (const o of out) console.log('wrote', o);
process.exit(0);

function page(cell, cols) { return `<!doctype html><meta charset=utf8><body><script>
const CELL=${cell}, COLS=${cols};
function loadImg(src){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=src;});}
function toBlob(c){return new Promise(r=>c.toBlob(r,'image/png'));}
(async()=>{
  const list = await (await fetch('/list')).json();
  for(const it of list){
    const im = await loadImg('/img?i='+it.i);
    const FW=256, frames=Math.round(im.naturalWidth/256);
    const rows=Math.ceil(frames/COLS);
    const c=document.createElement('canvas'); c.width=COLS*CELL; c.height=rows*CELL;
    const ctx=c.getContext('2d');
    ctx.fillStyle='#3a4a5a'; ctx.fillRect(0,0,c.width,c.height);
    for(let f=0; f<frames; f++){
      const col=f%COLS, row=(f/COLS)|0, dx=col*CELL, dy=row*CELL;
      ctx.fillStyle=(f%2)?'#2e3a48':'#243038'; ctx.fillRect(dx,dy,CELL,CELL);
      ctx.drawImage(im, f*FW,0,FW,FW, dx,dy,CELL,CELL);
      ctx.fillStyle='#ffe066'; ctx.font='bold 20px sans-serif';
      ctx.strokeStyle='#000'; ctx.lineWidth=3; ctx.strokeText(String(f), dx+4, dy+20); ctx.fillText(String(f), dx+4, dy+20);
    }
    const b=await toBlob(c); const buf=await b.arrayBuffer();
    await fetch('/out?i='+it.i,{method:'POST',body:buf});
  }
})();
</script></body>`; }
