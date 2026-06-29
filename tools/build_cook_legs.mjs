/* build_cook_legs — assemble the cook leg-armor gear sheet from the owner's
 * labelled 6x4 contact sheet. Cells 0-17 hold armor (rows 1-3); the empty row 4
 * frames (18-23) reuse frame 17. Each cell's armor is everything non-white in
 * the cell interior (keeps the grey metal + outline + shading as-is — leg armor
 * is NOT tinted in-game), placed over the cook body's legs for that frame.
 * Output: /sprites/gear/legs/steelgreaves/cook-south.png (5112x220) + preview.
 *
 *   node tools/build_cook_legs.mjs           (preview -> scratchpad)
 *   APPLY=1 node tools/build_cook_legs.mjs   (also write the gear sheet)
 * Tunables (env): YTOP (armor-top y, default 104), SCALE (default 0.6), XOFF (0).
 */
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const GRID = process.argv[2] || '/root/.claude/uploads/67ac1d82-015e-5dc1-bc02-24d0bfd493a3/aa4a79a7-43CC00BF8DE4431EA7D5BC7DDEDF993D.png';
const COOK = 'public/sprites/skills/cook-strip.webp';
const OUT_SHEET = 'public/sprites/gear/legs/steelgreaves/cook-south.png';
const SCRATCH = '/tmp/claude-0/-home-user-GameDev/67ac1d82-015e-5dc1-bc02-24d0bfd493a3/scratchpad';
const APPLY = process.env.APPLY === '1';
const YTOP = +(process.env.YTOP || 104);
const SCALE = +(process.env.SCALE || 0.6);
const XOFF = +(process.env.XOFF || 0);

let result = null, done = false;
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(pageHtml()); }
  else if (u.pathname === '/grid') { res.writeHead(200, { 'content-type': 'image/png' }); res.end(await readFile(GRID)); }
  else if (u.pathname === '/cook') { res.writeHead(200, { 'content-type': 'image/webp' }); res.end(await readFile(COOK)); }
  else if (u.pathname === '/r' && req.method === 'POST') { const c = []; for await (const x of req) c.push(x); result = JSON.parse(Buffer.concat(c).toString()); done = true; res.writeHead(200); res.end('ok'); }
  else { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', `--user-data-dir=/tmp/bcl-${port}`, `http://127.0.0.1:${port}/`], { stdio: 'ignore' });
const t0 = Date.now();
await new Promise((res, rej) => { const iv = setInterval(() => { if (done) { clearInterval(iv); res(); } else if (Date.now() - t0 > 60000) { clearInterval(iv); rej(new Error('timeout')); } }, 200); });
chrome.kill(); server.close();

await mkdir(SCRATCH, { recursive: true });
await writeFile(SCRATCH + '/cook_legs_preview.png', Buffer.from(result.preview, 'base64'));
console.log('params: YTOP=' + YTOP, 'SCALE=' + SCALE, 'XOFF=' + XOFF);
console.log('filled:', result.filled, 'healed:', result.healed, 'legCx:', result.legCx.slice(0,6).join(','));
console.log('preview ->', SCRATCH + '/cook_legs_preview.png');
if (APPLY) {
  await mkdir('public/sprites/gear/legs/steelgreaves', { recursive: true });
  await writeFile(OUT_SHEET, Buffer.from(result.sheet, 'base64'));
  console.log('WROTE', OUT_SHEET);
} else {
  await writeFile(SCRATCH + '/legs-cook-south.png', Buffer.from(result.sheet, 'base64'));
}
process.exit(0);

function pageHtml() { return `<!doctype html><meta charset=utf8><body><script>
const FW=213, FH=220, NF=24, YTOP=${YTOP}, SCALE=${SCALE}, XOFF=${XOFF};
function load(src){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=src;});}
function dataOf(im){const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0);return {c,x,W:c.width,H:c.height,d:x.getImageData(0,0,c.width,c.height).data};}
const isWhiteBg=(r,g,b)=> r>232&&g>232&&b>232;
const isOlive=(r,g,b,a)=> a>60 && g>b+12 && r>b && Math.max(r,g,b)<150 && g>50;
(async()=>{
  const grid=dataOf(await load('/grid')); const {W,H,d}=grid;
  const COLS=6,ROWS=4, CW=W/COLS, CH=H/ROWS;
  // armor pixel = opaque, not white background, LOW saturation (excludes the
  // yellow label text) -- captures grey metal + its near-black outline/shading.
  const sat=(r,g,b)=> Math.max(r,g,b)-Math.min(r,g,b);
  // greave pixel = any non-white, low-saturation pixel (keeps the full metallic
  // range: highlight -> mid grey -> dark outline). Yellow label text is dropped
  // by saturation; the black label bar / borders are excluded SPATIALLY by the
  // generous top/side insets + the tall-blob filter below.
  const isArmorPx=(o)=> d[o+3]>120 && !isWhiteBg(d[o],d[o+1],d[o+2]) && sat(d[o],d[o+1],d[o+2])<55;
  // extract armor per cell, keeping only LARGE connected blobs (drops the black
  // label-bar text/lines that survive the colour test). Top inset clears the bar.
  function cellArmor(ci){ const c=ci%COLS, r=(ci/COLS)|0;
    const X0=Math.round(c*CW+16),X1=Math.round((c+1)*CW-16),Y0=Math.round(r*CH+74),Y1=Math.round((r+1)*CH-42);
    const cw2=X1-X0, ch2=Y1-Y0; if(cw2<10||ch2<10) return null;
    const N=cw2*ch2;
    // raw armor mask over the interior
    const raw=new Uint8Array(N);
    for(let y=0;y<ch2;y++)for(let x=0;x<cw2;x++){ const o=((Y0+y)*W+(X0+x))*4; if(isArmorPx(o)) raw[y*cw2+x]=1; }
    // ERODE 1px (4-conn): severs thin border/divider lines + the thin bridges
    // that tie a row label bar to a greave, so they split into their own blobs.
    const er=new Uint8Array(N);
    for(let y=1;y<ch2-1;y++)for(let x=1;x<cw2-1;x++){ const i=y*cw2+x; if(raw[i]&&raw[i-1]&&raw[i+1]&&raw[i-cw2]&&raw[i+cw2]) er[i]=1; }
    // connected components on the eroded mask
    const lab=new Int32Array(N); let nb=0; const comps=[]; const st=[];
    for(let i=0;i<N;i++){ if(lab[i]||!er[i])continue; nb++; let a=i%cw2,b2=a,cc=(i/cw2)|0,e=cc,cnt=0; st.length=0; st.push(i); lab[i]=nb;
      while(st.length){ const p=st.pop(); const px=p%cw2, py=(p/cw2)|0; cnt++; if(px<a)a=px;if(px>b2)b2=px;if(py<cc)cc=py;if(py>e)e=py;
        for(const q of [p-1,p+1,p-cw2,p+cw2]){ if(q<0||q>=N)continue; if(Math.abs((q%cw2)-px)>1)continue; if(lab[q]||!er[q])continue; lab[q]=nb; st.push(q); } }
      comps.push({id:nb,a,b2,cc,e,cnt,bw:b2-a+1,bh:e-cc+1}); }
    // keep the two largest greave-SHAPED blobs (tall, chunky); drops label bars
    // (short) + lines (thin/extreme aspect) now that erosion split them off.
    const shaped=comps.filter(k=> k.bh>70 && k.bw>18 && (k.bw/k.bh)>0.3 && (k.bw/k.bh)<1.8).sort((p,q)=> q.cnt-p.cnt).slice(0,2);
    if(!shaped.length) return null;
    const ka=new Set(shaped.map(k=>k.id));
    // DILATE the kept blobs back by 2px and AND with the raw mask -> restores the
    // greave edges lost to erosion without re-attaching the severed artifacts.
    const keepMask=new Uint8Array(N);
    for(let i=0;i<N;i++) if(ka.has(lab[i])) keepMask[i]=1;
    const grow=new Uint8Array(N);
    for(let pass=0;pass<2;pass++){ const src=pass?grow.slice():keepMask;
      for(let y=1;y<ch2-1;y++)for(let x=1;x<cw2-1;x++){ const i=y*cw2+x; if(src[i]||src[i-1]||src[i+1]||src[i-cw2]||src[i+cw2]) grow[i]=1; } }
    let a=1e9,b2=-1,cc=1e9,e=-1; for(let i=0;i<N;i++){ if(grow[i]&&raw[i]){ const x=i%cw2,y=(i/cw2)|0; if(x<a)a=x;if(x>b2)b2=x;if(y<cc)cc=y;if(y>e)e=y; } }
    if(b2<0) return null;
    const w=b2-a+1,h=e-cc+1; const cv=document.createElement('canvas');cv.width=w;cv.height=h;const cx=cv.getContext('2d');
    const id=cx.createImageData(w,h); const o2=id.data;
    const rowW=new Int32Array(h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){ const ii=(cc+y)*cw2+(a+x); if(!(grow[ii]&&raw[ii])){ o2[(y*w+x)*4+3]=0; continue; }
      const so=((Y0+cc+y)*W+(X0+a+x))*4; const to=(y*w+x)*4; o2[to]=d[so];o2[to+1]=d[so+1];o2[to+2]=d[so+2];o2[to+3]=d[so+3]; rowW[y]++; }
    cx.putImageData(id,0,0);
    // contaminated if a near-full-width bar survives in the bottom third (a row
    // label/border that merged with a greave) -> caller substitutes a neighbour.
    let bad=false; for(let y=Math.floor(h*0.6);y<h;y++) if(rowW[y]>w*0.8){ bad=true; break; }
    return {cv,w,h,bad};
  }
  const armor=[]; let filled=0;
  for(let i=0;i<18;i++){ const aimg=cellArmor(i); if(aimg)filled++; armor.push(aimg); }
  // heal contaminated frames (label/border merged into a greave) by reusing the
  // nearest clean neighbour -- the leg pose barely changes frame to frame.
  let healed=0;
  for(let i=0;i<18;i++){ if(armor[i]&&!armor[i].bad) continue;
    let rep=null; for(let r=1;r<18;r++){ if(armor[i-r]&&!armor[i-r].bad){rep=armor[i-r];break;} if(armor[i+r]&&!armor[i+r].bad){rep=armor[i+r];break;} }
    if(rep){ armor[i]=rep; healed++; } }
  // owner: the per-source-frame greave spacing varies and one frame keeps coming
  // back with a huge gap -> just use the FIRST clean frame's greaves for every
  // frame. The legs barely move during cooking, and each frame is still placed
  // at its own per-frame leg position (legCx), so it still tracks the body.
  const f0 = armor.find(a => a && !a.bad) || armor[0];
  for(let i=0;i<NF;i++) armor[i]=f0;

  // cook leg center per frame
  const cook=dataOf(await load('/cook')); const CKW=cook.W, CKD=cook.d; const legCx=[];
  for(let f=0;f<NF;f++){ let sx=0,sn=0; for(let y=100;y<200;y++)for(let x=f*FW;x<f*FW+FW;x++){ const o=(y*CKW+x)*4; if(isOlive(CKD[o],CKD[o+1],CKD[o+2],CKD[o+3])){ sx+=(x-f*FW); sn++; } } legCx.push(sn?Math.round(sx/sn):96); }

  // assemble strip
  const strip=document.createElement('canvas'); strip.width=FW*NF; strip.height=FH; const sx=strip.getContext('2d'); sx.imageSmoothingEnabled=false;
  for(let f=0;f<NF;f++){ const A=armor[f]; if(!A)continue; const dw=Math.round(A.w*SCALE), dh=Math.round(A.h*SCALE);
    const dx=Math.round(f*FW + legCx[f] - dw/2 + XOFF), dy=YTOP; sx.drawImage(A.cv,0,0,A.w,A.h, dx,dy,dw,dh); }

  // preview: cook body + armor (as-is) for sample frames, large + game scale
  const SAMP=[0,4,8,12,16,20]; const Z=2;
  function comp(f){ const cv=document.createElement('canvas');cv.width=FW;cv.height=FH;const cx=cv.getContext('2d'); cx.imageSmoothingEnabled=false;
    cx.drawImage(cook.c, f*FW,0,FW,FH, 0,0,FW,FH); cx.drawImage(strip, f*FW,0,FW,FH, 0,0,FW,FH); return cv; }
  const cols=SAMP.length; const prev=document.createElement('canvas'); prev.width=FW*Z*cols; prev.height=FH*Z+120;
  const px=prev.getContext('2d'); px.imageSmoothingEnabled=false; px.fillStyle='#3a4a6a'; px.fillRect(0,0,prev.width,prev.height);
  for(let i=0;i<cols;i++){ const cv=comp(SAMP[i]); px.drawImage(cv,0,0,FW,FH, i*FW*Z,0,FW*Z,FH*Z);
    const gh=41,gw=Math.round(FW*gh/FH); px.drawImage(cv,0,0,FW,FH, i*FW*Z+(FW*Z-gw*2)/2, FH*Z+10, gw*2, gh*2); }
  await fetch('/r',{method:'POST',body:JSON.stringify({ sheet:strip.toDataURL('image/png').split(',')[1], preview:prev.toDataURL('image/png').split(',')[1], filled, legCx, healed })});
})();
</script></body>`; }
