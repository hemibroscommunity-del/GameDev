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

/* ═══ v2.3.2221: THE SNOWMAN'S SNOW PILE ═══
 * The signature mechanic from docs/specs/snowman-snow-pile.md, built on the
 * _monsterDamageable gate that landed with it.  He collapses into a mound of
 * churned snow, grinds toward his target, and reassembles.
 *
 * The shape that makes it fair: he trades ALL of his offence for ALL of his
 * defence.  Untouchable AND harmless (owner: "The snowman can't attack you
 * in this form either"), so it is a repositioning tool, not a damage window,
 * and it cannot be spammed into a stalemate.  Entering and leaving both cost
 * him -- dig and emerge are vulnerable, and emerging does NOT grant a free
 * hit: the first attack after surfacing still plays its ordinary wind-up.
 *
 * ARRIVE_PX ends the pile early when he reaches you, so closing the distance
 * is the whole point of the move rather than an accident of the timer. */
export const BURROW = {
  HP_FRAC: 0.5,        /* triggers the first time hp drops to half */
  CD_MS: 12000,        /* ...then a cooldown, so it stays a moment not a personality */
  /* v2.3.2223 (owner: "Burrow needs to last longer").  Every phase grew.
     400ms across an 8-frame strip is 50ms a frame -- the dig and emerge
     animations were over before they read as anything; 600 gives them 75. */
  /* v2.3.2225 (owner: "double burrow time").  The DOUBLING is on the pile —
     the phase he is actually burrowed for.  Dig and emerge are the entry and
     exit animations, and they are left alone deliberately: at 600ms an
     8-frame strip already runs at 75ms a frame, and stretching them to 1200
     would both drag the animation and hand out free hits, since those are
     the two windows he can be hurt in.  Say the word if the whole move was
     meant. */
  DIG_MS: 600,         /* vulnerable */
  /* The pile ends on whichever comes FIRST: this cap, or reaching the
     player.  So a raised cap alone would have changed nothing in the case
     that actually felt short -- a player standing close when he burrows,
     where arrival ends it almost at once.  Hence the floor: the pile is a
     phase you can see even when the geometry is against it.  A long pile
     costs the player nothing but time, because it cannot hurt them. */
  PILE_MIN_MS: 2400,   /* v2.3.2225: 1200 -> 2400 */
  PILE_MAX_MS: 8000,   /* invulnerable, harmless. v2.3.2225: 4000 -> 8000 */
  EMERGE_MS: 600,      /* vulnerable — the punish window */
  ARRIVE_PX: 60,
  SPEED_MULT: 3,
};

/* ═══ v2.3.2224: THE BLUE SLIME GOES OFF ═══
 * Owner: "Once it reaches 0 health it goes to 3x or 4x its size and explodes
 * in a blast radius. 60 damage if caught in the radius."
 *
 * So death is not the end of the fight -- it is the start of a two-second
 * problem.  The swell IS the telegraph: nothing else warns you, and nothing
 * else needs to, because a slime tripling in size in front of you is not
 * subtle.  Walking out is always available; the radius is deliberately
 * smaller than the distance a player covers in SWELL_MS, so getting caught
 * is a choice (greed for the next kill) rather than a tax.
 *
 * DMG is FLAT, not a multiple of the slime's own damage: the owner named a
 * number, and a fodder slime's dmg is small enough that a multiplier big
 * enough to reach 60 would have swung wildly with monster level.  It still
 * passes through MAX_HIT_PCT, so it cannot one-shot a fresh character --
 * the same no-one-shots rail every telegraphed hit rides.
 */
export const SLIME_BURST = {
  VARIANTS: { blueSlime: 1 },   /* a table: the next exploder is one line */
  SWELL_MS: 1600,               /* grow, then go.  v2.3.2226: 800 -> 1600 (owner) --
                                   and it is now the ONLY warning, since the
                                   drawn ring is gone, so the extra second is
                                   carrying real weight rather than padding. */
  SCALE: 3.5,                   /* owner: "3x or 4x" */
  RADIUS: 110,                  /* ~the swollen body, so the ring matches the art */
  DMG: 60,
};

/* Which archetypes own the move.  A table rather than an `=== 'snowman'`
 * so the next monster to get a burrow is one line, and so mirror-audit can
 * check the client's cue whitelist against something real. */
export const BURROW_ARCH = { snowman: 1 };

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
    /* v2.3.2224: `kit.flat` is a FIXED amount (the slime burst's 60) rather
       than a multiple of the monster's own damage -- a fodder slime's dmg is
       small enough that a multiplier big enough to reach 60 would swing
       wildly with monster level.  It still passes through MAX_HIT_PCT below,
       so a flat number can never become a one-shot on a fresh character. */
    const raw = Math.min(
      kit.flat ? Math.ceil(kit.flat) : Math.ceil(m.dmg * kit.dmgMult),
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

  /* ═══ v2.3.2224: THE BLUE SLIME'S DEATH BURST ═══
     Does this monster answer death with an explosion rather than a corpse? */
  _burstsOnDeath(m) {
    return !!(m && m.variant && Object.prototype.hasOwnProperty.call(SLIME_BURST.VARIANTS, m.variant));
  },

  /* Called from the TOP of _resolveMonsterKill, which is the one place every
     way of killing a monster funnels through -- melee, a damage-over-time
     tick, an Element Burst, a stamina ability.  Intercepting there rather
     than at each damage site is what stops "it only explodes when you kill
     it with a sword".

     Returns true if the kill is DEFERRED: the slime stays alive with 0 hp
     while it swells, and the real kill runs when it goes off.  Nothing can
     hurt it in the meantime -- _monsterDamageable already denies hp <= 0 --
     so the window cannot be extended or cut short by more damage. */
  _startSlimeBurst(zoneId, m, killerId, slot, now) {
    if (!this._burstsOnDeath(m) || m._burstUntil) return false;
    m._burstUntil = now + SLIME_BURST.SWELL_MS;
    /* The killer is replayed into the real kill after the blast, so credit,
       loot and XP land exactly as they would have. */
    m._burstKiller = killerId || null;
    m._burstSlot = slot || null;
    m._attackingUntil = 0;
    m._bwUntil = 0; m._bwTarget = null; m._bwKind = null;   /* no swing out of a corpse */
    this.eventBuffer.push({
      type: 'monster_ability',
      payload: {
        monsterId: m.id, zone: zoneId, ability: 'burst', phase: 'swell',
        ms: SLIME_BURST.SWELL_MS, radius: SLIME_BURST.RADIUS,
        scale: SLIME_BURST.SCALE,
        ax: Math.round(m.x), ay: Math.round(m.y),
      },
    });
    this._markMonsterDirty(zoneId, m.id);
    return true;
  },

  /* Advance a swelling slime.  Runs in the tick beside the other phase
     resolves, unconditionally and before aggro, so a player who runs away
     still gets the explosion resolved rather than leaving a 0-hp slime
     standing in the zone forever. */
  _resolveSlimeBurst(zoneId, m, now) {
    if (!m._burstUntil) return false;
    if (now < m._burstUntil) return true;          /* still swelling */

    /* EVERY player in the radius, not just the killer: it is an explosion. */
    const r2 = SLIME_BURST.RADIUS * SLIME_BURST.RADIUS;
    const kit = { kind: 'burst', radius: SLIME_BURST.RADIUS, dmgMult: 1, flat: SLIME_BURST.DMG };
    let anyHit = false;
    for (const pid of Object.keys(this.playerState)) {
      const ps = this.playerState[pid];
      if (!ps || ps.dead || ps.dying || ps.z !== zoneId) continue;
      const dx = (ps.x || 0) - m.x, dy = (ps.y || 0) - m.y;
      if (dx * dx + dy * dy > r2) continue;
      this._telegraphHitPlayer(zoneId, m, pid, kit);
      anyHit = true;
    }
    this.eventBuffer.push({
      type: 'monster_ability',
      payload: {
        monsterId: m.id, zone: zoneId, ability: 'burst', phase: 'execute',
        radius: SLIME_BURST.RADIUS, hit: anyHit,
        ax: Math.round(m.x), ay: Math.round(m.y),
      },
    });

    /* Now it actually dies -- with the credit it earned before it swelled. */
    const killerId = m._burstKiller;
    const slot = m._burstSlot;
    m._burstUntil = 0; m._burstKiller = null; m._burstSlot = null;
    m._burstDone = true;                     /* so the kill is not deferred twice */
    this._resolveMonsterKill(zoneId, m, killerId, killerId ? this.playerState[killerId] : null, slot);
    m._burstDone = false;
    return true;
  },

  /* ═══ v2.3.2221: START THE BURROW ═══
     Called from the tick when a snowman crosses half health.  Returns true
     if the move began, so the caller can skip the rest of his AI this tick.

     The dig is NOT invulnerable — _invulnUntil is stamped when the pile
     begins, not here — because entering has to cost something.  Cancelling
     any pending wind-up is deliberate: a swing stamped a moment ago must
     not resolve out of a body that no longer has arms. */
  _startBurrow(zoneId, m, targetId, now) {
    if (!Object.prototype.hasOwnProperty.call(BURROW_ARCH, m.arch)) return false;
    if (m._burPhase) return false;                     /* already mid-move */
    if (m._burCd && now < m._burCd) return false;
    if (!m.maxHp || m.hp / m.maxHp > BURROW.HP_FRAC) return false;
    if (!targetId) return false;
    m._burPhase = 'dig';
    m._burUntil = now + BURROW.DIG_MS;
    m._burTarget = targetId;
    m._burCd = now + BURROW.CD_MS;    /* from the START, like the wind-up cooldown:
                                         stamping it at the end would make the
                                         move's own duration part of its downtime */
    m._bwUntil = 0; m._bwTarget = null; m._bwKind = null;
    m._attackingUntil = 0;
    this.eventBuffer.push({
      type: 'monster_ability',
      payload: { monsterId: m.id, zone: zoneId, ability: 'burrow',
                 phase: 'dig', ms: BURROW.DIG_MS },
    });
    this._markMonsterDirty(zoneId, m.id);
    return true;
  },

  /* ═══ ADVANCE THE BURROW ═══
     Returns true while he is busy with it, which is what keeps him from
     attacking, acquiring targets or being moved by ordinary chase logic --
     the harmlessness of the pile is this return value, not a separate flag.

     Runs BEFORE aggro and unconditionally, the same placement and for the
     same reason as the wind-up resolve: a player who walks away must not
     strand him mid-phase forever. */
  _resolveBurrow(zoneId, m, now) {
    if (!m._burPhase) return false;
    const ps = m._burTarget ? this.playerState[m._burTarget] : null;
    const gone = !ps || ps.dead || ps.dying || ps.z !== zoneId;

    if (m._burPhase === 'pile') {
      /* Grind toward where they are NOW (not a frozen point): the pile is
         slow-motion pursuit, and freezing the aim would make walking aside
         beat it every time with no counterplay needed. */
      let arrived = false;
      /* v2.3.2223: arrival cannot end the pile before its floor. */
      const _canEnd = now >= (m._burFloor || 0);
      if (!gone) {
        const dx = (ps.x || 0) - m.x, dy = (ps.y || 0) - m.y;
        const d = Math.hypot(dx, dy);
        if (d <= BURROW.ARRIVE_PX) arrived = _canEnd;
        else if (d > 0) {
          /* v2.3.2223: `m.speed` -- which does not exist.  The field is
             `m.spd` (0.4 for a snowman: 0.5 base x its 0.8 spdMult), so this
             read undefined and fell back to 1, moving the pile at 3 px per
             22ms tick = 135 px/s instead of the intended 54.  He crossed the
             gap and surfaced almost immediately, which is most of why the
             move felt short.  The fallback hid it: no crash, just a monster
             moving at two and a half times its design speed. */
          const step = (m.spd || 0.4) * BURROW.SPEED_MULT;
          m.x += (dx / d) * step;
          m.y += (dy / d) * step;
          this._markMonsterDirty(zoneId, m.id);
        }
      }
      if (arrived || (gone && _canEnd) || now >= m._burUntil) {
        m._burPhase = 'emerge';
        m._burUntil = now + BURROW.EMERGE_MS;
        m._invulnUntil = 0;            /* surfacing ends the immunity immediately */
        this.eventBuffer.push({
          type: 'monster_ability',
          payload: { monsterId: m.id, zone: zoneId, ability: 'burrow',
                     phase: 'emerge', ms: BURROW.EMERGE_MS },
        });
        this._markMonsterDirty(zoneId, m.id);
      }
      return true;
    }

    if (now < m._burUntil) return true;   /* dig or emerge still playing */

    if (m._burPhase === 'dig') {
      m._burPhase = 'pile';
      m._burUntil = now + BURROW.PILE_MAX_MS;
      m._burFloor = now + BURROW.PILE_MIN_MS;   /* v2.3.2223 */
      /* The immunity is a TIMESTAMP that outlives the phase by nothing:
         _monsterDamageable reads only this, so even if a transition is ever
         dropped the worst case is a window he had already earned. */
      m._invulnUntil = m._burUntil;
      this.eventBuffer.push({
        type: 'monster_ability',
        payload: { monsterId: m.id, zone: zoneId, ability: 'burrow',
                   phase: 'pile', ms: BURROW.PILE_MAX_MS },
      });
      this._markMonsterDirty(zoneId, m.id);
      return true;
    }

    /* emerge finished — back to ordinary behaviour.  atkCd is left alone, so
       his next swing still pays its own wind-up: surfacing is not a free hit. */
    m._burPhase = null;
    m._burUntil = 0;
    m._burTarget = null;
    m._invulnUntil = 0;
    this._markMonsterDirty(zoneId, m.id);
    return false;
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
      /* v2.3.2221: thorns reflect is a monster hp write like any other --
         a pile that cannot be swung at must not be hurt by being blocked. */
      if (_thornsPts > 0 && this._monsterDamageable(m)) {
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
