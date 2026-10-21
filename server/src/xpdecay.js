/* ═══ v2.3.3251: XP FADES FOR WHAT IS WELL BELOW YOU ═══
 *
 * Owner, 2026-10-14: "Yes adjust the xp.  Also make xp decay if you're trying
 * to harvest lower level things.  This also applies to combat.  Xp should
 * begin decaying starting at 5 levels below your current level.  It should
 * always be most efficient to harvest or fight things within your current
 * level."
 *
 * THE RULE.  gap = your level - its level.
 *   - gap 4 or less (up to 4 levels below you, at your level, or above you):
 *     full XP;
 *   - gap 5: a third (XP_DECAY.START);
 *   - each level past that: 15% less again (XP_DECAY.STEP 0.85).
 *   So 5 below 33%, 6: 28%, 7: 24%, 8: 21%, 9: 17%, 10: 15%, 15: 6.6%,
 *   20: 2.9%.
 *
 * "Your level" and "its level":
 *   - a HARVEST: your Mining, Woodcutting or Fishing against the level the
 *     resource asks (gathering.js GATHER_REQ_LVL): copper and iron 1, black
 *     steel 5, titanium 10, obsidian 15; pine and minnow 1, then 5, 10, 15, 20.
 *   - a FIGHT: the trained skill the XP goes INTO (Melee, Bow or Magic: the
 *     weapon that dealt the damage) against the monster's level.  That is the
 *     yardstick the relative points already measure a monster against
 *     (prog3.js prog3Yardstick), and the level the name plate's colour reads.
 *     Never the character level: that is the SUM of the three, so a player
 *     with all three at 10 is "Lv 30" and every monster below 26 would have
 *     paid them a third.  (v2.3.3538: the character level is the HIGHEST of
 *     the three now, but a lane still fades by its own skill: Bow 3 beside
 *     Melee 20 earns full Bow XP off a level-3 monster.)
 *
 * WHY THESE TWO NUMBERS.  The hit ladder makes a resource much quicker in the
 * five levels after it opens, and the next tier opens five levels later, so
 * when a new tier opens the one before it is fast.  At Mining 10, at full XP,
 * black steel (opens at 5) would pay ~2.5x titanium's XP a second.  A third
 * at gap 5 puts titanium ahead by 20%.  Then 15% less a level keeps the newest
 * resource ahead even where nothing is within your level (Mining 20: obsidian
 * at gap 5 against titanium at gap 10).  gather-hits §13 checks every level
 * 1-100 of all three skills: what is within your level always pays the most
 * XP a second, by at least ~20%, and the newest resource most of all.  In a
 * fight the XP is the damage you deal (PROG3.XP_PER_DMG), the same each second
 * whatever you hit, so a third at gap 5 is a third of the rate.
 *
 * The factor is built by MULTIPLYING, not Math.pow: multiplication is exactly
 * rounded on every engine and Math.pow need not be, and the game's copy of a
 * harvest's "+N Mining XP" (src/data/xpDecay.js, mirror-audit) has to round
 * to the same whole number on an iPhone's JavaScriptCore as here.
 *
 * KILL SWITCH: `xpdecay: false` in liveflags (lower case, TRAPS §117) pays
 * full XP everywhere again, harvests and fights, from the next one on, and
 * un-advertises caps.xpdecay so the game's "+N Mining XP" follows at the
 * player's next join.  Delete the flag to turn it back on.
 */
export const XP_DECAY = { FULL_GAP: 4, START: 1 / 3, STEP: 0.85, GAP_MAX: 200 };

/* The share of the XP paid, 0..1, for something at `itsLevel` to a player at
   `yourLevel`.  1 when either level is missing or not a number. */
export function xpDecayMult(yourLevel, itsLevel) {
  if (yourLevel == null || itsLevel == null) return 1;
  const you = Number(yourLevel), it = Number(itsLevel);
  if (!Number.isFinite(you) || !Number.isFinite(it)) return 1;
  const gap = Math.min(XP_DECAY.GAP_MAX, Math.floor(you) - Math.floor(it));
  if (gap <= XP_DECAY.FULL_GAP) return 1;
  let m = XP_DECAY.START;
  for (let g = XP_DECAY.FULL_GAP + 1; g < gap; g++) m *= XP_DECAY.STEP;
  return m;
}

/* A whole-number award after the fade: rounded to the nearest, never below 1
   (a harvest always pays something). */
export function xpAfterDecay(xp, mult) {
  const x = Number(xp) || 0;
  if (!(mult < 1)) return x;
  return Math.max(1, Math.round(x * mult));
}

export const xpDecayMethods = {
  /** `xpdecay: false` in the liveflags key: full XP everywhere. */
  _xpDecayOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'xpdecay') && !f.xpdecay);
  },

  /** A fight's factor: `cat`'s trained skill (sword | bow | staff) against the
   *  monster's level.  1 with the switch thrown, for a player with no trained
   *  skills, an unknown cat, or a monster with no level.  Every damage source
   *  that pays trained XP multiplies its CREDITED damage by this, per monster
   *  (combat.js: a swing or shot and the staff's splash; abilities.js: the
   *  lunge, dash, bash and whirlwind; burst.js; arrowblast.js), before
   *  _prog3AwardXp; a quest's flat XP never passes through it. */
  _combatXpDecay(ps, cat, monsterLevel) {
    if (this._xpDecayOff()) return 1;
    const sk = ps && ps.prog3 && ps.prog3.sk;
    const s = (sk && typeof cat === 'string' && Object.prototype.hasOwnProperty.call(sk, cat)) ? sk[cat] : null;
    if (!s || typeof s !== 'object') return 1;
    return xpDecayMult(Math.max(1, Number(s.level) || 1), monsterLevel);
  },
};
