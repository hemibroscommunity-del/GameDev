/* ═══ THE FIRST QUEST'S GUIDANCE: FLASHES, MAYOR BRO'S MARK, THE CARD'S CHECK ═══
 * (v2.3.3047-v2.3.3049)
 *
 * Owner, 2026-10-05:
 *   "After accepting first quest make 'OPEN' on dashboard flash.  Then make
 *    sword and shield both flash."
 *   "After receiving staff and bow from first quest make 'OPEN' on dashboard
 *    flash (if not already open) and make both weapons flash."
 *   "Make the quest notification turn to a green checkmark if you have
 *    everything you need to complete the quest."
 *   "When you've accepted a quest from mayor bro and he's waiting for you to
 *    get the items make it turn into a gray question mark.  When you have all
 *    the items make it turn into a green checkmark above his head (not emoji)."
 *
 * On a phone in the Wheel, against a real worker:
 *   1. before the quest, the Wheel's Mayor Bro offers it: '❗';
 *   2. accepted, he waits on you: '❔' (a grey "?", drawn still), and the
 *      quest card leads with the quest picture, not an emoji;
 *   3. the folded dashboard's OPEN flashes; opened, the sword AND the shield
 *      tiles flash -- and nothing else in the bag;
 *   4. the sword on, only the shield still flashes;
 *   5. four snowmen in the bag: his mark is the green check ('❓', drawn, no
 *      glyph) and the card's picture is the painted check;
 *   6. handed in: the bow AND the staff flash, and his mark offers the next
 *      quest ('❗');
 *   7. no page errors.
 * Pictures: tools/qa/mp/out/questguide-{waiting,open,tiles,ready,reward}.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

const mayor = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const m = (Array.isArray(S.npcs) ? S.npcs : []).find((n) => n && n.name === 'Mayor Bro');
  return m ? { mark: m._questMarker || null, x: Math.round(m.x), y: Math.round(m.y) } : null;
});
const flash = (P) => P.page.evaluate(() => (window.__btGearFlash ? JSON.parse(JSON.stringify(window.__btGearFlash)) : null));
const card = (P) => P.page.evaluate(() => {
  const im = document.querySelector('[data-quest-hud-mark]');
  return im ? { mark: im.getAttribute('data-quest-hud-mark'), src: im.getAttribute('src') || '', alt: im.getAttribute('alt') || '',
    text: (im.parentElement && im.parentElement.textContent) || '' } : null;
});

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Guidebro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const myId = await H.readState(P, (S) => S.myId);
    await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 120000, label: 'into the Wheel' }).catch(() => null);
    let m0 = null;
    for (let i = 0; i < 30 && !(m0 && m0.mark); i++) { m0 = await mayor(P); if (!(m0 && m0.mark)) await P.page.waitForTimeout(400); }
    rec.ok(`1. before the quest the Wheel's Mayor Bro offers it ("${m0 && m0.mark}")`, !!m0 && m0.mark === '❗', m0);

    /* 2. accepted */
    await P.page.evaluate(() => { const S = window._gameState.current; if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } }); });
    const got = await H.waitFor(P, (S) => {
      const R = S.rpg || {};
      return { st: (R._quests || {}).tut_1, w: (R.weaponStash || []).map((x) => x && x.type), sh: (R.shieldStash || []).length };
    }, (v) => v.st === 'active' && v.w.length > 0 && v.sh > 0, { timeout: 20000, label: 'tut_1 accepted, gear in the bag' }).catch(() => null);
    rec.ok('accepted: the sword and the shield are in the bag (guard)', !!got, got);
    await P.page.waitForTimeout(900);
    const m1 = await mayor(P);
    rec.ok(`2. accepted, he waits on you: a grey "?" ("${m1 && m1.mark}")`, !!m1 && m1.mark === '❔', m1);
    const c1 = await card(P);
    rec.ok('...and the quest card leads with the quest picture, no emoji', !!c1 && c1.mark === 'quest' && /panel-quests/.test(c1.src) && !/\u{1F4DC}|✓/u.test(c1.text), c1);
    await P.page.screenshot({ path: join(OUT, 'questguide-waiting.png') }).catch(() => {});

    /* 3. OPEN flashes on a folded band; opened, the two tiles */
    const folded = await P.page.evaluate(() => !!document.querySelector('[data-dash-fold="min"]'));
    if (!folded) {
      /* the first join folds the band (v2.3.2495); a resume may not -- fold it */
      await P.page.click('[data-dash-fold="open"]').catch(() => {});
      await P.page.waitForTimeout(700);
    }
    const f1 = await H.waitFor(P, () => window.__btGearFlash || null, (v) => !!v && v.lit.indexOf('min') >= 0, { timeout: 6000, label: 'OPEN flashing' }).catch(() => null);
    const flashOn = await P.page.evaluate(() => { const el = document.querySelector('[data-dash-fold="min"]'); return el ? el.getAttribute('data-flash') : null; });
    rec.ok('3. with the band folded, OPEN flashes', !!f1 && flashOn === '1', { f1, flashOn });
    await P.page.screenshot({ path: join(OUT, 'questguide-open.png'), clip: { x: 0, y: PHONE.height - 260, width: PHONE.width, height: 260 } }).catch(() => {});
    /* force: the chip is mid-flash (a glow only since the first run, but a
       tap here should never wait on an animation) */
    await P.page.click('[data-dash-fold="min"]', { force: true }).catch(() => {});
    const f2 = await H.waitFor(P, () => window.__btGearFlash || null,
      (v) => !!v && v.lit.some((k) => k === 'greatsword' || k === 'sword') && v.lit.indexOf('shield') >= 0, { timeout: 8000, label: 'the tiles flashing' }).catch(() => null);
    const lit = await P.page.evaluate(() => Array.from(document.querySelectorAll('[data-flash="1"]')).map((el) => el.getAttribute('data-gear') || el.getAttribute('data-dash-fold') || el.getAttribute('data-nav') || '?'));
    rec.ok(`...opened, the sword AND the shield flash, and nothing else (${lit.join(', ')})`,
      !!f2 && lit.length === 2 && lit.some((k) => k === 'greatsword' || k === 'sword') && lit.indexOf('shield') >= 0, { f2, lit });
    await P.page.waitForTimeout(500);
    await P.page.screenshot({ path: join(OUT, 'questguide-tiles.png'), clip: { x: 0, y: PHONE.height - 420, width: PHONE.width, height: 420 } }).catch(() => {});

    /* 4. the sword on */
    const sw = await H.readState(P, (S) => ((S.rpg.weaponStash || []).find((w) => w && (w.type === 'greatsword' || w.type === 'sword')) || {}).type || null);
    await H.equipWeapon(P, sw || 'greatsword', 'weapon', 'melee');
    const f3 = await H.waitFor(P, () => window.__btGearFlash || null,
      (v) => !!v && !v.lit.some((k) => k === 'greatsword' || k === 'sword') && v.lit.indexOf('shield') >= 0, { timeout: 10000, label: 'only the shield' }).catch(() => null);
    rec.ok('4. the sword on, only the shield still flashes', !!f3, f3 || await flash(P));

    /* 5. ready */
    await H.grant(wsPort, myId, 'item', { invKey: 'snowman', count: 4 }).catch(() => {});
    let m2 = null;
    for (let i = 0; i < 30 && !(m2 && m2.mark === '❓'); i++) { m2 = await mayor(P); if (!(m2 && m2.mark === '❓')) await P.page.waitForTimeout(400); }
    rec.ok(`5. the four snowmen in the bag: his mark is the green check ("${m2 && m2.mark}")`, !!m2 && m2.mark === '❓', m2);
    const c2 = await card(P);
    rec.ok('...and the quest card\'s picture is the painted green check', !!c2 && c2.mark === 'ready' && /quest\/check\.webp/.test(c2.src), c2);
    await P.page.screenshot({ path: join(OUT, 'questguide-ready.png'), clip: { x: 0, y: 0, width: PHONE.width, height: 200 } }).catch(() => {});

    /* 6. handed in */
    await P.page.evaluate(() => { const S = window._gameState.current; if (S && S.channel) S.channel.send({ type: 'quest_turn_in', payload: { questId: 'tut_1', xpCat: 'sword' } }); });
    const paid = await H.waitFor(P, (S) => {
      const R = S.rpg || {};
      return { st: (R._quests || {}).tut_1, w: (R.weaponStash || []).map((x) => x && x.type) };
    }, (v) => v.st === 'turnedIn' && v.w.indexOf('bow') >= 0 && v.w.indexOf('staff') >= 0, { timeout: 20000, label: 'the bow and the staff' }).catch(() => null);
    rec.ok('handed in: the bow and the staff are in the bag (guard)', !!paid, paid);
    const f4 = await H.waitFor(P, () => window.__btGearFlash || null,
      (v) => !!v && (v.lit.indexOf('bow') >= 0 && v.lit.indexOf('staff') >= 0 || v.lit.indexOf('min') >= 0 || v.lit.indexOf('dashboard') >= 0), { timeout: 10000, label: 'the reward flashing' }).catch(() => null);
    rec.ok(`6. the bow AND the staff flash (or OPEN / Dashboard, the way to them): ${f4 ? f4.lit.join(', ') : '-'}`, !!f4, f4);
    await P.page.waitForTimeout(500);
    await P.page.screenshot({ path: join(OUT, 'questguide-reward.png'), clip: { x: 0, y: PHONE.height - 420, width: PHONE.width, height: 420 } }).catch(() => {});
    const m3 = await mayor(P);
    rec.ok(`...and Mayor Bro offers the next quest ("${m3 && m3.mark}")`, !!m3 && m3.mark === '❗', m3);
    rec.ok('7. no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
