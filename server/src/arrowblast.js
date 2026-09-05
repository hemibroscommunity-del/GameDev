/* ═══ v2.3.2279: THE BOW SPECIAL'S FINAL SEND-OFF ═══
 *
 * Owner: "Bow still feels a bit underpowered.  I want to add something to the
 * special attack.  Add this explosion once the arrow is done adding tick
 * damage for the final send off.  Make the explosion a large area about the
 * size of the perimeter that a melee character can auto target a monster.
 * Make it about 3x the damage of the base damage bow attack for any caught in
 * the blast radius."
 *
 * ── WHY THIS NEEDS A MESSAGE AT ALL ──
 * The bow special is not an entry in the abilities table; it is a weapon-slot
 * branch in the CLIENT's specialAttack(), and the arrow it plants is a plain
 * object in S.arrows that the worker has never modelled.  Its "tick damage" is
 * a 500ms client timer that sends ordinary monster_damage for the worker to
 * roll -- client-TIMED, server-APPLIED.  So there is no server-side DoT whose
 * end this could hook: the moment the owner is describing exists only in the
 * browser, and the browser has to say when it arrives.
 *
 * That makes this the FIRST damage message on this worker that asks it to
 * accept a COORDINATE.  Every other AoE centres on ps.x/ps.y, which the server
 * owns.  Unbounded, this would be a 220px 3x nova anywhere in the zone on
 * demand, so the three bounds below are load-bearing rather than polish:
 * the attacker gates, the flight envelope, and the cooldown.
 *
 * ── THE DAMAGE IS THE BOW SPECIAL'S OWN ROLL, WHICH IS ALREADY 3x ──
 * combat.js: `if (isSpecial) base *= (type === 'staff' ? 2.0 : 3.0)`, applied
 * after variance and after the banked flat -- so _computeAttackDamage(ps,
 * 'ranged', true) IS three times the same call with false, exactly, not
 * approximately.  Rolling it that way rather than multiplying a normal hit by
 * three is what keeps this inside an anticheat ceiling that already exists:
 * it is byte-for-byte the roll and the cap a normal bow special passes every
 * time one is thrown.  Multiplying the ORDINARY roll by 3 and clamping with
 * the ordinary ceiling would silently clip real hits, because that ceiling is
 * sized for a normal swing and a 3x roll can reach ~17x base once volatile,
 * a Fury Tonic and a crit stack.
 * It also inherits crit for free, which is the right read for a send-off.
 *
 * ── AND IT PULLS AGGRO ──
 * _applyMonsterDot does not stamp aggro (it is written for status ticks, which
 * have no attacker standing in front of them).  A 220px blast that hurts a
 * whole pack without pulling any of it would be a way to farm without
 * consequence, so the stamp is copied from _abilityStrikeMonster deliberately.
 */
export const ARROW_BLAST = {
  /* MIRROR-PINNED: src/data/gameSystems.js TARGET_PERIMETER_PX (220) -- the
     melee auto-target perimeter the owner sized this by, and the first time
     that constant has needed a server twin.  Retune both together or the ring
     the client paints is not the ring the worker hits.  For scale: Element
     Burst is 70 and Whirlwind is 240, so this is genuinely large -- a 440px
     circle, most of a phone screen. */
  RADIUS: 220,
  /* A bound on the loop, not on the fantasy: one blast must not be able to
     walk an unbounded monster list.  Whirlwind's cap, for the same reason. */
  MAX_TARGETS: 16,
  /* The client's own swipe cooldown (playerActions.js) is 1500ms, so a legit
     client can never beat this; a modified one is held to the same pace. */
  CD_MS: 1500,
  /* How far from the player the claimed blast point may be.  The bow's plant
     reach is 675px x the 2.0 bowRangeMult cap, the number combat.js already
     reasons about for ranged hits, plus a little slack for the flight the
     worker did not simulate. */
  MAX_REACH: 1400,
};

export const arrowBlastMethods = {
  /* Every refusal in one place so the handler and the tests read the same
     list, the shape burst.js uses.  Returns a reason string, or null to
     proceed.  Refusals are SILENT: unlike a mana-gated ability there is
     nothing for the player to do differently, and a message would only tell a
     modified client which bound it hit. */
  _arrowBlastRefusal(ps, zone, x, y, now) {
    if (!ps) return 'no-player';
    if (ps.dead || ps.dying || ps.disconnected) return 'not-alive';
    if (ps.z !== zone) return 'wrong-zone';
    if (typeof x !== 'number' || typeof y !== 'number'
        || !Number.isFinite(x) || !Number.isFinite(y)) return 'bad-point';
    if (ps._arrowBlastCdUntil && now < ps._arrowBlastCdUntil) return 'cooldown';
    const dx = x - ps.x, dy = y - ps.y;
    if (dx * dx + dy * dy > ARROW_BLAST.MAX_REACH * ARROW_BLAST.MAX_REACH) return 'out-of-reach';
    /* ═══ OWNING A BOW, NOT "HAVING IT SELECTED" ═══
       The first cut also required `ps.activeSlot === 'ranged'` and it was
       wrong -- caught by the refusal counter within one run ({not-a-bow: 1} on
       a character who was visibly holding a bow).
       ps.activeSlot is NOT a reliable statement about what is in hand: the
       worker only learns it from `set_active_slot`, which combat.js:318-323
       records the desktop slot-select UI skipping outright, and _handleMonsterDamage
       therefore trusts the slot the CLIENT names over it (combat.js:726).  A
       gate stricter than the damage path is not extra safety, it is a new way
       for a legitimate blast to vanish silently -- the very failure this
       feature is built to avoid.
       And it bought nothing: a client that wanted to forge one would send
       set_active_slot first.  What actually matters is that you OWN a bow, so
       that is what is checked, and the damage below is rolled with an explicit
       'ranged' rather than off whatever slot the worker last heard about. */
    if (!ps.rangedWeapon) return 'no-bow';
    return null;
  },

  /* The operator view's read side.  Every gate above is a silent `return` --
     deliberately, since a message would only tell a modified client which
     bound it hit -- and a silent refusal is exactly the shape that cost days
     three times over on the harvest handshake.  So the reasons are counted and
     readable HERE, where only the owner's key reaches. */
  _arrowBlastRejectsFor(playerId) {
    return (this._arrowBlastRejects && this._arrowBlastRejects[playerId]) || null;
  },

  /* Client says: the special arrow has finished its damage-over-time at
     (x, y).  Payload carries intent and a position, never a target list and
     never a number -- the worker picks who is caught and rolls what they
     take. */
  _handleArrowBlast(session, payload) {
    if (!session || !session.id) return;
    const ps = this.playerState[session.id];
    const now = Date.now();
    const zone = payload && payload.zone;
    const x = payload && payload.x;
    const y = payload && payload.y;

    const refusal = this._arrowBlastRefusal(ps, zone, x, y, now);
    if (refusal) {
      /* Counted rather than answered, so an operator can see a client that
         keeps missing a bound (the posture _extractionRejects takes). */
      if (!this._arrowBlastRejects) this._arrowBlastRejects = Object.create(null);
      const byId = this._arrowBlastRejects;
      if (!byId[session.id]) byId[session.id] = Object.create(null);
      byId[session.id][refusal] = (byId[session.id][refusal] || 0) + 1;
      byId[session.id].last = refusal;
      return;
    }

    ps._arrowBlastCdUntil = now + ARROW_BLAST.CD_MS;
    /* Parity with every other damage source: firing ends an extraction (so a
       blast cannot be thrown from behind the harvest shield) and counts as
       dealing damage for the out-of-combat regen suppression. */
    this._endExtraction(session.id);
    ps._lastDealtAt = now;

    const monsters = this.monsters[zone] || [];
    const r2 = ARROW_BLAST.RADIUS * ARROW_BLAST.RADIUS;
    const targets = [];
    let dealt = 0;

    for (const m of monsters) {
      if (targets.length >= ARROW_BLAST.MAX_TARGETS) break;
      if (!m || !this._monsterDamageable(m)) continue;
      if (typeof m.x !== 'number' || typeof m.y !== 'number') continue;
      /* Measured from the ARROW, not from the player -- the whole point is
         that the blast is where the shot landed. */
      const mdx = m.x - x, mdy = m.y - y;
      if (mdx * mdx + mdy * mdy > r2) continue;

      const rolled = this._computeAttackDamage(ps, 'ranged', true);
      const cap = this._maxDmgForAttacker(ps, true);
      let dmg = Math.max(1, Math.min(cap, Math.round(rolled.dmg)));
      /* Monster-side, after the attacker ceiling: the ceiling bounds what the
         ATTACKER may claim; fracture is a property of the target the server
         put there itself.  Same posture as burst.js. */
      dmg = Math.max(1, Math.round(dmg * this._fractureDmgMult(m)));

      /* Sticky aggro, copied from _abilityStrikeMonster: hitting something
         has to pull it onto you, or this is farming without consequence. */
      m._aggroOverrideTarget = session.id;
      m._aggroOverrideUntil = now + 10000;

      targets.push(m.id);
      dealt += this._applyMonsterDot(zone, m, dmg, session.id, null,
        { burst: true, isCrit: rolled.isCrit });
    }

    /* Trained XP on the weapon that fired it, priced off CREDITED damage --
       the rule a swing and a burst both follow. */
    if (ps.prog3 && dealt > 0) this._prog3AwardXp(session.id, ps, 'bow', dealt);

    /* The visual, for EVERYONE in the zone.  Display-only: every point of
       damage already rode monster_hit, so a client that ignores this still
       has a correct game -- it just does not see the fireball.  Broadcast
       rather than sent to the shooter, because the owner's standing complaint
       is that peers miss animations their own screen shows. */
    this.eventBuffer.push({
      /* NAMED DIFFERENTLY FROM THE INBOUND MESSAGE ON PURPOSE, exactly as
         element_burst (in) / element_nova (out) are.  The outbound one is
         server-emitted and therefore belongs on the PRIVILEGED_EVENTS
         deny-list; the inbound one must NOT, or the feature denies itself.
         One name for both would work today -- the switch case returns before
         the relay is reached -- and would be a trap for whoever touches the
         relay next. */
      type: 'arrow_boom',
      payload: { id: session.id, zone, x, y, r: ARROW_BLAST.RADIUS, targets },
    });
  },
};
