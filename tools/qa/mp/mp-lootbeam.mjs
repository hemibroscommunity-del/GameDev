/* ═══ LOOT POPS OUT OF THE MONSTER, THEN A BEAM OF LIGHT RISES FROM IT (v2.3.4124) ═══
 *
 * v2.3.3916, the owner: "Instead of the glow I just want it to be thin beams
 * of vertical light shining upwards."  v2.3.4124, the owner: "Monster deaths
 * to loot drops need more of a transition. It's next frame there's a pinhole
 * of light beaming upwards. I want about twice as thick for the beam of light
 * and for it to behave like light would (not perfectly static)".
 *
 * A real player in the world, a real worker; piles through the game's own
 * loot_drop handler (window.__btDispatch, shaped as the worker sends them, a
 * kill's drop: mp-droplines §7 runs a real kill):
 *   1. the loot leaves the monster's body and lands: the page's clock held at
 *      each 50 ms from the drop, the coin starts high and comes down; NO beam
 *      while it is in the air (the first frames), then the beam rises from
 *      the landed pile, never falling, to its full height;
 *   2. then it STAYS while the pile lies there, alive: its brightness changes
 *      over time (a flicker and a slow pulse), and its motes drift up;
 *   3. how many beams goes with how rare the best drop is: one on coins and
 *      remains (white) and on a shard (green), two on a mystery gear piece
 *      (rare blue), three on a very rare drop (orange); each about TWICE the
 *      old 6 world px (10.8-13.2), in a wider, fainter halo, with motes.  The
 *      last two are given their colour straight (no monster near BroTown
 *      lists them); mp-droplines §8 runs a mystery pile through the real
 *      loot_drop at Frost Ridge and counts its two beams;
 *   4. a pile already lying when it reached the phone (a zone's list: put on
 *      the ground with no loot_drop) has its beam standing at once;
 *   5. a pile not yours: no light; picked up / gone: its beams go, and the
 *      count on screen with them (the cap's bookkeeping);
 *   6. no page errors.
 * Pictures: tools/qa/mp/out/lootbeam-t{0,150,300,450,600,1500}.png -- three
 * piles side by side (white, green, rare blue), the page's clock held at each
 * moment from the drop (docs/shots/loot-beam-strip-4124.webp). */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const TALL = 200, LAND_MS = 400, RISE_MS = 300;   /* v2.3.4124: effectsRenderer BEAM_AT_S, BEAM_RISE_S */

/* a pile as the worker's loot_drop carries it, `dx` across from the player */
const drop = (P, n, dx, extra) => P.page.evaluate(({ n, dx, extra }) => {
  const S = window._gameState.current, me = S.myId;
  const m = (S.monsters || []).find((q) => q && q.home === 'frost' && q.alive !== false) || (S.monsters || []).find((q) => q && q.alive !== false);
  const lootId = 'mk-' + (m ? m.id : 'wm-frost-0') + '-' + n;
  window.__btDispatch({ type: 'loot_drop', payload: { pile: Object.assign({
    lootId, zone: S.currentZone, x: S.player.x + dx, y: S.player.y + ((extra && extra.qaDy != null) ? extra.qaDy : 170),
    coins: 6, skull: 'snowman', shard: null, recipients: [me], shares: { [me]: 1 },
    killerName: S.rpg && S.rpg.name, ts: Date.now(), inventoryClaimed: false,
    hasWeapon: false, weaponClaimed: false, weaponMystery: false, weaponTier: null, weaponType: null, weaponName: null,
  }, extra || {}) } });
  return lootId;
}, { n, dx, extra: extra || null });
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
    rec.ok(`setup: in the world (${zone}), the game's event seam and the beams' probe there`,
      zone === 'wheel' && await P.page.evaluate(() => typeof window.__btDispatch === 'function' && typeof window.__btLootShine === 'function'));

    /* ── 1: it pops, lands, and only then the beam rises -- the page's
       clock held at each 50 ms (this box draws too few frames a second to see
       a half-second pop live: TRAPS §200) ── */
    const t0h = await P.page.evaluate(() => { window.__qaRealNow = Date.now; window.__qaT = Date.now(); Date.now = () => window.__qaT; return window.__qaT; });
    const id1 = await drop(P, 801, -60);
    const steps = [];
    for (let ms = 0; ms <= 1000; ms += 50) {
      const r = await P.page.evaluate(({ t, id }) => new Promise((res) => {
        window.__qaT = t;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const x = (window.__btLootShine() || []).find((q) => q.lootId === id);
          res(x ? { h: x.px, n: x.n, a: x.alpha, cy: x.popDy } : null);
        }));
      }), { t: t0h + ms, id: id1 });
      steps.push({ ms, h: r ? r.h : null, a: r ? r.a : null, cy: r ? r.cy : null });
    }
    await P.page.evaluate(() => { if (window.__qaRealNow) { Date.now = window.__qaRealNow; window.__qaRealNow = null; } });
    const at = (ms) => steps.find((x) => x.ms === ms) || {};
    const air = steps.filter((x) => x.ms < LAND_MS - 50);
    let falls = 0;
    for (let i = 1; i < steps.length; i++) if (steps[i].ms >= LAND_MS && (steps[i].h || 0) < (steps[i - 1].h || 0) - TALL * 0.08) falls++;   /* the light breathes a few px */
    /* the coin's height over the ground in its pop (the probe's popDy, world px) */
    const ups = steps.filter((x) => x.ms <= 300).map((x) => x.cy);
    rec.ok(`1. the loot leaves the body and comes down (the coin's height: ${steps.map((x) => x.ms + ':' + x.cy).join(' ')})`,
      ups[0] >= 35 && Math.max(...ups) >= ups[0] && at(LAND_MS).cy < ups[0] * 0.5 && steps.filter((x) => x.ms >= 650).every((x) => x.cy === 0), steps.map((x) => x.ms + ':' + x.cy));
    rec.ok(`1. ...no beam while it is in the air (${air.map((x) => x.ms + ':' + (x.h || 0) + '/' + (x.a || 0)).join(' ')})`,
      air.length >= 6 && air.every((x) => !x.h && !x.a), air);
    rec.ok(`1. ...then the beam rises from the landed pile (${steps.filter((x) => x.ms >= LAND_MS - 50).map((x) => x.ms + ':' + (x.h == null ? '-' : x.h)).join(' ')}), full by ${LAND_MS + RISE_MS} ms`,
      falls === 0 && (at(LAND_MS + 50).h || 0) > 0 && (at(LAND_MS + 50).h || 0) < TALL * 0.8 && (at(LAND_MS + RISE_MS + 50).h || 0) >= TALL * 0.88 && (at(1000).h || 0) >= TALL * 0.88, steps);

    /* ── 2: it stays, alive (a fresh pile: the first has been lying through
       the held clock's steps, near the 30 s when a pile flashes to go) ── */
    const id2s = await drop(P, 807, -60);
    /* read on a steady timer, not per drawn frame (this box draws a few a
       second, and some seconds fewer: TRAPS §200) */
    const samples = [];
    for (let i = 0; i < 14; i++) {
      await P.page.waitForTimeout(250);
      const r = await probe(P, id2s);
      if (r) samples.push({ age: r.landMs, h: r.px, a: r.alpha, n: r.n, my: r.motes });
    }
    await P.page.evaluate((s) => { window.__qaBeam = s; }, samples);
    const seen = (await P.page.evaluate(() => window.__qaBeam || [])).filter((x) => x.age > 1000);
    const as = seen.map((x) => x.a);
    const aMin = Math.min(...as), aMax = Math.max(...as);
    rec.ok(`2. it stays while the pile lies there (${seen.length} frames over 1-3 s+: ${Math.min(...seen.map((x) => x.h))}-${Math.max(...seen.map((x) => x.h))} px), its light alive (alpha ${aMin}-${aMax})`,
      seen.length >= 3 && seen.every((x) => x.n === 1 && x.h >= TALL * 0.85 && x.a >= 0.45) && aMax - aMin > 0.03 && aMax <= 1, seen.slice(-4));
    const my = seen.filter((x) => x.my && x.my.length).map((x) => x.my[0]);
    rec.ok(`2. ...motes of light drift up through it (${my.slice(0, 5).map((m) => m.y + '/' + m.a).join(' ')})`,
      my.length >= 3 && new Set(my.map((m) => m.y)).size >= 3 && my.some((m) => m.a > 0.1), my.slice(0, 6));

    /* ── 3: how many by how rare ── */
    /* (a fresh coins pile: the first has been lying a while) */
    const id1b = await drop(P, 806, -120);
    const id2 = await drop(P, 802, -60, { shard: 'shard_frost' });
    /* a mystery gear piece (rank 2, rare blue) and a very rare drop (rank 3,
       orange) given their colour straight: in BroTown no monster near has
       them on its codex table for the lines to read (mp-droplines §8 runs a
       mystery pile through the real handler at Frost Ridge) */
    const given = (n, dx, color, rank, qaDy) => P.page.evaluate(({ n, dx, color, rank, qaDy }) => {
      const S = window._gameState.current, me = S.myId;
      const lootId = 'mk-qa-given-' + n;
      S.groundLoot = (S.groundLoot || []).concat([{ lootId, zone: S.currentZone, x: S.player.x + dx, y: S.player.y + (qaDy != null ? qaDy : 170), coins: 1,
        recipients: [me], shares: { [me]: 1 }, ts: Date.now(), inventoryClaimed: false, spawnTime: Date.now(), _shine: { color, rank, at: Date.now() } }]);
      return lootId;
    }, { n, dx, color, rank, qaDy: qaDy == null ? null : qaDy });
    const id3 = await given(803, 0, '#5B99DE', 2);
    const id5 = await given(805, 60, '#FFB25A', 3);
    await P.page.waitForTimeout(900);
    const p1 = await probe(P, id1b), p2 = await probe(P, id2), p3 = await probe(P, id3), p5 = await probe(P, id5);
    /* v2.3.4124: about twice the old 6 world px (its width breathes 10%), in a wider halo, with motes */
    const thick = [p1, p2, p3, p5].every((p) => p && p.beams.every((b) => b.w >= 10.8 && b.w <= 13.2) && p.halo && p.halo.n === p.n && p.halo.w > 25 && p.motes.length === 3 + p.n - 1);
    rec.ok(`3. beams by how rare: coins ${p1 && p1.n} (${p1 && p1.tint}), shard ${p2 && p2.n} (${p2 && p2.tint}), mystery gear ${p3 && p3.n} (${p3 && p3.tint}), very rare ${p5 && p5.n} (${p5 && p5.tint}); twice as thick, haloed, with motes: ${thick}`,
      !!p1 && !!p2 && !!p3 && !!p5 && p1.n === 1 && p1.tint === '#FFFFFF' && p2.n === 1 && p2.tint === '#7EE0A8' && p3.n === 2 && p3.tint === '#5B99DE'
        && p5.n === 3 && p5.tint === '#FFB25A' && thick && new Set(p5.beams.map((b) => b.x)).size === 3, { p1, p2, p3, p5 });

    /* pictures: three colours, the clock held at each moment of a landing */
    await P.page.evaluate(() => { const S = window._gameState.current; S.groundLoot = (S.groundLoot || []).filter((x) => !/-80[123567]$/.test(x.lootId || '')); });
    await P.page.waitForTimeout(400);
    const held = await P.page.evaluate(() => { window.__qaRealNow = Date.now; const t = Date.now(); Date.now = () => window.__qaT; window.__qaT = t; return t; });
    /* (up in the open, clear of the buttons, for the pictures) */
    await drop(P, 811, -170, { qaDy: 90 });
    await drop(P, 812, -90, { shard: 'shard_frost', qaDy: 90 });
    await given(813, -10, '#5B99DE', 2, 90);
    for (const ms of [0, 150, 300, 450, 600, 1500]) {
      await P.page.evaluate((t) => { window.__qaT = t; }, held + ms);
      await P.page.waitForTimeout(450);
      await P.page.evaluate(() => { for (const el of document.querySelectorAll('[data-coach-card], [data-coach-ring]')) el.style.visibility = 'hidden'; }).catch(() => {});
      await P.page.screenshot({ path: join(OUT, `lootbeam-t${ms}.png`) });
    }
    await P.page.evaluate(() => { if (window.__qaRealNow) { Date.now = window.__qaRealNow; window.__qaRealNow = null; } });

    /* ── 4: already lying when it reached the phone ── */
    const id4 = await P.page.evaluate(() => {
      const S = window._gameState.current, me = S.myId;
      const m = (S.monsters || []).find((q) => q && q.alive !== false);
      const lootId = 'mk-' + (m ? m.id : 'wm-frost-0') + '-804';
      S.groundLoot = (S.groundLoot || []).concat([{ lootId, zone: S.currentZone, x: S.player.x + 70, y: S.player.y + 60, coins: 4, skull: 'snowman', shard: null,
        recipients: [me], shares: { [me]: 1 }, ts: Date.now() - 3000, inventoryClaimed: false, spawnTime: Date.now() - 3000 }]);
      return lootId;
    });
    let p4 = null;
    for (const t0 = Date.now(); Date.now() - t0 < 3000 && !(p4 && p4.n); ) { await P.page.waitForTimeout(100); p4 = await probe(P, id4); }
    rec.ok(`4. a pile already lying when it reached the phone: its beam standing at once (${p4 && p4.px} px, late ${p4 && p4.late})`,
      !!p4 && p4.late && p4.n === 1 && p4.px >= TALL * 0.85 && p4.alpha > 0.4, p4);

    /* ── 5: not yours: dark; gone: its beams and the count with them ── */
    const other = await P.page.evaluate((id) => new Promise((res) => {
      const l = (window._gameState.current.groundLoot || []).find((x) => x && x.lootId === id);
      if (!l) return res(null);
      const keep = l.recipients;
      l.recipients = ['bp_someone_else'];
      setTimeout(() => { const r = window.__btLootShine().find((x) => x.lootId === id); l.recipients = keep; res(r); }, 600);
    }), id4);
    /* three fresh piles (the worker tidies away a pile it never had after a
       few seconds, so these are made, counted and taken away at once) */
    await given(821, -90, '#FFFFFF', 0); await given(822, 0, '#5B99DE', 2); await given(823, 90, '#FFFFFF', 0);
    await P.page.waitForTimeout(300);
    const before = await P.page.evaluate(() => window.__btLootBeamCount());
    await P.page.evaluate(() => { const S = window._gameState.current; S.groundLoot = (S.groundLoot || []).filter((x) => !/-82[123]$/.test(x.lootId || '')); });
    await P.page.waitForTimeout(400);
    const gone = await P.page.evaluate(() => { const all = window.__btLootShine() || [];
      return { count: window.__btLootBeamCount(), held: all.reduce((n, x) => n + x.n, 0), left: all.filter((x) => /-82[123]$/.test(x.lootId || '')).length }; });
    rec.ok(`5. a pile not yours has no light (${other && other.alpha}); gone, its beams go (${before} on screen, ${gone.count} after the three piles went, ${gone.held} still on piles)`,
      !!other && other.alpha === 0 && gone.left === 0 && before - gone.count >= 4 && gone.count === gone.held, { other, before, gone });

    rec.ok('6. no page errors', errors.length === 0, errors);
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
