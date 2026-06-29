/* Build the per-frame HEAD overlay sheet for the loot-pickup pose.
 *
 * The pickup crouch drops the head below the masked body's neck-restore band
 * AND under the raised arm plate, so an equipped player's head was cut to a
 * sliver.  This extracts the head (the top HEADH px of each frame's figure,
 * which tracks the head as the crouch lowers it) into a head-only strip the
 * renderer draws ABOVE the gear so the whole head always shows.
 *
 * Source: public/sprites/player/pickup-south.png (29 x 256x256).
 * Output: public/sprites/player/pickup-south-head.png (same layout, head only).
 *
 * Run: node tools/extract-pickup-head.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

function decodePNG(buf){let pos=8,W=0,H=0,ct=6;const idat=[];while(pos<buf.length){const len=buf.readUInt32BE(pos);const t=buf.toString('ascii',pos+4,pos+8);const d=buf.subarray(pos+8,pos+8+len);if(t==='IHDR'){W=d.readUInt32BE(0);H=d.readUInt32BE(4);ct=d[9];}else if(t==='IDAT')idat.push(d);else if(t==='IEND')break;pos+=12+len;}const raw=zlib.inflateSync(Buffer.concat(idat));const spp=ct===6?4:ct===2?3:1;const stride=W*spp;const u=Buffer.alloc(H*stride);let rp=0;for(let y=0;y<H;y++){const f=raw[rp++];for(let x=0;x<stride;x++){const v=raw[rp++];const a=x>=spp?u[y*stride+x-spp]:0;const b=y>0?u[(y-1)*stride+x]:0;const c=(x>=spp&&y>0)?u[(y-1)*stride+x-spp]:0;let val;if(f===0)val=v;else if(f===1)val=v+a;else if(f===2)val=v+b;else if(f===3)val=v+((a+b)>>1);else{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);val=v+(pa<=pb&&pa<=pc?a:pb<=pc?b:c);}u[y*stride+x]=val&0xff;}}const o=Buffer.alloc(W*H*4);for(let i=0;i<W*H;i++){let r,g,b,a=255;if(ct===6){r=u[i*4];g=u[i*4+1];b=u[i*4+2];a=u[i*4+3];}else if(ct===2){r=u[i*3];g=u[i*3+1];b=u[i*3+2];}else{r=g=b=u[i*spp];}o[i*4]=r;o[i*4+1]=g;o[i*4+2]=b;o[i*4+3]=a;}return{W,H,data:o};}
function crc32(b){let c=~0;for(let i=0;i<b.length;i++){c^=b[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xedb88320&-(c&1));}return ~c>>>0;}
function chunk(t,d){const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t,'ascii'),d]);const cr=Buffer.alloc(4);cr.writeUInt32BE(crc32(td));return Buffer.concat([l,td,cr]);}
function encodePNG(W,H,rgba){const sig=Buffer.from([137,80,78,71,13,10,26,10]);const ih=Buffer.alloc(13);ih.writeUInt32BE(W,0);ih.writeUInt32BE(H,4);ih[8]=8;ih[9]=6;const st=W*4;const raw=Buffer.alloc(H*(st+1));for(let y=0;y<H;y++){raw[y*(st+1)]=0;rgba.copy(raw,y*(st+1)+1,y*st,y*st+st);}return Buffer.concat([sig,chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);}

/* A fixed top-N-rows slice grabs the shoulders once the crouch foreshortens the
   figure (the head and shoulders end up at the same height).  Instead, track a
   HEAD-WIDTH window down from the crown: each row keeps only the body pixels
   inside a ~48px column centred on the head, and the centre follows the head as
   it bends (clamped so it can't jump out to a shoulder).  Pixels outside the
   window (the wider shoulders) are dropped, so the whole head is kept and the
   shoulders are excluded in every frame. */
const FW = 256, FH = 256, HALF = 24, HEADH = 48, FOLLOW = 4;
const src = decodePNG(readFileSync('public/sprites/player/pickup-south.png'));
const A = (fx, x, y) => src.data[(y*src.W + fx + x)*4+3];
const N = Math.round(src.W / FW);
const out = Buffer.alloc(N * FW * FH * 4);
const SW = N * FW;
for (let f = 0; f < N; f++) {
  const fx = f * FW;
  /* figure top (head crown) + its horizontal centre */
  let figTop = FH, cx = 128;
  for (let y = 0; y < FH && figTop === FH; y++) { let minx = FW, maxx = -1; for (let x = 0; x < FW; x++) if (A(fx, x, y) > 40) { if (x < minx) minx = x; if (x > maxx) maxx = x; } if (maxx >= 0) { figTop = y; cx = (minx + maxx) / 2; } }
  let prev = cx;
  for (let y = figTop; y < figTop + HEADH && y < FH; y++) {
    const lo = Math.round(prev - HALF), hi = Math.round(prev + HALF);
    let sx = 0, n = 0;
    for (let x = Math.max(0, lo); x <= Math.min(FW - 1, hi); x++) {
      if (A(fx, x, y) <= 0) continue;
      const si = (y*src.W + fx + x)*4, di = (y*SW + fx + x)*4;
      out[di]=src.data[si]; out[di+1]=src.data[si+1]; out[di+2]=src.data[si+2]; out[di+3]=src.data[si+3];
      sx += x; n++;
    }
    if (n) { let c = sx / n; if (c > prev + FOLLOW) c = prev + FOLLOW; if (c < prev - FOLLOW) c = prev - FOLLOW; prev = c; }
  }
}
writeFileSync('public/sprites/player/pickup-south-head.png', encodePNG(SW, FH, out));
console.log(`public/sprites/player/pickup-south-head.png: ${SW}x${FH}, ${N} frames, head = top ${HEADH}px below figure crown`);
