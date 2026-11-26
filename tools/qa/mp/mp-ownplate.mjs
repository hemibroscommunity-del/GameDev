/* ═══ v2.3.6788: YOUR OWN NAME PLATE, GONE WHILE THE HUD SAYS IT (card UI3, PR 9) ═══
 *
 * The owner, 2026-11-26: "Also remove the name plate on your bro (now that
 * it's already on hud it's redundant)".  The rule is src/game/ownPlate.js;
 * the renderer builds or destroys your plate when its answer changes
 * (entityRenderer.js _ownPlateSync).
 *
 * Two phones against a real worker, IN THE WORLD (`world: 'wheel'`, 375 x 667,
 * through H.joinPair):
 *   1. on A's phone A's own plate is not built (not hidden: not there) and
 *      B's is, with B's name; on B's phone the reverse; `__btSelfPlate` null;
 *   2. nothing is rebuilt and the rule is not asked while nothing changes
 *      (three seconds of frames);
 *   3. a sit and an emote (the Moves tab's own sender) bring no plate back;
 *   4. `?ownplate=1` (by replaceState: the page reads its address at each
 *      ask) brings A's plate back whole (its words, in its layer, shown) with
 *      the band where it was (nothing jumps); remembered without the address;
 *      `?ownplate=0` forgets and DESTROYS it (the Text's `destroyed`);
 *      `?hud=0` brings it back, `?hud=1` takes it away;
 *   5. sideways (667 x 375) the same;
 *   6. in a fight (Frost Ridge's snowmen, real hits) A's HP bar shows over
 *      the bro while the plate stays unbuilt;
 *   7. no page errors.
 * Pictures (deviceScaleFactor 2), before (`?ownplate=1`, today's plate) and
 * after: docs/shots/ownplate-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
export const lane = 'full';

const SHOTS = join(H.REPO, 'docs/shots');
const PHONE = { width: 375, height: 667 };
const SIDE = { width: 667, height: 375 };

const own = (P) => P.page.evaluate(() => {
  const o = window.__btOwnPlate ? window.__btOwnPlate() : null;
  const S = window._gameState && window._gameState.current;
  return o ? { ...o, selfPlate: window.__btSelfPlate === undefined ? 'unset' : window.__btSelfPlate,
    bandTop: S && S._selfBandTopY != null && S.player ? Math.round((S._selfBandTopY - S.player.y) * 10) / 10 : null } : null;
});
const peerName = (P, id) => P.page.evaluate((i) => (window.__btPeerBadge && window.__btPeerBadge[i] ? window.__btPeerBadge[i].name : null), id);
/* a switch flipped in the page's own address (switches.js reads it at each ask) */
const setSw = (P, name, value) => P.page.evaluate(([n, v]) => {
  const q = new URLSearchParams(location.search);
  if (v === null) q.delete(n); else q.set(n, v);
  const s = q.toString();
  history.replaceState(history.state, '', location.pathname + (s ? '?' + s : '') + location.hash);
}, [name, value]);
async function until(P, fn, ms = 6000) {
  let v = null;
  for (let i = 0; i < ms / 200; i++) { v = await own(P); if (v && fn(v)) return v; await P.page.waitForTimeout(200); }
  return v;
}
const shot = (P, name) => P.page.screenshot({ path: join(SHOTS, 'ownplate-' + name + '.png') }).catch(() => {});

/* Frost Ridge's snowmen and a real hit (mp-charhud's way) */
const near = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, p = S.player;
  return (S.monsters || []).filter((m) => m && m.alive !== false && (m.curHp == null || m.curHp > 0) && m.home === 'frost')
    .map((m) => ({ x: m.x, y: m.y, d: Math.hypot(m.x - p.x, m.y - p.y) })).sort((a, b) => a.d - b.d);
});
const tapR = (P) => P.page.evaluate(() => {
  const el = document.querySelector('[data-joyzone="R"]');
  if (!el) return false;
  const b = el.getBoundingClientRect(), x = b.left + b.width * 0.5, y = b.top + b.height * 0.4;
  const mk = (t) => new TouchEvent(t, { bubbles: true, cancelable: true,
    touches: t === 'touchend' ? [] : [new Touch({ identifier: 61, target: el, clientX: x, clientY: y })],
    changedTouches: [new Touch({ identifier: 61, target: el, clientX: x, clientY: y })] });
  el.dispatchEvent(mk('touchstart'));
  el.dispatchEvent(mk('touchend'));
  return true;
});

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(SHOTS, { recursive: true });
  const errors = [];
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Alpha', nameB: 'Bravo', touch: true, viewport: PHONE, dpr: 2, world: 'wheel' });
  for (const [P, id] of [[A, 'A'], [B, 'B']]) P.page.on('pageerror', (e) => errors.push(id + ': ' + String(e && e.message || e).slice(0, 200)));
  await H.pastWelcome(A);
  await H.pastWelcome(B);
  await A.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);
  /* B a step aside, so the pictures show both figures, not one over the other */
  const aAt = await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y }));
  await H.hopTo(B, aAt.x + 110, aAt.y + 10, { tries: 20 }).catch(() => null);
  await A.page.waitForTimeout(1500);

  /* ── 1. yours not built, theirs drawn, on both phones ── */
  const a1 = await until(A, (o) => o.drawn === false);
  const bOnA = await (async () => { for (let i = 0; i < 40; i++) { const n = await peerName(A, bId); if (n) return n; await A.page.waitForTimeout(250); } return null; })();
  rec.ok(`1. A's phone: A's own plate is not built (pill ${a1 && a1.pill}, words ${a1 && a1.words}, __btSelfPlate ${a1 && a1.selfPlate}) and B's reads "${bOnA}"`,
    !!a1 && a1.drawn === false && a1.pill === false && a1.words === null && a1.selfPlate === null && bOnA === 'Bravo', { a1, bOnA });
  const b1 = await until(B, (o) => o.drawn === false);
  const aOnB = await (async () => { for (let i = 0; i < 40; i++) { const n = await peerName(B, aId); if (n) return n; await B.page.waitForTimeout(250); } return null; })();
  rec.ok(`1. B's phone: B's own plate is not built (pill ${b1 && b1.pill}) and A's reads "${aOnB}"`,
    !!b1 && b1.drawn === false && b1.pill === false && aOnB === 'Alpha', { b1, aOnB });
  await shot(A, 'after-town-upright');

  /* ── 2. nothing rebuilt, the rule not asked, while nothing changes ── */
  const s0 = await own(A);
  await A.page.waitForTimeout(3000);
  const s1 = await own(A);
  rec.ok(`2. three seconds of frames: the rule asked ${s1.asks - s0.asks} more times, the plate rebuilt ${s1.builds - s0.builds} more times`,
    !!s0 && !!s1 && s1.asks === s0.asks && s1.builds === s0.builds, { s0, s1 });

  /* ── 3. a sit and an emote bring no plate back ── */
  const sat = await A.page.evaluate(() => (window.__broLegacyUI && window.__broLegacyUI.moveSend ? window.__broLegacyUI.moveSend('sit') : 'no sender'));
  await A.page.waitForTimeout(1500);
  const p3 = await own(A);
  const posed = await H.readState(A, (S) => (S._pose ? S._pose.id : null));
  rec.ok(`3. sitting (${posed || sat}): no plate (pill ${p3 && p3.pill}), the band where it stood (${p3 && p3.bandTop} against ${a1 && a1.bandTop})`,
    !!p3 && p3.pill === false && p3.drawn === false, { p3, posed, sat });
  await shot(A, 'after-sit-upright');
  await A.page.waitForTimeout(1200);
  const cheer = await A.page.evaluate(() => (window.__broLegacyUI && window.__broLegacyUI.moveSend ? window.__broLegacyUI.moveSend('cheer') : 'no sender'));
  await A.page.waitForTimeout(500);
  const p3b = await own(A);
  rec.ok(`3. cheering (${cheer}): no plate (pill ${p3b && p3b.pill})`, !!p3b && p3b.pill === false, p3b);
  await A.page.waitForTimeout(2500);

  /* ── 4. the switch and ?hud=0 bring it back whole; off destroys it ── */
  const builds0 = (await own(A)).builds;
  await setSw(A, 'ownplate', '1');
  const on1 = await until(A, (o) => o.pill && o.shown && !!o.words);
  rec.ok(`4. ?ownplate=1: your plate is back whole ("${on1 && on1.words}", in its layer ${on1 && on1.inLayer}, shown ${on1 && on1.shown})`,
    !!on1 && on1.drawn && on1.pill && on1.inLayer && on1.shown && /Alpha/.test(on1.words || '') && on1.selfPlate === on1.words, on1);
  rec.ok(`4. ...and the band did not move (half ${on1 && on1.bandHalf} against ${a1 && a1.bandHalf}; top ${on1 && on1.bandTop} against ${a1 && a1.bandTop})`,
    !!on1 && !!a1 && on1.bandHalf === a1.bandHalf && on1.bandTop === a1.bandTop, { on: on1 && [on1.bandHalf, on1.bandTop], off: a1 && [a1.bandHalf, a1.bandTop] });
  await shot(A, 'before-town-upright');
  await setSw(A, 'ownplate', null);
  await A.page.waitForTimeout(800);
  const kept = await own(A);
  rec.ok(`4. remembered without the address (pill ${kept && kept.pill})`, !!kept && kept.pill === true, kept);
  await setSw(A, 'ownplate', '0');
  const off1 = await until(A, (o) => o.pill === false);
  rec.ok(`4. ?ownplate=0 forgets: the plate is gone and its Text DESTROYED (destroyed ${off1 && off1.lastDestroyed})`,
    !!off1 && off1.pill === false && off1.lastDestroyed === true && off1.selfPlate === null, off1);
  await setSw(A, 'ownplate', null);
  await setSw(A, 'hud', '0');
  const h0 = await until(A, (o) => o.pill && !!o.words);
  rec.ok(`4. ?hud=0 (no name at the top left): your plate is drawn ("${h0 && h0.words}")`, !!h0 && h0.pill && /Alpha/.test(h0.words || ''), h0);
  await setSw(A, 'hud', '1');
  const h1 = await until(A, (o) => o.pill === false);
  await setSw(A, 'hud', null);
  const builds1 = (await own(A)).builds;
  rec.ok(`4. ?hud=1 forgets: gone again; four changes, four builds (${builds1 - builds0})`, !!h1 && h1.pill === false && builds1 - builds0 === 4, { h1, builds0, builds1 });

  /* ── 5. sideways ── */
  await A.page.setViewportSize(SIDE);
  await A.page.waitForTimeout(1500);
  const sd = await own(A);
  rec.ok(`5. sideways: no plate (pill ${sd && sd.pill})`, !!sd && sd.pill === false, sd);
  await shot(A, 'after-town-sideways');
  await setSw(A, 'ownplate', '1');
  const sdOn = await until(A, (o) => o.pill && o.shown);
  rec.ok(`5. sideways ?ownplate=1: back ("${sdOn && sdOn.words}")`, !!sdOn && sdOn.pill && sdOn.shown, sdOn);
  await shot(A, 'before-town-sideways');
  await setSw(A, 'ownplate', '0');
  await until(A, (o) => o.pill === false);
  await setSw(A, 'ownplate', null);
  await A.page.setViewportSize(PHONE);
  await A.page.waitForTimeout(1200);

  /* ── 6. in a fight: the HP bar over your bro, still no plate ── */
  await H.devOp(wsPort, 'vitals', aId, { heal: true }).catch(() => {});
  await H.devOp(wsPort, 'kit', aId, { what: 'weapons' }).catch(() => {});
  await A.page.waitForTimeout(1200);
  await H.equipWeapon(A, 'greatsword', 'weapon', 'melee').catch(() => null);
  await H.closeDest(A).catch(() => {});   /* the Gear window down, for the picture */
  const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
  const fz = WHEEL_SPAWNS.frost && WHEEL_SPAWNS.frost.points[0];
  await H.hopTo(A, fz[0] + 150, fz[1] + 220, { tries: 260 });
  await A.page.waitForTimeout(1500);
  let f6 = null;
  for (let tries = 0; tries < 40; tries++) {
    const m = (await near(A))[0];
    if (m && m.d > 70) await H.hopTo(A, m.x, m.y - 50, { tries: 20 });   /* from the north: the trees stand south of them */
    await tapR(A);
    await A.page.waitForTimeout(400);
    f6 = await own(A);
    if (f6 && f6.hpBar) break;
  }
  const hp = await H.readState(A, (S) => (S.rpg ? { hp: S.rpg.hp, max: S.rpg.maxHp } : null));
  rec.ok(`6. in a fight: A's HP bar shows over the bro (${hp && hp.hp}/${hp && hp.max}) and no plate is built (pill ${f6 && f6.pill})`,
    !!f6 && f6.hpBar === true && f6.pill === false, { f6, hp });
  await shot(A, 'after-fight-upright');
  await setSw(A, 'ownplate', '1');
  const f6on = await until(A, (o) => o.pill);
  rec.ok(`6. ...?ownplate=1 in the fight builds it (pill ${f6on && f6on.pill}; under the HP bar's rule it shows when the bar is down)`, !!f6on && f6on.pill === true, f6on);
  await A.page.waitForTimeout(600);
  await shot(A, 'before-fight-upright');
  await setSw(A, 'ownplate', '0');
  await until(A, (o) => o.pill === false);
  await H.devOp(wsPort, 'vitals', aId, { heal: true }).catch(() => {});

  /* ── 7. ── */
  rec.ok(`7. no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
}
