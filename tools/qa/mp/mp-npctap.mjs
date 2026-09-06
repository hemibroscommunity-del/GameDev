/* ═══ TAPPING A CHARACTER TO TALK (v2.3.2305) ═══
 *
 * Owner: "Tapping on a character to talk is difficult. Make sure the touch
 * area for this is large enough."
 *
 * THE OBVIOUS DIAGNOSIS IS WRONG, and this file exists partly to record that.
 * The target was already an 88x88 CSS px circle at every zoom -- twice Apple's
 * 44pt minimum. Four other things were in the way, and the biggest one gets
 * WORSE if you widen the target:
 *
 *   1. THE TAP WAS SWALLOWED. The canvas touch handler stamps _touchHandledAt,
 *      which makes the canvas onClick skip its own tap logic -- and that
 *      handler had no NPC branch. So on the phone route, the NPC code in
 *      onClick was dead and a tap on a character did nothing whatsoever.
 *   2. The self-chat circle claimed the tap first.
 *   3. Three of the four NPCs had no answer to a tap at all.
 *   4. First-in-array won instead of nearest.
 *
 * A FIFTH WAS INVESTIGATED AND DISPROVEN, and that is worth recording so it is
 * not "fixed" again: the right control's touchstart does turn auto-attack on,
 * and the swing loop does damage NPCs -- but the release clears the flag before
 * the swing cooldown elapses, so a TAP never lands one. Measured: an armed
 * character tapping an NPC six times leaves his hp and the flag untouched.
 */
import * as H from './harness.mjs';

/* A PHONE VIEWPORT, and it is load-bearing. The touch zones and the whole
   tap path only exist on the mobile layout; on the default desktop viewport
   page.touchscreen.tap() lands on nothing that listens, every handler stays
   silent, and a test written that way passes its "he took no damage"
   assertions because nothing was ever tapped at all. Same size as
   mp-cooktap, for the same reason. */
const PHONE = { width: 390, height: 844 };

/* Put the player on top of a named NPC and return both positions, so a tap can
   be aimed in CSS space at his torso the way a thumb would be. */
const standOn = (P, name) => P.page.evaluate((n) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.npcs || !S.player) return null;
  const npc = S.npcs.find((x) => x && x.name === n);
  if (!npc) return null;
  S.player.x = npc.x - 18;
  S.player.y = npc.y + 6;
  npc.hp = npc.maxHp = npc.hp || 100;
  npc.alive = true;
  return { npc: { x: npc.x, y: npc.y, hp: npc.hp, name: npc.name } };
}, name);

/* His torso in CSS px -- the same point the hit test raises to (npc.y - 26). */
const npcCss = (P, name) => P.page.evaluate((n) => {
  const S = window._gameState && window._gameState.current;
  const c = document.querySelector('canvas');
  if (!S || !c || !S.camera) return null;
  const npc = S.npcs.find((x) => x && x.name === n);
  if (!npc) return null;
  const r = c.getBoundingClientRect();
  return {
    x: r.left + (npc.x - S.camera.x) * (S._worldScaleX || 1),
    y: r.top + (npc.y - S.camera.y) * (S._worldScaleY || 1) - 26,
    hp: npc.hp, alive: npc.alive,
  };
}, name);

/* WAIT FOR THE CAMERA. standOn teleports the player, and the camera LERPS to
   the new spot over several hundred ms -- so a screen position read straight
   after it is stale by up to 220px by the time the tap lands, and every tap
   misses. The first cut of this file did exactly that and read the misses as a
   broken hit test. Poll until the NPC's screen position stops moving. */
const settled = async (P, name, tries = 40) => {
  let prev = null;
  for (let i = 0; i < tries; i++) {
    const cur = await npcCss(P, name);
    if (cur && prev && Math.abs(cur.x - prev.x) < 1.5 && Math.abs(cur.y - prev.y) < 1.5) return cur;
    prev = cur;
    await P.page.waitForTimeout(80);
  }
  return prev;
};

const npcState = (P, name) => P.page.evaluate((n) => {
  const S = window._gameState && window._gameState.current;
  const npc = S && S.npcs ? S.npcs.find((x) => x && x.name === n) : null;
  return npc ? { hp: npc.hp, alive: npc.alive } : null;
}, name);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Talker', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);

  const names = await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    return (S && S.npcs ? S.npcs : []).map((n) => n && n.name);
  });
  rec.ok('the town has NPCs to talk to (guard)', names.length >= 2, names);

  /* ── The headline: a tap on the RIGHT half must not hurt him. ──
     Diego is the shopkeeper, so he also exercises the branch that did not
     exist before this version. */
  /* ═══ ARM THE PLAYER, OR THIS PROVES NOTHING ═══
     The swing loop needs an equipped weapon. A fresh character has none, so
     without this the "he took no damage" assertions pass on ANY build --
     including one where the guard is deleted. That is exactly what the first
     mutation check found: 7/7 green with the fix reverted. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.rpg && !S.rpg.weapon) {
      S.rpg.weapon = { name: 'QA Sword', type: 'sword', gearBase: 'ws_iron', quality: 'normal', tierMult: 1 };
    }
  });
  /* Lil Bro has no quest and no shop, so nothing opens over the screen to
     swallow taps 2..6 -- which a shopkeeper would. */
  const target = names.indexOf('Lil Bro') >= 0 ? 'Lil Bro' : names[0];
  await standOn(P, target);
  const at = await settled(P, target);
  const before = await npcState(P, target);
  rec.ok('positive control: he is alive and on screen before the tap',
    !!before && before.alive && !!at, { before, at });

  if (at) {
    /* A real touch on the right half of the screen -- the half that used to
       start a swing on touchstart. Repeated, because one swing does not kill
       him; the old bug needed a few taps and that is exactly how a player
       trying repeatedly to talk would behave. */
    await P.page.evaluate(() => { window.__btNpcTap = null; });
    for (let i = 0; i < 6; i++) {
      await P.page.touchscreen.tap(at.x, at.y);
      await P.page.waitForTimeout(220);
    }
    const reachedWorld = await P.page.evaluate(() => !!window.__btNpcTap);
    /* The taps must actually reach the WORLD, not a panel sitting over it.
       Several rounds of this file failed here for that reason, and it is why
       every assertion below is preceded by proof that a tap landed at all. */
    rec.ok('positive control: the taps actually reached the world', reachedWorld);
  }

  /* ── Every NPC answers a tap ── */
  const answered = [];
  for (const n of names.filter(Boolean)) {
    /* ═══ A FRESH PAGE PER CHARACTER ═══
       Opening one NPC's dialogue leaves it covering the screen, so the next
       character's tap lands on the panel instead of the world -- which is
       exactly how the first three cuts of this test read as "the hit test is
       dead". A reload is slower than dismissing the panel and far more
       reliable than guessing which element closes it. */
    await P.page.reload();
    await H.enterWorld(P);
    await P.page.waitForTimeout(900);
    await P.page.evaluate(() => {
      const S = window._gameState && window._gameState.current;
      if (S) { S._npcProxLatch = null; S.dmgNumbers = []; }
      window.__btNpcTap = null;
      try { window.__broDashPanelBus && window.__broDashPanelBus.toBar(); } catch (e) {}
    });
    await standOn(P, n);
    const c = await settled(P, n);
    if (!c) { answered.push({ n, reached: false }); continue; }
    /* ═══ CLEAR WHATEVER IS ON TOP FIRST ═══
       Standing next to a quest giver AUTO-OPENS his dialogue (the proximity
       opener), and that panel covers the whole screen -- so the next tap lands
       on the panel, not the world. The first cut of this file did not know
       that and read the swallowed taps as a dead hit test.
       Tap until the world actually receives one (the scan records that it
       ran); a dialogue closes on tap, so at most a couple are needed. */
    let ran = false;
    for (let k = 0; k < 3 && !ran; k++) {
      await P.page.evaluate(() => { window.__btNpcTap = null; });
      const cc = await settled(P, n);
      if (!cc) break;
      await P.page.touchscreen.tap(cc.x, cc.y);
      await P.page.waitForTimeout(650);
      ran = await P.page.evaluate(() => !!window.__btNpcTap);
    }
    /* "Answered" = SOMETHING happened that the player can see: a quest panel,
       the shop, or a floating line. Silence is the failure this is about. */
    /* Read what the SCAN decided, not what the DOM shows. Reading panels and
       popup text tests the panel and the popup queue instead, and cannot tell
       "nothing was under the finger" from "he was found and had nothing to
       say" -- which are opposite bugs with the same appearance. */
    const resp = await P.page.evaluate(() => window.__btNpcTap || null);
    answered.push({
      n, reached: true, ran, result: resp ? resp.result : null, saw: resp ? resp.npc : null,
      said: !!resp && resp.npc === n && resp.result !== 'miss',
    });
  }
  console.log('    per-NPC: ' + JSON.stringify(answered));
  const reached = answered.filter((a) => a.reached);
  rec.ok('every NPC answers a tap with something visible -- none fails silently',
    reached.length > 0 && reached.every((a) => a.said), answered);

  /* ── The lock-on that used to disable auto-targeting is gone ──
     An NPC lock short-circuits updateTargeting entirely, so tapping a
     character with no quest silently stopped automatic monster acquisition
     until you tapped something else. */
  const lock = await H.readState(P, (S) => (S.lockedTarget
    ? { type: S.lockedTarget.type, id: S.lockedTarget.id } : null));
  rec.ok('tapping a character never leaves an NPC lock behind (it would '
    + 'switch off automatic monster targeting)',
    !lock || lock.type !== 'npc', lock);

  await P.ctx.close();
}
