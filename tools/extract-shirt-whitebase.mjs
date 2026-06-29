/* Extract a tintable WHITE-BASE shirt strip from a cyan-painted clothed-body
 * strip (the output of repack-pickup-grid.mjs run on the cyan shirt grid).
 *
 * The game's shirt gear sheets (gear/shirt/tshirt/<pose>-<dir>.png) are neutral
 * greyscale garments (avg ~202, black outline) that the renderer multiplies by
 * the player's chosen shirt colour at runtime (entityRenderer _placeGear ->
 * spr.tint).  ChatGPT painted the pickup shirt in flat cyan over the body; this
 * isolates the cyan tee, converts it to a neutral white-base (luminance from the
 * cyan's own shading so folds survive the tint), and draws a 1px dark edge so
 * the garment reads against skin.
 *
 * Run: node tools/extract-shirt-whitebase.mjs <clothed-strip.png> <out.png>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

function decodePNG(buf){let pos=8,W=0,H=0,ct=6;const idat=[];while(pos<buf.length){const len=buf.readUInt32BE(pos);const t=buf.toString('ascii',pos+4,pos+8);const d=buf.subarray(pos+8,pos+8+len);if(t==='IHDR'){W=d.readUInt32BE(0);H=d.readUInt32BE(4);ct=d[9];}else if(t==='IDAT')idat.push(d);else if(t==='IEND')break;pos+=12+len;}const raw=zlib.inflateSync(Buffer.concat(idat));const spp=ct===6?4:ct===2?3:1;const stride=W*spp;const u=Buffer.alloc(H*stride);let rp=0;for(let y=0;y<H;y++){const f=raw[rp++];for(let x=0;x<stride;x++){const v=raw[rp++];const a=x>=spp?u[y*stride+x-spp]:0;const b=y>0?u[(y-1)*stride+x]:0;const c=(x>=spp&&y>0)?u[(y-1)*stride+x-spp]:0;let val;if(f===0)val=v;else if(f===1)val=v+a;else if(f===2)val=v+b;else if(f===3)val=v+((a+b)>>1);else{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);val=v+(pa<=pb&&pa<=pc?a:pb<=pc?b:c);}u[y*stride+x]=val&0xff;}}const o=Buffer.alloc(W*H*4);for(let i=0;i<W*H;i++){let r,g,b,a=255;if(ct===6){r=u[i*4];g=u[i*4+1];b=u[i*4+2];a=u[i*4+3];}else if(ct===2){r=u[i*3];g=u[i*3+1];b=u[i*3+2];}else{r=g=b=u[i*spp];}o[i*4]=r;o[i*4+1]=g;o[i*4+2]=b;o[i*4+3]=a;}return{W,H,data:o};}
function crc32(b){let c=~0;for(let i=0;i<b.length;i++){c^=b[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xedb88320&-(c&1));}return ~c>>>0;}
function chunk(t,d){const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t,'ascii'),d]);const cr=Buffer.alloc(4);cr.writeUInt32BE(crc32(td));return Buffer.concat([l,td,cr]);}
function encodePNG(W,H,rgba){const sig=Buffer.from([137,80,78,71,13,10,26,10]);const ih=Buffer.alloc(13);ih.writeUInt32BE(W,0);ih.writeUInt32BE(H,4);ih[8]=8;ih[9]=6;const st=W*4;const raw=Buffer.alloc(H*(st+1));for(let y=0;y<H;y++){raw[y*(st+1)]=0;rgba.copy(raw,y*(st+1)+1,y*st,y*st+st);}return Buffer.concat([sig,chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);}

const input = process.argv[2], outPath = process.argv[3];
if (!input || !outPath) { console.error('usage: extract-shirt-whitebase.mjs <clothed-strip.png> <out.png>'); process.exit(1); }
const src = decodePNG(readFileSync(input));
const { W, H, data } = src;
const out = Buffer.alloc(W * H * 4);
let shirtN = 0;
for (let i = 0; i < W * H; i++) {
  const r = data[i*4], g = data[i*4+1], b = data[i*4+2], a = data[i*4+3];
  if (a < 40) continue;
  const isCyan     = b > r + 28 && g > r + 18 && (g + b) > 260;               // bright tee
  const isCyanEdge = b > r + 14 && g > r + 8  && (g + b) > 180 && (g + b) <= 260; // anti-aliased rim
  if (isCyan || isCyanEdge) { const white = Math.min(255, Math.round(Math.max(g, b))); out[i*4]=white; out[i*4+1]=white; out[i*4+2]=white; out[i*4+3]=255; shirtN++; }
}
/* 1px dark outline so the tinted tee reads against skin/arms. */
const cp = Buffer.from(out);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y*W+x; if (cp[i*4+3] > 0) continue;
  let near = false;
  for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx=x+dx, ny=y+dy; if (nx<0||ny<0||nx>=W||ny>=H) continue; if (cp[(ny*W+nx)*4+3] > 0) { near = true; break; } }
  if (near) { out[i*4]=40; out[i*4+1]=40; out[i*4+2]=40; out[i*4+3]=255; }
}
writeFileSync(outPath, encodePNG(W, H, out));
console.log(`${outPath}: ${W}x${H}, shirt px ${shirtN}`);
