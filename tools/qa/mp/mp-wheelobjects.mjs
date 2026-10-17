/* ═══ THE WHEEL'S OBJECTS, WALKED (v2.3.2975) ═══
 *
 * Owner, 2026-10-02, with a zip of every object but the Town Hall: "Wire
 * this stuff into the game.  Put mayor bro in town too."  (v2.3.2976: and
 * then the Town Hall: "Town hall should be there but here it is again" --
 * it stands in the square now, so the arrival asks for it.)
 *
 * On a phone viewport, against a real worker, in `?trial=wheel`:
 *   1. the way in places every object (public/tools/world/core/placing.js)
 *      and loads the sprite sheets round the arrival before the overlay
 *      lifts: the town is standing when you get there;
 *   2. round the arrival: buildings, lamps and the rest drawn, each its own
 *      sprite on its foot;
 *   3. Mayor Bro stands beside the Town Hall's steps, and answers a tap;
 *   4. a building stops your feet at its porch, walking up to it;
 *   5. walk round behind it and its roof is drawn over you (the depth pass
 *      put it in front of the player);
 *   6. out on Frost Ridge its own trees and rocks are drawn, and the town's
 *      sheets have been let go behind you;
 *   6b. (v2.3.2981) at an oasis in the dunes its palms are drawn standing on
 *      their trunks, leaning in over the water;
 *   7. back in town every sheet is let go;
 *   8. no page errors.
 * Pictures in tools/qa/mp/out/wheelobjects-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
/* v2.3.2978: the Wheel is its own zone, 'wheel', against a worker that runs
   its monsters (server/src/wheelzone.js) -- 'worldview' against an older one */
const WHEELISH = (z) => z === 'worldview' || z === 'wheel';

const PHONE = { width: 390, height: 844 };
const FROST = (await H.wheelGeom()).along('frost', 2);   /* the north-west spoke, Frost Ridge's second stretch (v2.3.3311: at either size) */

const holdTitle = (P, ms) => P.page.evaluate(async (hold) => {
  const el = document.querySelector('.bt-zone-header__title');
  if (!el) return 'no title element';
  const r = el.getBoundingClientRect();
  const opts = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, pointerType: 'touch' };
  el.dispatchEvent(new PointerEvent('pointerdown', opts));
  await new Promise((res) => setTimeout(res, hold));
  el.dispatchEvent(new PointerEvent('pointerup', opts));
  return 'ok';
}, ms);
const panelUp = (P) => P.page.evaluate(() => !!Array.from(document.querySelectorAll('strong')).find((n) => n.textContent === 'Test panel'));
const tap = (P, text) => P.page.evaluate((t) => {
  const b = Array.from(document.querySelectorAll('button')).find((n) => (n.textContent || '').indexOf(t) >= 0);
  if (!b) return false;
  b.click();
  return true;
}, text);
const waitZone = async (P, want, n = 60, gap = 1000) => {
  let zone = null;
  for (let i = 0; i < n; i++) {
    zone = await H.readState(P, (S) => S.currentZone);
    if ((typeof want === 'function' ? want(zone) : zone === want) && !(await H.readState(P, (S) => !!S._zoneLoading))) return zone;
    await P.page.waitForTimeout(gap);
  }
  return zone;
};
/* the player's FEET (S.player is the body's centre) */
const feet = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, g = window.__btPlayerGround ? window.__btPlayerGround() : null;
  return { x: S.player.x, y: S.player.y, fx: g ? g.x : NaN, fy: g ? g.y : NaN };
});

/* the render loop's first throw, whole (the harness keeps 200 characters) */
let firstThrow = null, phase = 'start';
const renderThrew = () => firstThrow;
export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `wheelobjects-${name}.png`) });
  const { TOWN_EXITS } = await import(H.REPO + '/src/data/effects.js');

  const P = await H.newPlayer(browser, { name: 'Surveyor', wsPort, webPort, viewport: PHONE, touch: true, query: 'trial=wheel' });
  P.page.on('console', (m) => { if (!firstThrow && /app\.render threw/.test(m.text())) firstThrow = '[during: ' + phase + '] ' + m.text(); });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  /* setup: the Mayor gate stands between town and the World View */
  if (!(await panelUp(P))) { await holdTitle(P, 1500); await P.page.waitForTimeout(900); }
  await P.page.evaluate((k) => {
    const inp = document.querySelector('input[type="password"]');
    if (!inp) return;
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(inp, k);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }, H.ADMIN_KEY);
  await tap(P, 'Save key on this device');
  await P.page.waitForTimeout(1500);
  await tap(P, 'Finish all quests');
  await P.page.waitForTimeout(2000);
  await tap(P, 'Close');
  await P.page.waitForTimeout(600);
  /* v2.3.3283: a real keystroke every 20 s (harness keepAlive): the page logs
     itself out after two minutes without REAL input, and every walk here is
     page.evaluate -- on main the oasis's picture showed "You were away, so
     your character logged out" */
  const stopAlive = H.keepAlive(P);

  phase = 'the way in';
  /* ── 1. the way in ── */
  const door = TOWN_EXITS.find((e) => e.zoneId === 'worldview');
  await H.hopTo(P, door.tx * 32 + 16, (door.ty - 1) * 32 + 16);
  const zone = await waitZone(P, WHEELISH);
  const st0 = await P.page.evaluate(() => ({ ...window.__btWorldTrial.objects() }));
  rec.ok(`on the way in every object is placed (${st0.placed} with pictures, in ${st0.placeMs} ms) and the sheets round the arrival are loaded before the overlay lifts (${st0.pages} of ${st0.pagesOf}, ${st0.warmMs} ms)`,
    WHEELISH(zone) && st0.placed > 8000 && st0.pages >= 4 && st0.warmMs != null && st0.failed === 0, st0);

  phase = 'the town';
  /* ── 2. the town round the arrival ── */
  await P.page.waitForTimeout(1500);
  const town = await P.page.evaluate(() => {
    const S = window._gameState.current, W = window.__btWheelObjects;
    const near = W.near(S.player.x, S.player.y, 900);
    const drawn = near.filter((o) => W.sprite(o.i));
    const onFoot = drawn.every((o) => { const s = W.sprite(o.i); return Math.abs(s.x - o.x) < 0.01 && Math.abs(s.y - o.y) < 0.01 && Math.abs(s.w - o.w) < 1 && Math.abs(s.h - o.h) < 1; });
    return { stats: { ...W.stats }, ids: [...new Set(drawn.map((o) => o.id))].sort(), drawn: drawn.length, onFoot, player: { x: S.player.x, y: S.player.y } };
  });
  rec.ok(`round the arrival the town stands: ${town.drawn} objects drawn -- ${town.ids.join(', ')}`,
    /* (v2.3.2994: the 1.5x town's buildings are bigger and further apart --
       8 things within 900 px of the arrival, where the old town had 10+) */
    town.drawn >= 6 && ['townhall', 'saloon', 'hotel', 'lamp', 'bench'].every((id) => town.ids.includes(id)), town);
  rec.ok('...each its own sprite, on its foot, at its size in game px', town.onFoot, town.stats);
  await shot(P, 'arrival');

  phase = 'mayor';
  /* ── 3. Mayor Bro ── */
  const mayor = await P.page.evaluate(() => {
    const S = window._gameState.current, spot = window.__btWheelObjects.mayor();
    const m = (S.npcs || []).find((n) => n.name === 'Mayor Bro');
    return { spot, m: m ? { x: m.x, y: m.y } : null, others: (S.npcs || []).map((n) => n.name) };
  });
  /* (v2.3.3032: and Diego keeps the General Store now that it has a door --
     mp-wheeldoors looks at him; here only that the town holds its cast.
     v2.3.3283: the cast is the table's, not "the two" -- Ace, Blacksmith Bro
     and Lil Bro came in v2.3.3067 and Beastmaster Bro in v2.3.3121
     (WHEEL_TOWNSFOLK); "exactly Mayor Bro and Diego" failed on main.  Still
     none of today's town's own) */
  const { WHEEL_TOWNSFOLK } = await import(H.REPO + '/src/data/wheelBuildingDoors.js');
  const cast = ['Mayor Bro', ...WHEEL_TOWNSFOLK.map((t) => t.name)];
  rec.ok(`Mayor Bro stands beside the Town Hall's steps (with the Wheel's own cast round town: ${cast.slice(1).join(', ')}, and nobody else)`,
    !!mayor.spot && !!mayor.m && Math.hypot(mayor.m.x - mayor.spot.x, mayor.m.y - mayor.spot.y) < 4
      && mayor.others.length === cast.length && cast.every((n) => mayor.others.includes(n)), { ...mayor, cast });
  if (mayor.m) {
    await H.hopTo(P, mayor.m.x + 10, mayor.m.y + 30, { tries: 30 });
    await P.page.waitForTimeout(1200);
    /* close whatever his proximity opened, then tap him */
    await P.page.keyboard.press('Escape').catch(() => {});
    await tap(P, 'Close');
    await P.page.waitForTimeout(500);
    const at = await P.page.evaluate(() => {
      const S = window._gameState.current, m = (S.npcs || []).find((n) => n.name === 'Mayor Bro');
      const c = document.querySelector('canvas'), r = c.getBoundingClientRect();
      return { x: r.left + (m.x - S.camera.x) * (S._worldScaleX || 1), y: r.top + (m.y - S.camera.y) * (S._worldScaleY || 1) - 26,
        near: S._nearNpc ? S._nearNpc.name : null };
    });
    await P.page.touchscreen.tap(at.x, at.y);
    await P.page.waitForTimeout(700);
    const tapR = await P.page.evaluate(() => window.__btNpcTap || null);
    rec.ok(`...and he is someone: next to him he is the one you would talk to, and a tap on him is answered (${tapR ? tapR.result : 'no tap'})`,
      at.near === 'Mayor Bro' && !!tapR && tapR.npc === 'Mayor Bro' && tapR.result !== 'miss', { at, tapR });
    await P.page.waitForTimeout(400);
    await shot(P, 'mayor');
    await tap(P, 'Close');
    /* v2.3.2976: the Town Hall in the square, Mayor Bro beside its steps,
       from a step back -- the owner's picture */
    await H.hopTo(P, mayor.spot.x - 75, mayor.spot.y + 130, { tries: 30 });
    await P.page.waitForTimeout(900);
    await tap(P, 'Close');
    await shot(P, 'townhall');
  }

  phase = 'porch';
  /* ── 4. a building stops your feet at its porch ── */
  const hotel = await P.page.evaluate(() => {
    const S = window._gameState.current, W = window.__btWheelObjects;
    const o = W.near(S.player.x, S.player.y, 1400).find((q) => q.id === 'hotel');
    const box = (window.__btBlockers(window._gameState.current.currentZone) || []).find((b) => b.id === 'hotel');
    return o ? { o, box } : null;
  });
  let stopped = null;
  if (hotel) {
    const dy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g.y - S.player.y; });
    await H.hopTo(P, hotel.o.x, hotel.o.y + 60 - dy, { tries: 30 });
    await P.page.waitForTimeout(800);
    const box = await P.page.evaluate(() => (window.__btBlockers(window._gameState.current.currentZone) || []).find((b) => b.id === 'hotel') || null);
    await P.page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
    await P.page.keyboard.down('w'); await P.page.waitForTimeout(1600); await P.page.keyboard.up('w');
    await P.page.waitForTimeout(400);
    const f = await feet(P);
    stopped = { box, feet: f, startY: hotel.o.y + 60 };
    rec.ok(`walking up to the Hotel, your feet stop at its porch (feet at ${Math.round(f.fy)}, its front ${box ? Math.round(box.y1) : '?'})`,
      !!box && f.fy >= box.y1 - 3 && f.fy < hotel.o.y + 60 - 10, stopped);
    await shot(P, 'porch');

    phase = 'behind';
    /* ── 5. behind it, its roof over you ── */
    if (box) {
      await H.hopTo(P, hotel.o.x, box.y0 - 30 - dy, { tries: 40 });
      await P.page.waitForTimeout(900);
      const behind = await P.page.evaluate((i) => ({ s: window.__btWheelObjects.sprite(i), g: window.__btPlayerGround() }), hotel.o.i);
      rec.ok('walk round behind it and the depth pass puts the Hotel in front of you: its roof is drawn over you',
        !!behind.s && behind.s.layer === 'gatherNodesFront' && behind.g.y < box.y0, behind);
      await shot(P, 'behind');
      /* and in front again, it goes back under you */
      await H.hopTo(P, hotel.o.x + 160, hotel.o.y + 90 - dy, { tries: 40 });
      await P.page.waitForTimeout(700);
      const front = await P.page.evaluate((i) => window.__btWheelObjects.sprite(i), hotel.o.i);
      rec.ok('...and step out in front of it and it is drawn under you again', !!front && front.layer === 'entities', front);
    }
  } else rec.ok('the Hotel is placed near the arrival', false, null);

  phase = 'frost';
  /* ── 6. Frost Ridge ── */
  /* v2.3.3283: the WORKER keeps the bro alive out there.  FROST is Frost
     Ridge's second stage, where monsters stand since v2.3.3013 (levels
     6-10), and the worker decides HP: on main they killed him on arrival
     (its picture: "Entering Town", the death's trip), and the walk to the
     oasis set off from today's town and never reached the dunes -- "its 0
     palms are drawn". */
  const me = await H.readState(P, (S) => S.myId);
  const god = await H.devOp(wsPort, 'vitals', me, { god: true, godMinutes: 10 }).catch(() => null);
  rec.ok('the worker keeps the bro alive out among the monsters (guard: /dev/vitals god)', !!god && god.ok && !!god.god, god);
  await H.hopTo(P, FROST.x, FROST.y, { tries: 140 });
  await P.page.waitForTimeout(6500);   /* DROP_MS (4 s) and a little */
  const frost = await P.page.evaluate(() => {
    const S = window._gameState.current, W = window.__btWheelObjects;
    const near = W.near(S.player.x, S.player.y, 900).filter((o) => W.sprite(o.i));
    return { ids: [...new Set(near.map((o) => o.id))].sort(), drawn: near.length, pages: W.pagesLoaded(), stats: { ...W.stats } };
  });
  rec.ok(`out on Frost Ridge its own things stand: ${frost.drawn} drawn -- ${frost.ids.join(', ')}`,
    frost.drawn >= 8 && frost.ids.some((id) => id === 'pine' || id === 'birch') && frost.ids.every((id) => !/^(saloon|hotel|bank|lamp)$/.test(id)), frost);
  rec.ok(`...and the town's sprite sheets were let go behind you (in memory: ${frost.pages.join(', ')})`,
    frost.pages.length > 0 && frost.pages.every((n) => !/^buildings-|^town-/.test(n)), frost.pages);
  await shot(P, 'frost');

  phase = 'oasis';
  /* ── 6b. v2.3.2981: an oasis in the dunes -- its palms drawn standing on
     their trunks, leaning in over the water (a palm's trunk is far off its
     picture's middle: the sprite's anchor is its foot, from the manifest) ── */
  {
    /* v2.3.3311: at the Wheel the worker plays -- its objects as baked
       (tools/world/bake-wheel-world.mjs) and a blueprint of the cells round
       each ring of palms, never the whole map, which the long Wheel is far
       too big for (H.wheelGeom) */
    const G = await H.wheelGeom();
    const { readFileSync } = await import('node:fs');
    const { decodePlaced } = await import(H.REPO + '/public/tools/world/core/placedfile.js');
    const { PLACED_SETS } = await import(H.REPO + '/public/tools/world/core/placed.js');
    const { planFingerprint } = await import(H.REPO + '/public/tools/world/core/worldblocks.js');
    const set = PLACED_SETS.find((s) => s.plan === planFingerprint(G.plan));
    const placed = decodePlaced(new Uint8Array(readFileSync(join(H.REPO, 'public/world', set.dir, set.objects))));
    const man = JSON.parse(readFileSync(join(H.REPO, 'public/world/objects/manifest.json'), 'utf8'));
    const palmMan = man.objects.find((o) => o.id === 'palm');
    const share = palmMan.pieces.map((pc) => pc.foot[0] / pc.w);
    /* the pool with the most palms round it, stood south of it: its open side */
    const cell = G.cellG, C = G.C, sky = G.F.regionIds.indexOf('sky'), palm = placed.kinds.indexOf('palm');
    /* the palms in rings (each within 600 px of its ring's middle) */
    const rings = [];
    for (let i = 0; i < placed.n; i++) {
      if (placed.kind[i] !== palm) continue;
      const g = rings.find((q) => Math.hypot(q.sx / q.n - placed.x[i], q.sy / q.n - placed.y[i]) < 600);
      if (g) { g.n++; g.sx += placed.x[i]; g.sy += placed.y[i]; } else rings.push({ n: 1, sx: placed.x[i], sy: placed.y[i] });
    }
    let best = null;
    for (const q of rings) {
      /* the pool inside: the dunes' water nearest the ring's middle */
      const R = 40, mx = Math.floor(q.sx / q.n / cell), my = Math.floor(q.sy / q.n / cell);
      const bp = G.buildBlueprint(G.plan, { x: mx - R, y: my - R, w: 2 * R + 1, h: 2 * R + 1 });
      const seen = new Uint8Array(bp.w * bp.h);
      let pool = null;
      for (let i0 = 0; i0 < seen.length; i0++) {
        if (seen[i0] || bp.cls[i0] !== C.water || bp.reg[i0] !== sky) continue;
        const st = [i0]; seen[i0] = 1;
        let n = 0, sx = 0, sy = 0;
        while (st.length) {
          const c = st.pop(); n++; sx += c % bp.w; sy += (c / bp.w) | 0;
          for (const k of [c - 1, c + 1, c - bp.w, c + bp.w]) if (k >= 0 && k < seen.length && !seen[k] && bp.cls[k] === C.water) { seen[k] = 1; st.push(k); }
        }
        const x = (mx - R + sx / n + 0.5) * cell, y = (my - R + sy / n + 0.5) * cell, r = Math.sqrt(n / Math.PI) * cell;
        const d = Math.hypot(x - q.sx / q.n, y - q.sy / q.n);
        if (!pool || d < pool.d) pool = { x, y, r, d };
      }
      if (!pool) continue;
      let palms = 0;
      for (let i = 0; i < placed.n; i++) if (placed.kind[i] === palm && Math.hypot(placed.x[i] - pool.x, placed.y[i] - pool.y) < pool.r + 160) palms++;
      if (!best || palms > best.palms) best = { x: pool.x, y: pool.y, r: pool.r, palms };
    }
    /* v2.3.3311: by way of town -- from Frost Ridge the straight line to the
       dunes crosses the open sea between the spokes, five times as much of it
       on the long Wheel */
    await H.hopTo(P, G.arrival.x, G.arrival.y, { step: 200 });
    const arrived = await H.hopTo(P, best.x, best.y + best.r + 110, { step: 200 });
    await P.page.waitForTimeout(4000);
    /* v2.3.3283: where the walk ended, so a miss says why */
    const at = await H.readState(P, (S) => ({ zone: S.currentZone, x: Math.round(S.player.x), y: Math.round(S.player.y) }));
    rec.ok('the walk reaches the oasis, still in the Wheel (guard)',
      arrived && at.zone === 'wheel' && Math.hypot(at.x - best.x, at.y - (best.y + best.r + 110)) < 60, { arrived, at, pool: best });
    const oasis = await P.page.evaluate(({ px, py }) => {
      const W = window.__btWheelObjects;
      return W.near(px, py, 700).filter((o) => o.id === 'palm').map((o) => ({ i: o.i, x: o.x, y: o.y, s: W.sprite(o.i) }));
    }, { px: best.x, py: best.y });
    const drawn = oasis.filter((o) => o.s);
    const wrong = drawn.filter((o) => {
      const k = placed.piece[o.i] % share.length;
      return Math.abs(o.s.ax - share[k]) > 1e-3 || o.s.flip !== !!placed.flip[o.i] || Math.abs(o.s.x - o.x) > 0.5 || Math.abs(o.s.y - o.y) > 0.5;
    });
    rec.ok(`at an oasis in the dunes its ${drawn.length} palms are drawn standing on their trunks (the anchor ${share.map((v) => v.toFixed(2)).join(' / ')} across the picture, not its middle), each leaning in as placed`,
      drawn.length >= 4 && wrong.length === 0 && share.every((v) => v > 0.65), { pool: best, wrong: wrong.slice(0, 3), drawn: drawn.length });
    await shot(P, 'oasis');
  }

  phase = 'home';
  /* ── 7. home: every sheet let go ── */
  const exit = await P.page.evaluate(() => {
    const S = window._gameState.current;
    for (let y = 0; y < S.map.length; y++) { const row = S.map[y]; const x = row.indexOf(8); if (x >= 0) return { tx: x, ty: y }; }
    return null;
  });
  /* v2.3.3028: in two legs, as mp-wheelnodes walks it -- a long stride to
     beside the marker, then onto its reach.  One 100 px stride from the
     dunes' oasis (~9,500 px out) ran out of tries on two of three runs and
     stood in the Wheel ("back": "wheel"), on this branch and the live code's
     alike; where the walk ended is in the record if it ever does again. */
  if (exit) {
    await H.hopTo(P, exit.tx * 32 + 16 + 200, exit.ty * 32 + 16, { step: 200, tries: 260 });
    /* ...and onto the marker's reach, holding still while its gate loads and
       stopping the moment the zone flips: hopTo walks on in town's own
       coordinates, and (1080, 2000) there is town's stairs -- it armed a trip
       straight back into the Wheel ("loading": "wheel"), which keeps the
       Wheel's sheets, the failure this check had on the live code too */
    for (let i = 0; i < 40; i++) {
      const done = await P.page.evaluate(({ x, y }) => {
        const S = window._gameState.current;
        if (S.currentZone === 'town') return true;
        if (S._zoneLoading) return false;
        const dx = x - S.player.x, dy = y - S.player.y, d = Math.hypot(dx, dy);
        if (d < 6) { S.player.vx = 0; S.player.vy = 0; return false; }
        const k = Math.min(100, d);
        S.player.x += (dx / d) * k; S.player.y += (dy / d) * k;
        return false;
      }, { x: exit.tx * 32 + 16 + 40, y: exit.ty * 32 + 16 });
      if (done) break;
      await P.page.waitForTimeout(260);
    }
  }
  const walkEnd = await H.readState(P, (S) => ({ zone: S.currentZone, x: Math.round(S.player.x), y: Math.round(S.player.y),
    loading: S._zoneLoading ? S._zoneLoading.toZone || true : null }));
  const back = await waitZone(P, 'town', 40, 700);
  /* v2.3.3025: the Wheel lingers WHEEL_LINGER_MS (5 s, worldTrial.js) after
     you leave before it stops and lets its sheets go -- a walk back down the
     stairs inside that keeps it all -- and this read at 1.5 s, so it failed
     on main too since the linger came in.  Read once it has had its time,
     up to 15 s on this box. */
  let after = null;
  for (let i = 0; i < 30; i++) {
    await P.page.waitForTimeout(500);
    after = await P.page.evaluate(() => ({ pages: window.__btWheelObjects.pagesLoaded(), stats: { ...window.__btWheelObjects.stats },
      cached: Object.keys((window.PIXI_ASSETS_CACHE || {})).length }));
    if (after.pages.length === 0 && after.stats.drawn === 0) break;
  }
  rec.ok('back in town every one of the Wheel\'s sprite sheets is let go, and nothing of it is drawn',
    back === 'town' && after.pages.length === 0 && after.stats.drawn === 0 && after.stats.pages === 0, { back, exit, walkEnd, after });
  rec.ok('no page errors', P.logs.filter((l) => /pageerror/.test(l)).length === 0, P.logs.filter((l) => /pageerror/.test(l)).slice(0, 5));
  if (renderThrew()) console.log('   first render throw:', renderThrew().slice(0, 1500));
  stopAlive();
}
