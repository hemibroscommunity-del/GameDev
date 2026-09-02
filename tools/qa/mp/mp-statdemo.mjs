/* THE STAT EXPLAINER'S SCENE IS AIMED THE RIGHT WAY (v2.3.2230)
 *
 * Owner, on the ℹ️ window that v2.3.2222 added to the Points screen: "the
 * character preview is facing the wrong way.  Also show the +1 stat addition
 * above the character's head then disappear instead of in the middle between
 * the character's and monster."
 *
 * Both reports are about the same thing -- a scene whose pieces do not agree
 * on where the player is standing:
 *
 *   1. FACING.  The stage puts the hero on the LEFT and the slime on the
 *      RIGHT (game.css: .bt-sd-hero{left:24px}, .bt-sd-slime{right:16px}),
 *      but CharacterView draws one hardcoded direction -- 'southwest', the
 *      Equipment screen's three-quarter pose -- so he had his back to the
 *      thing he was hitting.  Fixed by making `dir` a prop; this file checks
 *      the RESULT (the composite is mirrored) rather than the prop, because
 *      the prop was already being passed once before and never re-read: the
 *      draw effect's dependency array did not list it.
 *
 *   2. THE +1.  It was position:absolute;left:50% of the STAGE, and the
 *      stage's centre is the empty gap between the two figures -- so the
 *      point that lands on YOUR character appeared to land on neither.
 *
 * Both are geometry, so both are asserted as geometry: measured rectangles
 * off the live scene, not a class name or a style string.  A class can be
 * present and the element still be in the wrong place (and was).
 *
 * The Equipment screen's own figure is checked too.  It is the SAME
 * component, it keeps the owner's original pose, and a "fix" that flipped
 * every CharacterView in the app would pass every assertion above.
 */
import * as H from './harness.mjs';

const tapSel = (P, sel) => P.page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return false;
  const r = el.getBoundingClientRect();
  for (const type of ['pointerdown', 'pointerup']) {
    el.dispatchEvent(new PointerEvent(type, {
      clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
      bubbles: true, cancelable: true, pointerId: 9, pointerType: 'touch',
    }));
  }
  return true;
}, sel);

/* The scene's own figure, as the compositor left it.  characterPortrait
   stamps the direction it actually drew onto the canvas (__btDir/__btMirror,
   v2.3.?  see its tail), which is the only honest read: `dir` names a view,
   and three of the eight views are the mirror of another one. */
const heroFacing = (P, root) => P.page.evaluate((sel) => {
  const cv = document.querySelector(sel + ' canvas');
  if (!cv) return null;
  return { dir: cv.__btDir || null, mirror: !!cv.__btMirror, weapon: cv.__btWeapon || null, w: cv.width, h: cv.height };
}, root);

const rects = (P) => P.page.evaluate(() => {
  const g = (s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, cx: r.left + r.width / 2, w: r.width, h: r.height }; };
  return { stage: g('.bt-sd-stage'), hero: g('.bt-sd-hero'), slime: g('.bt-sd-slime'), point: g('.bt-sd-point') };
});

/* The +1 shows for well under a second inside a looping timeline, so waiting
   on it is polling, not a fixed sleep. */
async function waitForPoint(P, ms = 12000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const r = await rects(P);
    if (r.point && r.point.w > 0) return r;
    await P.page.waitForTimeout(60);
  }
  return null;
}

/* The projectile is airborne for 200ms inside a looping timeline, so this
   polls for it the way waitForPoint does for the badge. */
async function waitForShot(P, ms = 12000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const r = await P.page.evaluate(() => {
      const el = document.querySelector('.bt-sd-shot');
      const hero = document.querySelector('.bt-sd-hero');
      const slime = document.querySelector('.bt-sd-slime');
      if (!el || !hero || !slime) return null;
      const b = el.getBoundingClientRect(), h = hero.getBoundingClientRect(), s2 = slime.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        cls: el.className, img: cs.backgroundImage, frames: cs.getPropertyValue('--sd-frames').trim(),
        cx: b.left + b.width / 2, w: b.width, h: b.height,
        heroCx: h.left + h.width / 2, slimeCx: s2.left + s2.width / 2,
      };
    });
    if (r && r.w > 0) return r;
    await P.page.waitForTimeout(50);
  }
  return null;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Pointer', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2200);

  /* A weapon and a skill level, so the row exists and the figure has
     something in its hand -- the scene draws what you are holding. */
  /* A SWORD IN HAND AND A BOW IN THE OTHER SLOT.  Both, deliberately: the
     whole point of the lane rule is that these two can disagree, and a
     player who owns only one weapon cannot tell you whether the scene is
     reading the lane or the equipped slot. */
  await P.page.evaluate(() => {
    const R = window._gameState.current.rpg;
    R.weapon = { type: 'greatsword', tier: 'common', tierMult: 1.12, gearBase: 'copper',
      name: 'Test Sword', quality: 'normal', element1: null, element2: null, hardness: 0, temper: 0 };
    R.rangedWeapon = { type: 'bow', tier: 'common', tierMult: 1.12, gearBase: 'wood',
      name: 'Test Bow', quality: 'normal', element1: null, element2: null, hardness: 0, temper: 0 };
    R.staffWeapon = { type: 'staff', tier: 'common', tierMult: 1.12, gearBase: 'wood',
      name: 'Test Staff', quality: 'normal', element1: null, element2: null, hardness: 0, temper: 0 };
    R.activeSlot = 'melee';
    if (!R.prog3) R.prog3 = {};
    R.prog3.sk = { ...(R.prog3.sk || {}), sword: { level: 8, xp: 0 }, bow: { level: 6, xp: 0 }, staff: { level: 4, xp: 0 } };
    R.prog3.pool = { ...(R.prog3.pool || {}), unspent: 3 };
    try { window.__broDashPanelBus.open('hero'); window.__broDashPanelBus.expand(); } catch (e) {}
  });
  await P.page.waitForTimeout(900);
  await tapSel(P, '[role="button"][data-section="Build"]');
  await P.page.waitForTimeout(900);

  const opened = await tapSel(P, '[data-stat-info="crit"]');
  await P.page.waitForTimeout(700);
  const haveScene = await P.page.evaluate(() => !!document.querySelector('.bt-sd-stage'));
  rec.ok('the ℹ️ on a combat stat opens a window with a scene in it', opened && haveScene, { opened, haveScene });
  if (!haveScene) { await P.ctx.close().catch(() => {}); return; }

  /* ── 1. HE FACES THE SLIME ── */
  const geo = await rects(P);
  const heroLeft = !!(geo.hero && geo.slime && geo.hero.cx < geo.slime.cx);
  rec.ok('the scene stands the hero LEFT of the slime (the premise)', heroLeft, geo);
  const face = await heroFacing(P, '.bt-sd-hero');
  rec.ok('the scene draws a figure at all (guard)', !!face, face);
  /* Mirrored is what "facing right" IS for this compositor: characterPortrait
     draws five base directions and flips three of them (east/southeast/
     northeast).  A mirror:false figure is looking away from the slime, which
     is the bug as reported. */
  rec.ok('...facing the slime, not away from it (mirrored composite)',
    !!(face && face.mirror), face);

  /* ── 2. THE +1 LANDS ON HIM ── */
  const at = await waitForPoint(P);
  rec.ok('the +1 badge appears during the scene (guard)', !!at, at);
  if (at) {
    const dHero = Math.abs(at.point.cx - at.hero.cx);
    const dSlime = Math.abs(at.point.cx - at.slime.cx);
    rec.ok('the +1 lands over the CHARACTER, not in the gap beside him',
      dHero < dSlime, { pointCx: at.point.cx, heroCx: at.hero.cx, slimeCx: at.slime.cx, dHero, dSlime });
    /* Over his own body, not merely nearer him than the slime. */
    rec.ok('...within the figure\'s own width',
      at.point.cx >= at.hero.l && at.point.cx <= at.hero.r,
      { pointCx: at.point.cx, heroL: at.hero.l, heroR: at.hero.r });
    /* ABOVE THE HEAD: in the top third of the figure's box.  Not a pixel
       constant -- the badge is 28px in a 130px stage and any tighter number
       would be a re-statement of the CSS rather than a check on it. */
    rec.ok('...above his head, in the upper third of the figure',
      at.point.b <= at.hero.t + at.hero.h / 3,
      { pointBottom: at.point.b, heroTop: at.hero.t, heroH: at.hero.h });
    /* IT MUST NOT BE CLIPPED.  The stage is overflow:hidden and the badge
       was moved UP to get here; a badge with its top shaved off is a worse
       answer than the one the owner complained about. */
    rec.ok('...and whole -- the stage does not crop it',
      at.point.t >= at.stage.t - 0.5 && at.point.b <= at.stage.b + 0.5,
      { point: at.point, stage: at.stage });
  }

  await P.page.screenshot({ path: 'tools/qa/mp/out/statdemo-scene.png' }).catch(() => {});

  /* ── 3. THE FIGURE HOLDS THE LANE'S WEAPON, AND ATTACKS WITH IT ──
     v2.3.2231.  Owner: "Maybe the combat primary skill they are viewing the
     stat demo through?"  The melee lane is open and a sword is equipped, so
     the guard below is trivially satisfiable by the OLD behaviour too --
     which is why it is only the guard, and the Bow lane below is the test. */
  rec.ok('the melee lane\'s scene holds the melee weapon (guard)',
    !!(face && face.weapon === 'greatsword'), face);
  rec.ok('...and attacks with a lunge, not a projectile',
    !(await P.page.evaluate(() => !!document.querySelector('.bt-sd-shot'))));

  await P.page.keyboard.press('Escape');
  await P.page.waitForTimeout(350);
  /* Open the BOW lane while still HOLDING THE SWORD.  This is the state the
     owner is pointing at: the popup will be captioned "· Bow" and the old
     code drew a swordsman under that caption. */
  const laneOpened = await tapSel(P, '[data-prog3-lane="bow"]');
  await P.page.waitForTimeout(700);
  const stillHoldingSword = await P.page.evaluate(() =>
    (window._gameState.current.rpg.activeSlot || 'melee') === 'melee');
  rec.ok('the Bow lane could be opened while the sword is still equipped', laneOpened && stillHoldingSword,
    { laneOpened, stillHoldingSword });
  await tapSel(P, '[data-stat-info="crit"]');
  await P.page.waitForTimeout(900);
  const bowTitle = await P.page.evaluate(() => {
    const el = document.querySelector('[data-infopopup-title]');
    return el ? (el.textContent || '').trim() : null;
  });
  rec.ok('...and its ℹ️ window is captioned for the BOW (guard)',
    !!(bowTitle && /bow/i.test(bowTitle)), bowTitle);
  const bowFace = await heroFacing(P, '.bt-sd-hero');
  /* THE REPORT.  Not "is it a bow" alone -- "is it NOT the sword", because
     an empty-handed figure would also be wrong here and a bare truthiness
     check would pass it. */
  rec.ok('the Bow lane\'s scene puts a BOW in his hands, not the equipped sword',
    !!(bowFace && bowFace.weapon === 'bow'), bowFace);

  /* ...and the attack crosses the gap, which is the whole tell of a ranged
     lane: a man lunging at something he is shooting reads as melee. */
  const shot = await waitForShot(P);
  /* Caught mid-flight: the poll runs at 50ms and the flight is 200, so the
     arrow is still over the gap when this fires.  A picture of the ranged
     scene is the one thing the geometry above cannot show. */
  await P.page.screenshot({ path: 'tools/qa/mp/out/statdemo-bow.png' }).catch(() => {});
  rec.ok('the Bow lane looses a projectile at the slime', !!shot, shot);
  if (shot) {
    rec.ok('...the game\'s own arrow, not a stand-in',
      /arrow-pine/.test(shot.img || ''), shot.img);
    /* It must START on the hero's side.  The slime's orb uses the same
       flight machinery in the other direction, so "a projectile exists" is
       not enough -- the orb would satisfy that and mean the opposite. */
    rec.ok('...leaving HIS side of the stage, not the slime\'s',
      Math.abs(shot.cx - shot.heroCx) < Math.abs(shot.cx - shot.slimeCx),
      { cx: shot.cx, heroCx: shot.heroCx, slimeCx: shot.slimeCx });
  }

  /* The MAGIC lane takes the other branch of SHOT: a 4-cel strip stepped by
     CSS rather than a single cel, so passing for the bow says nothing about
     it. */
  await P.page.keyboard.press('Escape');
  await P.page.waitForTimeout(350);
  const staffLane = await tapSel(P, '[data-prog3-lane="staff"]');
  await P.page.waitForTimeout(700);
  await tapSel(P, '[data-stat-info="crit"]');
  await P.page.waitForTimeout(900);
  const staffFace = await heroFacing(P, '.bt-sd-hero');
  rec.ok('the Magic lane puts the STAFF in his hands',
    staffLane && !!(staffFace && staffFace.weapon === 'staff'), { staffLane, staffFace });
  const bolt = await waitForShot(P);
  await P.page.screenshot({ path: 'tools/qa/mp/out/statdemo-staff.png' }).catch(() => {});
  rec.ok('...and throws the game\'s own magic bolt',
    !!(bolt && /magic-bolt/.test(bolt.img || '')), bolt);
  rec.ok('...as a stepped 4-cel strip, not one frozen cel',
    !!(bolt && bolt.frames === '4'), bolt && bolt.frames);

  /* ── 4. A BODY STAT HAS NO LANE, SO IT KEEPS WHAT YOU HOLD ──
     Defense/HP/Dodge/Stamina points apply whatever is in your hand, so
     following the open lane there would be the same error in reverse. */
  await P.page.keyboard.press('Escape');
  await P.page.waitForTimeout(350);
  const bodyOpened = await tapSel(P, '[data-stat-info="def"]');
  await P.page.waitForTimeout(800);
  const bodyFace = await heroFacing(P, '.bt-sd-hero');
  if (!bodyOpened || !bodyFace) {
    rec.skip('a body stat keeps the equipped weapon', 'no def row / scene on screen');
  } else {
    rec.ok('a body stat keeps the EQUIPPED weapon (it has no lane)',
      bodyFace.weapon === 'greatsword', { bodyFace, note: 'bow lane is still open' });
  }

  /* ── 5. THE EQUIPMENT FIGURE IS UNTOUCHED ── */
  await P.page.keyboard.press('Escape');
  await P.page.waitForTimeout(400);
  await tapSel(P, '[role="button"][data-section="Overview"]');
  await P.page.waitForTimeout(1000);
  const eq = await P.page.evaluate(() => {
    /* every character canvas on the sheet EXCEPT the demo's (the popup is
       closed, but ask by exclusion rather than by trusting that). */
    const cvs = [...document.querySelectorAll('canvas')].filter((c) => c.__btDir && !c.closest('.bt-sd'));
    return cvs.map((c) => ({ dir: c.__btDir, mirror: !!c.__btMirror }));
  });
  if (!eq.length) {
    rec.skip('the Equipment figure keeps its own pose', 'no character canvas on the Overview section');
  } else {
    rec.ok('the Equipment figure keeps its own pose (southwest, unmirrored)',
      eq.every((c) => c.dir === 'southwest' && !c.mirror), eq);
  }

  await P.ctx.close().catch(() => {});
}
