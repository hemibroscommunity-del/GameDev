/* build_cook_shirt — assemble the cook shirt gear sheet from the owner's contact
 * sheet. For each of the 24 shirts in the 6x4 grid: extract it, convert to a
 * WHITE-base (luminance-normalized, outline preserved) so the in-game Pixi tint
 * recolors it correctly, and place it on the cook body's torso for that frame.
 * Output: a 5112x220 (24x 213x220) strip at the gear path + a tinted preview.
 *
 *   node tools/build_cook_shirt.mjs          (preview -> scratchpad)
 *   APPLY=1 node tools/build_cook_shirt.mjs  (also write the gear sheet)
 *
 * Tunables (env): YTOP (shirt-top y in the 220 frame, default 52),
 *   SCALE (shirt scale vs native, default 1), XOFF (horiz nudge, default 0).
 */
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const GRID = process.argv[2] || '/root/.claude/uploads/67ac1d82-015e-5dc1-bc02-24d0bfd493a3/41efed46-IMG_9934.png';
const COOK = 'public/sprites/skills/cook-strip.webp';
const OUT_SHEET = 'public/sprites/gear/shirt/tshirt/cook-south.png';
const SCRATCH = '/tmp/claude-0/-home-user-GameDev/67ac1d82-015e-5dc1-bc02-24d0bfd493a3/scratchpad';
const APPLY = process.env.APPLY === '1';
const YTOP = +(process.env.YTOP || 52);
const SCALE = +(process.env.SCALE || 1);
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
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', `--user-data-dir=/tmp/bcs-${port}`, `http://127.0.0.1:${port}/`], { stdio: 'ignore' });
const t0 = Date.now();
await new Promise((res, rej) => { const iv = setInterval(() => { if (done) { clearInterval(iv); res(); } else if (Date.now() - t0 > 60000) { clearInterval(iv); rej(new Error('timeout')); } }, 200); });
chrome.kill(); server.close();

await mkdir(SCRATCH, { recursive: true });
await writeFile(SCRATCH + '/cook_shirt_preview.png', Buffer.from(result.preview, 'base64'));
console.log('params: YTOP=' + YTOP, 'SCALE=' + SCALE, 'XOFF=' + XOFF);
console.log('preview ->', SCRATCH + '/cook_shirt_preview.png');
console.log('per-frame headX:', result.headX.join(','));
if (APPLY) {
  await mkdir('public/sprites/gear/shirt/tshirt', { recursive: true });
  await writeFile(OUT_SHEET, Buffer.from(result.sheet, 'base64'));
  console.log('WROTE', OUT_SHEET);
} else {
  await writeFile(SCRATCH + '/cook-south.png', Buffer.from(result.sheet, 'base64'));
  console.log('sheet (preview copy) ->', SCRATCH + '/cook-south.png');
}
process.exit(0);

function pageHtml() { return `<!doctype html><meta charset=utf8><body><script>
const FW=213, FH=220, NF=24, YTOP=${YTOP}, SCALE=${SCALE}, XOFF=${XOFF};
function load(src){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=src;});}
function dataOf(im){const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0);return {c,x,W:c.width,H:c.height,d:x.getImageData(0,0,c.width,c.height).data};}
const isInk=(d,o)=>{const a=d[o+3]; if(a<40)return false; const r=d[o],g=d[o+1],b=d[o+2]; return !(r>235&&g>235&&b>235);};
const isSkin=(r,g,b,a)=> a>60 && r>150 && r>g && g>=b-10 && (r-b)>40;

(async()=>{
  // ---- detect 24 grid blobs (row-major) ----
  const grid=dataOf(await load('/grid')); const {W,H,d}=grid;
  const lab=new Int32Array(W*H); let nb=0; const boxes=[]; const st=[];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){ const idx=y*W+x; if(lab[idx]||!isInk(d,idx*4))continue;
    nb++; let a=x,b2=x,c=y,e=y,cnt=0; st.length=0; st.push(idx); lab[idx]=nb;
    while(st.length){ const p=st.pop(); const px=p%W,py=(p/W)|0; cnt++; if(px<a)a=px;if(px>b2)b2=px;if(py<c)c=py;if(py>e)e=py;
      for(const q of [p-1,p+1,p-W,p+W]){ if(q<0||q>=W*H)continue; if(Math.abs((q%W)-px)>1)continue; if(lab[q]||!isInk(d,q*4))continue; lab[q]=nb; st.push(q); } }
    if(cnt>200) boxes.push({x0:a,y0:c,x1:b2,y1:e}); }
  boxes.sort((p,q)=> (Math.abs(p.y0-q.y0)>40 ? p.y0-q.y0 : p.x0-q.x0));

  // extract each shirt to its own tight canvas, WHITE-base normalized
  function whiteBase(box){
    const w=box.x1-box.x0+1,h=box.y1-box.y0+1;
    const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
    const id=x.createImageData(w,h); const o=id.data;
    // find peak luminance among ink pixels for normalization
    let peak=1; for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){ const so=((box.y0+yy)*W+(box.x0+xx))*4; if(isInk(d,so)){ const L=0.299*d[so]+0.587*d[so+1]+0.114*d[so+2]; if(L>peak)peak=L; } }
    for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){ const so=((box.y0+yy)*W+(box.x0+xx))*4; const to=(yy*w+xx)*4;
      if(!isInk(d,so)){ o[to+3]=0; continue; }
      let L=0.299*d[so]+0.587*d[so+1]+0.114*d[so+2]; let v=Math.min(255,Math.round(L/peak*245));
      o[to]=v;o[to+1]=v;o[to+2]=v;o[to+3]=d[so+3]; }
    x.putImageData(id,0,0); return {c,w,h};
  }
  const shirts=boxes.map(whiteBase);

  // ---- cook body: per-frame head center-x (topmost skin centroid) ----
  const cook=dataOf(await load('/cook')); const CW=cook.W, CD=cook.d;
  const headX=[];
  for(let f=0;f<NF;f++){ // scan the top band for skin, take centroid
    let sx=0,sn=0, firstY=-1;
    for(let y=0;y<90 && sn<400;y++)for(let x=f*FW;x<f*FW+FW;x++){ const o=(y*CW+x)*4; if(isSkin(CD[o],CD[o+1],CD[o+2],CD[o+3])){ if(firstY<0)firstY=y; if(y<firstY+34){ sx+=(x-f*FW); sn++; } } }
    headX.push(sn? Math.round(sx/sn) : 106);
  }

  // ---- assemble the 5112x220 strip ----
  const strip=document.createElement('canvas'); strip.width=FW*NF; strip.height=FH;
  const sx=strip.getContext('2d'); sx.imageSmoothingEnabled=false;
  for(let f=0;f<NF;f++){ const sh=shirts[f]; const dw=Math.round(sh.w*SCALE), dh=Math.round(sh.h*SCALE);
    const dx=Math.round(f*FW + headX[f] - dw/2 + XOFF); const dy=YTOP;
    sx.drawImage(sh.c, 0,0,sh.w,sh.h, dx,dy,dw,dh); }

  // ---- preview: body + tinted shirt for 6 sample frames, large + game-scale ----
  const SAMP=[0,4,8,12,16,20]; const Z=2; const tint=[58,91,208]; // default blue
  // tint helper: multiply white-base by tint
  function tintedFrame(f){
    const cv=document.createElement('canvas');cv.width=FW;cv.height=FH;const cx=cv.getContext('2d');
    // body
    cx.drawImage(cook.c, f*FW,0,FW,FH, 0,0,FW,FH);
    // shirt (tinted): draw strip frame then multiply
    const tmp=document.createElement('canvas');tmp.width=FW;tmp.height=FH;const tx=tmp.getContext('2d');
    tx.drawImage(strip, f*FW,0,FW,FH, 0,0,FW,FH);
    const tid=tx.getImageData(0,0,FW,FH);const td=tid.data;
    for(let i=0;i<td.length;i+=4){ if(td[i+3]>0){ td[i]=td[i]*tint[0]/255; td[i+1]=td[i+1]*tint[1]/255; td[i+2]=td[i+2]*tint[2]/255; } }
    tx.putImageData(tid,0,0);
    cx.drawImage(tmp,0,0);
    return cv;
  }
  const cols=SAMP.length;
  const prev=document.createElement('canvas'); prev.width=FW*Z*cols; prev.height=FH*Z + 60*4;
  const px=prev.getContext('2d'); px.imageSmoothingEnabled=false;
  px.fillStyle='#3a4a6a'; px.fillRect(0,0,prev.width,prev.height);
  for(let i=0;i<cols;i++){ const cv=tintedFrame(SAMP[i]);
    px.drawImage(cv,0,0,FW,FH, i*FW*Z, 0, FW*Z, FH*Z);
    // game-scale (~41px tall) under each
    const gh=41, gw=Math.round(FW*gh/FH); px.imageSmoothingEnabled=false;
    px.drawImage(cv,0,0,FW,FH, i*FW*Z+ (FW*Z-gw*2)/2, FH*Z+10, gw*2, gh*2);
  }
  const out={ sheet: strip.toDataURL('image/png').split(',')[1], preview: prev.toDataURL('image/png').split(',')[1], headX };
  await fetch('/r',{method:'POST',body:JSON.stringify(out)});
})();
</script></body>`; }
