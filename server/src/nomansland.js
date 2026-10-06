/* ═══ v2.3.3058: NO MAN'S LAND ═══
 *
 * Owner, 2026-10-05:
 *   "Add a new 'No man's land' notification when you cross into zones with
 *    lvl 6+ monsters.  It'll start at 1.  This means any other player 1 level
 *    above or below you can attack you.  If you die by another player you
 *    lose all the things in your inventory except what you have actively
 *    equipped.  The player who attacks you gets a red skull above their head
 *    for 20 minutes based on time in the game and the timer resets each time
 *    they attack a player.  Players who get attacked have a white skull above
 *    their head.  If the red skull player dies they lose everything (all
 *    equipment, gold, etc)."
 *
 * WHERE.  The Wheel's lands, from their second tier of five levels outward:
 * the ring the Lv 6-10 monsters stand in is No man's land 1, the next 2, and
 * so on out to 15 at the keystone gates.  Measured from the Wheel's centre on
 * the plan's own rings (hub 2.7 zones of 1,024 px, a tier every 1,024 px --
 * public/tools/world/plan.js; nomansland.test.mjs checks the numbers against
 * it), with no wobble, so the server and the game (src/game/noMansLand.js,
 * mirror-audit) can never disagree about which side of a line you stand on.
 * The safe ground, the commons and Brotown, is never in it.  Dungeons are
 * their own zones and never in it.
 *
 * WHO MAY HIT WHOM (_nmlAllowed, consulted by _pvpAllowed BEFORE the
 * OPEN_PVP master switch, which stays off everywhere else -- v2.3.1917's
 * "remove the option to kill other players for now" still holds outside No
 * man's land):
 *   - both players in No man's land, both alive, not in one party;
 *   - their CHARACTER levels (ps.level, the worker's own) at most N apart,
 *     where N is the LOWER of the two No man's land levels they stand in.
 *     "Any other player 1 level above or below you can attack you" read
 *     from both sides at once, so a player standing deep cannot reach over
 *     the line into a shallow player's tighter range.
 *
 * THE SKULLS (_nmlOnHit, on every landed hit under that rule):
 *   - the attacker gets a RED skull for SKULL_MS (20 min), reset by every
 *     hit -- EXCEPT a player hitting back the one who attacked them (they
 *     hold a white skull BY that player, and no red of their own):
 *     defending yourself is not attacking, or every victim would be
 *     punished for fighting back.  The one who started it keeps resetting
 *     theirs with every hit, fought back or not;
 *   - the one hit gets a WHITE skull for the same 20 minutes, reset by every
 *     hit, remembering who gave it (that is all the retaliation rule needs).
 *   Both count TIME IN THE GAME: _tickNml takes the tick's time off only
 *   while the player is connected (a disconnected player has no playerState
 *   at all), so logging out does not wait a skull out.  Stored in
 *   `nml_state:<pid>` (rule 2's registry) whenever one starts or ends and
 *   every SAVE_EVERY_MS while it runs, read back on join.  Others see it on
 *   the tick (`sk: 'r' | 'w'`), you on `nml_skull` {red, white} in ms left.
 *
 * WHAT A DEATH COSTS (_nmlOnDeath, from _handlePlayerDeath):
 *   - killed by a player under No man's land's rule (the killing blow came
 *     through it in the last few seconds): THE BAG -- its items, its spare
 *     weapons and its spare armour and legs -- and nothing worn.
 *       items        -> the usual death pile, but the KILLER's for its
 *                       owner window (then anyone's, as every death pile);
 *       spare weapons -> credited to the killer (_creditPlayer: inbox if
 *                       they are offline or full), opIds `nmlloot:`;
 *       spare armour -> credited to the killer with its provenance row, so
 *                       it stays a provable piece in their hands.
 *     The death's usual carve-outs still hold: the gathering tools and the
 *     quest's own items stay (_keptThroughDeath) -- losing a pickaxe to a
 *     fight would end mining, and a quest's remnants would end the quest.
 *     And what this worker cannot tell from what you WEAR stays too: a
 *     stash copy of the armour on your body (adopted at join, worn since)
 *     and every cosmetic OUTFIT piece.  Taking either would risk the killer
 *     a second copy of something you still wear (storegear.js §2 has the
 *     long version).  SHIELDS joined the spares in v2.3.3091: the game now
 *     says which one is on your arm (shieldwear.js), and until it has said
 *     so this session every shield stays, as before.
 *   - a RED-skulled player who dies, however: all of that AND everything
 *     worn, every shield, the armour stashes whole, and the gold (outfit
 *     pieces still stay).  Killed by a player, the killer gets it; killed by
 *     anything else, the items go to a death pile anyone may take at once,
 *     and the rest is gone.  A piece is taken once: the one you wear and its
 *     stale stash copy are one piece.
 *   The victim's own game is told exactly what went (`nml_loss`) so it can
 *   clear its bag -- the gear stashes are also a CLIENT's list, re-offered
 *   on every join (gearstash.js); every forfeited piece's id is kept in
 *   `nml_state:<pid>`'s `forfeit` and refused if it is offered again.
 *
 * KILL SWITCH (lower case, TRAPS §117): `nomansland: false` in liveflags
 * un-advertises caps.nomansland, refuses every No man's land hit, starts no
 * skull and takes nothing on a death -- the safe Wheel of v2.3.3057 exactly.
 */
import { WHEEL_ZONE } from './wheelzone.js';
import { WHEEL_CENTRE } from './wheelspawns.js';
import { GEAR_PROV_FIELD, GEAR_PROV_SLOTS } from './gearprov.js';

export const NML = Object.freeze({
  /* the Wheel's rings, game px (plan.js wheel: hub 2.7 zones, tierZones 1,
     zonePx 1024; 16 tiers of 5 levels) */
  HUB: 2764.8,
  TIER: 1024,
  TIERS: 16,
  LEVELS_PER_TIER: 5,
  /* tier 2 is Lv 6-10: "zones with lvl 6+ monsters" -- No man's land 1 */
  FIRST_TIER: 2,
  SKULL_MS: 20 * 60 * 1000,
  /* how often a running skull's time left is written down */
  SAVE_EVERY_MS: 30000,
  /* a stalled tick takes no more than this off a skull at once */
  STEP_CAP_MS: 2000,
  /* how recent the killing blow under the rule must be for the death to be
     a No man's land kill */
  KILL_BLOW_MS: 5000,
  /* forfeited gear ids remembered per player */
  FORFEIT_CAP: 64,
});

export const NML_KEY = (pid) => 'nml_state:' + pid;

/* The tier at (x, y): 0 inside the hub, else 1..16 -- wheel.js tierAt's
   arithmetic on the plan's rings, without the blueprint's wobble. */
export function nmlTierAt(x, y) {
  if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) return 0;
  const r = Math.hypot(x - WHEEL_CENTRE[0], y - WHEEL_CENTRE[1]);
  if (r < NML.HUB) return 0;
  return Math.max(1, Math.min(NML.TIERS, Math.ceil((r - NML.HUB) / NML.TIER)));
}

/* No man's land's level at a spot: 0 outside it, 1 from the Lv 6-10 tier. */
export function nmlLevelAt(zone, x, y) {
  if (zone !== WHEEL_ZONE) return 0;
  const t = nmlTierAt(x, y);
  return t >= NML.FIRST_TIER ? t - NML.FIRST_TIER + 1 : 0;
}

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const clampMs = (v) => Math.max(0, Math.min(NML.SKULL_MS, Math.round(Number(v) || 0)));
/* the worn gear a red skull loses, by field (the provenance slot is the
   field's own name for these four) */
const WORN_GEAR = ['armor', 'legsArmor', 'shield', 'amulet'];
const WORN_WEAPONS = ['weapon', 'rangedWeapon', 'staffWeapon'];

export const noMansLandMethods = {
  _nmlOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && own(f, 'nomansland') && !f.nomansland);
  },

  /* the No man's land level a live player stands in */
  _nmlLevelOf(ps) {
    if (!ps || ps.dead || ps.dying) return 0;
    return nmlLevelAt(ps.z, ps.x, ps.y);
  },

  /* May `attackerId` hit `targetId` under No man's land's rule? */
  _nmlAllowed(attackerId, targetId) {
    if (this._nmlOff() || !attackerId || !targetId || attackerId === targetId) return false;
    const a = this.playerState[attackerId], t = this.playerState[targetId];
    if (!a || !t || a.disconnected || t.disconnected) return false;
    const la = this._nmlLevelOf(a), lt = this._nmlLevelOf(t);
    if (la < 1 || lt < 1) return false;
    const ca = Number(a.level) || 1, ct = Number(t.level) || 1;
    if (Math.abs(ca - ct) > Math.min(la, lt)) return false;
    const pa = this._partyOf && this._partyOf(attackerId);
    const pb = this._partyOf && this._partyOf(targetId);
    if (pa && pb && pa.id && pa.id === pb.id) return false;
    return true;
  },

  _nmlState(ps) {
    if (!ps._nml) ps._nml = { red: 0, white: 0, whiteBy: null, forfeit: [], savedAt: 0 };
    return ps._nml;
  },

  /* 'r', 'w' or null: what the others draw over this player */
  _nmlSkullOf(ps) {
    const s = ps && ps._nml;
    if (!s) return null;
    return s.red > 0 ? 'r' : s.white > 0 ? 'w' : null;
  },

  /* A landed hit under the rule (combat.js _resolvePvPAttack). */
  _nmlOnHit(attackerId, targetId, now) {
    const a = this.playerState[attackerId], t = this.playerState[targetId];
    if (!a || !t) return;
    const sa = this._nmlState(a), st = this._nmlState(t);
    /* hitting back: you hold a white skull BY this player and no red of
       your own -- the one who started it keeps resetting theirs */
    const retaliating = sa.white > 0 && sa.whiteBy === targetId && !(sa.red > 0);
    const aWas = this._nmlSkullOf(a), tWas = this._nmlSkullOf(t);
    if (!retaliating) sa.red = NML.SKULL_MS;
    st.white = NML.SKULL_MS;
    st.whiteBy = attackerId;
    t._nmlLastHitBy = attackerId;
    t._nmlLastHitAt = now;
    for (const [id, ps, was] of [[attackerId, a, aWas], [targetId, t, tWas]]) {
      const changed = this._nmlSkullOf(ps) !== was;
      if (changed) this.dirtyPlayers.add(id);
      this._nmlSend(id, ps);
      /* written when a skull starts or changes colour; a mere reset rides
         _tickNml's every-30-s save, so a fight is not a write a hit */
      if (changed || now - (ps._nml.savedAt || 0) >= NML.SAVE_EVERY_MS) this._nmlSave(id, ps);
    }
  },

  /* Once a tick (tick.js): take the time off every running skull. */
  _tickNml(now) {
    const last = this._nmlTickAt || now;
    this._nmlTickAt = now;
    const dt = Math.max(0, Math.min(NML.STEP_CAP_MS, now - last));
    if (!dt) return;
    for (const id of Object.keys(this.playerState)) {
      const ps = this.playerState[id];
      const s = ps && ps._nml;
      if (!s || ps.disconnected || !(s.red > 0 || s.white > 0)) continue;
      const was = this._nmlSkullOf(ps);
      if (s.red > 0) s.red = Math.max(0, s.red - dt);
      if (s.white > 0) {
        s.white = Math.max(0, s.white - dt);
        if (!s.white) s.whiteBy = null;
      }
      if (this._nmlSkullOf(ps) !== was) {
        this.dirtyPlayers.add(id);
        this._nmlSend(id, ps);
        this._nmlSave(id, ps);
      } else if (now - (s.savedAt || 0) >= NML.SAVE_EVERY_MS) {
        this._nmlSave(id, ps);
      }
    }
  },

  /* your own skulls, in ms left (the game counts them down between sends) */
  _nmlSend(id, ps) {
    const s = ps && ps._nml;
    const ws = this._wsBySessionId && this._wsBySessionId(id);
    if (!ws) return;
    try {
      ws.send(JSON.stringify({ type: 'nml_skull', payload: { red: s ? Math.round(s.red) : 0, white: s ? Math.round(s.white) : 0 } }));
    } catch (e) { /* the next send will carry it */ }
  },

  _nmlSave(id, ps) {
    const s = ps && ps._nml;
    if (!s || !id) return;
    s.savedAt = Date.now();
    const rec = {
      red: clampMs(s.red), white: clampMs(s.white),
      whiteBy: s.white > 0 && typeof s.whiteBy === 'string' ? s.whiteBy : null,
      forfeit: (Array.isArray(s.forfeit) ? s.forfeit : []).slice(-NML.FORFEIT_CAP),
    };
    try {
      const p = (!rec.red && !rec.white && !rec.forfeit.length)
        ? this.state.storage.delete(NML_KEY(id))
        : this.state.storage.put(NML_KEY(id), rec);
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) { /* the next save will carry it */ }
  },

  /* On join, BEFORE the gear stashes are adopted (join.js): the skulls'
     time left, and the ids of pieces this player has forfeited. */
  async _nmlLoadOnJoin(id, ps) {
    if (!id || !ps) return;
    let rec = null;
    try { rec = await this.state.storage.get(NML_KEY(id)); } catch (e) { rec = null; }
    if (!rec || typeof rec !== 'object') return;
    const s = this._nmlState(ps);
    s.red = clampMs(rec.red);
    s.white = clampMs(rec.white);
    s.whiteBy = s.white > 0 && typeof rec.whiteBy === 'string' ? rec.whiteBy.slice(0, 64) : null;
    s.forfeit = Array.isArray(rec.forfeit) ? rec.forfeit.filter((g) => typeof g === 'string' && g.length <= 64).slice(-NML.FORFEIT_CAP) : [];
    s.savedAt = Date.now();
    if (this._nmlSkullOf(ps)) this.dirtyPlayers.add(id);
  },

  /* gearstash.js: is a claimed piece one this player forfeited? */
  _nmlForfeited(ps, piece) {
    const s = ps && ps._nml;
    if (!s || !Array.isArray(s.forfeit) || !s.forfeit.length || !piece || typeof piece !== 'object') return false;
    return typeof piece.gid === 'string' && s.forfeit.indexOf(piece.gid) >= 0;
  },

  _nmlForfeit(ps, gid) {
    if (typeof gid !== 'string' || !gid) return;
    const s = this._nmlState(ps);
    if (s.forfeit.indexOf(gid) < 0) s.forfeit.push(gid);
    if (s.forfeit.length > NML.FORFEIT_CAP) s.forfeit = s.forfeit.slice(-NML.FORFEIT_CAP);
  },

  /* A piece of gear leaving its owner by death: its provenance row comes
     with it (taken straight out of the ledger -- the sell gate's checks are
     about a piece its owner is choosing to part with, and nobody chooses
     this), and its id is forfeited.  Returns { piece, row } or null. */
  _nmlTakeGear(playerId, ps, slot, piece) {
    if (!piece || typeof piece !== 'object' || GEAR_PROV_SLOTS.indexOf(slot) < 0) return null;
    let row = null;
    const gid = typeof piece.gid === 'string' ? piece.gid : null;
    if (gid && this._gearProvOf) {
      const ledger = this._gearProvOf(playerId);
      const at = ledger && Array.isArray(ledger.list) ? ledger.list.findIndex((r) => r && r.id === gid) : -1;
      if (at >= 0) {
        const r = ledger.list[at];
        ledger.list.splice(at, 1);
        if (this._gearProvSave) this._gearProvSave(playerId, ledger);
        row = { id: r.id, slot: r.slot, src: r.src, at: r.at, p: r.p };
      }
      this._nmlForfeit(ps, gid);
    }
    const clean = { ...piece };
    delete clean.prov;
    return { piece: clean, row };
  },

  /* The death (index.js _handlePlayerDeath, after the duel hook): what No
     man's land takes.  Returns null when it takes nothing, else
     { pile: {recipients, ownerName, ownerOnlyUntil}, lost } -- the pile
     options are for _spawnDeathPile; everything else is already done. */
  _nmlOnDeath(ps, playerId, cause) {
    if (!ps || this._nmlOff()) return null;
    const now = Date.now();
    const killerId = typeof cause === 'string' && cause.startsWith('pvp:') ? cause.slice(4) : null;
    const nmlKill = !!(killerId && ps._nmlLastHitBy === killerId && now - (ps._nmlLastHitAt || 0) <= NML.KILL_BLOW_MS);
    const red = !!(ps._nml && ps._nml.red > 0);
    if (!nmlKill && !red) return null;
    const to = nmlKill ? killerId : null;
    const killerSession = to && this._sessionById ? this._sessionById(to) : null;
    const lost = { weapons: 0, gear: [], worn: [], coins: 0 };
    let n = 0;
    const credit = (kind, payload, note) => {
      if (!to || !this._creditPlayer) return;
      /* one id per piece of this one death (its time and its place in the
         list): a retry of the same credit pays once, never twice */
      const seq = n++;
      try {
        const p = this._creditPlayer(to, { opId: 'nmlloot:' + playerId + ':' + now + ':' + seq, source: 'nml', kind, payload, note });
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (e) { /* the piece is gone either way: a loss, never a duplicate */ }
    };
    /* spare weapons; a red skull's worn ones too */
    const weapons = Array.isArray(ps.weaponStash) ? ps.weaponStash.filter(Boolean) : [];
    ps.weaponStash = [];
    if (red) {
      for (const f of WORN_WEAPONS) {
        if (ps[f]) { weapons.push(ps[f]); lost.worn.push(f); }
        ps[f] = null;
      }
    }
    for (const w of weapons) { credit('weapon', { weapon: w }, 'No man\'s land'); lost.weapons++; }
    /* GEAR -- only what this worker can tell apart (storegear.js §2):
       - armour and legs: every equip reaches the worker (stats_update), so a
         piece WORN is known by its id -- but the stash is adopted at join, so
         one put on since can still sit in it under the SAME id.  That copy is
         the piece on your body: never taken, never forfeited.  A copy with no
         id that matches what you wear is the same question with no id to
         answer it, and is left alone too (taking a real spare is a loss for
         you; giving a stale copy is a second piece for the killer);
       - shields: since v2.3.3091 the game says which shield is on the arm
         (shieldwear.js, shield_wear), so `ps.shield` is the one WORN and
         `ps.shieldStash` the spares, exactly as for armour -- a bag loss
         takes the spares, with the same stale-copy rule.  Only once the game
         has said so this session (`ps._shieldKnown`): a game too old to
         report, or a report the worker could not place, leaves every shield
         (`ps.shield` may still be the old ownership record, quests.js); and
         `shieldwear: false` puts that back too.  A red skull loses them all;
       - cosmetic outfit pieces (gearStash): never -- nothing says which you
         wear, and (v2.3.3091, asked about shields AND outfits) there is
         nothing in them to take: the wardrobe is the T-shirt every player
         may pick (gearCatalog.js GEAR_CATALOG) and the plate's look, which
         follows the armour piece itself -- taken above, as armour.  An
         outfit that can be EARNED joins the spares the same way, with its
         own wear report;
       - the amulet stash: always empty (no unequip flow), a red skull's.
       A piece is taken once (`takenGids`): the worn piece and its stale stash
       copy are one piece. */
    const sigOf = (p) => (p && typeof p === 'object' ? [p.name, p.gearBase, p.tierMult, p.tier].join('|') : '');
    const takenGids = new Set();
    const take = (slot, piece) => {
      if (!piece || typeof piece !== 'object') return;
      const gid = typeof piece.gid === 'string' && piece.gid ? piece.gid : null;
      if (gid) {
        if (takenGids.has(gid)) return;
        takenGids.add(gid);
      }
      const field = GEAR_PROV_FIELD[slot];
      const got = this._nmlTakeGear(playerId, ps, slot, piece);
      if (!got) return;
      lost.gear.push(gid ? { field, gid } : { field, gid: null, sig: sigOf(piece) });
      credit('gear', { field, piece: got.piece, row: got.row }, 'No man\'s land');
    };
    const worn = Object.create(null);
    for (const f of WORN_GEAR) worn[f] = ps[f] && typeof ps[f] === 'object' ? ps[f] : null;
    if (red) {
      /* everything worn first, so its stale stash copies below are the same
         piece already taken */
      for (const f of WORN_GEAR) {
        if (!worn[f]) { ps[f] = null; continue; }
        lost.worn.push(f);
        take(f, worn[f]);
        ps[f] = null;
      }
    }
    /* v2.3.3091: + the spare shields, once the arm is known (shieldwear.js) */
    const shieldsKnown = ps._shieldKnown === true && !(this._shieldWearOff && this._shieldWearOff());
    for (const slot of red ? ['armor', 'legsArmor', 'shield', 'amulet'] : (shieldsKnown ? ['armor', 'legsArmor', 'shield'] : ['armor', 'legsArmor'])) {
      const field = GEAR_PROV_FIELD[slot];
      const list = Array.isArray(ps[field]) ? ps[field] : [];
      const keep = [];
      const w = worn[slot];
      const wGid = w && typeof w.gid === 'string' ? w.gid : null;
      for (const piece of list) {
        if (!piece || typeof piece !== 'object') continue;
        const gid = typeof piece.gid === 'string' && piece.gid ? piece.gid : null;
        const stale = !!w && (gid ? gid === wGid : sigOf(piece) === sigOf(w));
        if (stale) {
          /* the piece you wear (or wore, a red skull's, already taken) */
          if (!red) keep.push(piece);
          continue;
        }
        take(slot, piece);
      }
      ps[field] = keep;
    }
    if (red) {
      /* the gold.  (The amulet forge's gold NUGGETS and BARS are ingredient
         counters of their own with no credit kind to carry them, so they
         stay -- written down in docs/specs/no-mans-land.md.) */
      lost.coins = Math.max(0, Math.floor(Number(ps.coins) || 0));
      ps.coins = 0;
      if (lost.coins) credit('gold', { amount: lost.coins }, 'No man\'s land');
    }
    this._nmlSave(playerId, ps);
    /* tell the victim's game what went, so it clears its own copies */
    const ws = this._wsBySessionId && this._wsBySessionId(playerId);
    if (ws) {
      try {
        ws.send(JSON.stringify({ type: 'nml_loss', payload: {
          by: to ? ((killerSession && killerSession.name) || 'a player') : null,
          red, weapons: lost.weapons, gear: lost.gear, worn: lost.worn,
          coins: lost.coins, bag: true,
        } }));
      } catch (e) { /* the echo still carries the worker's own state */ }
    }
    return {
      lost,
      pile: to
        ? { recipients: [to], ownerName: (killerSession && killerSession.name) || 'Player' }
        : { recipients: [], ownerOnlyUntil: now },   /* the pile wears the dead player's name */
    };
  },
};
