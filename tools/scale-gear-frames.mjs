/* Per-frame uniform scale of a gear strip's content (256x256 frames).
 *
 * Gear sheets are drawn with the body's transform (no independent scale), so to
 * resize a piece relative to the body you scale the ART inside each frame.  This
 * enlarges/shrinks each frame's non-transparent content about its own bbox
 * centre (default) or bbox top, keeping it registered to the same body part,
 * then alpha-bleeds the edges.
 *
 * Run: node tools/scale-gear-frames.mjs <in.png> <out.png> <scale> [center|top]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

function decodePNG(buf){let pos=8,W=0,H=0,ct=6;const idat=[];while(pos<buf.length){const len=buf.readUInt32BE(pos);const t=buf.toString('ascii',pos+4,pos+8);const d=buf.subarray(pos+8,pos+8+len);if(t==='IHDR'){W=d.readUInt32BE(0);H=d.readUInt32BE(4);ct=d[9];}else if(t==='IDAT')idat.push(d);else if(t==='IEND')break;pos+=12+len;}const raw=zlib.inflateSync(Buffer.concat(idat));const spp=ct===6?4:ct===2?3:1;const stride=W*spp;const u=Buffer.alloc(H*stride);let rp=0;for(let y=0;y<H;y++){const f=raw[rp++];for(let x=0;x<stride;x++){const v=raw[rp++];const a=x>=spp?u[y*stride+x-spp]:0;const b=y>0?u[(y-1)*stride+x]:0;const c=(x>=spp&&y>0)?u[(y-1)*stride+x-spp]:0;let val;if(f===0)val=v;else if(f===1)val=v+a;else if(f===2)val=v+b;else if(f===3)val=v+((a+b)>>1);else{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);val=v+(pa<=pb&&pa<=pc?a:pb<=pc?b:c);}u[y*stride+x]=val&0xff;}}const o=Buffer.alloc(W*H*4);for(let i=0;i<W*H;i++){let r,g,b,a=255;if(ct===6){r=u[i*4];g=u[i*4+1];b=u[i*4+2];a=u[i*4+3];}else if(ct===2){r=u[i*3];g=u[i*3+1];b=u[i*3+2];}else{r=g=b=u[i*spp];}o[i*4]=r;o[i*4+1]=g;o[i*4+2]=b;o[i*4+3]=a;}return{W,H,data:o};}
function crc32(b){let c=~0;for(let i=0;i<b.length;i++){c^=b[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xedb88320&-(c&1));}return ~c>>>0;}
function chunk(t,d){const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t,'ascii'),d]);const cr=Buffer.alloc(4);cr.writeUInt32BE(crc32(td));return Buffer.concat([l,td,cr]);}
function encodePNG(W,H,rgba){const sig=Buffer.from([137,80,78,71,13,10,26,10]);const ih=Buffer.alloc(13);ih.writeUInt32BE(W,0);ih.writeUInt32BE(H,4);ih[8]=8;ih[9]=6;const st=W*4;const raw=Buffer.alloc(H*(st+1));for(let y=0;y<H;y++){raw[y*(st+1)]=0;rgba.copy(raw,y*(st+1)+1,y*st,y*st+st);}return Buffer.concat([sig,chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);}

function alphaBleed(buf, w, h, iters){const has=new Uint8Array(w*h);for(let i=0;i<w*h;i++)if(buf[i*4+3]>8)has[i]=1;for(let it=0;it<iters;it++){const add=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(has[i])continue;let r=0,g=0,b=0,n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;const j=ny*w+nx;if(has[j]){r+=buf[j*4];g+=buf[j*4+1];b+=buf[j*4+2];n++;}}if(n){buf[i*4]=Math.round(r/n);buf[i*4+1]=Math.round(g/n);buf[i*4+2]=Math.round(b/n);add.push(i);}}for(const i of add)has[i]=1;if(!add.length)break;}}

const input = process.argv[2], outPath = process.argv[3], scale = parseFloat(process.argv[4] || '1.25'), anchor = process.argv[5] || 'center';
const FW = 256, FH = 256;
const src = decodePNG(readFileSync(input));
const N = Math.round(src.W / FW);
const out = Buffer.alloc(N * FW * FH * 4);
const SW = N * FW;
for (let f = 0; f < N; f++) {
  const fx = f * FW;
  /* bbox of this frame's content */
  let minx=FW, maxx=0, miny=FH, maxy=0, any=false;
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) { if (src.data[(y*src.W + fx + x)*4+3] > 20) { any=true; if(x<minx)minx=x; if(x>maxx)maxx=x; if(y<miny)miny=y; if(y>maxy)maxy=y; } }
  if (!any) continue;
  const ax = (minx + maxx) / 2;
  const ay = anchor === 'top' ? miny : (miny + maxy) / 2;
  for (let oy = 0; oy < FH; oy++) for (let ox = 0; ox < FW; ox++) {
    const sxf = ax + (ox - ax) / scale, syf = ay + (oy - ay) / scale;
    const x0 = Math.floor(sxf), y0 = Math.floor(syf), tx = sxf - x0, ty = syf - y0;
    if (x0 < 0 || y0 < 0 || x0 >= FW-1 || y0 >= FH-1) continue;
    let r=0,g=0,b=0,a=0;
    for (const [dx,dy,wgt] of [[0,0,(1-tx)*(1-ty)],[1,0,tx*(1-ty)],[0,1,(1-tx)*ty],[1,1,tx*ty]]) {
      const si = ((y0+dy)*src.W + fx + (x0+dx))*4, al = src.data[si+3]/255*wgt;
      r += src.data[si]*al; g += src.data[si+1]*al; b += src.data[si+2]*al; a += al;
    }
    if (a > 0) { const di = (oy*SW + fx + ox)*4; out[di]=Math.round(r/a); out[di+1]=Math.round(g/a); out[di+2]=Math.round(b/a); out[di+3]=Math.round(255*a); }
  }
}
alphaBleed(out, SW, FH, 6);
writeFileSync(outPath, encodePNG(SW, FH, out));
console.log(`${outPath}: ${SW}x${FH}, ${N} frames scaled x${scale} about bbox ${anchor}`);
