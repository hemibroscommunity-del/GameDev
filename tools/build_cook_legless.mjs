/* build_cook_legless — make a cook body strip with the bare LEGS erased, for use
 * when leg armour is equipped (so the mannequin legs don't show behind/through
 * the greaves). Per column, everything from the topmost olive (pants) pixel down
 * is cleared EXCEPT the pan (dark metal + bright food), which is preserved so the
 * cook keeps holding it over the fire.
 * Output: public/sprites/skills/cook-strip-legless.webp + a composited preview
 * (legless body + the committed greaves) so the fit can be checked.
 *
 *   node tools/build_cook_legless.mjs           (preview only)
 *   APPLY=1 node tools/build_cook_legless.mjs   (also write the webp)
 * Tunable (env): CUT (extra rows above the pants-top to also clear, default 0).
 */
import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const COOK = 'public/sprites/skills/cook-strip.webp';
const LEGS = 'public/sprites/gear/legs/steelgreaves/cook-south.png';
const OUT = 'public/sprites/skills/cook-strip-legless.webp';
const SCRATCH = '/tmp/claude-0/-home-user-GameDev/67ac1d82-015e-5dc1-bc02-24d0bfd493a3/scratchpad';
const APPLY = process.env.APPLY === '1';
const CUT = +(process.env.CUT || 0);
let result = null, done = false;
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(pageHtml()); }
  else if (u.pathname === '/cook') { res.writeHead(200, { 'content-type': 'image/webp' }); res.end(await readFile(COOK)); }
  else if (u.pathname === '/legs') { res.writeHead(200, { 'content-type': 'image/png' }); res.end(await readFile(LEGS)); }
  else if (u.pathname === '/r' && req.method === 'POST') { const c = []; for await (const x of req) c.push(x); result = JSON.parse(Buffer.concat(c).toString()); done = true; res.writeHead(200); res.end('ok'); }
  else { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', `--user-data-dir=/tmp/bcll-${port}`, `http://127.0.0.1:${port}/`], { stdio: 'ignore' });
const t0 = Date.now();
await new Promise((res, rej) => { const iv = setInterval(() => { if (done) { clearInterval(iv); res(); } else if (Date.now() - t0 > 60000) { clearInterval(iv); rej(new Error('timeout')); } }, 200); });
chrome.kill(); server.close();
await writeFile(SCRATCH + '/cook_legless_preview.png', Buffer.from(result.preview, 'base64'));
console.log('CUT=' + CUT, 'preview ->', SCRATCH + '/cook_legless_preview.png');
if (APPLY) { await writeFile(OUT, Buffer.from(result.webp, 'base64')); console.log('WROTE', OUT, (Buffer.from(result.webp,'base64').length/1024|0)+'KB'); }
process.exit(0);

function pageHtml() { return `<!doctype html><meta charset=utf8><body><script>
const FW=213, FH=220, NF=24, CUT=${CUT};
function load(src){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=src;});}
const WAIST=118;   // never erase above this (protects the torso from false hits)
const BOOT_Y=180;  // gray below here is boots (erase); above is the pan rim (keep)
// Pants are olive/khaki (r≈g, b notably lower) across a wide brightness range
// (sampled ~96,96,48 up to brighter highlights). Match by HUE, not brightness,
// so no pant shade survives -- while excluding skin/food (r≫g), boots/pan-gray
// (g≈b) and near-white.
const isOlive=(r,g,b,a)=> a>60 && (g>=b+12) && Math.abs(r-g)<30 && r>b && Math.max(r,g,b)<205;
// leg materials to erase: olive pants, bare leg SKIN (orange, greener than the
// red-orange pan food so food survives), and gray BOOTS (low-sat, low only).
const isLegSkin=(r,g,b)=> r>150 && g>=125 && r>g && g>=b && (r-b)>40;
const isBoot=(r,g,b,y)=> (Math.max(r,g,b)-Math.min(r,g,b))<38 && Math.max(r,g,b)>55 && Math.max(r,g,b)<155 && y>=BOOT_Y;
(async()=>{
  const cook=await load('/cook'); const W=cook.naturalWidth,H=cook.naturalHeight;
  const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d',{willReadFrequently:true});
  x.drawImage(cook,0,0); const id=x.getImageData(0,0,W,H); const d=id.data;
  const isSkin=(r,g,b)=> r>150 && g>=120 && r>g && g>=b && (r-b)>35;
  const isFood=(r,g,b)=> r>175 && g<130 && b<100;
  // pan metal = NEUTRAL grey/dark (low saturation). The olive pants are dark but
  // SATURATED (g>b), so they're excluded -> the flood can't leak into the legs.
  const isPanBody=(r,g,b)=>{ const mx=Math.max(r,g,b),mn=Math.min(r,g,b); return (mx-mn)<30 && mx<185; };
  // --- 1. PAN mask: flood from the food out through the pot metal/rim so the
  // cook keeps holding the pan after the legs are wiped. Bounded ABOVE the boots
  // (y<=186) so it can't run down into the dark boots. ---
  const pan=new Uint8Array(W*H); const st=[];
  for(let i=0;i<W*H;i++){ const y=(i/W)|0; if(y<118||y>186) continue; const o=i*4; if(d[o+3]>120 && isFood(d[o],d[o+1],d[o+2])){ pan[i]=1; st.push(i); } }
  while(st.length){ const i=st.pop(); const y=(i/W)|0, X=i%W;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){ const nx=X+dx, ny=y+dy; if(nx<0||nx>=W||ny<118||ny>186) continue; const j=ny*W+nx; if(pan[j])continue; const o=j*4; if(d[o+3]<120)continue; const r=d[o],g=d[o+1],b=d[o+2]; if(isFood(r,g,b)||isPanBody(r,g,b)){ pan[j]=1; st.push(j); } } }
  // --- 2. erase each leg column FULLY (fill + outline cap + boots), preserving
  // the pan. A leg column has pants below the waist; wipe from the top of the
  // leg silhouette (walk up through the dark outline above the pants, stopping
  // at skin/torso) down to the foot. ---
  for(let f=0;f<NF;f++){ for(let lx=0;lx<FW;lx++){ const X=f*FW+lx; let top=-1;
    for(let y=WAIST;y<H;y++){ const o=(y*W+X)*4; if(isOlive(d[o],d[o+1],d[o+2],d[o+3])){ top=y; break; } }
    if(top<0) continue;
    // walk the wipe-top up through the leg's dark outline (not skin, not pan)
    while(top>WAIST){ const o=((top-1)*W+X)*4; if(d[o+3]<120) break; const r=d[o],g=d[o+1],b=d[o+2]; if(isSkin(r,g,b)||pan[(top-1)*W+X]) break; top--; }
    for(let y=top;y<H;y++){ const i=y*W+X; if(pan[i]) continue; d[i*4+3]=0; } } }
  x.putImageData(id,0,0);
  const webp = c.toDataURL('image/webp',0.92).split(',')[1];

  // preview: legless body + committed greaves for 6 sample frames, large + game scale
  const legs=await load('/legs');
  const SAMP=[0,2,4,8,16,20]; const Z=2;
  function comp(f){ const cv=document.createElement('canvas');cv.width=FW;cv.height=FH;const cx=cv.getContext('2d');cx.imageSmoothingEnabled=false;
    cx.drawImage(c, f*FW,0,FW,FH, 0,0,FW,FH); cx.drawImage(legs, f*FW,0,FW,FH, 0,0,FW,FH); return cv; }
  const cols=SAMP.length; const prev=document.createElement('canvas'); prev.width=FW*Z*cols; prev.height=FH*Z+120;
  const px=prev.getContext('2d'); px.imageSmoothingEnabled=false; px.fillStyle='#3a4a6a'; px.fillRect(0,0,prev.width,prev.height);
  for(let i=0;i<cols;i++){ const cv=comp(SAMP[i]); px.drawImage(cv,0,0,FW,FH, i*FW*Z,0,FW*Z,FH*Z);
    const gh=41,gw=Math.round(FW*gh/FH); px.drawImage(cv,0,0,FW,FH, i*FW*Z+(FW*Z-gw*2)/2, FH*Z+10, gw*2, gh*2); }
  await fetch('/r',{method:'POST',body:JSON.stringify({ webp, preview:prev.toDataURL('image/png').split(',')[1] })});
})();
</script></body>`; }
