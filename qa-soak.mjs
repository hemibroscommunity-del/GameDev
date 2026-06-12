import { chromium } from 'playwright-core';
const EXE = '/tmp/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://localhost:4173/';
const SHARED = process.argv.includes('--shared');   // two pages, one context (shared localStorage)

const browser = await chromium.launch({ executablePath: EXE, headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--mute-audio'] });

async function makePage(context, label) {
  const page = await context.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(label + ' ' + e.message.slice(0, 120)));
  page.on('console', (m) => { if (m.type() === 'error' && !/CORS|Failed to load|WebSocket/.test(m.text())) errs.push(label + ' ' + m.text().slice(0, 120)); });
  await page.addInitScript(`window.BROTOWN_WS_URL = 'ws://127.0.0.1:${process.env.QA_PORT || '8787'}'`);
  if (process.env.QA_CORRUPT) await page.addInitScript(() => {
    /* simulate a player whose pre-fix save corrupted pets/activePet (and
       whose SERVER record will bootstrap from this on first join) */
    try {
      const rpg = JSON.parse(localStorage.getItem('bt_rpg') || '{}');
      rpg.lifeSkills = rpg.lifeSkills || {};
      rpg.lifeSkills.pets = { 0: { name: 'CorruptCat', evolutionTier: 1 } };
      rpg.lifeSkills.activePet = {};
      localStorage.setItem('bt_rpg', JSON.stringify(rpg));
    } catch (e) {}
  });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(9000);
  const input = page.locator('input').first();
  await input.fill(label, { timeout: 30000 });
  await input.press('Enter');
  return { page, errs, label };
}

const sample = (p) => p.evaluate(() => {
  const S = window._gameState?.current;
  const r = window._pixiRenderer;
  let fps = null;
  return {
    heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    zone: S?.currentZone, status: S?._realtimeStatus,
    others: Object.keys(S?.others || {}).length,
    textures: (() => { try { return document.querySelectorAll('canvas').length; } catch (e) { return null; } })(),
    bakes: window.__btBakeStats ? { ...window.__btBakeStats } : null,
  };
}).catch(() => 'EVAL_DEAD');

const ctxA = await browser.newContext({ viewport: { width: 844, height: 390 } });
const ctxB = SHARED ? ctxA : await browser.newContext({ viewport: { width: 844, height: 390 } });
const A = await makePage(ctxA, 'SoakA');
await A.page.waitForTimeout(15000);
const B = await makePage(ctxB, 'SoakB');
await B.page.waitForTimeout(15000);
console.log('mode:', SHARED ? 'SHARED-CONTEXT (same browser)' : 'SEPARATE (two browsers)');

const KEYS = ['d', 'w', 'a', 's'];
for (let i = 0; i < 14; i++) {
  for (const s of [A, B]) {
    try {
      await s.page.keyboard.down(KEYS[i % 4]);
      await s.page.waitForTimeout(400);
      await s.page.keyboard.up(KEYS[i % 4]);
    } catch (e) {}
  }
  await A.page.waitForTimeout(8000);
  if (i % 3 === 0 || i === 13) {
    console.log(`t=${i}`, 'A:', JSON.stringify(await sample(A.page)));
    console.log(`t=${i}`, 'B:', JSON.stringify(await sample(B.page)));
  }
}
console.log('A errors:', A.errs.length, A.errs.slice(0, 4));
console.log('B errors:', B.errs.length, B.errs.slice(0, 4));
await browser.close();
