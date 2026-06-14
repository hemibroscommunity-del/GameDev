/* Verifies the fishing reel:
   (1) a touch-drag over the character during fishing does NOT drive the
       movement joystick (S.stickX/Y stay ~0) -- it's claimed by the reel; and
   (2) a clockwise circular pointer gesture completes the catch (extraction
       clears + the node is consumed). */
import { chromium } from 'playwright-core';
const EXE = '/tmp/chrome-headless-shell-linux64/chrome-headless-shell';
const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ['--no-sandbox','--enable-unsafe-swiftshader','--mute-audio'] });
const ctx = await browser.newContext({ viewport: { width: 480, height: 900 }, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.addInitScript(`window.BROTOWN_WS_URL='ws://127.0.0.1:8787'`);
await page.goto('http://localhost:4173/?noresume=1',{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForTimeout(9000);
await page.locator('input').first().fill('ReelBot',{timeout:30000});
await page.locator('input').first().press('Enter');
await page.waitForFunction(()=>{const S=window._gameState&&window._gameState.current;return S&&S.player&&S.currentZone&&!document.body.innerText.includes('LOADING');},{timeout:45000}).catch(()=>{});
await page.waitForTimeout(2500);
await page.touchscreen.tap(240, 300);
await page.waitForTimeout(1200);

const setup = await page.evaluate(()=>{
  const S = window._gameState.current; const P = S.player;
  const node = { id:'qa', x:P.x, y:P.y, alive:true, nodeType:'fishSpot', skill:'fishing',
                 gatherLvl:1, hp:2, maxHp:2, respawnTime:30000, name:'QA', baseName:'Minnow', resourceType:'fish', xp:10 };
  S.gatherNodes=[node];
  P.x=node.x+52; P.y=node.y-43; P.vx=0; P.vy=0; S.stickX=0; S.stickY=0;
  const now=Date.now();
  S._extraction={nodeId:'qa',nodeRef:node,skill:'fishing',startedAt:now,windowOpensAt:now-100,windowClosesAt:now+9e9,status:'ready',progress:0,reps:0,repsTarget:2,swipeSamples:[]};
  return { cueX: P.x - S.camera.x, cueY: (P.y-24) - S.camera.y };
});

// (1) Touch-drag over the character -> must NOT move the joystick stick.
const moveTest = await page.evaluate(({cueX,cueY})=>{
  const S=window._gameState.current;
  const el = document.elementFromPoint(cueX, cueY) || document.body;
  const mk = (x,y)=>new Touch({ identifier:1, target:el, clientX:x, clientY:y, pageX:x, pageY:y });
  const dispatch=(type,x,y)=>{ const t=mk(x,y);
    el.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,touches:type==='touchend'?[]:[t],changedTouches:[t],targetTouches:type==='touchend'?[]:[t]})); };
  dispatch('touchstart', cueX, cueY);
  dispatch('touchmove',  cueX+60, cueY+10);   // a drag that WOULD move the player if not claimed
  const stick = { stickX:S.stickX, stickY:S.stickY };
  dispatch('touchend', cueX+60, cueY+10);
  return stick;
}, setup);

// (2) Clockwise circular reel via synthetic pointer events.
await page.evaluate(({cueX,cueY})=>{
  const fire=(type,x,y)=>window.dispatchEvent(new PointerEvent(type,{clientX:x,clientY:y,cancelable:true,bubbles:true,pointerId:2,pointerType:'touch'}));
  const R=55; fire('pointerdown', cueX+R, cueY);
  const steps=120;
  for(let i=1;i<=steps;i++){ const a=(i/steps)*Math.PI*2*3.3; fire('pointermove', cueX+R*Math.cos(a), cueY+R*Math.sin(a)); }
  fire('pointerup', cueX+R, cueY);
}, setup);
await page.waitForTimeout(700);

const after = await page.evaluate(()=>{
  const S=window._gameState.current;
  return { exNull: !S._extraction, nodeAlive: (S.gatherNodes[0]&&S.gatherNodes[0].alive),
           fish:(S.rpg._compStats&&S.rpg._compStats.fishCaught)||0 };
});

console.log('moveTest stick', JSON.stringify(moveTest));
console.log('after', JSON.stringify(after));
console.log('errors', JSON.stringify(errors.slice(0,4)));
const stickStayed = Math.abs(moveTest.stickX) < 0.01 && Math.abs(moveTest.stickY) < 0.01;
const caught = after.exNull && after.nodeAlive === false;
const ok = errors.length===0 && stickStayed && caught;
console.log('stickStayed', stickStayed, 'caught', caught);
console.log(ok ? 'PASS: reel completes the catch; reel touch does not move the player' : 'FAIL');
await browser.close(); process.exit(ok?0:1);
