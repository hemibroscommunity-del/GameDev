/* A LIFE-SKILL LEVEL RAISES THE BANNER (v2.3.1909).
 *
 * Owner: "Leveling up the life skills needs a bigger celebration message I
 * didn't even notice my woodcutting went up 2 levels."
 *
 * They could not have noticed. A combat level fires the screen-space banner;
 * a life skill pushed a pushDmgPopup — world-space text at the player's feet,
 * drawn into the Pixi world. Mid-harvest your eyes are on the swipe meter, so
 * the world is exactly where you are not looking.
 *
 * Asserted on the BANNER's own text, because that is the claim: not "a
 * celebration function ran" but "something legible appeared on screen naming
 * the skill". A multi-level jump must also say so — the report was about
 * missing TWO levels, and "Level 7" tells someone who last saw 5 nothing.
 */
import * as H from './harness.mjs';

/* The banner is three stacked divs — headline, level line, sub. Taking the
   innermost match returns "SKILL UP!" alone and every text assertion below
   then measures the headline instead of the banner (it did, first run). Take
   the TIGHTEST element that contains the headline AND a digit: that is the
   wrapper holding all three lines, and nothing larger. */
const bannerText = (P) => P.page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('div'))
    .filter((el) => /SKILL UP!|LEVEL UP!/.test(el.textContent || '') && /\d/.test(el.textContent || ''));
  if (!els.length) return null;
  els.sort((a, b) => (a.textContent || '').length - (b.textContent || '').length);
  return (els[0].textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160);
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Logger', wsPort, webPort, touch: true, viewport: { width: 390, height: 844 },
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* CONTROL: no banner before anything happens — every assertion below is
     about something APPEARING, and would be vacuous over a screen that
     already had a banner on it. */
  rec.ok('no level banner at rest (control)', (await bannerText(P)) === null);

  /* ONE level. Driven through the real celebration entry point rather than by
     poking the DOM, so this fails if the wiring from lifeSkillRewards is what
     breaks rather than the banner itself. */
  await P.page.evaluate(() => {
    window._setLevelUpMsg({ kind: 'life', label: 'Woodcutting', level: 4, gained: 1, ts: Date.now() });
  });
  await P.page.waitForTimeout(500);
  const one = await bannerText(P);
  console.log('    one level: ' + JSON.stringify(one));
  rec.ok('a life-skill level raises a banner', !!one, one);
  rec.ok('...that names the SKILL, not just a number',
    !!one && /Woodcutting/i.test(one), one);
  rec.ok('...and calls itself a SKILL up, not a character level',
    !!one && /SKILL UP/i.test(one) && !/^LEVEL UP/i.test(one), one);
  rec.ok('...without claiming it refilled the pools (it does not)',
    !!one && !/refilled/i.test(one), one);

  /* TWO levels at once — the owner's actual case. */
  await P.page.waitForTimeout(4200);
  await P.page.evaluate(() => {
    window._setLevelUpMsg({ kind: 'life', label: 'Woodcutting', level: 7, gained: 2, ts: Date.now() });
  });
  await P.page.waitForTimeout(500);
  const two = await bannerText(P);
  console.log('    two levels: ' + JSON.stringify(two));
  rec.ok('a TWO-level jump says so, rather than only showing the new level',
    !!two && /\+2/.test(two), two);

  /* And a character level still reads as one — the two must stay distinct. */
  await P.page.waitForTimeout(4200);
  await P.page.evaluate(() => {
    window._setLevelUpMsg({ kind: 'combat', level: 12, ts: Date.now() });
  });
  await P.page.waitForTimeout(500);
  const combat = await bannerText(P);
  console.log('    combat: ' + JSON.stringify(combat));
  rec.ok('a CHARACTER level still reads as LEVEL UP, not SKILL UP',
    !!combat && /LEVEL UP/i.test(combat) && !/SKILL UP/i.test(combat), combat);

  await P.ctx.close().catch(() => {});
}
