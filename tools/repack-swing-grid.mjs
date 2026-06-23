/* Re-pack an owner-repainted swing GRID (the numbered-cell layout produced by
   the gridify step) back into the game's horizontal swing weapon strip.

   Handles either return format:
     - transparent background (alpha), or
     - opaque navy background (the grid's own bg colour kept by the editor).
   Per cell: crop the exact art region (inside the number band + borders),
   key the background + grid borders + frame-number pixels to transparent,
   keep the largest non-line component (the sword), and box-resize to the
   canonical frame size.  Output overwrites public/sprites/player/sword-<dir>-weapon.png.

   Run: node tools/repack-swing-grid.mjs <grid.png> <south|east|north> [--preview] */
import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

function decodePNG(buf){let pos=8,W=0,H=0,ct=6;const idat=[];while(pos<buf.length){const len=buf.readUInt32BE(pos);const t=buf.toString('ascii',pos+4,pos+8);const d=buf.subarray(pos+8,pos+8+len);if(t==='IHDR'){W=d.readUInt32BE(0);H=d.readUInt32BE(4);ct=d[9];}else if(t==='IDAT')idat.push(d);else if(t==='IEND')break;pos+=12+len;}const raw=zlib.inflateSync(Buffer.concat(idat));const spp=ct===6?4:ct===2?3:1;const stride=W*spp;const u=Buffer.alloc(H*stride);let rp=0;for(let y=0;y<H;y++){const f=raw[rp++];for(let x=0;x<stride;x++){const v=raw[rp++];const a=x>=spp?u[y*stride+x-spp]:0;const b=y>0?u[(y-1)*stride+x]:0;const c=(x>=spp&&y>0)?u[(y-1)*stride+x-spp]:0;let val;if(f===0)val=v;else if(f===1)val=v+a;else if(f===2)val=v+b;else if(f===3)val=v+((a+b)>>1);else{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);val=v+(pa<=pb&&pa<=pc?a:pb<=pc?b:c);}u[y*stride+x]=val&0xff;}}const o=Buffer.alloc(W*H*4);for(let i=0;i<W*H;i++){let r,g,b,a=255;if(ct===6){r=u[i*4];g=u[i*4+1];b=u[i*4+2];a=u[i*4+3];}else if(ct===2){r=u[i*3];g=u[i*3+1];b=u[i*3+2];}else{r=g=b=u[i*spp];}o[i*4]=r;o[i*4+1]=g;o[i*4+2]=b;o[i*4+3]=a;}return{W,H,data:o};}
function crc32(b){let c=~0;for(let i=0;i<b.length;i++){c^=b[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xedb88320&-(c&1));}return ~c>>>0;}
function chunk(t,d){const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t,'ascii'),d]);const cr=Buffer.alloc(4);cr.writeUInt32BE(crc32(td));return Buffer.concat([l,td,cr]);}
function encodePNG(W,H,rgba){const sig=Buffer.from([137,80,78,71,13,10,26,10]);const ih=Buffer.alloc(13);ih.writeUInt32BE(W,0);ih.writeUInt32BE(H,4);ih[8]=8;ih[9]=6;const st=W*4;const raw=Buffer.alloc(H*(st+1));for(let y=0;y<H;y++){raw[y*(st+1)]=0;rgba.copy(raw,y*(st+1)+1,y*st,y*st+st);}return Buffer.concat([sig,chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);}

/* canonical swing-strip geometry (matches effectsRenderer _swordCfg fw/fh) +
   the grid layout used by the gridify step (cols; LBL=34, BORD=3). */
const CFG = {
  south: { FW: 320, FH: 320, N: 14, cols: 4 },
  east:  { FW: 402, FH: 246, N: 11, cols: 4 },
  north: { FW: 340, FH: 227, N: 9,  cols: 3 },
};
const LBL = 34, BORD = 3;

/* navy / blue-border background -> transparent (used when the editor returned an
   opaque background).  Keys "dark + bluish" pixels; the steel blade is light /
   neutral and the dark OUTLINE is neutral (b≈r), so both survive. */
function keyNavy(reg, w, h) {
  for (let i = 0; i < w * h; i++) {
    if (reg[i*4+3] <= 24) continue;
    const r = reg[i*4], g = reg[i*4+1], b = reg[i*4+2];
    if (b > r + 8 && b > g + 4 && (r + g + b) / 3 < 118) reg[i*4+3] = 0;
  }
}
/* gold frame-number remnants -> transparent. */
function keyGold(reg, w, h) {
  for (let i = 0; i < w * h; i++) {
    if (reg[i*4+3] <= 24) continue;
    const r = reg[i*4], g = reg[i*4+1], b = reg[i*4+2];
    if (r > 165 && g > 110 && b < 135 && r > b + 45 && g > b + 18) reg[i*4+3] = 0;
  }
}
/* Clear the number-band + grid-border margins that leak into the cropped art
   region after the editor's (often non-uniform) resize.  The sword is centred,
   so a top/bottom/side margin wipe removes the leaked number + border slivers
   without touching it — and stops keepSword from mistaking a fat border line
   for the sword in the small early-swing frames. */
function clearMargins(reg, w, h, top, bot, side) {
  const ty = Math.round(h * top), by = Math.round(h * (1 - bot)), sx = Math.round(w * side);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (y < ty || y >= by || x < sx || x >= w - sx) reg[(y*w+x)*4+3] = 0;
  }
}
/* keep the largest opaque component that isn't a thin grid-line sliver. */
function keepSword(reg, w, h) {  const lab = new Int32Array(w * h).fill(-1); const op = (i) => reg[i*4+3] > 24; const comps = [];
  for (let s = 0; s < w * h; s++) {
    if (!op(s) || lab[s] >= 0) continue;
    let n = 0, x0 = w, y0 = h, x1 = 0, y1 = 0; const st = [s]; lab[s] = comps.length;
    while (st.length) { const i = st.pop(); n++; const x = i % w, y = (i / w) | 0; if (x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; for (const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]) { if (nx<0||ny<0||nx>=w||ny>=h) continue; const j=ny*w+nx; if (op(j)&&lab[j]<0){lab[j]=comps.length;st.push(j);} } }
    comps.push({ id: comps.length, n, bw: x1-x0+1, bh: y1-y0+1 });
  }
  let best = -1, bestN = 0;
  for (const c of comps) { const line = (c.bh<=14 && c.bw>0.5*w) || (c.bw<=14 && c.bh>0.5*h); if (line) continue; if (c.n>bestN){bestN=c.n;best=c.id;} }
  for (let i = 0; i < w * h; i++) if (op(i) && lab[i] !== best) reg[i*4+3] = 0;
  return bestN;
}
/* Alpha-bleed: keyed pixels keep dark RGB under alpha 0, which PixiJS's
   bilinear scaling samples into a dark fringe ("black shadow") at sword edges.
   Dilate the visible colour outward into the transparent margin (alpha stays 0)
   so the filter only ever samples sword-coloured texels. */
function alphaBleed(buf, w, h, iters) {
  const has = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) if (buf[i*4+3] > 8) has[i] = 1;
  for (let it = 0; it < iters; it++) {
    const add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (has[i]) continue;
      let r = 0, g = 0, b = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const nx = x+dx, ny = y+dy; if (nx<0||ny<0||nx>=w||ny>=h) continue;
        const j = ny*w+nx; if (has[j]) { r += buf[j*4]; g += buf[j*4+1]; b += buf[j*4+2]; n++; }
      }
      if (n) { buf[i*4] = Math.round(r/n); buf[i*4+1] = Math.round(g/n); buf[i*4+2] = Math.round(b/n); add.push(i); }
    }
    for (const i of add) has[i] = 1;
    if (!add.length) break;
  }
}

const input = process.argv[2], dir = process.argv[3], wantPreview = process.argv.includes('--preview');
const cfg = CFG[dir]; if (!cfg) throw new Error('dir must be south|east|north');
const { FW, FH, N, cols } = cfg; const rows = Math.ceil(N / cols);
const cellW0 = FW + 2 * BORD, cellH0 = LBL + FH + 2 * BORD;
const fx0 = BORD / cellW0, fx1 = (BORD + FW) / cellW0, fy0 = LBL / cellH0, fy1 = (LBL + FH) / cellH0;

const src = decodePNG(readFileSync(input));
let transp = 0; for (let i = 0; i < src.W * src.H; i++) if (src.data[i*4+3] < 20) transp++;
const opaqueBg = transp < 0.15 * src.W * src.H;   // editor kept the navy bg
const cellW = src.W / cols, cellH = src.H / rows;
const strip = Buffer.alloc(N * FW * FH * 4); const cov = [];
for (let f = 0; f < N; f++) {
  const gc = f % cols, gr = (f / cols) | 0;
  const ax0 = Math.round((gc + fx0) * cellW), ay0 = Math.round((gr + fy0) * cellH);
  const aw = Math.round((fx1 - fx0) * cellW), ah = Math.round((fy1 - fy0) * cellH);
  const reg = Buffer.alloc(aw * ah * 4);
  for (let y = 0; y < ah; y++) for (let x = 0; x < aw; x++) { const sx = ax0+x, sy = ay0+y, di = (y*aw+x)*4; if (sx<0||sy<0||sx>=src.W||sy>=src.H) continue; const si = (sy*src.W+sx)*4; reg[di]=src.data[si];reg[di+1]=src.data[si+1];reg[di+2]=src.data[si+2];reg[di+3]=src.data[si+3]; }
  /* Always key the bluish navy/border pixels: a transparent return still has
     the grid's blue BORDERS (opaque), which otherwise connect into a rectangle
     that keepSword mistakes for the sword in the small early-swing frames.
     Neutral steel + brown grip aren't bluish, so they survive either way. */
  keyNavy(reg, aw, ah);
  keyGold(reg, aw, ah);
  clearMargins(reg, aw, ah, 0.14, 0.0, 0.0);   // wipe the leaked number band
  cov.push(keepSword(reg, aw, ah));
  for (let oy = 0; oy < FH; oy++) for (let ox = 0; ox < FW; ox++) {
    const sx0 = Math.floor(ox*aw/FW), sx1 = Math.max(sx0+1, Math.floor((ox+1)*aw/FW));
    const sy0 = Math.floor(oy*ah/FH), sy1 = Math.max(sy0+1, Math.floor((oy+1)*ah/FH));
    let ar=0,ag=0,ab=0,al=0,n=0; for (let sy=sy0;sy<sy1;sy++) for (let sx=sx0;sx<sx1;sx++){const i=(sy*aw+sx)*4,a=reg[i+3]/255;ar+=reg[i]*a;ag+=reg[i+1]*a;ab+=reg[i+2]*a;al+=a;n++;}
    const di = (oy*(N*FW)+(f*FW+ox))*4; if (al>0){strip[di]=Math.round(ar/al);strip[di+1]=Math.round(ag/al);strip[di+2]=Math.round(ab/al);strip[di+3]=Math.round(255*al/n);}
  }
}
alphaBleed(strip, N * FW, FH, 8);   // kill the dark-fringe halo under bilinear scaling
const outPath = `public/sprites/player/sword-${dir}-weapon.png`;
writeFileSync(outPath, encodePNG(N * FW, FH, strip));
console.log(`${outPath}: ${N*FW}x${FH}, bg=${opaqueBg?'navy-keyed':'alpha'}, kept px/frame: ${cov.join(', ')}`);
if (wantPreview) {
  const dh = 90, dw = Math.round((N*FW)*dh/FH); const dbg = Buffer.alloc(dw*dh*4);
  for (let i=0;i<dw*dh;i++){dbg[i*4]=0x2a;dbg[i*4+1]=0x24;dbg[i*4+2]=0x4a;dbg[i*4+3]=255;}
  for (let y=0;y<dh;y++) for (let x=0;x<dw;x++){const sx=Math.floor(x*(N*FW)/dw),sy=Math.floor(y*FH/dh);const si=(sy*(N*FW)+sx)*4,a=strip[si+3]/255;if(a<=0)continue;const di=(y*dw+x)*4;for(let k=0;k<3;k++)dbg[di+k]=Math.round(strip[si+k]*a+dbg[di+k]*(1-a));}
  writeFileSync(`/tmp/${dir}-repacked-preview.png`, encodePNG(dw, dh, dbg));
  console.log(`wrote /tmp/${dir}-repacked-preview.png`);
}
