/* IS ANY TEXT TOO SMALL, AND DID MAKING IT BIGGER CUT ANYTHING OFF? (v2.3.2464)
 *
 * ── THE ASK ──
 * Owner: "Make all font in the game at least the equivalent of size 8 font."
 * 8pt is 10.67px at the standard web mapping, so the floor is 11px -- which is
 * also, already, the game's single most common size (383 sites against 230 at
 * 12 and 202 at 13).  So this is less a redesign than a consolidation: ~200
 * sites had drifted below the house body size and are brought back up to it.
 *
 * ── WHY A TEST AND NOT A SCREENSHOT PASS ──
 * A font floor is the kind of change that looks finished in the diff and
 * breaks somewhere nobody opens.  Two failure modes, both silent:
 *
 *   1. A SITE GETS MISSED.  ~200 edits across 43 files, and any one left
 *      behind is invisible until a player squints at it.  So this asserts the
 *      floor as a PROPERTY of the rendered page -- every visible text element
 *      is >= 11px -- rather than trusting the sweep that produced it.
 *   2. BIGGER TEXT GETS CLIPPED.  A +1px glyph in a box sized to the old one
 *      overflows, and `overflow:hidden` means it just silently disappears.
 *      So this also measures, for every panel, any element whose text is being
 *      CUT OFF by its own box.
 *
 * ── WHAT IS DELIBERATELY EXEMPT ──
 * The floating labels drawn in the game WORLD (loot names, NPC names, pickup
 * timers) are PixiJS text in world space, not DOM: their on-screen size is the
 * literal number times the camera, and raising them would make them up to 57%
 * bigger over the ground.  The owner was asked and chose to leave them; they
 * are not in the DOM this walks, so they are out of scope by construction
 * rather than by an exclusion list that could rot.
 *
 *   node tools/qa/mp/run.mjs textfloor
 */
import * as H from './harness.mjs';

const FLOOR = 11;

/* Panels are opened through window._uiPanels, the same handle qa-ui-shots.mjs
   drives.  (That tool's own LOGIN sequence is stale -- it types into the first
   input and presses Enter, which no longer reaches the world now that the door
   is Continue / Create Character -- so this uses the harness's maintained
   enterWorld instead of copying it.) */
const BOOLS = ['inventory', 'skills', 'stats', 'shop', 'social', 'leaderboard',
  'encyclopedia', 'info', 'emotes', 'clan', 'guild', 'feedback', 'petHouse',
  'furniture', 'playerList'];
const BUILDINGS = ['shop', 'bank', 'enchant', 'cook', 'farm', 'gamble',
  'exchange', 'forge', 'woodwork', 'gemcut'];

/* Measured in the page. A box counts as CLIPPING only if it both overflows and
   hides the overflow -- a scrollable list that overflows is doing its job, and
   counting those would bury the real findings. */
const PROBE = `(() => {
  const small = [], clipped = [];
  let seen = 0;
  for (const el of document.querySelectorAll('*')) {
    const t = (el.textContent || '').trim();
    if (!t) continue;
    if (el.children.length && Array.from(el.children).some((c) => (c.textContent || '').trim())) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    seen++;
    const id = el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(/\\s+/).slice(0, 2).join('.')
      + ' :: ' + t.slice(0, 34);
    const fs = parseFloat(cs.fontSize);
    if (fs > 0 && fs < ${FLOOR} - 0.01) small.push({ id, fontSize: fs });
    const hidesX = cs.overflowX === 'hidden' || cs.overflowX === 'clip' || cs.textOverflow === 'ellipsis';
    const hidesY = cs.overflowY === 'hidden' || cs.overflowY === 'clip';
    const cx = hidesX && el.scrollWidth > el.clientWidth + 1;
    const cy = hidesY && el.scrollHeight > el.clientHeight + 1;
    if (cx || cy) clipped.push({ id, fontSize: fs, axis: cx ? 'x' : 'y',
      over: cx ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight });
  }
  return { seen, small, clipped };
})()`;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Floor', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1200);

  const ready = await P.page.evaluate(() => !!window._uiPanels
    && Object.keys(window._uiPanels).length > 5);
  rec.ok('the panel handles this scenario drives are present (guard)', ready);
  if (!ready) { await P.ctx.close().catch(() => {}); return; }

  const small = {}, clipped = {};
  let totalSeen = 0, panels = 0;

  const sweep = async (key, openFn) => {
    await P.page.evaluate(() => {
      for (const [k, fn] of Object.entries(window._uiPanels || {})) {
        try { fn(k === 'building' ? null : false); } catch (e) {}
      }
    });
    await P.page.waitForTimeout(250);
    try { await P.page.evaluate(openFn); } catch (e) { return; }
    await P.page.waitForTimeout(500);
    let r;
    try { r = await P.page.evaluate(PROBE); } catch (e) { return; }
    totalSeen += r.seen;
    if (r.seen > 0) panels++;
    for (const s of r.small) small[`${key} | ${s.id}`] = s.fontSize;
    for (const c of r.clipped) clipped[`${key} | ${c.id}`] = c;
  };

  await sweep('hud', '(() => true)()');
  for (const k of BOOLS) {
    await sweep(k, `(() => { try { window._uiPanels[${JSON.stringify(k)}](true); } catch (e) {} return true; })()`);
  }
  for (const b of BUILDINGS) {
    await sweep(`building-${b}`, `(() => { try { window._uiPanels.building(${JSON.stringify(b)}); } catch (e) {} return true; })()`);
  }

  /* ── THE GUARD THAT MAKES THE REST MEAN ANYTHING ──
     A sweep that reached nothing reports zero violations and looks like a
     pass.  That is exactly how a first cut of this scenario "passed": it
     copied qa-ui-shots' stale login flow, never left the door, and measured a
     67-element page.  So the run must prove it SAW the UI before any absence
     of findings is allowed to count as good news. */
  rec.ok(`the sweep actually rendered the UI (${panels} panels, ${totalSeen} text elements)`,
    panels >= 10 && totalSeen >= 400, { panels, totalSeen });

  const smallList = Object.entries(small);
  rec.ok(`every visible text element is at least ${FLOOR}px (${smallList.length} under)`,
    smallList.length === 0,
    smallList.slice(0, 8).map(([k, v]) => `${v}px  ${k}`));

  const clipList = Object.entries(clipped);
  rec.ok(`no text is cut off by its own box (${clipList.length} clipped)`,
    clipList.length === 0,
    clipList.slice(0, 8).map(([k, v]) => `+${v.over}px ${v.axis} @${v.fontSize}px  ${k}`));

  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));

  await P.ctx.close().catch(() => {});
}
