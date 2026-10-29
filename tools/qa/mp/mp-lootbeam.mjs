/* ═══ A BEAM COMES DOWN INTO YOUR PILE'S GLOW, ON A PHONE (v2.3.3805) ═══
 *
 * The owner, 2026-10-29: "for the loot drop add a vertical shine that starts
 * at its peak and climbs downward to just end at the normal glow".
 *
 * A real player in the world, a real worker; piles through the game's own
 * loot_drop handler (window.__btDispatch, shaped as the worker sends them,
 * mp-droplines §8's way):
 *   1. the moment your pile lands a beam stands on it, near its full height;
 *   2. its top comes down, frame by frame (by the renderer's own clock, the
 *      shine's `ageMs`: TRAPS §200), never rising, and is all but down by the
 *      shine's settle (SHINE_SETTLE_S, 1 s);
 *   3. after it: the beam gone (destroyed), the glow still there;
 *   4. a pile already lying when it reached the phone (a zone's list: put on
 *      the ground with no loot_drop) glows, and has no beam;
 *   5. no page errors.
 * Pictures: tools/qa/mp/out/lootbeam-t{0,200,400,600,800,1000}.png -- two
 * piles side by side (coins and remains: white; a Frost Shard: its green),
 * the page's clock held at each moment from the landing. */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const PEAK = 230, SETTLE_MS = 1000;

/* a pile as the worker's loot_drop carries it, `dx` across from the player */
const drop = (P, n, dx, shard) => P.page.evaluate(({ n, dx, shard }) => {
  const S = window._gameState.current, me = S.myId;
  const m = (S.monsters || []).find((q) => q && q.alive !== false);
  const lootId = 'mk-' + (m ? m.id : 'wm-frost-0') + '-' + n;
  window.__btDispatch({ type: 'loot_drop', payload: { pile: {
    lootId, zone: S.currentZone, x: S.player.x + dx, y: S.player.y + 170,
    coins: 6, skull: 'snowman', shard: shard || null, recipients: [me], shares: { [me]: 1 },
    killerName: S.rpg && S.rpg.name, ts: Date.now(), inventoryClaimed: false,
    hasWeapon: false, weaponClaimed: false, weaponMystery: false, weaponTier: null, weaponType: null, weaponName: null,
  } } });
  return lootId;
}, { n, dx, shard: shard || null });
const probe = (P, id) => P.page.evaluate((id) => (window.__btLootShine ? window.__btLootShine() : []).find((x) => x.lootId === id) || null, id);

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Beambro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    let zone = null;
    for (let i = 0; i < 120; i++) {
      zone = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
      if (zone === 'wheel') break;
      await P.page.waitForTimeout(500);
    }
    await P.page.waitForTimeout(2500);
    rec.ok(`setup: in the world (${zone}), the game's event seam and the shine's probe there`,
      zone === 'wheel' && await P.page.evaluate(() => typeof window.__btDispatch === 'function'));

    /* ── 1-3: a pile lands, followed every frame ── */
    const id1 = await drop(P, 801, -60, false);
    await P.page.evaluate((id) => {
      const seen = window.__qaBeam = [];
      const t0 = performance.now();
      const step = () => {
        const r = (window.__btLootShine ? window.__btLootShine() : []).find((x) => x.lootId === id);
        if (r) seen.push({ age: r.ageMs, h: r.beam ? r.beam.h : null, a: r.beam ? r.beam.a : null, done: r.beamDone, glow: r.alpha });
        if (performance.now() - t0 < 2600) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, id1);
    await P.page.waitForTimeout(3000);
    const seen = await P.page.evaluate(() => window.__qaBeam || []);
    const live = seen.filter((x) => x.h != null);
    const first = live[0];
    /* this box draws a few frames a second: the first frame drawn is read
       against the height the beam should have at its age (the shine's own
       easing in and out: 1 - k^2 (3 - 2k)) */
    const want = (age) => { const k = Math.min(1, age / SETTLE_MS); return PEAK * (1 - k * k * (3 - 2 * k)); };
    rec.ok(`1. the moment your pile lands a beam stands on it: ${first && first.h} px at ${first && first.age} ms (${first ? Math.round(want(first.age)) : '?'} due then; its peak ${PEAK})`,
      !!first && first.age < 500 && Math.abs(first.h - want(first.age)) <= PEAK * 0.1 && live.every((x) => Math.abs(x.h - want(x.age)) <= PEAK * 0.1), { first, live, n: seen.length });
    /* ...and its whole fall, the page's clock held at each 100 ms from a
       second pile's landing (this box draws too few frames a second to see
       every step of a one-second fall live) */
    const t0h = await P.page.evaluate(() => { window.__qaRealNow = Date.now; window.__qaT = Date.now(); Date.now = () => window.__qaT; return window.__qaT; });
    const id2 = await drop(P, 802, 60, null);   /* landing on the held clock */
    const steps = [];
    for (let ms = 0; ms <= 1100; ms += 100) {
      const r = await P.page.evaluate(({ t, id }) => new Promise((res) => {
        window.__qaT = t;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const x = (window.__btLootShine() || []).find((q) => q.lootId === id);
          res(x ? { h: x.beam ? x.beam.h : null, done: x.beamDone } : null);
        }));
      }), { t: t0h + ms, id: id2 });
      steps.push({ ms, h: r ? r.h : undefined, done: r ? r.done : undefined });
    }
    await P.page.evaluate(() => { if (window.__qaRealNow) { Date.now = window.__qaRealNow; window.__qaRealNow = null; } });
    const fall = steps.filter((x) => x.h != null);
    let rises = 0;
    for (let i = 1; i < fall.length; i++) if (fall[i].h > fall[i - 1].h + 1) rises++;
    const at = (ms) => steps.find((x) => x.ms === ms) || {};
    rec.ok(`2. its top comes down, never rising (${steps.map((x) => x.ms + ':' + (x.h == null ? '-' : x.h)).join(' ')}), all but down by the settle`,
      fall.length >= 8 && rises === 0 && Math.abs((at(0).h || 0) - PEAK) <= 3 && Math.abs((at(500).h || 0) - PEAK / 2) <= 6 && at(900).h != null && at(900).h <= PEAK * 0.05 && at(1000).h == null && at(1100).h == null && at(1100).done === true, steps);
    const after = seen.filter((x) => x.age > SETTLE_MS + 100);
    const end = await probe(P, id1);
    rec.ok(`3. after it the beam is gone (destroyed: ${end && end.beamDone}) and the glow is still there (${end && end.alpha})`,
      after.length > 0 && after.every((x) => x.h == null && x.done) && !!end && end.beam === null && end.beamDone && end.alpha >= 0.5, { end, after: after.slice(-2) });

    /* ── 4: a pile already lying when it reached the phone ── */
    const id4 = await P.page.evaluate(() => {
      const S = window._gameState.current, me = S.myId;
      const m = (S.monsters || []).find((q) => q && q.alive !== false);
      const lootId = 'mk-' + (m ? m.id : 'wm-frost-0') + '-804';
      const pile = { lootId, zone: S.currentZone, x: S.player.x + 70, y: S.player.y + 60, coins: 4, skull: 'snowman', shard: null,
        recipients: [me], shares: { [me]: 1 }, ts: Date.now() - 20000, inventoryClaimed: false, spawnTime: Date.now() - 20000 };
      S.groundLoot = (S.groundLoot || []).concat([pile]);
      const seen = window.__qaBeam4 = [];
      const t0 = performance.now();
      const step = () => {
        const r = (window.__btLootShine ? window.__btLootShine() : []).find((x) => x.lootId === lootId);
        if (r) seen.push({ h: r.beam ? r.beam.h : null, late: r.late, glow: r.alpha });
        if (performance.now() - t0 < 1500) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      return lootId;
    });
    await P.page.waitForTimeout(1900);
    const s4 = await P.page.evaluate(() => window.__qaBeam4 || []);
    rec.ok(`4. a pile already lying when it reached the phone glows (${s4.length ? s4[s4.length - 1].glow : '?'}) with no beam in any of ${s4.length} frames`,
      s4.length > 0 && s4.every((x) => x.h == null) && s4.every((x) => x.late) && s4[s4.length - 1].glow > 0, { s4: s4.slice(0, 3), id4 });

    /* ── pictures: two rarity colours, the clock held at each moment ── */
    await P.page.evaluate(() => { const S = window._gameState.current; S.groundLoot = (S.groundLoot || []).filter((x) => !/-80[14]$/.test(x.lootId || '')); });
    await P.page.waitForTimeout(400);
    const held = await P.page.evaluate(() => { window.__qaRealNow = Date.now; const t = Date.now(); Date.now = () => window.__qaT; window.__qaT = t; return t; });
    const a = await drop(P, 811, -110, false);
    const b = await drop(P, 812, 110, 'shard_frost');   /* the shard's green */
    for (const ms of [0, 200, 400, 600, 800, 1000]) {
      await P.page.evaluate((t) => { window.__qaT = t; }, held + ms);
      await P.page.waitForTimeout(450);   /* a few frames drawn at that moment */
      await P.page.evaluate(() => { for (const el of document.querySelectorAll('[data-coach-card], [data-coach-ring]')) el.style.visibility = 'hidden'; }).catch(() => {});
      await P.page.screenshot({ path: join(OUT, `lootbeam-t${ms}.png`) });
    }
    const pair = await P.page.evaluate(({ a, b }) => (window.__btLootShine() || []).filter((x) => x.lootId === a || x.lootId === b).map((x) => ({ id: x.lootId, tint: x.tint })), { a, b });
    await P.page.evaluate(() => { if (window.__qaRealNow) { Date.now = window.__qaRealNow; window.__qaRealNow = null; } });
    rec.ok(`pictures: two colours side by side (${pair.map((x) => x.tint).join(', ')}), lootbeam-t0..1000.png`, pair.length === 2 && pair[0].tint !== pair[1].tint, pair);

    rec.ok('5. no page errors', errors.length === 0, errors);
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
