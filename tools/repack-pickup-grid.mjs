/* Reverse of tools/gridify-pickup.mjs: take an owner/ChatGPT-painted pickup
 * GRID (6x5 numbered cells, navy label bands, light-grey studio bg) and
 * re-pack it into the game's horizontal 29-frame strip (256x256 per frame).
 *
 * The editor resizes the grid (e.g. 1564x1524 -> 1254x1254) and doesn't keep
 * the original pixel borders, so we DETECT the layout from the navy label
 * bands (5 full-width dark strips) for the rows and split each band's art
 * region into 6 equal columns.  Per cell we box-resize the whole art region
 * to 256x256 (preserving the character's position within the frame so the
 * animation doesn't jitter), key the light-grey bg + navy borders to
 * transparent, and alpha-bleed the edges.
 *
 * Run: node tools/repack-pickup-grid.mjs <grid.png> <out.png> [--preview]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

function decodePNG(buf){let pos=8,W=0,H=0,ct=6;const idat=[];while(pos<buf.length){const len=buf.readUInt32BE(pos);const t=buf.toString('ascii',pos+4,pos+8);const d=buf.subarray(pos+8,pos+8+len);if(t==='IHDR'){W=d.readUInt32BE(0);H=d.readUInt32BE(4);ct=d[9];}else if(t==='IDAT')idat.push(d);else if(t==='IEND')break;pos+=12+len;}const raw=zlib.inflateSync(Buffer.concat(idat));const spp=ct===6?4:ct===2?3:1;const stride=W*spp;const u=Buffer.alloc(H*stride);let rp=0;for(let y=0;y<H;y++){const f=raw[rp++];for(let x=0;x<stride;x++){const v=raw[rp++];const a=x>=spp?u[y*stride+x-spp]:0;const b=y>0?u[(y-1)*stride+x]:0;const c=(x>=spp&&y>0)?u[(y-1)*stride+x-spp]:0;let val;if(f===0)val=v;else if(f===1)val=v+a;else if(f===2)val=v+b;else if(f===3)val=v+((a+b)>>1);else{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);val=v+(pa<=pb&&pa<=pc?a:pb<=pc?b:c);}u[y*stride+x]=val&0xff;}}const o=Buffer.alloc(W*H*4);for(let i=0;i<W*H;i++){let r,g,b,a=255;if(ct===6){r=u[i*4];g=u[i*4+1];b=u[i*4+2];a=u[i*4+3];}else if(ct===2){r=u[i*3];g=u[i*3+1];b=u[i*3+2];}else{r=g=b=u[i*spp];}o[i*4]=r;o[i*4+1]=g;o[i*4+2]=b;o[i*4+3]=a;}return{W,H,data:o};}
function crc32(b){let c=~0;for(let i=0;i<b.length;i++){c^=b[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xedb88320&-(c&1));}return ~c>>>0;}
function chunk(t,d){const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t,'ascii'),d]);const cr=Buffer.alloc(4);cr.writeUInt32BE(crc32(td));return Buffer.concat([l,td,cr]);}
function encodePNG(W,H,rgba){const sig=Buffer.from([137,80,78,71,13,10,26,10]);const ih=Buffer.alloc(13);ih.writeUInt32BE(W,0);ih.writeUInt32BE(H,4);ih[8]=8;ih[9]=6;const st=W*4;const raw=Buffer.alloc(H*(st+1));for(let y=0;y<H;y++){raw[y*(st+1)]=0;rgba.copy(raw,y*(st+1)+1,y*st,y*st+st);}return Buffer.concat([sig,chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);}

const FW = 256, FH = 256, N = 29, COLS = 6, ROWS = 5;

const isNavy = (r,g,b) => (r+g+b)/3 < 95 && b > r + 6;            // label band / border
/* studio bg is a tight light grey (~235); armor highlights sit <=225 and are
   slightly less neutral, so this only matches the true backdrop. */
const isStudio = (r,g,b) => Math.min(r,g,b) > 224 && (Math.max(r,g,b)-Math.min(r,g,b)) < 18;

const input = process.argv[2], outPath = process.argv[3] || '/tmp/pickup-repacked.png';
const wantPreview = process.argv.includes('--preview');
const src = decodePNG(readFileSync(input));
const { W, H, data } = src;
const at = (x,y)=>{const i=(y*W+x)*4;return [data[i],data[i+1],data[i+2],data[i+3]];};

/* 1. find the 5 navy label bands (full-width dark strips) -> row boundaries. */
const navyFrac = new Array(H).fill(0);
for (let y = 0; y < H; y++) { let n = 0; for (let x = 0; x < W; x++){ const [r,g,b]=at(x,y); if (isNavy(r,g,b)) n++; } navyFrac[y] = n / W; }
const bands = [];
let inB = false, bs = 0;
for (let y = 0; y < H; y++) {
  const hi = navyFrac[y] > 0.45;
  if (hi && !inB) { inB = true; bs = y; }
  else if (!hi && inB) { inB = false; if (y - bs >= 4) bands.push([bs, y]); }
}
if (inB) bands.push([bs, H]);
if (bands.length < ROWS) throw new Error(`only found ${bands.length} label bands, expected ${ROWS}`);
bands.sort((a,b)=>a[0]-b[0]);

/* art strip for row i = from band i bottom to band i+1 top (or image bottom). */
const rowArt = [];
for (let i = 0; i < ROWS; i++) {
  const top = bands[i][1];
  const bot = i + 1 < bands.length ? bands[i+1][0] : H;
  rowArt.push([top, bot]);
}
const colW = W / COLS;

/* keep-largest-components cleanup: drop specks left after keying. */
function cleanup(reg, w, h) {
  const lab = new Int32Array(w*h).fill(-1); const op = i => reg[i*4+3] > 24; const sizes = [];
  for (let s = 0; s < w*h; s++) { if (!op(s) || lab[s] >= 0) continue; let n=0; const st=[s]; lab[s]=sizes.length;
    while (st.length){ const i=st.pop(); n++; const x=i%w,y=(i/w)|0; for (const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){ if(nx<0||ny<0||nx>=w||ny>=h) continue; const j=ny*w+nx; if(op(j)&&lab[j]<0){lab[j]=sizes.length;st.push(j);} } }
    sizes.push(n); }
  for (let i = 0; i < w*h; i++) if (op(i) && sizes[lab[i]] < 60) reg[i*4+3] = 0;
}
function alphaBleed(buf, w, h, iters) {
  const has = new Uint8Array(w*h);
  for (let i = 0; i < w*h; i++) if (buf[i*4+3] > 8) has[i] = 1;
  for (let it = 0; it < iters; it++) { const add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i=y*w+x; if (has[i]) continue;
      let r=0,g=0,b=0,n=0; for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++){ if(!dx&&!dy)continue; const nx=x+dx,ny=y+dy; if(nx<0||ny<0||nx>=w||ny>=h)continue; const j=ny*w+nx; if(has[j]){r+=buf[j*4];g+=buf[j*4+1];b+=buf[j*4+2];n++;} }
      if (n){ buf[i*4]=Math.round(r/n); buf[i*4+1]=Math.round(g/n); buf[i*4+2]=Math.round(b/n); add.push(i); } }
    for (const i of add) has[i] = 1; if (!add.length) break; }
}

const strip = Buffer.alloc(N * FW * FH * 4);
const kept = [];
for (let f = 0; f < N; f++) {
  const gc = f % COLS, gr = (f / COLS) | 0;
  const [aTop, aBot] = rowArt[gr];
  const aLeft = Math.round(gc * colW), aRight = Math.round((gc + 1) * colW);
  const aw = aRight - aLeft, ah = aBot - aTop;
  /* lift the source cell into an opaque RGBA buffer, then FLOOD the bg in from
     the border so interior armor highlights (which can be light grey too) are
     never punched out -- only backdrop connected to the edge is removed. */
  const reg = Buffer.alloc(aw * ah * 4);
  for (let y = 0; y < ah; y++) for (let x = 0; x < aw; x++) {
    const [r,g,b] = at(aLeft + x, aTop + y); const di = (y*aw+x)*4;
    reg[di]=r; reg[di+1]=g; reg[di+2]=b; reg[di+3]=255;
  }
  const isBg = (i) => isStudio(reg[i*4],reg[i*4+1],reg[i*4+2]) || isNavy(reg[i*4],reg[i*4+1],reg[i*4+2]);
  const seen = new Uint8Array(aw*ah); const q = [];
  /* seed from any bg pixel in the outer RING (not just the 1px edge): the cell's
     literal border is the grid line / label-band transition, so studio bg only
     starts a few px in. RING must stay outside the centred character. */
  const RING = 12;
  for (let y = 0; y < ah; y++) for (let x = 0; x < aw; x++) {
    if (x >= RING && x < aw-RING && y >= RING && y < ah-RING) continue;
    const i = y*aw+x; if (!seen[i] && isBg(i)) { seen[i]=1; reg[i*4+3]=0; q.push(i); }
  }
  while (q.length) { const i = q.pop(); const x = i%aw, y = (i/aw)|0;
    for (const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]) { if (nx<0||ny<0||nx>=aw||ny>=ah) continue; const j=ny*aw+nx; if (!seen[j] && isBg(j)) { seen[j]=1; reg[j*4+3]=0; q.push(j); } } }
  cleanup(reg, aw, ah);
  let k = 0; for (let i = 0; i < aw*ah; i++) if (reg[i*4+3] > 24) k++;
  kept.push(k);
  /* box-resize the whole cell art region to 256x256 (position preserved) */
  for (let oy = 0; oy < FH; oy++) for (let ox = 0; ox < FW; ox++) {
    const sx0 = Math.floor(ox*aw/FW), sx1 = Math.max(sx0+1, Math.floor((ox+1)*aw/FW));
    const sy0 = Math.floor(oy*ah/FH), sy1 = Math.max(sy0+1, Math.floor((oy+1)*ah/FH));
    let ar=0,ag=0,ab=0,al=0,n=0; for (let sy=sy0;sy<sy1;sy++) for (let sx=sx0;sx<sx1;sx++){ const i=(sy*aw+sx)*4,a=reg[i+3]/255; ar+=reg[i]*a; ag+=reg[i+1]*a; ab+=reg[i+2]*a; al+=a; n++; }
    const di = (oy*(N*FW)+(f*FW+ox))*4; if (al>0){ strip[di]=Math.round(ar/al); strip[di+1]=Math.round(ag/al); strip[di+2]=Math.round(ab/al); strip[di+3]=Math.round(255*al/n); }
  }
}
alphaBleed(strip, N*FW, FH, 6);
writeFileSync(outPath, encodePNG(N*FW, FH, strip));
console.log(`${outPath}: ${N*FW}x${FH}, bands@${bands.map(b=>b[0]+'-'+b[1]).join(',')}, kept px/frame: ${kept.join(',')}`);

if (wantPreview) {
  const cols2 = 6, rows2 = Math.ceil(N/cols2), DH = 150, DW = Math.round(FW*DH/FH);
  const pW = cols2*DW, pH = rows2*DH; const pv = Buffer.alloc(pW*pH*4);
  for (let i=0;i<pW*pH;i++){pv[i*4]=232;pv[i*4+1]=233;pv[i*4+2]=238;pv[i*4+3]=255;}
  for (let f=0;f<N;f++){ const gc=f%cols2,gr=(f/cols2)|0;
    for (let y=0;y<DH;y++) for (let x=0;x<DW;x++){ const sx=f*FW+Math.floor(x*FW/DW), sy=Math.floor(y*FH/DH); const si=(sy*(N*FW)+sx)*4,a=strip[si+3]/255; if(a<=0)continue; const dx=gc*DW+x,dy=gr*DH+y,di=(dy*pW+dx)*4; for(let k=0;k<3;k++)pv[di+k]=Math.round(strip[si+k]*a+pv[di+k]*(1-a)); } }
  const pp = outPath.replace(/\.png$/, '-preview.png');
  writeFileSync(pp, encodePNG(pW, pH, pv));
  console.log(`wrote ${pp}`);
}
