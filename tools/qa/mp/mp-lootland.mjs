/* ═══ LOOT LANDS: EACH ITEM BOUNCES, THE RAREST ON TOP, RARE DROP! (v2.3.2771) ═══
 *
 * Owner: "Make it so loot from monster drops kind of bounces when it first
 * lands (each item independently).  Show rarer items in top in terms of drop
 * rate if overlap.  Show 'RARE DROP!' message if there's a rare item in the
 * pile and have it just give a faint white shine upward from its position."
 *
 * A rare drop is 1 in 200 to 1 in 500 kills, so this does not farm for one: it
 * puts a pile on the client's ground list in the exact shape the server sends
 * (_serializePile) and reads window.__btLootRare -- the draw order and each
 * part's height over the landing, because a bounce is a number over time.
 *   1. a fresh pile with a bow, a gem and an iron chest plate: every part is
 *      airborne at first and settled by 1.3s; they do not all move as one; the
 *      draw order is remains < coin < shard < weapon < gem < armour; a shine
 *      per rare item; RARE DROP! shows, then goes.
 *   2. a fresh ordinary pile: it still bounces, and says nothing.
 *   3. an OLD rare pile (a zone-entry sync): no bounce, no RARE DROP!.
 * Frames of the landing go to out/lootland-*.png for a human.
 */
import * as H from './harness.mjs';

const rare = (P) => P.page.evaluate(() => (window.__btLootRare ? window.__btLootRare() : null));
const pileOf = (list, id) => (list || []).find((p) => p.lootId === id) || null;

/* The piles are client-only, so a real loot sync from the worker (any
   message carrying the zone's pile list) replaces the list and drops them.
   They are held on window and the SAME object is put back whenever one has
   gone, so its render state (landing seed, RARE DROP! once-flag) survives. */
async function drop(P, pile, dx, ageMs = 0) {
  return P.page.evaluate(({ pile, dx, ageMs }) => {
    const S = window._gameState.current;
    const p = Object.assign({ zone: S.currentZone, x: S.player.x + dx, y: S.player.y - 20,
      recipients: [S.myId], ts: Date.now() - ageMs, killerName: S.myName || 'you' }, pile);
    (window.__qaPiles || (window.__qaPiles = [])).push(p);
    (S.groundLoot || (S.groundLoot = [])).push(p);
    if (!window.__qaPileKeeper) {
      window.__qaPileKeeper = setInterval(() => {
        const G = window._gameState.current.groundLoot || (window._gameState.current.groundLoot = []);
        for (const q of window.__qaPiles) if (G.indexOf(q) < 0 && Date.now() - q.ts < 25000) G.push(q);
      }, 16);
    }
    return p.lootId;
  }, { pile, dx, ageMs });
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Looter', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);
  await P.page.addStyleTag({ content: '*:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
  /* a combat zone: town is safe, and a safe zone empties the pile list on
     every loot sync (wsClient: "Safe zones never have loot piles") */
  await H.warpToZone(P, { wsPort, label: 'Verdant Wilds', zoneId: 'verdant' }).catch(() => null);
  const z = await H.readState(P, (S) => S.currentZone);
  rec.ok('in a combat zone (guard)', z === 'verdant', { z });
  await H.closeDest(P).catch(() => {});
  await P.page.evaluate(() => { const S = window._gameState.current; S.monsters = []; });
  await P.page.waitForTimeout(1200);

  /* ── 1. a fresh rare pile ── */
  await drop(P, { lootId: 'qa-rare', coins: 12, skull: 'fodder', shard: 'shard_meadow', gem: 'rare_gem',
    hasWeapon: true, weaponType: 'bow', weaponName: 'Bow',
    armor: [{ name: 'Iron Torso', slot: 'armor', mat: 'iron', mystery: false }] }, 110);
  const samples = [];
  const t0 = Date.now();
  for (const at of [60, 200, 420, 700, 1400]) {
    const wait = at - (Date.now() - t0);
    if (wait > 0) await P.page.waitForTimeout(wait);
    samples.push(pileOf(await rare(P), 'qa-rare'));
    if (at === 200 || at === 700) await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/lootland-${at}ms.png` }).catch(() => {});
  }
  const first = samples[0], settled = samples[samples.length - 1];
  console.log('    first: ' + JSON.stringify(first));
  console.log('    settled: ' + JSON.stringify(settled));
  rec.ok('the rare pile is drawn (guard)', !!first && first.parts.length >= 5, first);
  if (first && settled) {
    const ys = (p) => Object.fromEntries(p.parts.map((x, i) => [x.kind + i, x.y]));
    const a = ys(first), b = ys(settled);
    const moved = Object.keys(b).filter((k) => k in a && !/beam|rareText/.test(k) && a[k] < b[k] - 3);
    rec.ok('every item starts in the air and comes down (landed lower than it began)',
      moved.length >= 4, { first: a, settled: b, moved });
    /* independence: at one instant the items are at different stages */
    const mid = samples[1];
    const lifts = mid ? mid.parts.filter((x) => !/beam|rareText/.test(x.kind)).map((x) => {
      const s = settled.parts.find((y) => y.kind === x.kind && Math.abs(y.z - x.z) < 0.001);
      return s ? +(s.y - x.y).toFixed(1) : null;
    }).filter((v) => v != null) : [];
    const spread = lifts.length ? Math.max(...lifts) - Math.min(...lifts) : 0;
    rec.ok('...each on its own bounce, not as one block (their heights differ mid-landing)', spread > 2, { lifts, spread });
    /* v2.3.2772: they tumble a little in the air and lie level once settled */
    const items = (p) => (p ? p.parts.filter((x) => !/beam|rareText/.test(x.kind)) : []);
    const tilted = samples.slice(0, 3).some((p) => items(p).some((x) => Math.abs(x.rot) > 0.05));
    const signs = new Set(samples.slice(0, 3).flatMap((p) => items(p).filter((x) => Math.abs(x.rot) > 0.05).map((x) => Math.sign(x.rot))));
    /* v2.3.2773: spread in a small circle, not stacked in a column */
    const pts = items(settled).filter((x) => x.kind !== 'remnantOrCoin');
    const xs = pts.map((x) => x.x), yv = pts.map((x) => x.y);
    const xSpan = xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
    const ySpan = yv.length ? Math.max(...yv) - Math.min(...yv) : 0;
    const dists = pts.map((x) => Math.hypot(x.x - settled.parts[0].x, (x.y - settled.parts[0].y) / 0.55));
    rec.ok('the items spread out around the pile, not in a vertical line', xSpan > 20 && ySpan > 6, { xSpan, ySpan, pts });
    rec.ok('...within a small circle of it', dists.every((d) => d < 70), { dists });
    const firstPts = items(first).filter((x) => x.kind !== 'remnantOrCoin');
    const firstSpan = firstPts.length ? Math.max(...firstPts.map((x) => x.x)) - Math.min(...firstPts.map((x) => x.x)) : 0;
    rec.ok('...thrown out from the middle as they land (tighter at first)', firstSpan < xSpan, { firstSpan, xSpan });
    rec.ok('the items tilt while they bounce', tilted, samples.slice(0, 3).map((p) => items(p).map((x) => x.rot)));
    rec.ok('...and lie level once settled', items(settled).every((x) => x.rot === 0), items(settled).map((x) => x.rot));
    rec.ok('...not all leaning the same way', signs.size === 2 || items(samples[1]).length < 3, [...signs]);
    /* draw order is drop rate */
    const z = (kind) => (settled.parts.filter((x) => x.kind === kind).map((x) => x.z));
    const rem = z('remnantOrCoin'), coin = z('coin'), shard = z('shard'), icons = z('rareIcon');
    const order = rem.length && coin.length && shard.length && icons.length === 3
      && Math.max(...rem) < Math.min(...coin) && Math.max(...coin) < Math.min(...shard) && Math.max(...shard) < Math.min(...icons);
    rec.ok('rarer draws on top: remains < coin < shard < the rare items', !!order, { rem, coin, shard, icons });
    rec.ok('...and among the rare items, weapon < gem < armour (1 in ~500 on top)',
      icons.length === 3 && icons[0] < icons[1] && icons[1] < icons[2], icons);
    rec.ok('a shine rises from each rare item', settled.parts.filter((x) => x.kind === 'beam').length === 3, settled.parts);
    rec.ok('RARE DROP! is called for the fresh rare pile', !!first.rareShown && samples.some((s) => s && s.rareTextVisible), samples.map((s) => s && s.rareTextVisible));
  }
  await P.page.waitForTimeout(1800);
  const later = pileOf(await rare(P), 'qa-rare');
  rec.ok('...and then it goes (once, not forever)', !!later && !later.rareTextVisible, later);

  /* ── 2. a fresh ordinary pile ── */
  await drop(P, { lootId: 'qa-plain', coins: 5, skull: 'fodder' }, -110);
  await P.page.waitForTimeout(60);
  const pl0 = pileOf(await rare(P), 'qa-plain');
  await P.page.waitForTimeout(1400);
  const pl1 = pileOf(await rare(P), 'qa-plain');
  const plMoved = pl0 && pl1 && pl0.parts.some((x) => { const s = pl1.parts.find((y) => y.kind === x.kind); return s && x.y < s.y - 3; });
  rec.ok('an ordinary pile bounces too', !!plMoved, { pl0, pl1 });
  rec.ok('...and does not call RARE DROP!', !!pl1 && !pl1.rareShown && !pl1.rareTextVisible, pl1);

  /* ── 3. an old rare pile, as synced on entering a zone ── */
  await drop(P, { lootId: 'qa-old', coins: 3, skull: 'fodder', gem: 'rare_gem' }, 190, 10000);
  await P.page.waitForTimeout(60);
  const o0 = pileOf(await rare(P), 'qa-old');
  await P.page.waitForTimeout(500);
  const o1 = pileOf(await rare(P), 'qa-old');
  const oMoved = o0 && o1 && o0.parts.some((x) => { const s = o1.parts.find((y) => y.kind === x.kind && y.z === x.z); return s && Math.abs(x.y - s.y) > 3.5; });
  rec.ok('an old pile (zone-entry sync) lies still -- no landing bounce', !oMoved, { o0, o1 });
  rec.ok('...and does not announce itself', !!o1 && !o1.rareTextVisible, o1);
  rec.ok('...but its rare item still shines', !!o1 && o1.parts.some((x) => x.kind === 'beam'), o1);
  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/lootland-settled.png` }).catch(() => {});
  await P.ctx.close().catch(() => {});
}
