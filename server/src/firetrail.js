/* ═══ v2.3.2238: THE FIRE GOBLIN LEAVES A TRAIL ═══
 *
 * Owner: "what kind of ability should the fire goblin have?  Think of
 * some candidates" -> then, of the trail: "build the fire trail for the
 * fire goblin".
 *
 * WHY THIS ONE, out of the candidates.  The fire goblin already IS fire
 * everywhere except in what it does: it burns orange, it scatters embers
 * on every hit (HIT_MATERIALS.fireGoblin), it drops charred remnants --
 * and then it walks up and pokes you exactly like a slime, because it is
 * a `fodder` archetype wearing a different sheet.  A trail turns the one
 * thing the monster is already about into the one thing it does.
 *
 * IT IS ALSO THE FIRST PERSISTENT GROUND HAZARD IN THE GAME.  Everything
 * that has ever hurt a player here resolves at an instant -- a swing, a
 * snowball's impact, a telegraphed slam, the slime's blast.  All of them
 * ask "where were you at THAT moment".  This asks "where have you been
 * standing", which is a different question and the reason it is worth
 * building: it makes the FLOOR a thing you read, and it gives the ember
 * zone a hazard that a player has to move around rather than react to.
 *
 * ── WHAT MAKES IT FAIR ────────────────────────────────────────────────
 * The telegraph kits carry four fairness rails (server/src/telegraph.js);
 * a persistent hazard needs its own set, because "re-check at execute"
 * has no meaning for something that is already on the ground:
 *
 *   1. IT ONLY BURNS WHERE HE CHASED YOU.  Patches drop only while he
 *      has a target (m.targetId).  An idle goblin wandering his spawn
 *      leash lays nothing -- otherwise the ember zone would pave itself
 *      into a maze nobody chose to light, and the tick and the wire
 *      would both pay for scenery.
 *   2. ARM_MS.  A patch is inert for its first 300ms.  A goblin walking
 *      through the tile you are standing on must not be an unavoidable
 *      hit -- you get the flare before you get the burn, which is the
 *      same "the tell comes first" promise every other ability keeps.
 *   3. THE RADIUS IS SMALL AND THE ANSWER IS ONE STEP.  26px against the
 *      slime blast's 110.  A default character covers 150px a second, so
 *      leaving a patch costs ~0.2s of walking.  Standing in it is a
 *      choice (greed for the kill), never a tax.
 *   4. IT TICKS SLOWLY AND SOFTLY.  6 damage every 500ms = 12/s, and a
 *      tick is charged PER PLAYER rather than per patch, so the overlap
 *      between two patches 48px apart cannot double-dip.  Compare the
 *      one-off numbers this game already throws (the slime's 60): this
 *      is attrition you notice accumulating, not a spike that removes a
 *      health bar while you read the word "fire".
 *
 * NOT BLOCKABLE, and that is deliberate rather than an omission: a shield
 * answers a direction, and the ground under your feet does not have one.
 * Movement is the whole counterplay, which is what rail 3 is for.
 *
 * ── WHAT IT DOES NOT DO ───────────────────────────────────────────────
 * It does not hurt MONSTERS, including other goblins.  Friendly fire is a
 * bigger design change than the one that was asked for (it would make a
 * pack of goblins kill each other while you watch), so the scope stays on
 * the player.  Say the word if the fire was meant to be indiscriminate.
 *
 * It does not apply the elemental `burn` status either, which was the
 * obvious-looking reuse and is wrong twice over: STATUS_DEFS burn is a
 * MONSTER status (elemental.js applies statuses to `m`, and there is no
 * player-side status system to hang it on at all), and its DoT is priced
 * off the ATTACKER's elem stat, which a monster does not have.  Building
 * a player-status system to deliver 6 damage would be the tail wagging
 * the dog.  Direct per-tick damage through _applyDamage is what every
 * other monster damage source here already does.
 *
 * ── WIRE / DEPLOY ORDER (rule 19) ─────────────────────────────────────
 * `fire_trail` is DISPLAY-ONLY and carries no damage, exactly like
 * monster_ability and monster_projectile before it.  The damage rides the
 * authoritative monster_attack, stamped `ability: 'firetrail'` so it
 * inherits the v2.3.2235 "the worker resolved this one" bypass -- a burn
 * tick is a textbook case for it, since the patch is not a monster in the
 * client's snapshot at all.  An older client that has never heard of
 * fire_trail sees no flames and takes exactly the right damage; no caps
 * flag needed, same as the monster_projectile precedent.
 *
 * NOTHING HERE IS PERSISTED.  Patches live in DO memory beside
 * this.monsters.  A worker restart forgetting which ground was on fire is
 * correct, not a bug -- monsters respawn across one too.  So there is no
 * storage-key registry entry to add.
 */

/* Tuning.  Every number here is grounded in something already shipped:
 * the goblin's own 1.5px/tick walk (= 68 px/s at TICK_RATE 22), the
 * player's 150 px/s default (gameSystems.js SPEED), and the 32px TILE. */
export const FIRE_TRAIL = {
  /* Keyed by VARIANT, not archetype: the fire goblin is an ordinary
     `fodder` in ember (index.js _variantForArchInZone), so gating on the
     arch would set every slime in the game alight.  A table rather than
     an `=== 'fireGoblin'` so the next fire-walker is one line, and so
     mirror-audit has something real to check the client against. */
  VARIANTS: { fireGoblin: 1 },
  SPACING_PX: 48,     /* one patch per 48px walked ~= one every 0.7s at his pace */
  RADIUS: 26,         /* under a tile.  The blast ring is 110 -- this is not that */
  ARM_MS: 300,        /* rail 2: it flares before it bites */
  LIFE_MS: 4000,      /* ~5.7 patches alive at once at his walking pace */
  TICK_MS: 500,       /* per PLAYER, not per patch (rail 4) */
  DMG: 6,             /* 12/s standing still, before defence mitigation */
  /* Two caps, for two different failure modes.  Per monster: a chase that
     never ends must not grow an unbounded tail.  Per zone: N goblins in a
     crowded ember must not turn one tick into a quadratic sweep or flood
     the wire.  Both are backstops -- ordinary play sits far under them. */
  MAX_PER_MONSTER: 8,
  MAX_PER_ZONE: 60,
};

export const fireTrailMethods = {
  /* Does this monster lay fire?  Variant-keyed, hasOwnProperty-guarded on
     the CLAUDE.md rule-4 principle: m.variant is server-authored today,
     but the guard costs nothing and the rule exists because that
     assumption keeps breaking. */
  _laysFireTrail(m) {
    return !!(m && m.variant
      && Object.prototype.hasOwnProperty.call(FIRE_TRAIL.VARIANTS, m.variant));
  },

  _zoneFire(zoneId) {
    if (!this.fireTrails) this.fireTrails = Object.create(null);
    if (!this.fireTrails[zoneId]) this.fireTrails[zoneId] = [];
    return this.fireTrails[zoneId];
  },

  /* Drop a patch if he has walked far enough since the last one.
     Called once per monster per tick from _tickMonsters, ABOVE the phase
     resolves and the aggro branch, so it measures movement from whatever
     source -- chase step, knockback repay, a future dash -- rather than
     being welded to one mover.  Reading last tick's position means the
     patch lands one tick (22ms, ~1.5px) behind him, which is where a
     footprint belongs anyway. */
  _maybeDropFirePatch(zoneId, m, now) {
    if (!this._laysFireTrail(m)) return;
    if (!m.alive) { m._ftX = null; return; }
    /* Rail 1: only while he is chasing someone. */
    if (!m.targetId) { m._ftX = null; return; }
    if (typeof m._ftX !== 'number') {
      /* First tick of a chase: anchor, don't drop.  Anchoring here rather
         than at spawn is what stops a goblin who re-aggros across the zone
         from laying a patch for the whole distance he covered while idle. */
      m._ftX = m.x; m._ftY = m.y;
      return;
    }
    const dx = m.x - m._ftX, dy = m.y - m._ftY;
    if ((dx * dx + dy * dy) < FIRE_TRAIL.SPACING_PX * FIRE_TRAIL.SPACING_PX) return;
    m._ftX = m.x; m._ftY = m.y;

    const list = this._zoneFire(zoneId);
    if (list.length >= FIRE_TRAIL.MAX_PER_ZONE) return;
    /* Per-monster cap: retire HIS oldest rather than refusing to drop, so
       the trail keeps following him instead of freezing at its cap. */
    let mine = 0;
    for (let i = 0; i < list.length; i++) if (list[i].mid === m.id) mine++;
    if (mine >= FIRE_TRAIL.MAX_PER_MONSTER) {
      for (let i = 0; i < list.length; i++) {
        if (list[i].mid === m.id) { list.splice(i, 1); break; }
      }
    }

    const patch = {
      mid: m.id,
      x: m.x, y: m.y,
      armAt: now + FIRE_TRAIL.ARM_MS,
      dieAt: now + FIRE_TRAIL.LIFE_MS,
    };
    list.push(patch);
    this.eventBuffer.push({
      type: 'fire_trail',
      payload: {
        zone: zoneId, monsterId: m.id,
        x: Math.round(patch.x), y: Math.round(patch.y),
        r: FIRE_TRAIL.RADIUS, ms: FIRE_TRAIL.LIFE_MS, arm: FIRE_TRAIL.ARM_MS,
      },
    });
  },

  /* Expire patches and burn whoever is standing in one.  Runs once per
     ACTIVE ZONE per tick, BEFORE the monster loop and outside its
     `monsters.length === 0` guard -- fire the goblin left behind has to
     keep burning and keep expiring even in the tick where he dies, or a
     patch would hang in the zone until someone re-entered. */
  _tickFireTrail(zoneId, playersInZone, now) {
    const list = this.fireTrails && this.fireTrails[zoneId];
    if (!list || list.length === 0) return;

    for (let i = list.length - 1; i >= 0; i--) {
      if (now >= list[i].dieAt) list.splice(i, 1);
    }
    if (list.length === 0 || !playersInZone || playersInZone.length === 0) return;

    /* Rule 4: keyed by player id, which is client-supplied at join. */
    if (!this._fireBurnAt) this._fireBurnAt = Object.create(null);
    const r2 = FIRE_TRAIL.RADIUS * FIRE_TRAIL.RADIUS;

    for (const p of playersInZone) {
      /* Rail 4: ONE tick per player per TICK_MS, however many patches
         they are standing in.  Two patches 48px apart with a 26px radius
         genuinely overlap, so per-patch charging would double the damage
         precisely where the trail is densest. */
      if (now < (this._fireBurnAt[p.id] || 0)) continue;
      let hitIn = null;
      for (let i = 0; i < list.length; i++) {
        const f = list[i];
        if (now < f.armAt) continue;                  /* rail 2 */
        const dx = p.x - f.x, dy = p.y - f.y;
        if (dx * dx + dy * dy <= r2) { hitIn = f; break; }
      }
      if (!hitIn) continue;
      this._fireBurnAt[p.id] = now + FIRE_TRAIL.TICK_MS;
      this._fireTrailHitPlayer(zoneId, hitIn, p.id);
    }
  },

  /* One burn tick vs one player.  Mirrors _telegraphHitPlayer's rails
     MINUS the block arc (you cannot face away from the floor) and minus
     the thorns reflect (there is nothing to reflect into -- the patch is
     not the monster, and the monster may be dead).  Everything that makes
     damage authoritative here is kept: the no-one-shot clamp, _applyDamage,
     kill credit, the monster_attack emission, the vitals save and the
     death check. */
  _fireTrailHitPlayer(zoneId, patch, pid) {
    const ps = this.playerState[pid];
    if (!ps || ps.dead || ps.dying || ps.z !== zoneId) return 0;
    /* Defensive, not load-bearing: 6 is nowhere near half of anyone's max
       HP.  It is here so a future tuning pass on DMG cannot quietly invent
       the first one-shot in the game (TELEGRAPH.MAX_HIT_PCT, same rail). */
    const raw = Math.min(FIRE_TRAIL.DMG,
      Math.max(1, Math.floor((ps.maxHp || 100) * 0.5)));
    const res = this._applyDamage(ps, raw, false);
    /* Credit still goes to the goblin who lit it, so a player finished off
       by fire counts as his kill and the death message names a real
       monster.  The monster may already be dead -- _trackMonsterDamage only
       needs the id, and the id is on the patch. */
    if (!res.dodged) {
      this._trackMonsterDamage(ps, patch.mid, res.graced ? (res.dmgIntent || 0) : res.dmgTaken);
    }
    this.eventBuffer.push({
      type: 'monster_attack',
      payload: {
        monsterId: patch.mid, targetId: pid, dmg: raw, dmgTaken: res.dmgTaken,
        dodged: res.dodged, secondWind: res.secondWind || undefined,
        zone: zoneId,
        /* The PATCH is the attacker, not the goblin: the client points its
           feedback at attackerX/Y and drops anything further than 160px
           from where the player is now.  The goblin may be across the zone
           by the time his fire bites; the fire is under their feet. */
        attackerX: patch.x, attackerY: patch.y,
        /* v2.3.2235's bypass.  Required here rather than nice to have: the
           patch is not in the client's monster snapshot under any id it
           knows, so without this the number is dropped by the very first
           filter in the handler. */
        ability: 'firetrail',
      },
    });
    this._saveRpgVitals(pid, ps);
    this._queuePlayerStateFlush(pid);
    if (ps.hp <= 0 && !ps.dying) this._handlePlayerDeath(ps, pid, 'monster:' + patch.mid);
    return res.dmgTaken;
  },

  /* Replay the live patches to one arriving socket, right after its zone
     snapshot.  Without it a player who walks into ember mid-chase takes
     damage from ground they cannot see -- the exact "mystery damage with
     no visible attacker" complaint the client's range filter exists for.
     Sent as the same fire_trail event with the REMAINING life, so the
     client's own expiry lands at the right moment; an old client ignores
     these exactly as it ignores the live ones. */
  _sendFireTrailSnapshot(zoneId, ws) {
    const list = this.fireTrails && this.fireTrails[zoneId];
    if (!list || list.length === 0 || !ws) return 0;
    const now = Date.now();
    let sent = 0;
    for (const f of list) {
      const left = f.dieAt - now;
      if (left <= 0) continue;
      try {
        ws.send(JSON.stringify({
          type: 'fire_trail',
          payload: {
            zone: zoneId, monsterId: f.mid,
            x: Math.round(f.x), y: Math.round(f.y),
            r: FIRE_TRAIL.RADIUS, ms: left,
            /* Already armed by the time anyone can arrive on it, and
               re-arming it would hand the newcomer a free 300ms of
               standing in a fire everyone else is being burned by. */
            arm: 0,
          },
        }));
        sent++;
      } catch (e) { /* socket closing mid-transition: nothing to recover */ }
    }
    return sent;
  },
};
