/* ═══ v2.3.1733: STAMINA ABILITIES + THE MILESTONE UNLOCK LADDER ═══
 *
 * Owner, after judging (docs/COMBAT-OVERHAUL-PLAN.md, PR 5): "You have your
 * base attacks from holding down the auto attack, spam swipe special attacks
 * until your mana runs out, then swipe again as soon as it slowly rises."
 * And, on what a level should buy: "chunky stats AND milestone unlocks."
 *
 * This module is both halves of that answer:
 *
 *   1. TWO STAMINA ABILITIES.  Stamina became the DEFENSIVE resource at
 *      v2.3.1731 (block costs it, parry refunds it).  These two spend the
 *      same bar OFFENSIVELY, so every fight is now a budget between holding
 *      the shield and swinging the big buttons — which is the decision the
 *      owner says combat is missing.
 *        - Shield Bash (char 4): 0.75x a normal hit, 0.8 s stun + knockback.
 *          The answer to a monster mid-wind-up (v2.3.1730): it CANCELS a
 *          telegraph, so it is a second, aggressive counter next to parry.
 *        - Whirlwind (char 8): 1.0x a normal hit to EVERY monster within
 *          60 px.  The swarm-breaker; the only thing in the kit that scales
 *          with how badly you are surrounded.
 *
 *   2. THE MILESTONE LADDER.  A trained level currently pays stats only.
 *      MILESTONES below is the "you unlocked a thing" half.  Char level 3
 *      (a fresh character) is the FLOOR and is deliberately NOT gated —
 *      owner decision: the existing kit (dodge / lunge / retreat / swipe)
 *      stays available to everyone, because taking abilities away from
 *      current players to sell them back is a regression, not progression.
 *
 * SERVER IS THE ONLY REFEREE (constraint 4 of the PR brief).  Every cast is
 * validated here against: the character level the SERVER computes, the
 * stamina pool the SERVER owns, and a cooldown the SERVER stamps.  The
 * client's copy of this table (src/data/abilities.js) exists to grey out a
 * button and predict the bar — it is never asked whether a cast is legal.
 *
 * ANTICHEAT LOCKSTEP (constraint 3).  The damage roll is
 * _computeAttackDamage's ordinary melee roll SCALED DOWN (x0.75 / x1.0) and
 * then clamped by _maxDmgForAttacker exactly like a normal hit.  A scaled-
 * down roll cannot exceed the ceiling that already covers the un-scaled one,
 * so the ceiling needs no new headroom — the comboBoost 5 term in
 * _maxDmgForAttacker (combat.js) covers this by construction.  If a future
 * ability ever multiplies ABOVE 1.0, that is the line that has to move with
 * it, in the same commit (the v2.3.1451 rule).
 *
 * IN-MEMORY COOLDOWNS ARE DELIBERATE (handoff rule 11).  ps._abilCd is
 * scratch: a deploy re-arms both abilities, which costs a player nothing and
 * keeps the rpg blob's fixed field list untouched (TRAPS #2).
 */

/* NO IMPORT FROM prog3.js, deliberately.  prog3.js imports
   staminaMilestoneMult FROM here (its _prog3Recompute owns the max-stamina
   line), so pulling PROG3 back the other way would make a module cycle whose
   failure mode is a TDZ ReferenceError at worker boot — green in every unit
   test that imports the pair in the lucky order.  The dependency runs one
   way: prog3 -> abilities. */

/* ═══ THE ABILITY TABLE — mirrored in src/data/abilities.js ═══
   Move one side and the client's button lies about cost, cooldown or
   availability.  server/test/abilities.test.mjs asserts the two objects are
   identical, so a one-sided edit fails CI rather than shipping a lie. */
/* ═══ v2.3.2298: ONE SPECIAL, ONE BLOCK ═══
   Owner: "instead of seeing tiny percentages and trying to do mental math
   each time stamina or mana is used, I want just 5 blocks ... All special
   attacks will cost one block. ... Sword dash will change to 0 stamina (or
   magic if it was that) cost for melee characters."

   A block is one FIFTH of the pool, so "one block" is staminaPct 0.20 and
   stays one block at every level -- which is the whole reason these costs
   were already percentages rather than flat numbers. maxStamina grows with
   progression points, and a flat cost would quietly become half a block on a
   high-level character while the bar still showed five.

   bash 0.30 -> 0.20 and whirl 0.40 -> 0.20. Whirl gets CHEAPER by half a
   block and bash by a third, which is a real buff and is the owner's call --
   the point of the readout is that a special costs a block you can see, and
   a whirl that ate two would make the number on screen a lie.

   sworddash 0.10 -> 0. Not "cheap", zero: it is the opening move of a melee
   engagement (game/abilities.js maybeSwordDash), gated by a 2500ms cooldown
   rather than by stamina, and the cooldown is what stops every swing being a
   lunge. Charging a block for the move that STARTS a fight would mean opening
   a fight costs you a fifth of the bar you fight with. */
export const STAM_ABILITIES = {
  /* ═══ v2.3.2258: THE SWORD'S OPENING LUNGE ═══
     Owner: "For ONLY melee (sword) ... the default first attack will be very
     similar to 'shield bash' (you can even re-use the mechanic but for sword)
     and keep the stun enemy effect.  I've been feeling like melee is a little
     underpowered so this should help.  Also make the cost of sword dash 10%
     stamina."

     So it IS the bash mechanic, re-pointed: the same declared-target dash that
     v2.3.2252 built to make a shove connect (name the monster, close the gap
     frame by frame, let the worker validate the longer reach), with a sword's
     numbers instead of a shield's.  Differences from bash, all deliberate:
       needs 'weapon' rather than 'shield', and no needsHeldShield -- this is
         what a sword does, not what a raised guard does;
       staminaPct 0.10, the owner's number, against bash's 0.30;
       dmgMult 1.0, because this REPLACES the first swing rather than adding a
         second move on top of it -- 0.75 would have made opening with it a
         damage LOSS, which is the opposite of "melee is underpowered";
       knockback 40 against bash's 90: a lunge closes distance, and shoving the
         target back out of reach on the opening hit would undo the dash;
       stunMs 1600 unchanged -- "keep the stun enemy effect", verbatim.
     cooldownMs is the real limiter (see game/abilities.js maybeSwordDash): the
     move is "the first attack of an engagement", and 2500 is what stops a
     release-and-re-press from making every swing a lunge. */
  sworddash: {
    minLevel: 0,
    blocks: 0,            /* free, v2.3.2298 (owner) */
    cooldownMs: 2500,
    dmgMult: 1.0,
    radius: 70,
    stunMs: 1600,
    knockback: 40,
    needs: 'weapon',
    /* ═══ v2.3.2266: THE REACH IS WHAT THE LUNGE CAN CLOSE ═══
       Owner: "dash damage using the tap to lock on a far away monster gives an
       'out of range' error."  There is no such string in the game -- the only
       range outcome a cast has is reject('whiff'), which the client floats as
       "Missed!" -- so this is the behaviour being named, and the behaviour is
       this number.

       240 was chosen in v2.3.2252 to cover the 220px targeting perimeter, back
       when a lunge could only be aimed at something inside it.  Tap-to-lock has
       no range limit at all (it is a screen-space hit test, which is what makes
       the 675px bow snipe work), and v2.3.2263 let the lunge's window grow with
       the gap so it can now actually close up to DASH_MAX_REACH_PX -- 900, the
       client's own travel cap.  So the client crosses 800px, arrives, swings,
       and the worker refuses it against a bound set for a different feature.
       The two numbers are the same fact and they are now the same number.

       THIS IS NOT A WIDER ANONYMOUS HIT.  The radius scan above is untouched at
       70; only a DECLARED target -- one monster, named by the client -- is
       checked against `reach`, and the server still owns damageability, the
       roll and the clamp.  What it buys a cheater is one melee-clamped hit per
       2500ms cooldown and 10% stamina on a monster they could have walked to,
       and the block below now MOVES them there, so the position they end up
       claiming is the one the ability says they took. */
    reach: 900,   /* v2.3.2252: 240; v2.3.2266: = client DASH_MAX_REACH_PX */
  },
  bash: {
    /* ═══ v2.3.2252: NO LEVEL GATE ═══
       Owner: "Make shield bash an ability for any level (no gates) the only
       requirement is you must have your shield held."
       Kept as 0 rather than deleted: `abilityUnlocked` compares
       `charLevel >= cfg.minLevel`, and a MISSING field makes that
       `n >= undefined` -> NaN -> false, i.e. permanently LOCKED, which is the
       exact opposite of ungated.  0 is always true and never rejects.
       The requirement moved to "a shield, and it is raised" -- see
       game/abilities.js abilityStatus. */
    minLevel: 0,
    blocks: 1,            /* ONE block, at every count -- v2.3.2302 */
    cooldownMs: 4000,
    dmgMult: 0.75,        /* of a normal melee roll */
    radius: 70,           /* px; a shove has to reach about as far as a swing */
    /* v2.3.1736 (owner: "double the time it stuns the enemy").  800 -> 1600.
       The cooldown is 4000, so a bashed monster is now dazed for 40% of the
       time between your bashes rather than 20%. */
    stunMs: 1600,
    knockback: 90,        /* px, vs 30 for a normal hit (combat.js) */
    needs: 'shield',
    /* v2.3.2252: ...and it must be RAISED for the button to appear (client
       rule; the server's authoritative requirement stays `needs`, because
       ps.blocking is client-supplied on every move packet and a server gate on
       it would be forgeable and lag-fragile). */
    needsHeldShield: true,
    /* v2.3.2252: how far the bash may CLOSE when it names its target.  240
       covers the 220px targeting perimeter, so anything you can engage is
       something you can bash to.  Only honoured for a declared target. */
    reach: 240,
  },
  whirl: {
    /* ═══ v2.3.2327: NO LEVEL GATE (owner) ═══
       "Change whirlwind so ... begins as an option immediately (no level
       gating)."  Mirrored from src/data/abilities.js, which the assertion in
       test/abilities.test.mjs pins -- a drifted number here is a client button
       the worker refuses with 'locked'.
       The companion half of the ask, "only for the melee character (sword
       equipped)", is deliberately NOT enforced here: which slot a client says
       it is holding is client-supplied on every packet, so a server gate on it
       would be forgeable and lag-fragile -- exactly the reasoning bash's
       needsHeldShield carries. `needs: 'weapon'` remains the authoritative
       requirement; the slot rule is a client-side visibility rule. */
    minLevel: 0,
    blocks: 1,            /* ONE block, at every count -- v2.3.2302 */
    cooldownMs: 6000,
    dmgMult: 1.00,
    /* ═══ v2.3.1738: THE VACUUM (owner) ═══
       "Whirlwind needs the biggest change. It has virtually no effect when
       you play it in the game. I need it to pull in every enemy in a huge
       radius (disable enemy attacks for the first second while it pulls them
       in so it's not just a big damage sponge)."

       60 -> 240px, i.e. 7.5 tiles: on a 390px-wide phone that is most of the
       screen, which is what "huge" has to mean for the ability to read as a
       vacuum rather than a nudge.  maxTargets 8 -> 16 with it, or the radius
       would be a lie the moment a swarm actually filled it. */
    radius: 240,
    /* The one-second attack lockout the owner asked for, spent through the
       EXISTING stun (ccMoveMult 0 in _tickMonsters), which already blocks the
       swing, the projectile, the chase and the telegraph in one gate — and,
       since v2.3.1735, shows the star ring so the player can see why nothing
       is hitting them.  Short on purpose: this buys the gather, it is not
       bash's 1600ms hold. */
    stunMs: 1000,
    knockback: 0,         /* v2.3.1735: whirl GATHERS now, it does not shove */
    /* v2.3.1735 (owner): every target is placed on a ring this many px from
       the caster.  34 sits just outside the body and INSIDE melee reach —
       the whole point is that the pack ends up somewhere your next swing
       covers.  See _abilityStrikeMonster for why this places rather than
       impulses. */
    pullTo: 34,
    needs: 'weapon',
    /* v2.3.2327: the melee weapon must be the ACTIVE one for the button to
       appear (client rule; the server's authoritative requirement stays
       `needs`, because which slot a client says it is holding is
       client-supplied on every packet and a server gate on it would be
       forgeable and lag-fragile).  Mirrored here rather than left client-only
       because the mirror assertion is a strict deep-equality -- the same
       reason bash carries needsHeldShield on both sides. */
    needsMeleeActive: true,
    /* v2.3.1738: 8 -> 16 with the radius.  Still bounded — the cap exists so
       one cast cannot walk an unbounded list — but 8 would have quietly
       dropped half a swarm inside the new reach, which is exactly the "it has
       virtually no effect" complaint in a new form. */
    maxTargets: 16,
  },
};

/* ═══ v2.3.2361: THE CONTEXTUAL LUNGE FINALLY LANDS ═══
 *
 * Owner, asked the question v2.3.2350-2352 left in doLunge: "Yes lunge damage
 * should take effect."
 *
 * TWO DIFFERENT THINGS IN THIS REPO ARE CALLED A LUNGE.  `sworddash` above is
 * one -- the melee opener, a full-weight declared-target dash with a stun, cast
 * through `ability {kind}`.  THIS is the other: the §5.8 contextual dodge,
 * swiped toward a locked monster.  It has sent an `ability_use` naming the
 * kind lunge since long before STAM_ABILITIES existed, and until now that
 * spent a stamina block and did nothing.  Client-authoritative zones (town)
 * resolved it locally at LUNGE_DAMAGE_MULT; a server zone got the i-frames,
 * the sound and no hit, and v2.3.2351 stopped the client billing a number for
 * damage the monster never took.  This is the server half that note said it
 * was leaving.
 * (The paragraph above spells the payload out in words rather than as an
 * object literal on purpose: wire-audit.test.mjs extracts emitted event types
 * by regex over the raw source, comments included, so writing the INBOUND
 * shape literally would register a phantom outbound type and fail CI.)
 *
 * DELIBERATELY NOT A STAM_ABILITIES ROW, and the absence is the design.
 * Putting it in that table would have been less code -- _handleAbility already
 * owns cost, cooldown, equipment, zone, reach and whiff -- and it was the other
 * candidate.  Four reasons it is not:
 *
 *   1. IT WOULD OPEN A SECOND WIRE DOOR TO ONE MOVE.  _handleAbility accepts
 *      any own-property key of STAM_ABILITIES off `ability {kind}`, so the row
 *      itself makes `{kind:'lunge'}` a legal cast: a lunge with no dodge roll,
 *      no i-frames and no player_dodge broadcast.  Not a damage exploit (same
 *      gates, same cost) -- but two doors to one move with different client
 *      halves is exactly the confusion the paragraph above exists to prevent.
 *   2. THE MIRROR IS A HARD CONTRACT.  abilities.test.mjs asserts
 *      JSON.stringify(server) === JSON.stringify(client), so the row would
 *      also ship in src/data/abilities.js -- a table read by the ability
 *      BUTTONS -- and land in _abilityUnlockList, which rides every
 *      player_state.  v2.3.2252 and v2.3.2327 both had to unwind ladder rows
 *      that made the level-up celebration announce a move every player already
 *      had; a third would be self-inflicted.
 *   3. THE WHIFF WOULD SHOUT.  _handleAbility answers reject('whiff') on zero
 *      hits and the client floats "Missed!" (abilityRejectText).  A swipe fires
 *      this move in EVERY zone, including town, where this.monsters['town'] is
 *      never populated (_activeZones excludes it) -- so every town lunge would
 *      say "Missed!" while the client landed it locally.
 *   4. THE REJECTION SHAPE WOULD CHANGE under existing clients:
 *      _handleAbilityUse answers {type, pool, cost, have}, _handleAbility
 *      answers {kind, reason}.
 *
 * What IS reused is the only part that matters for correctness:
 * _abilityStrikeMonster, the same helper bash/whirl/sworddash strike through --
 * roll -> _maxDmgForAttacker clamp -> overkill clamp -> dmgByPlayer ->
 * _prog3AwardXp -> sticky aggro -> _markMonsterDirty -> monster_hit ->
 * _resolveMonsterKill.  A second copy of that pipeline is precisely how kill
 * credit silently diverges (_applyMonsterDot's own comment says so).
 *
 * WHY THE NUMBERS ARE THESE NUMBERS -- see _lungeStrike for the gates:
 *   dmgMult 0.6   = the client's LUNGE_DAMAGE_MULT (src/data/gameSystems.js).
 *                   The whole reason this could not be fixed from the client
 *                   by sending monster_damage: the worker would have rolled a
 *                   FULL swing for a move designed at 60%.  Pinned to the
 *                   client constant by the suite, which imports both.
 *   cooldownMs 1000 = THE OWNER'S CALL, and the only bound on this lane that
 *                   actually holds.  Shown the numbers, they picked "about 1
 *                   second".
 *
 *                   WHY NOT THE STAMINA POOL, which three rounds of this change
 *                   tried to make into the bound and could not.  The pool is
 *                   REFILLABLE BY DESIGN: staminaSalts is a shop item (12 coins
 *                   for 60 stamina, cooking.js _applyShopItem) reachable from
 *                   inside a combat zone with no cooldown, by purchase or by
 *                   drinking from the bag.  That is a feature, not a hole.  A
 *                   quantity a player is MEANT to be able to top up cannot rate-
 *                   limit anything that spends it, so every "the pool bounds the
 *                   sustain" sentence written here was false the moment it was
 *                   written -- twice, in two different rounds, which is why this
 *                   block now says it plainly.  Four other writers were found
 *                   and closed on the way (join amulet mults, the skill-level
 *                   full-restore, the bootstrap raw-stat cap); they are worth
 *                   having, but they were never going to be sufficient.
 *
 *                   THE ARITHMETIC AT 1000ms.  A scripted client with an
 *                   infinite bar gets 1.0 lunge/s = 0.6 full-swing-equivalents/s
 *                   (dmgMult 0.6).  A measured honest fresh character gets 0.600
 *                   lunges/s, pool-bound.  So the ceiling now SITS ON the honest
 *                   rate rather than 5.7x over it, and cheating buys nothing on
 *                   this path.  That is the property to preserve: if this number
 *                   ever moves down, the pool will not catch what comes through.
 *
 *                   COST TO HONEST PLAY, stated rather than waved at: the
 *                   shortest roll window is 250ms, so a player CAN lunge faster
 *                   than once a second and the extra ones land no damage.  They
 *                   are still dodges -- the i-frames, the travel and the sound
 *                   are on the mobility path and untouched -- which is what the
 *                   move was before this change shipped at all.  It is NEW:
 *                   ability_use had no cooldown of any kind (checked, not
 *                   assumed) and its `case` sits above the relay token bucket.
 *                   THE POOL IS ONLY A RATE LIMIT FOR AN HONEST CLIENT, and an
 *                   earlier draft of this paragraph said flatly that the
 *                   "sustained rate was already stamina-bound (~0.5 lunges/s)".
 *                   That arithmetic is right for an honest bar -- one block is
 *                   maxStamina/5 (blockSize) against a ~670ms regen tick paying
 *                   ~7 x its mults (index.js _tickPlayerRegen) -- and wrong as
 *                   a bound, because one of those mults is amuletStaminaRegen
 *                   and join.js took it from the join payload with a floor and
 *                   NO ceiling.  A client that simply never sent stats_update
 *                   (where grids.js has clamped the same field to [0,100] since
 *                   v2.3.1182) could refill the whole bar on every tick and
 *                   hold this lane at the 175ms floor for as long as it liked.
 *                   v2.3.2372 clamps the join path to the same [0,100], pinned
 *                   in anticheat.test.mjs §8.
 *                   ═══ v2.3.2373: THAT CLAMP ALONE STILL BOUNDED NOTHING ═══
 *                   The sentence that stood here said "the cooldown bounds the
 *                   burst, the CLAMPED pool bounds the sustain".  It was false
 *                   when written, because two more doors opened onto the same
 *                   refill and neither went through amuletStaminaRegen:
 *                     - grids.js _handleStatsUpdate FULL-RESTORES hp, stamina
 *                       and mana on any reported weapon/defense SKILL LEVEL
 *                       increase, and its sanitizers stored DECREASES just as
 *                       happily -- so reporting 40, 39, 40 was an unrated,
 *                       on-demand refill of every pool;
 *                     - join.js seeded the T1 raw stats at _clampStat(payload,
 *                       claimed level), which under BOOTSTRAP_LEVEL_CAP put
 *                       endurance at _statCap(1000) = 10020 and this tick's
 *                       (1 + endurance * 0.002) at 21x -- on a field that,
 *                       under prog3, nothing ever writes again.
 *                   Both are shut in v2.3.2373 (monotonic skill sanitizers; a
 *                   raw-stat cap level of 100).  What follows is MEASURED, on a
 *                   real GameRoom driven over a virtual clock by a scripted
 *                   client that sends only when the pool can pay and the floor
 *                   has expired -- because _handleAbilityUse charges the block
 *                   on every message, so flooding the wire only starves you.
 *                   The worst case is a FRESH character, not a big one: the
 *                   cost is maxStamina/blocks and the refill is not, so the
 *                   smallest bar is the attacker's best bar (maxStamina 100,
 *                   5 blocks, 20 a lunge; the same 60-second run on a
 *                   100-point stamina build measures 1.767/s).
 *                     honest (endurance 0, amulet 0)          0.600 lunges/s
 *                     post-fix, both surviving mults at their
 *                       clamp (endurance 1020, amulet 100)    3.367 lunges/s
 *                     PRE-fix, the skill-level flip-flop
 *                       alone, with honest stats             5.717 lunges/s
 *                     PRE-fix, endurance 10020 + amulet 100  5.717 lunges/s
 *                   So the claim is true NOW, and only just: 3.367/s is the
 *                   pool paying a measured 43 stamina per 660 ms tick against a
 *                   20-per-lunge cost, which is 5.6x the honest rate and sits
 *                   under the cadence ceiling of 1000/175 = 5.714/s.  That gap
 *                   is the whole of the bound.  NAMED RATHER THAN IMPLIED: the
 *                   3.367 row is still bought with a forged join payload, and
 *                   what would have to move to close it further is the amulet
 *                   ceiling and the raw-stat cap, not this table.
 *   stun/knockback/pullTo 0 -- a lunge is a dodge, and shoving the target back
 *                   would undo the gap it just closed (sworddash's reasoning).
 *                   Zeroed rather than omitted so _abilityStrikeMonster's
 *                   displacement and stun blocks stay provably inert and the
 *                   helper is byte-unchanged for the three kinds already on it.
 *   reach 220       is the move's OWN reach, and it is in this table because an
 *                   earlier draft had _lungeStrike measure against
 *                   this.PVE_MELEE_RANGE (400) directly -- on the argument that
 *                   reusing the melee bound meant the lunge could claim nothing
 *                   an ordinary swing could not.  That argument is backwards
 *                   (v2.3.2372).  400 is the ANTICHEAT TOLERANCE for a client-
 *                   CLAIMED swing: index.js sizes it for "client/server
 *                   position lag on iPhone Safari over cellular" ON TOP of the
 *                   swing's own reach.  It is not a reach any honest swing has,
 *                   so borrowing it made the lunge a ~400px melee damage source
 *                   -- roughly three times the ground the move actually covers.
 *                   220 is measured off the client instead:
 *                     58  the roll's travel by the time it strikes.  The roll
 *                         steps 6px per 60Hz-equivalent frame (BroTown.jsx,
 *                         `6 * S._dtScale`, _dtScale clamped to [0.2,3]) = 360
 *                         px/s, and dodge.js swings at +160ms.
 *                    122  an ordinary swing's own reach from where that lands:
 *                         GS_OUTER_RADIUS 72 + the largest melee body radius in
 *                         monsterMeleeHitRadius (skeleton, 50).
 *                     40  lag.  ability_use does NOT flush the held move --
 *                         wsClient.js's flushPendingMoveNow is wired to
 *                         `ability` only (v2.3.1765) -- so ps.x/ps.y can be a
 *                         MOVE_GAP_SOLO_MS 66ms batch plus a hop behind, and
 *                         that file's measured table puts a 198ms gap at a
 *                         38.5px peak.
 *                   ~220 in total, which is also TARGET_PERIMETER_PX, the ring
 *                   inside which the client acquires the lock at all: an
 *                   independent cross-check, not the source of the number.
 *                   A FLOOR UNDER THE BACKSTOP, NOT A REPLACEMENT FOR IT --
 *                   _lungeStrike takes Math.min(PVE_MELEE_RANGE, reach), so the
 *                   anticheat bound still caps this lane if either ever moves.
 *                   WHAT IT DELIBERATELY REFUSES: the auto lock is HELD out to
 *                   TARGET_PERIMETER_PX x TARGET_HYST = 275px, a tapped lock has
 *                   no range bound at all, and the client's own 160ms hit does
 *                   no distance test -- so a swipe at a monster 275px away still
 *                   rolls, still spends its block, and now lands nothing.  That
 *                   is the intended shape: at 275px the roll closes 58 and
 *                   leaves ~217, about 95px past the reach of the swing this
 *                   move is meant to be.  Past 220, a lunge is a dodge. */
export const LUNGE = {
  dmgMult: 0.6,        /* === client LUNGE_DAMAGE_MULT, pinned by the suite */
  cooldownMs: 1000,       /* v2.3.2374: the owner's number -- see the block above */
  reach: 220,          /* v2.3.2372: the move's own reach -- see the block above */
  stunMs: 0,
  knockback: 0,
  pullTo: 0,
};

/* ═══ THE MILESTONE LADDER — char level -> what it unlocks ═══
   `kind` names an ability in STAM_ABILITIES; `points` is a one-off bonus
   allocation point; `stamMult` multiplies max stamina from here on.

   v2.3.1734: rung 6 is FILLED.  It was left empty by v2.3.1733 as a
   hand-off marker for PR 6, with an assertion in abilities.test.mjs
   pinning the GAP so the two sessions could not silently disagree about
   who owned the level — that assertion is now flipped to pin the entry.

   Element Burst carries `burst: true` and NOT a `kind`, deliberately: it
   spends MANA, not stamina, so it is not in STAM_ABILITIES and it has its
   own handler (server/src/burst.js).  `kind` means "look me up in
   STAM_ABILITIES", and milestoneAbilityLevels() enforces exactly that —
   naming a kind here that the stamina table does not have would fail the
   ladder-consistency check, correctly.  The rung still earns its keep: the
   `label` is what the level-up celebration announces, which is the whole
   reason a player finds out the ability exists.

   THE LEVEL ITSELF lives in PROG3.BURST_MIN_CHAR_LEVEL, which is what
   burst.js actually gates on, because that constant is mirrored to the
   client and drives the button.  This file cannot import prog3.js (the
   module cycle noted at the top), so abilities.test.mjs imports both and
   asserts the two agree — one gate, one ladder entry, pinned together. */
export const MILESTONES = {
  /* v2.3.2252: see the client mirror -- rung 4 stops naming an ability. */
  4:  { label: 'Sturdy Arm' },
  5:  { points: 1,     label: 'Bonus stat point' },
  6:  { burst: true,   label: 'Element Burst' },
  /* v2.3.2327: rung 8 stops naming an ability, for the reason rung 4 did at
     v2.3.2252 -- Whirlwind is ungated now, and leaving `kind: 'whirl'` here
     would have the level-up celebration announce "Whirlwind unlocked!" for a
     move the player has had since level 1 (prog3.js reads
     MILESTONES[level].label for exactly that).  It also has to go for a
     harder reason: milestoneAbilityLevels() asserts every kind the ladder
     names agrees with its minLevel, and 8 !== 0. */
  8:  { label: 'Storm Footing' },
  10: { stamMult: 1.25, label: 'Second Wind' },
};

/* ═══ v2.3.2302: THE BLOCK COUNT IS A LADDER, NOT A CONSTANT ═══
   v2.3.2298 made a block a FIFTH of the pool so "one special = one block" was
   true at every level.  The price of that -- flagged to the owner at the time
   -- was that levelling Magic bought a BIGGER cast rather than MORE casts,
   reversing the v2.3.1734 decision that existed for exactly that reason.  The
   owner's answer (2026-09-05) is not to move the cost off the pool again but
   to move the DIVISOR: the row gets longer.  5 blocks at base, 10 fully
   invested, one more every 20 points.  A block is still exactly one special at
   every level, so the cost is maxPool / blockCount and SHRINKS as N grows.

   ONE ladder for both pools: mana counts Magic LEVELS (1..100), stamina counts
   allocated stam POINTS (0..100).  Same domain, same rungs, one sentence to
   explain: "every 20 puts another block on the bar."

   Keyed on the PROGRESSION INPUT, never on maxMana/maxStamina.  The legacy
   pool path folds amulet and gear bonuses into those, so a gear-derived count
   would make one block stop being one cast the moment you swapped a necklace.

   Its own ladder rather than MILESTONES: that one is keyed on CHARACTER level,
   tops out at rung 10, and already carries stamMult pinned by the suite. */
export const BLOCKS = {
  base:  5,
  max:   10,
  rungs: [20, 40, 60, 80, 100],   /* invested value granting the 6th..10th */
};

/* Blocks earned by `invested` (Magic level, or allocated stam points). */
export function blocksAt(invested) {
  const v = Math.max(0, Math.floor(Number(invested) || 0));
  let n = BLOCKS.base;
  for (let i = 0; i < BLOCKS.rungs.length; i++) if (v >= BLOCKS.rungs[i]) n += 1;
  return Math.max(BLOCKS.base, Math.min(BLOCKS.max, n));
}

/* The count a LIVE player is on, read off the playerState the recompute
   stamped.  Clamped rather than trusted, and the fallback is what keeps a
   legacy blob (no prog3) on the five blocks its client draws. */
export function poolBlocks(ps, pool) {
  const n = ps && (pool === 'mana' ? ps.manaBlocks : ps.stamBlocks);
  return (typeof n === 'number' && n >= BLOCKS.base && n <= BLOCKS.max)
    ? Math.floor(n) : BLOCKS.base;
}

/* ONE block, in pool units.  FLOOR, not ceil, and that matters: the readout
   lights floor((v*N)/max) blocks, so a cost that rounded UP would show a block
   the worker then refuses to spend -- which is the bug the five-block bar has
   carried since v2.3.2298 (ceil costs against a floor readout).
   It is exact, not approximate: for max >= 100 and N in 5..10,
   floor(max / floor(max/N)) === N, so a full bar is always exactly N casts. */
export function blockSize(ps, pool) {
  const max = (pool === 'mana' ? ps && ps.maxMana : ps && ps.maxStamina) || 100;
  return Math.max(1, Math.floor(max / poolBlocks(ps, pool)));
}

/* Max-stamina multiplier earned by character level.  Read by
 * _prog3Recompute (server) and recalcDerived (client) — both, or the bar
 * the player sees disagrees with the pool the abilities spend from.
 * NAME COLLISION, on purpose: "Second Wind" is also a retired defenseSpec
 * channel (a post-hit heal, combat.js).  The owner named this milestone;
 * the two never coexist on one character (the channel is inert for every
 * prog3 player), so the label is reused rather than invented. */
export function staminaMilestoneMult(charLevel) {
  let mult = 1;
  for (const [lvl, m] of Object.entries(MILESTONES)) {
    if (m.stamMult && charLevel >= Number(lvl)) mult *= m.stamMult;
  }
  return mult;
}

/* Bonus allocation points owed at a character level (cumulative). */
export function milestonePointsThrough(charLevel) {
  let pts = 0;
  for (const [lvl, m] of Object.entries(MILESTONES)) {
    if (m.points && charLevel >= Number(lvl)) pts += m.points;
  }
  return pts;
}

export const abilityMethods = {
  /* The character level the ladder is measured against.  prog3 players (i.e.
     everyone, post-respec) use Σ trained levels; a legacy blob falls back to
     its stored level so this can never throw on an un-migrated player. */
  _abilCharLevel(ps) {
    if (!ps) return 0;
    if (ps.prog3) return this._prog3CharLevel(ps);
    return Math.max(1, Math.floor(Number(ps.level) || 1));
  },

  _abilityUnlocked(ps, kind) {
    const cfg = Object.prototype.hasOwnProperty.call(STAM_ABILITIES, kind)
      ? STAM_ABILITIES[kind] : null;
    if (!cfg) return false;
    return this._abilCharLevel(ps) >= cfg.minLevel;
  },

  /* ═══ ability { kind } — the cast ═══
     THREE LEGS OR IT DIES (TRAPS #18): the `case 'ability'` in index.js's
     webSocketMessage, this handler, and the passthrough line in
     channelShim.send (src/networking/wsClient.js).  precheck rule 8 checks
     the third one.

     Rejections are ANSWERED, not silently dropped.  A silent refusal is
     what v2.3.1716 had to fix on the special attack: a button that does
     nothing and says nothing is indistinguishable from a broken game to the
     person holding the phone.  ability_rejected already existed in
     PRIVILEGED_EVENTS with no client handler; this PR writes that handler. */
  _handleAbility(session, payload) {
    if (!session || !session.id) return;
    const kind = payload && payload.kind;
    if (typeof kind !== 'string') return;
    /* Own-property check: '__proto__' must resolve to nothing (CLAUDE.md's
       plain-{} rule, three incidents in one day). */
    if (!Object.prototype.hasOwnProperty.call(STAM_ABILITIES, kind)) return;
    const cfg = STAM_ABILITIES[kind];
    const ps = this.playerState[session.id];
    if (!ps) return;
    /* ═══ v2.3.1765: RECORD WHERE THE CAST WAS MEASURED FROM ═══
       Owner: "Shield bash always seems to miss if I activate it while I'm
       moving while I hit the monster with it."
       Bash picks its target within 70px of ps.x/ps.y below, and ps.x/ps.y is
       the worker's copy of the player's position — which lags a moving client
       by however long the move batcher has been holding one (up to 198ms when
       nobody shares the zone).  This stamp is the answer to "the bash missed —
       missed from WHERE", the one question the miss itself does not answer,
       and it is what mp-ability asserts against the client's live position.
       Stamped BEFORE the gates so a refused cast records it too: a rejection
       is exactly when you most want to know what the worker believed.
       In-memory scratch, underscore-prefixed and absent from _saveRpg's field
       list, so nothing persists and no storage key is involved. */
    ps._abilFrom = { x: ps.x || 0, y: ps.y || 0, at: Date.now(), kind };
    const ws = this._wsBySessionId(session.id);
    const reject = (reason, extra) => {
      if (!ws) return;
      try {
        ws.send(JSON.stringify({
          type: 'ability_rejected',
          payload: { kind, reason, ...(extra || {}) },
        }));
      } catch (e) {}
    };

    /* Death gate uses the SERVER's view (ps.dying/ps.respawnAt), not ps.dead
       — ps.dead is written straight from the client's move payload.  Same
       reasoning as _handleMonsterDamage's gate. */
    if (ps.dying || ps.disconnected) return;

    const level = this._abilCharLevel(ps);
    /* v2.3.2252: `cfg.minLevel &&` so an ungated ability (minLevel 0) never
       takes this branch.
       v2.3.2327: ...which is now EVERY ability -- whirl went 8 -> 0 with the
       owner's "no level gating", so this branch is currently unreachable. It
       stays because the gate is data, not policy: the next ability to arrive
       with a minLevel gets it for free, and deleting it would have to be
       re-derived. */
    if (cfg.minLevel && level < cfg.minLevel) return reject('locked', { need: cfg.minLevel, have: level });

    /* Equipment gates, the v2.3.1682 lesson: a bash with no shield and a
       whirlwind with no sword are the "first swing is free" bug in a new
       costume.  Checked server-side because the client's copy of the
       loadout is a prediction. */
    if (cfg.needs === 'shield' && !ps.shield) return reject('no-shield');
    if (cfg.needs === 'weapon' && !ps.weapon) return reject('no-weapon');

    const now = Date.now();
    if (!ps._abilCd) ps._abilCd = Object.create(null); /* proto-safe; keys are OUR constants */
    const readyAt = ps._abilCd[kind] || 0;
    if (now < readyAt) return reject('cooldown', { ms: readyAt - now });

    /* v2.3.2302: whole blocks, not a percentage.  ceil-against-a-floor-readout
       was the old mismatch -- the bar could show a block the worker refused. */
    const cost = cfg.blocks > 0 ? cfg.blocks * blockSize(ps, 'stamina') : 0;
    const have = Math.floor(ps.stamina || 0);
    if (have < cost) return reject('stamina', { cost, have });

    /* Swinging ends an extraction (v2.3.1704) — an ability is a swing. */
    this._endExtraction(session.id);

    ps.stamina = Math.max(0, have - cost);
    ps._abilCd[kind] = now + cfg.cooldownMs;

    const zone = ps.z;
    const monsters = (zone && this.monsters[zone]) || [];
    const inRange = [];
    for (const m of monsters) {
      if (!this._monsterDamageable(m)) continue;   /* v2.3.2221 */
      const dx = (m.x || 0) - (ps.x || 0);
      const dy = (m.y || 0) - (ps.y || 0);
      const d2 = dx * dx + dy * dy;
      if (d2 <= cfg.radius * cfg.radius) inRange.push({ m, d2 });
    }
    inRange.sort((a, b) => a.d2 - b.d2);
    /* Bash is a single shove; whirlwind is the whole circle (bounded). */
    /* v2.3.2258: sworddash is a single lunge, like bash -- one target, the
       nearest.  Whirlwind is still the whole circle. */
    let targets = (kind === 'bash' || kind === 'sworddash') ? inRange.slice(0, 1)
      : inRange.slice(0, cfg.maxTargets || 8);

    /* ═══ v2.3.2252: A BASH CLOSES THE DISTANCE, SO IT REACHES FURTHER ═══
       Owner: "Shield bash almost never makes contact with the enemy.  Make
       yourself always dash to the enemy and make contact whenever you use
       shield bash."

       It almost never made contact for a measurable reason.  The scan above is
       feet-to-feet at radius 70, while every other combat system in the game
       measures to the monster's BODY CENTRE -- and the player's own collision
       ring parks them 58-84px from a monster's feet when they are visually
       pressed against it.  For a mummy or a skeleton the closest position the
       player can legally occupy is OUTSIDE 70px: the bash could not land even
       while touching.  A sword swing reaches 96-122px to the same monster, so
       the natural fighting distance was already 1.5-2x outside bash range.

       The move is now a CLOSING move, so its reach is the distance it closes.
       `reach` is used only when the client names the monster it dashed at --
       the server still owns the damage, still checks damageability, and still
       clamps the roll; what it accepts is a longer, DECLARED engagement rather
       than an anonymous wider circle, so a client cannot use it to sweep a
       crowd.  Falls back to the radius scan when no target is named, which is
       what an older client sends: deploy-order safe in both directions, with
       no caps flag, because the field is additive and optional. */
    if ((kind === 'bash' || kind === 'sworddash') && !targets.length && payload && payload.targetId != null) {
      const want = String(payload.targetId);
      const reach = cfg.reach || cfg.radius;
      for (const m of monsters) {
        if (String(m.id) !== want) continue;
        if (!this._monsterDamageable(m)) break;
        const dx = (m.x || 0) - (ps.x || 0);
        const dy = (m.y || 0) - (ps.y || 0);
        const d2 = dx * dx + dy * dy;
        if (d2 <= reach * reach) {
          /* ═══ v2.3.2266: A LUNGE THE SERVER ACCEPTS IS A LUNGE THE SERVER
             PERFORMS ═══
             The client integrates the dash frame by frame and streams the
             positions (v2.3.2263 put it in the move-broadcast gate), but that
             stream is exactly what a phone loses: the lunge runs at ~1560 px/s,
             which is ~103px per 66ms send against the movement validator's
             500*dt+80 = 113px budget, so a single bunched packet is refused and
             the worker keeps the pre-lunge position.  It then range-checks the
             swing from a place the player left half a second ago.  That is not
             a bug in the validator -- a sustained 1560 px/s genuinely is over
             its cap -- and it cannot be fixed by trusting the client harder.

             So the position stops being something the worker has to be talked
             into and becomes something it DOES.  It has already charged the
             stamina and the cooldown and decided this target is legal; placing
             the player at contact is the same decision, written down.  It is
             also what movement.js's own C-6 note recommends for the analogous
             hole ("having it WRITE the entry position instead of accepting
             msg.x/msg.y removes the bypass entirely and needs no heuristic").

             46px is the client's DASH_STOP_PX -- the contact range its dash
             stops at -- so the two copies land on the same spot rather than
             fighting.  Only for SWORDDASH: bash strikes on the press while the
             player is still travelling (v2.3.2260 left it that way
             deliberately), so moving them there would be a lie about where the
             shove came from.
             lastMoveOkAt/lastMoveAt are cleared with it, so the very next move
             packet is treated as a first move and compared against nothing --
             otherwise the client's own arrival position, measured from a point
             the server just jumped it to, would look like a teleport. */
          if (kind === 'sworddash') {
            const dist = Math.sqrt(d2) || 1;
            const stop = 46;
            if (dist > stop) {
              ps.x = (m.x || 0) - (dx / dist) * stop;
              ps.y = (m.y || 0) - (dy / dist) * stop;
              ps.lastMoveAt = undefined;
            }
          }
          targets = [{ m, d2 }];
        }
        break;
      }
    }

    let hits = 0;
    for (const t of targets) {
      hits += this._abilityStrikeMonster(zone, t.m, session.id, ps, kind, cfg) ? 1 : 0;
    }

    /* The pool is the only durable change, so it coalesces (v2.3.1619b);
       the immediate player_state keeps the bar honest on the caster's
       screen the same tick the ability fires. */
    this._saveRpgPools(session.id, ps);
    if (ws) this._sendPlayerState(ws, session.id);
    /* A whiff still costs stamina and cooldown — that is the risk half of
       the ability, and it is the same rule the telegraphed monster attacks
       play by (v2.3.1730).  Telling the client it whiffed lets it float
       "Miss" instead of leaving the player wondering. */
    if (hits === 0) reject('whiff', { spent: cost });
  },

  /* One ability hit vs one monster.  Deliberately mirrors the tail of
     _handleMonsterDamage (credit -> dirty -> monster_hit -> kill) rather
     than calling it: that handler's job is validating a CLIENT-CLAIMED
     swing (cadence floor, proximity, slot resolution), none of which
     applies to a server-rolled cast that already passed its own gates.
     What it must NOT diverge on is the credit pipeline, so the order here
     is the same one _applyMonsterDot uses.
     Returns true when the monster took damage. */
  _abilityStrikeMonster(zoneId, m, pid, ps, kind, cfg) {
    if (!this._monsterDamageable(m)) return false;   /* v2.3.2221 */
    const rolled = this._computeAttackDamage(ps, 'melee', false);
    /* ANTICHEAT LOCKSTEP: the ordinary melee ceiling, applied to a roll
       that is a FRACTION of an ordinary melee roll.  Scaling down can
       never breach a ceiling that covers the un-scaled hit, so this clamp
       is a backstop, not a limiter (see the header note). */
    const cap = this._maxDmgForAttacker(ps, false);
    const raw = Math.max(1, Math.min(cap, Math.round(rolled.dmg * cfg.dmgMult)));
    const dmg = Math.min(raw, Math.max(0, m.hp));
    m.hp -= dmg;
    if (!m.dmgByPlayer) m.dmgByPlayer = Object.create(null);
    m.dmgByPlayer[pid] = (m.dmgByPlayer[pid] || 0) + dmg;

    const now = Date.now();
    ps._lastDealtAt = now; /* v2.3.1701: "in combat" for the regen gate */

    /* Trained XP, same rule as a swing: the weapon that hit earns it.  Both
       abilities are melee, so both train sword/Melee. */
    if (ps.prog3) this._prog3AwardXp(pid, ps, 'sword', dmg);


    /* ═══ DISPLACEMENT: a shove (bash) or a VORTEX (whirl) ═══
       v2.3.1735, owner: "make it so that all the enemies are brought in
       directly around the character."

       Whirlwind used to push outward like the bash, which fought its own
       fantasy — you spin, and the pack scatters out of the swing you are
       still in the middle of.  It now GATHERS: every target is placed on a
       ring of cfg.pullTo px around the caster, keeping its own bearing so
       the pack keeps its shape and simply closes in.

       Set by ANGLE-AND-RADIUS, not by a velocity impulse, because the ring
       is the point — a pull strong enough to reach a monster at the rim
       (r=60) would overshoot one already at r=20 and fling it out the far
       side.  Placing it removes the overshoot entirely.

       No _kbDebt on a pull.  That debt exists to let a monster walk BACK
       from a shove that exiled it from its attack ring (v2.3.1639); a
       vortex leaves it closer than it started, so charging debt would make
       it drift outward afterwards and undo the gather. */
    if (cfg.pullTo > 0 && m.hp > 0) {
      const ang = Math.atan2((m.y || 0) - (ps.y || 0), (m.x || 0) - (ps.x || 0));
      m.x = (ps.x || 0) + Math.cos(ang) * cfg.pullTo;
      m.y = (ps.y || 0) + Math.sin(ang) * cfg.pullTo;
      const zoneCfg = this._getZoneConfig(zoneId);
      if (zoneCfg) {
        const W = zoneCfg.w * this.TILE;
        const H = zoneCfg.h * this.TILE;
        const pad = this.TILE;
        m.x = Math.max(pad, Math.min(W - pad, m.x));
        m.y = Math.max(pad, Math.min(H - pad, m.y));
      }
    } else if (cfg.knockback > 0 && m.hp > 0) {
      const ang = Math.atan2((m.y || 0) - (ps.y || 0), (m.x || 0) - (ps.x || 0));
      m.x += Math.cos(ang) * cfg.knockback;
      m.y += Math.sin(ang) * cfg.knockback;
      m._kbDebt = Math.min((m._kbDebt || 0) + cfg.knockback, 60);
      const zoneCfg = this._getZoneConfig(zoneId);
      if (zoneCfg) {
        const W = zoneCfg.w * this.TILE;
        const H = zoneCfg.h * this.TILE;
        const pad = this.TILE;
        m.x = Math.max(pad, Math.min(W - pad, m.x));
        m.y = Math.max(pad, Math.min(H - pad, m.y));
      }
    }

    /* ═══ THE STUN — AFTER the shove, deliberately (v2.3.1736) ═══
       Owner: "make the enemy bounce back happen immediately before the stun
       (right now it stuns them and then bounces them back which looks
       awkward)."  Both land in the same tick, so this ordering is not what
       the player was seeing — the awkwardness is on the CLIENT, where the
       shove was interpolated while the stun read instantly (fixed in
       monsterCombat's snap threshold).  The order is still worth flipping:
       it makes the code say what the ability does — shove, then daze — so
       nothing later reads a stun flag while the position is still the
       pre-shove one.

       ccMoveMult in _tickMonsters reads _stunUntil (index.js), so a stunned
       monster neither walks nor swings — and clearing _tgPhase CANCELS a
       wind-up, which is the whole point of bash existing next to v2.3.1730's
       telegraphs.  atkCd moves too so the stun does not simply bank a swing
       that lands the instant it ends. */
    if (cfg.stunMs > 0) {
      m._stunUntil = Math.max(m._stunUntil || 0, now + cfg.stunMs);
      m.atkCd = Math.max(m.atkCd || 0, now + cfg.stunMs);
      m._attackingUntil = 0;
      if (m._tgPhase) {
        m._tgPhase = null; m._tgUntil = 0; m._tgAim = null; m._tgTarget = null;
        m._tgNextAt = now + cfg.stunMs;
      }
      /* v2.3.2215: ...and a basic swing's wind-up, for the same reason the
         telegraph is cancelled — a stun that let the pending swing land
         anyway would stop the animation without stopping the hit. */
      if (m._bwUntil) { m._bwUntil = 0; m._bwTarget = null; m._bwKind = null; }
    }

    /* Sticky aggro, exactly as a swing does it — hitting something has to
       pull it onto you or the ability is a way to farm without consequence. */
    m._aggroOverrideTarget = pid;
    m._aggroOverrideUntil = now + 10000;

    this._markMonsterDirty(zoneId, m.id);
    this.eventBuffer.push({
      type: 'monster_hit',
      payload: {
        monsterId: m.id, zone: zoneId, dmg, isCrit: rolled.isCrit,
        attackerId: pid, ability: kind,
        hpPct: Math.max(0, m.hp / m.maxHp),
      },
    });
    /* slot 'melee': both abilities are swung with the melee arm, so a kill
       pays melee lifesteal like any other melee kill (_applyMeleeLifesteal). */
    if (m.hp <= 0) this._resolveMonsterKill(zoneId, m, pid, ps, 'melee');
    return true;
  },

  /* ═══ v2.3.2361: THE CONTEXTUAL LUNGE'S DAMAGE LEG ═══
     Called from _handleAbilityUse (index.js) AFTER the pool has been charged,
     so a spammer with an empty bar is short-circuited before any monster work.
     Returns true when the monster took damage.  See the LUNGE block above for
     why this is not a STAM_ABILITIES row.

     THE DECLARED TARGET IS REQUIRED, AND THAT IS THE DEPLOY-ORDER MECHANISM.
     bash and sworddash fall back to an anonymous 70px radius scan when no
     targetId is named "which is what an older client sends" (v2.3.2252).
     Copying that here would be actively WRONG.  A client from before v2.3.2351
     still applies its OWN lunge damage in a server zone -- that is the bug
     v2.3.2351 fixed -- and it also paints server-rolled own-hits (the
     `payload.ability || S._serverMonsters` branch, gameEvents.js, since
     v2.3.1733/v2.3.2220).  So a worker that landed a lunge for a client which
     had not asked for one would produce TWO numbers over one monster and an HP
     bar that dips and snaps back: exactly the double-numbering v2.3.2350-2352
     spent three versions killing.  Requiring the field makes that state
     unreachable, because only a client new enough to carry the v2.3.2351 gate
     sends it.  Both deploy orders therefore charge one block and show one
     number, and NO caps flag is needed -- the field itself is the handshake.
     ANYONE ADDING A RADIUS FALLBACK "so old clients work too" REOPENS IT.

     Every gate below, and why it is here rather than assumed:
       targetId  the opt-in above.  Compared with String(), never used as a
                 key, so '__proto__' is a string that matches no monster.
       weapon    _computeAttackDamage falls back to a greatsword at tierMult 1
                 for a bare-handed attacker -- the v2.3.1682 "first swing is
                 free" bug in a new costume, and the reason cfg.needs exists.
                 Rejects nothing honest: doLunge already falls back to a plain
                 dodge when !R.weapon.
       harvest   v2.3.2372 -- see the block at the gate itself.  The client
                 refuses an ATTACK mid-harvest and the worker now refuses the
                 lunge's damage leg on the same rule, instead of ending the
                 harvest under a player who is still watching it run.
                 v2.3.2373: read off ps.ex, the LIVE harvest signal stamped by
                 every move packet -- NOT this.extractions, a lazily-swept
                 ledger that outlives a walk-away by ten minutes and so muted
                 the move for ten minutes with it.
       cadence   see LUNGE.cooldownMs.  In-memory scratch, underscore-prefixed
                 and absent from _saveRpg's fixed field list (handoff rule 1 /
                 rule 11), so a deploy re-arms it and no storage key is
                 involved.  A single timestamp, not a client-keyed map, so
                 CLAUDE.md rule 4 does not even arise.
       zone      ps.z, the SERVER's copy of where the player is standing.
                 There is no `zone` on this wire path at all, so v2.3.1628's
                 hole ("a player standing in town kills monsters in any zone,
                 including inside another player's live dungeon instance") is
                 closed by construction rather than by comparison.  this.monsters
                 is Object.create(null) and ps.z passes _validZone on every
                 write path, so '__proto__' is closed on both halves.
       reach     LUNGE.reach (220), floored under this.PVE_MELEE_RANGE and
                 measured from the server's own ps.x/ps.y.  See the LUNGE table
                 for the arithmetic behind 220.  Deliberately NOT sworddash's
                 900 -- that is the distance THAT move closes (the client's
                 DASH_MAX_REACH_PX), while a contextual lunge travels 6px/frame
                 ~= 360px/s and strikes 160ms in, i.e. ~58px.  And no longer the
                 bare 400 either (v2.3.2372): an earlier draft of this list
                 claimed that reusing the melee bound "means the lunge cannot
                 claim a target an ordinary swing could not already claim: the
                 attack model gains no range surface."  That was false.  400 is
                 the tolerance for a client-CLAIMED swing, sized for position
                 lag on top of a swing's real reach -- so borrowing it DID open
                 a range surface: a ~400px melee damage lane on a 175ms floor,
                 which nothing else in the attack model has.  The Math.min
                 leaves 400 as the outer backstop, so this gate can only ever be
                 the tighter of the two.
       damageable  _monsterDamageable -- dead, hp<=0, and v2.3.2221's
                 _invulnUntil phase.  Re-checked inside _abilityStrikeMonster.
       PvP       structurally impossible: the lookup runs over this.monsters
                 only, so a player id matches nothing and the lunge does
                 nothing.  This IS reachable from an unmodified client -- a
                 duel lock (game/duelLock.js) and a tapped player (BroTown.jsx)
                 both write S.lockedTarget with type 'player', and doLunge reads
                 .ref directly rather than through monsterLock -- so it is a
                 real path, not a hypothetical, and it fails closed.  No PvP
                 branch: PvP has exactly one door, _resolvePvPAttack behind
                 _pvpAllowed (handoff rule 17).
       ceiling   inside _abilityStrikeMonster: _maxDmgForAttacker on a roll that
                 is 0.6 of an ordinary melee roll.  Needs no new headroom -- the
                 module header's ANTICHEAT LOCKSTEP argument, and combat.js's
                 comboBoost comment has named "lunge mult" since before this
                 was true. */
  _lungeStrike(session, ps, targetId) {
    if (!session || !session.id || !ps) return false;
    if (targetId === undefined || targetId === null || targetId === '') return false;
    if (!ps.weapon) return false;
    /* ═══ v2.3.2372: A HARVEST REFUSES THE LUNGE, NOT THE OTHER WAY ROUND ═══
       An earlier draft called _endExtraction on the strike instead, on the
       v2.3.1704 rule that swinging ends an extraction and a landed lunge is a
       swing.  Server-side that is true, and it made the two halves disagree.
       The client refuses an ATTACK mid-harvest -- playerActions.js opens both
       swingAttack and specialAttack with `if (S._extraction) return;` -- but
       nothing on the dodge path does, and the desktop Space-bar route into
       triggerContextualDodge has no _extraction gate at all.  So an honest
       desktop player could lunge mid-harvest and silently lose the harvest,
       with no feedback: their client is still painting the extraction it
       believes it has.
       The lunge now plays by the rule the client already applies to the other
       two attacks.  It closes v2.3.1704's hole HARDER than _endExtraction did
       ("tank a pack for free while still attacking" is unreachable if you
       cannot attack at all), and it is a cheap refusal ahead of the cadence
       stamp -- exactly like the invulnerable case -- so a refused lunge burns
       no cadence.  The roll, the i-frames and the stamina block are the
       client's and are untouched; only the damage leg is refused.

       ═══ v2.3.2373: ...AND IT READS THE LIVE SIGNAL, NOT THE LEDGER ═══
       v2.3.2372 gated on `this.extractions[session.id]` and called that map
       "the server's exact mirror of the client's S._extraction".  IT IS NOT,
       and gathering.js says so in as many words (the note inside
       _extractionShielded): there is no extraction_cancel message type
       anywhere in this repo, so a player who taps a node and walks away leaves
       that record in place until the LAZY sweep at EXTRACTION_TIMEOUT_MS --
       ten minutes (index.js, whose own comment reads "walk-away cancel is
       silent").  For those ten minutes every lunge silently dealt nothing: no
       damage, no ability_rejected, and the stamina block charged anyway.  The
       _endExtraction draft self-healed that by deleting the record on the
       strike; the gate that replaced it did not, so a bookkeeping map became a
       ten-minute mute on the move this whole PR exists to make work.

       ps.ex IS the live signal, and the true mirror: movement.js stamps it
       from every move packet and clears it on the very edge the client's own
       harvest ends (BroTown.jsx derives _exCode from S._extraction's
       waiting/ready status, and _exChanged forces the packet that carries the
       null).  gathering.js's own list calls it "ps.ex went null -- THE FAST
       ONE", null "within one move throttle (~22 ms) of EVERY client-side
       cancel".  So an ABANDONED harvest stops refusing on the next packet,
       while an ACTIVE one still refuses -- which is what "the rule the client
       applies to its own attacks" actually means.  It also now covers cooking and
       firemaking, which the extraction record never held (v2.3.1765) and which
       the client's own `if (S._extraction) return;` does.

       CHOSEN OVER this._extractionShielded(session.id, now), the other
       candidate.  That predicate is strictly NARROWER -- it reads ps.ex first,
       then demands a live node, a matching zone, a drift range and a 120s
       ceiling -- and those extra clauses are anticheat bounds on a DAMAGE
       SHIELD, not answers to "is this player harvesting".  Binding the refusal
       to them would make the lunge quietly start landing mid-harvest at
       t=120s, or the instant a node despawned under a fishing spot: the same
       two-halves-disagree bug in a subtler form.  It is also a linear node-list
       scan per lunge on a 175ms floor, where this is a field read.
       Client-supplied, and harmless in this direction: forging `ex` only
       refuses your own damage.  It does not reopen v2.3.1704's hole either --
       holding `ex` up forever is precisely what keeps _extractionShielded
       true, and now you cannot lunge while you do it. */
    /* v2.3.2374: ...EXCEPT FIREMAKING.  BroTown.jsx builds this code as
       `S._firemaking ? 'fire' : <_exSkill-derived>` and only the second half
       requires S._extraction -- so the client's own `if (S._extraction) return;`
       does NOT refuse a swing while a fire burns, and a bare `if (ps.ex)` had
       the server refusing a lunge the client was happy to throw.  Two halves
       disagreeing is the whole failure this gate exists to prevent, so 'fire'
       is excluded by name rather than by a broader predicate. */
    if (ps.ex && ps.ex !== 'fire') return false;
    const now = Date.now();
    if (now < (ps._lungeAt || 0)) return false;
    const zone = ps.z;
    const monsters = (zone && this.monsters[zone]) || [];
    const want = String(targetId);
    let target = null;
    for (const m of monsters) { if (String(m.id) === want) { target = m; break; } }
    if (!target) return false;
    if (!this._monsterDamageable(target, now)) return false;
    const dx = (target.x || 0) - (ps.x || 0);
    const dy = (target.y || 0) - (ps.y || 0);
    const reach = Math.min(this.PVE_MELEE_RANGE, LUNGE.reach);
    if (dx * dx + dy * dy > reach * reach) return false;

    ps._lungeAt = now + LUNGE.cooldownMs;
    const hit = this._abilityStrikeMonster(zone, target, session.id, ps, 'lunge', LUNGE);
    /* The element, from the server's OWN equipped weapon -- nothing about it
       rides the wire.  This is the one thing _abilityStrikeMonster does not do
       and the client-authoritative path does (dodge.js applyStatus), so
       without it the two lunges would apply different effects.  Status only,
       no collision resolve: see _applyWeaponElementStatus. */
    /* `ps.weapon &&` even though the gate above already proved it: a throw here
       is a throw inside the DO's message handler, and the mutation run showed
       that removing the gate turned a clean refusal into a crash rather than a
       no-op.  Cheap insurance against a future edit that moves the gate. */
    if (hit) this._applyWeaponElementStatus(target, ps.weapon && ps.weapon.element1, session.id, ps, now);
    return hit;
  },

  /* ═══ MILESTONE GRANTS (the non-ability rungs) ═══
     Called on every trained level-up AND once at join adoption, so a
     character who levelled past a milestone while this code did not exist
     still receives it (retroactive by design — the alternative is telling
     an existing level-40 player their level 5 reward is not for them).
     `ms` is the highest level already paid; it lives INSIDE ps.prog3, which
     _saveRpg persists wholesale, so this adds no field to the rpg blob's
     fixed list (handoff rule 1 / TRAPS #2) and no new storage key. */
  _prog3GrantMilestones(playerId, ps) {
    const p3 = ps && ps.prog3;
    if (!p3) return 0;
    const level = this._prog3CharLevel(ps);
    const paidThrough = Math.max(0, Math.floor(Number(p3.ms) || 0));
    if (level <= paidThrough) return 0;
    const owed = milestonePointsThrough(level) - milestonePointsThrough(paidThrough);
    p3.ms = level;
    if (owed > 0) p3.pool = Math.max(0, Math.floor(Number(p3.pool) || 0)) + owed;
    /* Crossing 10 changes max stamina, so re-derive the pools either way. */
    this._prog3Recompute(ps);
    return owed;
  },

  /* What the client needs to draw the ladder: which abilities are live for
     this player right now.  Rides on player_state (persistence.js) so the
     buttons appear the moment the level-up lands, with no extra event and
     no client-side level maths that could disagree with the referee. */
  _abilityUnlockList(ps) {
    const out = [];
    for (const kind of Object.keys(STAM_ABILITIES)) {
      if (this._abilityUnlocked(ps, kind)) out.push(kind);
    }
    return out;
  },
};

/* Re-export so a caller that already imports this module can price a cost
   without reaching into the table (and so the mirror test has one import). */
export function abilityStaminaCost(ps, kind) {
  /* v2.3.2302: takes the PLAYER now, not a bare maxStamina -- the cost needs
     the block count as well as the pool, and passing both separately is how
     the two halves drift apart. */
  const cfg = Object.prototype.hasOwnProperty.call(STAM_ABILITIES, kind) ? STAM_ABILITIES[kind] : null;
  if (!cfg) return 0;
  return cfg.blocks > 0 ? cfg.blocks * blockSize(ps, 'stamina') : 0;
}

/* Kept honest by server/test/abilities.test.mjs: the ladder must never name
   an ability that does not exist in the table. */
export function milestoneAbilityLevels() {
  const out = {};
  for (const [lvl, m] of Object.entries(MILESTONES)) if (m.kind) out[m.kind] = Number(lvl);
  return out;
}
