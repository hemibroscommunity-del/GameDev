/* IS THE ROLL BAKED BEFORE YOU ROLL? (v2.3.2083)
 *
 * ── THE LAW, AND THE HALF OF IT THAT WAS NOT KEPT ──
 * CLAUDE.md: every animation asset loads during the loading screen, and a
 * "load on first use" is a bug.  For a player who has changed their skin,
 * trousers, shoes, eyes or drawn on themselves, the asset is not just the PNG
 * -- it is the RECOLOURED BAKE of it, a canvas pass over the whole strip -- and
 * until that lands `getBodyFrame` falls back to the un-recoloured base frame.
 * On the first dodge roll that is a flash of default skin and default trousers.
 *
 * v2.3.1534 saw this and added 'dodge' to entityRenderer's PREWARM_POSES.  That
 * loop is `prewarmMaskedBodyFrames`, whose first statement is
 *
 *     if (!slots.some((sl) => getEquip(sl) !== 'none')) return;
 *
 * because its own job is compositing ARMOUR onto a body; the body bake merely
 * rides along inside it.  So the fix landed for players wearing a breastplate
 * and for nobody else, and a customised player in a t-shirt -- everyone, for
 * their first few hours -- still flashed default skin on their first roll.
 * v2.3.2083 moves it to `preloadBodyAll`, the everyone-path.
 *
 * ── WHY THIS READS A CACHE AND NOT A SCREENSHOT ──
 * The law is a claim about WHEN, and a screenshot cannot see when: a roll that
 * was preloaded and a roll that baked one frame late are the same picture the
 * moment the bake lands.  A scenario that photographed the first roll frame
 * would be racing the very bake it is trying to catch, and would pass or fail
 * on how busy the machine was.  So this asks the cache, BEFORE the character
 * has ever rolled, whether the sheets already exist.  Nothing but a preload can
 * make that true.
 *
 * The control matters as much as the claim: `preloadBodyAll` returns early for
 * a DEFAULT-looking player (nothing to recolour, the base sheets are correct as
 * shipped), so a character who is not actually customised would report no bakes
 * at all and the dodge check would be vacuous rather than passing.  Hence the
 * two guards below: the look is really set, and the jog sheets -- preloaded
 * since long before this -- are really there.
 */
import * as H from './harness.mjs';

/* Nobody's default, so a bake keyed on this look cannot be somebody else's. */
const LOOK = { 'bt-skin': 'porcelain', 'bt-pants': 'red', 'bt-shoes': 'tan' };

/* The keys are `<skin>/<pants>/<shoes>/<shirt>/<eye><art>|<pose>/<dir>`
   (playerSkins bodySheetKey), so the pose and facing are the tail. */
const has = (keys, tail) => keys.some((k) => k.endsWith('|' + tail));

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Roller', wsPort, webPort });
  await P.page.evaluate((look) => {
    for (const k of Object.keys(look)) localStorage.setItem(k, look[k]);
  }, LOOK);
  await P.page.reload({ waitUntil: 'domcontentloaded' });
  await P.page.waitForTimeout(1200);
  const created = await P.page.$('[data-tut="login-create"]');
  if (created) await created.click();
  await H.enterWorld(P).catch(() => {});
  /* Long enough for the intro gate's preload to have finished -- which is the
     thing under test, so it is given room rather than raced. */
  await P.page.waitForTimeout(4000);

  const look = await P.page.evaluate(() => {
    const g = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
    return { skin: g('bt-skin'), pants: g('bt-pants'), shoes: g('bt-shoes') };
  });
  rec.ok('the character really is recoloured, so there are bakes to look for (guard)',
    look.skin === 'porcelain' && look.pants === 'red' && look.shoes === 'tan', look);

  const keys = await P.page.evaluate(() => (window.__btBodySheetKeys
    ? window.__btBodySheetKeys() : null));
  rec.ok('the renderer offers the baked-sheet probe (guard)', Array.isArray(keys),
    keys === null ? 'no probe' : keys);
  if (!Array.isArray(keys)) { await P.ctx.close(); return; }

  const poses = [...new Set(keys.map((k) => k.split('|')[1] || '').map((t) => t.split('/')[0]))]
    .filter(Boolean).sort();
  rec.ok(`the loading screen baked the poses it always did (${poses.join(', ')}) (guard)`,
    has(keys, 'jog/south') && has(keys, 'jog/east') && has(keys, 'stand/south'),
    { poses, n: keys.length });

  /* THE REGRESSION.  Asked before a single roll has happened. */
  rec.ok('THE LAW: the dodge roll is baked during loading, not on the first roll',
    has(keys, 'dodge/south') && has(keys, 'dodge/east'),
    { dodge: keys.filter((k) => k.indexOf('|dodge/') !== -1), poses });

  /* And it is not the roll itself that made it true -- roll now, and the set
     must be unchanged.  A pose that baked HERE would show up as a new key. */
  const before = keys.length;
  await H.callFn(P, 'contextualDodge', 0).catch(() => {});
  await P.page.waitForTimeout(1200);
  const after = await P.page.evaluate(() => window.__btBodySheetKeys());
  const fresh = after.filter((k) => keys.indexOf(k) === -1);
  rec.ok('...and rolling bakes nothing new, because it was all there already',
    fresh.length === 0, { before, after: after.length, fresh: fresh.slice(0, 6) });

  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await P.ctx.close();
}
