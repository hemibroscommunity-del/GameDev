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
  /* ═══ v2.3.2875: AND ARMOUR ═══
     Owner: "add armor to the admin button (in the give weapons) so I can
     actually test it."  The two sets the game really mints -- the quest's
     copper (data.js tut quests) and the drop table's iron (data.js
     ARMOR_DROPS) -- with their own names, metals and tiers, for the same
     reason as the weapons above: a made-up piece is a piece no player can
     have.  Iron is tier 2, the last one ARMOR_FREE_TIERS lets anyone wear, so
     every piece here can be put on straight away. */
  ARMOR: [
    { kind: 'armor', name: 'Copper Torso', mat: 'copper', tierMult: 1.0 },
    { kind: 'legs', name: 'Copper Greaves', mat: 'copper', tierMult: 1.0 },
    { kind: 'armor', name: 'Iron Torso', mat: 'iron', tierMult: 2.0 },
    { kind: 'legs', name: 'Iron Greaves', mat: 'iron', tierMult: 2.0 },
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
    const out = { weapons: 0, armor: 0, levels: {} };

    if (want === 'all' || want === 'weapons') {
      for (const w of DEVKIT.WEAPONS) {
        try { if (this._grantQuestItem(ps, w, playerId)) out.weapons++; } catch (e) { /* a full stash is not fatal */ }
      }
      /* ═══ v2.3.2421: AND CLEAR WHAT DID NOT FIT ═══
         v2.3.2420 made _grantQuestItem park a weapon it cannot place on
         ps._questWeaponUnfit for the QUEST handlers to drain through
         _creditPlayer. This caller is not a quest handler and never drains,
         so on a full stash the dev kit would leave its rejects sitting on the
         scratch -- and the player's NEXT quest turn-in would drain them and
         pay them out as that quest's reward, under that quest's opIds. A dev
         tool would be minting real weapons into a real inbox, and shifting
         the quest's own occurrence counters while it did.

         Cleared rather than drained on purpose: "a full stash is not fatal"
         is this kit's existing contract, an operator can simply ask again
         after freeing a slot, and a debug affordance has no business writing
         to the idempotency journal that real payouts converge on. */
      ps._questWeaponUnfit = null;
    }
    if (want === 'all' || want === 'armor') {
      /* v2.3.2875: through _grantQuestItem, the path a quest's armour reward
         takes -- minted into the provenance ledger (gear_prov:, src 'quest'),
         parked on `_questGrantOverflow`, and announced to the client as
         `quest_reward_stashed`, which puts each piece in the bag (armour
         stashes are client-held; the server adopts them on the next join).
         The scratch is DRAINED here and cleared, for the v2.3.2421 reason:
         left on it, the player's next quest turn-in would announce these
         pieces again as that quest's reward. */
      ps._questGrantOverflow = null;
      for (const a of DEVKIT.ARMOR) {
        try { this._grantQuestItem(ps, a, playerId); } catch (e) { /* one bad piece must not stop the rest */ }
      }
      const over = Array.isArray(ps._questGrantOverflow) ? ps._questGrantOverflow : [];
      ps._questGrantOverflow = null;
      const ws = t.ws || this._wsBySessionId(playerId);
      for (const piece of over) {
        if (!ws) break;
        try { ws.send(JSON.stringify({ type: 'quest_reward_stashed', payload: { questId: 'devkit', item: piece } })); out.armor++; } catch (e) { /* best effort */ }
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

  /* ═══ v2.3.2277: FINISH EVERY QUEST ═══
   *
   * Owner: "starting fresh with new characters forces me to go through the
   * tutorial to access zones that I usually need to playtest in ... Having the
   * finish all quests button will be good in that mode."
   *
   * It has to be a SERVER op.  The worker is the only durable writer of
   * ps._quests and its player_state echo overwrites whatever the client
   * believes, so a client-side "mark them done" is undone by the next tick.
   * And it has to be on the /api/admin HTTP road rather than a websocket
   * message: server/test/mirror-audit.test.mjs asserts there is no
   * `case 'dev...':` in the message switch and no channel.send in DevPanel,
   * and devtools.test.mjs forges five such messages and asserts nothing
   * happens.  Those pins are the reason a dev tool cannot be forged by a
   * player in the shared room, so they are not obstacles to route around.
   *
   * THE QUEST IDS COME FROM THE SERVER'S OWN TABLE, never from the request
   * body.  A body-supplied id would be a client-supplied map key, which is
   * CLAUDE.md rule 4 and three separate '__proto__' incidents; iterating
   * QUEST_REWARDS sidesteps the question rather than guarding it.
   *
   * IT PAYS NO REWARDS, deliberately.  The point is to clear the gates and
   * empty the quest log, not to mint items -- and minting a full quest line's
   * worth of gear into a live shared economy from a debug button is a
   * different feature with different consequences.  /dev/kit is the one that
   * hands out equipment, and it says so. */
  _devFinishQuests(playerId, body) {
    const t = this._devTarget(playerId);
    if (!t) return { ok: false, error: 'player not online' };
    const ps = t.ps;
    if (!ps._quests) ps._quests = Object.create(null);   /* rule 4 */
    const table = this._QUEST_REWARDS_DATA();
    const finished = [];
    /* v2.3.3121: `except`, a quest-id prefix left as it is -- 'beast_' keeps
       Beastmaster Bro's line for mp-beastmaster to play from its start */
    const except = body && typeof body.except === 'string' && body.except ? body.except : null;
    for (const qid of Object.keys(table)) {
      if (except && qid.startsWith(except)) continue;
      if (ps._quests[qid] === 'turnedIn') continue;
      ps._quests[qid] = 'turnedIn';
      finished.push(qid);
    }
    this._devPush(playerId, ps);
    /* 'turnedIn' satisfies the zone gate the same way 'active' does, so this
       opens the gated zones as a side effect -- reported rather than assumed,
       because "finish quests" and "open zones" are two different asks and the
       owner should not have to guess which button did what. */
    return { ok: true, finished: finished.length, quests: finished, total: Object.keys(table).length };
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
    /* v2.3.3006: a stamina level to test against -- a sprint running dry
       (mp-sprint) in two seconds rather than nine.  After the heal, so
       `{ stamina: 20 }` alone is "healed, with 20 stamina". */
    if (typeof o.stamina === 'number' && Number.isFinite(o.stamina) && typeof ps.maxStamina === 'number') {
      ps.stamina = Math.max(0, Math.min(ps.maxStamina, o.stamina));
      out.stamina = ps.stamina;
    }
    /* v2.3.3058: an HP level the same way -- a No man's land kill (mp-nomansland)
       in one blow rather than a dozen.  Never 0: a death is the game's to
       make, through _handlePlayerDeath, not a number set here. */
    if (typeof o.hp === 'number' && Number.isFinite(o.hp) && typeof ps.maxHp === 'number') {
      ps.hp = Math.max(1, Math.min(ps.maxHp, Math.floor(o.hp)));
      out.hp = ps.hp;
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

  /* ═══ v2.3.3016: END THE WAVE YOU STAND IN ═══
     For the QA scenario of the Wheel's dungeons (mp-wheeldungeon): three
     waves and a boss of a land's monsters take a real fight minutes a run on
     a test box drawing a few frames a second.  Every live monster of the
     dungeon the player stands in dies where it is -- no kill credit, no loot:
     the run's own tick (dungeon.js _tickDungeons) brings the next wave, the
     boss or the clear exactly as a fight would.  ADMIN_KEY-gated like every
     dev op; nothing outside a dungeon: a player in no instance gets ok:false. */
  _devClearWave(playerId) {
    const ps = this.playerState[playerId];
    const z = ps && ps.z;
    if (!z || !/^dungeon:/.test(z) || !Array.isArray(this.monsters[z])) return { ok: false, error: 'not in a dungeon' };
    let cleared = 0;
    for (const m of this.monsters[z]) {
      if (!m.alive) continue;
      m.alive = false;
      m.hp = 0;
      m.respawnAt = 0;
      this._markMonsterDirty(z, m.id);
      cleared++;
    }
    return { ok: true, zone: z, cleared };
  },

  /* ═══ v2.3.3120: PET TRAPPING'S TEST LEVERS (trapping.js) ═══
     At 1% at best, looking at a catch means a hundred kills -- so, for the
     owner's test kit and the QA scenario (mp-trapping), the levers a catch
     needs, on this same admin-key surface (no new socket message):
       level   set the player's Trapping level (1-120);
       traps   set the box traps in the bag; logs: pine logs, for the Traps tab;
       next    'catch' or 'miss': the player's NEXT roll is that, whatever the
               odds (in memory, one roll, gone on a deploy -- trapping.js
               `_trapForced`); never stored, never on the wire;
       kill    a monster id in the player's zone: killed with all of its damage
               the player's, through the real kill path (_resolveMonsterKill), so
               the trap springs exactly as a real kill springs it. */
  _devTrapping(playerId, body) {
    const t = this._devTarget(playerId);
    if (!t) return { ok: false, error: 'player not online' };
    const ps = t.ps;
    const b = body || {};
    const out = { ok: true };
    const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.floor(Number(v) || 0)));
    if (!ps.lifeSkills || typeof ps.lifeSkills !== 'object') ps.lifeSkills = {};
    if (!ps.inventory || typeof ps.inventory !== 'object') ps.inventory = {};
    if (b.level != null) { const L = clampInt(b.level, 1, 120); ps.lifeSkills.trapping = { level: L, xp: 0 }; out.level = L; }
    if (b.traps != null) { const n = clampInt(b.traps, 0, 999); if (n > 0) ps.inventory.trap_box = n; else delete ps.inventory.trap_box; out.traps = n; }
    if (b.logs != null) { const n = clampInt(b.logs, 0, 999); if (n > 0) ps.inventory.wood_pine_log = n; else delete ps.inventory.wood_pine_log; out.logs = n; }
    if (b.next === 'catch' || b.next === 'miss') {
      if (!(this._trapForced instanceof Map)) this._trapForced = new Map();
      this._trapForced.set(playerId, b.next);
      out.next = b.next;
    }
    if (typeof b.kill === 'string' && b.kill) {
      const m = (this.monsters[ps.z] || []).find((x) => x && x.id === b.kill);
      if (!m || !m.alive) { out.ok = false; out.error = 'no such live monster in your zone'; }
      else {
        /* v2.3.3121: `xp`, what this one kill pays in combat XP -- a pet's
           level-up (a tenth of it) in one kill rather than twenty-five
           (mp-beastmaster).  Put back after, unless the death is deferred (a
           slime's swell pays at its blast). */
        const keepXp = m.xp;
        if (b.xp != null) m.xp = clampInt(b.xp, 1, 1000000);
        m.dmgByPlayer = Object.create(null);
        m.dmgByPlayer[playerId] = m.maxHp || 1;
        m.hp = 0;
        this._resolveMonsterKill(ps.z, m, playerId, ps, 'dev');
        if (b.xp != null && !(m._burstUntil > Date.now())) m.xp = keepXp;
        out.killed = m.id;
      }
    }
    this._devPush(playerId, ps);
    return out;
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
    else if (path === '/dev/quests') result = this._devFinishQuests(playerId, body);   /* v2.3.2277; v2.3.3121: + except */
    else if (path === '/dev/clearwave') result = this._devClearWave(playerId);   /* v2.3.3016 */
    else if (path === '/dev/trapping') result = this._devTrapping(playerId, body);   /* v2.3.3120 */
    else return null;

    /* Same audit trail as every other mutating admin op: the owner can see
       what a session did to a character from /api/admin/log. */
    await this._adminLog({ op: path.slice(1), playerId, payload: body, result });
    return json(result, result.ok ? 200 : 404);
  },
};
