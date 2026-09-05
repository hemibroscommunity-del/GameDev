/* ═══ v2.3.1734: ELEMENT BURST — COMBAT-OVERHAUL-PLAN PR 6 ═══
 *
 * Owner, after judging: combat is "your base attacks from holding down the
 * auto attack, spam swipe special attacks until your mana runs out, then
 * swipe again as soon as it slowly rises."  Two buttons, one of which is a
 * timer.  The plan's answer for the elemental half of the kit is a second
 * mana spender that does something the special does not: a short-range
 * nova that puts your weapon's ELEMENT on everything around you.
 *
 * WHAT IT IS
 *   - Unlocks at character level 6 and needs the equipped weapon to carry
 *     `element1`.  That second gate is the interesting one: only ENCHANTED
 *     weapons have an element, so the ability is Enchant-gated by
 *     construction with no new gating code and no new gating concept to
 *     explain to a player.
 *   - 25 mana (the same pool and the same number as a special, deliberately
 *     — see PROG3.SPECIAL_MANA_COST), 3 s cooldown, radius 70, 1.5x a
 *     normal auto-attack roll per monster caught.
 *   - Applies the element's status to everything it hits.
 *
 * IT IS A SETUP, NOT A DETONATOR — and that is the design, not a shortcut.
 * The burst deliberately does NOT run resolveElementCollision: it APPLIES
 * the status and leaves your ordinary swings to detonate it.  Two reasons.
 * (1) A nova that detonated a collision on every monster in the radius
 * would be the single biggest damage button in the game by a wide margin,
 * on a 3 s cooldown.  (2) The interesting play is the loop: burst to soak /
 * chill / burn the pack, then auto-attack through it and watch every hit
 * pop.  Water's Soak status has never done anything BUT be a collision
 * setup, and this is the ability that finally gives a reason to apply it.
 *
 * TRUST POSTURE.  Every gate is checked from SERVER state: the character
 * level from ps.prog3 (server-owned), the element from the server's own
 * copy of the equipped weapon (ps.weapon/rangedWeapon/staffWeapon, written
 * only by the equip path), the mana from ps.mana (server is the sole
 * writer), the cooldown from an in-memory stamp.  The client's button is a
 * DISPLAY gate that shows the player what the server will already allow;
 * deleting it in devtools buys nothing.  The wire payload carries no
 * numbers at all — not a damage claim, not a target list, not a position.
 * The server picks the targets from its own positions.
 *
 * ANTICHEAT LOCKSTEP (the v2.3.1451 rule).  The burst rolls through
 * _computeAttackDamage with isSpecial FALSE — the ordinary
 * auto-attack roll — and then multiplies by BURST_DMG_MULT and clamps to
 * _maxDmgForAttacker(ps, false), the ordinary auto-attack ceiling.  It fits
 * inside that ceiling with room to spare and the fit is arithmetic, not
 * luck: the ceiling multiplies the weapon base by crit (1.5) x comboBoost
 * (5) = 7.5x, while the roll's worst case multiplies it by variance (1.5,
 * staff) x volatile (1.3) x damage buff (1.2) x crit (1.5) x amulet elemDmg
 * (1.105) x BURST (1.5) = 5.82x.  burst.test.mjs asserts it over thousands
 * of rolls with every multiplier switched on, so the day someone raises
 * BURST_DMG_MULT past the headroom the suite says so instead of production
 * silently clamping every burst to the cap.
 *
 * WIRE.  Client -> server `element_burst` (empty payload; needs a switch
 * case in index.js, this handler, AND a channelShim.send allowlist line or
 * it never leaves the browser — TRAPS #18).  Server -> client
 * `element_nova` for the ring + the status the client paints locally, and
 * an ordinary `monster_hit` per target (with `burst: true` so the caster's
 * own client knows to draw a popup — server-rolled damage has no local
 * prediction, the same reason the Thorns reflect needed that branch).
 * `element_nova` is in PRIVILEGED_EVENTS; the client->server name is
 * different from the server->client name ON PURPOSE so the two directions
 * can never be confused for each other.
 *
 * DEPLOY ORDER.  caps.elemBurst gates the client's button and its send.
 * Against an old worker the flag is absent, the button never appears, and
 * nothing is sent; against a new worker an old client simply never uses
 * the ability.  Safe in both directions (handoff rule 19).
 */

import { PROG3 } from './prog3.js';
import { ELEMENT_STATUS, applyElementStatus, elemAttackStat } from './elemental.js'; // v2.3.2199: + elem resolver

/* The ability name the client's ability_rejected handler switches on.
   A CONSTANT rather than an inline literal on purpose: wire-audit
   extracts every `type: '<literal>'` in server/src as a server-EMITTED
   event type, and this one is a payload FIELD, not an event type — an
   inline literal here would demand a bogus 'burst' entry in
   PRIVILEGED_EVENTS and quietly teach the next reader that the audit
   is noise. */
export const BURST_ABILITY_KIND = 'burst';

export const burstMethods = {
  /* Which weapon is actually in hand, server-side.  Mirrors the slot
     resolution in _computeAttackDamage / _handleMonsterDamage — the burst
     must fire the element of the weapon the damage roll will use, or the
     status and the damage disagree about what is being swung. */
  _burstActiveWeapon(ps) {
    const slot = (ps && ps.activeSlot) || 'melee';
    if (slot === 'ranged') return { slot, w: ps.rangedWeapon };
    if (slot === 'staff') return { slot, w: ps.staffWeapon };
    return { slot: 'melee', w: ps && ps.weapon };
  },

  /* v2.3.2298: one block, exactly like the special attack. Owner: "all special
     attacks will cost one block", and a block is a fifth of the pool. It was a
     flat PROG3.BURST_MANA_COST (25) beside the special's flat 25; both are a
     fifth now, so "a special costs a block" is true of EVERY special rather
     than of most of them -- and the readout that shows five blocks does not
     have to carve out an exception for this one.
     Reads maxMana off the SERVER's playerState, which is its only writer, so a
     client that inflates its own pool buys nothing. A METHOD on this mixin
     rather than a bare function: everything in this file is one object literal
     spread onto the room, and a `function` declaration in the middle of it is
     a syntax error rather than a helper. */
  _burstCost(ps) {
    return Math.floor(((ps && ps.maxMana) || 100) / 5);
  },

  /* The four gates, in one place so the handler and the tests read the same
     decision.  Returns null when the cast is legal, else a machine-readable
     reason the client turns into a one-line popup ("Element Burst needs an
     enchanted weapon"). */
  _burstRefusal(ps, now) {
    if (!ps) return 'no_player';
    if (ps.dying || ps.dead || ps.disconnected) return 'dead';
    /* Character level.  prog3 players carry the server-owned Σ-trained
       level; a legacy blob's ps.level is the old stat-sum, which is the
       number that player's own UI shows, so gate on the same one either
       way rather than locking legacy players out of the ability entirely. */
    const lvl = ps.prog3 ? this._prog3CharLevel(ps) : (ps.level || 0);
    if (lvl < PROG3.BURST_MIN_CHAR_LEVEL) return 'level';
    const { w } = this._burstActiveWeapon(ps);
    if (!w) return 'no_weapon';
    /* THE ENCHANT GATE.  element1 is written by the enchant/forge path and
       sanitized on load, so this is server truth about server state. */
    if (!w.element1 || !ELEMENT_STATUS[w.element1]) return 'no_element';
    /* v2.3.2298: one block, like every other special -- see _abilityCost. */
    if ((ps.mana || 0) < this._burstCost(ps)) return 'mana';
    /* In-memory cooldown (handoff rule 11: combat scratch is not persisted
       — a deploy just hands everyone their burst back, which is the right
       failure direction for a 3 s timer). */
    if (ps._burstCdUntil && now < ps._burstCdUntil) return 'cooldown';
    return null;
  },

  /* ═══ element_burst handler ═══ */
  _handleElementBurst(session) {
    if (!session || !session.id) return;
    const ps = this.playerState[session.id];
    const ws = this._wsBySessionId(session.id);
    const now = Date.now();

    const refusal = this._burstRefusal(ps, now);
    if (refusal) {
      /* Reuse ability_rejected — it is already privileged, already has the
         shape (type/pool/cost/have), and v2.3.1716's lesson was that a
         refusal which says nothing is indistinguishable from a broken
         game.  `reason` is additive; an old client ignores it. */
      if (ws) {
        try {
          ws.send(JSON.stringify({
            type: 'ability_rejected',
            payload: {
              type: BURST_ABILITY_KIND, pool: 'mana', reason: refusal,
              cost: this._burstCost(ps), have: (ps && ps.mana) || 0,
            },
          }));
        } catch (e) {}
      }
      return;
    }

    const { slot, w } = this._burstActiveWeapon(ps);
    const element = w.element1;
    const zone = ps.z;

    /* Spend + stamp BEFORE resolving, so an exception in the damage loop
       cannot leave a free cast behind. */
    ps.mana = Math.max(0, (ps.mana || 0) - this._burstCost(ps));
    ps._burstCdUntil = now + PROG3.BURST_CD_MS;
    /* v2.3.1704 parity with _handleMonsterDamage: casting ends an
       extraction, so a burst can't be fired from behind the harvest
       shield. */
    this._endExtraction(session.id);
    /* The other half of "in combat" (v2.3.1701) — a burst is damage DEALT,
       so it must suppress out-of-combat regen exactly like a swing. */
    ps._lastDealtAt = now;

    const monsters = this.monsters[zone] || [];
    const r2 = PROG3.BURST_RADIUS * PROG3.BURST_RADIUS;
    const targets = [];
    let dealt = 0;

    for (const m of monsters) {
      if (!m || !m.alive || m.hp <= 0) continue;
      if (typeof m.x !== 'number' || typeof m.y !== 'number') continue;
      const dx = m.x - ps.x;
      const dy = m.y - ps.y;
      if (dx * dx + dy * dy > r2) continue;

      /* The ordinary auto-attack roll, then the burst multiplier, then the
         ordinary auto-attack ceiling.  See the header for why 1.5x fits
         inside that ceiling by arithmetic rather than by luck. */
      const rolled = this._computeAttackDamage(ps, slot, false);
      const cap = this._maxDmgForAttacker(ps, false);
      let dmg = Math.max(1, Math.min(cap, Math.round(rolled.dmg * PROG3.BURST_DMG_MULT)));
      /* v2.3.1734: FRACTURE finally does something (see elemental.js
         fractureDmgMult).  Monster-side multiplier, applied AFTER the
         attacker ceiling on purpose — the ceiling bounds what the ATTACKER
         may claim, and fracture is a property of the target that the
         server put there itself.  Exactly the posture collision damage has
         had since v2.3.1114 (it bypasses dmgCap and carries its own
         COLLISION_BURST_CAP instead). */
      dmg = Math.max(1, Math.round(dmg * this._fractureDmgMult(m)));

      /* Status BEFORE the damage, so a monster the burst kills has already
         shown the element that killed it (matches the client's hit order
         in monsterCombat.js) and so a lethal burst still reads correctly
         in the nova payload. */
      applyElementStatus(m, element, session.id, elemAttackStat(ps, 'power'), now, this._attuneMult(ps)); // v2.3.2199: prog3 snapshots `elem`
      targets.push(m.id);

      /* Damage through the shared pipeline: overkill clamp, contribution
         credit, dirty mark, monster_hit, kill resolution.  _applyMonsterDot
         is that pipeline (v2.3.1569 extracted it precisely so a second
         damage SOURCE would not grow a second copy of kill credit); `tag`
         rides through to the monster_hit payload so the caster's client can
         draw its own popup. */
      dealt += this._applyMonsterDot(zone, m, dmg, session.id, null, { burst: true });
    }

    /* Trained XP, same rule a swing follows: the weapon that fired it earns
       it, priced off the CREDITED damage (v2.3.1710 / §9-A). */
    if (ps.prog3 && dealt > 0) {
      const cat = slot === 'ranged' ? 'bow' : slot === 'staff' ? 'staff' : 'sword';
      this._prog3AwardXp(session.id, ps, cat, dealt);
    }

    /* The visual.  Broadcast (everyone in the zone sees the nova) and
       display-only — every point of damage already rode monster_hit.
       Carries the target ids so each client can paint the status locally:
       the client's own status map is where the ambient element particles
       and the pip row above the monster come from, and the server does not
       otherwise sync statuses. */
    this.eventBuffer.push({
      type: 'element_nova',
      payload: {
        id: session.id, zone, x: ps.x, y: ps.y,
        element, status: ELEMENT_STATUS[element],
        r: PROG3.BURST_RADIUS, targets,
      },
    });

    /* v2.3.1619b: mana is the only durable change -> coalesced write, the
       same posture _handleAbilityUse takes. */
    this._saveRpgPools(session.id, ps);
    if (ws) this._sendPlayerState(ws, session.id);
  },
};
