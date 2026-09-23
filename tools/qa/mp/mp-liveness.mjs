/* ═══ THE WORLD'S SMALL MOTIONS, AND THE BAG'S  (v2.3.2751-2755) ═══
 *
 * Owner: "I'm looking for a liveness pass.  Basically making things move a
 * little in a way that makes sense for whatever object it is.  Maybe a tree
 * swaying a bit, etc. this includes items in the player inventory and the
 * inventory itself."
 *
 * What moves is described in src/rendering/worldLife.js (the world) and
 * src/ui/mobile/dash/bagLife.js (the bag).  This asks a real client, against
 * a real worker, that
 *
 *   AT REST        with the harness's calm switch on (every other scenario
 *                  runs that way), each building still wears every piece that
 *                  was cut out of it -- sign, banner, scales, crate, flags --
 *                  exactly where it was cut from, and nothing moves;
 *   BUILDINGS      with it off, the signs swing, the flags wave, the forge
 *                  smokes, the flames flicker, the mayor's water runs and the
 *                  bank's gold glints -- each riding the depth layer of the
 *                  building it belongs to;
 *   PEOPLE         an NPC standing still breathes, and stops when calm;
 *   FROST          the pines, the shrubs and the near-camera canopy sway; a
 *                  tree sways about its own foot, which never moves; the
 *                  canopy turns about the edge it hangs from; a chop shakes
 *                  the tree and drops needles; the ore glints;
 *   THE BAG        each item is given the motion that suits it, a new one pops
 *                  into its slot, a growing stack bumps, one tile at a time
 *                  comes alive, a tile's box never moves while it does, and
 *                  it all goes quiet under the calm switch AND under the OS's
 *                  reduced-motion setting;
 *   THE PURSE      gold landing spins the coin.
 *
 * Screenshots: out/liveness-*.png.
 */
import * as H from './harness.mjs';
import { PROP_PARTS } from '../../../src/data/propParts.js';

const PHONE = { width: 390, height: 844 };
const OUT = `${H.REPO}/tools/qa/mp/out`;

const life = (P) => P.page.evaluate(() => (window.__btWorldLife ? window.__btWorldLife() : null));
const setCalm = (P, on) => P.page.evaluate((on) => { window.__btAmbienceOff = on; }, on);

/* Sample the probe `n` times, `gap` ms apart. */
async function samples(P, n, gap) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const pr = await life(P);
    if (pr) out.push(pr);
    await P.page.waitForTimeout(gap);
  }
  return out;
}
const spread = (vals) => (vals.length ? Math.max(...vals) - Math.min(...vals) : 0);

/* Stand south of a building, close enough that it is on camera. */
async function visit(P, props, id, dy = -200) {
  const p = props.find((q) => q.id === id);
  if (!p) return null;
  await H.hopTo(P, p.x, p.y + dy);
  await P.page.waitForTimeout(1600);
  return p;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Breeze', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);
  const pid = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'vitals', pid, { heal: true, god: true, godMinutes: 20 }).catch(() => null);
  const props = await P.page.evaluate(() => (window.__btWorldProps ? window.__btWorldProps() : []));

  const pieces = {};
  for (const id of Object.keys(PROP_PARTS)) pieces[id] = PROP_PARTS[id].parts.filter((q) => q.kind !== 'erase').map((q) => q.id);

  /* ═══ AT REST ═══ */
  let pr0 = await life(P);
  rec.ok('setup: the world-life probe is published', !!pr0, pr0);
  if (!pr0) { await P.ctx.close().catch(() => {}); return; }
  rec.ok('at rest: the harness\'s calm switch is what this reads', pr0.calm === true, { calm: pr0.calm });

  const restParts = {};
  for (const id of Object.keys(pieces)) {
    await visit(P, props, id);
    const pr = await life(P);
    restParts[id] = pr.parts.filter((q) => q.prop === id);
    const got = restParts[id].map((q) => q.id).sort();
    rec.ok(`at rest: ${id} wears every piece cut from it (${pieces[id].join(', ')})`,
      JSON.stringify(got) === JSON.stringify(pieces[id].slice().sort()), { got, want: pieces[id] });
    rec.ok(`at rest: ${id}'s pieces hang exactly where they were cut from -- no swing, no wave`,
      restParts[id].every((q) => (q.kind === 'swing' ? q.deg === 0 : q.amp === 0)), restParts[id]);
    const rider = pr.riders.find((r) => r.id === id);
    rec.ok(`${id}: its pieces ride the building's own depth layer, one pixel south of its ground line`,
      !!rider && rider.layer === rider.hostLayer && rider.dy === 1, rider);
  }
  pr0 = await life(P);
  rec.ok('at rest: no smoke, sparks, glints or running water', pr0.smoke + pr0.sparks + pr0.glints + pr0.streaks === 0,
    { smoke: pr0.smoke, sparks: pr0.sparks, glints: pr0.glints, streaks: pr0.streaks });
  rec.ok('at rest: nobody is breathing', pr0.breathing.every((b) => b.who !== 'npc' || b.sy === 1), pr0.breathing);
  await P.page.screenshot({ path: `${OUT}/liveness-rest-town.png` }).catch(() => {});

  /* ═══ BUILDINGS, LIVE ═══ */
  await setCalm(P, false);
  const swing = {}, flagDy = {};
  let smoke = 0, sparks = 0, streaks = 0, glints = 0, glows = 0, breathed = null;
  for (const id of ['forge', 'auction-house', 'bank', 'mayor-house']) {
    await visit(P, props, id);
    for (const pr of await samples(P, 14, 220)) {
      for (const q of pr.parts) {
        if (q.prop !== id) continue;
        const k = id + '/' + q.id;
        if (q.kind === 'swing') (swing[k] = swing[k] || []).push(q.deg);
        else (flagDy[k] = flagDy[k] || []).push(q.tipDy);
      }
      smoke = Math.max(smoke, id === 'forge' ? pr.smoke : 0);
      sparks = Math.max(sparks, pr.sparks);
      glows = Math.max(glows, pr.glows);
      if (id === 'mayor-house') streaks = Math.max(streaks, pr.streaks);
      if (id === 'bank') glints = Math.max(glints, pr.glints);
      const b = pr.breathing.find((x) => x.who === 'npc' && x.k > 0.5 && x.sy !== 1);
      if (b) breathed = b;
    }
    if (id === 'forge' || id === 'mayor-house') await P.page.screenshot({ path: `${OUT}/liveness-${id}.png` }).catch(() => {});
  }
  for (const k of Object.keys(swing)) {
    rec.ok(`live: ${k} swings on its chain (a spread of angles, and a gentle one)`,
      spread(swing[k]) > 0.05 && Math.max(...swing[k].map(Math.abs)) < 6, { spread: +spread(swing[k]).toFixed(3), max: Math.max(...swing[k].map(Math.abs)) });
  }
  for (const k of Object.keys(flagDy)) {
    rec.ok(`live: ${k} waves (its free end rises and falls)`, spread(flagDy[k]) > 0.3, { spread: +spread(flagDy[k]).toFixed(2) });
  }
  rec.ok('live: every cut piece moves (the swing and wave lists cover all ten)',
    Object.keys(swing).length + Object.keys(flagDy).length === Object.values(pieces).flat().length,
    { swing: Object.keys(swing), flags: Object.keys(flagDy) });
  rec.ok('live: the forge smokes from its chimney', smoke >= 3, { smoke });
  rec.ok('live: flames throw sparks', sparks >= 1, { sparks });
  rec.ok('live: the flames and lamps flicker by day', glows >= 4, { glows });
  rec.ok('live: the mayor\'s waterfalls run', streaks >= 6, { streaks });
  rec.ok('live: the bank\'s gold catches the light', glints >= 1, { glints });
  rec.ok('live: an NPC standing still breathes', !!breathed, breathed);

  /* ...and calm puts it all back at rest */
  await setCalm(P, true);
  await P.page.waitForTimeout(1500);
  const prc = await life(P);
  rec.ok('calm again: every piece back at rest, every effect gone, nobody breathing',
    prc.parts.every((q) => (q.kind === 'swing' ? q.deg === 0 : q.amp === 0))
      && prc.smoke + prc.sparks + prc.glints + prc.streaks === 0
      && prc.breathing.every((b) => b.who !== 'npc' || b.sy === 1),
    { parts: prc.parts, smoke: prc.smoke, sparks: prc.sparks, glints: prc.glints, streaks: prc.streaks, breathing: prc.breathing });

  /* ═══ THE BAG ═══ */
  /* walking past Mayor Bro opens his dialogue, which covers the band */
  await H.closeNpcDialogue(P).catch(() => {});
  await H.hopTo(P, H.TOWN_CLEAN_SPOT.x, H.TOWN_CLEAN_SPOT.y);
  await H.closeNpcDialogue(P).catch(() => {});
  await H.unfoldBand(P).catch(() => {});
  await setCalm(P, false);
  for (const k of ['fish_minnow', 'rare_gem', 'swiftDraught', 'wood_oak']) {
    await H.grant(wsPort, pid, 'item', { invKey: k, count: 2 }).catch(() => {});
  }
  await H.waitFor(P, (S) => (S.rpg && S.rpg.inventory && S.rpg.inventory.wood_oak) || 0, (n) => n >= 2, { timeout: 15000, label: 'the grants land' }).catch(() => {});
  await P.page.waitForTimeout(900);
  const kinds = await P.page.evaluate(() => {
    const o = {};
    for (const t of document.querySelectorAll('[data-bag-key]')) {
      const a = t.querySelector('.bt-bag-art');
      o[t.getAttribute('data-bag-key')] = a ? a.getAttribute('data-life') : 'no-art';
    }
    return o;
  });
  rec.ok('bag: each item comes alive its own way -- the fish flops, the gem glints, the draught sloshes, the log lies still',
    kinds['i-fish_minnow'] === 'flop' && kinds['i-rare_gem'] === 'glint' && kinds['i-swiftDraught'] === 'slosh' && kinds['i-wood_oak'] === null,
    kinds);

  const watchAttr = (key, attr, ms = 2500) => P.page.evaluate(({ key, attr, ms }) => new Promise((res) => {
    const t0 = performance.now();
    const tick = () => {
      const el = document.querySelector('[data-bag-key="' + key + '"]');
      if (el && el.getAttribute(attr) != null) return res(true);
      if (performance.now() - t0 > ms) return res(false);
      requestAnimationFrame(tick);
    };
    tick();
  }), { key, attr, ms });
  const arrive = watchAttr('i-ore_copper', 'data-life-new', 4000);
  await H.grant(wsPort, pid, 'item', { invKey: 'ore_copper', count: 1 }).catch(() => {});
  rec.ok('bag: a NEW item pops into its slot', await arrive, {});
  await P.page.waitForTimeout(900);
  const bump = watchAttr('i-fish_minnow', 'data-life-bump', 4000);
  await H.grant(wsPort, pid, 'item', { invKey: 'fish_minnow', count: 1 }).catch(() => {});
  rec.ok('bag: a stack that grows bumps its count', await bump, {});

  /* the tile's own box never moves while its art does -- asked once the bump
     above has finished, or its hop is the animation on the art */
  const box = await P.page.evaluate(async () => {
    const t = document.querySelector('[data-bag-key="i-fish_minnow"]');
    if (!t) return null;
    for (let i = 0; i < 40 && (t.getAttribute('data-life-bump') != null || t.getAttribute('data-life-now') != null); i++) {
      await new Promise((r) => setTimeout(r, 50));
    }
    const r0 = t.getBoundingClientRect();
    window.__btBagLife.poke('i-fish_minnow', 'flop');
    await new Promise((r) => setTimeout(r, 180));
    const r1 = t.getBoundingClientRect();
    const a = t.querySelector('.bt-bag-art');
    return { r0: [r0.left, r0.top, r0.width, r0.height], r1: [r1.left, r1.top, r1.width, r1.height],
      artAnim: a ? getComputedStyle(a).animationName : null };
  });
  rec.ok('bag: while an item moves, its TILE stays exactly where it is (the art moves, the box does not)',
    !!box && JSON.stringify(box.r0) === JSON.stringify(box.r1) && box.artAnim === 'bt-life-flop', box);

  const st0 = await P.page.evaluate(() => window.__btBagLife.stats());
  await P.page.waitForTimeout(7000);
  const st1 = await P.page.evaluate(() => window.__btBagLife.stats());
  rec.ok('bag: one tile at a time comes alive on its own, every couple of seconds', st1.idle - st0.idle >= 2, { before: st0.idle, after: st1.idle });
  await P.page.screenshot({ path: `${OUT}/liveness-bag.png` }).catch(() => {});

  /* the purse */
  const flip = P.page.evaluate(() => new Promise((res) => {
    const t0 = performance.now();
    const tick = () => {
      if (document.querySelector('.bt-zone-header__balance img.bt-purse-flip')) return res(true);
      if (performance.now() - t0 > 4000) return res(false);
      requestAnimationFrame(tick);
    };
    tick();
  }));
  await H.grant(wsPort, pid, 'gold', { amount: 25 }).catch(() => {});
  rec.ok('purse: gold landing spins the coin', await flip, {});

  /* quiet: the calm switch, then the OS setting */
  await setCalm(P, true);
  await P.page.waitForTimeout(3200);
  const calmNow = await P.page.evaluate(() => ({ cls: document.documentElement.classList.contains('bt-calm'), s: window.__btBagLife.stats() }));
  await P.page.waitForTimeout(5000);
  const calmLater = await P.page.evaluate(() => window.__btBagLife.stats());
  rec.ok('bag: the calm switch stills it (html.bt-calm, and no tile moves)',
    calmNow.cls && calmLater.idle === calmNow.s.idle, { cls: calmNow.cls, before: calmNow.s.idle, after: calmLater.idle });
  await setCalm(P, false);
  await P.page.emulateMedia({ reducedMotion: 'reduce' });
  await P.page.waitForTimeout(2800);
  const rm0 = await P.page.evaluate(() => window.__btBagLife.stats());
  /* a new item still arrives -- as a plain fade, which the spec allows */
  const rmArrive = P.page.evaluate(() => new Promise((res) => {
    const t0 = performance.now();
    const tick = () => {
      const el = document.querySelector('[data-bag-key="i-wood_pine_log"][data-life-new]');
      if (el) { const a = el.querySelector('.bt-bag-art'); return res(a ? getComputedStyle(a).animationName : 'no-art'); }
      if (performance.now() - t0 > 4000) return res(null);
      requestAnimationFrame(tick);
    };
    tick();
  }));
  await H.grant(wsPort, pid, 'item', { invKey: 'wood_pine_log', count: 1 }).catch(() => {});
  const rmAnim = await rmArrive;
  await P.page.waitForTimeout(4500);
  const rm1 = await P.page.evaluate(() => window.__btBagLife.stats());
  rec.ok('bag: under the OS\'s reduced-motion setting nothing moves by itself...',
    rm1.calm === true && rm1.idle === rm0.idle, { calm: rm1.calm, before: rm0.idle, after: rm1.idle });
  rec.ok('bag: ...and a new item FADES in rather than popping', rmAnim === 'bt-life-fade', { animation: rmAnim });
  await P.page.emulateMedia({ reducedMotion: null });
  await setCalm(P, true);

  /* ═══ FROST ═══ */
  for (const tool of ['woodcutting_axe', 'mining_pickaxe']) await H.grant(wsPort, pid, 'item', { invKey: tool, count: 1 }).catch(() => {});
  await H.warpToZone(P, { wsPort, label: 'Frost Ridge', zoneId: 'frost' });
  await H.devOp(wsPort, 'vitals', pid, { heal: true, god: true, godMinutes: 20 }).catch(() => null);
  await setCalm(P, false);
  const nodes = await H.readState(P, (S) => (S.gatherNodes || []).filter((n) => n.alive).map((n) => ({ id: n.id, t: n.nodeType, x: n.x, y: n.y })));
  const sway = {};
  const hang = [];
  for (const spot of [{ x: 360, y: 760 }, { x: 200, y: 880 }, { x: 700, y: 760 }]) {
    await H.hopTo(P, spot.x, spot.y);
    await P.page.waitForTimeout(1200);
    for (const pr of await samples(P, 12, 220)) {
      for (const q of pr.sway) {
        (sway[q.kind + ':' + q.id] = sway[q.kind + ':' + q.id] || []).push(q);
        if (q.kind === 'canopy') hang.push(q.hangErr);
      }
    }
  }
  for (const want of ['pine:frost-pine-pair', 'shrub:frost-snow-shrubs', 'canopy:fg-canopy-sw']) {
    const v = (sway[want] || []).map((q) => q.deg);
    rec.ok(`frost: ${want} sways, gently`, v.length > 3 && spread(v) > 0.05 && Math.max(...v.map(Math.abs)) < 5,
      { n: v.length, spread: +spread(v).toFixed(3), max: v.length ? Math.max(...v.map(Math.abs)) : null });
  }
  rec.ok('frost: the canopy turns about the edge it hangs from (the cut stays off the map)',
    hang.length > 0 && Math.max(...hang) < 0.01, { max: hang.length ? Math.max(...hang) : null });

  const tree = nodes.find((n) => n.t === 'tree');
  if (!tree) {
    rec.skip('frost: a gather tree sways and takes a chop', 'no live tree node in frost this run');
  } else {
    await H.hopTo(P, tree.x + 110, tree.y + 40);
    await P.page.waitForTimeout(1500);
    const before = (await samples(P, 10, 200)).map((pr) => pr.sway.find((q) => q.kind === 'tree' && q.id === String(tree.id))).filter(Boolean);
    rec.ok('frost: the gather tree sways', before.length > 3 && spread(before.map((q) => q.deg)) > 0.05,
      { n: before.length, spread: +spread(before.map((q) => q.deg)).toFixed(3) });
    rec.ok('frost: ...about its own foot, which never moves (depth, hit-tests and footprints read it)',
      before.length > 0 && before.every((q) => q.footDy === 0), before.map((q) => q.footDy));
    /* the strike frame's stamp, as effectsRenderer writes it (+200 ms lands
       it with the bite of the axe; here it lands now) */
    await P.page.evaluate((id) => {
      const n = window._gameState.current.gatherNodes.find((q) => q.id === id);
      if (n) { n._lifeChopAt = Date.now() + 30; n._lifeChopDir = 1; }
    }, tree.id);
    let shook = 0, needles = 0;
    for (const pr of await samples(P, 10, 90)) {
      const q = pr.sway.find((x) => x.kind === 'tree' && x.id === String(tree.id));
      if (q) shook = Math.max(shook, q.shiver);
      needles = Math.max(needles, pr.needles);
    }
    rec.ok('frost: a chop shivers the trunk and shakes needles loose', shook > 0 && needles > 0, { shook, needles });
  }
  const ore = nodes.find((n) => n.t === 'oreVein');
  if (!ore) {
    rec.skip('frost: the ore glints', 'no live ore vein in frost this run');
  } else {
    await H.hopTo(P, ore.x + 90, ore.y + 30);
    await P.page.waitForTimeout(1200);
    let og = 0;
    for (const pr of await samples(P, 30, 200)) og = Math.max(og, pr.oreGlints);
    rec.ok('frost: the ore glints now and then', og > 0, { og });
  }
  await P.page.screenshot({ path: `${OUT}/liveness-frost.png` }).catch(() => {});

  await P.ctx.close().catch(() => {});
}
