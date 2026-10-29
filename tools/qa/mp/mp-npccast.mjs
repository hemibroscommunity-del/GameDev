/* v2.3.3833: BROTOWN'S CAST, PHOTOGRAPHED -- all 21 townsfolk at their spots.
 *
 * The new cast (docs/specs/npc-cast.md) asked for "a picture of BroTown with
 * all 21 at their spots, upright and on a computer".  No game view takes in
 * the whole town at a playable zoom, so:
 *   1. on a computer (the sideways layout, 1440 x 900): each of the 21
 *      walked to and photographed at his spot (the 21 span ~3,700 x 3,200
 *      world px: no view takes them in at once, not even ?zoom=0.4);
 *   2. on a phone held upright (390 x 844, dpr 3, the game's own zoom), the
 *      square where you arrive, with Bean, Lil Bro and the Mayor, then each
 *      of the 21 at his spot as on the computer;
 *   3. no page errors.
 * Pictures: tools/qa/mp/out/npccast-*.png, one sheet a kind by
 * tools/qa/npccast_sheet.py.  Run after `npm run build`.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const HIDE = '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }';

async function enter(P) {
  await H.enterWorld(P);
  return H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
    (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the Wheel' }).catch(() => null);
}

/* each townsperson's place on the screen, CSS px */
const onScreen = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, c = document.querySelector('canvas'), r = c.getBoundingClientRect();
  return (S.npcs || []).map((n) => ({ name: n.name,
    x: Math.round(r.left + (n.x - S.camera.x) * (S._worldScaleX || 1)), y: Math.round(r.top + (n.y - S.camera.y) * (S._worldScaleY || 1)) }))
    .concat([{ box: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)] }]);
});

/* walk to each townsperson (the way mp-wheelfolk does) and photograph the
   ground round him: npccast-<kind>-NN-<name>.png, laid out as one sheet by
   tools/qa/npccast_sheet.py */
async function townsfolkShots(P, kind, { w, h }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  const npcs = await H.waitFor(P, (S) => (S.npcs || []).map((n) => ({ name: n.name, x: n.x, y: n.y })), (v) => v.length >= 21,
    { timeout: 20000, label: 'the 21' }).catch(() => []);
  const done = [];
  for (let i = 0; i < npcs.length; i++) {
    const n = npcs[i];
    await H.hopTo(P, n.x + 70, n.y + 90, { step: 100, gap: 260, tries: 90 });
    await P.page.waitForTimeout(1200);
    const at = (await onScreen(P)).find((q) => q.name === n.name);
    const vp = P.page.viewportSize();
    const x = Math.max(0, Math.min(vp.width - w, (at ? at.x : vp.width / 2) - w / 2));
    const y = Math.max(0, Math.min(vp.height - h, (at ? at.y : vp.height / 2) - h * 0.62));
    const ok = !!at && at.x > x && at.x < x + w && at.y > y && at.y < y + h;
    await P.page.screenshot({ path: join(OUT, `npccast-${kind}-${String(i).padStart(2, '0')}-${n.name.toLowerCase().replace(/\s+/g, '-')}.png`), clip: { x, y, width: w, height: h } });
    done.push({ name: n.name, ok });
  }
  return done;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const errors = [];

  /* ── 1. on a computer, each at his spot ── */
  const C = await H.newPlayer(browser, { name: 'Castcam', wsPort, webPort, world: 'wheel', wide: true,
    viewport: { width: 1440, height: 900 } });
  C.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    const inC = await enter(C);
    rec.ok('computer: in the Wheel (guard)', !!inC, inC);
    if (inC) {
      const id = await H.readState(C, (S) => S.myId);
      await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 });
      await C.page.addStyleTag({ content: HIDE }).catch(() => {});
      const shot = await townsfolkShots(C, 'computer', { w: 420, h: 320 });
      rec.ok(`computer: each of the ${shot.length} photographed at his spot (${shot.filter((q) => q.ok).length} inside his frame)`,
        shot.length === 21 && shot.every((q) => q.ok), shot.filter((q) => !q.ok));
    }
  } finally {
    await C.ctx.close().catch(() => {});
  }

  /* ── 2. on a phone held upright, the square ── */
  const P = await H.newPlayer(browser, { name: 'Castphone', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, dpr: 3, touch: true });
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    const inP = await enter(P);
    rec.ok('phone: in the Wheel (guard)', !!inP, inP);
    if (inP) {
      await P.page.addStyleTag({ content: HIDE }).catch(() => {});
      await P.page.waitForTimeout(4000);
      const at = await onScreen(P);
      const box = at.pop().box;
      const seen = at.filter((q) => q.x > box[0] && q.x < box[2] && q.y > box[1] && q.y < box[3]).map((q) => q.name);
      await P.page.screenshot({ path: join(OUT, 'npccast-phone.png') });
      rec.ok(`phone: the square where you arrive, upright, with ${seen.join(', ')}`, seen.includes('Bean') && seen.includes('Lil Bro'), seen);
      const id = await H.readState(P, (S) => S.myId);
      await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 });
      const shot = await townsfolkShots(P, 'phone', { w: 300, h: 300 });
      rec.ok(`phone: each of the ${shot.length} photographed at his spot, upright (${shot.filter((q) => q.ok).length} inside his frame)`,
        shot.length === 21 && shot.every((q) => q.ok), shot.filter((q) => !q.ok));
    }
  } finally {
    await P.ctx.close().catch(() => {});
  }
  rec.ok('no page errors', errors.length === 0, errors.slice(0, 6));
}
