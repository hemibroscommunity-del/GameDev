/* EVERY WORN COPPER COMBINATION, IN EVERY ANIMATION (v2.3.1772).
 *
 * Owner: "the animations while using the sword and bow revert to the iron
 * armor while wearing the copper armor again.  Make sure every single worn
 * copper combination animation is correct."
 *
 * WHY THE EXISTING TEST DID NOT CATCH THIS.  v2.3.1764 added a probe that
 * records the TINT each stand-in gear sprite was drawn with, and mp-layer
 * asserts every recorded sprite is copper.  But a tint is applied to a sprite
 * whether or not it has a texture: a copper strip whose sheet 404s is still
 * "tinted copper" while nothing at all is on screen.  So the assertion was
 * true and unfalsifiable at the same time, and it stayed green over a pose
 * drawing no armour.
 *
 * This reads TEXTURE + VISIBILITY as well as tint, on every pose that has its
 * own strips, for all three ways of wearing the tier: chest only, legs only,
 * and both.  A pose is only correct when the piece is on screen AND in the
 * player's metal.
 */
import * as H from './harness.mjs';

const COPPER = 0xFF9E58;

/* The stand-in poses that draw their own gear strips, and the probe key each
   one records under.  Sourced from the _tintGearSprite call sites rather than
   guessed, so a pose that stops drawing shows up as missing. */
const COMBOS = [
  { label: 'chest only', chest: 'copperplate', legs: 'none' },
  { label: 'legs only',  chest: 'none',        legs: 'coppergreaves' },
  { label: 'both',       chest: 'copperplate', legs: 'coppergreaves' },
];

const setGear = (P, chest, legs) => P.page.evaluate(({ c, l }) => {
  if (!window.__btSetGear) return 'missing';
  window.__btSetGear('chest', c);
  window.__btSetGear('legs', l);
  if (window.__btStandInTintsReset) window.__btStandInTintsReset();
  return 'ok';
}, { c: chest, l: legs });

const probe = (P) => P.page.evaluate(() => (window.__btStandInTints ? window.__btStandInTints() : null));

/* Drive a melee swing by clicking beside the player, exactly as mp-layer does. */
async function swing(P) {
  await P.page.evaluate(async () => {
    const cv = document.querySelector('canvas.brotown-canvas');
    const r = cv.getBoundingClientRect();
    const S = window._gameState.current;
    const k = S._worldScaleX || 1;
    const x = r.left + (S.player.x - S.camera.x) * k;
    const y = r.top + (S.player.y - S.camera.y) * k;
    const ev = (t, b) => cv.dispatchEvent(new MouseEvent(t, { clientX: x + 40, clientY: y + 10, bubbles: true, button: b || 0 }));
    ev('mousemove'); ev('mousedown');
    await new Promise((res) => setTimeout(res, 500));
    ev('mouseup');
  });
  await P.page.waitForTimeout(400);
}

/* A swing or shot taken while MOVING runs a different leg path: the torso
   strip is leg-erased and animated jog legs are composited under it, with the
   leg ARMOUR drawn by _placeJogLegs rather than by the gear strip.  That is a
   separate chance to lose the metal, so it gets driven separately — holding a
   movement key across the whole gesture. */
async function movingSwing(P) {
  await P.page.keyboard.down('w');
  await P.page.waitForTimeout(350);
  await swing(P);
  await P.page.keyboard.up('w');
  await P.page.waitForTimeout(300);
}

/* The bow shot is the same gesture with the ranged slot active. */
async function bowShot(P) {
  await P.page.evaluate(() => {
    const S = window._gameState.current, R = S.rpg;
    if (R && R.rangedWeapon) R.activeSlot = 'ranged';
  });
  await P.page.waitForTimeout(300);
  await swing(P);
  await P.page.evaluate(() => {
    const S = window._gameState.current, R = S.rpg;
    if (R) R.activeSlot = 'melee';
  });
  await P.page.waitForTimeout(300);
}

async function lifeskill(P, skill) {
  await P.page.evaluate((sk) => {
    const S = window._gameState && window._gameState.current;
    if (!S) return;
    const now = Date.now();
    S._extraction = { nodeId: 'qa', nodeRef: { id: 'qa', x: S.player.x + 20, y: S.player.y,
      gatherLvl: 1, alive: true, nodeType: sk === 'woodcutting' ? 'tree' : 'campfire' },
    skill: sk, startedAt: now, windowOpensAt: now + 4000, windowClosesAt: now + 6000,
    status: 'waiting', swipeSamples: [] };
  }, skill);
  await P.page.waitForTimeout(1400);
  await P.page.evaluate(() => { const S = window._gameState.current; if (S) S._extraction = null; });
  await P.page.waitForTimeout(300);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Coppersmith', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);

  /* The starter quest is where the sword and the bow come from — take both so
     the melee and ranged stand-ins have a weapon to play with. */
  const myId = await H.readState(P, (S) => S.myId);
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
  });
  await P.page.waitForTimeout(2500);
  const armed = await P.page.evaluate(() => {
    const S = window._gameState.current, R = S.rpg;
    const take = (re) => {
      const i = (R.weaponStash || []).findIndex((w) => w && re.test(w.name || ''));
      return i >= 0 ? R.weaponStash.splice(i, 1)[0] : null;
    };
    const sword = take(/Sword/i);
    if (sword) R.weapon = sword;
    /* tut_1 pays the BOW on turn-in, not on accept, and completing the line
       here would make this a test of the questline (mp-questline already is
       one).  The bow is minted from the sword's own record with the type and
       tier swapped, the same way mp-arrowdt injects an arrow: what is under
       test is which sheets the stand-in loads, not how the bow was earned. */
    if (sword) R.rangedWeapon = Object.assign({}, sword, { type: 'bow', gearBase: 'ww_pine', name: 'Pine Bow' });
    R.activeSlot = 'melee';
    return { sword: !!sword, bow: !!(R.rangedWeapon) };
  });
  rec.ok('the player is holding both a sword and a bow (guard: the stand-ins need a weapon)',
    armed.sword && armed.bow, armed);
  await P.page.waitForTimeout(1000);

  const failures = [];
  const seen = {};
  const seenMoving = {};
  for (const combo of COMBOS) {
    rec.ok(`the test can wear the ${combo.label} copper set`,
      (await setGear(P, combo.chest, combo.legs)) === 'ok');
    await P.page.waitForTimeout(1200);

    /* Only the slots this combo is actually wearing can be asserted on: with
       no chest equipped, an absent chest strip is CORRECT. */
    const worn = [];
    if (combo.chest !== 'none') worn.push('Chest');
    if (combo.legs !== 'none') worn.push('Legs');
    const judge = (t, phase) => {
      for (const [key, v] of Object.entries(t || {})) {
        if (/Weapon/.test(key)) continue;
        if (/remote/i.test(key)) continue;
        const slot = /Chest$/.test(key) ? 'Chest' : /Legs/.test(key) ? 'Legs' : null;
        if (!slot || !worn.includes(slot)) continue;
        if (!v.visible || !v.hasTex) failures.push({ combo: combo.label, phase, key, why: 'not drawn', v });
        else if (v.tint !== COPPER) failures.push({ combo: combo.label, phase, key, why: 'wrong metal', v });
      }
    };

    /* ── standing still: the gear STRIPS draw both slots ── */
    await swing(P);
    await bowShot(P);
    await lifeskill(P, 'woodcutting');
    await lifeskill(P, 'cooking');
    const still = await probe(P);
    seen[combo.label] = still;
    judge(still, 'standing');

    /* ── moving: a different leg path entirely ──
       The legs STRIP is deliberately hidden while jogging (`_jog ? null : ...`)
       because _placeJogLegs draws the leg armour instead, so the two states are
       probed separately.  Judging them together would have marked the correct
       hidden strip as a failure — which is exactly what the first version of
       this test did. */
    await P.page.evaluate(() => { if (window.__btStandInTintsReset) window.__btStandInTintsReset(); });
    await movingSwing(P);
    await P.page.evaluate(() => { const R = window._gameState.current.rpg; if (R && R.rangedWeapon) R.activeSlot = 'ranged'; });
    await movingSwing(P);
    await P.page.evaluate(() => { const R = window._gameState.current.rpg; if (R) R.activeSlot = 'melee'; });
    const moving = await probe(P);
    seenMoving[combo.label] = moving;
    for (const [key, v] of Object.entries(moving || {})) {
      if (!/JogLegs$/.test(key)) continue;   /* the jog path's own record */
      if (!worn.includes('Legs')) continue;
      if (!v.visible || !v.hasTex) failures.push({ combo: combo.label, phase: 'moving', key, why: 'not drawn', v });
      else if (v.tint !== COPPER) failures.push({ combo: combo.label, phase: 'moving', key, why: 'wrong metal', v });
    }
  }

  /* GUARD: naming the poses that MUST have been recorded is what keeps the
     sweep above from passing on an empty probe. */
  const both = seen['both'] || {};
  const bothMoving = seenMoving['both'] || {};
  const NEEDED = ['swingChest', 'swingLegs', 'bowChest', 'bowLegs', 'chopChest', 'chopLegs', 'cookChest', 'cookLegs'];
  const NEEDED_MOVING = ['swordJogLegs', 'bowJogLegs'];
  const missing = NEEDED.filter((n) => !(n in both))
    .concat(NEEDED_MOVING.filter((n) => !(n in bothMoving)));
  rec.ok('every combat and life-skill stand-in drew its gear at all (guard)',
    missing.length === 0, { missing, recorded: Object.keys(both), recordedMoving: Object.keys(bothMoving) });

  rec.ok('every worn copper piece is ON SCREEN and in copper, in every animation',
    failures.length === 0, { failures: failures.slice(0, 12), count: failures.length });

  await P.ctx.close().catch(() => {});
}
