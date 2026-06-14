import { chromium } from 'playwright-core';
const EXE = '/tmp/chrome-headless-shell-linux64/chrome-headless-shell';
const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ['--no-sandbox','--enable-unsafe-swiftshader','--mute-audio'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const page = await ctx.newPage();
const sheet404 = [];
const errors = [];
page.on('response', r => { if (/fish-south\.png/.test(r.url()) && r.status() >= 400) sheet404.push(r.url() + ' ' + r.status()); });
page.on('pageerror', e => errors.push(String(e)));
await page.addInitScript(`window.BROTOWN_WS_URL='ws://127.0.0.1:8787'`);
await page.goto('http://localhost:4173/?noresume=1',{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForTimeout(9000);
await page.locator('input').first().fill('FishBot',{timeout:30000});
await page.locator('input').first().press('Enter');
await page.waitForTimeout(13000);
await page.touchscreen.tap(195, 300);  // unlock audio / canvas
await page.waitForTimeout(1500);

// Force a fishing extraction in the 'ready' state with a node beside the player.
const setup = await page.evaluate(()=>{
  const S = window._gameState.current;
  if (!S || !S.player) return { ok:false, why:'no state' };
  const P = S.player;
  const node = { id:'qa-fish', x:P.x, y:P.y+10, alive:true, nodeType:'fishSpot',
                 skill:'fishing', gatherLvl:1, hp:2, maxHp:2, respawnTime:30000,
                 name:'QA Pool', resourceType:'fish' };
  S.gatherNodes = [node];
  const now = Date.now();
  S._extraction = { nodeId:'qa-fish', nodeRef:node, skill:'fishing',
                    startedAt:now, windowOpensAt:now-100, windowClosesAt:now+999999,
                    status:'ready', progress:0, reps:0, repsTarget:2, swipeSamples:[] };
  return { ok:true, px:P.x, py:P.y };
});
await page.waitForTimeout(900);  // let the fish pose + hole render a few frames

// Read what the renderer resolved.
const rendered = await page.evaluate(()=>{
  const disp = document.querySelector('canvas');
  // pull the renderer-published facing/pose off the player display if exposed
  const S = window._gameState.current;
  return { exSkill:S._extraction&&S._extraction.skill, exStatus:S._extraction&&S._extraction.status,
           renderFacing:S._renderFacing };
});
await page.screenshot({ path:'/tmp/qa-fishing.png' });
console.log('sheet 404s:', JSON.stringify(sheet404));
console.log('page errors:', JSON.stringify(errors.slice(0,5)));
console.log('rendered:', JSON.stringify(rendered));
const ok = sheet404.length===0 && errors.length===0 && rendered.exSkill==='fishing' && rendered.renderFacing==='south';
console.log(ok ? 'PASS: fishing extraction active, fish sheet loaded, facing locked south' : 'FAIL');
await browser.close(); process.exit(ok?0:1);
