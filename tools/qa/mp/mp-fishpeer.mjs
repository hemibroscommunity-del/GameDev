/* ═══ v2.3.6208: ANOTHER PLAYER'S SWORD, PUT AWAY WHILE THEY FISH OR MINE ═══
 *
 * The owner, 2026-11-25: "Last time I saw a character during multilayer
 * fishing and his sword was floating mid air while he fished fix that too".
 *
 * My own bro's fish and mine poses put the weapon away (the rod and the pick
 * are in the poses' sheets); a peer's only picked the body's picture, and the
 * peer's weapon was forced visible for any living peer (entityRenderer), so
 * A's sword hung beside the rod on B's screen.  Since v2.3.6208 both ask one
 * rule (src/game/poseHides.js; its suite tools/guards/pose-hides.test.mjs).
 *
 * A and B in BroTown's commons.  A, armed, walks to the nearest tier-1 fishing
 * spot, B beside them; A casts.  On B's page, every frame, A's weapon as drawn
 * (`__btPeersDrawn(id).weaponShown`) and A's harvest (`.ex`):
 *   a. before: A's weapon is drawn (the control: a peer with no weapon would
 *      pass everything below),
 *   b. the frame after B first sees 'fish', the weapon is not drawn, and no
 *      frame of the harvest draws it,
 *   c. the frame after the harvest ends on B's page, it is drawn again,
 * then the same at the nearest ore vein for 'mine'.
 *
 *   QA_SHOT_TAG=before|after  names B's view of A mid-harvest
 *   (out/fishpeer-<tag>-<skill>.png; docs/shots/ holds the PR's pair).
 *
 *   node tools/qa/mp/run.mjs fishpeer
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
export const lane = 'full';

const PHONE = { width: 390, height: 844 };
const STAND = { oreVein: [0, -70], fishSpot: [52, -43] };
const SKILL = { oreVein: 'mining', fishSpot: 'fishing' };
const EX = { oreVein: 'mine', fishSpot: 'fish' };

/* mp-harvestbar's walk: H.hopTo's hops, checked against the worker */
async function travel(P, wsPort, id, tx, ty) {
  const worker = async () => { const a = await H.adminPlayer(wsPort, id).catch(() => null); return (a && a.live) || {}; };
  const here = () => H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
  const apart = (L, c) => typeof L.x === 'number' && Math.hypot(L.x - c.x, L.y - c.y) > 60;
  for (let leg = 0; leg < 300; leg++) {
    const L = await worker();
    const c = await here();
    if (apart(L, c)) {
      await P.page.waitForTimeout(900);
      const L2 = await worker();
      const c2 = await here();
      if (apart(L2, c2) && Math.hypot(L2.x - L.x, L2.y - L.y) < 2) {
        await P.page.evaluate(({ x, y }) => { const S = window._gameState.current; S.player.x = x; S.player.y = y; S.player.vx = 0; S.player.vy = 0; }, { x: L2.x, y: L2.y });
        await P.page.waitForTimeout(500);
      }
      continue;
    }
    if (Math.hypot(tx - c.x, ty - c.y) < 6) return true;
    await H.hopTo(P, tx, ty, { tries: 4 });
  }
  return false;
}

/* mp-harvestbar's tap on a node, as a finger */
async function tapNode(P, nid) {
  for (let i = 0; i < 6; i++) {
    await P.page.evaluate((id) => {
      const S = window._gameState.current;
      const n = (S.gatherNodes || []).find((g) => g.id === id);
      if (!n) return;
      const cv = document.querySelector('canvas');
      const rc = cv.getBoundingClientRect();
      const x = rc.left + (n.x - S.camera.x) * (S._worldScaleX || 1);
      const y = rc.top + (n.y - 24 - S.camera.y) * (S._worldScaleY || 1);
      const mk = (t) => new TouchEvent(t, { bubbles: true, cancelable: true,
        touches: t === 'touchend' ? [] : [new Touch({ identifier: 77, target: cv, clientX: x, clientY: y })],
        changedTouches: [new Touch({ identifier: 77, target: cv, clientX: x, clientY: y })] });
      cv.dispatchEvent(mk('touchstart'));
      cv.dispatchEvent(mk('touchend'));
    }, nid);
    await P.page.waitForTimeout(300);
    if (await H.readState(P, (S) => !!S._extraction)) return true;
  }
  return false;
}

/* On B's page: A's drawn weapon and harvest, one row a frame, until stopped */
const startRecord = (B, aid) => B.page.evaluate((id) => {
  const w = window;
  window.__fpRows = []; window.__fpOn = true;
  const step = () => {
    if (!window.__fpOn) return;
    const d = w.__btPeersDrawn && w.__btPeersDrawn(id);
    if (d) window.__fpRows.push({ ex: d.ex === undefined ? 'no-probe' : d.ex, shown: d.weaponShown });
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}, aid);
const stopRecord = (B) => B.page.evaluate(() => { window.__fpOn = false; return window.__fpRows || []; });

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const TAG = process.env.QA_SHOT_TAG || 'after';
  /* a phone each, upright, at the phone's 1.5 (this box draws ~1 frame a second at 3) */
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Angler', nameB: 'Watcher', world: 'wheel', touch: true, viewport: PHONE, dpr: 1.5 });
  const errors = [];
  for (const P of [A, B]) P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const aid = await H.readState(A, (S) => S.myId);
  const bid = await H.readState(B, (S) => S.myId);
  for (const P of [A, B]) {
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
  }
  for (const k of ['fishing_pole', 'mining_pickaxe']) await H.grant(wsPort, aid, 'item', { invKey: k, count: 1 }).catch(() => {});
  for (const id of [aid, bid]) await H.devOp(wsPort, 'vitals', id, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
  await H.waitFor(A, (S) => ['fishing_pole', 'mining_pickaxe'].filter((k) => ((S.rpg || {}).inventory || {})[k] > 0).length,
    (n) => n === 2, { timeout: 20000, label: 'the tools' }).catch(() => 0);

  for (const type of ['fishSpot', 'oreVein']) {
    const skill = SKILL[type], ex = EX[type];
    const node = await A.page.evaluate((t) => {
      const S = window._gameState.current, p = S.player;
      let best = null, d = Infinity;
      for (const n of S.gatherNodes || []) {
        if (n.nodeType !== t || !n.alive || (n.gatherLvl || 1) !== 1) continue;
        const dd = Math.hypot(n.x - p.x, n.y - p.y);
        if (dd < d) { d = dd; best = { id: n.id, x: n.x, y: n.y }; }
      }
      return best;
    }, type);
    rec.ok(`${skill}: a tier-1 ${type} on the commons (guard)`, !!node, node);
    if (!node) continue;
    const ax = node.x + STAND[type][0], ay = node.y + STAND[type][1];
    await travel(A, wsPort, aid, ax, ay);
    await travel(B, wsPort, bid, ax + 70, ay + 40);
    await H.waitFor(B, (S) => !!(S.others && S.others[aid]), (v) => v, { timeout: 30000, label: 'B sees A' }).catch(() => null);
    await B.page.waitForTimeout(1500);

    await startRecord(B, aid);
    await B.page.waitForTimeout(2500);
    const started = await tapNode(A, node.id);
    const ok = started && await H.waitFor(B, () => (window.__fpRows || []).some((r) => r.ex === ex),
      (v) => v, { timeout: 20000, label: `B sees A's ${ex}` }).catch(() => false);
    rec.ok(`${skill}: A's harvest starts and reaches B (guard)`, !!ok, { started });
    if (!ok) { await stopRecord(B); await A.page.evaluate(() => { window._gameState.current._extraction = null; }); continue; }
    await B.page.waitForTimeout(3000);

    /* B's view of A mid-harvest */
    const scr = await B.page.evaluate((id) => {
      const S = window._gameState.current, o = S.others && S.others[id];
      if (!o) return null;
      const cv = document.querySelector('canvas').getBoundingClientRect();
      return { x: cv.left + (o.x - S.camera.x) * (S._worldScaleX || 1), y: cv.top + (o.y - S.camera.y) * (S._worldScaleY || 1),
        vw: window.innerWidth, vh: window.innerHeight };
    }, aid);
    if (scr) {
      const W = 220, Hh = 220;
      const x = Math.max(0, Math.min(scr.vw - W, Math.round(scr.x - W / 2)));
      const y = Math.max(0, Math.min(scr.vh - Hh, Math.round(scr.y - 150)));
      await B.page.screenshot({ path: join(OUT, `fishpeer-${TAG}-${skill}.png`), clip: { x, y, width: W, height: Hh } }).catch(() => {});
    }

    /* A stops, as a phone's harvest ends (mp-gatherlook's way) */
    await A.page.evaluate(() => { const S = window._gameState.current; S._extraction = null; });
    const ended = await H.waitFor(B, () => {
      const r = window.__fpRows || [];
      let seen = false;
      for (let i = 0; i < r.length - 2; i++) { if (r[i].ex) seen = true; else if (seen) return true; }
      return false;
    }, (v) => v, { timeout: 20000, label: `B sees A's ${ex} end` }).catch(() => false);
    await B.page.waitForTimeout(800);
    const rows = await stopRecord(B);

    const first = rows.findIndex((r) => r.ex === ex);
    const before = first > 0 ? rows.slice(0, first) : [];
    let last = -1;
    for (let i = rows.length - 1; i >= 0; i--) if (rows[i].ex === ex) { last = i; break; }
    const during = first >= 0 ? rows.slice(first + 1, last + 1) : [];
    const after = last >= 0 ? rows.slice(last + 1) : [];
    rec.ok(`${skill}: a. before the harvest, A's weapon is drawn on B's page (control; ${before.length} frames)`,
      before.length > 0 && before.every((r) => r.shown === true), { frames: before.length, hidden: before.filter((r) => !r.shown).length });
    rec.ok(`${skill}: b. from the frame after B sees '${ex}', A's weapon is not drawn (${during.length} frames)`,
      during.length > 0 && during.every((r) => r.shown === false),
      { frames: during.length, drawn: during.filter((r) => r.shown).length, probe: rows[0] && rows[0].ex });
    rec.ok(`${skill}: c. the frame after the harvest ends on B's page, the weapon is drawn again (${after.length} frames)`,
      !!ended && after.length > 1 && after.slice(1).every((r) => r.shown === true) && after[0].ex === null,
      { ended: !!ended, frames: after.length, first: after.slice(0, 3) });
    await A.page.waitForTimeout(1000);
  }
  rec.ok('no page errors on either phone', errors.length === 0, errors.slice(0, 4));
}
