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

/* ═══ v2.3.2684: REACHING A LANE'S STAT, NOW THAT THE HEAD IS A LABEL ═══
   v2.3.2683 reached one by cycling the weapons head until it read the lane it
   wanted.  The owner has since taken the head OUT of the control set ("the
   weapon icon row is not meant to be button") and put the lane choice in the
   confirm window as a tab row, so that route no longer exists and this file's
   four bow/staff assertions were failing on the route, not on the scene.

   The new route is the player's: open the stat from whichever lane the grid is
   showing, then aim the window with its own tabs.  The window re-opens on the
   lane you pick -- same title, same scene, rebuilt for that weapon -- which is
   exactly what these assertions are about, so they are untouched below.
   A BODY stat has no lane to pick and is opened in one tap, as before. */
const openStat = async (P, lane, key) => {
  /* `$=":key"` rather than a full id: the lane row shows SOME weapon's six
     cells and which one is not this helper's business -- the tab is. */
  const ok = await tapSel(P, `[data-prog3-row$=":${key}"]`);
  if (!ok) return false;
  await P.page.waitForTimeout(300);
  if (!lane || lane === 'shared') return true;
  for (let i = 0; i < 3; i++) {
    const now = await P.page.evaluate(() => {
      const t = [...document.querySelectorAll('[data-infopopup-lanes] [data-infopopup-lane]')]
        .find((e) => e.getAttribute('aria-pressed') === 'true');
      return t ? t.getAttribute('data-infopopup-lane') : null;
    });
    if (now === lane) return true;
    if (!(await tapSel(P, `[data-infopopup-lane="${lane}"]`))) return false;
    await P.page.waitForTimeout(300);
  }
  return false;
};

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
        /* v2.3.2979: what the browser actually RUNS -- an invalid timing
           function voids the whole shorthand to `none` (see Shot) */
        anim: cs.animationName,
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
  /* v2.3.2593: the Points screen's four columns start CLOSED (owner), and
     every scene below is opened from a cell's ℹ️ inside one of them.
     v2.3.2594: one weapon at a time, so each section below opens the column
     it is about — starting with Melee and Shared, the pair this one reads. */
  /* v2.3.2597: the Points screen is a 2x2 category grid you drill into, and the
     explainer handle sits on the [+] — the owner made the cell body inert and
     the [+] the only control, and the window it opens IS the explainer (one
     window that explains and confirms at the bottom).  So the scope is the open
     CARD, not a column, and openPointCols drills in rather than opening a pair. */
  await H.openPointCols(P, ['sword']);

  /* v2.3.2592: crit is LUCK now, and four columns are on screen at once —
     the MELEE column's Luck ℹ️, named by column. */
  const opened = await openStat(P, 'sword', 'luck');
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
  /* Open the BOW column's Luck window while still HOLDING THE SWORD.  This is
     the state the owner is pointing at: the popup will be captioned "· Bow"
     and the old code drew a swordsman under that caption.  v2.3.2592: there
     is no lane to open any more — the Bow column is always on screen — so
     the ℹ️ is reached by its column. */
  const stillHoldingSword = await P.page.evaluate(() =>
    (window._gameState.current.rpg.activeSlot || 'melee') === 'melee');
  await H.openPointCols(P, ['bow']);   /* v2.3.2594: one weapon at a time */
  await H.openPointCols(P, ['bow']);
  const laneOpened = await openStat(P, 'bow', 'luck');
  rec.ok('the Bow column\'s ℹ️ could be tapped while the sword is still equipped', laneOpened && stillHoldingSword,
    { laneOpened, stillHoldingSword });
  await P.page.waitForTimeout(900);
  /* v2.3.2695: the drawn title is the stat alone now (owner) -- the lane is
     named by the highlighted tab under it, so that is what is read here. */
  const bowTitle = await P.page.evaluate(() => {
    const el = document.querySelector('[data-infopopup-lane][aria-pressed="true"]');
    return el ? (el.textContent || '').trim() : null;
  });
  rec.ok('...and its ℹ️ window is aimed at the BOW (guard)',
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
    /* v2.3.2979: ...and it FLIES.  The check above passes just as well for
       an arrow frozen in his hand, which is exactly what every bow arrow was
       from v2.3.2231 on: the arrow is one cel, steps(1, jump-none) is
       invalid, and an invalid timing function through var() voids the whole
       animation, flight included (Chromium: animation-name none). */
    rec.ok('...and the arrow actually flies (its animation is not voided)',
      /bt-sd-fly/.test(shot.anim || ''), shot.anim);
  }

  /* The MAGIC lane takes the other branch of SHOT: a 4-cel strip stepped by
     CSS rather than a single cel, so passing for the bow says nothing about
     it. */
  await P.page.keyboard.press('Escape');
  await P.page.waitForTimeout(350);
  await H.openPointCols(P, ['staff']);   /* v2.3.2594 */
  await H.openPointCols(P, ['staff']);
  const staffLane = await openStat(P, 'staff', 'luck');
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
  await H.openPointCols(P, ['shared']);
  const bodyOpened = await openStat(P, 'shared', 'def');
  await P.page.waitForTimeout(800);
  const bodyFace = await heroFacing(P, '.bt-sd-hero');
  if (!bodyOpened || !bodyFace) {
    rec.skip('a body stat keeps the equipped weapon', 'no def row / scene on screen');
  } else {
    rec.ok('a body stat keeps the EQUIPPED weapon (it has no lane)',
      bodyFace.weapon === 'greatsword', { bodyFace, note: 'bow lane is still open' });
  }

  /* ══ 4b. THE FOUR SCENES OF v2.3.2616 ══
     Owner, from their phone: an animation for Range, Move Speed and Elem
     Resist, and Stamina's replaced because "shooting an orb" is the wrong
     idea for it. Each is asserted on the thing that would actually be wrong
     rather than on "a scene exists":
       - Stamina must not loose a projectile. That WAS the complaint: the old
         scene drove strike(), which fires the equipped weapon's shot, so with
         a staff in hand it was a man throwing orbs. Watched across a whole
         loop, not sampled once.
       - Range must fall short before the point and connect after. A scene
         that simply hit twice would be the damage scene wearing Range's name,
         and prog3.js says of this stat, in its own words, "reach, not damage".
       - Move Speed and Elem Resist need a scene at all, where before the
         window opened with an empty stage. */
  for (const [lane, key] of [['shared', 'stam'], ['bow', 'range'], ['shared', 'move'], ['shared', 'eres']]) {
    await P.page.keyboard.press('Escape');
    await P.page.waitForTimeout(350);
    await H.openPointCols(P, [lane]);
    const opened = await openStat(P, lane, key);
    await P.page.waitForTimeout(500);
    if (!opened) { rec.skip(`${key} has a scene`, 'row not reachable'); continue; }
    /* Sample the live stage across a full loop — a single frame proves
       nothing about an animation. */
    /* v2.3.2979: and what the scene is DOING -- the roll, the swell, the
       stamina bar -- because the simulated scenes prove themselves with the
       real mechanic, not with a caption. */
    const seen = { scene: false, shot: 0, frames: 0, texts: {}, rolled: false, swell: false, windup: false, orb: false, stam: [], verdict: null };
    for (let i = 0; i < 34; i++) {
      const f = await P.page.evaluate(() => ({
        scene: !!document.querySelector('[data-stat-demo]'),
        shot: document.querySelectorAll('.bt-sd-shot').length,
        pops: [...document.querySelectorAll('[data-sd-pop]')].map((e) => ({
          t: e.textContent.trim(), side: /--slime/.test(e.className) ? 'slime' : 'hero' })),
        rolled: !!document.querySelector('.bt-sd-hero--dodge'),
        swell: !!document.querySelector('.bt-sd-slime--swell'),
        windup: !!document.querySelector('.bt-sd-slime--windup'),
        orb: !!document.querySelector('.bt-sd-orb'),
        stam: (document.querySelector('[data-sd-bar="stamina"] .bt-sd-vital-n') || {}).textContent || null,
        verdict: window.__btStatScene ? window.__btStatScene.verdict : null,
      }));
      if (f.scene) seen.scene = true;
      seen.shot += f.shot;
      seen.frames++;
      for (const p of f.pops) seen.texts[p.side + ':' + p.t] = (seen.texts[p.side + ':' + p.t] || 0) + 1;
      if (f.rolled) seen.rolled = true;
      if (f.swell) seen.swell = true;
      if (f.windup) seen.windup = true;
      if (f.orb) seen.orb = true;
      if (f.stam && seen.stam[seen.stam.length - 1] !== f.stam) seen.stam.push(f.stam);
      if (f.verdict) seen.verdict = f.verdict;
      await P.page.waitForTimeout(260);
    }
    rec.ok(`${key} opens a scene on its stage`, seen.scene, seen);
    const texts = Object.keys(seen.texts);
    if (key === 'stam') {
      /* v2.3.2979: THE REAL ECONOMY.  The v2.3.2616 scene had the hero block
         and then dodge, 30 stamina each, with 'Blocked!'/'Dodged!' popping --
         numbers the game does not charge and a popup the game does not show.
         Simulated (statSim.js), stamina pays for what it actually pays for:
         WITH a shield, holding your guard (5 a regen tick held; a ball caught
         on the shield costs nothing more -- statsim.test measures the worker);
         WITHOUT one -- this rig -- ROLLING out of the slime's attack (a swing,
         at this rig's sword), one stamina block a roll.  A roll is silent in
         the world (the attack just misses), so the proof is the roll and the
         bar dropping, not a popup. */
      const dips = seen.stam.map((t) => { const m = /^(\d+)\/(\d+)$/.exec(t.replace(/\s/g, '')); return m ? { cur: +m[1], max: +m[2] } : null; }).filter(Boolean);
      rec.ok('...and Stamina pays for a dodge roll: the hero rolls, and the bar drops by a block',
        seen.rolled && dips.some((d) => d.cur < d.max), { rolled: seen.rolled, bar: seen.stam });
      rec.ok('...and nothing in it attacks the slime (the "shooting an orb" report)',
        seen.shot === 0 && !texts.some((t) => /^slime:\d+$/.test(t)), { texts, shots: seen.shot });
      /* v2.3.2979: and the slime attacks the way it would attack HIM.  This
         rig holds a greatsword, so he stands inside the slime's reach, where
         the worker has it SWING (a 500ms wind-up the world draws as a throb)
         and never throw -- the first cut threw balls at everyone, which is
         also why a sword-and-board guard read twice as long as it lasts. */
      rec.ok('...and with a sword in hand the slime SWINGS at him (a wind-up, no ball)',
        seen.windup && !seen.orb, { windup: seen.windup, orb: seen.orb });
    }
    if (key === 'range') {
      rec.ok('...and Range FALLS SHORT before the point and connects after (reach, not damage)',
        texts.some((t) => /Short/i.test(t)) && texts.some((t) => /^slime:\d+$/.test(t)), { texts });
    }
    if (key === 'eres') {
      /* v2.3.2979: the v2.3.2616 scene burned the hero for 8, then 2, off a
         slime ball -- but a slime's ball is BASE damage and burns nobody.  The
         one elemental thing a slime does is the BLUE slime's death burst, and
         that is what Resist is shown against now: it swells, it goes off, and
         the number on you is the worker's burst through your Resist -- the
         verdict line's own two numbers, one per half. */
      const v = seen.verdict || {};
      rec.ok('...and Resist meets the blue slime\'s burst: it swells, and you take the simulated number, before and after',
        seen.swell && !!v.now && texts.includes('hero:' + v.now) && (!v.after || texts.includes('hero:' + v.after)),
        { swell: seen.swell, verdict: v, texts });
    }
    await P.page.screenshot({ path: `tools/qa/mp/out/statdemo-${key}.png` }).catch(() => {});
  }

  /* ══ 4d. v2.3.2979: THE NUMBERS ARE A SIMULATION, NOT A STORYBOARD ══
     Owner: "Make it so the preview of the combat skills stat allocation
     confirmation window shows real simulation of the hits against a slime
     monster."  Until now Power's scene popped a hard-coded '12' then '24'
     whoever you were.  It now fights the meadow's slime with THIS rig's
     greatsword at skill 8 (statSim.js), and the server suite holds that
     arithmetic to the worker's own roll (statsim.test.mjs).  What only a
     browser can show is that the scene DRAWS the simulation it ran: every
     number over the slime is one that loop rolled (window.__btStatScene),
     the slime's HP bar drains to them and the slime dies, and both halves
     play on the same window. */
  await P.page.keyboard.press('Escape');
  await P.page.waitForTimeout(350);
  await H.openPointCols(P, ['sword']);
  const powOpened = await openStat(P, 'sword', 'dmg');
  await P.page.waitForTimeout(300);
  if (!powOpened) {
    rec.skip('Power plays a simulated fight', 'row not reachable');
  } else {
    const sim = { pops: new Set(), rolled: new Set(), bars: new Set(), phases: new Set(), died: false, verdict: null };
    for (let i = 0; i < 60; i++) {
      const f = await P.page.evaluate(() => ({
        pops: [...document.querySelectorAll('[data-sd-pop]')].filter((e) => /--slime/.test(e.className)).map((e) => 'slime:' + e.textContent.trim()),
        hook: (window.__btStatScene && window.__btStatScene.stat === 'dmg') ? window.__btStatScene : null,
        bar: (document.querySelector('[data-sd-slime-hp]') || { getAttribute: () => null }).getAttribute('data-sd-slime-hp'),
        phase: (document.querySelector('[data-sd-phase]') || { getAttribute: () => null }).getAttribute('data-sd-phase'),
        died: !!document.querySelector('.bt-sd-slime--death'),
      }));
      if (f.hook) {
        for (const list of f.hook.texts) for (const t of (list || [])) sim.rolled.add(t);
        sim.verdict = f.hook.verdict;
      }
      for (const t of f.pops) sim.pops.add(t);
      if (f.bar != null) sim.bars.add(+f.bar);
      if (f.phase != null) sim.phases.add(f.phase);
      if (f.died) sim.died = true;
      await P.page.waitForTimeout(150);
    }
    const pops = [...sim.pops];
    rec.ok('Power: every number over the slime is one the simulation rolled for that loop',
      pops.length > 0 && pops.every((t) => sim.rolled.has(t)), { pops, rolled: [...sim.rolled] });
    const bars = [...sim.bars];
    rec.ok('...the slime\'s HP bar drains to them, and the slime dies',
      bars.length > 1 && Math.min(...bars) < Math.max(...bars) && sim.died, { bars, died: sim.died });
    rec.ok('...both halves play: "Now", then the point, then "+n"',
      sim.phases.has('0') && sim.phases.has('1'), [...sim.phases]);
    const v = sim.verdict || {};
    rec.ok('...and the line under it says how many hits a slime takes, now and with the point',
      /hit/.test(v.now || '') && /hit/.test(v.after || ''), v);
    await P.page.screenshot({ path: 'tools/qa/mp/out/statdemo-power.png' }).catch(() => {});
  }

  /* ══ 4c. THE PRELOADING LAW ══
     CLAUDE.md: every animation asset loads on the gate, and a first-use fetch
     is a regression the owner has reported personally. The scenes' DOM assets
     now have a manifest group of their own, so the settle report names it —
     and the popup shield, which nothing in the client referenced at all, is
     warm before the intro lifts instead of on first open of the explainer. */
  const pre = await P.page.evaluate(() => (window.__btPreloadReport || null));
  rec.ok('the stat scenes\' assets are registered on the loading gate (preloading LAW)',
    !!pre && pre.statDemo === 'fulfilled', pre && { statDemo: pre.statDemo, slime: pre.slime, fx: pre.fx });

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
