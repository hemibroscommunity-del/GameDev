/* ═══ v2.3.3402: EACH LAND'S TREES AND ROCKS WEAR ITS ELEMENT, ON A PHONE ═══
 *
 * src/rendering/landAuras.js: a resource in one of the Wheel's eight lands
 * makes specks of its element round its picture (snow, embers, sand, dust and
 * glints, sparks and arcs, drips, spores, petals and fireflies, a glow at the
 * foot of some); the commons' wear nothing.  On a phone (390 x 844, 3x) in
 * the Wheel, the player put beside the nearest tree and the nearest rock of
 * each land in turn (the page's own position: the specks are the page's
 * alone, and nothing here asks the worker), and beside the commons' pine:
 *   0. the specks' textures were made behind the loading screen;
 *   1. the commons' pine makes none;
 *   2. each land's tree and rock make specks of THAT land -- counted as made,
 *      not as alive at one look (a spark lives a fifth of a second) -- among
 *      them its land's own shape (a flake, a streak, a drop...), riding on
 *      the resource's picture (`_ridesOn`, the depth pass's rider, so they
 *      are drawn just in front of it and behind anyone south of it), every
 *      one alive inside the resource's box grown by 120 px; the lands with
 *      one wear a glow at the foot;
 *   3. never more than AURA_MAX alive;
 * and back at the commons' pine, every land's let go.
 *
 * v2.3.3511, the owner after a playtest: "land tree effects: fire looks like
 * sparkles, water looks like sweating" -- and, by CLAUDE.md, a speck born or
 * gone must not rebuild its layer's draw list.  So, besides:
 *   4. EMBERS: each one drawn pointed the way it really moves on the screen
 *      (two looks a moment apart, the same ember), moving up, and RISING
 *      FASTER the older it is, and redder (cooling) -- not a light that sits
 *      and twinkles; the sparks of the Electric Foundry pointed the way they
 *      fly too, and falling faster as they age (thrown up, arcing down);
 *   5. DRIPS on a Water Caves tree: each one STARTS on its crown's lower edge
 *      as the picture has it (tierTrees.js treeCrownEdge, from src/data/
 *      treeArt.js -- held to the picture by server/test/land-auras.test.mjs),
 *      falls, and LANDS on the ground at its foot (within the foot line's
 *      spread), none lost in the air, and splashes; a Water Caves rock has no
 *      drips but rings spreading from its foot;
 *   6. the Stone Hollows' crystal glints are a rock's, never a tree's;
 *   7. NOTHING STRUCTURAL A FRAME: standing at each resource with its specks
 *      coming and going, no sprite is added to or taken out of a resource's
 *      container in its layer, and none has its picture, blend or visibility
 *      changed -- counted by hooks on Pixi's own Container and Sprite (each
 *      one would rebuild the layer's whole draw list: TRAPS §218); the old
 *      code made several a second.
 * Pictures: tools/qa/mp/out/landauras-<land>.png (a tree) and
 * landauras-<land>-rock.png -- what the owner looks at.
 *
 *   node tools/qa/mp/run.mjs landauras
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { treeCrownEdge } from '../../../src/game/tierTrees.js';

const PHONE = { width: 390, height: 844 };
const LANDS = ['frost', 'ember', 'sky', 'hollows', 'thunder', 'tidal', 'mist', 'verdant'];
/* each land's own shape, as src/data/landAuras.js LAND_AURAS draws it (any
   one will do where a land has two), and the lands with a glow at the foot */
const SHAPE = { frost: ['flake'], ember: ['ember'], sky: ['streak'], hollows: ['dot', 'glint'], thunder: ['spark', 'dot'],
  tidal: ['drop', 'ring'], mist: ['glow'], verdant: ['petal', 'glow'] };
const BASE = new Set(['ember', 'thunder', 'mist']);
const TEXTURES = ['dot', 'glow', 'flake', 'streak', 'drop', 'petal', 'glint', 'ember', 'spark', 'puff', 'ring'];

const put = (P, x, y) => P.page.evaluate(({ x, y }) => {
  const S = window._gameState.current;
  S.player.x = x; S.player.y = y; S.player.vx = 0; S.player.vy = 0;
}, { x, y });

const probe = (P, id) => P.page.evaluate((nid) => {
  const R = window._pixiRenderer;
  return R && R.landAuraProbe ? R.landAuraProbe(nid) : null;
}, id);

/* v2.3.3511: hooks on Pixi's own Container and Sprite that count every
   structural change made to a resource's specks while its container is in a
   layer: a child added or taken out, a picture, blend or visibility changed
   (each one rebuilds the layer's draw list).  Found by what they do, not by
   name: the build is minified. */
const HOOK = () => {
  if (window.__btAuraOps) return true;
  const R = window._pixiRenderer;
  const stage = R && R.app && R.app.stage;
  if (!stage) return false;
  /* a speck's own sprite: the first resource's container, made by now */
  let sprite = null;
  const find = (c) => {
    if (sprite) return;
    if (c.label === 'landAura' && c.children && c.children.length) { sprite = c.children[c.children.length - 1]; return; }
    const k = c.children;
    if (k) for (let i = 0; i < k.length && !sprite; i++) find(k[i]);
  };
  find(stage);
  if (!sprite) return false;
  const owner = (o, key) => { for (let p = o; p; p = Object.getPrototypeOf(p)) if (Object.prototype.hasOwnProperty.call(p, key)) return p; return null; };
  const st = window.__btAuraOps = { child: 0, attach: 0, detach: 0, what: {} };
  const aura = (c) => !!c && c.label === 'landAura';
  const inLayer = (c) => aura(c) && !!c.parent;
  const note = (k) => { st.child++; st.what[k] = (st.what[k] || 0) + 1; };
  const cproto = owner(stage, 'addChild');
  for (const m of ['addChild', 'addChildAt', 'removeChild', 'removeChildAt', 'removeChildren']) {
    const p = owner(stage, m);
    if (!p) continue;
    const f = p[m];
    p[m] = function (...args) {
      if (inLayer(this)) note(m);
      if (m === 'addChild' || m === 'addChildAt') { if (args.some(aura)) st.attach++; }
      if (m === 'removeChild') { if (args.some(aura)) st.detach++; }
      return f.apply(this, args);
    };
  }
  for (const [obj, key] of [[stage, 'visible'], [stage, 'blendMode'], [sprite, 'texture']]) {
    const p = owner(obj, key);
    const d = p && Object.getOwnPropertyDescriptor(p, key);
    if (!d || !d.set) continue;
    Object.defineProperty(p, key, {
      configurable: true, enumerable: d.enumerable,
      get: d.get,
      set(v) { if (inLayer(this.parent) && d.get.call(this) !== v) note(key); return d.set.call(this, v); },
    });
  }
  return !!cproto;
};

async function closeTalk(P) {
  for (let i = 0; i < 10; i++) {
    await P.page.waitForTimeout(400);
    const scrim = P.page.locator('.bt-npcdlg-scrim').first();
    if (await scrim.isVisible().catch(() => false)) {
      await scrim.click({ position: { x: 20, y: 300 } }).catch(() => {});
      continue;
    }
    let hit = false;
    for (const t of ['Next', 'Close', 'Got it']) {
      const btn = P.page.locator('button:visible', { hasText: t }).first();
      if (await btn.isVisible().catch(() => false)) { await btn.click().catch(() => {}); hit = true; break; }
    }
    if (!hit) return;
  }
}

/* the smallest turn between two angles */
const turn = (a, b) => { let d = Math.abs(a - b) % (2 * Math.PI); if (d > Math.PI) d = 2 * Math.PI - d; return d; };
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN);

/* v2.3.3511: watch a streaking kind (embers, sparks) on one resource for a
   while: each one seen twice a moment apart -- the way it moved on the screen
   against the way it is drawn pointing -- and every look's speed, upward
   speed, colour and age */
async function watchStreaks(P, id, kind, looks = 14) {
  const seen = new Map(), pairs = [], all = [];
  for (let i = 0; i < looks; i++) {
    const pr = await probe(P, id);
    const n = pr && pr.node;
    if (n) {
      for (const s of n.live) {
        if (s.id !== kind) continue;
        all.push(s);
        /* against where it was last counted, once it has moved 4 px (this box
           draws a few frames a second: one look to the next can be a px) */
        const was = seen.get(s.n);
        if (!was) { seen.set(s.n, s); continue; }
        const dx = s.x - was.x, dy = s.y - was.y;
        if (Math.hypot(dx, dy) >= 4) {
          pairs.push({ moved: Math.atan2(dy, dx), drawn: s.rot, dy, off: turn(Math.atan2(dy, dx), s.rot) });
          seen.set(s.n, s);
        }
      }
    }
    await P.page.waitForTimeout(160);
  }
  return { pairs, all };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Aurabro', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  const stopAlive = H.keepAlive(P, 15000);
  try {
    await H.enterWorld(P);
    const myId = await H.readState(P, (S) => S.myId);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading, n: (S.gatherNodes || []).length }),
      (v) => v.zone === 'wheel' && !v.loading && v.n > 0, { timeout: 120000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel, with its resources (guard)', !!inW, inW);
    if (!inW) return;
    const ready = await probe(P, null);
    rec.ok(`the specks' textures were made behind the loading screen (${ready && ready.textures ? ready.textures.join(', ') : 'none'})`,
      !!ready && ready.ready === true && TEXTURES.every((t) => (ready.textures || []).includes(t)), ready);
    await P.page.addStyleTag({ content:
      '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    for (const k of ['woodcutting_axe', 'mining_pickaxe']) await H.grant(wsPort, myId, 'item', { invKey: k, count: 1 }).catch(() => {});
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 40 });
    const tools = await H.waitFor(P, (S) => ['woodcutting_axe', 'mining_pickaxe'].filter((k) => ((S.rpg || {}).inventory || {})[k] > 0).length,
      (n) => n === 2, { timeout: 20000, label: 'the tools' }).catch(() => 0);
    rec.ok('the axe and the pickaxe in the bag, so the resources are drawn (guard)', tools === 2, tools);
    /* out past the Mayor's gate: until tut_1 a new bro is held on the safe commons */
    await P.page.evaluate(() => { window._gameState.current.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } }); });
    await H.waitFor(P, (S) => ((S.rpg || {})._quests || {}).tut_1 || null, (v) => v === 'active', { timeout: 10000, label: 'tut_1' }).catch(() => null);
    await closeTalk(P);

    /* each land's nearest tree and rock to BroTown, and the commons' pine */
    const spots = await P.page.evaluate((lands) => {
      const S = window._gameState.current;
      const landOf = (n) => (/^wn-([a-z]+)-/.exec(String(n.id)) || [])[1] || null;
      const live = (S.gatherNodes || []).filter((n) => n && n.alive !== false && (n.nodeType === 'tree' || n.nodeType === 'oreVein'));
      const near = (land, type) => live.filter((n) => landOf(n) === land && n.nodeType === type)
        .sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y))[0] || null;
      const out = [];
      const c = near('commons', 'tree');
      if (c) out.push({ land: 'commons', type: 'tree', id: c.id, x: c.x, y: c.y, lvl: c.gatherLvl || 1 });
      for (const land of lands) for (const type of ['tree', 'oreVein']) {
        const n = near(land, type);
        if (n) out.push({ land, type, id: n.id, x: n.x, y: n.y, lvl: n.gatherLvl || 1 });
      }
      return out;
    }, LANDS);
    rec.ok('a tree and a rock in each of the eight lands, and the commons\' pine (guard)',
      spots.filter((s) => s.land !== 'commons').length === 16 && !!spots[0] && spots[0].land === 'commons', spots.map((s) => s.land + ':' + s.type));

    let maxLive = 0, hooked = false;
    const steady = [];
    for (const s of spots) {
      /* beside it, a little south-east, so the picture shows the resource and its specks */
      await put(P, s.x + 90, s.y + 70);
      const what = s.type === 'tree' ? 'tree' : 'rock';
      if (s.land === 'commons') {
        await P.page.waitForTimeout(3000);
        const pr = await probe(P, s.id);
        rec.ok('the commons\' pine wears nothing', !!pr && !pr.node && !(pr.byLand && pr.byLand.commons), pr);
        continue;
      }
      /* the specks are made on the game's own clock, capped at 100 ms a frame,
         and this box draws a few frames a second: waited for, not timed */
      let got = null, outside = 0, rides = true;
      const kinds = new Set(), byId = new Set();
      for (let i = 0; i < 50; i++) {
        await P.page.waitForTimeout(400);
        got = await probe(P, s.id);
        maxLive = Math.max(maxLive, (got && got.live) || 0);
        const n = got && got.node;
        if (n) {
          for (const k of Object.keys(n.kinds || {})) kinds.add(k);
          for (const k of Object.keys(n.kindsById || {})) byId.add(k);
          outside = Math.max(outside, n.outside);
          if (n.parts) rides = rides && n.rides;
          if (n.made >= 6 && SHAPE[s.land].some((k) => kinds.has(k))) break;
        }
      }
      const n = got && got.node;
      rec.ok(`${s.land} ${what}: makes specks of its land, its own shape among them, riding on its picture, every one inside its box`,
        !!n && n.land === s.land && n.made >= 6 && SHAPE[s.land].some((k) => kinds.has(k)) && rides && outside === 0,
        { n: n && { ...n, live: undefined, drips: undefined }, kinds: [...kinds], outside, rides, live: got && got.live });
      if (BASE.has(s.land)) rec.ok(`${s.land} ${what}: a glow at its foot`, !!n && n.base === true, n && { base: n.base });

      /* ── 7. nothing structural while its specks come and go (hooked on the
         first resource's own sprites, made by now) ── */
      if (!hooked) hooked = await P.page.evaluate(HOOK);
      const before = await P.page.evaluate(() => ({ ops: { ...window.__btAuraOps, what: { ...window.__btAuraOps.what } }, made: window._pixiRenderer.landAuraProbe(null) }));
      await P.page.waitForTimeout(2500);
      const after = await P.page.evaluate((id) => ({ ops: { ...window.__btAuraOps, what: { ...window.__btAuraOps.what } }, made: window._pixiRenderer.landAuraProbe(id) }), s.id);
      steady.push({ at: `${s.land} ${what}`, child: after.ops.child - before.ops.child, attach: after.ops.attach - before.ops.attach,
        made: (after.made.made || 0) - (before.made.made || 0), structural: (after.made.structural || 0) - (before.made.structural || 0),
        sprites: after.made.node ? after.made.node.sprites : null, what: after.ops.what });

      /* ── 4. embers and sparks: pointed the way they go ── */
      if (s.land === 'ember' || s.land === 'thunder') {
        const kind = s.land === 'ember' ? 'ember' : 'spark';
        const w = await watchStreaks(P, s.id, kind);
        const ok = w.pairs.filter((p) => p.off <= 0.7).length;
        const young = w.all.filter((x) => x.q < 0.35), old = w.all.filter((x) => x.q > 0.6);
        const sp = (a) => mean(a.map((x) => Math.hypot(x.vx, x.vy)));
        const vy = (a) => mean(a.map((x) => x.vy));
        const green = (a) => mean(a.map((x) => (x.tint >> 8) & 255));
        rec.ok(`${s.land} ${what}: its ${kind}s are drawn pointing the way they move on the screen (${ok} of ${w.pairs.length} within 40 degrees)`,
          w.pairs.length >= 3 && ok >= Math.ceil(w.pairs.length * 0.8), { pairs: w.pairs.slice(0, 10) });
        if (s.land === 'ember') {
          const up = w.pairs.filter((p) => p.dy < 0).length;
          rec.ok(`${s.land} ${what}: embers rise (${up} of ${w.pairs.length} moved up) and FASTER as they age (${sp(young).toFixed(0)} px/s young, ${sp(old).toFixed(0)} old), cooling redder (green ${green(young).toFixed(0)} young, ${green(old).toFixed(0)} old)`,
            w.pairs.length >= 3 && up >= Math.ceil(w.pairs.length * 0.8) && young.length >= 2 && old.length >= 2
              && sp(old) > sp(young) * 1.25 && vy(old) < vy(young) && green(old) < green(young) - 30,
            { young: young.length, old: old.length, spYoung: sp(young), spOld: sp(old), gYoung: green(young), gOld: green(old) });
        } else {
          rec.ok(`${s.land} ${what}: sparks are thrown and arc down, falling faster as they age (mean upward speed ${(-vy(young)).toFixed(0)} px/s young, ${(-vy(old)).toFixed(0)} old)`,
            young.length >= 2 && old.length >= 2 && vy(old) > vy(young) + 40, { young: young.length, old: old.length, vyYoung: vy(young), vyOld: vy(old) });
        }
      }

      /* ── 5. drips: from the crown's edge to the ground ── */
      if (s.land === 'tidal') {
        let d = null;
        for (let i = 0; i < 40; i++) {
          const pr = await probe(P, s.id);
          d = pr && pr.node && pr.node.drips;
          /* the kinds seen while it drips: a splash comes only once one lands */
          for (const k of Object.keys((pr && pr.node && pr.node.kindsById) || {})) byId.add(k);
          if (!d || s.type !== 'tree' || (d.landed >= 4 && d.starts.length >= 4 && byId.has('splash'))) break;
          await P.page.waitForTimeout(400);
        }
        if (s.type === 'tree') {
          /* the crown's lower edge as the picture has it, computed here from
             the same data the game reads (src/data/treeArt.js) */
          const edge = treeCrownEdge({ x: s.x, y: s.y, gatherLvl: s.lvl, nodeType: 'tree' });
          const onEdge = (pt) => edge.some((q) => pt.x >= q.x0 - 0.01 && pt.x <= q.x1 + 0.01 && Math.abs(pt.y - q.y) <= 0.6);
          const startsOk = (d && d.starts || []).filter(onEdge).length;
          const landsOk = (d && d.lands || []).filter((pt) => pt.y >= pt.foot - 6 && pt.y <= pt.foot + 8).length;
          rec.ok(`${s.land} tree: drops form on its crown's lower edge as the picture has it (${startsOk} of ${d ? d.starts.length : 0} started there)`,
            !!d && d.starts.length >= 3 && startsOk === d.starts.length, { starts: d && d.starts, edge: edge.slice(0, 6), n: edge.length });
          rec.ok(`${s.land} tree: ...hang, fall and LAND on the ground at its foot (${d ? d.landed : 0} landed of ${d ? d.fell : 0} fallen, ${landsOk} of the last ${d ? d.lands.length : 0} on the foot's line, ${d ? d.lost : 0} lost in the air), and splash`,
            !!d && d.landed >= 3 && d.lost === 0 && d.lands.length >= 3 && landsOk === d.lands.length && byId.has('splash'),
            { drips: d, parts: [...byId] });
        } else {
          rec.ok(`${s.land} rock: no drips (no leaves), rings spreading from its foot instead`, !!d && d.formed === 0 && !byId.has('drip') && byId.has('ripple'), { drips: d, parts: [...byId] });
        }
      }
      /* ── 6. the Stone Hollows' crystal glints: a rock's ── */
      if (s.land === 'hollows') {
        if (s.type === 'tree') rec.ok('hollows tree: no crystal glints on a tree (its dust only)', !byId.has('crystal') && !kinds.has('glint'), { parts: [...byId] });
        else rec.ok('hollows rock: crystal glints on the rock', byId.has('crystal'), { parts: [...byId] });
      }

      await P.page.waitForTimeout(800);
      const clip = await P.page.evaluate(({ x, y }) => {
        const S = window._gameState.current, cv = document.querySelector('canvas'), rc = cv.getBoundingClientRect();
        const sy = rc.top + (y - S.camera.y) * (S._worldScaleY || 1);
        const top = Math.max(0, Math.min(rc.bottom - 420, sy - 330));
        return { x: rc.left, y: top, width: Math.min(390, rc.width), height: 420 };
      }, s);
      await P.page.screenshot({ path: join(OUT, `landauras-${s.land}${s.type === 'tree' ? '' : '-rock'}.png`), clip }).catch(() => {});
    }
    rec.ok('the structural-change counters hooked on Pixi\'s Container and Sprite (guard)', hooked === true, hooked);
    const cap = await P.page.evaluate(() => (window._pixiRenderer.landAuraCap ? window._pixiRenderer.landAuraCap() : null));
    rec.ok(`never more than the cap alive (${maxLive} at most, the cap ${cap})`, cap != null && maxLive <= cap, { maxLive, cap });
    /* ── 7. ── */
    const bad = steady.filter((x) => x.child !== 0);
    const madeAll = steady.reduce((t, x) => t + x.made, 0);
    rec.ok(`nothing structural while specks come and go: ${madeAll} specks born over 16 stays of 2.5 s, ${steady.reduce((t, x) => t + x.child, 0)} sprites added, taken out or re-pictured in a layer (each would rebuild its draw list)`,
      steady.length === 16 && bad.length === 0 && madeAll >= 16, { bad, steady: steady.map((x) => `${x.at}: ${x.made} born, ${x.child} ops, ${x.structural} layer changes, ${x.sprites} sprites`) });

    /* back at the commons' pine: every land's specks let go */
    const home = spots[0];
    await put(P, home.x + 90, home.y + 70);
    let back = null;
    for (let i = 0; i < 20; i++) {
      await P.page.waitForTimeout(400);
      back = await probe(P, null);
      if (back && back.resources === 0 && back.live === 0) break;
    }
    rec.ok('back on the commons, every land\'s specks let go', !!back && back.resources === 0 && back.live === 0, back);
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}
