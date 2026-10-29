/* v2.3.3833: BROTOWN'S CAST, PHOTOGRAPHED -- all 21 townsfolk at their spots.
 *
 * The new cast (docs/specs/npc-cast.md) asked for "a picture of BroTown with
 * all 21 at their spots, upright and on a computer".  No game view takes in
 * the whole town at a playable zoom, so:
 *   1. on a computer (the sideways layout, a big window, ?zoom=0.4: the
 *      furthest the view goes), the camera over the middle of the 21 -- the
 *      whole cast in one frame, each checked to be inside it;
 *   2. on a phone held upright (390 x 844, dpr 3, the game's own zoom), the
 *      square: where you arrive, with Bean, Lil Bro and the Mayor;
 *   3. no page errors.
 * Pictures: tools/qa/mp/out/npccast-*.png.  Run after `npm run build`.
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

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const errors = [];

  /* ── 1. on a computer, the whole cast ── */
  const C = await H.newPlayer(browser, { name: 'Castcam', wsPort, webPort, world: 'wheel', wide: true,
    viewport: { width: 2400, height: 1500 }, query: 'zoom=0.4' });
  C.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    const inC = await enter(C);
    rec.ok('computer: in the Wheel (guard)', !!inC, inC);
    if (inC) {
      const id = await H.readState(C, (S) => S.myId);
      await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 });
      await C.page.addStyleTag({ content: HIDE }).catch(() => {});
      const npcs = await H.waitFor(C, (S) => (S.npcs || []).map((n) => ({ name: n.name, x: n.x, y: n.y })), (v) => v.length >= 21,
        { timeout: 20000, label: 'the 21' }).catch(() => []);
      const xs = npcs.map((n) => n.x), ys = npcs.map((n) => n.y);
      const mid = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
      await H.hopTo(C, mid.x, mid.y + 60, { step: 100, gap: 260, tries: 120 });
      await C.page.waitForTimeout(4000);
      const at = await onScreen(C);
      const box = at.pop().box;
      const out = at.filter((q) => !(q.x > box[0] && q.x < box[2] && q.y > box[1] && q.y < box[3]));
      await C.page.screenshot({ path: join(OUT, 'npccast-computer.png') });
      rec.ok(`computer: all ${at.length} townsfolk in one frame of BroTown (span ${Math.round(Math.max(...xs) - Math.min(...xs))} x ${Math.round(Math.max(...ys) - Math.min(...ys))} world px)`,
        at.length === 21 && out.length === 0, { out, box });
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
    }
  } finally {
    await P.ctx.close().catch(() => {});
  }
  rec.ok('no page errors', errors.length === 0, errors.slice(0, 6));
}
