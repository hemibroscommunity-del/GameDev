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

   `opts.light` is the in-sheet spend variant: the notification only —
   screen shake and a particle explosion under a modal sheet read as a
   bug, not a party.

   v2.3.2610: this file makes no SOUND any more and pushes no world text.
   Both belonged to the celebration v2.3.2591 replaced, and both were still
   firing under the new one — the owner's "it also played the legacy level
   up".  The sting now lives with the art, in LevelUpBurst's own mount
   effect, so there is exactly one place that decides what a level-up sounds
   like.  (This is why neither BT_AUDIO nor pushDmgPopup is imported here any
   more; if you find yourself re-adding one, that is the regression.) */

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

  /* ═══ v2.3.2610: THE LEGACY FANFARE IS GONE ═══
     Owner: "it also played the legacy level up."
     BT_AUDIO.levelUp() (gameDisplay.js) is a seven-note square-wave arpeggio
     with a sustained chord at 600ms — the celebration v2.3.2591 replaced.  It
     was still being fired here, and on four other paths, UNDER the new sting
     the burst plays from its own mount effect.  Both sounded, every time; the
     art was new and half of what you heard was the thing it replaced.
     Nothing takes its place at this call site on purpose: the sting belongs to
     the overlay (LevelUpBurst.playLevelUpSting), where it starts on the same
     commit that paints frame 0 — which is what makes "simultaneously" true. */
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
  /* ═══ v2.3.2610: THIS IS A CHARACTER LEVEL, AND IT SAYS SO ═══
     Owner: "if it's combat level just show the character portrait in the center
     of the new level up animation."
     Every path into this function raises R.level — the CHARACTER level — with
     no skill attached, so 'combat' was never quite the right word for it and
     the medallion fell through to a generic XP glyph.  'char' seats the
     character's own portrait there instead (levelUpIcons.levelUpMedallionSrc).
     The pools line moves onto the message too: the burst's caption is where
     that information lives now, rather than in the world-space floaters this
     used to push at the player's feet (removed below). */
  /* ═══ ...BUT NOT TWICE FOR ONE LEVEL ═══
     Under prog3 this function no longer OWNS the character level — the worker
     announces it the moment it happens, in wsClient's prog3_level handler,
     which pushes the 'char' burst with the real gains on it.  R.level catches
     up a beat later when the player_state carrying the new blob lands, and
     then the next kill arrives here with `to > from` and every reason to
     believe it has news.  It does not: the player would see the same
     "Character · Level 14" a second time, a few seconds after the first, which
     is its own small version of the notification not being trustworthy.
     `_lastCharLvlShown` is the high-water wsClient stamps when it announces
     one, so this reads that rather than keeping a second record.  Only the
     MESSAGE is suppressed — the pool refill, the shake and the particles below
     still run, because those are the power moment and the worker does not
     send them. */
  var announced = (R._lastCharLvlShown || 0) >= to;
  if (setMsg && !announced) setMsg({ kind: 'char', level: to, gains: 'HP \xB7 Stamina \xB7 Mana refilled', ts: Date.now() });

  if (opts.light) {
    /* In-sheet spend: the overlay's own sting, nothing else — a screen shake
       and a particle explosion under a modal sheet read as a bug, not a party.
       v2.3.2610: the legacy fanfare that used to fire here is gone with the
       rest of them (see celebrateLifeSkillLevel's note). */
    return true;
  }

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
    /* v2.3.2610: the world-space 'LEVEL N!' / 'HP/MANA RESTORED' floaters that
       used to be pushed here are gone.  They are the old celebration's text,
       drawn into the Pixi world at the player's feet, and they were still
       playing under the new overlay — which is the second half of the owner's
       "it also played the legacy level up", the half you can see rather than
       hear.  Both facts they carried are in the burst's caption now (the level
       in the headline, the refill in the gains line).  The PARTICLES and the
       screen shake stay: those are the power moment, they are not text, and
       nothing in the new art replaces them. */
  }
  return true;
}
