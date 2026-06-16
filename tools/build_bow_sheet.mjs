/* Build one bow-shoot sprite sheet from the owner's per-frame PNG uploads
 * (arrow already removed in the source art).  Keys the flat background,
 * normalizes each frame to a constant body height with feet planted and the
 * body horizontally centred, tiles into a horizontal strip, and prints the
 * effectsRenderer cfg line + crowns.json entry to paste.
 *
 * Usage: node tools/build_bow_sheet.mjs <dir> <out.png> <frame1> <frame2> ...
 *   <dir> is just a label used for the printed cfg/crown key (e.g. bow_sw).
 *
 * Geometry contract (matches effectsRenderer._updateBowShot + _placeSkillTraitsOn):
 *   - body crown-to-foot == BODY_H px (renderer scales by bodyH/188).
 *   - sprite anchor (0.5, feetY/fh): frame centre-x is the body centre, feetY
 *     is the foot row.  crowns.json fh == feetY, fw == sheet fw; crown[x,y] is
 *     the head-crown in sheet pixels. */
import { decode, encode } from './png.mjs';
import fs from 'node:fs';

const BODY_H = 188;        // crown-to-foot target (the renderer's /188 reference)
const PAD_X = 10;          // horizontal breathing room each side
const PAD_TOP = 12;        // room above the highest point (bow tip / head)
const PAD_BOT = 6;         // room below the feet

const [dir, outPath, ...frameFiles] = process.argv.slice(2);

function keyFrame(buf) {
  const { width: W, height: H, data } = decode(buf);
  const corners = [[0,0],[W-1,0],[0,H-1],[W-1,H-1]];
  let br=0,bg=0,bb=0; for (const [x,y] of corners){const i=(y*W+x)*4;br+=data[i];bg+=data[i+1];bb+=data[i+2];}
  br/=4;bg/=4;bb/=4;
  /* The background is a flat NEUTRAL grey.  Everything on the figure is either
     warm (skin), olive (pants), saturated magenta/cyan (bow/grip) or dark
     (boots) -- none of it is light neutral grey -- so we can key the bg
     GLOBALLY rather than only edge-connected.  That also removes the grey
     trapped inside the bow loop (between the limb, the string and the arm),
     which an edge flood-fill can't reach. */
  const alpha=new Uint8Array(W*H).fill(255);
  for(let p=0;p<W*H;p++){
    const i=p*4;
    const dr=Math.abs(data[i]-br),dg=Math.abs(data[i+1]-bg),db=Math.abs(data[i+2]-bb);
    const d=Math.max(dr,dg,db);
    const sat=Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2]);
    // core bg, or a near-bg low-saturation anti-alias pixel
    if(d<36 || (d<64 && sat<22)) alpha[p]=0;
  }
  return { W, H, data, alpha };
}

/* Measure the figure: feet (figure bottom — the bow never reaches below the
 * boots in these poses), head crown (topmost skin), and body centre-x taken
 * from the bottom band (legs/boots only, so the side-mounted bow doesn't pull
 * the centre off). */
function measure(fr) {
  const { W, H, data, alpha } = fr;
  let minX=1e9,maxX=-1,minY=1e9,maxY=-1, headY=1e9, headXs=[];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const p=y*W+x; if(alpha[p]===0)continue;
    if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;
    const i=p*4,R=data[i],G=data[i+1],B=data[i+2];
    const skin = R>120 && R>G+15 && G>B+10;
    if(skin){ if(y<headY){headY=y;headXs=[x];} else if(y===headY) headXs.push(x); }
  }
  const feetY=maxY, headTopY=headY;
  const headX = Math.round(headXs.reduce((a,b)=>a+b,0)/headXs.length);
  // body centre-x from the bottom 18% of the body height (legs + boots)
  const band = Math.round((feetY-headTopY)*0.18);
  let sx=0,n=0;
  for(let y=feetY-band;y<=feetY;y++)for(let x=0;x<W;x++){const p=y*W+x;if(alpha[p]){sx+=x;n++;}}
  const centerX = Math.round(sx/n);
  return { minX,maxX,minY,maxY, feetY, headTopY, headX, centerX };
}

const frames = frameFiles.map(f=>{const fr=keyFrame(fs.readFileSync(f));return {fr, m:measure(fr)};});

// per-frame scale so each body is exactly BODY_H tall (removes source drift)
for (const o of frames) o.scale = BODY_H / (o.m.feetY - o.m.headTopY);

// common frame size: max extents from (centerX, feetY) across frames, scaled
let L=0,R=0,T=0,Bm=0;
for (const o of frames){
  const {minX,maxX,minY,maxY,feetY,centerX}=o.m, s=o.scale;
  L=Math.max(L,(centerX-minX)*s);
  R=Math.max(R,(maxX-centerX)*s);
  T=Math.max(T,(feetY-minY)*s);
  Bm=Math.max(Bm,(maxY-feetY)*s);
}
const half=Math.ceil(Math.max(L,R))+PAD_X;
const fw=half*2;
const feetY=Math.ceil(T)+PAD_TOP;
const fh=feetY+Math.ceil(Bm)+PAD_BOT;

const N=frames.length;
const sheet=new Uint8Array(fw*N*fh*4);
const SW=fw*N;
const crowns=[];

function sampleBilinear(fr,fx,fy){
  const {W,H,data,alpha}=fr;
  const x0=Math.floor(fx),y0=Math.floor(fy);
  let r=0,g=0,b=0,a=0,wsum=0;
  for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
    const x=x0+dx,y=y0+dy;if(x<0||y<0||x>=W||y>=H)continue;
    const wx=1-Math.abs(fx-x),wy=1-Math.abs(fy-y),w=wx*wy;const p=y*W+x;
    if(alpha[p]){const i=p*4;r+=data[i]*w;g+=data[i+1]*w;b+=data[i+2]*w;a+=w;}
    wsum+=w;
  }
  if(a<=0)return null;
  return [r/a,g/a,b/a,Math.round(255*a/wsum)];
}

frames.forEach((o,fi)=>{
  const {fr,m,scale}=o;
  const ox=fi*fw;
  for(let y=0;y<fh;y++)for(let x=0;x<fw;x++){
    // output (x,y) -> source coords
    const sxF = m.centerX + (x-half)/scale;
    const syF = m.feetY  + (y-feetY)/scale;
    const c=sampleBilinear(fr,sxF,syF);
    const di=((y)*SW+(ox+x))*4;
    if(c && c[3]>8){sheet[di]=c[0]|0;sheet[di+1]=c[1]|0;sheet[di+2]=c[2]|0;sheet[di+3]=c[3];}
  }
  const cx=Math.round((m.headX-m.centerX)*scale+half);
  const cy=Math.round((m.headTopY-m.feetY)*scale+feetY);
  crowns.push([cx,cy]);
});

// edge-pad: bleed nearest opaque RGB into transparent pixels so downscale
// filtering can't pull the (gray) background colour into the silhouette.
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
      if(n){buf[p]=r/n|0;buf[p+1]=g/n|0;buf[p+2]=b/n|0;/* alpha stays 0 */}
    }
  }
}
edgePad(sheet,SW,fh,2);

fs.writeFileSync(outPath,encode({width:SW,height:fh,data:sheet}));
console.log('WROTE',outPath, SW+'x'+fh, N+'frames');
console.log('  fw',fw,'fh',fh,'feetY',feetY);
console.log('  cfg: { url: \''+outPath.replace(/.*public/,'')+'\', fw: '+fw+', fh: '+fh+', feetY: '+feetY+', crownKey: \''+dir+'\', traitDir: \'...\' },');
console.log('  crowns: "'+dir+'":{"fw":'+fw+',"fh":'+feetY+',"crowns":'+JSON.stringify(crowns)+'}');
