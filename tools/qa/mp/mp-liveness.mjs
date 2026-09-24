/* ═══ THE WORLD'S SMALL MOTIONS, AND THE BAG'S  (v2.3.2811-2816) ═══
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
 *                  exactly where it was cut from, and nothing moves; the
 *                  pieces sort a quarter step after their building and take
 *                  its form shade at their height (v2.3.2816);
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

/* Wait for n drawn frames. */
const frames = (P, n) => P.page.evaluate((n) => new Promise((res) => {
  let k = 0;
  const f = () => (++k >= n ? res() : requestAnimationFrame(f));
  requestAnimationFrame(f);
}), n);

/* Hide every piece of interface over the canvas (and bring it back), so a
   dialogue or a tip cannot sit over what a pixel check reads. */
const hideUi = (P, on) => P.page.evaluate((on) => {
  const cv = document.querySelector('canvas');
  for (const el of document.body.querySelectorAll('*')) {
    if (el === cv || el.contains(cv)) continue;
    if (on) { if (el.dataset.qaHid == null) { el.dataset.qaHid = el.style.visibility || ''; el.style.visibility = 'hidden'; } }
    else if (el.dataset.qaHid != null) { el.style.visibility = el.dataset.qaHid; delete el.dataset.qaHid; }
  }
}, on);

/* Until the camera has stopped easing: a frame that slides by a fraction of a
   pixel between two shots moves every edge in them. */
async function settle(P) {
  let last = null;
  for (let i = 0, still = 0; i < 40 && still < 3; i++) {
    await frames(P, 1);
    const c = await P.page.evaluate(() => { const S = window._gameState.current; return S.camera.x.toFixed(2) + ',' + S.camera.y.toFixed(2); });
    still = c === last ? still + 1 : 0;
    last = c;
  }
}

/* v2.3.2816: does each cut piece take its building's form shade?  formShade.js
   darkens every building toward its base; a piece drawn unshaded over it reads
   as a light patch on a darker wall.  Measured on the page, not assumed: the
   same calm frame with the shade on and off (window.__btShadeOff), the piece's
   own pixels found by hiding it and seeing what changes, and the on/off ratio
   over those pixels (red, the channel the shade moves most) compared with the
   gradient's value at the piece's rows -- SHADE.prop: 1.0 at the building's
   top, 0.64 at its base.  The median, so a stray edge cannot move it.  A piece
   the camera does not show whole is brought on screen first (the player steps
   toward it), and one whose pixels still cannot be read is reported, never
   passed. */
async function shadeOfPieces(P, id, home) {
  const out = [];
  const rectsNow = () => P.page.evaluate((id) => (window.__btWorldLifeRects ? window.__btWorldLifeRects(id) : null), id);
  const first = await rectsNow();
  if (!first) return null;
  let away = false;
  for (const { id: partId } of first.parts) {
    if (away) {
      await H.hopTo(P, home.x, home.y);
      await P.page.waitForTimeout(1200);
      away = false;
    }
    await H.closeNpcDialogue(P).catch(() => {});
    let rects = await rectsNow();
    let part = rects && rects.parts.find((q) => q.id === partId);
    if (!part) { out.push({ id: partId, unread: 'no rider' }); continue; }
    const inView = (b) => b.x >= 0 && b.y >= 0 && b.x + b.w <= PHONE.width && b.y + b.h <= PHONE.height;
    if (!inView(part.box)) {
      away = true;
      const k = await P.page.evaluate(() => window._gameState.current._worldScaleX || 1);
      const cx = part.box.x + part.box.w / 2, cy = part.box.y + part.box.h / 2;
      await H.hopTo(P, home.x + (cx - PHONE.width / 2) / k, home.y + (cy - PHONE.height / 2) / k);
      await H.closeNpcDialogue(P).catch(() => {});
      await P.page.waitForTimeout(1200);
      rects = await rectsNow();
      part = rects && rects.parts.find((q) => q.id === partId);
      if (!part) { out.push({ id: partId, unread: 'no rider after the step' }); continue; }
    }
    const hb = rects.host, b = part.box;
    const x0 = Math.max(0, Math.floor(b.x) - 2), y0 = Math.max(0, Math.floor(b.y) - 2);
    const x1 = Math.min(PHONE.width, Math.ceil(b.x + b.w) + 2), y1 = Math.min(PHONE.height, Math.ceil(b.y + b.h) + 2);
    if (x1 - x0 < 4 || y1 - y0 < 4) { out.push({ id: partId, unread: 'off screen', box: b }); continue; }
    const clip = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
    await hideUi(P, true);
    await settle(P);
    const on = await H.screenshotPixels(P, clip);
    await P.page.evaluate(([i, q]) => window.__btWorldLifeHide(i, q, true), [id, partId]);
    await frames(P, 3);
    const gone = await H.screenshotPixels(P, clip);
    await P.page.evaluate(([i, q]) => window.__btWorldLifeHide(i, q, false), [id, partId]);
    await P.page.evaluate(() => { window.__btShadeOff = true; });
    await frames(P, 3);
    const off = await H.screenshotPixels(P, clip);
    await P.page.evaluate(() => { window.__btShadeOff = false; });
    await frames(P, 2);
    await hideUi(P, false);
    const k = on.width / clip.width;
    const ratios = [];
    let rowSum = 0, piece = 0;
    for (let y = 0; y < on.height; y++) {
      for (let x = 0; x < on.width; x++) {
        const a = on.at(x, y), g = gone.at(x, y), f = off.at(x, y);
        if (Math.abs(a[0] - g[0]) + Math.abs(a[1] - g[1]) + Math.abs(a[2] - g[2]) < 30) continue;   /* not the piece */
        piece++;
        if (f[0] < 60) continue;                                                                       /* too dark to read */
        ratios.push(a[0] / f[0]);
        rowSum += clip.y + y / k;
      }
    }
    const area = b.w * b.h * k * k;
    if (ratios.length < 40 || piece < 0.12 * area) { out.push({ id: partId, unread: 'too few of its pixels', piece, used: ratios.length, area: Math.round(area) }); continue; }
    ratios.sort((p, q) => p - q);
    const t = Math.max(0, Math.min(1, (rowSum / ratios.length - hb.y) / hb.h));
    out.push({ id: partId, kind: part.kind, pixels: ratios.length, ratio: +ratios[ratios.length >> 1].toFixed(3),
      want: +(1 - 0.36 * t).toFixed(3), t: +t.toFixed(2) });
  }
  return out;
}

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
  /* The page hangs itself up after two minutes with no REAL input (v2.3.1913,
     BroTown IDLE_LOGOUT_MS), and this run drives everything through
     page.evaluate -- so past two minutes the grants below stopped reaching
     it, and the bag read as empty.  A real keystroke on a loop, as mp-hitreal
     does: Shift, which is input to the window and nothing in the game. */
  let awake = true;
  (async () => {
    while (awake && !P.page.isClosed()) {
      await P.page.keyboard.press('Shift').catch(() => {});
      for (let i = 0; i < 40 && awake; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();

  const pieces = {};
  for (const id of Object.keys(PROP_PARTS)) pieces[id] = PROP_PARTS[id].parts.filter((q) => q.kind !== 'erase').map((q) => q.id);

  /* ═══ AT REST ═══ */
  let pr0 = await life(P);
  rec.ok('setup: the world-life probe is published', !!pr0, pr0);
  if (!pr0) { awake = false; await P.ctx.close().catch(() => {}); return; }
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
    /* v2.3.2816: ...and sort a QUARTER step after it, so a figure the depth
       pass raises over the building (+0.5) is drawn over its pieces too
       (TRAPS §115; the arithmetic is pinned in server/test/ridersort) */
    rec.ok(`${id}: its pieces sort a quarter step after the building (under a figure raised over it)`,
      !!rider && rider.dz === 0.25, rider);
    /* v2.3.2816: ...and take the building's form shade at their height */
    const home = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    const shade = await shadeOfPieces(P, id, home);
    rec.ok(`${id}: every piece takes the building's form shade at its own height (shade on/off over its pixels)`,
      !!shade && shade.length === pieces[id].length && shade.every((q) => !q.unread && Math.abs(q.ratio - q.want) < 0.04), shade);
    const deep = (shade || []).filter((q) => !q.unread && q.want < 0.95);
    if (deep.length) {
      rec.ok(`${id}: ...so a piece hung low on the wall is visibly darker than its painted colour, like the wall`,
        deep.every((q) => q.ratio < 0.95), deep);
    }
  }
  /* v2.3.2817: the pieces were cut out of the picture the building's shadow
     and its ground line are read from -- so they cast with it (lightfx
     shadows.js _placePieces), and the building reads its base off its WHOLE
     picture: the auction house's edge columns, where its sign and its scales
     hang, are not empty (they read empty off the cut picture, which took the
     sign's long shadow off the cobble -- mp-worldshadow measures that) */
  const cast = await P.page.evaluate(() => {
    const lf = window.__btLightFx && window.__btLightFx.probe();
    const R = window._pixiRenderer;
    const find = (n, l) => { if (n.label === l) return n; for (const c of (n.children || [])) { const f = find(c, l); if (f) return f; } return null; };
    const ah = R && find(R.app.stage, 'prop_auction-house');
    const b = ah && ah._propGround && ah._propGround.bottoms;
    return { lifePieces: lf && lf.shadows ? lf.shadows.lifePieces : null, edges: b ? [+b[0].toFixed(3), +b[b.length - 1].toFixed(3)] : null };
  });
  const allPieces = Object.values(pieces).reduce((n, l) => n + l.length, 0);
  rec.ok(`at rest: every cut piece casts its building's shadow with it (${allPieces} of them)`, cast.lifePieces === allPieces, cast);
  rec.ok('at rest: the auction house reads its base off its whole picture (the sign\'s and the scales\' columns are not empty)',
    !!cast.edges && cast.edges[0] > 0 && cast.edges[1] > 0, cast);
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
  /* what the page looked like, for a failure to say WHY the bag was empty */
  const bagDiag = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const b = document.querySelector('[data-dash-fold]');
    return { fold: b ? b.getAttribute('data-dash-fold') : null, status: S._realtimeStatus, zone: S.currentZone,
      at: S.player ? [Math.round(S.player.x), Math.round(S.player.y)] : null,
      inv: Object.keys((S.rpg && S.rpg.inventory) || {}).slice(0, 12) };
  }).catch((e) => ({ err: e.message }));
  rec.ok('bag: each item comes alive its own way -- the fish flops, the gem glints, the draught sloshes, the log lies still',
    kinds['i-fish_minnow'] === 'flop' && kinds['i-rare_gem'] === 'glint' && kinds['i-swiftDraught'] === 'slosh' && kinds['i-wood_oak'] === null,
    { kinds, page: bagDiag });

  /* true once the attribute is seen on the live tile; on a timeout, what the
     page looked like instead (so a miss says whether the item landed, whether
     bagLife played anything, and whether the tile was there) */
  const watchAttr = (key, attr, ms = 2500) => P.page.evaluate(({ key, attr, ms }) => new Promise((res) => {
    const t0 = performance.now();
    const inv = () => { const r = window._gameState.current.rpg; return r && r.inventory ? { ...r.inventory } : null; };
    const s0 = window.__btBagLife ? window.__btBagLife.stats() : null, i0 = inv();
    const tick = () => {
      const el = document.querySelector('[data-bag-key="' + key + '"]');
      if (el && el.getAttribute(attr) != null) return res(true);
      if (performance.now() - t0 > ms) {
        const s1 = window.__btBagLife ? window.__btBagLife.stats() : null;
        return res({ timeout: ms, tile: !!el, before: s0 && { arrive: s0.arrive, bump: s0.bump }, after: s1 && { arrive: s1.arrive, bump: s1.bump },
          had: i0 && i0[key.slice(2)], has: (inv() || {})[key.slice(2)], status: window._gameState.current._realtimeStatus });
      }
      requestAnimationFrame(tick);
    };
    tick();
  }), { key, attr, ms });
  const arrive = watchAttr('i-ore_copper', 'data-life-new', 6000);
  await H.grant(wsPort, pid, 'item', { invKey: 'ore_copper', count: 1 }).catch(() => {});
  const arrived = await arrive;
  rec.ok('bag: a NEW item pops into its slot', arrived === true, arrived);
  await P.page.waitForTimeout(900);
  const bump = watchAttr('i-fish_minnow', 'data-life-bump', 6000);
  await H.grant(wsPort, pid, 'item', { invKey: 'fish_minnow', count: 1 }).catch(() => {});
  const bumped = await bump;
  rec.ok('bag: a stack that grows bumps its count', bumped === true, bumped);

  /* the tile's own box never moves while its art does -- asked once the bump
     above has finished, or its hop is the animation on the art */
  const box = await P.page.evaluate(async () => {
    /* v2.3.2816: the bump can REPLAY on the tile the item moved to (bagLife
       playOnItem follows it for ~0.7 s), so let that window pass, and ask
       the tile the item is on NOW each time, not the one it was on */
    const q = () => document.querySelector('[data-bag-key="i-fish_minnow"]');
    await new Promise((r) => setTimeout(r, 900));
    for (let i = 0; i < 40; i++) {
      const c = q();
      if (c && c.getAttribute('data-life-bump') == null && c.getAttribute('data-life-now') == null) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    const t = q();
    if (!t) return null;
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
  for (const want of ['canopy:fg-canopy-sw']) {   /* v2.3.2877: frost's pines and shrubs are gone (three snowbanks) */
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

  awake = false;
  await P.ctx.close().catch(() => {});
}
