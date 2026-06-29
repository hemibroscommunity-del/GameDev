/* skin_lum.mjs — measure the median luminance of SKIN / PANTS pixels in each
 * player sheet, using the same classifiers as playerSkins. If these differ by
 * direction, a single global REF makes the recolour land a different shade per
 * angle. Read-only diagnostic.
 * Usage: node tools/skin_lum.mjs public/sprites/player/stand-*.png
 */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const files = process.argv.slice(2).filter((f) => existsSync(f));
if (!files.length) { console.error('no files'); process.exit(1); }
const out = []; let done = 0;
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(pageHtml()); }
  else if (u.pathname === '/list') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(files.map((f, i) => ({ i, name: path.basename(f) })))); }
  else if (u.pathname === '/img') { res.writeHead(200, { 'content-type': 'image/png' }); res.end(await readFile(files[+u.searchParams.get('i')])); }
  else if (u.pathname === '/r' && req.method === 'POST') { const c = []; for await (const x of req) c.push(x); out.push(JSON.parse(Buffer.concat(c).toString())); done++; res.writeHead(200); res.end('ok'); }
  else { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', `--user-data-dir=/tmp/skin-${port}`, `http://127.0.0.1:${port}/`], { stdio: 'ignore' });
const t0 = Date.now();
await new Promise((res, rej) => { const iv = setInterval(() => { if (done >= files.length) { clearInterval(iv); res(); } else if (Date.now() - t0 > 90000) { clearInterval(iv); rej(new Error('timeout')); } }, 200); });
chrome.kill(); server.close();
out.sort((a, b) => a.name.localeCompare(b.name));
console.log('sheet                         skinMedianLum  skinPx   pantsMedianLum  pantsPx');
for (const r of out) console.log(`${r.name.padEnd(28)}  ${String(r.skin).padStart(8)}      ${String(r.skinN).padStart(6)}   ${String(r.pants).padStart(8)}        ${String(r.pantsN).padStart(6)}`);
const sk = out.map(r => r.skin); console.log(`\nskin median lum range: ${Math.min(...sk)}..${Math.max(...sk)} (spread ${Math.max(...sk) - Math.min(...sk)}); current global SKIN_REF=149`);
process.exit(0);

function pageHtml() { return `<!doctype html><meta charset=utf8><body><script>
function load(src){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=src;});}
const isSkin=(r,g,b,a)=> a>40 && r>g && g>=b && (r-b)>30 && r>90 && (r-g)>25;
const isPants=(r,g,b,a)=> a>180 && g>=r-10 && g>b+8 && r<150;
const lum=(r,g,b)=> 0.299*r+0.587*g+0.114*b;
function median(a){ if(!a.length) return 0; a.sort((x,y)=>x-y); return Math.round(a[a.length>>1]); }
(async()=>{
  const list=await (await fetch('/list')).json();
  for(const it of list){
    const im=await load('/img?i='+it.i);
    const c=document.createElement('canvas'); c.width=im.naturalWidth; c.height=im.naturalHeight;
    const x=c.getContext('2d'); x.drawImage(im,0,0); const d=x.getImageData(0,0,c.width,c.height).data;
    const sk=[],pa=[];
    for(let i=0;i<d.length;i+=4){ const r=d[i],g=d[i+1],b=d[i+2],a=d[i+3];
      if(isSkin(r,g,b,a)) sk.push(lum(r,g,b)); else if(isPants(r,g,b,a)) pa.push(lum(r,g,b)); }
    await fetch('/r',{method:'POST',body:JSON.stringify({name:it.name,skin:median(sk),skinN:sk.length,pants:median(pa),pantsN:pa.length})});
  }
})();
</script></body>`; }
