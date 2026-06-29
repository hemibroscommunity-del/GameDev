/* Clear a thin border ring from every frame of a 256x256 sprite strip.
 *
 * The repack of the chest gear left a ~2px grid-border line on the top/bottom
 * (and sporadic left/right) edge of each frame -- it renders as a "frame box"
 * around the armored character.  The armor art is inset from the frame edge, so
 * trimming the outer RING px to transparent removes the border without touching
 * the armor.
 *
 * Run: node tools/trim-frame-border.mjs <strip.png> [ring=2]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

function decodePNG(buf){let pos=8,W=0,H=0,ct=6;const idat=[];while(pos<buf.length){const len=buf.readUInt32BE(pos);const t=buf.toString('ascii',pos+4,pos+8);const d=buf.subarray(pos+8,pos+8+len);if(t==='IHDR'){W=d.readUInt32BE(0);H=d.readUInt32BE(4);ct=d[9];}else if(t==='IDAT')idat.push(d);else if(t==='IEND')break;pos+=12+len;}const raw=zlib.inflateSync(Buffer.concat(idat));const spp=ct===6?4:ct===2?3:1;const stride=W*spp;const u=Buffer.alloc(H*stride);let rp=0;for(let y=0;y<H;y++){const f=raw[rp++];for(let x=0;x<stride;x++){const v=raw[rp++];const a=x>=spp?u[y*stride+x-spp]:0;const b=y>0?u[(y-1)*stride+x]:0;const c=(x>=spp&&y>0)?u[(y-1)*stride+x-spp]:0;let val;if(f===0)val=v;else if(f===1)val=v+a;else if(f===2)val=v+b;else if(f===3)val=v+((a+b)>>1);else{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);val=v+(pa<=pb&&pa<=pc?a:pb<=pc?b:c);}u[y*stride+x]=val&0xff;}}const o=Buffer.alloc(W*H*4);for(let i=0;i<W*H;i++){let r,g,b,a=255;if(ct===6){r=u[i*4];g=u[i*4+1];b=u[i*4+2];a=u[i*4+3];}else if(ct===2){r=u[i*3];g=u[i*3+1];b=u[i*3+2];}else{r=g=b=u[i*spp];}o[i*4]=r;o[i*4+1]=g;o[i*4+2]=b;o[i*4+3]=a;}return{W,H,data:o};}
function crc32(b){let c=~0;for(let i=0;i<b.length;i++){c^=b[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xedb88320&-(c&1));}return ~c>>>0;}
function chunk(t,d){const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t,'ascii'),d]);const cr=Buffer.alloc(4);cr.writeUInt32BE(crc32(td));return Buffer.concat([l,td,cr]);}
function encodePNG(W,H,rgba){const sig=Buffer.from([137,80,78,71,13,10,26,10]);const ih=Buffer.alloc(13);ih.writeUInt32BE(W,0);ih.writeUInt32BE(H,4);ih[8]=8;ih[9]=6;const st=W*4;const raw=Buffer.alloc(H*(st+1));for(let y=0;y<H;y++){raw[y*(st+1)]=0;rgba.copy(raw,y*(st+1)+1,y*st,y*st+st);}return Buffer.concat([sig,chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);}

const FW = 256, FH = 256;
const input = process.argv[2];
const RING = parseInt(process.argv[3] || '2', 10);
if (!input) { console.error('usage: trim-frame-border.mjs <strip.png> [ring=2]'); process.exit(1); }
const s = decodePNG(readFileSync(input));
const N = Math.round(s.W / FW);
let cleared = 0;
for (let f = 0; f < N; f++) {
  const fx = f * FW;
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    if (x < RING || x >= FW - RING || y < RING || y >= FH - RING) {
      const i = (y * s.W + fx + x) * 4;
      if (s.data[i+3] !== 0) { s.data[i+3] = 0; cleared++; }
    }
  }
}
writeFileSync(input, encodePNG(s.W, s.H, s.data));
console.log(`${input}: trimmed ${RING}px ring on ${N} frames, cleared ${cleared} px`);
