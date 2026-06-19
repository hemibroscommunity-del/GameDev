/* Build the per-facing HELD greatsword weapon textures from the owner's 5
 * sword-only cutouts (magenta blade + cyan grip on a white background).
 * Keys the white bg, trims to the blade, downscales to a crisp icon, and
 * detects the cyan GRIP centroid as the weapon "handle" (the pivot the
 * renderer pins to the hand).  Emits one PNG per canonical facing plus the
 * handles.json entries to paste.
 *
 * Usage: node tools/build_held_greatsword.mjs
 */
import { decode, encode } from './png.mjs';
import fs from 'node:fs';

const U = '/root/.claude/uploads/73c0f056-011c-5271-8583-5160727c3247';
const SRC = [
  ['south',     `${U}/91ece9ea-3321A9EDB82E4E4AB8264722117F1464.png`],
  ['southwest', `${U}/0ec4eeed-EE9915BD7C6E4755AB21EC30B1A8EE59.png`],
  ['east',      `${U}/3ef18615-FDE6399C1FE94105A526C06A87722B00.png`],
  ['northeast', `${U}/8148e4d4-54977ACEBD6840E3921E2D4A155BBD20.png`],
  ['north',     `${U}/c2b3408d-84A235DCCE4B44A58873FBFBFBB74915.png`],
];
const OUT_DIR = 'public/sprites/weapons/swords';
const OUT_H = 200;   // downscaled icon height (in-game fitScale shrinks further)

function key(buf) {
  const { width: W, height: H, data } = decode(buf);
  // white bg -> transparent (flood-fill from the borders; the blade is magenta
  // and the grip cyan, so nothing on the sword is near-white).
  const isWhite = (i) => data[i] > 238 && data[i+1] > 238 && data[i+2] > 238;
  const alpha = new Uint8Array(W*H).fill(255);
  const st = [];
  const visit = (x,y)=>{if(x<0||y<0||x>=W||y>=H)return;const p=y*W+x;if(alpha[p]===0)return;if(isWhite(p*4)){alpha[p]=0;st.push(p);}};
  for(let x=0;x<W;x++){visit(x,0);visit(x,H-1);}
  for(let y=0;y<H;y++){visit(0,y);visit(W-1,y);}
  while(st.length){const p=st.pop();const x=p%W,y=(p/W)|0;visit(x-1,y);visit(x+1,y);visit(x,y-1);visit(x,y+1);}
  // mop up any enclosed near-white specks (a sword has no white interior).
  for(let p=0;p<W*H;p++) if(alpha[p] && isWhite(p*4)) alpha[p]=0;
  return { W, H, data, alpha };
}

function sample(fr, fx, fy) {
  const { W, H, data, alpha } = fr;
  const x0=Math.floor(fx), y0=Math.floor(fy);
  let r=0,g=0,b=0,a=0,ws=0;
  for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
    const x=x0+dx,y=y0+dy;if(x<0||y<0||x>=W||y>=H)continue;
    const w=(1-Math.abs(fx-x))*(1-Math.abs(fy-y));const p=y*W+x;
    if(alpha[p]){const i=p*4;r+=data[i]*w;g+=data[i+1]*w;b+=data[i+2]*w;a+=w;}
    ws+=w;
  }
  if(a<=0)return null;
  return [r/a,g/a,b/a,Math.round(255*a/ws)];
}

function edgePad(buf,W,H,iters){
  for(let it=0;it<iters;it++){
    const src=buf.slice();
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const p=(y*W+x)*4; if(src[p+3]>0)continue;
      let r=0,g=0,b=0,n=0;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=W||yy>=H)continue;
        const q=(yy*W+xx)*4;if(src[q+3]>0){r+=src[q];g+=src[q+1];b+=src[q+2];n++;}
      }
      if(n){buf[p]=r/n|0;buf[p+1]=g/n|0;buf[p+2]=b/n|0;}
    }
  }
}

const handles = {};
for (const [dir, path] of SRC) {
  const fr = key(fs.readFileSync(path));
  const { W, H, alpha, data } = fr;
  // bbox of opaque + cyan grip centroid (G,B high & R low)
  let minX=1e9,maxX=-1,minY=1e9,maxY=-1, gx=0,gy=0,gn=0;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const p=y*W+x; if(!alpha[p])continue;
    if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;
    const i=p*4,R=data[i],G=data[i+1],B=data[i+2];
    if(G>110 && B>110 && R<G-35 && R<B-35){gx+=x;gy+=y;gn++;}
  }
  const PAD=4;
  minX=Math.max(0,minX-PAD);minY=Math.max(0,minY-PAD);maxX=Math.min(W-1,maxX+PAD);maxY=Math.min(H-1,maxY+PAD);
  const bw=maxX-minX+1, bh=maxY-minY+1;
  const scale = OUT_H / bh;
  const ow = Math.round(bw*scale), oh = OUT_H;
  const out = new Uint8Array(ow*oh*4);
  for(let y=0;y<oh;y++)for(let x=0;x<ow;x++){
    const c = sample(fr, minX + x/scale, minY + y/scale);
    const di=(y*ow+x)*4;
    if(c && c[3]>8){out[di]=c[0]|0;out[di+1]=c[1]|0;out[di+2]=c[2]|0;out[di+3]=c[3];}
  }
  edgePad(out, ow, oh, 2);
  // handle (grip) in OUTPUT coords
  const hx = gn ? Math.round((gx/gn - minX)*scale) : Math.round(ow/2);
  const hy = gn ? Math.round((gy/gn - minY)*scale) : Math.round(oh*0.25);
  const outPath = `${OUT_DIR}/greatsword-${dir}.png`;
  fs.writeFileSync(outPath, encode({ width: ow, height: oh, data: out }));
  handles[`greatsword-${dir}`] = [hx, hy];
  console.log(`${dir}: ${ow}x${oh}  grip[${hx},${hy}]  -> ${outPath}`);
}
console.log('\nhandles.json entries:');
console.log(JSON.stringify(handles));
