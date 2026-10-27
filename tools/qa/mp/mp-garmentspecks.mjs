/* ═══ THE TROUSERS AND BOOTS ARE PAINTED WHERE THEY ARE (v2.3.3647) ═══
 *
 * The owner, 2026-10-27: "check all the animations for ghost remnants of
 * either a body beneath or areas for cleanup".  mp-ghostaudit dressed a bro in
 * pink trousers and blue boots and photographed every frame: the head came
 * back wearing them, specks of pink and blue round its outline and along an
 * eye, in nearly every pose.  The recolour (playerSkins recolorBodyToCanvas)
 * finds the garments by colour, and the outline's anti-aliased pixels are
 * often exactly the trousers' olive or the boots' grey; garmentConfine.js
 * paints a garment pixel outside the bottom band of the figure only when it
 * belongs to a trouser leg or a boot.
 *
 * Two players in those colours (and a yellow tee) stand on the commons, far
 * apart: one plays the game, one plays it with `?garmentspecks=0`, the game
 * as it was.  Both are photographed alone, every world layer but the figure
 * put away, their clocks held at the SAME moment, so the two show the same
 * frame of the same pose (the walk and the stand run on the wall clock):
 *   1. standing in all eight facings, jogging in four, the hit, the sword's
 *      swing (its stand-in body): at most HEAD_MAX px of the trousers' or the
 *      boots' colour in the top of the figure (the head), where the old page
 *      shows SEEN_MIN or more over the same frames;
 *   2. the legs keep their colours: below the head the new page shows at
 *      least LEGS_KEEP of the old page's trousers and BOOTS_KEEP of its boots,
 *      frame by frame;
 *   3. the roll, where the legs go overhead: the boots and trousers keep
 *      their colour there too;
 *   4. the bake says what it did (__btGarmentSpecks): on, and every walking
 *      sheet judged, on the new page; off on the old.
 */
import * as H from './harness.mjs';

const VIEW = { width: 900, height: 700 };
const DPR = 2;
const CLIP_W = 220, CLIP_H = 230;
const LOOK = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle', 'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
  localStorage.setItem('bt-skin', 'green'); localStorage.setItem('bt-pants', 'pink'); localStorage.setItem('bt-shoes', 'blue');
  localStorage.setItem('bt-shirt', 'tshirt'); localStorage.setItem('bt-shirtcolor', 'yellow');
  localStorage.setItem('bt-hair', 'none'); localStorage.setItem('bt-headwear', 'none');
} catch (e) {}`;
/* the most of the trousers' and boots' colours (device px, at pixel ratio 2)
   one frame may show in the head */
const HEAD_MAX = 2;
/* ...and the least the old page shows over the same frames, for the check to
   mean anything */
const SEEN_MIN = 30;
/* the share of the old page's trouser and boot colour below the head the new
   page keeps, frame by frame (what it no longer paints there is the outline
   along the arms and the back) */
const LEGS_KEEP = 0.85;
/* ...and of the boots, which are small: the north jog's raised boot is about
   100 px, and up to 17 of them are the sole's outline grey beside the rim,
   which the rule leaves as drawn and the old bake painted blue.  Two runs of
   the same build read 84 and 92 px there (101 and 103 as it was): 0.85 failed
   one of them on a few px of antialiasing. */
const BOOTS_KEEP = 0.8;
const HEAD_SHARE = 0.3;   /* the head: the top 30% of the figure as drawn */

const FACINGS = [
  ['east', ['d'], 0], ['southeast', ['s', 'd'], Math.PI / 4], ['south', ['s'], Math.PI / 2],
  ['southwest', ['s', 'a'], 3 * Math.PI / 4], ['west', ['a'], Math.PI], ['northwest', ['w', 'a'], -3 * Math.PI / 4],
  ['north', ['w'], -Math.PI / 2], ['northeast', ['w', 'd'], -Math.PI / 4],
];

/* the page's tools (mp-standinlegs'): a held clock that creeps (frozen
   outright, a time-sliced job never ends), and a render hook that draws only
   the bro's figure layers, without what stood there before (a stone, the
   townsfolk) or his name plate -- hidden for the one render and put straight
   back.  `anchor` keeps a jog in place. */
const KIT = () => {
  if (window.__gs) return true;
  const R = window._pixiRenderer;
  const app = R && R.app;
  const world = app && app.stage.children.find((c) => c.label === 'world');
  if (!world) return false;
  /* the black-screen watchdog would take a frame drawn with the world put
     away for a lost GPU and rebuild the renderer; it skips its judgement
     while a loading veil is up, so a hidden one stays up for the test */
  const veil = document.createElement('div');
  veil.className = 'bt-zone-loading';
  veil.setAttribute('data-qa-garment-veil', '');
  veil.style.setProperty('display', 'none', 'important');
  document.body.appendChild(veil);
  const G = window.__gs = {
    on: false, realNow: Date.now, held: null, at: null, anchor: null, foreign: new Set(),
    keep: new Set(['entities', 'player', 'gatherNodesBack', 'gatherNodes', 'gatherNodesFront', 'gestureFront']),
  };
  G.hold = (t) => { G.at = t; G.held = t; Date.now = () => (G.held += 0.0005); };
  G.rehold = () => { if (G.at != null) G.held = G.at; };
  G.free = () => { Date.now = G.realNow; G.held = null; G.at = null; };
  const rend = app.renderer, orig = rend.render.bind(rend);
  rend.render = function (...a) {
    const hidden = [];
    const hide = (o) => { if (o && o.visible) { o.visible = false; hidden.push(o); } };
    try {
      if (G.anchor) { const S = window._gameState.current; S.player.x = G.anchor.x; S.player.y = G.anchor.y; }
      if (G.on) {
        const me = R.playerDisplayRaw();
        for (const layer of world.children) {
          if (!G.keep.has(layer.label)) { hide(layer); continue; }
          for (const c of layer.children) if (G.foreign.has(c)) hide(c);
        }
        if (me && me._uiLayer) hide(me._uiLayer);
      }
    } catch (e) { /* the frame still draws */ }
    G.renders = (G.renders || 0) + 1;
    try { return orig(...a); } finally { for (const o of hidden) o.visible = true; }
  };
  G.isolate = (on) => { G.on = !!on; };
  G.app = app;
  G.same = () => !!(window._pixiRenderer && window._pixiRenderer.app === G.app);
  G.markForeign = () => {
    G.foreign.clear();
    const me = R.playerDisplayRaw();
    for (const layer of world.children) {
      if (!G.keep.has(layer.label)) continue;
      for (const c of layer.children) if (c !== me && c.visible) G.foreign.add(c);
    }
    return G.foreign.size;
  };
  /* where the bro stands on the page: the stand-in's middle when one draws
     (the swing), else his feet */
  G.clip = (W, Hh) => {
    const S = window._gameState.current;
    const r = document.querySelector('canvas').getBoundingClientRect();
    const d = window.__btPlayerDrawn ? window.__btPlayerDrawn() : null;
    const wx = d ? d.x : S.player.x, wy = d ? d.footY : S.player.y + 52;
    const x = r.left + (wx - S.camera.x) * (S._worldScaleX || 1), y = r.top + (wy - S.camera.y) * (S._worldScaleY || 1);
    return {
      x: Math.max(0, Math.min(window.innerWidth - W, Math.round(x - W / 2))),
      y: Math.max(0, Math.min(window.innerHeight - Hh, Math.round(y - Hh + 50))),
      width: W, height: Hh,
    };
  };
  G.pose = () => {
    const S = window._gameState.current, me = R.playerDisplayRaw();
    return { pose: me ? me._animPose : null, dir: me ? me._animDir : null, frame: me ? me._animFrame : null, swing: !!S._swordSwinging, body: !!(me && me.visible) };
  };
  return true;
};

/* a shot's colours, in the page itself: trousers pink, boots blue, by row */
async function colours(page, buf) {
  return page.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, cv.width, cv.height).data;
    const W = cv.width, H = cv.height;
    const pinkRow = new Int32Array(H), blueRow = new Int32Array(H), anyRow = new Int32Array(H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4, r = d[i], g = d[i + 1], b = d[i + 2];
        if (Math.abs(r - 13) + Math.abs(g - 11) + Math.abs(b - 24) < 18) continue;
        anyRow[y]++;
        if (r > 110 && b > 70 && r > b && g < r * 0.72 && b > g * 1.15) pinkRow[y]++;
        else if (b > 110 && b > r * 2.0 && b > g * 1.5) blueRow[y]++;
      }
    }
    return { H, pinkRow: Array.from(pinkRow), blueRow: Array.from(blueRow), anyRow: Array.from(anyRow) };
  }, buf.toString('base64'));
}
/* the head (the figure's top HEAD_SHARE) and the rest, from a shot's rows */
function split(c) {
  let top = -1, bot = -1;
  for (let y = 0; y < c.H; y++) if (c.anyRow[y] > 2) { if (top < 0) top = y; bot = y; }
  const out = { top, bot, headPink: 0, headBlue: 0, pink: 0, blue: 0, pinkAll: 0, blueAll: 0 };
  if (top < 0) return out;
  const cut = top + Math.round((bot - top + 1) * HEAD_SHARE);
  for (let y = 0; y < c.H; y++) {
    out.pinkAll += c.pinkRow[y]; out.blueAll += c.blueRow[y];
    if (y < cut) { out.headPink += c.pinkRow[y]; out.headBlue += c.blueRow[y]; }
    else { out.pink += c.pinkRow[y]; out.blue += c.blueRow[y]; }
  }
  out.head = out.headPink + out.headBlue;
  return out;
}

const SHOTS = process.env.BT_GS_SHOTS ? H.REPO + '/tools/qa/mp/out/garmentspecks' : null;
/* one held frame on a page: the moment put back (the creep adds up), two
   frames drawn, the photograph */
async function shoot(P, name) {
  await P.page.evaluate(() => window.__gs.rehold());
  const r0 = await P.page.evaluate(() => window.__gs.renders || 0);
  for (let i = 0; i < 100; i++) {
    await P.page.waitForTimeout(40);
    if ((await P.page.evaluate(() => window.__gs.renders || 0)) >= r0 + 3) break;
  }
  await P.page.evaluate(() => window.__gs.rehold());
  const clip = await P.page.evaluate(({ W, Hh }) => window.__gs.clip(W, Hh), { W: CLIP_W, Hh: CLIP_H });
  const buf = await P.page.screenshot({ clip });
  if (SHOTS) { const fs = await import('node:fs'); fs.mkdirSync(SHOTS, { recursive: true }); fs.writeFileSync(`${SHOTS}/${name}.png`, buf); }
  const pose = await P.page.evaluate(() => window.__gs.pose());
  return { ...split(await colours(P.page, buf)), pose };
}

/* face a way on a page: the mouse that way, a short step, then stand */
async function face(P, keys, ang) {
  const c = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const r = document.querySelector('canvas').getBoundingClientRect();
    return { x: r.left + (S.player.x - S.camera.x) * (S._worldScaleX || 1), y: r.top + (S.player.y - S.camera.y) * (S._worldScaleY || 1) };
  });
  await P.page.mouse.move(c.x + Math.cos(ang) * 150, c.y + Math.sin(ang) * 150);
  for (const k of keys) await P.page.keyboard.down(k);
  await P.page.waitForTimeout(160);
  for (const k of keys) await P.page.keyboard.up(k);
  await P.page.waitForTimeout(500);
}
const keysDown = async (P, ks) => { for (const k of ks) await P.page.keyboard.down(k); };
const keysUp = async (P, ks) => { for (const k of ks) await P.page.keyboard.up(k); };
/* `mark`: what stands there now is put away for the photograph -- not for the
   swing, whose stand-in body comes up after the mark (marked first) */
const isolate = (P, on, mark = true) => P.page.evaluate(({ on, mark }) => { if (on && mark) window.__gs.markForeign(); window.__gs.isolate(on); }, { on, mark });
const holdAt = (P, T) => P.page.evaluate((T) => window.__gs.hold(T), T);
const letGo = (P) => P.page.evaluate(() => { window.__gs.free(); window.__gs.anchor = null; window.__gs.isolate(false); });

export async function run({ browser, wsPort, webPort, rec }) {
  const errors = [];
  const pages = [];
  try {
    /* NEW plays the game, OLD the game as it was */
    const NEW = await H.newPlayer(browser, { name: 'Specks', wsPort, webPort, viewport: VIEW, touch: false, dpr: DPR, world: 'wheel', init: LOOK });
    pages.push(NEW);
    const OLD = await H.newPlayer(browser, { name: 'Speckless', wsPort, webPort, viewport: VIEW, touch: false, dpr: DPR, world: 'wheel', init: LOOK, query: 'garmentspecks=0' });
    pages.push(OLD);
    NEW.page.on('pageerror', (e) => errors.push('new ' + String(e && e.message || e)));
    OLD.page.on('pageerror', (e) => errors.push('old ' + String(e && e.message || e)));
    await Promise.all([H.enterWorld(NEW), H.enterWorld(OLD)]);
    const inWorld = async (P, label) => H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 90000, label }).catch(() => null);
    const [inN, inO] = await Promise.all([inWorld(NEW, 'the new page into the world'), inWorld(OLD, 'the old page into the world')]);
    rec.ok('both pages in the world (guard)', !!inN && !!inO, { inN, inO });
    if (!inN || !inO) return;
    for (const P of [NEW, OLD]) {
      const id = await H.readState(P, (S) => S.myId);
      await H.devOp(wsPort, 'kit', id, { what: 'weapons' }).catch(() => {});
    }
    const G = await H.wheelGeom();
    /* far apart: neither draws the other */
    await Promise.all([
      H.hopTo(NEW, Math.round(G.cx + 1350), Math.round(G.cy - 1350), { tries: 80 }),
      H.hopTo(OLD, Math.round(G.cx + 1350), Math.round(G.cy + 1350), { tries: 80 }),
    ]);
    await NEW.page.waitForTimeout(2500);
    const kits = await Promise.all([NEW.page.evaluate(KIT), OLD.page.evaluate(KIT)]);
    rec.ok('both pages can hold their clocks and draw the bro alone (guard)', kits[0] === true && kits[1] === true, kits);
    const probe = await Promise.all([NEW, OLD].map((P) => P.page.evaluate(() => (window.__btGarmentSpecks ? window.__btGarmentSpecks() : null))));
    rec.ok('the new page confines the garments, the old one does not (guard)',
      !!probe[0] && probe[0].on === true && !!probe[1] && probe[1].on === false, { new: probe[0] && probe[0].on, old: probe[1] && probe[1].on });

    const results = [];
    /* the same held moment on both pages, the same frame of the same pose */
    const both = async (name, T) => {
      await Promise.all([holdAt(NEW, T), holdAt(OLD, T)]);
      await Promise.all([isolate(NEW, true), isolate(OLD, true)]);
      const n = await shoot(NEW, name + '-new');
      const o = await shoot(OLD, name + '-old');
      const same = n.pose.pose === o.pose.pose && n.pose.dir === o.pose.dir && n.pose.frame === o.pose.frame;
      results.push({ name, n, o, same });
      console.log(`    ${name}: new head ${n.head} legs ${n.pink}/${n.blue} | old head ${o.head} legs ${o.pink}/${o.blue} | ${n.pose.pose}/${n.pose.dir}/${n.pose.frame}${same ? '' : ' vs ' + o.pose.pose + '/' + o.pose.dir + '/' + o.pose.frame}`);
      return { n, o, same };
    };
    const now = async () => Math.max(...await Promise.all([NEW, OLD].map((P) => P.page.evaluate(() => Date.now()))));

    /* ── 1/2. standing, every facing: the resting facing set outright (the
       renderer's `_facingAngle` branch), so both pages face the same way ── */
    for (const [dir, , ang] of FACINGS) {
      for (const P of [NEW, OLD]) await P.page.evaluate((a) => { const S = window._gameState.current; S._facingAngle = a; }, ang);
      await NEW.page.waitForTimeout(300);
      await both(`stand-${dir}`, await now() + 200);
      await Promise.all([letGo(NEW), letGo(OLD)]);
    }
    /* ── jogging in place, four facings, two moments ── */
    for (const [dir, keys, ang] of FACINGS.filter(([d]) => ['east', 'south', 'north', 'southwest'].includes(d))) {
      await Promise.all([face(NEW, keys, ang), face(OLD, keys, ang)]);
      for (const P of [NEW, OLD]) await P.page.evaluate(() => { const S = window._gameState.current; window.__gs.anchor = { x: S.player.x, y: S.player.y }; });
      await Promise.all([keysDown(NEW, keys), keysDown(OLD, keys)]);
      await NEW.page.waitForTimeout(600);
      /* the stride's frame is the wall clock's plus an offset each page keeps
         from its own cadence changes (entityRenderer `_jogOff`): zeroed, the
         same held moment is the same frame on both */
      for (const P of [NEW, OLD]) await P.page.evaluate(() => { const d = window._pixiRenderer.playerDisplayRaw(); if (d) d._jogOff = 0; });
      const T = await now() + 200;
      await both(`jog-${dir}-a`, T);
      await both(`jog-${dir}-b`, T + 170);
      await Promise.all([keysUp(NEW, keys), keysUp(OLD, keys)]);
      await Promise.all([letGo(NEW), letGo(OLD)]);
      await NEW.page.waitForTimeout(400);
    }
    /* ── the hit's flinch, south ── */
    await Promise.all([face(NEW, ['s'], Math.PI / 2), face(OLD, ['s'], Math.PI / 2)]);
    {
      const T = await now() + 200;
      for (const P of [NEW, OLD]) await P.page.evaluate((T) => { window._gameState.current._hitFlash = T - 90; }, T);
      await both('hit-south', T);
      await Promise.all([letGo(NEW), letGo(OLD)]);
    }
    /* ── the sword's swing, east: its stand-in body ── */
    const eq = await Promise.all([H.equipWeapon(NEW, 'greatsword', 'weapon', 'melee'), H.equipWeapon(OLD, 'greatsword', 'weapon', 'melee')]).catch((e) => String(e));
    await NEW.page.waitForTimeout(2000);
    const swingStart = async (P) => {
      const c = await P.page.evaluate(() => {
        const R = window._pixiRenderer, d = R.playerDisplayRaw();
        const r = document.querySelector('canvas').getBoundingClientRect();
        const b = d.getBounds();
        return { x: r.left + b.x + b.width / 2, y: r.top + b.y + b.height / 2 };
      });
      /* The press aims east, 110 CSS px out: Mayor Bro stands about 260 world
         px east of the arrival (~160 CSS px at this zoom) and wanders near his
         spot, so the old 170 px press now and then landed on HIM -- a tap on a
         townsperson talks to him (v2.3.3583) and swings nothing, on one page
         or the other.  Still outside your own bro's chat circle.  If a press
         starts nothing, whatever it opened is closed (Esc) and it presses
         again a little south of east (still the east facing). */
      for (let tries = 0; tries < 3; tries++) {
        if (tries) {
          await P.page.mouse.up();
          await P.page.keyboard.press('Escape').catch(() => {});
          await P.page.waitForTimeout(400);
        }
        const a = tries ? 0.3 * tries : 0;
        await P.page.mouse.move(c.x + Math.cos(a) * 110, c.y + Math.sin(a) * 110);
        await P.page.waitForTimeout(300);
        await P.page.mouse.down();
        const t0 = await H.waitFor(P, (S) => (S._swordSwinging && S.swingTimer ? S.swingTimer : null), (v) => !!v, { timeout: 5000, label: 'a swing' }).catch(() => null);
        if (t0) return t0;
        const tap = await P.page.evaluate(() => window.__btNpcTap || null).catch(() => null);
        console.log(`    a press started no swing (try ${tries + 1}); the last tap on a character: ${JSON.stringify(tap)}`);
      }
      return null;
    };
    /* what stands there is marked BEFORE the swing: the stand-in that draws
       the swing comes up after, and is the photograph */
    await Promise.all([NEW, OLD].map((P) => P.page.evaluate(() => window.__gs.markForeign())));
    const t0s = await Promise.all([swingStart(NEW), swingStart(OLD)]);
    rec.ok('both bros swing the sword (guard)', !!t0s[0] && !!t0s[1], { t0s, eq });
    if (t0s[0] && t0s[1]) {
      for (const dt of [90, 180, 260]) {
        /* each page held at its own swing's moment: the frame is the swing's */
        await Promise.all([NEW, OLD].map((P, i) => P.page.evaluate(({ T }) => { window.__gs.hold(T); window._gameState.current.isSwinging = true; }, { T: t0s[i] + dt })));
        await Promise.all([isolate(NEW, true, false), isolate(OLD, true, false)]);
        const n = await shoot(NEW, `sword-east-${dt}-new`);
        const o = await shoot(OLD, `sword-east-${dt}-old`);
        results.push({ name: `sword-east-${dt}`, n, o, same: true });
        console.log(`    sword-east-${dt}: new head ${n.head} legs ${n.pink}/${n.blue} | old head ${o.head} legs ${o.pink}/${o.blue}`);
      }
    }
    await Promise.all([letGo(NEW), letGo(OLD)]);
    await Promise.all([NEW.page.mouse.up(), OLD.page.mouse.up()]);
    await NEW.page.waitForTimeout(1200);

    const heads = results.filter((r) => r.same);
    rec.ok(`the frames compared are the same frame on both pages (${heads.length} of ${results.length}) (guard)`, heads.length >= results.length - 2,
      results.filter((r) => !r.same).map((r) => r.name));
    for (const r of results) {
      rec.ok(`${r.name}: at most ${HEAD_MAX} px of the trousers' or boots' colour in the head (${r.n.head}; ${r.o.head} as it was)`,
        r.n.top >= 0 && r.o.top >= 0 && r.n.head <= HEAD_MAX, { n: r.n, o: r.o });
    }
    const seenOld = results.reduce((a, r) => a + (r.o.head || 0), 0), seenNew = results.reduce((a, r) => a + (r.n.head || 0), 0);
    rec.ok(`the old page shows the specks the test looks for (${seenOld} px in the heads, against ${seenNew})`, seenOld >= SEEN_MIN && seenOld >= 5 * seenNew, { seenOld, seenNew });
    for (const r of heads) {
      if (r.o.pink >= 60) rec.ok(`${r.name}: the trousers keep their colour (${r.n.pink} px of pink, ${r.o.pink} as it was)`, r.n.pink >= LEGS_KEEP * r.o.pink, { n: r.n.pink, o: r.o.pink });
      if (r.o.blue >= 40) rec.ok(`${r.name}: the boots keep their colour (${r.n.blue} px of blue, ${r.o.blue} as it was)`, r.n.blue >= BOOTS_KEEP * r.o.blue, { n: r.n.blue, o: r.o.blue });
    }

    /* ── 3. the roll, east: the legs go overhead ── */
    for (const P of [NEW, OLD]) {
      const id = await H.readState(P, (S) => S.myId);
      await H.devOp(wsPort, 'vitals', id, { heal: true }).catch(() => {});
    }
    await Promise.all([face(NEW, ['d'], 0), face(OLD, ['d'], 0)]);
    /* a roll lasts a quarter of a second, so the page catches its own: the
       moment the game sets it, the clock is held part way through it (the
       roll and its frame live while the clock is inside its window) and the
       bro kept where he is (the roll moves him) */
    const roll = async (P) => {
      await P.page.evaluate(() => {
        const S = window._gameState.current;
        S.lockedTarget = null;   /* a lock makes the swipe a lunge */
        if (S.rpg) S.rpg.stamina = Math.max(S.rpg.stamina || 0, S.rpg.maxStamina || 100);
        window.__gsRoll = null;
        let v = S._dodgeRoll;
        Object.defineProperty(S, '_dodgeRoll', {
          configurable: true, enumerable: true,
          get() { return v; },
          set(x) {
            v = x;
            if (x && !window.__gsRoll) {
              window.__gsRoll = { s: x.startTime };
              window.__gs.anchor = { x: S.player.x, y: S.player.y };
              window.__gs.hold(x.startTime + 110);
            }
          },
        });
      });
      await P.page.keyboard.down('d');
      await P.page.waitForTimeout(200);
      await P.page.keyboard.press('Space');
      const r = await H.waitFor(P, () => window.__gsRoll, (v) => !!v, { timeout: 3000, label: 'a roll' }).catch(() => null);
      await P.page.keyboard.up('d');
      /* the game's own field back, the roll still in it */
      await P.page.evaluate(() => { const S = window._gameState.current, v = S._dodgeRoll; delete S._dodgeRoll; S._dodgeRoll = v; });
      return r;
    };
    const rolls = await Promise.all([roll(NEW), roll(OLD)]);
    rec.ok('both bros roll (guard)', !!rolls[0] && !!rolls[1], rolls);
    if (rolls[0] && rolls[1]) {
      await Promise.all([isolate(NEW, true), isolate(OLD, true)]);
      const n = await shoot(NEW, 'roll-east-new');
      const o = await shoot(OLD, 'roll-east-old');
      console.log(`    roll-east: new ${n.pinkAll}/${n.blueAll} (${n.pose.pose}/${n.pose.frame}) | old ${o.pinkAll}/${o.blueAll} (${o.pose.pose}/${o.pose.frame})`);
      const sameRoll = n.pose.pose === o.pose.pose && n.pose.frame === o.pose.frame;
      rec.ok(`the roll, east (frame ${n.pose.frame}): the trousers and boots keep their colour overhead (${n.pinkAll} pink and ${n.blueAll} blue, ${o.pinkAll} and ${o.blueAll} as it was)`,
        sameRoll && n.pose.pose === 'dodge' && n.pinkAll >= LEGS_KEEP * o.pinkAll && n.blueAll >= BOOTS_KEEP * o.blueAll && o.blueAll >= 40, { n, o });
    }
    await Promise.all([letGo(NEW), letGo(OLD)]);

    /* ── 4. what the bake did ── */
    const after = await Promise.all([NEW, OLD].map((P) => P.page.evaluate(() => window.__btGarmentSpecks())));
    const judged = Object.keys(after[0].left || {});
    const walking = judged.filter((k) => /^(stand|jog|hit|dodge)-/.test(k));
    console.log('    the new page\'s bakes, garment pixels left in the art\'s colour:', JSON.stringify(after[0].left));
    rec.ok(`the new page judged its walking sheets (${walking.length}: ${walking.slice(0, 6).join(', ')}...)`, walking.length >= 8, after[0].left);
    rec.ok('the old page judged nothing', Object.keys(after[1].left || {}).length === 0, after[1].left);
    for (const [who, P] of [['the new page', NEW], ['the old page', OLD]]) {
      const same = await P.page.evaluate(() => (window.__gs ? window.__gs.same() : null)).catch(() => null);
      rec.ok(`${who}'s renderer was never rebuilt under the test (guard)`, same !== false, same);
    }
    rec.ok(`no page errors (${errors.length})`, errors.length === 0, errors.slice(0, 5));
  } finally {
    for (const P of pages) await P.ctx.close().catch(() => {});
  }
}
