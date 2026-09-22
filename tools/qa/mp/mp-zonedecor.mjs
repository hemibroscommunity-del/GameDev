/* ═══ FROST'S DECOR LOADS WITH ITS ZONE, AND NOT BEFORE  (v2.3.2644) ═══
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
  rec.ok('in frost, all six decor sprites are resident',
    frostBundles.length === DECOR.length, { frostBundles });

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
  const py = await H.readState(P, (S) => S.player && S.player.y);
  const sides = drawn.filter((p) => byId[p.id] && String(p.id).indexOf('frost-') === 0)
    .map((p) => ({ id: p.id, y: p.y, layer: p.layer, wantFront: p.y > py }));
  const misSorted = sides.filter((s) => s.layer !== (s.wantFront ? 'gatherNodesFront' : 'entities'));
  rec.ok('every decor prop is on the correct side of the player for its ground line',
    misSorted.length === 0, { playerY: Math.round(py), misSorted });

  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/zonedecor-frost.png` })
    .catch(() => { /* a screenshot is evidence, not an assertion */ });

  /* ── 4. LEAVING RELEASES IT ── */
  await openPanel(P);
  await tap(P, 'Town');
  await H.waitFor(P, (S) => S.currentZone, (z) => z === 'town',
    { timeout: 90000, label: 'back to town' });
  await P.page.waitForTimeout(3500);

  const afterBundles = await decorBundles(P);
  rec.ok('leaving frost RELEASES its decor (the half v2.3.1405 forgot)',
    afterBundles.length === 0, { afterBundles });

  const afterProps = await propsDrawn(P);
  rec.ok('and no frost prop is drawn back in town',
    afterProps.every((p) => String(p.id).indexOf('frost-') !== 0),
    { ids: afterProps.map((p) => p.id) });

  await P.ctx.close().catch(() => {});
}
