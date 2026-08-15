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
 * SNOWMAN'S VOLLEY IS DEFERRED, not forgotten: it wants the existing
 * ranged/snowball path (travelMs, aim point, per-projectile block at
 * impact) rather than this melee-shaped resolve, which is a different
 * enough shape to deserve its own change.
 */

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
  },
};

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
      const parried = this._parryOpen(ps, Date.now());
      if (parried) this._applyParry(zoneId, m, pid, ps, Date.now());
      this.eventBuffer.push({
        type: 'monster_attack',
        payload: {
          monsterId: m.id, targetId: pid, dmg: m.dmg, dmgTaken: 0, blocked: true,
          parried: parried || undefined,
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
};
