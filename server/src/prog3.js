/* ═══ v2.3.1659: PROG3 — the trained-skill combat progression ═══
 *
 * The OSRS-inspired combat rebuild (docs/PROGRESSION-REDESIGN.md,
 * owner-approved 2026-08-13 "Go recommended"; spec:
 * docs/specs/progression-v3.md).  Replaces the six-parent T2 grid
 * economy for every player carrying `ps.prog3`:
 *
 *   - THREE trained skills — sword (Melee), bow, staff (Magic) —
 *     level 1..100 by USE: the server awards damage-proportional XP at
 *     hit time in _handleMonsterDamage (§9-A full server ownership;
 *     the client-only _buildProg track dies with the client slice).
 *     Specials credit staff/Magic (§3; they scale on magic level too).
 *   - Character level = Σ trained levels, cap 300 (fresh character =
 *     3).  EVERY trained level-up is +1 character level + 1 allocation
 *     point, immediately.
 *   - SEVEN allocated stats (def / hp / dodge / stam / crit / critDmg
 *     / aspd), linear per-point values with hard caps (§4-A), each
 *     stat additionally capped at min(100, character level) (§6-C —
 *     you can go defense-first but you can't outrun your level).
 *     Allocation is a server endpoint (prog3_allocate), not
 *     client-applied-and-clamped.
 *
 * TRUST POSTURE: ps.prog3 is SERVER-OWNED end to end — never ingested
 * from a join payload or stats_update (the t2Flat rule, v2.3.1451:
 * anything that feeds the damage roll AND the anticheat ceiling must
 * not be client-suppliable, or a forged value raises its own cap).
 * Join adoption reads the STORED blob only; first-connect bootstraps
 * respec from the sanitized legacy tracks via prog3FromLegacy (the
 * migration-v10 boundary heal, same pattern as v4/v9).
 *
 * LEGACY COEXISTENCE (dual-path, §10): every combat formula branches
 * on `ps.prog3` — present = new math, absent = the old T2 math
 * unchanged.  The 30-channel reads are gated off for prog3 players at
 * their choke points (_t2Flat returns 0; the point-count helpers
 * return neutral) so dropped channels can't keep paying.  The
 * anticheat ceilings (_maxWeaponDmg/_maxDmgForAttacker) carry the
 * same branch IN THE SAME COMMIT — ceiling and roll move in lockstep
 * or every legit hit gets rejected (the v2.3.1451 invariant).
 * The old fields (weaponSkills/weaponSpecs/defenseSpec/hpSpec/
 * enduranceSpec/t2Flat/T1 stats) stay stored for rollback; the
 * cleanup PR retires them after soak (§10 PR-6, v2.3.1155 precedent).
 */

/* ═══ v2.3.2592: THE FOUR-COLUMN POINTS REDESIGN (owner, 2026-09-16) ═══
 *
 * Owner: "Right now spending and applying and using combat points is not a
 * fun experience.  I'm proposing a layout shift and a redesign to the combat
 * points themselves."  Three things changed together, because they share the
 * allocation grid and one migration:
 *
 *   1. SIX STATS PER COMBAT TYPE — Range, Power, Speed, Luck, Special,
 *      Elemental.  `dmg` (Power), `aspd` (Speed) and `elem` keep their
 *      storage keys and their per-point values; `crit` and `critDmg` FOLD
 *      into one `luck` stat that buys both halves of a crit at once; `range`
 *      (reach) and `special` (special-attack damage) are new.
 *   2. SEVEN SHARED STATS — HP, Def, MP, Stamina, Dodge, Move Speed, Elem
 *      Resist.  `move` is the one arrival; the rest are the BODY table as it
 *      stood.
 *   3. A SECOND POOL.  Owner: "for every point earned through one of the 3
 *      combat channels, you earn one 'shared' point too.  You get both points
 *      but only the point earned in the combat channel can be spent there
 *      (the point for shared can be allocated to any in that shared pool)."
 *      So a level-up mints POINTS_PER_LEVEL lane points (stamped to the
 *      earning skill, spendable ONLY on that skill's six) AND
 *      SHARED_POINTS_PER_LEVEL shared points (spendable ONLY on the seven
 *      shared stats).  This RETIRES the v2.3.2176 rule that a lane point may
 *      buy a defensive stat — the shared pool is where that spend lives now.
 *      `prog3.shared` holds the pool; `prog3.spl` stamps the rate it was
 *      granted at (the `ppl` pattern) so the retro grant is idempotent.
 *
 * WHAT HAPPENS TO WHAT PLAYERS ALREADY HAVE (migration v17, and the same
 * fold at the join boundary because migrations fail open):
 *   - crit + critDmg points are REFUNDED into the lane that holds them
 *     (pool AND poolBy[cat] both grow, so the parts-≤-whole invariant holds).
 *     The v11/v15 precedent, and better than either: the stat was already
 *     per-lane, so the refund lands in the lane that paid for it and nobody
 *     has to guess.
 *   - every character is GRANTED SHARED_POINTS_PER_LEVEL × (level − 1) per
 *     skill, exactly what a fresh character reaching the same levels would
 *     hold.  Body points already placed with lane points STAY placed: taking
 *     them back would read as theft, and refunding the lane points that paid
 *     for them is impossible to do honestly (nothing recorded which lane
 *     paid).  A veteran therefore comes out slightly AHEAD of a fresh
 *     character, by the body points they bought under the old rule — the
 *     v10 defense-carry posture ("a one-time bonus"), chosen over any option
 *     that strands or claws back earned points.
 *   - the unchannelled remainder (`pool − Σ poolBy`, points that predate
 *     v2.3.2176) stays spendable ANYWHERE — lane offense or shared — as it
 *     always was.  The milestone bonus points (abilities.js) keep minting
 *     into that remainder.
 *
 * Deploy-order (rule 19): the worker advertises `caps.prog3shared`.  The
 * client gates DISPLAY on it — the three new lane rows, the move row, the
 * luck readouts and the shared-pool counts; against an old worker it draws
 * that worker's grid and pools.  Nothing NEW is sent: a prog3_allocate naming
 * `luck` with a `cat` is shaped exactly like today's per-type spends, and an
 * old worker's whitelist simply refuses the name.  Against a NEW worker an
 * old client keeps sending `cat` on body spends, which this endpoint now
 * ignores (the point comes off the shared pool). */
export const PROG3 = {
  SKILLS: ['sword', 'bow', 'staff'], // storage keys; displayed Melee / Bow / Magic
  LEVEL_CAP: 100,                    // per trained skill
  CHAR_LEVEL_CAP: 300,               // Σ trained levels
  /* v2.3.1727: 1.0 -> 0.4.  XP is paid per point of damage DEALT, so
     raising DMG_PER_LEVEL below would have sped levelling up by the same
     factor it sped killing up — the two dials are one system and moving
     either alone regresses the other.  See the pacing note on
     DMG_PER_LEVEL for the measured checkpoints. */
  XP_PER_DMG: 0.4,                   // was the legacy WEAPON_XP_PER_DMG's 1.0
  /* ═══ v2.3.2199: THREE POINTS PER LEVEL (owner, 2026-09-01) ═══
   * "Each level up gives the character 3 points to spend instead of 1."
   * One constant, four readers: the level-up mint (_prog3AwardXp), the
   * respec (prog3FromLegacy), the retro grant (prog3GrantRetroPoints /
   * migration v14 — existing characters are back-paid so a veteran equals
   * a fresh character that trained to the same levels), and the client
   * banner (mirror).  The blob stamps the rate it was granted at in
   * `ppl`, which is what makes the back-pay idempotent AND makes any
   * future rate change a one-line migration instead of archaeology. */
  POINTS_PER_LEVEL: 3,
  /* ═══ v2.3.2592: ...AND THREE SHARED POINTS BESIDE THEM ═══
   * "For every point earned through one of the 3 combat channels, you earn
   * one 'shared' point too."  One-to-one with the lane mint by the owner's
   * own words; kept as its own constant so the ratio is one dial.  Four
   * readers: the level-up mint (_prog3AwardXp), the respec (prog3FromLegacy),
   * the retro grant (prog3GrantSharedPoints / migration v17) and the client
   * banner (mirror).  At this rate a character that trains all three skills
   * to 100 has minted 891 shared points against 625 shared sinks, so every
   * shared stat CAN be maxed by roughly character level 220 — the lane
   * pools stay sharp (297 points against 525 sinks per lane).  If live play
   * wants shared choices sharper too, this is the number to lower. */
  SHARED_POINTS_PER_LEVEL: 3,
  /* ═══ v2.3.1668: BODY vs ATK (owner, 2026-08-11) ═══
   *
   * "The attack power (crit chance, attack speed, etc) are specific to the
   * combat type (bow melee or magic)."  v2.3.1659 shipped all seven as one
   * global set, following the design paper's §4 collapse table, which
   * folded the three per-weapon crit channels into one.  That reads wrong
   * in play: a bow build's crit has nothing to do with a staff, and the
   * old T2 system was per-weapon for exactly that reason.
   *
   * BODY stats are global — they describe your character, not the thing in
   * your hands, and "Melee HP vs Bow HP" is not a distinction anyone can
   * justify.  ATK stats are allocated PER COMBAT TYPE, so specialising in
   * Bow means investing in Bow's crit specifically.
   *
   * The point pool WAS single and shared, "which is what keeps the choice
   * sharp: points spent on Melee's crit are points not spent on Magic's."
   *
   * ═══ v2.3.2176: POINTS REMEMBER THE SKILL THAT EARNED THEM ═══
   * Owner, correcting the model this file had: "There are 3 primary combat
   * skills.  You earn stat points that one of those primary combat skills
   * channels.  You can only apply offensive weapon damage to the combat
   * skills you leveled up in.  However you can apply that stat point to any
   * defensive attribute (max hp, defense, dodge, stamina) regardless of what
   * channel you earned the point through.  That's the nuanced difference."
   *
   * So a point is stamped with its channel at the moment of the level-up:
   * `poolBy[cat]`.  An OFFENSE spend on Bow must draw a Bow point; a BODY
   * spend may draw from whichever channel the player is standing in.  The
   * old sharpness survives in a better place -- a Bow point is still a
   * point not spent on Magic's crit, but now because it never could be.
   *
   * `pool` REMAINS the total and remains the field everything else reads
   * (the client's prog3Pool, the persistence echo, the migrations).  The
   * breakdown is additive: `poolBy` sums to at most `pool`, and the
   * remainder -- points that predate this change, with no channel on
   * record -- is spendable ANYWHERE.  That is the only honest migration:
   * nobody's earned points get stranded behind a rule that did not exist
   * when they earned them.
   */
  /* ═══ v2.3.2680: RELATIVE POINT VALUE — every point felt, early ═══
   * Owner, 2026-09-22: "I want each point to matter during the early level
   * up phases of the game.  If a character is putting his first 5 points
   * into dodge I want them to experience a high rate of dodging RELATIVE to
   * the same or lesser monster level they're playing.  It can decay quickly
   * for higher level monsters for balance reasons."  And, earlier the same
   * day: "I don't really like the idea of capping."
   *
   * Under the linear shape this block had until now, 5 Dodge points were
   * 2 % -- invisible -- and so were 5 points of Defense, Resist, Move, Luck,
   * Speed, Range or Special.  So every stat that changes a hit or a stride
   * now reads a FRONT-LOADED CURVE instead of `pts × per`:
   *
   *     value = max × q / (q + k)
   *
   * `max` is where the stat heads and never reaches; `k` is how fast.  The
   * first point is the biggest and every later one a little smaller, so a
   * stat never stops paying and never needs a cap.  With max 0.9 / k 7 the
   * owner's case reads: 5 Dodge points = 37.5 % dodge, 20 = 67 %, 90 = 83 %.
   *
   * For the seven stats that change a hit (`rel: true`: Power, Luck,
   * Special, Element, Defense, Dodge, Resist), q is the point count scaled
   * by the EDGE (prog3Edge): full against a monster at or below your level,
   * −20 % per level above, gone at +5 — the owner's "decay quickly for
   * higher level monsters".  "Your level" is the LANE's trained skill for a
   * lane stat and your highest skill for a shared one (cheap off-lane levels
   * can't lift it; docs/specs/relative-points.md §2).  Move, Speed and Range
   * are not evaluated against any monster, so they take the curve alone.
   * HP, Stamina and Mana are pools and keep their linear `per` and caps.
   *
   * `cap` on a curve stat is the storage bound (999), not a design limit.
   * The real limit is the §6-C per-level bound, and `lvlBound` loosens it
   * to 2 × character level on the four damage stats (owner, 2026-09-22:
   * "keep per level limit on those 3" — Defense, Dodge, Resist).
   *
   * NO MIGRATION: a point is still a point.  Every existing holding reads
   * higher on the curve than it did on the line (100 Defense: 40 % → 84 %),
   * so nobody's build weakens and no conversion is owed.
   *
   * LOCKSTEP: the roll (combat.js), the anticheat ceilings (which assume
   * edge 1 — the largest any monster can give), the move bound
   * (movement.js), elemAttackStat (elemental.js) and the client mirror
   * (src/data/prog3.js) all read these rows through prog3Curve/prog3Edge.
   * mirror-audit §12 pins the rows' values AND key sets. */
  BODY: {
    def:     { cap: 999, max: 0.90, k: 7, rel: true },  // v2.3.2680: damage-taken cut, 5 pts 37.5 % → 20 pts 67 %
    hp:      { cap: 100, per: 8 },      // +8 max HP/pt → +800
    dodge:   { cap: 999, max: 0.90, k: 7, rel: true },  // v2.3.2680: 5 pts 37.5 % → 20 pts 67 % (owner's "first 5 points into dodge")
    stam:    { cap: 100, per: 3 },      // +3 max stamina/pt → +300
    /* ═══ v2.3.2512: ELEMENTAL RESISTANCE (owner ask, backlog D12) ═══
       The defensive half of the elemental system, which until now had none:
       the ONLY thing in the game that reduced elemental damage was the 5%
       cooking buff, and the stone amulet's `elemResist` field was read by a
       client-local AI path the server never consulted.

       Shape copied from `dodge` deliberately — same cap, same per-point
       percent — because it is the same kind of promise ("this much less of
       a thing that happens to you") and a player should not have to learn
       two scales.  −0.4%/pt, −30% at the 75-pt cap.

       WHAT IT RESISTS is a closed list, stated here because a stat with
       nothing to resist is dead content: damage the server itself minted
       through an ELEMENTAL source — the fire goblin's trail (firetrail.js)
       and the blue slime's death burst (telegraph.js SLIME_BURST).  Those
       are the two typed damage sources that exist.  An ordinary monster
       swing is NOT typed today, so it is not resisted; the day one is, its
       call site passes `{ elemental: true }` to _applyDamage and it joins
       the list with no change here. */
    eres:    { cap: 999, max: 0.90, k: 7, rel: true },  // v2.3.2680: elemental-damage cut, same curve as def/dodge
    /* ═══ v2.3.2512: MAX MANA becomes a stat (owner ask) ═══
       It was never allocatable: maxMana was `100 + magicLvl × 2.5`, derived
       wholly from the Magic SKILL, so the only way to grow the pool was to
       train Magic even for a melee build that only wants specials.

       ADDED ON TOP of that derivation rather than replacing it, which is the
       reading that leaves every current player's mana EXACTLY where it is at
       zero points — nobody loses a pool they already had.  The per-point
       value is MANA_PER_MAGIC_LEVEL, so "one point buys what one Magic level
       buys" and there is one number to reason about, not two.

       THE BLOCK LADDER MOVES WITH IT (see _prog3Recompute).  A special costs
       maxMana / manaBlocks, so growing the pool without growing the count
       would make each cast MORE expensive and buy exactly zero extra casts —
       which is the v2.3.1734 trap ("mana could not progress, by
       construction") re-entered through a different door.  Mana counts
       `magicLvl + points` on the same ladder stamina already counts its own
       allocated points on. */
    mana:    { cap: 100, per: 2.5 },    // +2.5 max mana/pt → +250
    /* ═══ v2.3.2592: MOVE SPEED (owner ask, the four-column redesign) ═══
       The seventh shared stat.  Movement is CLIENT-OWNED (BroTown.jsx reads
       calcMoveSpeed and multiplies by prog3MoveMult), so the server's job is
       the same as for `aspd`: store and validate the allocation, and keep
       the anticheat bound honest.  The move bound (movement.js) is 500 px/s
       sustained; a maxed stat on the fastest legitimate stack is 150 × 1.30
       × 1.15 (food) × 1.065 (amulet) × 1.5 (Swift Draught, which already
       widens the bound by 1.5) ≈ 358 px/s, and _prog3MoveMult widens the
       bound by the same 1.30 regardless, so the headroom the bound was sized
       with is preserved rather than spent.  Same shape as dodge/eres
       (+0.4%/pt, cap 75 → +30%): one scale to learn.
       v2.3.2680: the curve, max +35 % (5 pts +11.7 %, 75 pts +31 %); the
       bound math above holds at the asymptote (150 × 1.35 × … ≈ 372 < 500),
       and _prog3MoveMult widens the bound by the same number. */
    move:    { cap: 999, max: 0.35, k: 10 },  // v2.3.2680: move speed, 5 pts +11.7 %
  },
  ATK: {
    /* ═══ v2.3.2592: RANGE — "max distance attacks can be effective" ═══
       +0.5% reach per point, +50% at the 100-pt cap, PER TYPE.  Reach is
       client-owned like attack speed: the bow's arrow plant cap
       (BOW_RANGE_PX 675), the staff orb's life (STAFF_LIFE) and the melee
       swing envelope (SWING_RANGE / GS_INNER_RADIUS / GS_OUTER_RADIUS) all
       multiply by prog3RangeMult(rpg, cat).  Server bounds, checked rather
       than assumed: the PvE melee proximity gate is 400 px against a maxed
       outer reach of 108 + body + lag; ranged/staff have no PvE proximity
       gate by design (combat.js); PvP RANGE_CAP (250 / 950 / 950) clamps the
       client's claim and 675 × 1.5 = 1012 > 950 is clamped, not rejected.
       It replaces the legacy per-weapon Longshot channel (+1%/pt to ×2.0),
       which prog3 characters never had. */
    /* v2.3.2680: the curve, max +55 % (5 pts +18 %, 100 pts +50 % — today's
       cap).  At the asymptote 675 × 1.55 = 1046 is still CLAMPED by PvP's
       950, and melee's 108 × 1.55 = 167 px stays far inside the 400 px PvE
       proximity gate, so neither bound moves. */
    range:   { cap: 999, max: 0.55, k: 10 },  // v2.3.2680: reach, 5 pts +18 %, PER TYPE
    /* ═══ v2.3.2210: EVERY CHARACTER STARTS AT 1% ═══
       Owner: "I want crit chance to start at a flat 1% per damage type by
       default for each character."

       Before this, an unallocated character's crit roll was
       `Math.random() < 0` -- never true, in any weapon type, for the whole
       of the early game.  `base` is added to the allocated term rather than
       folded into it, so the two stay legible: 1% is what you HAVE, +0.3%/pt
       is what you BUY.  Per damage type by construction, because the whole
       ATK block is read per category (v2.3.1668).

       Anticheat is NOT affected by the chance: _maxDmgForAttacker's ceiling
       is built from the crit DAMAGE multiplier (dmgPer below).  Crit CHANCE
       has never entered that arithmetic -- the ceiling already assumes the
       crit happened.

       ═══ v2.3.2592: LUCK — "crit chance and crit damage" in ONE stat ═══
       The owner's list names Luck as both halves of a crit.  So `crit`
       (0.4%/pt, cap 75 → 30%) and `critDmg` (+1%/pt, cap 100 → ×2.5) fold
       into ONE stat with ONE 100-pt cap that lands on the SAME two endpoints:
       `per` is the chance rate (0.3%/pt → 1% + 30% = 31%) and `dmgPer` the
       damage rate (+1%/pt → ×2.5 at cap).  A point buys a little of both,
       which is what "luck" should feel like; the critDmg half is worthless
       without the chance half, and buying them together removes the trap
       the old pair had (a critDmg-only build that never crit).  Placed
       crit/critDmg points are REFUNDED to their lane by migration v17
       (prog3FoldLuck) — hands the choice back, the v11/v15 precedent.
       v2.3.2199's percent-on-the-multiplier reasoning stands for dmgPer:
       the flat +2 was monstrous early and rounding error late; a percent
       survives gear scaling, and compounding is bounded by the ×2.5
       ceiling.  Roll + anticheat ceiling (combat.js) + client display all
       move in this commit (the v2.3.1451 lockstep rule). */
    /* v2.3.2680: both halves on the curve — chance 1 % + 60 % × curve,
       multiplier 1.5 + 2.0 × curve (5 pts: 26 % / ×2.33).  `dmgMax` replaces
       `dmgPer`; the anticheat ceiling takes the multiplier at edge 1. */
    luck:    { cap: 999, max: 0.60, dmgMax: 2.0, base: 0.01, k: 7, rel: true, lvlBound: 2 },  // v2.3.2680: crit, PER TYPE
    aspd:    { cap: 999, max: 0.39, k: 10 },  // v2.3.2680: swing period cut, 5 pts −13 %, PER TYPE
    // aspd note: 600ms base × 0.65 × the 0.7 lag headroom = 273ms >
    // the 210ms server cadence floor (combat.js), so the existing
    // floor already covers a maxed prog3 build.  If the per-point
    // value ever grows past −50%, the floor must move in lockstep.
    // v2.3.2680: the curve's asymptote is −39 % (600 × 0.61 × 0.7 =
    // 256ms > 210ms), so the floor still covers it.
    /* v2.3.2199: FLAT DAMAGE — the stat players asked for ("levels don't
       feel strong" has a spend-side answer now).  +0.5/pt INSIDE the
       (effBase + statTerm) sum, PRE-tierMult, so it scales with gear like
       skill damage and never goes dead — but its RELATIVE value self-decays
       as the skill term grows (strong early buy, the weak offense buy at
       endgame; crit/aspd take over — see progression-v3.md §balance).
       3 points = one skill level's damage term (1.5) with none of the
       level's HP/mana/milestone side benefits.  Cap 75 (not 100): +37.5
       max, ~¼ of a maxed skill term.  ANTICHEAT LOCKSTEP: _maxWeaponDmg
       carries the same term, same commit. */
    /* v2.3.2680: POWER IS A MULTIPLIER on (weapon base + skill term), still
       pre-tierMult so gear scales it: × (1 + 1.0 × curve).  +0.5 flat was
       invisible early (5 pts +2.5 on a 15-damage hit) and a rounding error
       late; the multiplier is +42 % at 5 points and keeps its worth as the
       skill term grows.  ANTICHEAT LOCKSTEP: _maxWeaponDmg multiplies by the
       same _prog3PowerMult at edge 1, same commit. */
    dmg:     { cap: 999, max: 1.0, k: 7, rel: true, lvlBound: 2 },  // v2.3.2680: Power, 5 pts +42 %, PER TYPE
    /* ═══ v2.3.2512: ELEMENTAL POWER MOVES BODY → ATK (owner ask) ═══
       Was a single GLOBAL channel (v2.3.2199).  The owner's own split says
       attack power belongs to the combat type that produces it, and a staff
       build's burn has as little to do with a bow as its crit does — the
       reason the whole ATK block is per-type (v2.3.1668).  It is also the
       only way the Points screen can read honestly: ELEM PWR now sits inside
       MELEE / BOW / STAFF beside DAMAGE and CRIT, where the number that
       scales it is.

       Cap and per-point value are UNCHANGED (75 / +1 effective "power"), so
       a point buys exactly what it bought — it just buys it for one weapon.
       Every reader goes through elemAttackStat(ps, legacyName, cat), which
       now needs the category; the four call sites pass the slot the server
       already resolved, never the client's claim.

       MIGRATION v15 REFUNDS already-placed points to the pool rather than
       copying them into all three types (which would triple the investment)
       or picking one (which would be guessing) — the v11 precedent, for the
       identical reason. */
    elem:    { cap: 999, max: 120, k: 10, rel: true, lvlBound: 2 },  // v2.3.2680: elemental power, 5 pts 40, PER TYPE
    /* ═══ v2.3.2592: SPECIAL — "special attack damage" ═══
       +1% special-attack damage per point, +75% at the 75-pt cap, PER TYPE.
       Multiplies the per-weapon special multiplier (melee/bow 3×, each
       staff orb 2×, v2.3.1397) at the roll: `× (1 + pts × per)`.  A special
       costs a mana block, so the stat pays only when the pool does — it is
       the one offense buy that scales the Magic/MP investment rather than
       competing with it.  ANTICHEAT LOCKSTEP: _maxDmgForAttacker's
       specialMult carries the same term off the LARGEST lane (the candidate
       loop does not say which weapon won; loose rejects nothing, tight
       rejects legit maxed specials), in the same commit. */
    special: { cap: 999, max: 1.5, k: 7, rel: true, lvlBound: 2 },  // v2.3.2680: special damage, 5 pts +62.5 %, PER TYPE
  },
  /* ═══ v2.3.1727: THE RETUNE PROGRESSION-REDESIGN #13 DEFERRED ═══
   * Owner, after judging: "The players who are level 13 do not feel
   * significantly more powerful than the level 3 players... I DO want
   * leveling to feel more powerful than current is."
   *
   * They were right, and the numbers below were never meant to survive:
   * §7-A shipped +K/level as a FIRST GUESS "pending the balance-sim
   * retune", and that retune never happened.  What the placeholders bought
   * over ten character levels (3 -> 13, one skill trained, wood greatsword)
   * was +17.7% damage and +18.9% max HP — a 58 HP fodder went from six hits
   * to five.  That is not a power fantasy, it is rounding.
   *
   * Measured with tools/verify-prog3-retune.mjs, which imports the SHIPPED
   * spawn/damage formulas rather than restating them (balance-sim's rule):
   *
   *            damage      fodder    brute     max HP
   *   char 3   10.2->11.5   6->6      7->7     106->118
   *   char 6   10.7->16.0   6->4      7->5     112->136
   *   char 13  12.0->26.5   5->3      6->3     126->178
   *   char 20  13.2->37.0   5->2      6->2     140->220
   *
   * 3 -> 13 is now +130% damage and +51% HP.  Staff keeps its ~20% premium
   * for carrying the widest damage variance (0.5–1.5 vs melee's 0.75–1.25).
   *
   * THE COUPLING THAT MAKES THIS SAFE: XP_PER_DMG dropped to 0.4 in the
   * same commit.  Kill XP is invariant to your damage per hit (killing a
   * monster with H hp always pays H × XP_PER_DMG), so the pacing dial is
   * XP_PER_DMG and the quest table, not this constant — but ship one
   * without the other and the owner's second complaint ("the pace is also
   * too quick") gets worse instead of better.  Both moved; the quest table
   * went to 0.7× alongside (server/src/data.js QUEST_REWARDS, mirrored).
   * Measured pacing: the mayor's visit-buildings quest now lands a player
   * at character level 6 (was 8, and 11 for anyone who fought on the way),
   * against the owner's stated target of 5-6.
   *
   * ANTICHEAT LOCKSTEP: _maxWeaponDmg reads this same constant, so the
   * ceiling tracks the roll by construction — but the CLIENT mirror
   * (src/data/prog3.js) must move in the same commit or every predicted
   * number drifts from the wire (the v2.3.1451 rule).
   */
  DMG_PER_LEVEL: { sword: 1.5, bow: 1.5, staff: 1.8 },
  HP_PER_LEVEL: 6,          // §5-B: 100 + level×6 + hp×8 (v2.3.1727: was 2)
  /* ═══ v2.3.1734: MANA COULD NOT PROGRESS, BY CONSTRUCTION ═══
   *
   * The special attack cost `floor(maxMana / 5)` (index.js _abilityCost,
   * client playerActions.js).  A cost that is a FRACTION OF MAX is the
   * same cost in every unit that matters, so the bar was EXACTLY five
   * casts at Magic 1 and EXACTLY five casts at Magic 100.  Worse, the
   * regen tick also pays a PERCENTAGE of maxMana (index.js
   * _tickPlayerRegen: maxMana × 0.018 per ~670 ms out of combat), so the
   * SUSTAINED rate was invariant too — a flat 7.4 s per cast at every
   * Magic level in the game.  Training Magic bought literally nothing.
   * That is owner complaint #4 ("spam swipe until your mana runs out,
   * then swipe again as soon as it slowly rises") with no way out.
   *
   * The fix is one flat number and a steeper pool.  Both dials are
   * needed: a flat cost against the old 1.2/level pool would have taken
   * a full Magic career (level 1 → 100) to buy four extra casts.
   *
   *   Magic lvl   maxMana   casts   sustained s/cast (OOC regen)
   *   1           102       4       9.1
   *   10          125       5       7.4
   *   30          175       7       5.3
   *   50          225       9       4.1
   *   100         350       14      2.7
   *
   * (was: 5 casts / 7.4 s per cast at EVERY row.)
   *
   * THE FLOOR IS A DELIBERATE, SMALL NERF: a brand-new character goes
   * from 5 casts to 4, and from 7.4 s to 9.1 s per sustained cast.  That
   * is the price of the resource meaning anything at all, and it is the
   * whole reason the base pool is worth investing past.  It is also why
   * the ELEMENT BURST below spends from the same pool — a level-6 player
   * now chooses between a special and a burst instead of holding one
   * button.
   *
   * THE COUPLING THAT MAKES THIS COHERENT: since v2.3.1710 a special
   * trains the WEAPON that fired it, not Magic — so a pure melee player
   * does not level Magic by using specials, and their mana genuinely
   * stays at the 4-cast floor until they train Magic on its own.  That
   * is the owner's stated design, verbatim: "I want magic to keep its
   * cross weapon purpose but also have specials belong to their weapon.
   * Within the magic stat allocation is the only way to grow your mana
   * that's required for special attacks."  Magic's cross-weapon job IS
   * the mana pool; this is the commit where that job starts paying.
   *
   * MIRROR: src/data/prog3.js carries all four constants and the client
   * predicts its cost/charge-pie from them — move them together or the
   * HUD promises casts the worker refuses (mirror-audit pins it). */
  MANA_PER_MAGIC_LEVEL: 2.5, // §4 audit table: mana follows Magic (mind dies)
  SPECIAL_MANA_COST: 25,     // flat, was floor(maxMana/5)
  /* ═══ v2.3.1734: ELEMENT BURST (COMBAT-OVERHAUL-PLAN PR 6) ═══
   * Short-range elemental nova off your weapon's own element.  Gated on
   * the weapon carrying element1, which makes it Enchant-gated by
   * construction (only enchanted weapons have one).
   * Server validates the gates — element, mana, cooldown — from ITS copy
   * of the weapon; the client's button is a display gate.
   * v2.3.2662: the character-level gate (BURST_MIN_CHAR_LEVEL: 6, the
   * milestone ladder's rung 6) is gone with the ladder -- the owner never
   * made it.  Burst is open from level 1. */
  BURST_MANA_COST: 25,
  BURST_CD_MS: 3000,
  BURST_RADIUS: 70,
  BURST_DMG_MULT: 1.5,
  /* ═══ v2.3.2680: the RELATIVE half of a point (see the BODY/ATK header) ═══
     EDGE_FADE: the share of a point's count lost per level a monster stands
     above you — 100 % at or below your level, 0 at +5 (the owner's first
     ask: "benefit nearly gone after 5 combat levels").
     FLOOR: Dodge and Defense together never let less than 10 % of a BASE
     hit through (owner, 2026-09-22: "Yes do combined floor", then "only
     applies to base damage and not elemental damage").  Each stat still
     heads for its own 90 % — "ridiculous at ONE thing" — the floor only
     stops the two multiplying into immunity.  _applyDamage owns it. */
  EDGE_FADE: 0.20,
  FLOOR: 0.10,
};

/* ═══ v2.3.2680: THE CURVE AND THE EDGE — one definition each ═══
   Pure and exported so the class methods below, elemental.js (which is not
   a GameRoom method) and tools/relative-points-sim.mjs all state the
   arithmetic ONCE; the client mirror (src/data/prog3.js) carries the same
   two functions and mirror-audit pins the constants they read. */
export function prog3Curve(q, k) {
  return q > 0 ? q / (q + k) : 0;
}
/* 1 at or below your level (and whenever no monster is in hand — the
   readouts, the anticheat ceilings), −EDGE_FADE per level above, 0 at +5. */
export function prog3Edge(yourLevel, monsterLevel) {
  const m = Number(monsterLevel);
  if (monsterLevel == null || !Number.isFinite(m)) return 1;
  const gap = Math.max(0, m - Math.max(1, Number(yourLevel) || 1));
  return Math.max(0, 1 - gap * PROG3.EDGE_FADE);
}
/* The level the edge measures a stat against (relative-points.md §2): a lane
   stat's OWN trained skill, a shared stat's HIGHEST trained skill.  Never the
   character level — that is a sum, and two cheap off-lane skills would lift
   it 170x more cheaply than training the lane you fight with. */
export function prog3Yardstick(ps, cat) {
  const sk = ps && ps.prog3 && ps.prog3.sk;
  if (!sk) return 1;
  const lvl = (c) => Math.max(1, Math.min(PROG3.LEVEL_CAP, (sk[c] && sk[c].level) || 1));
  if (cat) return lvl(cat);
  return Math.max(...PROG3.SKILLS.map(lvl));
}
/* A curve stat's value for one hit, 0..1 (multiply by the row's `max`).
   `cat` names the lane for an ATK stat and is ignored for a BODY one;
   `monsterLevel` is the opponent's level, or null for "at or below". */
export function prog3StatValue(ps, stat, cat, monsterLevel) {
  const sd = prog3StatDef(stat);
  if (!sd || !(sd.def.k > 0)) return 0;
  const p3 = ps && ps.prog3;
  const holder = !p3 ? null
    : sd.scope === 'atk' ? (p3.atk && p3.atk[(cat === 'bow' || cat === 'staff') ? cat : 'sword'])
    : p3.alloc;
  const v = holder && holder[stat];
  const pts = (typeof v === 'number') ? Math.max(0, Math.min(sd.def.cap, v)) : 0;
  if (pts <= 0) return 0;
  const edge = sd.def.rel
    ? prog3Edge(prog3Yardstick(ps, sd.scope === 'atk' ? ((cat === 'bow' || cat === 'staff') ? cat : 'sword') : null), monsterLevel)
    : 1;
  return prog3Curve(pts * edge, sd.def.k);
}

/* v2.3.2662: the milestone ladder (staminaMilestoneMult, MILESTONES) that
   used to be imported here is gone -- see the tombstone in abilities.js. */
import { blocksAt, blockSize } from './abilities.js';

/* XP to go from trained level L to L+1.  The legacy weaponXpRequired
 * curve (280 × 1.16^L, gameSystems.js) reused verbatim (§3-A), shifted
 * one because prog3 skills are 1-based where the legacy track was
 * 0-based: cost(1→2) here == cost(0→1) there, so XP carried by the
 * respec lands on exactly the level it had earned. */
export function prog3XpRequired(level) {
  return Math.ceil(280 * Math.pow(1.16, Math.max(0, (level || 1) - 1)));
}

/* v2.3.1668: the global BODY allocation.  v2.3.2199: + elem.
   v2.3.2512: elem LEAVES for ATK (per weapon); eres + mana arrive. */
export function prog3FreshAlloc() {
  return { def: 0, hp: 0, dodge: 0, stam: 0, eres: 0, mana: 0, move: 0 }; // v2.3.2592: + move
}
/* v2.3.1668: the per-combat-type OFFENSE allocation, one block per skill.
 * Object.create(null) is not needed here — the keys are OUR constants, not
 * client-supplied — but the shape must always carry all three so every
 * read site can index it without a presence check. */
export function prog3FreshAtk() {
  const out = {};
  /* v2.3.2199: + dmg; v2.3.2512: + elem; v2.3.2592: crit/critDmg fold into
     luck, + range, + special.  Built off PROG3.ATK so a stat added to the
     table cannot be missing from the fresh shape. */
  for (const cat of PROG3.SKILLS) {
    const lane = {};
    for (const k of Object.keys(PROG3.ATK)) lane[k] = 0;
    out[cat] = lane;
  }
  return out;
}
/* Which table owns a stat name.  Returns null for anything unknown, which
 * is what the allocation endpoint's whitelist leans on. */
export function prog3StatDef(stat) {
  if (Object.prototype.hasOwnProperty.call(PROG3.BODY, stat)) return { def: PROG3.BODY[stat], scope: 'body' };
  if (Object.prototype.hasOwnProperty.call(PROG3.ATK, stat)) return { def: PROG3.ATK[stat], scope: 'atk' };
  return null;
}

/* The respec (§8-B, approved): recompute from carried XP.  New trained
 * level = legacy level + 1 (identical curve, 0→1 base shift), leftover
 * xp carried; pool = Σ legacy weapon levels + legacy defense level
 * (every trained level = 1 point, retroactively true; defense-skill
 * carry per §3's bonus-points pick).  Pure and blob-shaped: shared by
 * migration v10 (stored blobs) AND the join boundary heal (first
 * connects / fail-open blobs), the v4/v9 pattern.  Tolerates any
 * partial shape; null/undefined src yields the fresh-character object
 * (levels 1, pool 0). */
export function prog3FromLegacy(src) {
  const clampLvl = (v) => Math.max(0, Math.min(100, Math.floor(Number(v) || 0)));
  const sk = {};
  const poolBy = { sword: 0, bow: 0, staff: 0 };
  let pool = 0;
  let shared = 0; /* v2.3.2592 */
  for (const cat of PROG3.SKILLS) {
    const old = (src && src.weaponSkills && typeof src.weaponSkills === 'object')
      ? src.weaponSkills[cat] : null;
    const oldLevel = clampLvl(old && old.level);
    const level = Math.min(PROG3.LEVEL_CAP, oldLevel + 1);
    const xp = Math.max(0, Math.min(1e8, Number(old && old.xp) || 0));
    sk[cat] = { level, xp: level >= PROG3.LEVEL_CAP ? 0 : xp };
    /* v2.3.2199: mint at the CURRENT rate and stamp the earning lane, so a
       join-boundary heal (which lands with _v already at the constant and
       therefore never sees migration v14) pays the new rate by
       construction — miss this and a fail-open blob healed at join is
       stranded at 1/level forever with no migration left to fix it. */
    pool += oldLevel * PROG3.POINTS_PER_LEVEL;
    poolBy[cat] = oldLevel * PROG3.POINTS_PER_LEVEL;
    /* v2.3.2592: and the shared pool alongside, at the current rate, stamped
       (spl) for the same join-boundary reason as ppl above. */
    shared += oldLevel * PROG3.SHARED_POINTS_PER_LEVEL;
  }
  /* The defense-skill carry stays a one-time UNCHANNELLED bonus (§3's
     bonus-points pick, spendable anywhere) — it is not per-level minting
     and does not triple. */
  pool += clampLvl(src && src.defenseSkill && src.defenseSkill.level);
  /* v2.3.1733: `ms` = the milestone high-water.  v2.3.2662: the ladder is
     gone and nothing pays against this any more; it is still stamped 0 so a
     worker ROLLED BACK past v2.3.2662 finds the shape it expects. */
  return { sk, alloc: prog3FreshAlloc(), atk: prog3FreshAtk(), pool, poolBy, ms: 0, ppl: PROG3.POINTS_PER_LEVEL,
    shared, spl: PROG3.SHARED_POINTS_PER_LEVEL /* v2.3.2592 */ };
}

/* ═══ v2.3.2199: THE RETRO GRANT (migration v14) ═══
 * Back-pays existing characters the difference between the old 1/level
 * mint and POINTS_PER_LEVEL, so a veteran holds exactly what a fresh
 * character reaching the same levels would: earned level-ups per skill
 * ≡ level − 1 (levels are 1-based; the v10 respec's `pool += oldLevel`
 * with `level = oldLevel + 1` is the same convention).  Stamped into
 * poolBy per the earning skill — pool and Σ poolBy grow by the same
 * amount, so the sanitizer's parts-≤-whole invariant is preserved.
 * Idempotent via the `ppl` rate stamp; pure and blob-shaped, shared by
 * migration v14 (stored blobs) AND the _sanitizeProg3 boundary heal
 * (fail-open blobs), the prog3SplitAtk pattern.  Max legitimate unspent
 * pool is now ~992 (3×297 + defense carry ≤100 + the old milestone point) —
 * still under the sanitizer's 999 clamp, barely; that clamp is load-
 * bearing headroom now, don't repurpose it. */
export function prog3GrantRetroPoints(p3) {
  if (!p3 || typeof p3 !== 'object' || !p3.sk || typeof p3.sk !== 'object') return false;
  if (Number(p3.ppl) >= PROG3.POINTS_PER_LEVEL) return false;
  if (!p3.poolBy || typeof p3.poolBy !== 'object') p3.poolBy = { sword: 0, bow: 0, staff: 0 };
  for (const cat of PROG3.SKILLS) {
    const lvl = Math.max(1, Math.min(PROG3.LEVEL_CAP, Math.floor(Number(p3.sk[cat] && p3.sk[cat].level) || 1)));
    const grant = (PROG3.POINTS_PER_LEVEL - 1) * (lvl - 1);
    p3.pool = Math.min(999, Math.max(0, Math.floor(Number(p3.pool) || 0)) + grant);
    p3.poolBy[cat] = Math.min(999, Math.max(0, Math.floor(Number(p3.poolBy[cat]) || 0)) + grant);
  }
  p3.ppl = PROG3.POINTS_PER_LEVEL;
  return true;
}

/* v2.3.1668: fold a v10-shaped prog3 (one global alloc holding all seven
 * stats) into the BODY/ATK split.  The three offense stats are REFUNDED to
 * the pool rather than copied into each type: copying would multiply a
 * player's investment by three for free, and picking one type to receive
 * them would be guessing.  Refunding hands the choice back — which is the
 * whole point of the change.  Idempotent: a blob already carrying `atk` is
 * returned untouched. */
export function prog3SplitAtk(p3) {
  if (!p3 || typeof p3 !== 'object') return p3;
  if (p3.atk && typeof p3.atk === 'object') return p3;
  const a = (p3.alloc && typeof p3.alloc === 'object') ? p3.alloc : {};
  let refund = 0;
  /* v2.3.2592: the two RETIRED offense keys are walked too — a v10-shaped
     blob healed here after the luck fold shipped would otherwise carry
     crit/critDmg into the alloc rebuild below, which drops what it does not
     know, with no refund. */
  for (const k of [...Object.keys(PROG3.ATK), 'crit', 'critDmg']) {
    const n = Number(a[k]);
    if (Number.isFinite(n) && n > 0) refund += Math.floor(n);
    delete a[k];
  }
  p3.atk = prog3FreshAtk();
  /* v2.3.2512: rebuilt off prog3FreshAlloc so a BODY stat added later is
     carried rather than silently dropped by a hardcoded list — `elem` is the
     stat that made that concrete: it was a BODY key between v2.3.2199 and
     v2.3.2512 and this literal never mentioned it, so a v10-shaped blob
     healed here lost it with no refund.  The ATK loop above already took it
     (it walks PROG3.ATK, which now owns `elem`), so it is refunded, not
     lost. */
  const _fresh = prog3FreshAlloc();
  for (const k of Object.keys(_fresh)) _fresh[k] = Math.max(0, Math.floor(Number(a[k]) || 0));
  p3.alloc = _fresh;
  p3.pool = Math.max(0, Math.floor(Number(p3.pool) || 0)) + refund;
  return p3;
}

/* ═══ v2.3.2512: fold an elem-as-BODY blob into elem-as-ATK ═══
 * Elemental power was a single GLOBAL channel from v2.3.2199 to v2.3.2512.
 * Now it is per combat type, so a stored `alloc.elem` has nowhere to land.
 *
 * REFUNDED to the pool, exactly as v2.3.1668 refunded the three offense
 * stats when they went per-type, and for exactly the same two reasons:
 * copying the points into all three types would triple the investment for
 * free, and picking one type to receive them would be guessing on the
 * player's behalf.  Refunding hands the choice back, which IS the change.
 *
 * Idempotent: it returns false the moment `alloc.elem` is absent, so a
 * re-run — or the join-boundary heal landing after the migration already
 * ran — cannot double-refund.  Shared by migration v15 and _sanitizeProg3
 * (the v11 pattern: migrations FAIL OPEN, so the boundary needs the same
 * fold or a fail-open blob loses the points with no refund).
 * Returns true when it changed something. */
export function prog3MoveElemToAtk(p3) {
  if (!p3 || typeof p3 !== 'object') return false;
  const a = p3.alloc;
  if (!a || typeof a !== 'object') return false;
  if (!Object.prototype.hasOwnProperty.call(a, 'elem')) return false;
  const n = Number(a.elem);
  delete a.elem;
  const refund = (Number.isFinite(n) && n > 0) ? Math.floor(n) : 0;
  p3.pool = Math.min(9999, Math.max(0, Math.floor(Number(p3.pool) || 0)) + refund);
  return true;
}

/* ═══ v2.3.2592: fold crit + critDmg into LUCK — the refund ═══
 * The two old offense stats have nowhere to land now that one stat buys
 * both halves of a crit.  Every placed point is REFUNDED into the lane that
 * holds it: `pool` and `poolBy[cat]` grow by the same amount, so the
 * parts-≤-whole invariant the sanitizer enforces is preserved by
 * construction, and the player re-chooses — Luck, or Range, or Special —
 * with the same lane budget they earned.  Better than the v11/v15 refunds
 * in one way: those points had no lane on record and fell into the
 * unchannelled remainder; these were per-lane already, so no guess is made.
 * Idempotent (returns false once no lane carries either key) and shared by
 * migration v17 and _sanitizeProg3, because migrations FAIL OPEN and a
 * fail-open blob healed at join would otherwise have both keys dropped by
 * the sanitizer's own-key loop with no refund.  Returns true when it
 * changed something. */
export function prog3FoldLuck(p3) {
  if (!p3 || typeof p3 !== 'object') return false;
  const atk = p3.atk;
  if (!atk || typeof atk !== 'object') return false;
  let changed = false;
  for (const cat of PROG3.SKILLS) {
    const lane = atk[cat];
    if (!lane || typeof lane !== 'object') continue;
    let refund = 0;
    /* Bounded by the caps the retired stats HAD (75 / 100): storage is
       server-written and a legitimately placed count can never exceed them,
       so a larger number is a corrupt or hand-edited blob and must not mint
       points on its way out.  The sanitizer's pool clamp bounds the total
       regardless; this bounds each part. */
    const RETIRED_CAP = { crit: 75, critDmg: 100 };
    for (const k of ['crit', 'critDmg']) {
      if (!Object.prototype.hasOwnProperty.call(lane, k)) continue;
      const n = Number(lane[k]);
      if (Number.isFinite(n) && n > 0) refund += Math.min(RETIRED_CAP[k], Math.floor(n));
      delete lane[k];
      changed = true;
    }
    if (refund > 0) {
      if (!p3.poolBy || typeof p3.poolBy !== 'object') p3.poolBy = { sword: 0, bow: 0, staff: 0 };
      p3.pool = Math.min(9999, Math.max(0, Math.floor(Number(p3.pool) || 0)) + refund);
      p3.poolBy[cat] = Math.min(9999, Math.max(0, Math.floor(Number(p3.poolBy[cat]) || 0)) + refund);
    }
  }
  return changed;
}

/* ═══ v2.3.2592: THE SHARED-POINT RETRO GRANT (migration v17) ═══
 * Every stored character receives SHARED_POINTS_PER_LEVEL × (level − 1) per
 * skill — earned level-ups ≡ level − 1, the v10/v14 convention — so a
 * veteran holds exactly the shared points a fresh character reaching the
 * same levels would mint.  Idempotent via the `spl` rate stamp (the `ppl`
 * pattern: the grant is the DIFFERENCE between the stamped rate and the
 * current one, so a future rate change is one constant, not archaeology);
 * pure and blob-shaped, shared by migration v17 and the _sanitizeProg3
 * boundary heal.  Max legitimate shared pool is 3 × 297 = 891 — under the
 * 999 clamp with the same headroom `pool` has. */
export function prog3GrantSharedPoints(p3) {
  if (!p3 || typeof p3 !== 'object' || !p3.sk || typeof p3.sk !== 'object') return false;
  const paid = Math.max(0, Math.min(PROG3.SHARED_POINTS_PER_LEVEL, Math.floor(Number(p3.spl) || 0)));
  if (paid >= PROG3.SHARED_POINTS_PER_LEVEL) return false;
  let shared = Math.max(0, Math.floor(Number(p3.shared) || 0));
  for (const cat of PROG3.SKILLS) {
    const lvl = Math.max(1, Math.min(PROG3.LEVEL_CAP, Math.floor(Number(p3.sk[cat] && p3.sk[cat].level) || 1)));
    shared += (PROG3.SHARED_POINTS_PER_LEVEL - paid) * (lvl - 1);
  }
  p3.shared = Math.min(999, shared);
  p3.spl = PROG3.SHARED_POINTS_PER_LEVEL;
  return true;
}

export const prog3Methods = {
  // Shape-normalize a SERVER-stored prog3 (join adoption, admin
  // restores).  Never fed client input — the join payload is not a
  // source by construction (see header).  Merges onto the fresh shape
  // so every key exists and is bounded.
  _sanitizeProg3(src) {
    const out = prog3FromLegacy(null);
    if (!src || typeof src !== 'object') return out;
    /* v2.3.1668 BOUNDARY HEAL (the v2.3.1152 pattern).  Migration v11 folds
       v10-shaped blobs into the BODY/ATK split, but migrations FAIL OPEN —
       and if v11 didn't run, the loops below would read a missing `atk`,
       write zeros, and the player's offense points would vanish with no
       refund.  Splitting here too makes that unreachable.  Idempotent:
       prog3SplitAtk returns immediately when `atk` already exists.
       Mutates a shallow copy so a caller's stored object is never edited
       as a side effect of sanitizing it. */
    if (!src.atk) src = prog3SplitAtk({ ...src, alloc: { ...(src.alloc || {}) } });
    /* v2.3.2512 BOUNDARY HEAL, same reasoning one layer down: migration v15
       moves elemental power out of the global alloc and refunds it, but
       migrations fail open — without this, a blob that missed v15 would have
       its `alloc.elem` dropped by the loop below (it walks OUR key list) and
       the points would vanish with no refund.  Mutates a shallow copy, never
       the caller's stored object. */
    src = { ...src, alloc: { ...(src.alloc || {}) } };
    prog3MoveElemToAtk(src);
    /* v2.3.2592 BOUNDARY HEAL, same reasoning again: migration v17 folds
       crit/critDmg into luck and refunds them per lane, but a blob that
       missed v17 would have both keys dropped by the loop below (it walks
       PROG3.ATK) with no refund.  Copies each lane before folding so the
       caller's stored object is never edited as a side effect. */
    if (src.atk && typeof src.atk === 'object') {
      const atkCopy = {};
      for (const cat of Object.keys(src.atk)) {
        atkCopy[cat] = (src.atk[cat] && typeof src.atk[cat] === 'object') ? { ...src.atk[cat] } : src.atk[cat];
      }
      src = { ...src, atk: atkCopy, poolBy: { ...(src.poolBy || {}) } };
      prog3FoldLuck(src);
    }
    for (const cat of PROG3.SKILLS) {
      const s = src.sk && src.sk[cat];
      if (s && typeof s === 'object') {
        out.sk[cat].level = Math.max(1, Math.min(PROG3.LEVEL_CAP, Math.floor(Number(s.level) || 1)));
        out.sk[cat].xp = Math.max(0, Math.min(1e8, Number(s.xp) || 0));
      }
    }
    for (const k of Object.keys(out.alloc)) {
      const n = src.alloc && Number(src.alloc[k]);
      if (Number.isFinite(n) && n > 0) out.alloc[k] = Math.min(PROG3.BODY[k].cap, Math.floor(n));
    }
    /* v2.3.1668: per-type offense.  Unknown categories and unknown stat
       keys are dropped by construction — the loops walk OUR constants. */
    for (const cat of PROG3.SKILLS) {
      const s = src.atk && src.atk[cat];
      if (!s || typeof s !== 'object') continue;
      for (const k of Object.keys(PROG3.ATK)) {
        const n = Number(s[k]);
        if (Number.isFinite(n) && n > 0) out.atk[cat][k] = Math.min(PROG3.ATK[k].cap, Math.floor(n));
      }
    }
    const p = Number(src.pool);
    if (Number.isFinite(p) && p > 0) out.pool = Math.min(999, Math.floor(p));
    /* v2.3.2176: the per-channel breakdown.  Absent on every blob written
       before this change, which is exactly what makes those points "any" --
       see the header.  Clamped to `pool` as a whole so a forged blob cannot
       mint offense points by claiming a channel holds more than exists. */
    out.poolBy = { sword: 0, bow: 0, staff: 0 };
    if (src.poolBy && typeof src.poolBy === 'object') {
      let sum = 0;
      for (const cat of PROG3.SKILLS) {
        const n = Number(src.poolBy[cat]);
        if (!Number.isFinite(n) || n <= 0) continue;
        const v = Math.min(999, Math.floor(n));
        out.poolBy[cat] = v; sum += v;
      }
      /* Never let the parts exceed the whole. */
      if (sum > out.pool) {
        let over = sum - out.pool;
        for (const cat of PROG3.SKILLS) {
          if (over <= 0) break;
          const take = Math.min(over, out.poolBy[cat]);
          out.poolBy[cat] -= take; over -= take;
        }
      }
    }
    /* v2.3.1733: `ms` = the highest character level whose MILESTONE rewards
       have already been paid.  It has to survive this sanitizer or every join
       would re-pay the bonus point — a sanitizer that drops a field is how a
       one-off grant becomes an infinite one.  Bounded by the char-level cap.
       v2.3.2662: the ladder is gone and THIS worker never pays against `ms`,
       but it is kept for ROLLBACK: a worker rolled back to v2.3.2661 reads it,
       and without it would re-pay every player the level-5 point. */
    const ms = Number(src.ms);
    if (Number.isFinite(ms) && ms > 0) out.ms = Math.min(PROG3.CHAR_LEVEL_CAP, Math.floor(ms));
    /* v2.3.2199 BOUNDARY HEAL (the prog3SplitAtk pattern above).  `ppl` is
       the points-per-level rate this blob was granted at; the fresh shape
       from prog3FromLegacy(null) carries the CURRENT constant, so it must
       be overwritten from the source FIRST — a pre-v14 blob has no `ppl`
       (rate 1) and keeping the fresh shape's stamp would mark it paid
       without paying it.  Then the retro grant runs here too, because
       migrations FAIL OPEN: a blob that skipped v14 gets its back-pay on
       the next sanitize instead of never.  Idempotent via the stamp, and
       like `ms` above the stamp MUST survive sanitizing or every join
       would re-pay the grant — a dropped field is how a one-time grant
       becomes an infinite one. */
    const ppl = Number(src.ppl);
    out.ppl = (Number.isFinite(ppl) && ppl >= 1) ? Math.min(PROG3.POINTS_PER_LEVEL, Math.floor(ppl)) : 1;
    prog3GrantRetroPoints(out);
    /* v2.3.2592: the SHARED pool and its rate stamp, same discipline as
       pool/ppl above — bounded, source-first (the fresh shape carries the
       current rate, and adopting it before reading the source would mark a
       pre-v17 blob paid without paying it), then the grant as a boundary
       heal for fail-open blobs.  A dropped stamp is how a one-time grant
       becomes one per join, so `spl` must survive this sanitizer. */
    const sh = Number(src.shared);
    out.shared = (Number.isFinite(sh) && sh > 0) ? Math.min(999, Math.floor(sh)) : 0;
    const spl = Number(src.spl);
    out.spl = (Number.isFinite(spl) && spl >= 1) ? Math.min(PROG3.SHARED_POINTS_PER_LEVEL, Math.floor(spl)) : 0;
    prog3GrantSharedPoints(out);
    /* Re-run the parts-≤-whole clamp: the grant grows pool and poolBy by
       the same amounts, but its 999 pool ceiling can bind on a forged
       near-999 blob while the per-lane adds don't, and then the block
       above has already run.  Never let the parts exceed the whole. */
    {
      let sum = PROG3.SKILLS.reduce((n, c) => n + out.poolBy[c], 0);
      for (const cat of PROG3.SKILLS) {
        if (sum <= out.pool) break;
        const take = Math.min(sum - out.pool, out.poolBy[cat]);
        out.poolBy[cat] -= take; sum -= take;
      }
    }
    return out;
  },

  /* Allocated points in a PER-TYPE offense stat, bounded read. */
  _prog3AtkPts(ps, cat, stat) {
    const a = ps && ps.prog3 && ps.prog3.atk && ps.prog3.atk[cat];
    const v = a && a[stat];
    const def = PROG3.ATK[stat];
    return (typeof v === 'number' && def) ? Math.max(0, Math.min(def.cap, v)) : 0;
  },

  /* The offense stats for the weapon TYPE being swung.  greatsword shares
     the sword/melee category, matching _wpnCat. */
  _prog3CatFor(type) {
    return type === 'bow' ? 'bow' : type === 'staff' ? 'staff' : 'sword';
  },

  // Allocated points in a stat, bounded read (the caps are enforced at
  // spend time; this re-clamps so a corrupt snapshot stays bounded at
  // every consumption site).
  /* Allocated points in a GLOBAL body stat (def/hp/dodge/stam). */
  _prog3Pts(ps, stat) {
    const p3 = ps && ps.prog3;
    const v = p3 && p3.alloc && p3.alloc[stat];
    const def = PROG3.BODY[stat];
    return (typeof v === 'number' && def) ? Math.max(0, Math.min(def.cap, v)) : 0;
  },

  /* ═══ v2.3.2592: the LUCK, SPECIAL and MOVE terms, each read in ONE place ═══
     combat.js (the roll and the anticheat ceiling), movement.js (the move
     bound) and the client mirror (src/data/prog3.js) all state the same
     arithmetic; keeping the server's copy behind four names is what lets a
     retune of one constant land everywhere it must (the v2.3.1451 rule). */
  /* v2.3.2680: every one of these reads the CURVE (prog3StatValue) instead
     of `pts × per`, and the ones that change a hit take the monster's level
     (`mlvl`) for the edge.  Omit it — the readouts, and the anticheat
     ceilings on purpose — and the edge is 1: the largest value any monster
     can grant, so a ceiling built from these can never sit under a roll. */
  _prog3CritChance(ps, cat, mlvl) {
    return PROG3.ATK.luck.base + PROG3.ATK.luck.max * prog3StatValue(ps, 'luck', cat, mlvl);
  },
  _prog3CritMult(ps, cat, mlvl) {
    return 1.5 + PROG3.ATK.luck.dmgMax * prog3StatValue(ps, 'luck', cat, mlvl);
  },
  _prog3SpecialMult(ps, cat, mlvl) {
    return 1 + PROG3.ATK.special.max * prog3StatValue(ps, 'special', cat, mlvl);
  },
  /* v2.3.2680: Power is a multiplier on (weapon base + skill term), applied
     pre-tierMult by _computeAttackDamage and, at edge 1, by _maxWeaponDmg. */
  _prog3PowerMult(ps, cat, mlvl) {
    return 1 + PROG3.ATK.dmg.max * prog3StatValue(ps, 'dmg', cat, mlvl);
  },
  _prog3MoveMult(ps) {
    return 1 + PROG3.BODY.move.max * prog3StatValue(ps, 'move', null, null);
  },

  /* v2.3.2302: N blocks of one pool -- the ONLY cost primitive on the server.
     _abilityCost, _burstCost and _handleAbility all price through this, so
     "one block" cannot come to mean three different numbers in three files the
     way the hardcoded fifth did. */
  _blockCost(ps, pool, blocks) {
    const n = (blocks == null) ? 1 : blocks;
    return n <= 0 ? 0 : n * blockSize(ps, pool);
  },

  _prog3CharLevel(ps) {
    const p3 = ps && ps.prog3;
    if (!p3 || !p3.sk) return 3;
    let sum = 0;
    for (const cat of PROG3.SKILLS) {
      sum += Math.max(1, Math.min(PROG3.LEVEL_CAP, (p3.sk[cat] && p3.sk[cat].level) || 1));
    }
    return Math.min(PROG3.CHAR_LEVEL_CAP, sum);
  },

  // The prog3 twin of _recomputeMaxes (grids.js delegates here when
  // ps.prog3 exists).  §5-B pools: level term shrinks to 2 HP/level
  // and the hp stat carries the rest; stamina/mana lose their T1 stat
  // terms (endurance→stam points, mind→Magic level).
  //
  // v2.3.1697: the armor flat-HP term is GONE from this line too (owner:
  // armor "shouldn't add max hp contribution anymore, just surface real
  // damage mitigation").  It was easy to miss that there are TWO maxHp
  // formulas — this one serves every respecced player, so dropping the
  // fold only in grids.js would have left the live path still paying
  // armor twice (HP here, mitigation in _armorDrMult since v2.3.1679).
  // Mirrored by the prog3 branch of recalcDerived (client) in the same
  // version.  Armor's ONLY combat effect is now the damage reduction.
  _prog3Recompute(ps) {
    if (!ps || !ps.prog3) return;
    ps.level = this._prog3CharLevel(ps);
    ps.maxHp = Math.floor(100 + ps.level * PROG3.HP_PER_LEVEL
      + this._prog3Pts(ps, 'hp') * PROG3.BODY.hp.per);
    /* v2.3.2662: no level multiplier.  v2.3.1733's char-10 "Second Wind"
       milestone (x1.25 on the whole pool) went with the ladder -- the owner
       never made it.  Mirrored by recalcDerived's prog3 branch
       (src/data/gameSystems.js), which keeps the x1.25 only against an older
       worker that does not advertise caps.milestonesRetired (rule 19). */
    const stamPts = this._prog3Pts(ps, 'stam');
    ps.maxStamina = Math.floor(100 + stamPts * PROG3.BODY.stam.per);
    /* v2.3.2302: clamped, which it was NOT before -- the client mirror has
       always clamped, and the block ladder turns that latent asymmetry into a
       visible one (an out-of-range level would buy a block the client never
       draws). */
    const magicLvl = Math.max(1, Math.min(PROG3.LEVEL_CAP,
      (ps.prog3.sk && ps.prog3.sk.staff && ps.prog3.sk.staff.level) || 1));
    /* v2.3.2512: MAX MANA is a stat now, ADDED to the Magic-level derivation
       rather than replacing it — at zero points every existing player's pool
       is byte-identical to what it was, which is the whole reason for adding
       rather than replacing. */
    const manaPts = this._prog3Pts(ps, 'mana');
    ps.maxMana = Math.floor(100 + magicLvl * PROG3.MANA_PER_MAGIC_LEVEL
      + manaPts * PROG3.BODY.mana.per);
    /* v2.3.2302: the block counts, computed in the SAME place and from the
       SAME inputs as the pools they divide -- that adjacency is the whole
       defence against the two drifting apart.  Derived, never stored: no new
       storage key, and join recomputes before the first cost is ever priced. */
    /* v2.3.2512: the ladder counts the PROGRESSION INPUT, and allocated mana
       points are now part of that input — exactly as stamina's rung already
       counts its allocated points.  Without this, buying max mana would make
       every special MORE expensive (cost = maxMana / blocks) and buy zero
       extra casts: the v2.3.1734 "mana could not progress, by construction"
       trap, re-entered through a different door.  At zero points this is
       blocksAt(magicLvl), i.e. unchanged. */
    ps.manaBlocks = blocksAt(magicLvl + manaPts);
    ps.stamBlocks = blocksAt(stamPts);
    if (typeof ps.hp !== 'number') ps.hp = ps.maxHp;
    ps.hp = Math.min(ps.hp, ps.maxHp);
    if (typeof ps.stamina !== 'number') ps.stamina = ps.maxStamina;
    ps.stamina = Math.min(ps.stamina, ps.maxStamina);
    if (typeof ps.mana !== 'number') ps.mana = ps.maxMana;
    ps.mana = Math.min(ps.mana, ps.maxMana);
  },

  // ═══ v2.3.1661: tier-gate primitive (PROGRESSION-REDESIGN §6) ═══
  //
  // kind 'sword'|'bow'|'staff' → the trained skill's level;
  // 'defense' → allocated defense POINTS; 'magic' → the staff skill
  // (amulets).  reqValue = tierIndex × 5 (20 tiers → 0..95 against
  // the level-100 cap).  Gates apply AT EQUIP/FORGE TIME only —
  // already-equipped gear is grandfathered (the respec zeroed
  // everyone's defense points; stripping worn armor for it would
  // read as theft).  Non-prog3 players pass (legacy gates apply).
  _prog3GearOk(ps, kind, reqValue) {
    if (!(reqValue > 0)) return true;
    const p3 = ps && ps.prog3;
    if (!p3) return true;
    if (kind === 'defense') return this._prog3Pts(ps, 'def') >= reqValue;
    const cat = kind === 'magic' ? 'staff' : kind;
    const lvl = (p3.sk && p3.sk[cat] && p3.sk[cat].level) || 1;
    return lvl >= reqValue;
  },

  // Per-hit dodge chance (§4: replaces agility×0.0008 + the evasion
  // accumulator; cap 30% at the 75-pt stat cap).
  _prog3DodgePct(ps, mlvl) {
    return PROG3.BODY.dodge.max * prog3StatValue(ps, 'dodge', null, mlvl);  /* v2.3.2680: the curve + edge */
  },

  /* v2.3.2512: the ELEMENTAL-damage multiplier — the defensive half of the
     elemental system (owner ask D12).  −0.4%/pt, −30% at the 75-pt cap,
     the same shape `dodge` uses.  Consumed in _applyDamage only when the
     caller declares the damage elemental (`opts.elemental`), which today
     means the fire trail and the slime burst; the closed list and the
     reasoning live on PROG3.BODY.eres. */
  _prog3ElemResistMult(ps, mlvl) {
    return 1 - PROG3.BODY.eres.max * prog3StatValue(ps, 'eres', null, mlvl);  /* v2.3.2680: the curve + edge */
  },

  // Incoming-damage multiplier (§4 decision 9-B: % reduction, the
  // game's first real mitigation stat; cap −40%).  Consumed in
  // _applyDamage AFTER the resist buff, floor 1 preserved there.
  _prog3DefMult(ps, mlvl) {
    return 1 - PROG3.BODY.def.max * prog3StatValue(ps, 'def', null, mlvl);  /* v2.3.2680: the curve + edge */
  },

  // ═══ Trained XP accrual (§9-A: server-authoritative) ═══
  //
  // Called from _handleMonsterDamage with the CREDITED damage
  // (actualDmg — clamped to the monster's remaining hp, so overkill
  // farming can't inflate the rate) after every landed hit.  cat is
  // resolved server-side from the effective slot (never the raw wire
  // string).  v2.3.1710: specials credit their OWN weapon too (owner
  // decision) — Magic's cross-weapon value is the mana pool every
  // special spends, not the special's skill credit.  See combat.js
  // _maxWeaponDmg for the full note.
  // XP mutations ride in memory between saves — persistence lands on
  // level-up here and on the kill-path _saveRpg like every other
  // combat mutation (the v2.3.1619b write-amplification lesson: no
  // per-hit storage puts).
  /* v2.3.1727: `amount` is DAMAGE by default and XP when opts.flat is set.
     The two were conflated from the start — quests.js hands this method a
     quest's xp reward and it was multiplied by XP_PER_DMG like everything
     else — and the bug was invisible for as long as XP_PER_DMG was exactly
     1.0.  Dropping the rate to 0.4 made it visible and load-bearing: a
     quest advertising 105 xp would quietly have paid 42.  A constant named
     "xp per point of damage" has no business scaling a quest reward, so
     the flat callers now say so and the table's numbers mean what they
     say — which is what makes the quest XP dial safe for the owner to
     tune later without reasoning about the damage rate. */
  _prog3AwardXp(playerId, ps, cat, amount, opts) {
    const p3 = ps && ps.prog3;
    if (!p3 || !p3.sk || !p3.sk[cat] || !(amount > 0)) return;
    const sk = p3.sk[cat];
    if (sk.level >= PROG3.LEVEL_CAP) return;
    sk.xp += (opts && opts.flat) ? amount : amount * PROG3.XP_PER_DMG;
    let gained = 0;
    while (sk.level < PROG3.LEVEL_CAP && sk.xp >= prog3XpRequired(sk.level)) {
      sk.xp -= prog3XpRequired(sk.level);
      sk.level++;
      /* v2.3.2199: 3 per level (POINTS_PER_LEVEL), was 1. */
      p3.pool += PROG3.POINTS_PER_LEVEL;
      /* v2.3.2176: and the points remember WHICH skill earned them. */
      if (!p3.poolBy || typeof p3.poolBy !== 'object') p3.poolBy = { sword: 0, bow: 0, staff: 0 };
      p3.poolBy[cat] = (Number(p3.poolBy[cat]) || 0) + PROG3.POINTS_PER_LEVEL;
      /* v2.3.2592: and the SHARED points beside them, one per lane point
         (owner: "you earn one 'shared' point too"). */
      p3.shared = Math.min(999, Math.max(0, Math.floor(Number(p3.shared) || 0)) + PROG3.SHARED_POINTS_PER_LEVEL);
      gained++;
    }
    if (sk.level >= PROG3.LEVEL_CAP) sk.xp = 0;
    if (gained > 0) {
      // A trained level-up IS the character level-up (level = Σ), so
      // the celebration moves server-side (§8): recompute + full
      // resource restore (the v2.3.1414 rule), persist, notify.
      this._prog3Recompute(ps);
      /* v2.3.2662: the milestone payout that ran here (v2.3.1733) is gone
         with the ladder -- see the tombstone in abilities.js. */
      if (typeof ps.maxHp === 'number') ps.hp = ps.maxHp;
      if (typeof ps.maxStamina === 'number') ps.stamina = ps.maxStamina;
      if (typeof ps.maxMana === 'number') ps.mana = ps.maxMana;
      this._saveRpg(playerId, ps);
      const ws = this._wsBySessionId(playerId);
      if (ws) {
        try {
          ws.send(JSON.stringify({
            type: 'prog3_level',
            payload: {
              skill: cat, level: sk.level, pool: p3.pool, charLevel: ps.level,
              /* v2.3.2592: the shared pool rides too, so the four column
                 headers move the moment the level lands.  Extra field on an
                 existing PRIVILEGED event — an old client ignores it. */
              shared: p3.shared,
              /* v2.3.2620: ...and the CHANNEL breakdown with it, for the same
                 reason and on the same terms (an extra field on a PRIVILEGED
                 event; an old client ignores it).  `pool` and `shared` were
                 already here while `poolBy` was not, which left the one readout
                 that is PER LANE — the dashboard's combat badge, and the four
                 tiles of the Points grid — waiting on the next player_state
                 flush to learn which skill the points landed in.  The level-up
                 celebration is exactly the moment a player goes looking for
                 them, so the event that fires the celebration carries them.
                 A copy, not the live object: prog3_allocated already sends
                 `{ ...p3.poolBy }` for the same reason. */
              poolBy: { ...(p3.poolBy || {}) },
              /* v2.3.1733: the ability list rides the level-up.
                 v2.3.2662: `milestone` and `bonusPoints` no longer do -- the
                 ladder that filled them is gone.  An older client reading a
                 missing field sees `undefined`, which it already handled as
                 "this level crossed no rung". */
              abilities: this._abilityUnlockList(ps),
            },
          }));
        } catch (e) {}
      }
      this._queuePlayerStateFlush(playerId);
      /* v2.3.1664: a level-up is the only moment a chain milestone can be
         crossed, so this is where the on-chain checkpoint is considered.
         FIRE-AND-FORGET BY CONTRACT — this is a combat path, and nothing in
         it may await the network.  A chain outage, an unfunded relayer or a
         missing secret all no-op silently and retry on the next level-up. */
      this._chainScoreOnLevelUp(playerId, ps);
    }
  },

  // ═══ Allocation endpoint (§9: server-validated spend) ═══
  //
  // Wire: prog3_allocate { stat, cat? }.  Gates: prog3 present, stat in
  // the BODY or ATK whitelist (own-property check — '__proto__' etc.
  // fail), pool ≥ 1, and the §6-C double cap: the stat's own hard cap AND
  // min(100, character level) — replaces _statCap for prog3 players.
  //
  // v2.3.1668: an ATK stat additionally requires `cat` (sword|bow|staff),
  // because offense is allocated PER COMBAT TYPE.  A missing or unknown
  // cat is a REJECT, not a default — silently spending a point into Melee
  // because the client forgot to say which weapon it meant is exactly the
  // kind of "helpful" fallback a player would experience as theft.
  //
  // Invalid spends are silently dropped (the stat_allocate posture);
  // success acks with prog3_allocated + a full player_state echo.
  _handleProg3Allocate(session, payload) {
    if (!session || !session.id) return;
    const ps = this.playerState[session.id];
    const p3 = ps && ps.prog3;
    if (!p3) return;
    const stat = payload && payload.stat;
    if (typeof stat !== 'string') return;
    const sd = prog3StatDef(stat);
    if (!sd) return;

    /* ═══ v2.3.2176 / v2.3.2592: WHICH POINT IS BEING SPENT ═══
       `poolBy[cat]` is what that skill earned; the remainder of `pool` is
       legacy/unchannelled and spendable anywhere (see the file header);
       `shared` is the pool the level-up minted BESIDE the lane points.
       An OFFENSE spend may only draw the named skill's own points or the
       remainder.  A SHARED (body) spend draws the shared pool or the
       remainder — never a lane's points: "only the point earned in the
       combat channel can be spent there (the point for shared can be
       allocated to any in that shared pool)".  The v2.3.2176 rule that a
       lane point may buy a defensive stat is RETIRED by that sentence; the
       `cat` an old client still sends on a body spend is ignored. */
    if (!p3.poolBy || typeof p3.poolBy !== 'object') p3.poolBy = { sword: 0, bow: 0, staff: 0 };
    const chan = (c) => (PROG3.SKILLS.indexOf(c) >= 0 ? Math.max(0, Number(p3.poolBy[c]) || 0) : 0);
    const poolN = Math.max(0, Math.floor(Number(p3.pool) || 0));
    const anyPts = Math.max(0, poolN - PROG3.SKILLS.reduce((n, c) => n + chan(c), 0));
    const sharedN = Math.max(0, Math.floor(Number(p3.shared) || 0));

    const levelCap = ps.level || this._prog3CharLevel(ps);
    /* v2.3.2680: the §6-C bound is per stat now — 2 × character level on the
       four damage stats (`lvlBound`), 1 × on Defense, Dodge, Resist and the
       rest (owner, 2026-09-22: "keep per level limit on those 3"). */
    const cap = Math.min(sd.def.cap, levelCap * (sd.def.lvlBound || 1));

    let cur, apply, takePoint;
    if (sd.scope === 'atk') {
      const cat = payload && payload.cat;
      if (typeof cat !== 'string' || PROG3.SKILLS.indexOf(cat) < 0) return;
      /* THE RULE: "You can only apply offensive weapon damage to the combat
         skills you leveled up in."  A Bow point cannot buy Melee luck, and
         (v2.3.2592) neither can a shared point. */
      if (chan(cat) < 1 && anyPts < 1) return;
      if (!p3.atk || typeof p3.atk !== 'object') p3.atk = prog3FreshAtk();
      if (!p3.atk[cat] || typeof p3.atk[cat] !== 'object') p3.atk[cat] = prog3FreshAtk()[cat]; // v2.3.2512: one shape, one home (was an inline literal that drifted twice)
      cur = (typeof p3.atk[cat][stat] === 'number') ? p3.atk[cat][stat] : 0;
      if (cur >= cap) return;
      apply = () => { p3.atk[cat][stat] = cur + 1; return { stat, cat, pts: cur + 1 }; };
      /* Spend the CHANNELLED point first and keep the free one for a choice
         the player may not have yet — spending the flexible point while a
         matching one sits unused would quietly narrow their options. */
      takePoint = () => {
        p3.pool = poolN - 1;
        if (chan(cat) > 0) p3.poolBy[cat] = chan(cat) - 1;
      };
    } else {
      /* v2.3.2592: a SHARED stat takes a shared point, or a legacy
         unchannelled one — the shared point first, for the same reason the
         channelled point goes first above. */
      if (sharedN < 1 && anyPts < 1) return;
      cur = (typeof p3.alloc[stat] === 'number') ? p3.alloc[stat] : 0;
      if (cur >= cap) return;
      apply = () => { p3.alloc[stat] = cur + 1; return { stat, cat: null, pts: cur + 1 }; };
      takePoint = () => {
        if (sharedN > 0) p3.shared = sharedN - 1;
        else p3.pool = poolN - 1;
      };
    }

    const applied = apply();
    takePoint();
    this._prog3Recompute(ps);
    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) {
      try {
        ws.send(JSON.stringify({
          type: 'prog3_allocated',
          /* v2.3.2176: the breakdown rides the ack so the lane counts move
             the moment the spend settles, not on the next player_state.
             v2.3.2592: and the shared pool with it. */
          payload: { ...applied, pool: p3.pool, poolBy: { ...p3.poolBy }, shared: p3.shared },
        }));
      } catch (e) {}
      this._sendPlayerState(ws, session.id);
    }
  },
};
