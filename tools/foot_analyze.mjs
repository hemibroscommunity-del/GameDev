/* foot_analyze.mjs — find foot-contact frames in the jog sheets so footstep
 * SFX can fire exactly when a foot plants, per direction. For each 256px frame
 * it measures the lowest opaque pixel in the left and right halves (the two
 * feet); a foot is "planted" at the frame where its lowest point is greatest
 * (on the ground). Uses headless Chromium for PNG decode + getImageData.
 *
 * Usage: node tools/foot_analyze.mjs public/sprites/player/jog-*.png
 */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const files = process.argv.slice(2).filter((f) => existsSync(f));
if (!files.length) { console.error('no files'); process.exit(1); }

const results = []; let done = 0;
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(page()); }
  else if (u.pathname === '/list') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(files.map((f, i) => ({ i, name: path.basename(f) })))); }
  else if (u.pathname === '/img') { const b = await readFile(files[parseInt(u.searchParams.get('i'), 10)]); res.writeHead(200, { 'content-type': 'image/png' }); res.end(b); }
  else if (u.pathname === '/r' && req.method === 'POST') { const c = []; for await (const x of req) c.push(x); results.push(JSON.parse(Buffer.concat(c).toString())); done++; res.writeHead(200); res.end('ok'); }
  else { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', `--user-data-dir=/tmp/foot-${port}`, `http://127.0.0.1:${port}/`], { stdio: 'ignore' });
const t0 = Date.now();
await new Promise((res, rej) => { const iv = setInterval(() => { if (done >= files.length) { clearInterval(iv); res(); } else if (Date.now() - t0 > 120000) { clearInterval(iv); rej(new Error('timeout')); } }, 200); });
chrome.kill(); server.close();

results.sort((a, b) => a.i - b.i);
function localMaxima(arr) {
  // frames where value is a local max (foot lowest = planted), with a small prominence
  const max = Math.max(...arr), min = Math.min(...arr); const thr = min + (max - min) * 0.6;
  const out = [];
  const n = arr.length;
  for (let i = 0; i < n; i++) {
    const p = arr[(i - 1 + n) % n], c = arr[i], nx = arr[(i + 1) % n];
    if (c >= p && c >= nx && c >= thr) out.push(i);
  }
  return out;
}
for (const r of results) {
  console.log(`\n=== ${r.name} (${r.frames} frames) ===`);
  console.log('frame  leftFootY rightFootY');
  for (let i = 0; i < r.frames; i++) {
    console.log(`${String(i).padStart(3)}    ${String(r.leftY[i]).padStart(4)}      ${String(r.rightY[i]).padStart(4)}`);
  }
  console.log('left planted frames :', localMaxima(r.leftY).join(', '));
  console.log('right planted frames:', localMaxima(r.rightY).join(', '));
}
process.exit(0);

function page() { return `<!doctype html><meta charset=utf8><body><script>
function loadImg(src){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=src;});}
(async()=>{
  const list = await (await fetch('/list')).json();
  for(const it of list){
    const im = await loadImg('/img?i='+it.i);
    const FW=256, FH=256, frames=Math.round(im.naturalWidth/FW);
    const c=document.createElement('canvas'); c.width=im.naturalWidth; c.height=FH;
    const ctx=c.getContext('2d'); ctx.drawImage(im,0,0);
    const data=ctx.getImageData(0,0,c.width,c.height).data;
    const W=c.width;
    const leftY=[], rightY=[];
    for(let f=0; f<frames; f++){
      const x0=f*FW, xmid=x0+FW/2, x1=x0+FW;
      let lY=0, rY=0;
      for(let y=0;y<FH;y++){
        for(let x=x0;x<x1;x++){
          const a=data[(y*W+x)*4+3];
          if(a>50){ if(x<xmid){ if(y>lY)lY=y; } else { if(y>rY)rY=y; } }
        }
      }
      leftY.push(lY); rightY.push(rY);
    }
    await fetch('/r',{method:'POST',body:JSON.stringify({i:it.i,name:it.name,frames,leftY,rightY})});
  }
})();
</script></body>`; }
