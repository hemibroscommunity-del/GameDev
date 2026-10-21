/* ═══ v2.3.3539: A REAL REST, AND THE HOTEL OPENS ═══
 *
 * The owner, 2026-10-21: "I value SIMPLICITY and INTELLIGIBILITY" -- item 5 of
 * the after-review list agreed with the outside evaluation.  The farm's bed
 * promised "Restore All + Well Rested Buff" (+10% XP for 30 minutes), and the
 * Hotel stood shut because of it (src/data/wheelBuildingDoors.js
 * WHEEL_SHUT_DOORS): the bed's rest happened on the phone alone.  BroTown.jsx
 * set its own HP, stamina and mana, which the worker's next echo put back,
 * and a timer that only the phone's own retired XP popups read.  The +10% was
 * never paid.
 *
 * Now the worker pays the rest:
 *   - `rest_request {where}`: 'hotel' (within REST.HOTEL_R of the Hotel's
 *     door, in the Wheel) or 'farm' (on your farm, farm_home: it is yours,
 *     and its bed is where the button is).  Refused when dead, in a fight (a
 *     blow dealt or taken in the last REST.QUIET_MS, or a fight with a
 *     player), or within REST.GAP_MS of the last rest.
 *   - it fills HP, stamina and mana and starts WELL RESTED,
 *     `_buffs.wellRested`, for REST.MS (30 minutes): +10% of the XP a fight
 *     pays (prog3.js _prog3AwardXp, beside the Pumpkin Pie's: the two add, so
 *     both is +20%), never the flat awards (a quest's XP).  A rest while Well
 *     Rested starts its half hour again.  (Not `_buffs.rest`, the Herb
 *     Bread's half hour of double healing.)  A meal or a brew never clears
 *     it (cooking.js _clearBuffSlot names its own keys), and a death keeps
 *     it, as it keeps a meal.
 *   - saved and echoed (player_state carries _buffs), and answered
 *     `rest_result {ok, until, ms}` or `{ok: false, err}` (PRIVILEGED).
 * Free: the Hotel is in town and the bed on your own farm, so a rest costs
 * the walk back, never gold.  Nothing new is stored: the timer lives in
 * _buffs, which every save already writes.
 *
 * `rest: false` in the live flags un-advertises it (caps.rest: the Hotel
 * stays shut and the farm's bed rests on the phone as before), rests nobody
 * and pays no Well Rested XP.
 */

const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

export const REST = Object.freeze({
  /* Well Rested lasts half an hour: what the farm's bed always promised */
  MS: 30 * 60 * 1000,
  /* +10% of a fight's XP while it lasts */
  XP: 0.10,
  /* The Hotel's door (the foot of its steps), game px from the Wheel's
     middle.  The town is the same ground on both Wheels (race.js), so one
     offset serves either; tools/world/test-world-core.mjs holds it to the
     door the ground worker places for the Hotel. */
  HOTEL: Object.freeze([436, 925.5]),
  /* How near the door counts, from your middle (the worker's x, y).  The
     phone's Enter button comes up within 140 px of your BOOTS, ~52 px below
     your middle (WHEEL_DOOR_REACH), and a steady walk is sent a beat late
     (moveDiet.js); the Hotel's neighbours' doors are 600+ px away. */
  HOTEL_R: 260,
  /* No rest within this long of a blow dealt or taken: the fight window the
     one-bite rule uses (data.js PVP_HEAL.WINDOW_MS) */
  QUIET_MS: 10000,
  /* One rest a minute at most: each rest is one saved row (cost-guard), and
     nobody honest rests twice in a minute */
  GAP_MS: 60000,
});

export const restMethods = {
  /* The kill switch, the house way (race.js _raceOff) */
  _restOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && has(f, 'rest') && !f.rest);
  },

  /* What Well Rested adds to a fight's XP multiplier right now: REST.XP while
     it runs, else 0 (prog3.js _prog3AwardXp) */
  _restXpBonus(ps) {
    if (!ps || this._restOff()) return 0;
    return this._buffActive && this._buffActive(ps, 'wellRested') ? REST.XP : 0;
  },

  _restSend(pid, payload) {
    const ws = this._wsBySessionId(pid);
    if (!ws) return;
    try { ws.send(JSON.stringify({ type: 'rest_result', payload })); } catch (e) { /* the rest stands */ }
  },

  /* In a fight: a fight with a player (a duel, or a hit between players in
     the one-bite window: cooking.js _pvpInFight), or any blow dealt or taken
     in the last QUIET_MS -- whatever the one formula's switch says, since a
     rest is never a heal mid-fight */
  _restInFight(pid, ps, now) {
    if (typeof this._pvpInFight === 'function' && this._pvpInFight(pid, ps, now)) return true;
    const last = Math.max(Number(ps.lastDamageAt) || 0, Number(ps._lastDealtAt) || 0);
    return last > 0 && now - last < REST.QUIET_MS;
  },

  /* Are you where you say you rest? */
  _restPlaceOk(ps, where) {
    if (where === 'farm') return ps.z === 'farm_home';
    if (where !== 'hotel' || ps.z !== 'wheel') return false;
    if (typeof ps.x !== 'number' || typeof ps.y !== 'number') return false;
    const T = typeof this._wheelT === 'function' ? this._wheelT() : null;
    const c = T && Array.isArray(T.WHEEL_CENTRE) ? T.WHEEL_CENTRE : null;
    if (!c) return false;
    return Math.hypot(ps.x - (c[0] + REST.HOTEL[0]), ps.y - (c[1] + REST.HOTEL[1])) <= REST.HOTEL_R;
  },

  /* rest_request {where} -- 'hotel' or 'farm'.  Answers rest_result. */
  _handleRest(session, payload) {
    if (!session || !session.id) return null;
    const pid = session.id;
    const answer = (p) => { this._restSend(pid, p); return p; };
    if (this._restOff()) return answer({ ok: false, err: 'off' });
    const ps = this.playerState[pid];
    if (!ps || ps.dying || ps.dead || ps.disconnected) return null;
    const where = payload && typeof payload.where === 'string' ? payload.where : '';
    if (!this._restPlaceOk(ps, where)) return answer({ ok: false, err: 'where' });
    const now = Date.now();
    if (this._restInFight(pid, ps, now)) return answer({ ok: false, err: 'fight' });
    /* in memory only: a reconnect lets one rest through early, which costs a
       row and nothing else */
    if (ps._restAt && now - ps._restAt < REST.GAP_MS) {
      return answer({ ok: false, err: 'soon', wait: REST.GAP_MS - (now - ps._restAt) });
    }
    ps._restAt = now;
    if (typeof ps.maxHp === 'number') ps.hp = ps.maxHp;
    if (typeof ps.maxStamina === 'number') ps.stamina = ps.maxStamina;
    if (typeof ps.maxMana === 'number') ps.mana = ps.maxMana;
    if (!ps._buffs || typeof ps._buffs !== 'object') ps._buffs = {};
    ps._buffs.wellRested = now + REST.MS;
    this._saveRpg(pid, ps);
    const ws = this._wsBySessionId(pid);
    if (ws) this._sendPlayerState(ws, pid);
    return answer({ ok: true, until: ps._buffs.wellRested, ms: REST.MS, where });
  },
};
