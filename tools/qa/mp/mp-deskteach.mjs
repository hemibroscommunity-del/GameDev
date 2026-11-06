/* ═══ THE FIRST-TIME TEACHING A NEW COMPUTER PLAYER MISSED (v2.3.4343) ═══
 * The owner watched a new player on a computer (2026-11-05).  On a computer
 * (1280 x 800, a mouse), in the Wheel:
 *   1. the first quest taken, the weapons on, the band open: the big arrow
 *      points at CLOSE, "Click CLOSE to see more of the world";
 *   2. a tree harvested by a tap of E: at the window a big E key by the
 *      character and the arrow at the pad; walking off without it: the toast
 *      "Almost! ..."; then E held to the end: one harvest counted;
 *   3. a quest wanting logs (the client's own copy of the quests set): the
 *      matching trees ringed on the screen, or an edge arrow toward the nearest;
 *   4. a monster comes near: "Click the monster to attack", a sword cursor
 *      over it;
 *   5. the first kill: the tips card (Right-click, Q), once;
 *   6. no page errors.
 * Pictures: tools/qa/mp/out/deskteach-<step>.png.  Unit rules: server/test/desk-teach.test.mjs. */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const DESK = { width: 1280, height: 800 };
const nearestTree = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, p = S.player;
  let best = null, d = Infinity;
  for (const n of S.gatherNodes || []) {
    if (n.nodeType !== 'tree' || !n.alive || (n.gatherLvl || 1) !== 1) continue;
    const dd = Math.hypot(n.x - p.x, n.y - p.y);
    if (dd < d) { d = dd; best = { id: n.id, x: n.x, y: n.y }; }
  }
  return best;
});
const qa = (P) => P.page.evaluate(() => ({ t: window.__btDeskTeach ? Object.assign({}, window.__btDeskTeach) : null, a: window.__btGuideArrow ? { lesson: window.__btGuideArrow.lesson, sel: window.__btGuideArrow.sel } : null }));
const until = async (P, f, ms = 15000) => {
  const t0 = Date.now(); let v = null;
  while (Date.now() - t0 < ms) { v = await qa(P); if (f(v)) return v; await P.page.waitForTimeout(250); }
  return v;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Teachdesk', wsPort, webPort, viewport: DESK, world: 'wheel', wide: true });
  const shot = (n) => P.page.screenshot({ path: join(OUT, `deskteach-${n}.png`) }).catch(() => {});
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopAlive = H.keepAlive(P, 15000);
  try {
    await H.enterWorld(P);
    const myId = await H.readState(P, (S) => S.myId);
    await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading, n: (S.gatherNodes || []).length }), (v) => v.z === 'wheel' && !v.l && v.n > 0, { timeout: 150000, label: 'world' });
    await H.pastWelcome(P).catch(() => {});
    await H.grant(wsPort, myId, 'item', { invKey: 'woodcutting_axe', count: 1 }).catch(() => {});
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
    await P.page.addStyleTag({ content: '[data-coach-card], [data-coach-ring], .bt-quest-banner, .bt-quest-plate { visibility: hidden !important; }' }).catch(() => {});
    await P.page.waitForTimeout(2000);

    /* 1. CLOSE */
    await P.page.evaluate(() => { const S = window._gameState.current; if (S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } }); });
    await H.waitFor(P, (S) => (S.rpg && S.rpg._quests && S.rpg._quests.tut_1) || null, (v) => v === 'active', { timeout: 10000, label: 'tut_1' }).catch(() => null);
    await H.closeNpcDialogue(P).catch(() => {});
    await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch(() => null);
    await P.page.evaluate(() => {
      const S = window._gameState.current, R = S && S.rpg;
      if (!R || R.shield || !Array.isArray(R.shieldStash) || !R.shieldStash.length) return;
      const sh = R.shieldStash.shift(); R.shield = sh;
      if (S.channel && S._serverCaps && S._serverCaps.shieldwear) {
        const payload = (typeof sh.gid === 'string' && sh.gid) ? { gid: sh.gid } : { sig: [sh.name || '', sh.gearBase || '', sh.tierMult == null ? '' : sh.tierMult, sh.tier || ''].join('|') };
        try { S.channel.send({ type: 'shield_wear', payload }); } catch (e) { /* later */ }
      }
    });
    const c1 = await until(P, (v) => v.a && v.a.lesson === 'close', 20000);
    const words = await P.page.evaluate(() => { const el = document.querySelector('[data-guide-arrow]'); return el ? el.textContent : null; });
    await shot('1-close');
    rec.ok(`1. the first quest's steps, the band open: the big arrow points at CLOSE ("${words}")`, !!c1.a && c1.a.lesson === 'close' && /Click CLOSE to see more of the world/.test(words || ''), { c1, words });
    await P.page.click(c1.a.sel).catch(() => {});
    const c1b = await until(P, (v) => !v.a || v.a.lesson !== 'close', 8000);
    rec.ok('1b. CLOSE clicked: the arrow is gone', !c1b.a || c1b.a.lesson !== 'close', c1b);

    /* 2. the harvest */
    const node = await nearestTree(P);
    await H.hopTo(P, node.x, node.y - 130);
    await P.page.waitForTimeout(1500);
    await H.closeNpcDialogue(P).catch(() => {});
    await P.page.keyboard.press('e');
    await H.waitFor(P, (S) => (S._extraction ? S._extraction.status : null), (v) => v === 'ready', { timeout: 90000, label: 'the window opens' }).catch(() => null);
    const h1 = await until(P, (v) => v.t && v.t.key === true && v.a && v.a.lesson === 'harvest', 8000);
    await shot('2-harvest-e');
    rec.ok('2a. at the harvest window: the big E key by the character, and the arrow at the pad', !!h1.t && h1.t.key === true && !!h1.a && h1.a.lesson === 'harvest' && h1.a.sel === '.bt-rjoy-base', h1);
    await P.page.keyboard.down('d');
    await P.page.waitForTimeout(700);
    await P.page.keyboard.up('d');
    const h2 = await until(P, (v) => v.t && /Almost/.test(v.t.toast || ''), 8000);
    await shot('2-harvest-toast');
    rec.ok('2b. walked off without the gesture: the toast "Almost! Press E (or drag) when the bar empties to collect."', !!h2.t && /^Almost! Press E \(or drag\) when the bar empties to collect\.$/.test(h2.t.toast || ''), h2.t);
    await H.hopTo(P, node.x, node.y - 130);
    await P.page.waitForTimeout(1200);
    await P.page.keyboard.press('e');
    await H.waitFor(P, (S) => (S._extraction ? S._extraction.status : null), (v) => v === 'ready', { timeout: 90000, label: 'the window opens again' }).catch(() => null);
    await P.page.keyboard.down('e');
    const h3 = await until(P, (v) => v.t && v.t.harvest >= 1, 25000);
    await P.page.keyboard.up('e');
    rec.ok('2c. E held to the end: the harvest is counted (1 of 3)', !!h3.t && h3.t.harvest >= 1, h3.t);

    /* 3. the resource a quest wants (the client's own copy of the quests set) */
    await P.page.evaluate(() => { const S = window._gameState.current; S.rpg._quests = Object.assign({}, S.rpg._quests, { tut_1: 'turnedIn', wood_1: 'active' }); });
    const r1 = await until(P, (v) => v.t && v.t.node === 'tree' && (v.t.rings > 0 || v.t.edge), 12000);
    await shot('3-resource');
    rec.ok(`3. a quest wanting logs: the trees ringed (${r1.t && r1.t.rings}) or an edge arrow (${r1.t && r1.t.edge})`, !!r1.t && r1.t.node === 'tree' && (r1.t.rings > 0 || r1.t.edge === true), r1.t);

    /* 4. a monster comes near (a bare one, put in by the test) */
    const mon = await P.page.evaluate(() => {
      const S = window._gameState.current, p = S.player;
      const m = { id: 'qa_deskteach', x: p.x + 130, y: p.y, hp: 40, maxHp: 40, alive: true, name: 'Slime', type: 'slime' };
      S.monsters = (S.monsters || []).concat([m]);
      return { x: m.x, y: m.y };
    });
    const a1 = await until(P, (v) => v.t && /Click the monster to attack/.test(v.t.label || ''), 8000);
    const pos = await P.page.evaluate((m) => {
      const S = window._gameState.current, c = document.querySelector('canvas.brotown-canvas'), cr = c.getBoundingClientRect();
      return { x: cr.left + (m.x - S.camera.x) * (S._worldScaleX || 1), y: cr.top + (m.y - 14 - S.camera.y) * (S._worldScaleY || 1) };
    }, mon);
    await P.page.mouse.move(pos.x, pos.y);
    const cur = await until(P, (v) => v.t && v.t.cursor === true, 4000);
    await shot('4-attack');
    rec.ok('4. a monster near: the line "Click the monster to attack" and a sword cursor over it', !!a1.t && /Click the monster to attack/.test(a1.t.label || '') && !!cur.t && cur.t.cursor === true, { a1: a1.t, cur: cur.t });
    await P.page.evaluate(() => { const S = window._gameState.current; S.monsters = (S.monsters || []).filter((m) => m.id !== 'qa_deskteach'); });

    /* 5. the first kill: the tips card */
    await P.page.evaluate(() => { const S = window._gameState.current; S.rpg._compStats = Object.assign({}, S.rpg._compStats, { monstersKilled: 1 }); });
    const t1 = await until(P, (v) => v.t && v.t.tips === true, 8000);
    const card = await P.page.evaluate(() => { const el = document.querySelector('[data-desk-teach-tips]'); return el ? el.textContent : null; });
    await shot('5-tips');
    rec.ok(`5. the first kill: the combat tips card ("${card}")`, !!t1.t && t1.t.tips === true && /Right-click/.test(card || '') && /Q/.test(card || ''), { t1: t1.t, card });
    rec.ok('6. no page errors', errors.length === 0, errors.slice(0, 3));
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}
