/* A LIFE-SKILL LEVEL RAISES THE CELEBRATION (v2.3.1915; re-aimed v2.3.2591).
 *
 * Owner: "Leveling up the life skills needs a bigger celebration message I
 * didn't even notice my woodcutting went up 2 levels."
 *
 * They could not have noticed. A combat level fired the screen-space banner;
 * a life skill pushed a pushDmgPopup — world-space text at the player's feet,
 * drawn into the Pixi world. Mid-harvest your eyes are on the swipe meter, so
 * the world is exactly where you are not looking.
 *
 * ═══ WHAT v2.3.2591 CHANGED, AND WHAT IT DID NOT ═══
 *
 * The owner replaced the notification itself: "a new level up notification
 * instead of the one that currently exists upon leveling up both lifeskills
 * and combat skills", with their own art and the skill's icon in the medallion.
 * So the SHAPE this file reads is new — a burst with an icon and a caption,
 * not three stacked text divs — and the headline no longer distinguishes the
 * two kinds, because both now wear one piece of art that says LEVEL UP.
 *
 * Every CLAIM survives, which is why this file was re-aimed rather than
 * deleted. Each assertion below is the same promise it always made:
 * something legible appears, it names the skill, it does not pass itself off
 * as a character level, it does not claim to have refilled the pools, and a
 * multi-level jump says so. Only the evidence moved.
 *
 * The one addition is the ICON, because that is the new claim: the owner
 * asked for "the icon representing that combat skill or life skill anchored
 * in the middle circle", and a burst that renders the wrong icon — or the
 * fallback — is the failure they would see first.
 */
import * as H from './harness.mjs';

/* The whole notification: its caption text and which icon it seated. */
const burst = (P) => P.page.evaluate(() => {
  const cap = document.querySelector('[data-levelup-caption]');
  const icon = document.querySelector('[data-levelup-icon]');
  if (!cap && !icon) return null;
  return {
    text: ((cap && cap.textContent) || '').replace(/\s+/g, ' ').trim().slice(0, 160),
    icon: icon ? (icon.getAttribute('src') || '').split('/').pop().split('?')[0] : null,
    /* `complete && naturalWidth` is the difference between "an <img> is there"
       and "a picture is there" — a 404 renders a broken-image glyph inside
       the medallion, which is worse than the notification it replaced. */
    iconDrawn: !!(icon && icon.complete && icon.naturalWidth > 0),
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Logger', wsPort, webPort, touch: true, viewport: { width: 390, height: 844 },
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* CONTROL: nothing on screen before anything happens — every assertion
     below is about something APPEARING, and would be vacuous over a screen
     that already had a celebration on it. */
  rec.ok('no level celebration at rest (control)', (await burst(P)) === null);

  /* ONE level, through the real entry point (the same React setter every
     level-up path in the game calls) rather than by poking the DOM, so this
     fails if the wiring is what breaks rather than the art. */
  await P.page.evaluate(() => {
    window._setLevelUpMsg({ kind: 'life', skill: 'woodcutting', label: 'Woodcutting', level: 4, gained: 1, ts: Date.now() });
  });
  await P.page.waitForTimeout(800);
  const one = await burst(P);
  console.log('    one level: ' + JSON.stringify(one));
  rec.ok('a life-skill level raises the celebration', !!one, one);
  rec.ok('...that names the SKILL, not just a number',
    !!one && /Woodcutting/i.test(one.text), one);
  /* v2.3.2591: the headline used to carry this ("SKILL UP!" against "LEVEL
     UP!") and the shared art cannot, so the caption carries it instead. */
  rec.ok('...and calls itself a SKILL level, not a character level',
    !!one && /Skill Level/i.test(one.text), one);
  rec.ok('...without claiming it refilled the pools (it does not)',
    !!one && !/refilled/i.test(one.text), one);
  /* v2.3.2591: the icon, and that it actually DREW. */
  rec.ok('...with the woodcutting icon seated in the medallion, and drawn',
    !!one && one.icon === 'skill-woodcutting.webp' && one.iconDrawn, one);

  /* TWO levels at once — the owner's actual case. */
  await P.page.waitForTimeout(3200);
  await P.page.evaluate(() => {
    window._setLevelUpMsg({ kind: 'life', skill: 'woodcutting', label: 'Woodcutting', level: 7, gained: 2, ts: Date.now() });
  });
  await P.page.waitForTimeout(800);
  const two = await burst(P);
  console.log('    two levels: ' + JSON.stringify(two));
  rec.ok('a TWO-level jump says so, rather than only showing the new level',
    !!two && /\+2/.test(two.text), two);

  /* And a character level still reads as one — the two must stay distinct. */
  await P.page.waitForTimeout(3200);
  await P.page.evaluate(() => {
    window._setLevelUpMsg({ kind: 'combat', level: 12, skill: 'bow', skillLabel: 'Bow', skillLevel: 5, ts: Date.now() });
  });
  await P.page.waitForTimeout(800);
  const combat = await burst(P);
  console.log('    combat: ' + JSON.stringify(combat));
  rec.ok('a COMBAT level does NOT call itself a skill level',
    !!combat && !/Skill Level/i.test(combat.text), combat);
  rec.ok('...and seats the combat skill\'s own icon, not the life skill\'s',
    !!combat && combat.icon === 'combat-bow.webp' && combat.iconDrawn, combat);

  /* ═══ AND A LEVEL NOBODY CAN ATTRIBUTE STILL GETS AN ICON ═══
     combat_credit, the legacy client loop and a Build-sheet point spend all
     raise a character level with no skill on it.  The medallion's centre is a
     hole in the artwork, so "no icon" is not a missing nicety, it is a
     visible void — the fallback is the feature. */
  await P.page.waitForTimeout(3200);
  await P.page.evaluate(() => {
    window._setLevelUpMsg({ kind: 'combat', level: 13, ts: Date.now() });
  });
  await P.page.waitForTimeout(800);
  const bare = await burst(P);
  console.log('    unattributed: ' + JSON.stringify(bare));
  rec.ok('an unattributed character level still fills the circle (fallback icon)',
    !!bare && !!bare.icon && bare.iconDrawn, bare);

  await P.ctx.close().catch(() => {});
}
