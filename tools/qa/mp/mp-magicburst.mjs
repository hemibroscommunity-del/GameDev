/* ═══ A STAFF BOLT EXPLODES ON A HIT, THE SPECIAL BIGGER (v2.3.3892) ═══
 *
 * The owner, 2026-10-29: "Magic attacks need a mini explosion upon impact with
 * monsters and a larger explosion for the special attack. Right now it just
 * disappears upon impact."
 *
 * A phone in the world (and a computer, wide), the staff out, a pinned slime
 * locked in front of you (mp-staffcast's way):
 *   1. a bolt's hit starts an explosion where it lands (window.__btStaffFx
 *      burstsLive: kind, age), small; it plays out and is gone within its
 *      time, the glows given back (nothing drawn once nothing flies);
 *   2. the special's hit starts the big one;
 *   3. `?magicburst=0`: the crash as it was, no explosion (the "before");
 *   4. the same on a computer;
 *   5. no page errors.
 * Pictures (the clock held mid-burst): tools/qa/mp/out/magicburst-*.png. */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

async function setup(P) {
  await H.enterWorld(P);
  for (let i = 0; i < 120; i++) {
    const z = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
    if (z === 'wheel') break;
    await P.page.waitForTimeout(500);
  }
  await P.page.waitForTimeout(2500);
  return P.page.evaluate(() => {
    const S = window._gameState.current, R = S.rpg, F = window._gameFns || {};
    const t = (F.WOODWORKING_TIERS || {}).pine;
    R.staffWeapon = { type: 'staff', tierMult: t ? t.tierMult : 1, gearBase: 'pine', name: 'Pine Staff', tier: 'common' };
    R.activeSlot = 'staff';
    R.mana = R.maxMana = 900;
    return { zone: S.currentZone };
  });
}

/* a pinned slime `dx` east, locked by a tap, kept on the list (the worker's
   own list replaces it on its ticks) */
const arm = (P, dx) => P.page.evaluate((dx) => {
  const S = window._gameState.current, F = window._gameFns || {};
  if (!F.createMonster) return { err: 'no createMonster' };
  const m = F.createMonster('magicburst-1', 'fodder', 2, S.player.x + dx, S.player.y, null);
  m.alive = true; m.curHp = m.maxHp = 1e6; m.spd = 0; m.speed = 0;
  window.__qaMb = m;
  const keep = () => {
    const S2 = window._gameState.current;
    if (!(S2.monsters || []).includes(window.__qaMb)) S2.monsters = (S2.monsters || []).concat([window.__qaMb]);
    S2.lockedTarget = { ref: window.__qaMb, type: 'monster', src: 'tap', ts: Date.now() };
  };
  keep();
  clearInterval(window.__qaMbKeep);
  window.__qaMbKeep = setInterval(keep, 50);
  S.arrows = [];
  return { ok: true };
}, dx);

/* follow the explosions until `want` (normal or big) has been seen begin and
   end, or `ms` passes; with `fire` 'special' the special is pressed once */
const watch = (P, big, fire, ms) => P.page.evaluate(({ big, fire, ms }) => new Promise((resolve) => {
  const S = window._gameState.current, F = window._gameFns || {};
  const t0 = Date.now();
  const fx0 = window.__btStaffFx ? window.__btStaffFx() : null;
  const out = { bursts0: fx0 ? fx0.bursts : 0, seen: null, maxAge: 0, endedAt: null, startedAt: null, on: fx0 ? fx0.burstOn : null, crashes0: fx0 ? fx0.crashes : 0, crashes: 0 };
  if (fire === 'special') { S.autoAttack = false; S.arrows = []; S._lastSwipe = 0; S.swingTimer = 0; F.specialAttack(); }
  else S.autoAttack = true;
  const tick = () => {
    const fx = window.__btStaffFx ? window.__btStaffFx() : null;
    const now = Date.now();
    if (fx) {
      out.crashes = fx.crashes - out.crashes0;
      const mine = (fx.burstsLive || []).filter((b) => b.big === big);
      if (mine.length) {
        if (!out.seen) { out.seen = mine[0]; out.startedAt = now; }
        out.maxAge = Math.max(out.maxAge, ...mine.map((b) => b.age));
      } else if (out.seen && !out.endedAt) out.endedAt = now;
    }
    if (now - t0 < ms && !(out.seen && out.endedAt)) { requestAnimationFrame(tick); return; }
    S.autoAttack = false;
    out.burstsN = fx ? fx.bursts - out.bursts0 : 0;
    resolve(out);
  };
  requestAnimationFrame(tick);
}), { big, fire, ms });

/* A picture `ms` into a crash at the slime: the page's clock held, the crash
   queued exactly as a hit queues it (combatHelpers orbCrashFx: its two rings,
   the big one's blast ring, and the crash record), then the clock stepped on.
   The live path is the checks above; this only makes the moment certain on a
   page that draws a few frames a second. */
async function picture(P, big, ms, path, elem) {
  await P.page.evaluate(({ big, ms, elem }) => new Promise((resolve) => {
    const S = window._gameState.current;
    S.autoAttack = false; S.arrows = [];
    const m = window.__qaMb;
    const x = m ? m.x : S.player.x + 170, y = m ? (m.renderY != null ? m.renderY : m.y) - 26 : S.player.y - 26;
    window.__qaRealNow = window.__qaRealNow || Date.now;
    const t = window.__qaRealNow();
    window.__qaT = t; Date.now = () => window.__qaT;
    const color = '#a78bfa';
    S._impactRings = S._impactRings || [];
    S._impactRings.push({ x, y, ts: t, color, maxR: 26 * (big ? 1.6 : 1), duration: big ? 420 : 320, style: 'staff', elem: null, vdx: 0, vdy: 0 });
    S._impactRings.push({ x, y, ts: t, startDelay: 40, color, maxR: 14 * (big ? 1.6 : 1), duration: 220, style: 'staff', elem: null, vdx: 0, vdy: 0 });
    if (big) S._impactRings.push({ x, y, ts: t, startDelay: 20, color, maxR: 90, duration: 460, style: 'staff', elem: null, vdx: 0, vdy: 0, blast: true });
    S._staffCrashes = S._staffCrashes || [];
    S._staffCrashes.push({ x, y, vdx: 0, vdy: 0, elem: elem || null, big: !!big });
    /* one frame at the crash's own moment (it is taken in), then on to `ms` */
    requestAnimationFrame(() => requestAnimationFrame(() => { window.__qaT = t + ms; resolve(true); }));
  }), { big, ms, elem: elem || null });
  await P.page.waitForTimeout(600);
  await P.page.screenshot({ path });
  await P.page.evaluate(() => { if (window.__qaRealNow) { Date.now = window.__qaRealNow; window.__qaRealNow = null; } });
  await P.page.waitForTimeout(900);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const errors = [];
  const onErr = (tag) => (e) => errors.push(tag + ': ' + String(e && e.message || e).slice(0, 200));

  /* ── 1-2: a phone ── */
  const P = await H.newPlayer(browser, { name: 'Boomcaster', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  P.page.on('pageerror', onErr('phone'));
  try {
    const s = await setup(P);
    const a = await arm(P, 170);
    rec.ok(`setup: in the world (${s.zone}), the staff out, a slime locked 170 px east`, s.zone === 'wheel' && !!a.ok, { s, a });
    const n = await watch(P, false, 'auto', 12000);
    const life = n.startedAt && n.endedAt ? n.endedAt - n.startedAt : null;
    rec.ok(`1. a bolt's hit explodes (${n.burstsN} bursts, ${n.crashes} crashes), small, and it plays out and is gone (${life} ms; its oldest frame ${n.maxAge} ms)`,
      n.on === true && !!n.seen && n.seen.big === false && n.burstsN >= 1 && life != null && life < 900 && n.maxAge <= 400, n);
    const quiet = await P.page.evaluate(() => new Promise((resolve) => {
      const S = window._gameState.current; S.autoAttack = false;
      const t0 = Date.now();
      const tick = () => {
        const flying = (S.arrows || []).some((x) => x && x.isStaff);
        const fx = window.__btStaffFx ? window.__btStaffFx() : null;
        if ((flying || (fx && fx.burstsLive.length) || Date.now() - t0 < 1500) && Date.now() - t0 < 9000) { setTimeout(tick, 100); return; }
        requestAnimationFrame(() => requestAnimationFrame(() => resolve(window.__btStaffFx ? window.__btStaffFx() : null)));
      };
      setTimeout(tick, 100);
    }));
    rec.ok('...and after it, nothing of it is left: no explosion playing, the glows given back', !!quiet && quiet.burstsLive.length === 0 && quiet.drawn.glowFront === 0 && quiet.drawn.glowPainted === 0, quiet && { live: quiet.burstsLive, drawn: quiet.drawn });
    await picture(P, false, 90, join(OUT, 'magicburst-after-bolt.png'));
    await arm(P, 170);
    const b = await watch(P, true, 'special', 12000);
    const blife = b.startedAt && b.endedAt ? b.endedAt - b.startedAt : null;
    rec.ok(`2. the special's hit explodes BIG (${b.burstsN} big), and is gone after (${blife} ms; its oldest frame ${b.maxAge} ms)`,
      !!b.seen && b.seen.big === true && blife != null && blife < 1200 && b.maxAge <= 600, b);
    await P.page.waitForTimeout(1500);
    await arm(P, 170);
    await picture(P, true, 140, join(OUT, 'magicburst-after-special.png'));
    /* a flame staff's, in its own colour */
    await picture(P, false, 90, join(OUT, 'magicburst-after-flame.png'), 'flame');
    await picture(P, true, 140, join(OUT, 'magicburst-after-flame-special.png'), 'flame');
  } finally {
    await P.page.evaluate(() => clearInterval(window.__qaMbKeep)).catch(() => {});
    await P.ctx.close().catch(() => {});
  }

  /* ── 3: ?magicburst=0, the before ── */
  const Q = await H.newPlayer(browser, { name: 'Oldcaster', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: 'magicburst=0' });
  Q.page.on('pageerror', onErr('off'));
  try {
    await setup(Q);
    await arm(Q, 170);
    const o = await watch(Q, false, 'auto', 6000);
    rec.ok(`3. ?magicburst=0: the crash as it was (${o.crashes} crashes), no explosion`, o.on === false && o.crashes >= 1 && o.burstsN === 0 && !o.seen, o);
    /* the before pictures: the same moments, the crash as it was */
    await arm(Q, 170);
    await picture(Q, false, 90, join(OUT, 'magicburst-before-bolt.png'));
    await picture(Q, true, 140, join(OUT, 'magicburst-before-special.png'));
  } finally {
    await Q.page.evaluate(() => clearInterval(window.__qaMbKeep)).catch(() => {});
    await Q.ctx.close().catch(() => {});
  }

  /* ── 4: a computer ── */
  const C = await H.newPlayer(browser, { name: 'Deskcaster', wsPort, webPort, world: 'wheel', wide: true });
  C.page.on('pageerror', onErr('desk'));
  try {
    await setup(C);
    await arm(C, 200);
    const d = await watch(C, false, 'auto', 12000);
    rec.ok(`4. on a computer a bolt's hit explodes too, and is gone after (${d.startedAt && d.endedAt ? d.endedAt - d.startedAt : null} ms)`,
      !!d.seen && !!d.endedAt, d);
    await picture(C, false, 90, join(OUT, 'magicburst-desk.png'));
  } finally {
    await C.page.evaluate(() => clearInterval(window.__qaMbKeep)).catch(() => {});
    await C.ctx.close().catch(() => {});
  }
  rec.ok('5. no page errors', errors.length === 0, errors);
}
