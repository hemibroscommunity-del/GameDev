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
    staminaPct: 0.10,
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
    staminaPct: 0.30,     /* of maxStamina */
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
    minLevel: 8,          /* MILESTONES[8] */
    staminaPct: 0.40,
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
    /* v2.3.1738: 8 -> 16 with the radius.  Still bounded — the cap exists so
       one cast cannot walk an unbounded list — but 8 would have quietly
       dropped half a swarm inside the new reach, which is exactly the "it has
       virtually no effect" complaint in a new form. */
    maxTargets: 16,
  },
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
  8:  { kind: 'whirl', label: 'Whirlwind' },
  10: { stamMult: 1.25, label: 'Second Wind' },
};

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
       takes this branch.  Whirlwind still carries 8 and still gates -- the
       ladder gates per rung, it just no longer has a rung at 4. */
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

    const maxStam = ps.maxStamina || 100;
    const cost = Math.ceil(maxStam * cfg.staminaPct);
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
export function abilityStaminaCost(maxStamina, kind) {
  const cfg = Object.prototype.hasOwnProperty.call(STAM_ABILITIES, kind) ? STAM_ABILITIES[kind] : null;
  if (!cfg) return 0;
  return Math.ceil((maxStamina || 100) * cfg.staminaPct);
}

/* Kept honest by server/test/abilities.test.mjs: the ladder must never name
   an ability that does not exist in the table. */
export function milestoneAbilityLevels() {
  const out = {};
  for (const [lvl, m] of Object.entries(MILESTONES)) if (m.kind) out[m.kind] = Number(lvl);
  return out;
}
