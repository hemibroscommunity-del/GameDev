/* Strip the baked sword out of a swing BODY sheet.

   The swing body sheets (sword-<dir>-body.png) have the old sword baked into
   them; the recolorable weapon overlay (sword-<dir>-weapon.png) draws on top.
   Once the weapon is re-arted to metal (shorter / different shape than the old
   baked sword), the baked sword peeks out around + past the steel blade as a
   dark "purple" smear.  This removes it WITHOUT touching the character: clear
   only the sword-ish pixels (grey/dark/bluish — never the orange skin or olive
   pants) under the weapon's dilated mask, then a final violet-only cleanup for
   the down-pointing frames whose baked tip reaches past the mask.  Skin / pants
   / shoes are preserved, so the runtime skin/pants/shoes recolour still works.

   Run: node tools/strip-body-sword.mjs <south|east|north> [--preview] */
import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

const CFG = { south: { FW: 320, FH: 320, N: 14 }, east: { FW: 402, FH: 246, N: 11 }, north: { FW: 340, FH: 227, N: 9 } };

function decodePNG(buf){let pos=8,W=0,H=0,ct=6;const idat=[];while(pos<buf.length){const len=buf.readUInt32BE(pos);const t=buf.toString('ascii',pos+4,pos+8);const d=buf.subarray(pos+8,pos+8+len);if(t==='IHDR'){W=d.readUInt32BE(0);H=d.readUInt32BE(4);ct=d[9];}else if(t==='IDAT')idat.push(d);else if(t==='IEND')break;pos+=12+len;}const raw=zlib.inflateSync(Buffer.concat(idat));const spp=ct===6?4:ct===2?3:1,stride=W*spp,u=Buffer.alloc(H*stride);let rp=0;for(let y=0;y<H;y++){const f=raw[rp++];for(let x=0;x<stride;x++){const v=raw[rp++];const a=x>=spp?u[y*stride+x-spp]:0,b=y>0?u[(y-1)*stride+x]:0,c=(x>=spp&&y>0)?u[(y-1)*stride+x-spp]:0;let val;if(f===0)val=v;else if(f===1)val=v+a;else if(f===2)val=v+b;else if(f===3)val=v+((a+b)>>1);else{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);val=v+(pa<=pb&&pa<=pc?a:pb<=pc?b:c);}u[y*stride+x]=val&0xff;}}const o=Buffer.alloc(W*H*4);for(let i=0;i<W*H;i++){let r,g,b,a=255;if(ct===6){r=u[i*4];g=u[i*4+1];b=u[i*4+2];a=u[i*4+3];}else if(ct===2){r=u[i*3];g=u[i*3+1];b=u[i*3+2];}else{r=g=b=u[i*spp];}o[i*4]=r;o[i*4+1]=g;o[i*4+2]=b;o[i*4+3]=a;}return{W,H,data:o};}
function crc32(b){let c=~0;for(let i=0;i<b.length;i++){c^=b[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xedb88320&-(c&1));}return ~c>>>0;}
function chunk(t,d){const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t,'ascii'),d]);const cr=Buffer.alloc(4);cr.writeUInt32BE(crc32(td));return Buffer.concat([l,td,cr]);}
function encodePNG(W,H,r){const sig=Buffer.from([137,80,78,71,13,10,26,10]);const ih=Buffer.alloc(13);ih.writeUInt32BE(W,0);ih.writeUInt32BE(H,4);ih[8]=8;ih[9]=6;const st=W*4,raw=Buffer.alloc(H*(st+1));for(let y=0;y<H;y++){raw[y*(st+1)]=0;r.copy(raw,y*(st+1)+1,y*st,y*st+st);}return Buffer.concat([sig,chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);}

const dir = process.argv[2]; const cfg = CFG[dir]; if (!cfg) throw new Error('dir must be south|east|north');
const body = decodePNG(readFileSync(`public/sprites/player/sword-${dir}-body.png`));
const wpn = decodePNG(readFileSync(`public/sprites/player/sword-${dir}-weapon.png`));
const W = body.W, H = body.H;
const R = 34;   // reach past the weapon so the longer baked blade tip is covered

/* The character's own colours we must NEVER clear: skin (orange/red) and pants
   (olive/green).  Everything else near the weapon (grey / dark / bluish steel +
   the sword's outline) is the baked sword. */
const isBody = (i) => {
  const r = body.data[i*4], g = body.data[i*4+1], b = body.data[i*4+2];
  const skin = r > g + 16 && r > b + 16;             // orange skin
  const pants = g >= r - 4 && g > b + 6;             // olive pants
  return skin || pants;
};
/* weapon opaque mask, dilated by R. */
const m = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) if (wpn.data[i*4+3] > 40) m[i] = 1;
const md = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (!m[y*W+x]) continue;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const nx = x+dx, ny = y+dy; if (nx<0||ny<0||nx>=W||ny>=H) continue;
    if (dx*dx+dy*dy <= R*R) md[ny*W+nx] = 1;
  }
}
/* clear only sword-ish pixels under the dilated mask — skin + pants survive. */
let cleared = 0;
for (let i = 0; i < W * H; i++) {
  if (!md[i] || body.data[i*4+3] === 0) continue;
  if (isBody(i)) continue;          // keep the character's skin / pants
  body.data[i*4+3] = 0; cleared++;
}
/* Final cleanup: strongly-VIOLET leftovers anywhere — the down-pointing frames'
   baked blade tip can stick out past the dilation reach, and the body itself has
   no violet (skin=orange, pants=olive, shoes=neutral grey), so this is safe. */
for (let i = 0; i < W * H; i++) {
  if (body.data[i*4+3] === 0) continue;
  const r = body.data[i*4], g = body.data[i*4+1], b = body.data[i*4+2];
  if (b > r + 15 && b > g + 8) { body.data[i*4+3] = 0; cleared++; }
}
writeFileSync(`public/sprites/player/sword-${dir}-body.png`, encodePNG(W, H, body.data));
console.log(`stripped baked sword from sword-${dir}-body.png (cleared ${cleared} sword-ish px, kept skin+pants)`);
