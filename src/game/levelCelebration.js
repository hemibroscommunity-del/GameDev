/* ═══ v2.3.1342: LEVEL-UP CELEBRATION — the one shared "you leveled!"
   moment ═══

   Extracted from the three kill-path copies (groundLoot.js,
   monsterCombat.js, projectiles.js) because level-is-build gives the
   game a FOURTH level-up site: spending a T2 point in the Build sheet
   is now +1 combat level (owner directive 2026-07-16 — every level up
   should feel powerful), and the kill loops never run while the sheet
   is open.

   Behavior notes vs the old per-site loops:
   - The old `while` loops fired the full burst once PER level gained.
     A multi-level jump (rapid spends, clamp heals) now fires ONE
     celebration at the final level — the banner was replace-not-queue
     anyway (single useState in BroTown), so nothing user-visible is
     lost, and a 10-point spend no longer queues 10 particle bursts
     and 40 setTimeout chimes.
   - DOWNWARD CLAMP: level-is-build can lower a save's level (skill
     levels earned but points unspent).  Without re-baselining,
     _lastShownLevel would hold the old high-water and mute every
     celebration until the player re-passed it.

   `opts.light` is the in-sheet spend variant: banner + chime only —
   screen shake and a particle explosion under a modal sheet read as a
   bug, not a party. */

import { BT_AUDIO } from '@/data/index.js';
import { pushDmgPopup } from '@/game/combatHelpers.js';

/* ═══ v2.3.1915: A LIFE SKILL LEVEL IS A LEVEL ═══
 *
 * Owner: "Leveling up the life skills needs a bigger celebration message I
 * didn't even notice my woodcutting went up 2 levels."
 *
 * They could not have noticed. A combat level fires the screen-space banner,
 * a chime, a screen shake and a forty-particle burst; a life skill pushed a
 * pushDmgPopup — a small world-space text, drawn into the Pixi world at the
 * player's feet. That is the worst possible place for it: you are mid-harvest
 * with the extraction cue under your thumb and your eyes on the swipe meter,
 * and the world is exactly where you are not looking. Two levels went by.
 *
 * So life skills get the same banner. Not the same WEIGHT — no screen shake
 * and a smaller burst, because a woodcutting level is not a character level
 * and the celebration should not claim it is — but the same place on screen,
 * which is the part that decides whether it is seen.
 *
 * `gained` is carried so a multi-level jump says so. The report was not "I
 * missed a level", it was "I missed TWO", and a banner reading Level 7 tells
 * someone who last looked at 5 nothing about what happened in between.
 */
export function celebrateLifeSkillLevel(S, skill, toLevel, fromLevel) {
  var to = Math.max(1, Math.floor(toLevel || 1));
  var from = Math.max(0, Math.floor(fromLevel == null ? to - 1 : fromLevel));
  var gained = Math.max(1, to - from);
  var label = String(skill || '').replace(/^./, function (c) { return c.toUpperCase(); });

  var setMsg = (typeof window !== 'undefined' && typeof window._setLevelUpMsg === 'function')
    ? window._setLevelUpMsg : null;
  if (setMsg) setMsg({ kind: 'life', skill: skill, label: label, level: to, gained: gained, ts: Date.now() });

  try { BT_AUDIO.levelUp(); } catch (e) { void e; }
  if (!S) return true;
  S._levelUpFlash = Date.now();
  /* Half the combat burst, and no screen shake: loud enough to catch the eye
     away from the swipe meter, quiet enough that it does not read as a
     character level. */
  var at = S.player;
  if (at && S.hitParticles) {
    for (var i = 0; i < 20; i++) {
      var a = i / 20 * Math.PI * 2;
      var sp = 2 + Math.random() * 4;
      S.hitParticles.push({
        x: at.x, y: at.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2,
        life: 1.0,
        color: ['#f5c542', '#fbbf24', '#3dd497', '#fff'][Math.floor(Math.random() * 4)],
      });
    }
  }
  return true;
}

export function celebrateLevelUps(S, R, opts) {
  if (!S || !R) return false;
  opts = opts || {};
  /* Downward clamp (see header). */
  if ((R._lastShownLevel || 1) > (R.level || 1)) R._lastShownLevel = R.level || 1;
  var from = R._lastShownLevel || 1;
  var to = R.level || 1;
  if (to <= from) return false;
  R._lastShownLevel = to;

  /* Every level-up refills the pools — the guaranteed "power moment". */
  R.hp = R.maxHp;
  R.stamina = R.maxStamina;
  R.mana = R.maxMana;

  var setMsg = opts.setLevelUpMsg
    || (typeof window !== 'undefined' && typeof window._setLevelUpMsg === 'function' ? window._setLevelUpMsg : null);
  if (setMsg) setMsg({ kind: 'combat', level: to, ts: Date.now() });

  if (opts.light) {
    /* In-sheet spend: chime only. */
    try { BT_AUDIO.levelUp(); } catch (e) { void e; }
    return true;
  }

  try { BT_AUDIO.collect(); } catch (e) { void e; }
  /* ═══ LEVEL UP BURST — celebratory particle explosion ═══ */
  S.screenShake = 8;
  S._levelUpFlash = Date.now();
  var at = opts.burstAt || S.player;
  if (at && S.hitParticles) {
    for (var lp = 0; lp < 40; lp++) {
      var lpAngle = lp / 40 * Math.PI * 2;
      var lpSpd = 3 + Math.random() * 5;
      S.hitParticles.push({
        x: at.x,
        y: at.y,
        vx: Math.cos(lpAngle) * lpSpd,
        vy: Math.sin(lpAngle) * lpSpd - 2,
        life: 1.2,
        color: ['#f5c542', '#fbbf24', '#60a5fa', '#3dd497', '#a78bfa', '#fff'][Math.floor(Math.random() * 6)],
        size: 2 + Math.random() * 3
      });
    }
    /* Rising level text */
    pushDmgPopup(S, at.x, at.y - 50, 'LEVEL ' + to + '!', '#f5c542');
    pushDmgPopup(S, at.x, at.y - 35, 'HP/MANA RESTORED', '#3dd497');
  }
  /* Ascending chime */
  try {
    BT_AUDIO.beep(523, 0.1, 0.08, 'sine');
    setTimeout(function () { BT_AUDIO.beep(659, 0.08, 0.06, 'sine'); }, 100);
    setTimeout(function () { BT_AUDIO.beep(784, 0.08, 0.06, 'sine'); }, 200);
    setTimeout(function () { BT_AUDIO.beep(1047, 0.12, 0.1, 'sine'); }, 300);
  } catch (e) { void e; }
  return true;
}
