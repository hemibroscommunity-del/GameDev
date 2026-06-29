/* palette_compare.mjs — decode two PNGs in headless Chromium and report how many
 * opaque colours in file B are NOT present in file A. Used to confirm a nearest-
 * neighbour downscale preserved the exact palette (recolour-safe). Read-only.
 * Usage: node tools/palette_compare.mjs NATIVE.png DOWNSCALED.png
 */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const files = process.argv.slice(2).filter((f) => existsSync(f));
if (files.length !== 2) { console.error('need NATIVE and DOWNSCALED'); process.exit(1); }

let result = null;
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(pageHtml()); }
  else if (u.pathname === '/a') { res.writeHead(200, { 'content-type': 'image/png' }); res.end(await readFile(files[0])); }
  else if (u.pathname === '/b') { res.writeHead(200, { 'content-type': 'image/png' }); res.end(await readFile(files[1])); }
  else if (u.pathname === '/r' && req.method === 'POST') { const c = []; for await (const x of req) c.push(x); result = JSON.parse(Buffer.concat(c).toString()); res.writeHead(200); res.end('ok'); }
  else { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', `--user-data-dir=/tmp/pal-${port}`, `http://127.0.0.1:${port}/`], { stdio: 'ignore' });
const t0 = Date.now();
await new Promise((res, rej) => { const iv = setInterval(() => { if (result) { clearInterval(iv); res(); } else if (Date.now() - t0 > 60000) { clearInterval(iv); rej(new Error('timeout')); } }, 200); });
chrome.kill(); server.close();

console.log(`native unique opaque colours: ${result.aCount}`);
console.log(`downscaled unique opaque colours: ${result.bCount}`);
console.log(`downscaled colours NOT in native: ${result.newCount}  (${(100 * result.newCount / result.bCount).toFixed(1)}% of downscaled)`);
console.log(`-> ${result.newCount === 0 ? 'EXACT palette preserved (nearest OK, recolour-safe)' : 'NEW colours present (smoothing leaked -> recolour will shift)'}`);
if (result.samples) { console.log('sample new colours (rgb):', result.samples.join('  ')); }
process.exit(0);

function pageHtml(){ return `<!doctype html><meta charset=utf8><body><script>
function load(src){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=src;});}
function colours(im){
  const c=document.createElement('canvas'); c.width=im.naturalWidth; c.height=im.naturalHeight;
  const x=c.getContext('2d'); x.drawImage(im,0,0);
  const d=x.getImageData(0,0,c.width,c.height).data; const set=new Set();
  for(let i=0;i<d.length;i+=4){ if(d[i+3]>=128){ set.add((d[i]<<16)|(d[i+1]<<8)|d[i+2]); } }
  return set;
}
(async()=>{
  const a=await load('/a'), b=await load('/b');
  const A=colours(a), B=colours(b);
  let newCount=0; const samples=[];
  for(const col of B){ if(!A.has(col)){ newCount++; if(samples.length<8) samples.push(((col>>16)&255)+','+((col>>8)&255)+','+(col&255)); } }
  await fetch('/r',{method:'POST',body:JSON.stringify({aCount:A.size,bCount:B.size,newCount,samples})});
})();
</script></body>`; }
