import { decode, encode } from '/home/user/GameDev/tools/png.mjs';
import fs from 'node:fs';
// args: armPath basePath fw fh crownKey chestOut legsOut [thresh headFrac]
const [armP,baseP,fwS,fhS,crownKey,chestOut,legsOut,thS,hfS]=process.argv.slice(2);
const fw=+fwS,fh=+fhS,thresh=thS?+thS:45,headFrac=hfS?+hfS:0.24;
const arm=decode(fs.readFileSync(armP)), base=decode(fs.readFileSync(baseP));
const W=arm.width,H=arm.height,N=Math.round(W/fw),ad=arm.data,bd=base.data;
const cr=(JSON.parse(fs.readFileSync('public/sprites/skills/crowns.json','utf8'))[crownKey]||{}).crowns||[];
const isGreen=(d,i)=>{const R=d[i],G=d[i+1],B=d[i+2];return G>R+25&&G>B+25&&G>70;};
const isSkin=(R,G,B)=>R>120&&R>G&&G>B&&(R-G)<70&&(G-B)<70;
const isWeap=(R,G,B)=>(R>90&&B>70&&G<R-30&&G<B-20)||(G>110&&B>110&&R<G-30&&R<B-30);
const chest=new Uint8Array(W*H*4), legs=new Uint8Array(W*H*4);
let MIN=18;
for(let f=0;f<N;f++){
  // per-frame metrics from the armored figure
  let top=H,bot=0,gy=0,gn=0;
  for(let y=0;y<H;y++)for(let x=0;x<fw;x++){const i=(y*W+f*fw+x)*4;if(ad[i+3]>20){if(y<top)top=y;if(y>bot)bot=y;if(isGreen(ad,i)){gy+=y;gn++;}}}
  const bh=bot-top; const c=cr[Math.min(f,cr.length-1)]; const crownY=c?c[1]:top;
  const headLine=crownY+headFrac*bh; const belt=gn?gy/gn:top+bh*0.55;
  // armor-only mask via diff vs base (changed/added pixels), minus head band + skin
  const m=new Uint8Array(fw*H);
  for(let y=0;y<H;y++)for(let x=0;x<fw;x++){const i=(y*W+f*fw+x)*4;if(ad[i+3]<=20)continue;if(y<headLine)continue;
    const R=ad[i],G=ad[i+1],B=ad[i+2];if(isSkin(R,G,B)||isWeap(R,G,B))continue;
    let armorPix;
    if(bd[i+3]>20){const d=Math.max(Math.abs(R-bd[i]),Math.abs(G-bd[i+1]),Math.abs(B-bd[i+2]));armorPix=d>thresh;}
    else armorPix=true;
    if(armorPix)m[y*fw+x]=1;}
  // despeckle: drop tiny components
  const seen=new Uint8Array(fw*H);
  for(let p0=0;p0<fw*H;p0++){if(seen[p0]||!m[p0])continue;const st=[p0],blob=[p0];seen[p0]=1;while(st.length){const p=st.pop();const x=p%fw,y=(p/fw)|0;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=fw||yy>=H)continue;const q=yy*fw+xx;if(!seen[q]&&m[q]){seen[q]=1;st.push(q);blob.push(q);}}}if(blob.length<MIN)for(const p of blob)m[p]=0;}
  // assign chest/legs
  for(let y=0;y<H;y++)for(let x=0;x<fw;x++){if(!m[y*fw+x])continue;const i=(y*W+f*fw+x)*4;const tgt=(y<=belt)?chest:legs;tgt[i]=ad[i];tgt[i+1]=ad[i+1];tgt[i+2]=ad[i+2];tgt[i+3]=255;}
}
fs.writeFileSync(chestOut,encode({width:W,height:H,data:chest}));
fs.writeFileSync(legsOut,encode({width:W,height:H,data:legs}));
console.log('diff-extracted',chestOut.split('/').pop(),N,'frames');
