/* Strip the baked sword out of a swing BODY sheet.

   The swing body sheets (sword-<dir>-body.png) have the old sword baked into
   them; the recolorable weapon overlay (sword-<dir>-weapon.png) draws on top.
   Once the weapon is re-arted to metal (shorter / different shape than the old
   baked sword), the baked sword peeks out around + past the steel blade as a
   dark "purple" smear.  This removes it: clear the body wherever the weapon
   covers (dilated), then drop the now-detached leftover blade tip by keeping
   only the largest connected component per frame (the body itself).  The body's
   skin/pants/shoes template colours are untouched, so the runtime recolour
   still works.

   Run: node tools/strip-body-sword.mjs <south|east|north> [--preview] */
import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

const CFG = { south: { FW: 320, FH: 320, N: 14 }, east: { FW: 402, FH: 246, N: 11 }, north: { FW: 340, FH: 227, N: 9 } };
const DILATE = 7;

function decodePNG(buf){let pos=8,W=0,H=0,ct=6;const idat=[];while(pos<buf.length){const len=buf.readUInt32BE(pos);const t=buf.toString('ascii',pos+4,pos+8);const d=buf.subarray(pos+8,pos+8+len);if(t==='IHDR'){W=d.readUInt32BE(0);H=d.readUInt32BE(4);ct=d[9];}else if(t==='IDAT')idat.push(d);else if(t==='IEND')break;pos+=12+len;}const raw=zlib.inflateSync(Buffer.concat(idat));const spp=ct===6?4:ct===2?3:1,stride=W*spp,u=Buffer.alloc(H*stride);let rp=0;for(let y=0;y<H;y++){const f=raw[rp++];for(let x=0;x<stride;x++){const v=raw[rp++];const a=x>=spp?u[y*stride+x-spp]:0,b=y>0?u[(y-1)*stride+x]:0,c=(x>=spp&&y>0)?u[(y-1)*stride+x-spp]:0;let val;if(f===0)val=v;else if(f===1)val=v+a;else if(f===2)val=v+b;else if(f===3)val=v+((a+b)>>1);else{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);val=v+(pa<=pb&&pa<=pc?a:pb<=pc?b:c);}u[y*stride+x]=val&0xff;}}const o=Buffer.alloc(W*H*4);for(let i=0;i<W*H;i++){let r,g,b,a=255;if(ct===6){r=u[i*4];g=u[i*4+1];b=u[i*4+2];a=u[i*4+3];}else if(ct===2){r=u[i*3];g=u[i*3+1];b=u[i*3+2];}else{r=g=b=u[i*spp];}o[i*4]=r;o[i*4+1]=g;o[i*4+2]=b;o[i*4+3]=a;}return{W,H,data:o};}
function crc32(b){let c=~0;for(let i=0;i<b.length;i++){c^=b[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xedb88320&-(c&1));}return ~c>>>0;}
function chunk(t,d){const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t,'ascii'),d]);const cr=Buffer.alloc(4);cr.writeUInt32BE(crc32(td));return Buffer.concat([l,td,cr]);}
function encodePNG(W,H,r){const sig=Buffer.from([137,80,78,71,13,10,26,10]);const ih=Buffer.alloc(13);ih.writeUInt32BE(W,0);ih.writeUInt32BE(H,4);ih[8]=8;ih[9]=6;const st=W*4,raw=Buffer.alloc(H*(st+1));for(let y=0;y<H;y++){raw[y*(st+1)]=0;r.copy(raw,y*(st+1)+1,y*st,y*st+st);}return Buffer.concat([sig,chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);}

const dir = process.argv[2]; const cfg = CFG[dir]; if (!cfg) throw new Error('dir must be south|east|north');
const { FW, FH, N } = cfg;
const body = decodePNG(readFileSync(`public/sprites/player/sword-${dir}-body.png`));
const wpn = decodePNG(readFileSync(`public/sprites/player/sword-${dir}-weapon.png`));
const W = body.W, H = body.H;
/* 1) clear body wherever the weapon covers, dilated by DILATE. */
const m = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) if (wpn.data[i*4+3] > 40) m[i] = 1;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (!m[y*W+x]) continue;
  for (let dy = -DILATE; dy <= DILATE; dy++) for (let dx = -DILATE; dx <= DILATE; dx++) {
    const nx = x+dx, ny = y+dy; if (nx<0||ny<0||nx>=W||ny>=H) continue;
    if (dx*dx+dy*dy <= DILATE*DILATE) body.data[(ny*W+nx)*4+3] = 0;   // mark; applied after (read original alpha for mask already captured in m)
  }
}
/* 2) per frame, keep only the largest connected component (drop the detached
      leftover blade tip that stuck out past the shorter steel sword). */
for (let f = 0; f < N; f++) {
  const ox = f * FW;
  const lab = new Int32Array(FW * FH).fill(-1);
  const op = (lx, ly) => body.data[(ly*W + ox + lx)*4+3] > 24;
  let best = -1, bestN = 0; const comps = [];
  for (let s = 0; s < FW*FH; s++) { const sx = s%FW, sy = (s/FW)|0; if (!op(sx,sy) || lab[s] >= 0) continue;
    let n = 0; const st = [s]; lab[s] = comps.length;
    while (st.length) { const i = st.pop(); n++; const x = i%FW, y = (i/FW)|0; for (const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]) { if (nx<0||ny<0||nx>=FW||ny>=FH) continue; const j = ny*FW+nx; if (op(nx,ny) && lab[j] < 0) { lab[j] = comps.length; st.push(j); } } }
    comps.push(n); if (n > bestN) { bestN = n; best = comps.length-1; } }
  for (let s = 0; s < FW*FH; s++) { const sx = s%FW, sy = (s/FW)|0; if (op(sx,sy) && lab[s] !== best) body.data[(sy*W + ox + sx)*4+3] = 0; }
}
writeFileSync(`public/sprites/player/sword-${dir}-body.png`, encodePNG(W, H, body.data));
console.log(`stripped baked sword from sword-${dir}-body.png`);
