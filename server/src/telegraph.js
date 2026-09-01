/* ═══ v2.3.1730: TELEGRAPHED ATTACKS FOR STANDARD-ZONE MONSTERS ═══
 *
 * Owner, after judging: "Monsters are also 'dumb' in that they just walk
 * over to you and attack or shoot projectiles.  There's no strategy.  No
 * timed blocking, no dodging, etc."
 *
 * They were describing _tickMonsters exactly: chase to 45px, swing every
 * 1500ms, repeat, for every archetype in the game.  The only monsters that
 * ever wound up were dungeon bosses.
 *
 * ARCHITECTURE-HANDOFF Item I names this as the next step in as many words
 * ("telegraph variety ... and standard-zone minibosses"), and it names the
 * seam too: _dungeonTickBossAbilities.  This is that driver's shape lifted
 * for open-world monsters — ready -> telegraph -> execute -> cooldown, with
 * the wind-up freezing the monster through `_attackingUntil`/`atkCd`, the
 * two fields the core AI already honours.  No core-AI fork; the hook in
 * _tickMonsters is one call that returns "I handled this monster".
 *
 * WHY NOT SHARE dungeon.js's DRIVER OUTRIGHT.  It is welded to an instance
 * (`inst.zone`, arena clamping, enrage, the minion cap) and its cast list
 * is a fixed rotation per boss.  Extracting a common core would touch every
 * dungeon test to prove a refactor nobody asked for; this is ~120 lines
 * that reads the same and leaves that suite untouched.  If a third caller
 * ever appears, THEN unify.
 *
 * WHAT MAKES IT FAIR (all four are load-bearing):
 *   1. The wind-up is long and the monster is frozen during it, so the tell
 *      is readable rather than a coin flip.
 *   2. Execute RE-CHECKS the player's position.  Walking or dodging out of
 *      the radius makes the attack whiff, which is what makes movement a
 *      real answer and needs no new i-frame plumbing.
 *   3. Blocking uses the same directional arc as everything else
 *      (_blockArcCovers, v2.3.1726) — face it and it is negated.
 *   4. MAX_HIT_PCT clamps every telegraphed hit to half of max HP BEFORE
 *      mitigation, so a 2x slam can never one-shot a child who was still
 *      reading the word "SLAM".  Same rule, same reason, as the boss kit.
 *
 * FODDER AND SWARM GET NOTHING ON PURPOSE.  They are the monsters a new
 * player meets first and the ones they out-level; free hits have to exist
 * somewhere or the early game becomes homework.  Brutes and stalkers are
 * already the "careful now" archetypes, so they are where a tell pays off.
 *
 *   ── v2.3.1812: FODDER GETS A LIGHT TELL AFTER ALL (owner: "Yes give
 *   fodder a tell").  The paragraph above was right about the risk and
 *   wrong about the cost, and the thing that changed the answer is WHERE
 *   the tell was missing.  Mayor Bro's chain sends a new player through
 *   four zones to learn blocking, and three of them have nothing that
 *   telegraphs: frost is snowmen (deferred, below), meadow and ember are
 *   fodder.  Only sky has a stalker.  So blocking was being TAUGHT in the
 *   exact zones where nothing tells you when to block — the lesson had no
 *   worked example.
 *
 *   What keeps the "free hits" promise intact is the cooldown, not the
 *   absence of a kit.  `lunge` fires once every 9s against a basic swing
 *   every 1.5s, so roughly five of every six fodder attacks are still the
 *   unannounced swing they always were, and the tell is the occasional
 *   punctuation a beginner can practise against.  It also carries NO
 *   damage spike (dmgMult 1.0, where brute is 2.0) — it is a teaching
 *   cue, not a threat.  The long windup (1200ms, the longest kit) is the
 *   other half: a beginner's tell has to be readable at a beginner's
 *   reaction time, so fodder winds up SLOWER than the brute, not faster.
 *
 *   THE TRAP THIS WALKED INTO ONCE.  A first attempt at this failed the
 *   server suite twelve times over on parry/block, because a telegraphed
 *   hit resolves through _telegraphHitPlayer and the basic swing resolves
 *   through _tickMonsters — two paths, and only one of them charged block
 *   stamina.  Giving fodder a kit without closing that gap would have
 *   quietly handed players a free turtle against the very archetype the
 *   stamina cost exists to police.  _telegraphHitPlayer now pays the same
 *   BLOCK_STAMINA_COST and puts the same staminaDrain on the wire; parry
 *   was already wired (v2.3.1731).  The suite pins the parity both ways.
 *
 * SWARM still gets nothing: they arrive several at once, and N simultaneous
 * wind-ups is noise, not a tell.
 *
 * SNOWMAN'S VOLLEY IS DEFERRED, not forgotten: it wants the existing
 * ranged/snowball path (travelMs, aim point, per-projectile block at
 * impact) rather than this melee-shaped resolve, which is a different
 * enough shape to deserve its own change.
 */

import { BLOCK_COSTS_STAMINA, BLOCK_STAMINA_COST } from './data.js';

/* Per-archetype kits.  `radius` is the execute-time hit radius, and it is
   deliberately WIDER than MONSTER_ATTACK_RANGE (45): a telegraphed attack
   you could escape by standing still would teach nothing. */
export const TELEGRAPH = {
  MAX_HIT_PCT: 0.5,       /* mirrors BOSS_ABILITIES.MAX_HIT_PCT — no one-shots */
  CAST_RANGE: 150,        /* start a cast only with the target this close */
  KITS: {
    brute: {
      kind: 'slam', windupMs: 900, cooldownMs: 5000, dmgMult: 2.0, radius: 55,
    },
    stalker: {
      kind: 'pounce', windupMs: 700, cooldownMs: 6000, dmgMult: 1.5, radius: 46,
      leap: 140,          /* px of dash toward the aim point at execute */
    },
    /* v2.3.1812: the beginner's tell.  Slowest wind-up, longest cooldown,
       no damage multiplier — every number here is tuned to teach rather
       than to threaten.  See the header for why the cooldown is the part
       that keeps early-game free hits. */
    fodder: {
      kind: 'lunge', windupMs: 1200, cooldownMs: 9000, dmgMult: 1.0, radius: 50,
    },
  },
};

/* ═══ v2.3.2215: EVERY BASIC ATTACK HAS A WIND-UP ═══
 *
 * Owner: combat feels "floaty".  The telegraphed kits above cover three
 * archetypes on a multi-second cooldown; the ORDINARY swing every monster
 * throws every 1.5s had no anticipation at all -- `attackDist <= range &&
 * now > atkCd` resolved the decision AND the damage inside the same 22ms
 * tick, so a hit arrived with nothing before it.  That instantaneity is
 * most of what "floaty" means from the receiving end: damage out of
 * nowhere cannot be read, blocked on reaction, or learned from.
 *
 * This is the same stamp-then-resolve shape as the kits, deliberately:
 * one state machine, one set of fairness properties (no damage during the
 * wind-up, moving out whiffs, blocking and parrying are evaluated at
 * IMPACT), and one place a future ability can hook.
 *
 * DURATIONS are per archetype and all sit in a band with two hard edges:
 *   - ABOVE PARRY_WINDOW_MS (250), or the parry window would be wider than
 *     the tell and "react in time" would mean nothing.
 *   - BELOW the kits' 700-1200ms, so a signature move still reads as the
 *     bigger event.  A brute's slam must not feel like his jab.
 * Ordered by fantasy inside that band: swarm jabs, brute heaves.
 *
 * THE CYCLE DOES NOT GROW.  atkCd is stamped when the wind-up STARTS, not
 * when it lands, so the wind-up is spent INSIDE the existing 1500ms
 * cadence rather than added to it -- monsters telegraph without losing
 * damage over time.  Getting this backwards would nerf every monster in
 * the game by a third while looking like a pure presentation change.
 *
 * WHIFF_GRACE is the honest half of the trade: the resolve re-measures
 * against where the player is NOW, but through a ring 1.3x the contact
 * range.  At 1.0 every micro-step out of a 45px ring would whiff and
 * monsters would look broken; unbounded, walking away would never work
 * and the tell would be decoration.  1.3 means deliberate kiting escapes
 * and jitter does not.
 */
export const BASIC_WINDUP = {
  WHIFF_GRACE: 1.3,
  THROW_MS: 350,          /* pre-throw cue; the ball's travel time is the rest of the tell */
  MS: {
    swarm: 350,
    snowman: 350,         /* his melee poke; the SNOWBALL uses THROW_MS */
    volatile: 400,
    stalker: 400,
    fodder: 500,
    hexer: 500,
    sentinel: 550,
    brute: 600,
    DEFAULT: 450,
  },
};

export function basicWindupMs(arch) {
  return Object.prototype.hasOwnProperty.call(BASIC_WINDUP.MS, arch)
    ? BASIC_WINDUP.MS[arch]
    : BASIC_WINDUP.MS.DEFAULT;
}

export const telegraphMethods = {
  /* Resolve a wind-up already in flight.  Called UNCONDITIONALLY, before
     target acquisition — deliberately NOT inside the aggro branch, which is
     where the first version of this lived and was wrong: a player who ran
     away mid-cast dropped the monster out of aggro, so this never ran
     again and the monster sat in a pending telegraph forever, primed to
     fire a stale aim point at whoever wandered past next.  The whiff test
     caught it.  A cast therefore remembers its own target (`_tgTarget`)
     rather than borrowing whatever the AI is looking at now.
     Returns TRUE when it owns the monster this tick. */
  _resolveMonsterTelegraph(zoneId, m, now) {
    const kit = TELEGRAPH.KITS[m.arch];
    if (!kit || m._tgPhase !== 'telegraph') return false;
    {
      if (now < (m._tgUntil || 0)) {
        /* Freeze exactly the way the boss driver does: the core AI treats
           _attackingUntil as a movement stop, so the monster plants itself
           for the whole tell instead of walking through it. */
        m._attackingUntil = Math.max(m._attackingUntil || 0, now + 100);
        return true;
      }
      const aim = m._tgAim || { x: m.x, y: m.y };
      const targetId = m._tgTarget;
      m._tgPhase = null;
      m._tgUntil = 0;
      m._tgAim = null;
      m._tgTarget = null;
      m._tgNextAt = now + kit.cooldownMs;
      m.atkCd = now + this.MONSTER_ATTACK_CD;   /* no free basic swing after a cast */
      m._attackingUntil = now + 400;

      if (kit.kind === 'pounce') {
        /* The leap is a teleport-to-contact rather than a per-tick dash:
           the dash belongs to the boss driver's _chargeUntil machinery,
           and borrowing that here would mean owning its arena clamping
           too.  Capped at `leap` so it closes a gap, never crosses a zone. */
        const dx = aim.x - m.x, dy = aim.y - m.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const step = Math.min(kit.leap, d);
        m.x += (dx / d) * step;
        m.y += (dy / d) * step;
        this._markMonsterDirty(zoneId, m.id);
      }

      /* THE WHIFF.  Re-measured at execute against where the player is NOW,
         not where they were when the wind-up started — this single check is
         what makes dodging and walking away work. */
      const ps = targetId ? this.playerState[targetId] : null;
      let hit = false;
      if (ps && !ps.dead && !ps.dying && ps.z === zoneId) {
        const ddx = ps.x - m.x, ddy = ps.y - m.y;
        hit = (ddx * ddx + ddy * ddy) <= kit.radius * kit.radius;
        if (hit) this._telegraphHitPlayer(zoneId, m, targetId, kit);
      }
      this._monsterAbilityEvent(zoneId, m, kit.kind, 'execute', { radius: kit.radius, hit });
      return true;
    }
  },

  /* Start a cast.  Called from inside the aggro branch, where a target and
     its distance are already in hand. */
  _maybeStartTelegraph(zoneId, m, nearest, attackDist, now) {
    const kit = TELEGRAPH.KITS[m.arch];
    if (!kit || m._tgPhase) return false;
    if (now < (m._tgNextAt || 0)) return false;
    if (now <= m.atkCd) return false;              /* respect the basic-swing cadence */
    if (attackDist > TELEGRAPH.CAST_RANGE) return false;
    if (nearest.extracting) return false;          /* harvesters are left alone (v2.3.1690) */

    const ps = this.playerState[nearest.id];
    if (!ps || ps.dead || ps.dying) return false;

    m._tgPhase = 'telegraph';
    m._tgUntil = now + kit.windupMs;
    m._tgAim = { x: ps.x, y: ps.y };              /* proto-ok: fixed-field point */
    m._tgTarget = nearest.id;                     /* the cast owns its target */
    m._attackingUntil = Math.max(m._attackingUntil || 0, now + 100);
    this._monsterAbilityEvent(zoneId, m, kit.kind, 'telegraph', {
      radius: kit.radius, ms: kit.windupMs, ax: Math.round(ps.x), ay: Math.round(ps.y),
    });
    return true;
  },

  /* Display-only notice.  Damage never rides this event — it arrives on the
     authoritative monster_attack, exactly like the boss kit, so an old
     client that ignores this type still takes the right damage and simply
     does not see the warning.  That is what makes it deploy-order safe with
     no caps flag (the monster_projectile precedent). */
  _monsterAbilityEvent(zoneId, m, kind, phase, extra) {
    this.eventBuffer.push({
      type: 'monster_ability',
      payload: {
        zone: zoneId, monsterId: m.id, ability: kind, phase,
        x: Math.round(m.x), y: Math.round(m.y), ...extra,
      },
    });
    this._markMonsterDirty(zoneId, m.id);
  },

  /* One telegraphed hit vs one player.  Mirrors _dungeonBossHitPlayer's
     rails — directional block, no-oneshot clamp before _applyDamage, damage
     tracking, monster_attack emission, save/flush, death check — so these
     abilities are authoritative in exactly the same way the basic swing is.
     No thorns reflect, for the boss kit's reason: the reflect surface stays
     pinned to one per basic swing, and an AoE that also triggered it would
     multiply thorns output per cast. */
  _telegraphHitPlayer(zoneId, m, pid, kit) {
    const ps = this.playerState[pid];
    if (!ps || ps.dead || ps.dying) return 0;
    if (this._blockArcCovers(ps, m.x, m.y)) {
      /* v2.3.1731: parrying a TELEGRAPHED hit is the marquee case — the
         wind-up is exactly the readable cue a timed block wants, so a
         player who waits for the swing instead of turtling through it gets
         the stagger and the stamina back. */
      const nowB = Date.now();
      const parried = this._parryOpen(ps, nowB);
      if (parried) this._applyParry(zoneId, m, pid, ps, nowB);
      /* v2.3.1812: ...and turtling through one COSTS, on the same terms as
         turtling through a basic swing (index.js's block branch).  This was
         missing, and it only stopped mattering because the two archetypes
         that could telegraph were ones a beginner meets late.  Handing
         fodder a kit would have made every early block free — the exact
         infinite turtle BLOCK_COSTS_STAMINA exists to end — so the cost
         moves here rather than the kit being held back.  Same constant,
         same Bulwark discount, same Math.max(1) floor that hardening.test
         pins, same staminaDrain on the wire so the client's "-N⚡" pop
         matches what the server actually charged. */
      const staminaCost = (BLOCK_COSTS_STAMINA && !parried)
        ? Math.max(1, Math.round(BLOCK_STAMINA_COST * this._blockStaminaMult(ps)))
        : 0;
      if (staminaCost > 0 && typeof ps.stamina === 'number') {
        ps.stamina = Math.max(0, ps.stamina - staminaCost);
        this._saveRpgPools(pid, ps);          /* coalesced — see v2.3.1619b */
        this._queuePlayerStateFlush(pid);
      }
      this.eventBuffer.push({
        type: 'monster_attack',
        payload: {
          monsterId: m.id, targetId: pid, dmg: m.dmg, dmgTaken: 0, blocked: true,
          parried: parried || undefined,
          staminaDrain: staminaCost > 0 ? staminaCost : undefined,
          zone: zoneId, attackerX: m.x, attackerY: m.y,
        },
      });
      return 0;
    }
    const raw = Math.min(
      Math.ceil(m.dmg * kit.dmgMult),
      Math.max(1, Math.floor((ps.maxHp || 100) * TELEGRAPH.MAX_HIT_PCT)),
    );
    const res = this._applyDamage(ps, raw, false);
    if (!res.dodged) {
      this._trackMonsterDamage(ps, m.id, res.graced ? (res.dmgIntent || 0) : res.dmgTaken);
    }
    this.eventBuffer.push({
      type: 'monster_attack',
      payload: {
        monsterId: m.id, targetId: pid, dmg: raw, dmgTaken: res.dmgTaken,
        dodged: res.dodged, secondWind: res.secondWind || undefined,
        zone: zoneId, attackerX: m.x, attackerY: m.y,
      },
    });
    this._saveRpgVitals(pid, ps);
    this._queuePlayerStateFlush(pid);
    if (ps.hp <= 0 && !ps.dying) this._handlePlayerDeath(ps, pid, 'monster:' + m.id);
    return res.dmgTaken;
  },
  /* ═══ v2.3.2215: basic-attack wind-up ═══ */

  /* The melee contact ring, in ONE place.  The tick loop and the wind-up
     resolve must measure with the same geometry or a swing could start
     from inside a ring it then whiffs against by construction (the
     snowman's relaxed 70/1.5 ring is exactly the case that would break). */
  _basicAtkGeom(m) {
    return m.arch === 'snowman'
      ? { range: 70, yScale: 1.5 }
      : { range: this.MONSTER_ATTACK_RANGE, yScale: 3.0 };
  },

  /* Stamp a wind-up instead of swinging.  Called from the aggro branch
     where a live target and its distance are already in hand, BELOW the
     telegraph kits (a signature cast outranks a jab) and above the old
     swing site it replaces.  `kind` is 'swing' or 'throw'. */
  _startBasicWindup(zoneId, m, targetId, now, kind, cdMs) {
    const ms = kind === 'throw' ? BASIC_WINDUP.THROW_MS : basicWindupMs(m.arch);
    m._bwUntil = now + ms;
    m._bwTarget = targetId;
    m._bwKind = kind;
    /* Inside the cycle, not added to it — see the header. */
    m.atkCd = now + cdMs;
    /* Plant him for the tell AND the follow-through, the way the kits do.
       Without this he walks through his own wind-up and the cue reads as
       an unrelated shimmer. */
    m._attackingUntil = Math.max(m._attackingUntil || 0, now + ms + 300);
    this._monsterAbilityEvent(zoneId, m, kind, 'windup', { ms });
    return true;
  },

  /* Resolve a wind-up in flight.  Called UNCONDITIONALLY before target
     acquisition for the reason spelled out on _resolveMonsterTelegraph: a
     player who runs away must not strand a pending swing that fires stale
     at whoever wanders past next.  Returns TRUE when it owns the tick. */
  _resolveBasicWindup(zoneId, m, now) {
    if (!m._bwUntil) return false;
    if (now < m._bwUntil) {
      m._attackingUntil = Math.max(m._attackingUntil || 0, now + 100);
      return true;
    }
    const targetId = m._bwTarget;
    const kind = m._bwKind;
    m._bwUntil = 0;
    m._bwTarget = null;
    m._bwKind = null;
    m._attackingUntil = Math.max(m._attackingUntil || 0, now + 300);

    const ps = targetId ? this.playerState[targetId] : null;
    if (!ps || ps.dead || ps.dying || ps.z !== zoneId) return true;   /* target gone: silent whiff */
    /* v2.3.1690/1704: a harvester is left alone even if they started the
       swipe DURING the wind-up — the gate has to be re-checked here, not
       only at stamp time. */
    if (this._extractionShielded(targetId, now)) return true;

    if (kind === 'throw') {
      const cfg = Object.prototype.hasOwnProperty.call(this.MONSTER_RANGED_BY_ARCH, m.arch)
        ? this.MONSTER_RANGED_BY_ARCH[m.arch] : null;
      /* One ball at a time still holds — a wind-up that started before an
         earlier ball landed resolves into nothing rather than doubling up. */
      if (!cfg || m._projImpactAt) return true;
      m._projImpactAt = now + cfg.travelMs;
      m._projTargetId = targetId;
      /* Aimed where they are at RELEASE, frozen there: the ball flies to a
         point, not to the player, which is what makes travelMs dodgeable
         (the v2.3.1686 rule, unchanged). */
      m._projTx = ps.x;
      m._projTy = ps.y;
      this.eventBuffer.push({
        type: 'monster_projectile',
        payload: {
          monsterId: m.id,
          kind: m.arch === 'snowman' ? 'snowball' : 'slime',
          zone: zoneId, x: m.x, y: m.y, tx: ps.x, ty: ps.y, travelMs: cfg.travelMs,
        },
      });
      this._markMonsterDirty(zoneId, m.id);
      return true;
    }

    /* THE WHIFF — re-measured against where they are NOW, through the
       grace ring, with the same ellipse the tick loop uses. */
    const geom = this._basicAtkGeom(m);
    const reach = geom.range * BASIC_WINDUP.WHIFF_GRACE;
    const dx = ps.x - m.x, dy = (ps.y - m.y) * geom.yScale;
    if (Math.sqrt(dx * dx + dy * dy) > reach) return true;   /* they left: no damage, no event */

    this._resolveBasicSwingHit(zoneId, m, targetId, now);
    return true;
  },

  /* One basic swing vs one player, at IMPACT time.
     v2.3.2215: moved verbatim out of the _tickMonsters aggro branch so the
     wind-up resolve (which runs before aggro) can reach it.  Behaviour is
     unchanged with one deliberate consequence: block, parry, stamina and
     thorns are now evaluated when the blow LANDS rather than when it was
     decided, which is what makes a shield raised during the tell work —
     and it matches how the kits and the snowball impact already resolved.
     atkCd/_attackingUntil are NOT stamped here: the wind-up already paid
     them (see the header on why the cycle must not grow). */
  _resolveBasicSwingHit(zoneId, m, targetId, now) {
    const blockerPs = this.playerState[targetId];
    if (this._blockArcCovers(blockerPs, m.x, m.y)) {
      const _parried = this._parryOpen(blockerPs, now);
      if (_parried) this._applyParry(zoneId, m, targetId, blockerPs, now);
      const staminaCost = (BLOCK_COSTS_STAMINA && !_parried)
        ? Math.max(1, Math.round(BLOCK_STAMINA_COST * this._blockStaminaMult(blockerPs)))
        : 0;
      if (staminaCost > 0 && blockerPs && typeof blockerPs.stamina === 'number') {
        blockerPs.stamina = Math.max(0, blockerPs.stamina - staminaCost);
        this._saveRpgPools(targetId, blockerPs);
        this._queuePlayerStateFlush(targetId);
      }
      const _thornsPts = (blockerPs && !blockerPs.prog3 && blockerPs.defenseSpec && blockerPs.defenseSpec.thorns) || 0;
      if (_thornsPts > 0 && m.hp > 0) {
        const reflect = Math.min(Math.max(0, m.hp),
          Math.max(1, this._t2Flat(blockerPs, 'defense', 'thorns')));
        m.hp -= reflect;
        if (!m.dmgByPlayer) m.dmgByPlayer = Object.create(null);
        m.dmgByPlayer[targetId] = (m.dmgByPlayer[targetId] || 0) + reflect;
        this.eventBuffer.push({
          type: 'monster_hit',
          payload: {
            monsterId: m.id, zone: zoneId, dmg: reflect, isCrit: false,
            attackerId: targetId, thorns: true,
            hpPct: Math.max(0, m.hp / m.maxHp),
          },
        });
        this._markMonsterDirty(zoneId, m.id);
        if (m.hp <= 0) this._resolveMonsterKill(zoneId, m, targetId, blockerPs, 'thorns');
      }
      this.eventBuffer.push({
        type: 'monster_attack',
        payload: {
          monsterId: m.id, targetId, dmg: m.dmg, dmgTaken: 0,
          blocked: true,
          parried: _parried || undefined,
          staminaDrain: staminaCost > 0 ? staminaCost : undefined,
          zone: zoneId, attackerX: m.x, attackerY: m.y,
        },
      });
      return;
    }
    this._monsterStrikePlayer(zoneId, m, targetId, m.x, m.y);
  },
};
