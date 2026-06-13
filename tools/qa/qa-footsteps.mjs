import { chromium } from 'playwright-core';
const EXE = '/tmp/chrome-headless-shell-linux64/chrome-headless-shell';
const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ['--no-sandbox','--enable-unsafe-swiftshader','--mute-audio'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const page = await ctx.newPage();
const fetched = [];
page.on('request', r => { if (/\/sfx\/footstep\//.test(r.url())) fetched.push(r.url().split('/').pop()); });
await page.addInitScript(`window.BROTOWN_WS_URL='ws://127.0.0.1:8787'`);
await page.goto('http://localhost:4173/?noresume=1',{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForTimeout(9000);
await page.locator('input').first().fill('FsBot',{timeout:30000});
await page.locator('input').first().press('Enter');
await page.waitForTimeout(13000);
// real tap to unlock audio -> loadSfxManifest fetches all SFX incl footsteps
await page.touchscreen.tap(195, 300);
await page.waitForTimeout(2500);
// move the player and confirm the footstep trigger fires (steps increment); also read equipped armor
const res = await page.evaluate(()=>new Promise(resolve=>{
  const S=window._gameState.current;
  const before = (S.stats&&S.stats.steps)||0;
  let n=0; const iv=setInterval(()=>{ S.stickX=1; S.stickY=0;  // walk right
    if(++n>=40){ clearInterval(iv); S.stickX=0;
      resolve({ stepsBefore:before, stepsAfter:(S.stats&&S.stats.steps)||0,
        armorEquipped: { chest:(S.rpg&&S.rpg.armor&&S.rpg.armor.chest)||null } }); }
  },25);
}));
console.log('footstep wavs fetched:', JSON.stringify([...new Set(fetched)]));
console.log('move result:', JSON.stringify(res));
const ok = fetched.includes('footstep-naked.wav') && fetched.includes('footstep-armored.wav') && res.stepsAfter > res.stepsBefore;
console.log(ok ? 'PASS: footstep samples loaded + step trigger fires while moving' : 'FAIL');
await browser.close(); process.exit(ok?0:1);
