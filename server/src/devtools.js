/* ═══ v2.3.2240: THE OWNER'S TEST KIT ═══
 *
 * Owner: "Is there a test suite you can build that allows me to test features
 * directly without needing to play through the quest line?  Having to play
 * through slows down development greatly."
 *
 * The problem is real and measurable.  The fire trail (v2.3.2238) lives in
 * ember; ember is gated behind tut_4; tut_4 is the fourth link of a chain
 * that runs through three other zones.  So the only way to LOOK at a new
 * ember mechanic on a phone was to replay the tutorial, and a feature you
 * cannot look at is a feature you cannot judge.  The headless harness could
 * reach it, but the harness reports to a session, not to the owner's hand.
 *
 * ── WHAT THIS IS, AND WHAT IT DELIBERATELY IS NOT ────────────────────────
 * It is FOUR operations on the EXISTING operator HTTP surface (admin.js):
 * unlock the zone gates, hand over a kit, top the bars up, and stop taking
 * damage.  Nothing else.
 *
 * IT ADDS NO NEW CLIENT->SERVER WEBSOCKET MESSAGE, and that is the whole
 * security argument rather than a detail.  The socket is deny-by-default
 * (CLAUDE.md wire section) precisely because anything a client can SAY, a
 * cheater can say too; a `dev_warp` message would be exactly the forgeable
 * lever that list exists to prevent.  These are HTTP calls carrying the
 * ADMIN_KEY bearer token, so the panel in the client bundle is inert
 * scaffolding for anyone who does not have the owner's secret -- the same
 * posture as every other admin route, including the fail-closed 404 when no
 * key is configured at all.
 *
 * THERE IS NO WARP ENDPOINT, on purpose.  A server-side teleport was the
 * obvious shape and it is the wrong one twice over: the zone-entry sequence
 * (spawn monsters, spawn nodes, re-scale population, stamp the entry grace,
 * send the snapshot on both protocol versions, replay the fire trail, clear
 * stale entities for a safe zone) lives inside _handleMove, so a second
 * caller means either duplicating eight obligations or refactoring a
 * load-bearing path for a dev tool; and the CLIENT owns `S.currentZone`, so
 * a server that moved the player without being asked would leave the browser
 * rendering the zone it thinks it is still in.  Once the gate is open, the
 * ORDINARY move the client already sends does all of it correctly.  So
 * "warp" is: unlock here, then let the client walk through the front door.
 *
 * GOD MODE IS IN-MEMORY AND EXPIRES.  It rides `ps._godUntil`, a timestamp
 * on playerState and never on the persisted rpg blob (handoff rule 1), so it
 * dies on reconnect, on a deploy, and on its own timer.  There is no way to
 * leave it on by accident and no way for it to end up in a save file.  It
 * reuses the exact short-circuit shape `_zoneEntryGraceUntil` already has in
 * _applyDamage rather than inventing a second immunity mechanism.
 */
import { QUEST_ZONE_GATE } from './movement.js';

export const DEVKIT = {
  /* The tutorial's own starter weapons -- copper/pine/pine.  Deliberately
     the literals data.js already grants rather than invented ones: a
     weaponType or tierKey this repo does not have would be sanitised into
     something subtly wrong, and a dev tool that hands you a broken item is
     worse than one that hands you nothing. */
  WEAPONS: [
    { kind: 'weapon', weaponType: 'greatsword', tierKey: 'copper', name: 'Test Great Sword' },
    { kind: 'weapon', weaponType: 'bow', tierKey: 'pine', name: 'Test Bow' },
    { kind: 'weapon', weaponType: 'staff', tierKey: 'pine', name: 'Test Staff' },
  ],
  /* Levels are awarded through _prog3AwardXp with {flat:true} -- the SAME
     path a real kill uses, so the level-ups mint allocation points, cross
     milestones, recompute maxes and notify the client exactly as earned ones
     do.  Writing prog3 internals by hand would have produced a character in
     a state the real game can never reach, which is the classic way a dev
     tool starts reporting bugs that do not exist. */
  XP_PER_PRESS: 40000,
  GOD_MINUTES_MAX: 120,
  GOD_MINUTES_DEFAULT: 20,
};

export const devToolsMethods = {
  /* Every op needs the live player; some also need their socket. */
  _devTarget(playerId) {
    const ps = playerId ? this.playerState[playerId] : null;
    return ps ? { ps, ws: this._wsBySessionId(playerId) || null } : null;
  },

  /* Push the change to the player's own screen straight away.  Without this
     the panel says "done" and the game looks unchanged until the next tick
     that happens to mark them dirty, which reads as the button not working. */
  _devPush(playerId, ps) {
    this._saveRpg(playerId, ps);
    const ws = this._wsBySessionId(playerId);
    if (ws) this._sendPlayerState(ws, playerId);
    this.dirtyPlayers.add(playerId);
  },

  /* ═══ UNLOCK THE ZONE GATES ═══
     Derived from QUEST_ZONE_GATE, the same table _zoneUnlocked reads, so it
     cannot drift: a quest that starts gating a zone tomorrow is unlocked by
     this tomorrow, with no edit here.

     Sets 'active', NOT 'turnedIn'.  'active' is all _zoneUnlocked asks for,
     and it is the honest state -- marking a quest COMPLETE would hand over
     its rewards' worth of progress, rewrite the tutorial's dialogue state,
     and quietly make the owner's save unrepresentative of the players she is
     testing for. */
  _devUnlockZones(playerId) {
    const t = this._devTarget(playerId);
    if (!t) return { ok: false, error: 'player not online' };
    const ps = t.ps;
    if (!ps._quests) ps._quests = Object.create(null);   /* rule 4 */
    const opened = [];
    for (const [zone, qids] of QUEST_ZONE_GATE) {
      const already = qids.some((q) => ps._quests[q] === 'active' || ps._quests[q] === 'turnedIn');
      if (already) continue;
      /* The first quest that names the zone is enough to open it. */
      ps._quests[qids[0]] = 'active';
      opened.push(zone);
    }
    this._devPush(playerId, ps);
    return { ok: true, opened, zones: [...QUEST_ZONE_GATE.keys()] };
  },

  /* ═══ KIT + LEVELS ═══ */
  _devKit(playerId, opts) {
    const t = this._devTarget(playerId);
    if (!t) return { ok: false, error: 'player not online' };
    const ps = t.ps;
    const want = (opts && opts.what) || 'all';
    const out = { weapons: 0, levels: {} };

    if (want === 'all' || want === 'weapons') {
      for (const w of DEVKIT.WEAPONS) {
        try { if (this._grantQuestItem(ps, w)) out.weapons++; } catch (e) { /* a full stash is not fatal */ }
      }
    }
    if (want === 'all' || want === 'levels') {
      /* Only for a prog3 character; a legacy save has no trained skills to
         award into and silently doing nothing is better than half-writing a
         progression shape this build does not own. */
      if (ps.prog3 && ps.prog3.sk) {
        for (const cat of ['sword', 'bow', 'staff']) {
          const before = ps.prog3.sk[cat] ? ps.prog3.sk[cat].level : 0;
          this._prog3AwardXp(playerId, ps, cat, DEVKIT.XP_PER_PRESS, { flat: true });
          const after = ps.prog3.sk[cat] ? ps.prog3.sk[cat].level : 0;
          out.levels[cat] = { before, after };
        }
      } else {
        out.levels = 'skipped: not a prog3 character';
      }
    }
    this._devPush(playerId, ps);
    return { ok: true, ...out };
  },

  /* ═══ VITALS: refill, and optionally stop taking damage ═══ */
  _devVitals(playerId, opts) {
    const t = this._devTarget(playerId);
    if (!t) return { ok: false, error: 'player not online' };
    const ps = t.ps;
    const o = opts || {};
    const out = {};

    if (o.heal !== false) {
      this._recomputeMaxes(ps);
      ps.hp = ps.maxHp;
      if (typeof ps.maxStamina === 'number') ps.stamina = ps.maxStamina;
      if (typeof ps.maxMana === 'number') ps.mana = ps.maxMana;
      ps.dead = false; ps.dying = false;
      out.healed = { hp: ps.hp, stamina: ps.stamina, mana: ps.mana };
    }

    if (o.god !== undefined) {
      if (o.god) {
        /* Bounded on purpose: a dev immunity with no end is the one that
           gets left on, and this one cannot be seen in any UI the owner
           looks at while playing. */
        const mins = Math.max(1, Math.min(DEVKIT.GOD_MINUTES_MAX,
          Number(o.godMinutes) || DEVKIT.GOD_MINUTES_DEFAULT));
        ps._godUntil = Date.now() + mins * 60000;
        out.god = { until: ps._godUntil, minutes: mins };
      } else {
        ps._godUntil = 0;
        out.god = false;
      }
    }
    this._devPush(playerId, ps);
    return { ok: true, ...out };
  },

  /* What the panel shows: the truth from the server, so a button that did
     nothing cannot look like it worked. */
  _devState(playerId) {
    const t = this._devTarget(playerId);
    if (!t) return { ok: false, error: 'player not online' };
    const ps = t.ps;
    const q = ps._quests || {};
    const zones = {};
    for (const [zone, qids] of QUEST_ZONE_GATE) {
      zones[zone] = qids.some((k) => q[k] === 'active' || q[k] === 'turnedIn');
    }
    return {
      ok: true,
      zone: ps.z,
      hp: ps.hp, maxHp: ps.maxHp,
      god: !!(ps._godUntil && Date.now() < ps._godUntil),
      godMsLeft: ps._godUntil ? Math.max(0, ps._godUntil - Date.now()) : 0,
      zones,
      charLevel: (ps.prog3 && ps.prog3.sk)
        ? ['sword', 'bow', 'staff'].reduce((s, k) => s + ((ps.prog3.sk[k] && ps.prog3.sk[k].level) || 0), 0)
        : null,
    };
  },

  /* Routed from _adminFetch, so auth, the fail-closed 404 and the audit log
     are all inherited rather than re-implemented.  Returns null when the
     path is not ours, so the caller falls through to its own 404. */
  async _devFetch(request, path, json) {
    if (!path.startsWith('/dev/')) return null;
    if (request.method === 'GET' && path === '/dev/state') {
      const url = new URL(request.url);
      const playerId = url.searchParams.get('id');
      if (!playerId) return json({ ok: false, error: 'id required' }, 400);
      const r = this._devState(playerId);
      return json(r, r.ok ? 200 : 404);
    }
    if (request.method !== 'POST') return null;

    const body = await request.json().catch(() => ({}));
    const playerId = body && body.playerId;
    if (!playerId) return json({ ok: false, error: 'playerId required' }, 400);

    let result = null;
    if (path === '/dev/unlock') result = this._devUnlockZones(playerId);
    else if (path === '/dev/kit') result = this._devKit(playerId, body);
    else if (path === '/dev/vitals') result = this._devVitals(playerId, body);
    else return null;

    /* Same audit trail as every other mutating admin op: the owner can see
       what a session did to a character from /api/admin/log. */
    await this._adminLog({ op: path.slice(1), playerId, payload: body, result });
    return json(result, result.ok ? 200 : 404);
  },
};
