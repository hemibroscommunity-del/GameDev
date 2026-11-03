/* ═══ THE SKATEBOARD'S WHEELS ROLL (v2.3.3857) ═══
 *
 * The owner, 2026-10-29: "use code to make the skateboard wheels appear
 * moving using lighting or wobble just a bit whatever you think looks good"
 * (rendering/rideFx.js, THE WHEELS ROLL).  On a computer in BroTown (the wide
 * layout), on the board (Z):
 *   1. rolling east (D held), the wheels turn (window.__btRideFx().self.turn
 *      grows) and their light spots move from frame to frame;
 *   2. stopped, the wheels hold still (the turn and the spots stay put);
 *   3. off the board (Z), the spots are gone with it;
 *   4. no page errors;
 *   5. v2.3.3973: rolling, the rider and board rise over small bumps (1-1.5
 *      game px, now and then), the shadow's feet and the name plate still.
 * Pictures: tools/qa/mp/out/boardwheels-<label>-NN.png, the board every frame
 * or so while rolling (BOARDWHEELS_LABEL=before: the same build with
 * ?boardroll=0, the old look; its rows 1-3 fail there, as on main).
 *
 *   node tools/qa/mp/run.mjs boardwheels
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(H.REPO, 'tools/qa/mp/out');

const fx = (P) => P.page.evaluate(() => {
  const f = window.__btRideFx ? window.__btRideFx() : null;
  return f && f.self ? { turn: f.self.turn, spots: f.self.spots, spot0: f.self.spot0, view: f.self.view } : null;
});
/* the board, cut from the screen round it (the camera runs ahead of a
   rider, so not the screen's middle): its box, and room round it */
const clip = (P) => P.page.evaluate(() => {
  const c = document.querySelector('canvas').getBoundingClientRect();
  const b = window.__btRideFx && window.__btRideFx({ box: true });
  if (!b) return { x: Math.round(c.left + c.width / 2 - 70), y: Math.round(c.top + c.height / 2 - 40), width: 140, height: 90 };
  return { x: Math.max(0, Math.round(c.left + b.x + b.w / 2 - 60)), y: Math.max(0, Math.round(c.top + b.y + b.h / 2 - 30)), width: 120, height: 50 };
});

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const label = process.env.BOARDWHEELS_LABEL || 'after';
  const errors = [];
  const G = await H.wheelGeom();
  /* the before pictures: the same build with the roll off (?boardroll=0) */
  const P = await H.newPlayer(browser, { name: 'Roller', wsPort, webPort, viewport: { width: 1440, height: 900 }, world: 'wheel', wide: true, dpr: 2,
    ...(label === 'before' ? { query: 'boardroll=0' } : {}) });
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l,
      { timeout: 120000, label: 'into the Wheel' }).then(() => true).catch(() => false);
    rec.ok('in BroTown (guard)', ok);
    if (!ok) return;
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    /* the open square south of the arrival, west a way: room to roll east */
    await H.glideTo(P, G.arrival.x - 500, G.arrival.y + 140, { speed: 900, timeoutMs: 20000 });
    await P.page.waitForTimeout(1500);
    await P.page.keyboard.press('z');
    const on = await H.waitFor(P, () => window.__btRideBtn && window.__btRideBtn(), (v) => v && v.on === true, { timeout: 5000, label: 'on the board' }).then(() => true).catch(() => false);
    rec.ok('on the board (Z)', on);
    if (!on) return;
    await P.page.waitForTimeout(500);

    /* 1. rolling: the turn grows, the spots move -- read a frame at a time */
    await P.page.keyboard.down('d');
    await P.page.waitForTimeout(300);
    const roll = [];
    for (let i = 0; i < 6; i++) {
      roll.push(await fx(P));
      await P.page.waitForTimeout(150);
    }
    await P.page.keyboard.up('d');
    const turns = roll.map((r) => r && r.turn);
    const moved = new Set(roll.map((r) => (r && r.spot0 ? r.spot0.join(',') : null)).filter(Boolean)).size;
    rec.ok(`1. rolling east the wheels turn (${turns.join(' -> ')}) and their spots move (${moved} places in ${roll.length} looks)`,
      roll.every((r) => r && r.spots === 4) && turns[turns.length - 1] > turns[0] && moved >= 3, roll);

    /* ═══ v2.3.3973: OVER THE BUMPS IN THE ROAD ═══
       The owner: "Make snowboard bounce subtly up and down like going over
       small bumps in the road."  Rolling east, the rider and board rise 1-1.5
       game px over a bump now and then (window.__btRideFx().self.bump), the
       shadow's feet and the name plate holding still (their offsets from
       where the figure stands, bumped or not, the same) */
    {
      /* (back west first: a long roll east runs off the ground a board rolls on) */
      await H.glideTo(P, G.arrival.x - 600, G.arrival.y + 140, { speed: 900, timeoutMs: 20000 });
      await P.page.waitForTimeout(800);
      await P.page.keyboard.down('d');
      const bs = [];
      for (let i = 0; i < 28; i++) {
        const f = await P.page.evaluate(() => { const r = window.__btRideFx ? window.__btRideFx() : null; return r && r.self ? { bump: r.self.bump, dist: r.self.dist, plate: r.self.plateOff, feet: r.self.feetOff } : null; });
        if (f) bs.push(f);
        await P.page.waitForTimeout(90);
      }
      await P.page.keyboard.up('d');
      const up = bs.filter((f) => f.bump > 0.05), flat = bs.filter((f) => !(f.bump > 0.05));
      const maxB = up.length ? Math.max(...up.map((f) => f.bump)) : 0;
      /* (the feet's own height moves with the jog's frame, bumped or not: a
         bumped look's must be one a flat look has) */
      const same = (k) => up.length > 0 && flat.length > 0 && up.every((f) => flat.some((g) => Math.abs(f[k] - g[k]) < 0.05));
      rec.ok(`5. rolling, the rider rides over bumps (${up.length} of ${bs.length} looks lifted, up to ${maxB} px; never over 1.5)`,
        up.length >= 2 && flat.length >= 2 && maxB <= 1.5 + 1e-6 && maxB >= 0.5, { up: up.slice(0, 6), flat: flat.slice(0, 3) });
      rec.ok(`5. ...its shadow's feet and its name plate hold still over a bump (feet ${[...new Set(flat.map((f) => f.feet))].join('/')}, plate ${[...new Set(flat.map((f) => f.plate))].join('/')})`,
        same('feet') && same('plate'), { up: up.slice(0, 6), flat: flat.slice(0, 3) });
    }

    /* the pictures: back to the open square, then short rolls east, a
       picture after each (the wheels a little further round each time) */
    await H.glideTo(P, G.arrival.x - 260, G.arrival.y + 150, { speed: 300, timeoutMs: 20000 });
    await P.page.waitForTimeout(1200);
    for (let i = 0; i < 8; i++) {
      await P.page.keyboard.down('d');
      await P.page.waitForTimeout(110);
      await P.page.keyboard.up('d');
      await P.page.waitForTimeout(250);
      await P.page.screenshot({ path: join(OUT, `boardwheels-${label}-${String(i).padStart(2, '0')}.png`), clip: await clip(P) }).catch(() => {});
    }

    /* 2. stopped: still */
    await P.page.waitForTimeout(1200);
    const s0 = await fx(P);
    await P.page.waitForTimeout(800);
    const s1 = await fx(P);
    /* (the spots ride on the board, which follows the boots as the figure
       breathes: the turn is what holds still) */
    rec.ok(`2. stopped, the wheels hold still (turn ${s0 && s0.turn} -> ${s1 && s1.turn})`,
      !!s0 && !!s1 && s0.turn === s1.turn, { s0, s1 });

    /* 3. off: the spots go with the board */
    /* (the worker answers a toggle too soon after the last with 'soon':
       Z again, a few seconds on) */
    let off = null;
    for (let i = 0; i < 3 && !off; i++) {
      await P.page.keyboard.press('z');
      off = await H.waitFor(P, () => window.__btRideBtn && window.__btRideBtn(), (v) => v && v.on === false, { timeout: 3000, label: 'off the board' }).catch(() => null);
    }
    await P.page.waitForTimeout(400);
    const left = await P.page.evaluate(() => (window.__btRideFx ? window.__btRideFx().held : null));
    rec.ok(`3. off the board, it and its spots are gone (${left} held)`, !!off && left === 0, { off, left });
  } finally {
    rec.ok('4. no page errors', errors.length === 0, errors.slice(0, 4));
    await P.ctx.close().catch(() => {});
  }
}
