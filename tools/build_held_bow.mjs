/* Build the per-facing HELD bow weapon textures from the owner's 5 bow-only
 * cutouts (magenta bow + cyan grip on a grey background).  Keys the grey bg
 * (incl. the gap trapped inside the bow loop), trims, downscales, and detects
 * the cyan GRIP centroid as the weapon "handle".  Emits one PNG per canonical
 * facing (the owner's NORTHWEST art is mirrored into the canonical NORTHEAST
 * slot, since resolveDirection keys the upper diagonal as 'northeast' and
 * mirrors it for northwest) + the handles.json entries to paste.
 */
import { decode, encode } from './png.mjs';
import fs from 'node:fs';

const U = '/root/.claude/uploads/73c0f056-011c-5271-8583-5160727c3247';
// [canonical dir, source file, mirrorSource?]
const SRC = [
  ['south',     `${U}/51afdbf3-F64B84DBC3E64B00A75A1A7A8FF2FE83.png`, false],
  ['southwest', `${U}/dfebf0b1-16F95DCBFE0543468C82E04638B7B3C0.png`, false],
  ['east',      `${U}/a4294c1a-8E362E6ED5064C1CA7AEFB703386C1D3.png`, false],
  ['northeast', `${U}/e4a909ee-7E11769088F6472A965F9CE28C1B8F97.png`, true],  // owner drew NW
  ['north',     `${U}/fb1a3435-DDDF4B97DC3F430FB200EDA8AEB4517C.png`, false],
];
const OUT_DIR = 'public/sprites/weapons/bows';
const OUT_H = 200;

function mirror(img) {
  const { width: W, height: H, data } = img;
  const out = new Uint8Array(W*H*4);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const s=(y*W+(W-1-x))*4, dd=(y*W+x)*4;
    out[dd]=data[s];out[dd+1]=data[s+1];out[dd+2]=data[s+2];out[dd+3]=data[s+3];
  }
  return { width: W, height: H, data: out };
}

function key(img) {
  const { width: W, height: H, data } = img;
  const corners=[[0,0],[W-1,0],[0,H-1],[W-1,H-1]];
  let br=0,bg=0,bb=0;for(const[x,y]of corners){const i=(y*W+x)*4;br+=data[i];bg+=data[i+1];bb+=data[i+2];}br/=4;bg/=4;bb/=4;
  const isBg=(i)=>{
    const d=Math.max(Math.abs(data[i]-br),Math.abs(data[i+1]-bg),Math.abs(data[i+2]-bb));
    const sat=Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2]);
    return d<40 || (d<70 && sat<24);
  };
  const alpha=new Uint8Array(W*H).fill(255);
  const st=[];
  const visit=(x,y)=>{if(x<0||y<0||x>=W||y>=H)return;const p=y*W+x;if(alpha[p]===0)return;if(isBg(p*4)){alpha[p]=0;st.push(p);}};
  for(let x=0;x<W;x++){visit(x,0);visit(x,H-1);}
  for(let y=0;y<H;y++){visit(0,y);visit(W-1,y);}
  while(st.length){const p=st.pop();const x=p%W,y=(p/W)|0;visit(x-1,y);visit(x+1,y);visit(x,y-1);visit(x,y+1);}
  // no character here -> safe to clear every remaining near-bg pixel (the loop).
  for(let p=0;p<W*H;p++) if(alpha[p] && isBg(p*4)) alpha[p]=0;
  return { W, H, data, alpha };
}

function sample(fr, fx, fy){
  const { W,H,data,alpha }=fr; const x0=Math.floor(fx),y0=Math.floor(fy);
  let r=0,g=0,b=0,a=0,ws=0;
  for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
    const x=x0+dx,y=y0+dy;if(x<0||y<0||x>=W||y>=H)continue;
    const w=(1-Math.abs(fx-x))*(1-Math.abs(fy-y));const p=y*W+x;
    if(alpha[p]){const i=p*4;r+=data[i]*w;g+=data[i+1]*w;b+=data[i+2]*w;a+=w;}ws+=w;
  }
  if(a<=0)return null; return [r/a,g/a,b/a,Math.round(255*a/ws)];
}

function edgePad(buf,W,H,iters){
  for(let it=0;it<iters;it++){const src=buf.slice();
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const p=(y*W+x)*4;if(src[p+3]>0)continue;
      let r=0,g=0,b=0,n=0;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=W||yy>=H)continue;const q=(yy*W+xx)*4;if(src[q+3]>0){r+=src[q];g+=src[q+1];b+=src[q+2];n++;}}
      if(n){buf[p]=r/n|0;buf[p+1]=g/n|0;buf[p+2]=b/n|0;}}}
}

const handles={};
for (const [dir, path, mir] of SRC) {
  let img = decode(fs.readFileSync(path));
  if (mir) img = mirror(img);
  const fr = key(img);
  const { W,H,alpha,data } = fr;
  let minX=1e9,maxX=-1,minY=1e9,maxY=-1, gx=0,gy=0,gn=0;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const p=y*W+x;if(!alpha[p])continue;
    if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;
    const i=p*4,R=data[i],G=data[i+1],B=data[i+2];
    if(G>110 && B>110 && R<G-35 && R<B-35){gx+=x;gy+=y;gn++;}}
  const PAD=4;minX=Math.max(0,minX-PAD);minY=Math.max(0,minY-PAD);maxX=Math.min(W-1,maxX+PAD);maxY=Math.min(H-1,maxY+PAD);
  const bw=maxX-minX+1, bh=maxY-minY+1, scale=OUT_H/bh, ow=Math.round(bw*scale), oh=OUT_H;
  const out=new Uint8Array(ow*oh*4);
  for(let y=0;y<oh;y++)for(let x=0;x<ow;x++){const c=sample(fr,minX+x/scale,minY+y/scale);const di=(y*ow+x)*4;if(c&&c[3]>8){out[di]=c[0]|0;out[di+1]=c[1]|0;out[di+2]=c[2]|0;out[di+3]=c[3];}}
  edgePad(out,ow,oh,2);
  const hx=gn?Math.round((gx/gn-minX)*scale):Math.round(ow/2);
  const hy=gn?Math.round((gy/gn-minY)*scale):Math.round(oh/2);
  const outPath=`${OUT_DIR}/bow-${dir}.png`;
  fs.writeFileSync(outPath, encode({width:ow,height:oh,data:out}));
  handles[`bow-${dir}`]=[hx,hy];
  console.log(`${dir}${mir?' (mirrored NW)':''}: ${ow}x${oh}  grip[${hx},${hy}] -> ${outPath}`);
}
console.log('\nhandles.json entries:');
console.log(JSON.stringify(handles));
