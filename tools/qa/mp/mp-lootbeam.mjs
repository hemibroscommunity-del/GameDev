/* ═══ THIN BEAMS OF LIGHT RISE FROM YOUR PILE, ON A PHONE (v2.3.3916) ═══
 *
 * The owner, 2026-11-02: "Redo the loot drop lighting. Instead of the glow I
 * just want it to be thin beams of vertical light shining upwards."  (It
 * replaces v2.3.3805's beam that came DOWN into a glow; docs/specs/loot-shine.md.)
 *
 * A real player in the world, a real worker; piles through the game's own
 * loot_drop handler (window.__btDispatch, shaped as the worker sends them,
 * mp-droplines §8's way):
 *   1. the moment your pile lands its beam stands at its foot and RISES: the
 *      page's clock held at each 50 ms from the landing, never falling, near
 *      nothing at the landing and at full height by BEAM_RISE_S (0.35 s);
 *   2. then it STAYS while the pile lies there: 3 s on, still standing at full
 *      height, its light shimmering a little (alpha moves, never out);
 *   3. how many beams goes with how rare the best drop is: one on coins and
 *      remains (white) and on a shard (green), two on a mystery gear piece
 *      (rare blue), three on a very rare drop (orange); each thin (under 10
 *      world px).  The last two are given their colour straight (no monster
 *      near BroTown lists them); mp-droplines §8 runs a mystery pile through
 *      the real loot_drop at Frost Ridge and counts its two beams;
 *   4. a pile already lying when it reached the phone (a zone's list: put on
 *      the ground with no loot_drop) has its beam standing at once;
 *   5. a pile not yours: no light; picked up / gone: its beams go, and the
 *      count on screen with them (the cap's bookkeeping);
 *   6. no page errors.
 * Pictures: tools/qa/mp/out/lootbeam-t{0,100,200,350,1500}.png -- three piles
 * side by side (white, green, rare blue), the page's clock held at each moment. */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const TALL = 200, RISE_MS = 350;

/* a pile as the worker's loot_drop carries it, `dx` across from the player */
const drop = (P, n, dx, extra) => P.page.evaluate(({ n, dx, extra }) => {
  const S = window._gameState.current, me = S.myId;
  const m = (S.monsters || []).find((q) => q && q.home === 'frost' && q.alive !== false) || (S.monsters || []).find((q) => q && q.alive !== false);
  const lootId = 'mk-' + (m ? m.id : 'wm-frost-0') + '-' + n;
  window.__btDispatch({ type: 'loot_drop', payload: { pile: Object.assign({
    lootId, zone: S.currentZone, x: S.player.x + dx, y: S.player.y + 170,
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

    /* ── 1: it rises, the page's clock held at each 50 ms (this box draws
       too few frames a second to see a 0.35 s rise live: TRAPS §200) ── */
    const t0h = await P.page.evaluate(() => { window.__qaRealNow = Date.now; window.__qaT = Date.now(); Date.now = () => window.__qaT; return window.__qaT; });
    const id1 = await drop(P, 801, -60);
    const steps = [];
    for (let ms = 0; ms <= 600; ms += 50) {
      const r = await P.page.evaluate(({ t, id }) => new Promise((res) => {
        window.__qaT = t;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const x = (window.__btLootShine() || []).find((q) => q.lootId === id);
          res(x ? { h: x.px, n: x.n } : null);
        }));
      }), { t: t0h + ms, id: id1 });
      steps.push({ ms, h: r ? r.h : null, n: r ? r.n : null });
    }
    await P.page.evaluate(() => { if (window.__qaRealNow) { Date.now = window.__qaRealNow; window.__qaRealNow = null; } });
    let falls = 0;
    for (let i = 1; i < steps.length; i++) if ((steps[i].h || 0) < (steps[i - 1].h || 0) - TALL * 0.06) falls++;   /* the shimmer sways a few px */
    const at = (ms) => steps.find((x) => x.ms === ms) || {};
    rec.ok(`1. the beam rises from the pile's foot (${steps.map((x) => x.ms + ':' + (x.h == null ? '-' : x.h)).join(' ')}), full by ${RISE_MS} ms`,
      falls === 0 && (at(0).h || 0) <= TALL * 0.1 && (at(100).h || 0) > (at(0).h || 0) && (at(400).h || 0) >= TALL * 0.9 && (at(600).h || 0) >= TALL * 0.9, steps);

    /* ── 2: it stays, shimmering ── */
    await P.page.evaluate((id) => {
      const seen = window.__qaBeam = [];
      const t0 = performance.now();
      const step = () => {
        const r = (window.__btLootShine ? window.__btLootShine() : []).find((x) => x.lootId === id);
        if (r) seen.push({ age: r.ageMs, h: r.px, a: r.alpha, n: r.n });
        if (performance.now() - t0 < 3000) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, id1);
    await P.page.waitForTimeout(3300);
    const seen = (await P.page.evaluate(() => window.__qaBeam || [])).filter((x) => x.age > 1000);
    const as = seen.map((x) => x.a);
    const aMin = Math.min(...as), aMax = Math.max(...as);
    rec.ok(`2. it stays while the pile lies there (${seen.length} frames over 1-3 s+: ${Math.min(...seen.map((x) => x.h))}-${Math.max(...seen.map((x) => x.h))} px), shimmering (alpha ${aMin}-${aMax})`,
      seen.length >= 3 && seen.every((x) => x.n === 1 && x.h >= TALL * 0.85 && x.a >= 0.5) && aMax - aMin > 0.01 && aMax <= 0.95, seen.slice(-4));

    /* ── 3: how many by how rare ── */
    /* (a fresh coins pile: the first has been lying a while) */
    const id1b = await drop(P, 806, -120);
    const id2 = await drop(P, 802, -60, { shard: 'shard_frost' });
    /* a mystery gear piece (rank 2, rare blue) and a very rare drop (rank 3,
       orange) given their colour straight: in BroTown no monster near has
       them on its codex table for the lines to read (mp-droplines §8 runs a
       mystery pile through the real handler at Frost Ridge) */
    const given = (n, dx, color, rank) => P.page.evaluate(({ n, dx, color, rank }) => {
      const S = window._gameState.current, me = S.myId;
      const lootId = 'mk-qa-given-' + n;
      S.groundLoot = (S.groundLoot || []).concat([{ lootId, zone: S.currentZone, x: S.player.x + dx, y: S.player.y + 170, coins: 1,
        recipients: [me], shares: { [me]: 1 }, ts: Date.now(), inventoryClaimed: false, spawnTime: Date.now(), _shine: { color, rank, at: Date.now() } }]);
      return lootId;
    }, { n, dx, color, rank });
    const id3 = await given(803, 0, '#5B99DE', 2);
    const id5 = await given(805, 60, '#FFB25A', 3);
    await P.page.waitForTimeout(900);
    const p1 = await probe(P, id1b), p2 = await probe(P, id2), p3 = await probe(P, id3), p5 = await probe(P, id5);
    const thin = [p1, p2, p3, p5].every((p) => p && p.beams.every((b) => b.w < 10));
    rec.ok(`3. beams by how rare: coins ${p1 && p1.n} (${p1 && p1.tint}), shard ${p2 && p2.n} (${p2 && p2.tint}), mystery gear ${p3 && p3.n} (${p3 && p3.tint}), very rare ${p5 && p5.n} (${p5 && p5.tint}); thin: ${thin}`,
      !!p1 && !!p2 && !!p3 && !!p5 && p1.n === 1 && p1.tint === '#FFFFFF' && p2.n === 1 && p2.tint === '#7EE0A8' && p3.n === 2 && p3.tint === '#5B99DE'
        && p5.n === 3 && p5.tint === '#FFB25A' && thin && new Set(p5.beams.map((b) => b.x)).size === 3, { p1, p2, p3, p5 });

    /* pictures: three colours, the clock held at each moment of a landing */
    await P.page.evaluate(() => { const S = window._gameState.current; S.groundLoot = (S.groundLoot || []).filter((x) => !/-80[12356]$/.test(x.lootId || '')); });
    await P.page.waitForTimeout(400);
    const held = await P.page.evaluate(() => { window.__qaRealNow = Date.now; const t = Date.now(); Date.now = () => window.__qaT; window.__qaT = t; return t; });
    await drop(P, 811, -90);
    await drop(P, 812, 0, { shard: 'shard_frost' });
    await given(813, 90, '#5B99DE', 2);
    for (const ms of [0, 100, 200, 350, 1500]) {
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
