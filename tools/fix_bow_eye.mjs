/* fix_bow_eye — the south bow stand-in's camera-LEFT eye is drawn ~2x the size
 * of the camera-RIGHT eye (an oversized pure-white sclera that reads as a
 * "keyed-out" blank). For each frame of each south bow sheet, detect both eyes,
 * erase the left one to skin, and stamp a copy of the (well-formed) right eye at
 * the left eye's position — same gaze, matched size. Writes fixed PNGs to an
 * out dir and a before/after montage. APPLY=1 writes back to the originals.
 *
 * Usage: node tools/fix_bow_eye.mjs            (preview -> scratchpad)
 *        APPLY=1 node tools/fix_bow_eye.mjs    (overwrite the source PNGs)
 */
import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SCRATCH = '/tmp/claude-0/-home-user-GameDev/67ac1d82-015e-5dc1-bc02-24d0bfd493a3/scratchpad';
const APPLY = process.env.APPLY === '1';
/* Only frame 0 (the bow "load" pose) has the oversized white-block camera-left
   eye; frames 1/2 are a 3/4 turn and a dark-eyed release that are already fine.
   Body + torso carry the (identical) in-game face; the base sheet isn't used for
   south (bodyFrames exist), so leave it untouched. */
const FIX_FRAMES = new Set([0]);
const SHEETS = [
  { file: 'public/sprites/player/bow-south-body.png',  fw: 130 },
  { file: 'public/sprites/player/bow-south-torso.png', fw: 130 },
];
let result = null; let done = false;
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(pageHtml()); }
  else if (u.pathname === '/img') { res.writeHead(200, { 'content-type': 'image/png' }); res.end(await readFile(SHEETS[+u.searchParams.get('i')].file)); }
  else if (u.pathname === '/r' && req.method === 'POST') { const c = []; for await (const x of req) c.push(x); result = JSON.parse(Buffer.concat(c).toString()); done = true; res.writeHead(200); res.end('ok'); }
  else { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', `--user-data-dir=/tmp/fbe-${port}`, `http://127.0.0.1:${port}/`], { stdio: 'ignore' });
const t0 = Date.now();
await new Promise((res, rej) => { const iv = setInterval(() => { if (done) { clearInterval(iv); res(); } else if (Date.now() - t0 > 60000) { clearInterval(iv); rej(new Error('timeout')); } }, 200); });
chrome.kill(); server.close();

await writeFile(SCRATCH + '/bow_eye_before_after.png', Buffer.from(result.montage, 'base64'));
console.log('montage ->', SCRATCH + '/bow_eye_before_after.png');
for (const s of result.sheets) console.log(s.file, '| frames fixed:', JSON.stringify(s.log));
if (APPLY) {
  for (const s of result.sheets) { await writeFile(s.file, Buffer.from(s.png, 'base64')); console.log('WROTE', s.file); }
} else {
  for (const s of result.sheets) { const o = SCRATCH + '/' + s.file.split('/').pop(); await writeFile(o, Buffer.from(s.png, 'base64')); console.log('preview ->', o); }
}
process.exit(0);

function pageHtml() { return `<!doctype html><meta charset=utf8><body><script>
const SHEETS=${JSON.stringify(SHEETS)};
function load(src){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=src;});}
const isWhite=(r,g,b,a)=> a>120 && Math.min(r,g,b)>=180 && Math.max(r,g,b)>=200;
const isDark =(r,g,b,a)=> a>120 && Math.max(r,g,b)<70;
const isEye  =(r,g,b,a)=> isWhite(r,g,b,a)||isDark(r,g,b,a);
const Y0=57, Y1=66; // eye band (below the brow bar)

function processFrame(d,W,x0,fw){
  // gather eye pixels in band, within the central face x-range of this frame
  const fx0=x0+Math.round(fw*0.30), fx1=x0+Math.round(fw*0.72);
  const pts=[];
  for(let y=Y0;y<Y1;y++) for(let x=fx0;x<fx1;x++){ const o=(y*W+x)*4;
    if(isEye(d[o],d[o+1],d[o+2],d[o+3])) pts.push([x,y]); }
  if(pts.length<4) return null;
  // cluster by x into two groups (largest x-gap splits left/right)
  const xs=[...new Set(pts.map(p=>p[0]))].sort((a,b)=>a-b);
  let gap=0,split=xs[0];
  for(let i=1;i<xs.length;i++){ if(xs[i]-xs[i-1]>gap){ gap=xs[i]-xs[i-1]; split=xs[i]; } }
  if(gap<3) return null; // couldn't separate two eyes
  const L=pts.filter(p=>p[0]<split), R=pts.filter(p=>p[0]>=split);
  if(!L.length||!R.length) return null;
  const bbox=(g)=>{let a=1e9,b=1e9,c=-1,e=-1;for(const[x,y]of g){a=Math.min(a,x);b=Math.min(b,y);c=Math.max(c,x);e=Math.max(e,y);}return{x0:a,y0:b,x1:c,y1:e,cx:(a+c)/2,cy:(b+e)/2};};
  const lb=bbox(L), rb=bbox(R);
  /* Only act when the LEFT eye is the oversized white-block bug: it must carry a
     real white sclera AND be wider than the right (good) eye. Frame 1 is a 3/4
     turn whose single visible eye is dark -> guarded out so we don't touch it.
     The right cluster must also be a plausible eye (>=2px), not the face edge. */
  const whiteCount=(g)=>g.reduce((n,[x,y])=>{const o=(y*W+x)*4;return n+(isWhite(d[o],d[o+1],d[o+2],d[o+3])?1:0);},0);
  const lWhite=whiteCount(L), rW=rb.x1-rb.x0+1, lW=lb.x1-lb.x0+1;
  if(lWhite<6 || lW<rW+2 || rW<2) return {skip:true,lWhite,lW,rW};
  // skin sample: a couple px below the left eye
  const sxo=((lb.y1+3)*W+Math.round(lb.cx))*4; const skin=[d[sxo],d[sxo+1],d[sxo+2],255];
  // erase left eye -> skin (pad 1px)
  for(let y=lb.y0-1;y<=lb.y1+1;y++) for(let x=lb.x0-1;x<=lb.x1+1;x++){ const o=(y*W+x)*4; if(d[o+3]>120){ d[o]=skin[0];d[o+1]=skin[1];d[o+2]=skin[2]; } }
  // stamp right-eye pixels centered at left eye center (un-mirrored: same gaze)
  const dx=Math.round(lb.cx-rb.cx), dy=Math.round(lb.cy-rb.cy);
  const copy=[];
  for(let y=rb.y0;y<=rb.y1;y++) for(let x=rb.x0;x<=rb.x1;x++){ const o=(y*W+x)*4;
    if(isEye(d[o],d[o+1],d[o+2],d[o+3])) copy.push([x+dx,y+dy,d[o],d[o+1],d[o+2],d[o+3]]); }
  for(const[x,y,r,g,b,a]of copy){ const o=(y*W+x)*4; d[o]=r;d[o+1]=g;d[o+2]=b;d[o+3]=a; }
  return {lb,rb,dx,dy,n:copy.length};
}

(async()=>{
  const out={sheets:[]};
  const before=[], after=[];
  for(let i=0;i<SHEETS.length;i++){
    const sh=SHEETS[i]; const im=await load('/img?i='+i);
    const W=im.naturalWidth,H=im.naturalHeight;
    const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
    x.imageSmoothingEnabled=false; x.drawImage(im,0,0);
    const id=x.getImageData(0,0,W,H); const d=id.data;
    // snapshot before (heads only)
    before.push({W,H,buf:Uint8ClampedArray.from(d)});
    const frames=Math.max(1,Math.round(W/sh.fw)); const log=[];
    const FIX=new Set(${JSON.stringify([...FIX_FRAMES])});
    for(let f=0;f<frames;f++){ if(!FIX.has(f)){ log.push('f'+f+':untouched'); continue; } const r=processFrame(d,W,f*sh.fw,sh.fw); log.push(!r?('f'+f+':none'):(r.skip?('f'+f+':skip(lW='+r.lW+',rW='+r.rW+',wht='+r.lWhite+')'):('f'+f+':fix('+r.n+')'))); }
    x.putImageData(id,0,0);
    after.push({W,H,canvas:c});
    out.sheets.push({file:sh.file,log,png:c.toDataURL('image/png').split(',')[1]});
  }
  // build before/after montage: head crops, zoom 7, before-row then after-row per sheet
  const FW=130, HEADH=72, Z=7;
  const cols=3;
  const mont=document.createElement('canvas');
  mont.width=FW*cols*Z; mont.height=HEADH*Z*2*SHEETS.length;
  const mx=mont.getContext('2d'); mx.imageSmoothingEnabled=false;
  mx.fillStyle='#2222aa'; mx.fillRect(0,0,mont.width,mont.height);
  for(let i=0;i<SHEETS.length;i++){
    // before
    const bc=document.createElement('canvas');bc.width=before[i].W;bc.height=before[i].H;
    bc.getContext('2d').putImageData(new ImageData(before[i].buf,before[i].W,before[i].H),0,0);
    for(let f=0;f<cols;f++){ mx.drawImage(bc, f*FW,0,FW,HEADH, f*FW*Z, (i*2)*HEADH*Z, FW*Z,HEADH*Z); }
    // after
    for(let f=0;f<cols;f++){ mx.drawImage(after[i].canvas, f*FW,0,FW,HEADH, f*FW*Z, (i*2+1)*HEADH*Z, FW*Z,HEADH*Z); }
  }
  out.montage=mont.toDataURL('image/png').split(',')[1];
  await fetch('/r',{method:'POST',body:JSON.stringify(out)});
})();
</script></body>`; }
