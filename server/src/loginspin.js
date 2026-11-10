/* ═══ v2.3.4295: THE LOGIN WHEEL -- one free spin a day for the ACCOUNT ═══
 *
 * Owner, 2026-11-05: "I added a 'free daily spin' you can see the gold
 * amounts on the wheel ... This will be once you login to the game for the
 * day. One per account (one account meaning one account that holds 10
 * characters - not each character)."  And: "I just added a double or nothing
 * feature if you win" / "Keep the double or nothing going until user chooses
 * yes or no. Let them do it as many times as they want."
 *
 * ODDS = THE ART.  The wheel's segments are unequal on purpose and the weights
 * are exactly their angles, measured off the picture
 * (assets/ui/daily-spin/wheel-bulbs.png, degrees clockwise from the top):
 * 100 Gold 176.4 deg (49.0%), 200 82.8 (23.0%), 300 50.0 (13.9%), 500 25.8
 * (7.2%), 1,000 16.1 (4.5%), 10K 8.9 (2.5%).  An average spin pays about 464
 * gold.  src/game/loginSpinWheel.js holds the same table (loginspin.test).
 *
 * THE ACCOUNT is the DEVICE: it holds up to ten characters
 * (src/networking/charRoster.js), and the join already carries its id
 * (devicelock.js cleanDevice).  The record `lspin:<acct>` = {day, pid, idx,
 * base, pot, k, open, paid, nm, lv} (v2.3.4381: `nm`, `lv` the spinner's name
 * and level, for the spin boards' row of a pot paid after they left) says which UTC day (dailyrewards.js dayOf -- the
 * same boundary as every daily thing) was spun, by which character, and the
 * POT the account holds.  The gold goes to the character that spun.  A join
 * with no device id falls back to the character itself.
 *
 * THE POT AND DOUBLE OR NOTHING.  The spin lands on a prize, which is only a
 * POT held in the record (money at rest: a deploy loses nothing).  The player
 * may DOUBLE it -- a fair 50/50 the worker rolls, double or nothing -- as many
 * times as they like, or COLLECT.  Each round is named by its index `k`
 * (`loginspin_double {k}`): a double tap or a replay names a round already
 * played and is only answered again, never rolled again.  A pot that one more
 * double would carry past POT_MAX (the daily spin's house limit, 100,000) is
 * paid by itself.  An open pot is COLLECTED, never lost, when the player
 * leaves: after IDLE_MS with no move, and at the next ask of ANY character of
 * the account (every login asks).  Doubling is a fair coin, so it never
 * changes what the spin pays on average, it only spreads it.
 *
 * ORDER (handoff rules 5, 7, 10).  Every step is checked, rolled and stamped
 * in the record in one synchronous run, the record is saved, and only then is
 * the client told.  Paying: `open` is cleared and saved FIRST, then the gold
 * is credited through _creditPlayer under the opId `loginspin:<acct>:<day>`
 * (the oplog's 'dup' makes a second pay impossible), then `paid` is saved.  A
 * crash between leaves paid:false: the next ask pays it (same opId).
 *
 * KILL SWITCH `loginspin: false` in the live flags: un-advertises
 * caps.loginspin and refuses every ask.  Deploy order: the client gates the
 * window on the cap, so either side may ship first. */
import { cleanDevice } from './devicelock.js';
import { dayOf } from './dailyrewards.js';

export const LOGIN_SPIN = Object.freeze({
  KEY: 'lspin:',
  POT_MAX: 100000,     /* the daily spin's house limit (dailyrewards.js SPIN.POT_MAX): a double past it is not offered */
  IDLE_MS: 90000,      /* an open pot with no move for this long is collected */
  /* [coins, from, to] in degrees clockwise from the top of the art; the
     weights ARE the spans. */
  SEGS: Object.freeze([
    Object.freeze({ coins: 100, from: 4.2, to: 180.6 }),
    Object.freeze({ coins: 200, from: 180.6, to: 263.4 }),
    Object.freeze({ coins: 300, from: 263.4, to: 313.4 }),
    Object.freeze({ coins: 500, from: 313.4, to: 339.2 }),
    Object.freeze({ coins: 1000, from: 339.2, to: 355.3 }),
    Object.freeze({ coins: 10000, from: 355.3, to: 364.2 }),
  ]),
});

/* The segment a roll r in [0, 1) lands on. */
export function loginSpinPick(r) {
  const S = LOGIN_SPIN.SEGS;
  let x = Math.max(0, Math.min(0.999999999, Number(r) || 0)) * 360;
  for (let i = 0; i < S.length; i++) {
    x -= S[i].to - S[i].from;
    if (x < 0) return i;
  }
  return S.length - 1;
}

export const loginSpinMethods = {
  _loginSpinOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'loginspin') && !f.loginspin);
  },
  _loginSpinOn() { return !this._loginSpinOff(); },   /* the caps literal reads a method call (caps-audit) */
  _loginSpinRand() { return Math.random(); },   /* injectable for tests */
  _loginSpinNow() { return Date.now(); },

  /* The account's key: the device, else the character. */
  _loginSpinAcct(session) {
    const d = cleanDevice(session && session.device);
    return d ? 'd:' + d : 'p:' + (session && session.id);
  },

  async _loginSpinLoad(acct) {
    if (!this.__lsCache) this.__lsCache = new Map();   /* acct -> record; never a plain {} */
    if (this.__lsCache.has(acct)) return this.__lsCache.get(acct);
    let rec = null;
    try { rec = await this.state.storage.get(LOGIN_SPIN.KEY + acct); } catch (e) { rec = null; }
    if (this.__lsCache.has(acct)) return this.__lsCache.get(acct);   /* re-check after the await */
    if (!rec || typeof rec !== 'object') rec = { day: 0, pid: '', idx: 0, coins: 0, paid: true };
    this.__lsCache.set(acct, rec);
    if (this.__lsCache.size > 2000) this.__lsCache.delete(this.__lsCache.keys().next().value);
    return rec;
  },

  _loginSpinSend(session, type, payload) {
    const ws = this._wsBySessionId(session.id);
    if (ws) { try { ws.send(JSON.stringify({ type, payload })); } catch (e) { /* the next ask tells */ } }
  },

  /* v2.3.4295, the owner: "only allow the wheel to spin if you're in a safe
     area".  Safe is the Wheel's safe ground (wheelzone.js _wheelSafeAt: the
     commons and BroTown), the same ground the minimap plate calls safe; never
     No man's land or a land.  Anywhere that is not the Wheel (a room, a test)
     is not asked. */
  _loginSpinSafe(ps) { return !ps || ps.z !== 'wheel' || !this._wheelSafeAt || this._wheelSafeAt(ps.x, ps.y); },

  /* the answer the client draws: always the whole truth about the pot */
  _loginSpinView(rec) {
    return {
      idx: rec.idx, base: rec.base, pot: rec.pot, k: rec.k, open: !!rec.open,
      can: !!rec.open && rec.pot * 2 <= LOGIN_SPIN.POT_MAX,
    };
  },
  _loginSpinSave(acct, rec) { return this.state.storage.put(LOGIN_SPIN.KEY + acct, rec); },

  /* The pot is the player's: close it (saved), credit it once, mark it paid.
     Safe to call twice, from a timer, an ask, or a collect. */
  async _loginSpinSettle(acct, rec) {
    if (rec.open) {
      rec.open = false;                                  /* sync with the check above */
      await this._loginSpinSave(acct, rec);
    }
    if (rec.paid || !rec.pid) return;
    if (rec.pot > 0) {
      await this._creditPlayer(rec.pid, {
        opId: 'loginspin:' + acct + ':' + rec.day, source: 'dailyspin', kind: 'gold',
        payload: { amount: rec.pot }, note: 'Free daily spin',
      });
    }
    rec.paid = true;
    try { await this._loginSpinSave(acct, rec); } catch (e) { /* the oplog holds the payment */ }
    /* v2.3.4381: a pot paid is a record (boards.js: the daily spin's biggest
       wins) -- after the gold is the player's, and never allowed to cost it */
    if (rec.pot > 0) { try { if (this._spinBoardRecord) await this._spinBoardRecord(rec.pid, rec.pot, true, rec.k, { name: rec.nm, lv: rec.lv }); } catch (e) { /* a record, never the pot */ } }
    const ws = this._wsBySessionId(rec.pid);
    if (ws && this._sendPlayerState) { try { this._sendPlayerState(ws, rec.pid); } catch (e) { /* the next state carries it */ } }
  },

  /* (re)start the walk-away timer of an open pot */
  _loginSpinWatch(acct, rec) {
    if (!this.__lsTimers) this.__lsTimers = new Map();
    const old = this.__lsTimers.get(acct); if (old) clearTimeout(old);
    if (!rec.open) { this.__lsTimers.delete(acct); return; }
    const t = setTimeout(() => {
      this.__lsTimers.delete(acct);
      const day = rec.day;
      if (rec.open && rec.day === day) this._loginSpinSettle(acct, rec).catch(() => {});
    }, LOGIN_SPIN.IDLE_MS);
    if (t && t.unref) t.unref();
    this.__lsTimers.set(acct, t);
  },

  /* loginspin_ask: "may this account spin today?" -> loginspin_state.  An
     open or unpaid pot of the account is settled first (a login is the player
     coming back: what they held is theirs). */
  async _handleLoginSpinAsk(session) {
    if (!session || !session.id || this._loginSpinOff()) return;
    const ps = this.playerState[session.id];
    if (!ps || ps.dying || ps.dead || ps.disconnected) return;
    const acct = this._loginSpinAcct(session);
    const rec = await this._loginSpinLoad(acct);
    const today = dayOf(this._loginSpinNow());
    if (rec.day && (rec.open || !rec.paid)) await this._loginSpinSettle(acct, rec);
    this._loginSpinSend(session, 'loginspin_state', { avail: rec.day !== today, day: today });
  },

  /* loginspin_go: the spin itself -> loginspin_result {idx, base, pot, k, open, can}. */
  async _handleLoginSpinGo(session) {
    if (!session || !session.id || this._loginSpinOff()) return;
    const pid = session.id;
    const ps = this.playerState[pid];
    if (!ps || ps.dying || ps.dead || ps.disconnected) return;
    const acct = this._loginSpinAcct(session);
    const rec = await this._loginSpinLoad(acct);
    const today = dayOf(this._loginSpinNow());
    /* the owner: a spin only on safe ground (the client explains; this is the law) */
    if (!this._loginSpinSafe(ps)) { this._loginSpinSend(session, 'loginspin_state', { avail: rec.day !== today, safe: false, day: today }); return; }
    /* ── the synchronous run: check, roll, stamp (no await) ── */
    if (rec.day === today) {
      /* the same character asking again mid-pot is told the pot, never given another spin */
      if (rec.pid === pid && rec.open && rec.k === 0) this._loginSpinSend(session, 'loginspin_result', this._loginSpinView(rec));
      else this._loginSpinSend(session, 'loginspin_state', { avail: false, day: today });
      return;
    }
    const idx = loginSpinPick(this._loginSpinRand());
    const coins = LOGIN_SPIN.SEGS[idx].coins;
    Object.assign(rec, { day: today, pid, idx, base: coins, pot: coins, k: 0, open: true, paid: false });
    /* v2.3.4381: who spun, for the record of a pot paid after they left (the
       idle timer, another character's ask): the spin boards' name and level */
    { const who = this._boardWho ? this._boardWho(pid) : null; if (who) { rec.nm = who.name; rec.lv = who.lv; } }
    try { await this._loginSpinSave(acct, rec); } catch (e) { rec.day = 0; rec.open = false; rec.paid = true; return; }
    /* a pot that cannot be doubled is paid at once; the rest waits for a choice */
    if (rec.pot * 2 > LOGIN_SPIN.POT_MAX) await this._loginSpinSettle(acct, rec);
    else this._loginSpinWatch(acct, rec);
    this._loginSpinSend(session, 'loginspin_result', this._loginSpinView(rec));
  },

  /* loginspin_double {k}: one 50/50 on the open pot -> loginspin_round
     {win, ...view}; and loginspin_collect {k} -> loginspin_round {collected}. */
  async _handleLoginSpinRound(session, payload, collect) {
    if (!session || !session.id || this._loginSpinOff()) return;
    const pid = session.id;
    const ps = this.playerState[pid];
    if (!ps || ps.dying || ps.dead || ps.disconnected) return;
    const acct = this._loginSpinAcct(session);
    const rec = await this._loginSpinLoad(acct);
    const k = Math.floor(Number(payload && payload.k));
    /* ── the synchronous run ── */
    if (rec.pid !== pid || !rec.day) { this._loginSpinSend(session, 'loginspin_state', { avail: false, day: dayOf(this._loginSpinNow()) }); return; }
    if (!rec.open || k !== rec.k) {
      /* a round already played (a double tap, a replay): the same answer again, no new roll */
      this._loginSpinSend(session, 'loginspin_round', { ...this._loginSpinView(rec), win: rec.lastWin === true, collected: !rec.open && rec.pot > 0, lost: !rec.open && rec.pot === 0, replay: true });
      return;
    }
    /* YES (a double) only on safe ground too; NO (collect) is always allowed: the gold is theirs */
    if (!collect && rec.open && !this._loginSpinSafe(ps)) { this._loginSpinSend(session, 'loginspin_state', { avail: false, safe: false, held: true, day: dayOf(this._loginSpinNow()) }); return; }
    let win = null;
    const before = rec.pot;   /* v2.3.4381: what a lost double loses (the spin boards) */
    if (!collect) {
      if (rec.pot * 2 > LOGIN_SPIN.POT_MAX) { this._loginSpinSend(session, 'loginspin_round', { ...this._loginSpinView(rec), replay: true }); return; }
      win = this._loginSpinRand() < 0.5;
      rec.lastWin = win;
      rec.k += 1;
      if (win) rec.pot *= 2; else rec.pot = 0;
    }
    const settleNow = collect || !win || rec.pot * 2 > LOGIN_SPIN.POT_MAX;
    try { await this._loginSpinSave(acct, rec); } catch (e) { return; }
    if (settleNow) await this._loginSpinSettle(acct, rec); else this._loginSpinWatch(acct, rec);
    /* v2.3.4381: a pot lost to a double is a record too (boards.js: the
       biggest losses), after the round is saved */
    if (win === false && before > 0) { try { if (this._spinBoardRecord) await this._spinBoardRecord(pid, before, false, rec.k); } catch (e) { /* a record, never the round */ } }
    this._loginSpinSend(session, 'loginspin_round', {
      ...this._loginSpinView(rec), win: win === true, lost: win === false, collected: settleNow && rec.pot > 0,
    });
  },
};
