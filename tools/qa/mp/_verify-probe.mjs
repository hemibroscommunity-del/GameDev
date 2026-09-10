import * as H from './harness.mjs';
const WS = await H.freePort(), WEB = await H.freePort();
const worker = await H.startWorker(WS);
const srv = await H.serveDist(WEB);
const browser = await H.launch();

const SIZES = [{ w: 390, h: 844 }, { w: 390, h: 664 }];
for (const S of SIZES) {
  const P = await H.newPlayer(browser, { name: 'Probe', wsPort: WS, webPort: WEB,
    viewport: { width: S.w, height: S.h }, touch: true, dpr: 3 });
  await P.page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
  await P.page.click('[data-tut="login-create"]');
  await P.page.waitForSelector('input.bt-cc-name', { timeout: 30000 });
  await P.page.waitForTimeout(2200);
  const out = await P.page.evaluate(() => {
    const R = (sel) => { const e = document.querySelector(sel); if (!e) return null;
      const b = e.getBoundingClientRect();
      return { x:+b.x.toFixed(1), y:+b.y.toFixed(1), w:+b.width.toFixed(1), h:+b.height.toFixed(1), bottom:+b.bottom.toFixed(1), right:+b.right.toFixed(1) }; };
    const stage = document.querySelector('.bt-cc-stage');
    const cs = stage && getComputedStyle(stage);
    const cue = document.querySelector('.bt-cc-spincue');
    const cuecs = cue && getComputedStyle(cue);
    // figure ink from canvas
    const c = document.querySelector('.bt-cc-stage canvas');
    let ink = null;
    if (c) { const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
      let minX=c.width,maxX=-1,minY=c.height,maxY=-1;
      for (let y=0;y<c.height;y++) for (let x=0;x<c.width;x++){ if (d[(y*c.width+x)*4+3]<40) continue;
        if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y; }
      const r=c.getBoundingClientRect(), s=r.width/c.width;
      ink = { left:+(r.left+minX*s).toFixed(1), right:+(r.left+(maxX+1)*s).toFixed(1),
              top:+(r.top+minY*s).toFixed(1), bottom:+(r.top+(maxY+1)*s).toFixed(1) };
    }
    return {
      stage: R('.bt-cc-stage'),
      stageLayout: stage ? { offW: stage.offsetWidth, offH: stage.offsetHeight, aspect: cs.aspectRatio, transform: cs.transform } : null,
      platGroup: R('.bt-cc-stage > div'),
      platImg: R('.bt-cc-stage img[src*="platform"]'),
      canvas: R('.bt-cc-stage canvas'),
      cue: R('.bt-cc-spincue'),
      cueStyle: cue ? { width: cuecs.width, bottom: cuecs.bottom, opacity: cuecs.opacity, pointerEvents: cuecs.pointerEvents, willChange: cuecs.willChange, natural: cue.naturalWidth+'x'+cue.naturalHeight } : null,
      cluster: R('.bt-cc-cluster'),
      clusterZ: (()=>{ const e=document.querySelector('.bt-cc-cluster'); return e?getComputedStyle(e).zIndex:null; })(),
      colLeftZ: (()=>{ const e=document.querySelector('.bt-cc-col-left'); return e?getComputedStyle(e).zIndex:null; })(),
      sword: R('.bt-cc-logo-sword'),
      ink,
      hitAtCueCentre: (()=>{ const e=document.querySelector('.bt-cc-spincue'); if(!e) return null;
        const b=e.getBoundingClientRect(); const el=document.elementFromPoint(b.x+b.width/2, b.y+b.height/2);
        return el ? el.tagName+'.'+(typeof el.className==='string'?el.className:'') : null; })(),
      hitAtCueBottom: (()=>{ const e=document.querySelector('.bt-cc-spincue'); if(!e) return null;
        const b=e.getBoundingClientRect(); const el=document.elementFromPoint(b.x+b.width/2, b.bottom-1);
        return el ? el.tagName+'.'+(typeof el.className==='string'?el.className:'') : null; })(),
      colLeft: R('.bt-cc-col-left'),
    };
  });
  console.log('==== ' + S.w + 'x' + S.h + ' ====');
  console.log(JSON.stringify(out, null, 1));
  await P.ctx.close().catch(()=>{});
}
await browser.close(); srv.close(); await H.stopWorker(worker);
