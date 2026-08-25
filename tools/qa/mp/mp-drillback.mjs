/* THE DRILL BACK-CHIP HAS ITS OWN SPACE (v2.3.1922).
 *
 * Owner, with a screenshot of the Weapons sheet: "The char stats should be
 * raised up to fit the window better.  The gold amount is over the back
 * button."
 *
 * Both halves come from one fact.  The band's toolbar row is ABSOLUTE (it must
 * be: anything in the flex flow hops when a sheet closes and its content
 * unmounts, v2.3.1307b), and the drill header used to be a 44px row in the
 * flow at the band's top — the same pixels.  So the header was painted
 * underneath the toolbar, its title ran behind the nav buttons, its back chip
 * ran under the gold readout, and the body below it then paid a SECOND 52px to
 * reserve the toolbar it had already been buried by.
 *
 * This has now been fixed twice.  v2.3.1689 answered the first report ("the
 * exit button ... appears behind the character icon") by padding the header
 * 52px past the Hero portrait, whose right edge was 44.  The portrait later
 * gave that corner up to the gold readout (v2.3.1635) and the collision came
 * straight back at a different x — which is the argument for a test rather
 * than for a third offset: a hand-tuned number against one neighbour cannot
 * know about the next one.
 *
 * So the assertions are about RELATIONSHIPS, not coordinates:
 *
 *   1. The back chip is on screen and big enough to hit.
 *   2. It overlaps nothing else drawn in the toolbar row.  Not "it is left of
 *      the gold" — anything that lands in that row later must fail this too.
 *   3. The band reserves the toolbar ONCE.  The panel body starts at the
 *      toolbar's bottom edge, not 44px below it; a second reservation is the
 *      dead band the owner photographed.
 *
 * Point 3 is what "raised up to fit the window better" actually means, and it
 * is worth 44px — on the Weapons sheet that is its fifth channel row.
 */
import * as H from './harness.mjs';

const overlaps = (a, b) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Driller', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* The Weapons sheet — a drilled child, pushed the way the band's COMBAT
     pill pushes it. */
  await P.page.evaluate(() => { try { window.__broDashPanelBus.push('t2'); } catch (e) {} });
  await P.page.waitForTimeout(1500);

  const m = await P.page.evaluate(() => {
    const band = document.querySelector('.bt-dashboard');
    if (!band) return { err: 'no band' };
    const R = (n) => { const b = n.getBoundingClientRect();
      return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }; };
    const back = [...band.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === '◂');
    if (!back) return { err: 'no back chip' };
    const row = back.parentElement;
    const br = R(back);
    /* Every LEAF anywhere in the band that shares the chip's horizontal band
       of pixels — the gold coin and its count, the title, each nav button.
       Deliberately NOT scoped to the chip's own parent: the whole bug is that
       the thing sitting on the chip lives in a DIFFERENT, absolutely
       positioned subtree, so a same-parent search is exactly the search that
       cannot see it.  Leaves only, so an ancestor box that legitimately
       contains the chip is not counted as a collision with it. */
    const others = [...band.querySelectorAll('*')]
      .filter((n) => n.children.length === 0 && n !== back && !back.contains(n) && !n.contains(back))
      .map((n) => ({ t: (n.textContent || '').trim().slice(0, 12) || n.tagName, r: R(n) }))
      .filter((o) => o.r.w > 0 && o.r.h > 0 && o.r.y < br.y + br.h && br.y < o.r.y + o.r.h);
    /* The panel body is the band's flex child that is neither the toolbar row
       (absolute) nor the columns row (absolute). */
    const body = [...band.children].find((n) => getComputedStyle(n).position === 'static' && n !== row);
    return {
      band: R(band), back: R(back), row: R(row), others,
      body: body ? R(body) : null,
      innerH: window.innerHeight,
    };
  });

  if (m.err) { rec.ok('the Weapons drill opened with a back chip (guard)', false, m.err); await P.ctx.close().catch(() => {}); return; }
  console.log('   drill geo:', JSON.stringify(m));

  rec.ok('the Weapons drill opened with a back chip (guard)', true);
  rec.ok('...and the chip is a real touch target on screen',
    m.back.w >= 32 && m.back.h >= 32 && m.back.x >= 0 && m.back.y >= 0
      && m.back.x + m.back.w <= 390 && m.back.y + m.back.h <= m.innerH,
    JSON.stringify(m.back));

  const hits = m.others.filter((o) => overlaps(m.back, o.r));
  rec.ok('...and nothing else in the toolbar row is drawn over it',
    hits.length === 0, hits.map((h) => `${h.t} @${h.r.x},${h.r.y} ${h.r.w}x${h.r.h}`).join(' | '));

  /* ONE reservation.  The body may start a pixel or two off from rounding;
     44 (a whole second header) is the failure this is looking for. */
  const gap = m.body ? m.body.y - (m.row.y + m.row.h) : null;
  rec.ok('the panel body starts at the toolbar row, not a header below it',
    gap != null && gap >= -2 && gap <= 8,
    `body ${m.body && m.body.y} vs row bottom ${m.row.y + m.row.h} (gap ${gap})`);

  /* And the height that buys, stated as the invariant rather than as a number:
     the body fills what the band has left under the toolbar. */
  const want = m.band.y + m.band.h - (m.row.y + m.row.h);
  rec.ok('...so the body gets the whole rest of the band',
    m.body != null && Math.abs(m.body.h - want) <= 8,
    `body ${m.body && m.body.h} vs available ${want}`);

  await P.ctx.close().catch(() => {});
}
