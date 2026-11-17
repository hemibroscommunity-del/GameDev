/* A REPEAT ACTS ONCE -- v2.3.5194 (grand plan step 11.3, step 1; card K PR 9;
 * docs/specs/req-once.md).
 *
 * A request of a player's that moves value carries a request id (`reqId`,
 * SHAPES part 2: made by the page's action door, one tap and every re-send of
 * it).  The worker reads it, ONLY together with the actor's pid (one
 * character's ids never meet another's), and a repeat with the same id acts
 * once and gets the first answer again; the answer echoes it.
 *
 * Where it is remembered (the card's reading):
 *   - in the record the request already writes, in the same put: a market
 *     order (`mkt_order:<id>`.reqId) and a store listing (`store_listing:<id>`.reqId)
 *     carry it, and the bank's `ops` take it as they took the phone's opId:
 *     no new row, and it holds across a restart;
 *   - the chest, the cape's redeem and the daily spin keep their stamp
 *     (`oplog:`), now keyed by the pid with the reqId;
 *   - everything else, and every first ANSWER: in memory for the sitting
 *     (`_reqSeen`, the last KEEP a player, for MEM_MS; heapforget.js ages it
 *     out), a request still running answered by the same promise;
 *   - a lasting stamp row for the requests with no record of their own
 *     (`oplog:rq:<pid>:<reqId>`, pruned with the oplog at 48 h) is built OFF
 *     behind the live flag `reqstamp`: a cost question for the owner (a row a
 *     request: cost-guard holds it at 0 while off).
 *
 * Either side ships first: a request with no reqId is served as today, and
 * the five that read the phone's `opId` (the bank's two, the chest, the cape,
 * the spin) read `reqId` first and `opId` from an older phone.
 *
 * `reqonce: false` in the live flags: no reqId is read (an `opId` still is,
 * as before), nothing is remembered and nothing echoed.
 */
import { WIRE_IN } from './wire/in.js';   /* v2.3.5195: the door's rows, made from the table */

export const REQ_ONCE = Object.freeze({
  KEEP: 32,                 /* the last answers kept a player (the bank's ops are 32 too) */
  MEM_MS: 10 * 60 * 1000,   /* how long a sitting's answer is kept: far past any page's re-send */
  RE: /^[A-Za-z0-9_-]{1,64}$/,   /* SHAPES part 2's form (the wire door's REQ_ID_RE) */
  STAMP: 'oplog:rq:',       /* the lasting stamp, `reqstamp` only */
});

/* v2.3.5195 (card K PR 10): THE DOOR'S WAY.  Every other socket row whose
   `reqId` column is `reqId` (wire/in.js) is held at the wire door
   (wire/door.js _wireDoor): a repeat of an id the player sent before, for
   the sitting, reaches no handler, and is answered with the player's state
   again -- what these rows change (the bag, the purse, the gear).  The rows
   whose handler keeps its own record and answer (5194: the bank's two, the
   chest, the cape, the spin, the auction house's three offers) are left to
   it: REQ_OWN. */
export const REQ_OWN = Object.freeze(new Set(['bank_deposit', 'bank_withdraw', 'chest_open', 'cape_redeem', 'daily_spin', 'store_offer', 'store_offer_cancel', 'store_offer_reply']));
let _doorTypes = null;
export function reqDoorTypes() {
  if (!_doorTypes) _doorTypes = new Set(WIRE_IN.filter((r) => r.wayIn === 'socket' && r.reqId === 'reqId' && !REQ_OWN.has(r.name)).map((r) => r.name));
  return _doorTypes;
}

export const reqOnceMethods = {
  /* The wire door's step (door.js): true when this message is a repeat to
     drop, its answer sent.  The first is remembered BEFORE its handler runs:
     a socket's messages run one at a time (the router awaits each), so its
     repeat finds it, whatever the first's outcome -- a refused first is not
     tried again by its repeat either. */
  _reqOnceDoor(session, msg, ws) {
    if (!session || !session.id || !msg || !reqDoorTypes().has(msg.type)) return false;
    const p = msg.payload && typeof msg.payload === 'object' ? msg.payload : null;
    const rid = this._reqIdOf(p && p.reqId !== undefined ? p.reqId : msg.reqId);
    if (!rid) return false;
    const key = msg.type + ':' + rid;
    if (this._reqRecall(session.id, key) !== undefined) {
      session.reqAgain = (session.reqAgain || 0) + 1;
      const w = ws || (this._wsBySessionId && this._wsBySessionId(session.id));
      /* every field again, not the delta (which would be empty: nothing changed) */
      const sent = session.lastPlayerStateSent && typeof session.lastPlayerStateSent === 'object' ? Object.keys(session.lastPlayerStateSent) : [];
      if (w && this.playerState && this.playerState[session.id] && this._resendPlayerState) { try { this._resendPlayerState(w, session.id, sent); } catch (e) { /* the next state carries it */ } }
      return true;
    }
    this._reqRemember(session.id, key, 1);
    return false;
  },

  _reqOnceOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'reqonce') && !f.reqonce);
  },

  /* the lasting stamp row: OFF unless `reqstamp: true` (the owner's cost
     question), and off with `reqonce: false` (its need) */
  _reqStampOn() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && f.reqstamp === true && f.reqonce !== false);
  },

  /* a request's id in its form, or null (off: always null) */
  _reqIdOf(v) {
    if (this._reqOnceOff()) return null;
    return typeof v === 'string' && REQ_ONCE.RE.test(v) ? v : null;
  },

  /* this sitting's answer to (pid, rid), or undefined */
  _reqRecall(pid, rid, now) {
    if (!pid || !rid || !this._reqSeen) return undefined;
    const list = this._reqSeen.get(pid);
    if (!list) return undefined;
    const t = Number(now) || Date.now();
    const e = list.find((x) => x.id === rid && t - x.ts < REQ_ONCE.MEM_MS);
    return e ? e.answer : undefined;
  },

  /* keep (pid, rid)'s answer for the sitting: the last KEEP a player */
  _reqRemember(pid, rid, answer, now) {
    if (!pid || !rid) return;
    if (!this._reqSeen) this._reqSeen = new Map();   /* keyed by a pid off the wire: a Map (rule 4) */
    let list = this._reqSeen.get(pid);
    if (!list) { list = []; this._reqSeen.set(pid, list); }
    const at = list.findIndex((x) => x.id === rid);
    if (at >= 0) list.splice(at, 1);
    list.push({ id: rid, ts: Number(now) || Date.now(), answer });
    if (list.length > REQ_ONCE.KEEP) list.splice(0, list.length - REQ_ONCE.KEEP);
  },

  _reqForget(pid, rid) {
    const list = this._reqSeen && this._reqSeen.get(pid);
    if (!list) return;
    const at = list.findIndex((x) => x.id === rid);
    if (at >= 0) list.splice(at, 1);
  },

  /* An answer echoes the id it answers (a plain object only). */
  _reqEcho(answer, rid) {
    return rid && answer && typeof answer === 'object' && !Array.isArray(answer) ? { ...answer, reqId: rid } : answer;
  },

  /* THE ROUTES' WAY (the market's and the store's): `run()` once for
     (pid, rid), its answer kept and echoed.  A repeat while the first still
     runs waits for the same answer; a repeat after it gets it again.  A
     first that threw is forgotten (nothing acted, as far as this knows:
     the repeat runs).  With `reqstamp`, a repeat the sitting has forgotten
     (a restart) and whose stamp is on file answers `repeat: true` -- only
     for a request with no record of its own (`opts.record`: the order or
     listing it made answers instead, and no stamp is written). */
  async _reqOnce(pid, rid, run, opts) {
    const stamp = this._reqStampOn() && !(opts && opts.record);
    if (!pid || !rid) return run();
    const seen = this._reqRecall(pid, rid);
    if (seen !== undefined) return this._reqEcho(await seen, rid);
    if (stamp) {
      let st;
      try { st = await this.state.storage.get(REQ_ONCE.STAMP + pid + ':' + rid); } catch (e) { st = undefined; }
      if (st !== undefined) return { ok: true, settled: true, repeat: true, reqId: rid };
      const again = this._reqRecall(pid, rid);   /* a first that began during the read */
      if (again !== undefined) return this._reqEcho(await again, rid);
    }
    let p;
    try { p = Promise.resolve(run()); } catch (e) { p = Promise.reject(e); }
    this._reqRemember(pid, rid, p);
    let answer;
    try { answer = await p; } catch (e) { this._reqForget(pid, rid); throw e; }
    this._reqRemember(pid, rid, answer);
    if (stamp && answer && answer.ok) {
      try { await this.state.storage.put(REQ_ONCE.STAMP + pid + ':' + rid, Date.now()); } catch (e) { /* the sitting's memory still holds it */ }
    }
    return this._reqEcho(answer, rid);
  },
};
