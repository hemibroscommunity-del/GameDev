/* THE QUEST PATH CAN BE TURNED OFF, AND IT HAS A SHAPE (v2.3.2141)
 *
 * Owner: "Add an option to turn off the path guide for the quest.  Also
 * explore different options than the bead snake (effective path but beads a
 * little strange)."
 *
 * One setting with four values -- Arrows (the new default), Ribbon, Beads
 * (what shipped at v2.3.2121) and Off.
 *
 * ═══ THE ASSERTION THAT MATTERS IS "OFF DRAWS NOTHING WHILE THE ROUTE IS
 * STILL THERE" ═══
 * "Nothing was drawn" and "the road had nowhere to point" look identical from
 * outside, and only one of them is the feature working.  __btQuestRoad is
 * reset at the top of every draw and reports `to` BEFORE the off switch is
 * consulted, so this scenario can hold both halves at once: the route
 * resolved to Mayor Bro, and not one mark was drawn.  Without that ordering
 * an off switch is untestable -- it would pass just as well in a town where
 * the quest system was broken.
 *
 * ═══ AND THAT A STYLE CHANGES THE DRAWING, NOT JUST THE LABEL ═══
 * Every style walks the same path with the same falloff; what differs is the
 * shape and therefore the SPACING (a chevron needs room, a ribbon is sampled
 * fine enough that its round caps overlap into one line).  So the mark count
 * separates them by construction -- ribbon >> beads > arrows over the same
 * road.  A style that only renamed itself would report identical counts, and
 * this is the cheapest honest way to see the renderer actually switched.
 *
 * ═══ AND THAT THE SETTINGS ROW IS WIRED ═══
 * Driven through the real panel, not the module: a preference with no control
 * on it is a preference nobody has.  (TRAPS §18 in its client form -- a
 * feature needs the store AND the thing that writes to it.)
 */
import * as H from './harness.mjs';

const road = (P) => P.page.evaluate(() => window.__btQuestRoad || null);
const setStyle = async (P, id) => {
  const got = await P.page.evaluate((s) => (window.__btTrailStyle ? window.__btTrailStyle(s) : null), id);
  await P.page.waitForTimeout(500);   /* a few frames, so the probe is the new style's */
  return got;
};

export async function run({ browser, wsPort, webPort, rec }) {
  /* A brand-new bro in town: the road points at Mayor Bro with nothing
     accepted (v2.3.2121), which is the shortest way to a live route. */
  const P = await H.newPlayer(browser, {
    name: 'Pathy', wsPort, webPort, touch: true, viewport: { width: 390, height: 844 },
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3800);

  const first = await road(P);
  console.log('    default: ' + JSON.stringify(first));
  rec.ok('the road probe is live and pointing somewhere (guard)',
    !!first && !!first.to, first);
  rec.ok('the default style is Arrows, not the bead snake',
    !!first && first.style === 'arrows', first);
  rec.ok('...and the road is drawn in it', !!first && first.motes > 0, first);
  const arrows = first ? first.motes : 0;

  /* ── OFF ── */
  rec.ok('the trail-style handle accepts Off', (await setStyle(P, 'off')) === 'off');
  const off = await road(P);
  console.log('    off: ' + JSON.stringify(off));
  rec.ok('switched Off, the road draws nothing at all',
    !!off && off.style === 'off' && off.motes === 0, off);
  /* The half that makes the assertion above mean something. */
  rec.ok('...while the route it would have drawn is still resolved',
    !!off && !!off.to && off.to.npc === 'Mayor Bro',
    { to: off && off.to, note: 'Off must be a decision, not a broken quest system' });

  /* ── AND BACK, which is the bug an off switch usually has ── */
  await setStyle(P, 'beads');
  const beads = await road(P);
  console.log('    beads: ' + JSON.stringify(beads));
  rec.ok('turning it back on draws the road again',
    !!beads && beads.style === 'beads' && beads.motes > 0, beads);

  await setStyle(P, 'ribbon');
  const ribbon = await road(P);
  console.log('    ribbon: ' + JSON.stringify(ribbon));
  rec.ok('the Ribbon draws too', !!ribbon && ribbon.style === 'ribbon' && ribbon.motes > 0, ribbon);

  /* Same road, same falloff, different spacing — so the counts must separate.
     Equal counts would mean the style changed the label and nothing else. */
  /* One shot per style, on the same screen with the same road, so the three
     can be compared side by side -- the owner asked to SEE options, and a
     mark count is not an option you can look at. */
  /* The coach card sits directly over the stretch of ground the road runs
     along on this screen, so it is dismissed first -- otherwise all three
     shots are pictures of the same tip. */
  await P.page.evaluate(() => {
    const x = document.querySelector('[data-coach-dismiss]');
    if (x) x.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  await P.page.waitForTimeout(600);
  for (const id of ['arrows', 'ribbon', 'beads']) {
    await setStyle(P, id);
    await P.page.screenshot({ path: `/home/user/GameDev/tools/qa/mp/out/pathstyle-${id}.png` });
  }

  const counts = { arrows, beads: beads ? beads.motes : 0, ribbon: ribbon ? ribbon.motes : 0 };
  console.log('    marks per style: ' + JSON.stringify(counts));
  rec.ok('each style really draws a different road, not the same one renamed',
    counts.ribbon > counts.beads && counts.beads > counts.arrows, counts);

  /* ── IT SURVIVES A RELOAD ──
     A preference that resets on the next visit is one the player has to set
     every session, which is worse than not having it. */
  await setStyle(P, 'off');
  await P.page.reload({ waitUntil: 'domcontentloaded' });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3800);
  const after = await P.page.evaluate(() => (window.__btTrailStyle ? window.__btTrailStyle() : null));
  rec.ok('the choice survives a reload', after === 'off', { after });
  const afterRoad = await road(P);
  rec.ok('...and the road is still off after it',
    !!afterRoad && afterRoad.motes === 0, afterRoad);

  /* ── THE SETTINGS ROW ──
     The whole point: a player reaches this through More -> Settings, not
     through a console handle. */
  await P.page.evaluate(() => window.__broDashPanelBus.open('more'));
  await P.page.waitForTimeout(300);
  const opened = await P.page.evaluate(() => {
    const t = document.querySelector('[data-more-tile="settings"]');
    if (!t) return false;
    t.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    return true;
  });
  await P.page.waitForTimeout(600);
  rec.ok('Settings opens from the More menu (guard)', opened);

  const chips = await P.page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-trailstyle]'))
      .map((b) => ({ id: b.getAttribute('data-trailstyle'), on: b.getAttribute('aria-pressed') === 'true',
        h: Math.round(b.getBoundingClientRect().height) })));
  console.log('    chips: ' + JSON.stringify(chips));
  rec.ok('Settings offers all four values of the quest path',
    chips.length === 4 && ['arrows', 'ribbon', 'beads', 'off'].every((id) => chips.some((c) => c.id === id)),
    chips);
  /* It shows what is actually set, rather than defaulting its own display —
     a picker that opens on the wrong value is how a player turns a setting
     "on" that was already on. */
  rec.ok('...and it opens showing the one that is actually set',
    chips.filter((c) => c.on).length === 1 && chips.find((c) => c.on).id === 'off', chips);
  /* Primary platform is iPhone Safari and this row has no keyboard to make
     room for, so there is no excuse for missing the 44pt touch floor. */
  rec.ok('...on chips that meet the 44pt touch floor',
    chips.every((c) => c.h >= 44), chips.map((c) => c.h));

  const tapped = await P.page.evaluate(() => {
    const b = document.querySelector('[data-trailstyle="ribbon"]');
    if (!b) return false;
    b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    return true;
  });
  await P.page.waitForTimeout(600);
  rec.ok('tapping a chip in Settings changes the setting',
    tapped && (await P.page.evaluate(() => window.__btTrailStyle())) === 'ribbon');
  await P.page.evaluate(() => window.__broDashPanelBus.clear());
  await P.page.waitForTimeout(500);
  const backOn = await road(P);
  rec.ok('...and the road on the ground obeys it',
    !!backOn && backOn.style === 'ribbon' && backOn.motes > 0, backOn);

  await P.ctx.close().catch(() => {});
}
