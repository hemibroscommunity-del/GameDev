/* ═══ THE LAGOON ISLET: SWIM TO IT, CLIMB IT, FLIP UP TO ITS LEDGE (v2.3.3955) ═══
 *
 * The owner, 2026-11-02: "Make a portion of the game that you need to swim in
 * ... and also a portion of the game that you need to climb (explore
 * animations for this) and double jump to get to the next part."
 * (docs/ELEVATION-PLAN.md, plan.js `islets` / `rises`, src/game/climb.js.)
 *
 * One phone in the world against a real worker, with `?climb=1` (the rises
 * come only with it while they are new) and the jump drawn out to
 * `?jumpms=` (this box draws a few frames a second: mp-doublejump's habit).
 * Every place is worked out from the plan (H.wheelGeom, core/rises.js
 * riseMessage), never a written number:
 *   1. the rises came with the ground worker's 'ready' (guard);
 *   2. from the Water Caves' coast opposite the islet he SWIMS east through
 *      the shallows and climbs out on the islet's beach (it is reached no
 *      other way: test-world-core holds that);
 *   3. at the vines' foot, pushing north, he CLIMBS: facing the rock in the
 *      jog's back-facing frames (the climb's own, CLIMB_FRAMES), at 0.4 of
 *      his walk, no swing ("Climbing!"), no jump; out at the top he is on the
 *      terrace;
 *   4. a sprinting PLAIN jump north at the ledge's 144 px face does not get up:
 *      he drops back where he jumped from;
 *   5. a sprinting jump with a FLIP near its sweet spot gets him onto the ledge
 *      (tried again up to five times: a slow frame can late the press);
 *   6. walking into the CHEST opens it: "Empty for now: the reward comes next";
 *   7. a jump south off the ledge drops him to its foot, on the terrace;
 *   8. the open sea past the islet's shallows still stops him;
 *   9. no page errors.
 * Pictures: tools/qa/mp/out/lagoonclimb-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { CLIMB_FRAMES, CLIMB_MULT, CHEST_NOTE } from '../../../src/game/climb.js';

const PHONE = { width: 390, height: 844 };
const HS = 10;
const AIR_MS = 2600;

const st = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, c = window.__btClimb ? window.__btClimb() : null, sw = S._wheelSwim;
  return { x: S.player.x, y: S.player.y, vx: S.player.vx || 0, vy: S.player.vy || 0, swim: !!(sw && sw.on), facing: S._renderFacing || null,
    climb: c, jump: !!S._jump, jumpWhy: S._jumpWhy || null, zone: S.currentZone };
});

/* hold keys, sampling, for `ms` or until `until(samples)` */
async function hold(P, keys, ms, until) {
  const out = [];
  const t0 = Date.now();
  for (const k of keys) await P.page.keyboard.down(k);
  try {
    while (Date.now() - t0 < ms) {
      const s = await st(P);
      out.push({ t: Date.now() - t0, ...s });
      if (until && until(out)) break;
      await P.page.waitForTimeout(120);
    }
  } finally {
    for (const k of keys.slice().reverse()) await P.page.keyboard.up(k);
  }
  return out;
}

/* a jump north from inside the page (Space), sprinting, the flip pressed at
   phase `flipAt` (or none); resolves once he has landed and any drop is over */
const jumpNorth = (P, flipAt) => P.page.evaluate(async ({ flipAt }) => {
  const S = window._gameState.current;
  const key = (t) => window.dispatchEvent(new KeyboardEvent(t, { code: 'Space', key: ' ', bubbles: true }));
  const from = { x: S.player.x, y: S.player.y };
  key('keydown'); key('keyup');
  const j0 = S._jump;
  if (!j0) return { ok: false, why: S._jumpWhy };
  let flipPhase = null;
  for (let i = 0; i < 2000; i++) {
    const j = S._jump;
    if (!j) break;
    if (flipAt != null && !j.flip && (Date.now() - j.t0) / j.dur >= flipAt) {
      key('keydown'); key('keyup');
      if (S._jump && S._jump.flip) flipPhase = +((Date.now() - j0.t0) / j0.dur).toFixed(3);
    }
    await new Promise((r) => setTimeout(r, 8));
  }
  for (let i = 0; i < 400 && (S._jump || S._climbDrop); i++) await new Promise((r) => setTimeout(r, 25));
  await new Promise((r) => setTimeout(r, 300));
  const c = window.__btClimb();
  return { ok: true, from, at: { x: S.player.x, y: S.player.y }, flipPhase, landing: c.stats.landings[c.stats.landings.length - 1] || null,
    entries: c.stats.entries.slice(-2), drops: c.stats.drops };
}, { flipAt });

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (name) => P.page.screenshot({ path: join(OUT, `lagoonclimb-${name}.png`) }).catch(() => {});
  const G = await H.wheelGeom();
  const { riseMessage } = await import(H.REPO + '/public/tools/world/core/rises.js');
  const R = riseMessage(G.plan);
  const I = G.F.islets[0];
  rec.ok('this worker plays a Wheel with the Lagoon Islet and its rises (guard)', !!(R && I), { long: G.long });
  if (!R || !I) return;
  const [T, L] = R.list;
  const cg = G.cellG;
  const P = await H.newPlayer(browser, { name: 'Climber', wsPort, webPort, world: 'wheel', viewport: PHONE, query: `climb=1&jumpms=${AIR_MS}` });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopAlive = H.keepAlive(P);
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading, grid: !!(S._tiledWalkable && S._tiledWalkable.wheel && S._tiledWalkable.wheel.length) }),
      (v) => v.zone === 'wheel' && !v.loading && v.grid, { timeout: 120000, label: 'into the world' }).catch(() => null);
    rec.ok('in the world, its walk grid there (guard)', !!inW, inW);
    if (!inW) return;
    const myId = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'quests', myId);
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    const feetDy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround ? window.__btPlayerGround() : null; return g ? g.y - S.player.y : 52; });

    /* ── 1. the rises came ── */
    const c0 = await P.page.evaluate(() => window.__btClimb && window.__btClimb());
    rec.ok('the ground worker sent the rises with ?climb=1: the terrace (72 px face, vines) and the ledge (144 px, a chest)',
      !!c0 && c0.on && c0.rises.length === 2 && c0.rises[0].h === 72 && !!c0.rises[0].climb && c0.rises[1].h === 144 && !!c0.rises[1].chest, c0 && c0.rises);

    /* ── 2. swim to it ── */
    /* the row through the terrace's middle: the islet's land begins at its
       west edge; west of it the shallows, then the Water Caves' coast */
    const rowY = (T.box.y0 + T.face.y0) / 2;
    /* (under the worker's move budget, 500 px a second: harness.glideTo) */
    await H.glideTo(P, I.x0 * cg - 400, rowY - feetDy, { speed: 450, timeoutMs: 300000 });
    if (await P.page.evaluate(() => !!window.__btWheelBlocks)) await P.page.evaluate(({ x, y }) => window.__btWheelBlocks(x, y, 1200), { x: I.x0 * cg, y: rowY });
    await P.page.waitForTimeout(2500);
    /* the coast: the last cell west of the islet a body may stand on dry */
    const coast = await P.page.evaluate(({ x0, y, fdy, cell }) => {
      const S = window._gameState.current, at = window.__btSwimAt;
      for (let x = x0 - cell / 2; x > x0 - 60 * cell; x -= cell) {
        const solid = window.__btIsSolid(x, y - fdy), swim = at ? at(x, y).swim : null;
        if (!solid && !swim) return { x, y };
      }
      return null;
    }, { x0: I.x0 * cg, y: rowY, fdy: feetDy, cell: cg });
    rec.ok('the Water Caves\' coast west of the islet (guard)', !!coast, coast);
    if (!coast) return;
    await H.hopTo(P, coast.x - 30, rowY - feetDy, { tries: 60 });
    await P.page.waitForTimeout(1500);
    const before = await st(P);
    const swim = await hold(P, ['d'], 40000, (o) => { const s = o[o.length - 1]; return o.some((q) => q.swim) && !s.swim && s.x > I.x0 * cg + 20; });
    const landed = await st(P);
    const swam = swim.filter((s) => s.swim).length;
    console.log(`    swim: ${JSON.stringify({ coast, from: Math.round(before.x), to: Math.round(landed.x), swam, n: swim.length, isletX0: I.x0 * cg })}`);
    rec.ok(`from the Water Caves' coast he swims east through the shallows (${swam} samples swimming) and climbs out on the islet's beach`,
      !before.swim && swam >= 3 && !landed.swim && landed.x > I.x0 * cg, { before: before.x, after: landed.x, swam });
    await shot('beach');

    /* ── 3. climb the vines ── */
    const vx = (T.climb.x0 + T.climb.x1) / 2;
    const footFeet = T.face.y1 + HS + 24;
    await H.hopTo(P, I.x0 * cg + 30, footFeet - feetDy, { tries: 40 });
    await H.hopTo(P, vx, footFeet - feetDy, { tries: 40 });
    await P.page.waitForTimeout(800);
    /* his walk along the beach first: the per-frame speed the climb is a share of */
    await H.hopTo(P, vx - 60, footFeet - feetDy, { tries: 20 });
    await P.page.waitForTimeout(500);
    const walkS = await hold(P, ['d'], 600);
    await P.page.waitForTimeout(300);
    await H.hopTo(P, vx, footFeet - feetDy, { tries: 20 });
    await P.page.waitForTimeout(600);
    const walkV = Math.max(...walkS.map((s) => Math.abs(s.vx)));
    const climbS = await hold(P, ['w'], 30000, (o) => {
      const s = o[o.length - 1];
      return o.some((q) => q.climb && q.climb.climbing) && !(s.climb && s.climb.climbing);
    });
    const onV = climbS.filter((s) => s.climb && s.climb.climbing);
    const climbV = onV.length ? Math.max(...onV.map((s) => Math.abs(s.vy))) : 0;
    const frames = new Set(onV.map((s) => s.climb.frame).filter((f) => f != null));
    const top = await st(P);
    console.log(`    climb: ${JSON.stringify({ n: onV.length, walkV, climbV, ratio: walkV ? +(climbV / walkV).toFixed(2) : null, frames: [...frames], facing: onV.map((s) => s.facing).slice(0, 3), topFeet: Math.round(top.y + feetDy), faceTop: T.face.y0, stats: top.climb && top.climb.stats })}`);
    rec.ok('at the vines\' foot, pushing north, he climbs', onV.length >= 3, { n: onV.length });
    rec.ok('...facing the rock, drawn in the jog\'s back-facing frames at the climb\'s own steps (CLIMB_FRAMES)',
      onV.every((s) => s.facing === 'north') && frames.size >= 2 && [...frames].every((f) => CLIMB_FRAMES.includes(f)), { frames: [...frames] });
    rec.ok(`...at ${CLIMB_MULT} of his walk (${walkV ? (climbV / walkV).toFixed(2) : '?'}: ${climbV.toFixed(2)} against ${walkV.toFixed(2)} px a frame)`,
      walkV > 0 && Math.abs(climbV / walkV - CLIMB_MULT) < 0.06, { walkV, climbV });
    rec.ok('...and out at the top he stands on the terrace, not climbing', !!top.climb && !top.climb.climbing && top.y + feetDy + HS <= T.face.y0 + 0.5 && top.climb.stats.tops >= 1, { feet: top.y + feetDy, faceTop: T.face.y0 });
    /* on the vines again (down from the top), the refusals */
    const down = await hold(P, ['s'], 2500, (o) => o.some((q) => q.climb && q.climb.climbing) && o.length > 3);
    const refuse = await P.page.evaluate(async () => {
      const S = window._gameState.current, f = window._gameFns;
      const on = !!S._climb;
      const n0 = S.dmgNumbers.filter((p) => p.text === 'Climbing!').length;
      f.swingAttack();
      const swung = !!S.isSwinging;
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', key: ' ', bubbles: true }));
      await new Promise((r) => setTimeout(r, 200));
      return { on, swung, jumped: !!S._jump, why: S._jumpWhy, notes: S.dmgNumbers.filter((p) => p.text === 'Climbing!').length - n0 };
    });
    console.log(`    on the vines, down: ${JSON.stringify({ downClimb: down.some((q) => q.climb && q.climb.climbing), refuse })}`);
    rec.ok('from the top, pushing south, he climbs down onto the vines', down.some((q) => q.climb && q.climb.climbing), null);
    rec.ok('on the vines: no swing ("Climbing!" over him) and no jump', refuse.on && !refuse.swung && refuse.notes >= 1 && !refuse.jumped && refuse.why === 'climbing', refuse);
    await shot('vines');
    const up2 = await hold(P, ['w'], 20000, (o) => !(o[o.length - 1].climb && o[o.length - 1].climb.climbing));
    rec.ok('...and back up onto the terrace (guard)', !(up2[up2.length - 1].climb && up2[up2.length - 1].climb.climbing), null);

    /* ── 4. a plain jump at the ledge: back where he jumped from ── */
    const lx = (L.face.x0 + L.face.x1) / 2 + 30;
    const ledgeFoot = L.face.y1 + HS + 2;
    await H.hopTo(P, lx, ledgeFoot + 30 - feetDy, { tries: 30 });
    await P.page.waitForTimeout(600);
    /* walk up to its foot (the face stops him there) */
    await hold(P, ['w'], 3000, (o) => o.length > 4 && Math.abs(o[o.length - 1].y - o[o.length - 3].y) < 0.3);
    const atFoot = await st(P);
    rec.ok('the ledge\'s face stops him at its foot, walking', atFoot.y + feetDy - HS - L.face.y1 >= -0.5 && atFoot.y + feetDy - HS - L.face.y1 < 4, { feet: atFoot.y + feetDy, foot: L.face.y1 });
    await P.page.keyboard.down('w'); await P.page.keyboard.down('Shift');
    let plain = null;
    try { plain = await jumpNorth(P, null); } finally { await P.page.keyboard.up('Shift'); await P.page.keyboard.up('w'); }
    console.log(`    plain jump: ${JSON.stringify(plain)}`);
    rec.ok('a sprinting plain jump at the 144 px face does not get him up: he drops back where he jumped from',
      !!plain && plain.ok && !!plain.landing && plain.landing.id === 'lagoon-ledge' && plain.landing.fate === 'back' && Math.hypot(plain.at.x - plain.from.x, plain.at.y - plain.from.y) < 8, plain);

    /* ── 5. the flip gets him up ── */
    let flip = null;
    for (let k = 0; k < 5; k++) {
      await H.hopTo(P, lx, ledgeFoot - feetDy, { tries: 10 });
      await P.page.waitForTimeout(500);
      await P.page.keyboard.down('w'); await P.page.keyboard.down('Shift');
      try { flip = await jumpNorth(P, 0.74); } finally { await P.page.keyboard.up('Shift'); await P.page.keyboard.up('w'); }
      console.log(`    flip ${k + 1}: ${JSON.stringify(flip)}`);
      if (flip && flip.landing && flip.landing.fate === 'top') break;
      await P.page.waitForTimeout(800);
    }
    const onLedge = await st(P);
    rec.ok('a sprinting jump with a flip near its sweet spot lands him on the ledge\'s top',
      !!flip && !!flip.landing && flip.landing.fate === 'top' && flip.landing.flip && onLedge.y + feetDy + HS <= L.face.y0 + 0.5 && onLedge.y + feetDy > L.box.y0, { flip, feet: onLedge.y + feetDy });
    await shot('ledge');

    /* ── 6. the chest ── */
    if (flip && flip.landing && flip.landing.fate === 'top') {
      await H.hopTo(P, (L.chest.x0 + L.chest.x1) / 2, onLedge.y, { tries: 10 });
      const ch = await hold(P, ['w'], 4000, (o) => (o[o.length - 1].climb.stats.chestOpens || 0) >= 1);
      const said = await P.page.evaluate((t) => window._gameState.current.dmgNumbers.some((p) => p.text === t), CHEST_NOTE);
      await shot('chest');
      rec.ok(`walking into the chest opens it: "${CHEST_NOTE}"`, ch[ch.length - 1].climb.stats.chestOpens >= 1 && said, { opens: ch[ch.length - 1].climb.stats.chestOpens, said });
      /* ── 7. down off the ledge ── */
      await P.page.keyboard.down('s');
      let off = null;
      try {
        off = await P.page.evaluate(async () => {
          const S = window._gameState.current;
          const key = (t) => window.dispatchEvent(new KeyboardEvent(t, { code: 'Space', key: ' ', bubbles: true }));
          await new Promise((r) => setTimeout(r, 250));
          key('keydown'); key('keyup');
          for (let i = 0; i < 600 && (S._jump || S._climbDrop); i++) await new Promise((r) => setTimeout(r, 25));
          await new Promise((r) => setTimeout(r, 300));
          const c = window.__btClimb();
          return { at: { x: S.player.x, y: S.player.y }, landing: c.stats.landings[c.stats.landings.length - 1] };
        });
      } finally { await P.page.keyboard.up('s'); }
      console.log(`    off the ledge: ${JSON.stringify(off)}`);
      rec.ok('a jump south off the ledge drops him down past its face (to the terrace, or on over the terrace\'s too)', !!off && !!off.landing && off.landing.dir === 'S' && off.at.y + feetDy - HS >= L.face.y1 - 0.5, off);
    }

    /* ── 8. the open sea past the islet still stops him ── */
    {
      const ex = I.x1 * cg - 20, ey = rowY;
      await H.hopTo(P, ex, ey - feetDy, { tries: 30 });
      await P.page.waitForTimeout(1200);
      const sea = await hold(P, ['d'], 20000, (o) => o.length > 10 && Math.abs(o[o.length - 1].x - o[o.length - 5].x) < 0.3);
      const end = sea[sea.length - 1];
      const shut = await P.page.evaluate(({ x, y }) => window.__btIsSolid(x + 14, y), { x: end.x, y: end.y });
      console.log(`    sea: ${JSON.stringify({ from: Math.round(sea[0].x), to: Math.round(end.x), swim: end.swim, past: Math.round(end.x - I.x1 * cg), shut })}`);
      rec.ok(`swimming east off the islet the open sea stops him in its shallows (${Math.round(end.x - I.x1 * cg)} px out)`,
        end.swim && end.x - sea[0].x > 30 && end.x - I.x1 * cg < 10 * cg && shut === true, { end, shut });
      await shot('sea');
    }
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}
