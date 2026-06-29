/* Gridify the pickup-south animation strip into a NUMBERED grid for ChatGPT.
 *
 * The shipped sheet public/sprites/player/pickup-south.png is a single
 * 7424x256 horizontal strip of 29 frames (256x256 each, south-facing).  An
 * image model can't keep frame alignment across a 7424px-wide strip, so we
 * re-lay the 29 frames into a 6-col x 5-row grid with a numbered label band
 * over each cell and visible grid borders.  ChatGPT paints clothing onto each
 * numbered frame; tools/repack-pickup-grid.mjs reverses this exact layout.
 *
 * Run: node tools/gridify-pickup.mjs            (writes the grid PNG)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

function decodePNG(buf){let pos=8,W=0,H=0,ct=6;const idat=[];while(pos<buf.length){const len=buf.readUInt32BE(pos);const t=buf.toString('ascii',pos+4,pos+8);const d=buf.subarray(pos+8,pos+8+len);if(t==='IHDR'){W=d.readUInt32BE(0);H=d.readUInt32BE(4);ct=d[9];}else if(t==='IDAT')idat.push(d);else if(t==='IEND')break;pos+=12+len;}const raw=zlib.inflateSync(Buffer.concat(idat));const spp=ct===6?4:ct===2?3:1;const stride=W*spp;const u=Buffer.alloc(H*stride);let rp=0;for(let y=0;y<H;y++){const f=raw[rp++];for(let x=0;x<stride;x++){const v=raw[rp++];const a=x>=spp?u[y*stride+x-spp]:0;const b=y>0?u[(y-1)*stride+x]:0;const c=(x>=spp&&y>0)?u[(y-1)*stride+x-spp]:0;let val;if(f===0)val=v;else if(f===1)val=v+a;else if(f===2)val=v+b;else if(f===3)val=v+((a+b)>>1);else{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);val=v+(pa<=pb&&pa<=pc?a:pb<=pc?b:c);}u[y*stride+x]=val&0xff;}}const o=Buffer.alloc(W*H*4);for(let i=0;i<W*H;i++){let r,g,b,a=255;if(ct===6){r=u[i*4];g=u[i*4+1];b=u[i*4+2];a=u[i*4+3];}else if(ct===2){r=u[i*3];g=u[i*3+1];b=u[i*3+2];}else{r=g=b=u[i*spp];}o[i*4]=r;o[i*4+1]=g;o[i*4+2]=b;o[i*4+3]=a;}return{W,H,data:o};}
function crc32(b){let c=~0;for(let i=0;i<b.length;i++){c^=b[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xedb88320&-(c&1));}return ~c>>>0;}
function chunk(t,d){const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t,'ascii'),d]);const cr=Buffer.alloc(4);cr.writeUInt32BE(crc32(td));return Buffer.concat([l,td,cr]);}
function encodePNG(W,H,rgba){const sig=Buffer.from([137,80,78,71,13,10,26,10]);const ih=Buffer.alloc(13);ih.writeUInt32BE(W,0);ih.writeUInt32BE(H,4);ih[8]=8;ih[9]=6;const st=W*4;const raw=Buffer.alloc(H*(st+1));for(let y=0;y<H;y++){raw[y*(st+1)]=0;rgba.copy(raw,y*(st+1)+1,y*st,y*st+st);}return Buffer.concat([sig,chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);}

/* 5x7 bitmap font, digits 0-9, for the frame-number labels. */
const FONT = {
  '0':['01110','10001','10011','10101','11001','10001','01110'],
  '1':['00100','01100','00100','00100','00100','00100','01110'],
  '2':['01110','10001','00001','00010','00100','01000','11111'],
  '3':['11111','00010','00100','00010','00001','10001','01110'],
  '4':['00010','00110','01010','10010','11111','00010','00010'],
  '5':['11111','10000','11110','00001','00001','10001','01110'],
  '6':['00110','01000','10000','11110','10001','10001','01110'],
  '7':['11111','00001','00010','00100','01000','01000','01000'],
  '8':['01110','10001','10001','01110','10001','10001','01110'],
  '9':['01110','10001','10001','01111','00001','00010','01100'],
};

/* layout constants — repack-pickup-grid.mjs must mirror these exactly. */
const FW = 256, FH = 256, N = 29, COLS = 6, ROWS = Math.ceil(N / COLS);
const BORD = 4, LBL = 44;
const BG       = [238, 239, 242, 255]; // light studio grey behind the character
const LABEL_BG = [30, 34, 58, 255];     // navy label band
const NUM_FG   = [245, 210, 90, 255];   // gold frame number
const LINE      = [54, 60, 92, 255];     // grid border lines

const gridW = COLS * FW + (COLS + 1) * BORD;
const gridH = ROWS * (FH + LBL) + (ROWS + 1) * BORD;
const out = Buffer.alloc(gridW * gridH * 4);
const put = (x, y, c) => { if (x<0||y<0||x>=gridW||y>=gridH) return; const i=(y*gridW+x)*4; out[i]=c[0];out[i+1]=c[1];out[i+2]=c[2];out[i+3]=c[3]; };
const fill = (x0,y0,w,h,c) => { for(let y=y0;y<y0+h;y++) for(let x=x0;x<x0+w;x++) put(x,y,c); };

/* whole canvas = grid line colour, then stamp cells over it. */
fill(0, 0, gridW, gridH, LINE);

function drawNumber(cx, cy, str) {
  const S = 4, glyphW = 5 * S, gap = S, total = str.length * glyphW + (str.length - 1) * gap;
  let x0 = cx - (total >> 1), y0 = cy - ((7 * S) >> 1);
  for (const ch of str) {
    const g = FONT[ch]; if (!g) { x0 += glyphW + gap; continue; }
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r][c] === '1') fill(x0 + c*S, y0 + r*S, S, S, NUM_FG);
    x0 += glyphW + gap;
  }
}

const src = decodePNG(readFileSync('public/sprites/player/pickup-south.png'));
for (let f = 0; f < N; f++) {
  const gc = f % COLS, gr = (f / COLS) | 0;
  const cellX = BORD + gc * (FW + BORD);
  const cellY = BORD + gr * (FH + LBL + BORD);
  /* label band + number */
  fill(cellX, cellY, FW, LBL, LABEL_BG);
  drawNumber(cellX + (FW >> 1), cellY + (LBL >> 1), String(f));
  /* art area: light bg, then composite the frame over it */
  const ax = cellX, ay = cellY + LBL;
  fill(ax, ay, FW, FH, BG);
  const sx0 = f * FW;
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const si = (y * src.W + (sx0 + x)) * 4, a = src.data[si+3] / 255;
    if (a <= 0) continue;
    const di = ((ay + y) * gridW + (ax + x)) * 4;
    for (let k = 0; k < 3; k++) out[di+k] = Math.round(src.data[si+k] * a + out[di+k] * (1 - a));
    out[di+3] = 255;
  }
}
/* trailing empty cells (29..29 of the 30-slot grid): leave as studio bg */
for (let f = N; f < COLS * ROWS; f++) {
  const gc = f % COLS, gr = (f / COLS) | 0;
  const cellX = BORD + gc * (FW + BORD), cellY = BORD + gr * (FH + LBL + BORD);
  fill(cellX, cellY, FW, LBL, LABEL_BG);
  fill(cellX, cellY + LBL, FW, FH, BG);
}

const outPath = process.argv[2] || '/tmp/pickup-south-grid.png';
writeFileSync(outPath, encodePNG(gridW, gridH, out));
console.log(`${outPath}: ${gridW}x${gridH}, ${N} frames in ${COLS}x${ROWS} grid (cell ${FW}x${FH}, label ${LBL}px)`);
