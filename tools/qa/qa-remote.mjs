/* v2.3.840 QA: remote-player facing propagation + special-attack broadcast.
 * Two sessions in one room: A moves northeast -> B should see A's facing as
 * 'northeast' (the sender's own _renderFacing, not a stale derivation).  Then
 * A broadcasts a special projectile -> B should receive it with isSpecial. */
import { chromium } from 'playwright-core';
const EXE = '/tmp/chrome-headless-shell-linux64/chrome-headless-shell';
const browser = await chromium.launch({ executablePath: EXE, headless: true,
  args: ['--no-sandbox','--enable-unsafe-swiftshader','--mute-audio'] });
async function join(label) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.addInitScript(`window.BROTOWN_WS_URL='ws://127.0.0.1:8787'`);
  await page.goto('http://localhost:4173/?room=qa-remote', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(8000);
  await page.locator('input').first().fill(label, { timeout: 30000 });
  await page.locator('input').first().press('Enter');
  await page.waitForTimeout(13000);
  const id = await page.evaluate(() => window._gameState.current.myId);
  return { page, id };
}
const A = await join('Amover');
const B = await join('Bwatch');
await A.page.waitForTimeout(3000);
// A moves NORTHEAST (right + up) for ~2.5s
await A.page.evaluate(() => new Promise(res => { const S = window._gameState.current; let n=0;
  const iv = setInterval(() => { S.stickX = 1; S.stickY = -1; if (++n >= 100) { clearInterval(iv); res(); } }, 25); }));
await B.page.waitForTimeout(800);
const facing = await B.page.evaluate((aid) => {
  const S = window._gameState.current; const o = S.others && S.others[aid];
  return o ? { renderFacing: o._renderFacing, dir: o.dir, has: true } : { has: false };
}, A.id);
// A broadcasts a special projectile; B should receive it with isSpecial
await A.page.evaluate(() => { const S = window._gameState.current;
  S.channel.send({ type: 'broadcast', event: 'player_projectile', payload: { id: S.myId, x: Math.round(S.player.x), y: Math.round(S.player.y), ang: 0, isStaff: false, isSpecial: true, ts: Date.now() } }); });
await B.page.waitForTimeout(1200);
const proj = await B.page.evaluate((aid) => {
  const S = window._gameState.current; const list = S._remoteProjectiles || [];
  const mine = list.filter(p => p.ownerId === aid);
  return { count: mine.length, anySpecial: mine.some(p => p.isSpecial === true) };
}, A.id);
console.log('A id:', A.id, '| B sees A facing:', JSON.stringify(facing));
console.log('B remote special projectile:', JSON.stringify(proj));
const ok = facing.has && facing.renderFacing === 'northeast' && proj.anySpecial;
console.log(ok ? 'PASS: NE facing propagates to peer + special projectile broadcasts with isSpecial'
              : 'FAIL');
await browser.close();
process.exit(ok ? 0 : 1);
