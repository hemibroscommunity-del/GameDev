/* ═══ FROST'S DECOR LOADS WITH ITS ZONE, AND NOT BEFORE  (v2.3.2651) ═══
 *
 * Frost Ridge got six free-standing props (worldProps.js) so that the dynamic
 * occlusion of v2.3.2633 finally applies somewhere outside town.  Their art is
 * PER-ZONE: ~1MB of fetch and ~2.4MB of decoded RGBA that mean nothing in any
 * other zone, so it loads in `preloadZoneAssets` and is released by
 * `freeZoneAssets`, per the ZONE-ASSET EXCEPTION in CLAUDE.md.
 *
 * THREE THINGS ARE ASSERTED, AND THE FIRST IS THE ONE THAT MATTERS.
 *
 *  1. IN TOWN, NONE OF IT IS RESIDENT.  This is the whole point of the change
 *     and it is the assertion a lazy implementation passes every other test
 *     without.  Before this, `propSpriteSources()` handed the entire props
 *     table to the intro gate, so a frost prop added the obvious way would sit
 *     in every player's startup download and stay decoded for the life of the
 *     page -- invisible, harmless-looking, and exactly the iPhone RAM
 *     regression v2.3.1405 and v2.3.2272 were both written to undo.
 *
 *  2. IN FROST, ALL SIX ARE DRAWN.  `__btWorldProps` only lists props whose
 *     sprite is VISIBLE, and a prop is visible only once its texture has
 *     resolved -- so the six appearing at all is the proof the per-zone load
 *     finished behind the overlay rather than hitching in on first sighting.
 *     Their drawn heights are checked against the declared worldH too: a prop
 *     that loaded but scaled off its raw texture size would be drawn 2-3x too
 *     big and still pass a presence check.
 *
 *  3. LEAVING FROST RELEASES IT.  The half v2.3.1405 forgot and v2.3.2272 had
 *     to come back for: a load with no matching free is a leak that looks
 *     identical to working code until the fourth zone.
 *
 * A fourth assertion rides along because it is what the props are FOR: the
 * player walking north past a prop must put it in the front layer, and south
 * of it in the back.  mp-townprops proves that rule for town; this proves the
 * new props joined it rather than landing in some static layer of their own.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const DECOR = [
  { id: 'frost-pine-pair',   worldH: 160 },
  { id: 'frost-pine-ridge',  worldH: 150 },
  { id: 'frost-rock-ridge',  worldH: 120 },
  { id: 'frost-rock-mound',  worldH: 130 },
  { id: 'frost-ice-mound',   worldH: 100 },
  { id: 'frost-snow-shrubs', worldH: 80 },
];

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

const panelUp = (P) => P.page.evaluate(() =>
  !!Array.from(document.querySelectorAll('strong')).find((n) => n.textContent === 'Test panel'));

const tap = (P, text) => P.page.evaluate((t) => {
  const b = Array.from(document.querySelectorAll('button')).find((n) => (n.textContent || '').indexOf(t) >= 0);
  if (!b) return false;
  b.click();
  return true;
}, text);

const openPanel = async (P) => {
  if (await panelUp(P)) return true;
  await holdTitle(P, 1500);
  await P.page.waitForTimeout(900);
  return panelUp(P);
};

const zoneOf = (P) => H.readState(P, (S) => S.currentZone);
/* Which decor bundles the texture tracker is holding. Bundles are keyed per
   SPRITE ('decor:/sprites/props/x.png'), so this counts files, not zones. */
const decorBundles = (P) => P.page.evaluate(() => {
  const b = (window.__btBundles && window.__btBundles()) || {};
  return Object.keys(b).filter((k) => k.indexOf('decor:') === 0).sort();
});
const propsDrawn = (P) => P.page.evaluate(() => (window.__btWorldProps && window.__btWorldProps()) || []);

export async function run({ browser, wsPort, webPort, rec }) {
  const devState = async (id) => (await (await fetch(
    'http://127.0.0.1:' + wsPort + '/api/admin/dev/state?id=' + encodeURIComponent(id),
    { headers: { Authorization: 'Bearer ' + H.ADMIN_KEY } })).json());

  const P = await H.newPlayer(browser, { name: 'Decor', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  const myId = await H.readState(P, (S) => S.myId);

  /* ── 1. THE STARTUP GATE IS CLEAN ── */
  const startZone = await zoneOf(P);
  rec.ok('setup: we begin in town', startZone === 'town', { startZone });

  const townBundles = await decorBundles(P);
  rec.ok('in town, NO frost decor is resident (it is not on the intro gate)',
    townBundles.length === 0, { townBundles });

  const townProps = await propsDrawn(P);
  rec.ok('in town, no frost prop is drawn',
    townProps.every((p) => String(p.id).indexOf('frost-') !== 0),
    { ids: townProps.map((p) => p.id) });

  /* ── setup: open every zone, then warp ── */
  await openPanel(P);
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
  const seeded = await devState(myId);
  rec.ok('setup: every zone is open on the worker',
    seeded.ok && seeded.zones && Object.values(seeded.zones).every(Boolean), seeded.zones);

  await openPanel(P);
  await tap(P, 'Frost Ridge');
  await H.waitFor(P, (S) => S.currentZone, (z) => z === 'frost',
    { timeout: 90000, label: 'arrive in frost' });
  /* The warp routes through the hub and the per-zone overlay; give the last
     load a beat to settle before reading what is drawn. */
  await P.page.waitForTimeout(3500);

  /* ── 2. ALL SIX ARE DRAWN, AT THE RIGHT SIZE ── */
  const frostBundles = await decorBundles(P);
  /* v2.3.2655: the count is DERIVED from the two tables the game reads rather
     than written as a number here. The first cut said `=== DECOR.length` and
     went red the moment the foreground pieces joined the same per-zone bundle
     list -- the code was right and the test was stale, which is the failure
     mode a magic number guarantees eventually. */
  const wantBundles = await P.page.evaluate(() =>
    ((window.__btBlockers && window.__btBlockers('frost')) || []).length
    + ((window.__btForeground && window.__btForeground()) || []).length);
  rec.ok('in frost, every per-zone sprite is resident (props + foreground)',
    frostBundles.length === wantBundles && frostBundles.length >= DECOR.length,
    { got: frostBundles.length, want: wantBundles, frostBundles });

  const drawn = await propsDrawn(P);
  const byId = Object.create(null);
  for (const p of drawn) byId[p.id] = p;
  const missing = DECOR.filter((d) => !byId[d.id]).map((d) => d.id);
  rec.ok('in frost, every decor prop is DRAWN (so its texture resolved behind the overlay)',
    missing.length === 0, { missing, drawn: drawn.map((p) => p.id) });

  /* Drawn height must be the DECLARED worldH, not the texture's own height --
     the failure that looks like working art and is 2-3x too big. 1px for
     rounding. */
  const wrongSize = DECOR.filter((d) => byId[d.id] && Math.abs(byId[d.id].height - d.worldH) > 1)
    .map((d) => ({ id: d.id, want: d.worldH, got: byId[d.id] && Math.round(byId[d.id].height) }));
  rec.ok('each is drawn at its declared worldH, not its texture height',
    wrongSize.length === 0, { wrongSize });

  const notBlocking = DECOR.filter((d) => byId[d.id] && !byId[d.id].blocks).map((d) => d.id);
  rec.ok('every decor prop blocks (v2.3.2073: objects are unwalkable)',
    notBlocking.length === 0, { notBlocking });

  /* ── 3. THEY JOINED THE DEPTH SORT ── */
  /* v2.3.2718: the rule is read the way the depth pass reads it -- the
     player's FEET (__btPlayerGround; S.player.y is the body's centre, ~52 px
     higher) against the prop's base WHERE THE PLAYER STANDS (__btPropGround,
     read off the art beside its footprint).  Checking it against S.player.y
     would assert the very fault v2.3.2718 fixed. */
  const pg = await P.page.evaluate(() => (window.__btPlayerGround ? window.__btPlayerGround() : null));
  const lines = await P.page.evaluate(([ids, x]) => ids.map((id) => {
    const g = window.__btPropGround && window.__btPropGround(id, x);
    return { id, line: g ? g.line : null };
  }), [drawn.map((p) => p.id), pg ? pg.x : 0]);
  const lineOf = Object.create(null);
  for (const l of lines) lineOf[l.id] = l.line;
  const sides = drawn.filter((p) => byId[p.id] && String(p.id).indexOf('frost-') === 0)
    .map((p) => {
      const line = Number.isFinite(lineOf[p.id]) ? lineOf[p.id] : p.y;
      return { id: p.id, line: Math.round(line), layer: p.layer, wantFront: !!pg && line > pg.y };
    });
  /* a prop within 3 px of the feet sits inside the pass's 2 px hysteresis
     band and may legitimately be on either side */
  const misSorted = sides.filter((s) => Math.abs(s.line - (pg ? pg.y : 0)) > 3
    && s.layer !== (s.wantFront ? 'gatherNodesFront' : 'entities'));
  rec.ok('every decor prop is on the correct side of the player for its ground line',
    !!pg && misSorted.length === 0, { feetY: pg && Math.round(pg.y), misSorted });

  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/zonedecor-frost.png` })
    .catch(() => { /* a screenshot is evidence, not an assertion */ });

  /* ── 3b. THE PROPS STOP ATTACKS (v2.3.2652) ──
     Owner: "I would like it if these props could block my and enemy attacks."

     The worker's half is unit-tested (server/test/props.test.mjs) against the
     one choke point every monster->player hit goes through. THIS is the
     client's half, and it has to be checked in the built bundle rather than in
     node: the rule is compiled into the shipped client, and a scenario that
     imported the module would be testing the source rather than the build. */
  const ridge = await P.page.evaluate(() =>
    ((window.__btBlockers && window.__btBlockers('frost')) || []).length);
  rec.ok('the client exposes frost\'s blocker boxes', ridge === 6, { ridge });

  /* frost-rock-ridge: x 430, y 570, blockW 202, blockD 42 -> box 329..531 x
     528..570. Both endpoints outside it, the line straight through. */
  const los = await P.page.evaluate(() => ({
    through: window.__btAttackBlocked('frost', 430, 480, 430, 640),
    beside: window.__btAttackBlocked('frost', 300, 480, 300, 640),
    fromInside: window.__btAttackBlocked('frost', 430, 550, 430, 700),
    point: window.__btBlockPoint('frost', 430, 480, 430, 640),
  }));
  rec.ok('a line through the rock ridge is blocked', los.through === true, los);
  rec.ok('...one beside it is not', los.beside === false, los);
  rec.ok('...and a shooter standing inside it is never blocked by it',
    los.fromInside === false, los);
  /* The impact point is what an arrow is planted at, so it must be the NEAR
     face of the box (y 528) rather than anywhere inside it. */
  rec.ok('the block reports the near face as the impact point',
    !!los.point && Math.abs(los.point.y - 528) < 1.5, { point: los.point });

  /* ── 3d. THE NEAR-CAMERA FOREGROUND (v2.3.2655) ──
     DEPTH-ROADMAP item 5. Three of the first four assets commissioned for this
     game were edge-cropped and could not be drawn by ANY code path until this
     layer existed, so the load-bearing assertion is simply that they are on
     screen -- and on the right layer, because a foreground piece that lands in
     `entities` would be sorted against the player and occlude him from the
     wrong side. */
  const fg = await P.page.evaluate(() => (window.__btForeground && window.__btForeground()) || []);
  rec.ok('all three frost foreground pieces are drawn', fg.length === 3,
    { ids: fg.map((f) => f.id) });
  rec.ok('...each on the foreground layer, not in with the props',
    fg.length > 0 && fg.every((f) => f.layer === 'foreground'),
    fg.map((f) => ({ id: f.id, layer: f.layer })));
  rec.ok('...each drawn at its declared worldH (260), not its texture height',
    fg.length > 0 && fg.every((f) => Math.abs(f.height - 260) <= 1),
    fg.map((f) => ({ id: f.id, h: Math.round(f.height) })));
  /* The peak is MIRRORED so one asset frames both sides of a map -- the reuse
     ART-ASSET-PHASES §4 asks for. If the flip silently stopped working the
     piece would still draw, just cropped on the wrong edge. */
  /* Matched by PREFIX, not by the full id: these ids carry the corner they
     sit in ('fg-peak-se'), and the corner is exactly what moves when a
     placement is corrected -- as it was once already this version. A test
     that pins the corner fails on a fix rather than on a regression. */
  const peak = fg.find((f) => String(f.id).indexOf('fg-peak') === 0);
  rec.ok('...and the peak is mirrored (one asset, both sides of a map)',
    !!peak && peak.flipX === true, peak || null);

  /* The foreground layer must sit ABOVE projectiles (a branch covers an arrow)
     and BELOW damageNumbers (a canopy must never hide the number that tells
     you how much you just took). Asserted off the published order rather than
     a screenshot, which would fail for ten unrelated reasons. */
  const order = await P.page.evaluate(() => window.__btLayerOrder || []);
  const iFg = order.indexOf('foreground');
  rec.ok('the foreground layer sits above projectiles and below the damage numbers',
    iFg > order.indexOf('projectiles') && iFg < order.indexOf('damageNumbers') && iFg > order.indexOf('player'),
    { order });

  /* ── 3c. FOOTPRINTS (v2.3.2654) ──
     The game's first grounding cue. Two things are worth pinning: the art is
     PER-ZONE (so it must be resident in frost and gone in town), and the
     prints are spawned by DISTANCE rather than by the step timer -- so a real
     walk has to produce them. hopTo cannot be used here: it teleports by
     writing S.player.x/y and leaves vx/vy at 0, and the spawner is gated on
     actually moving. */
  const printArt = await P.page.evaluate(() =>
    (window.__btFootprints && window.__btFootprints()) || []);
  rec.ok('frost holds its footprint art', printArt.indexOf('frost') >= 0, { printArt });

  /* A REAL key press, not a written velocity. The first cut of this set
     S.player.vx directly and measured `moved: 0` -- the loop does not
     integrate vx into position, it derives vx FROM the input each frame, so
     writing it is writing to an output. Pressing the key is the only honest
     way to make the bro walk. */
  await P.page.evaluate(() => { window._gameState.current.footprints = []; });
  const walkStart = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
  await H.nudge(P, 'd', 2200);
  const walk = await P.page.evaluate((w0) => {
    const S = window._gameState.current;
    const f = S.footprints || [];
    const x0 = w0.x, y0 = w0.y;
    return {
      moved: Math.round(Math.hypot(S.player.x - x0, S.player.y - y0)),
      n: f.length,
      first: f[0] ? { ang: f[0].ang, hasTs: !!f[0].ts } : null,
      /* The gap between consecutive pairs should be ~PRINT_GAP (46), not the
         per-frame step: that is what "by distance" means. */
      gap: f.length > 1 ? Math.round(Math.hypot(f[1].x - f[0].x, f[1].y - f[0].y)) : null,
    };
  }, walkStart);
  rec.ok('walking in frost actually moved the bro (guard)', walk.moved > 60, walk);
  rec.ok('...and left footprints behind', walk.n > 0, walk);
  rec.ok('...spaced by distance (~46px), not by frame', 
    walk.gap === null || (walk.gap >= 40 && walk.gap <= 56), walk);
  rec.ok('...each carrying a travel angle and a timestamp',
    !!walk.first && walk.first.hasTs && Number.isFinite(walk.first.ang), walk);

  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/zonedecor-footprints.png` })
    .catch(() => { /* evidence, not an assertion */ });

  /* ── 4. LEAVING RELEASES IT ── */
  await openPanel(P);
  await tap(P, 'Town');
  await H.waitFor(P, (S) => S.currentZone, (z) => z === 'town',
    { timeout: 90000, label: 'back to town' });
  await P.page.waitForTimeout(3500);

  const afterBundles = await decorBundles(P);
  rec.ok('leaving frost RELEASES its decor (the half v2.3.1405 forgot)',
    afterBundles.length === 0, { afterBundles });

  const fgAfter = await P.page.evaluate(() => (window.__btForeground && window.__btForeground()) || []);
  rec.ok('...and no foreground piece is drawn back in town', fgAfter.length === 0,
    { ids: fgAfter.map((f) => f.id) });

  const printAfter = await P.page.evaluate(() =>
    (window.__btFootprints && window.__btFootprints()) || []);
  rec.ok('...and the footprint art is released with it',
    printAfter.indexOf('frost') < 0, { printAfter });

  const afterProps = await propsDrawn(P);
  rec.ok('and no frost prop is drawn back in town',
    afterProps.every((p) => String(p.id).indexOf('frost-') !== 0),
    { ids: afterProps.map((p) => p.id) });

  await P.ctx.close().catch(() => {});
}
