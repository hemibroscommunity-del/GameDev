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
