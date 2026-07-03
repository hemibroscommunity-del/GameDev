/* ═══ v2.3.1145: TIME-CADENCE FRAMEWORK (spec: docs/specs/cadence.md) ═══
 *
 * The primitive this codebase never had: recurring daily/weekly things
 * that are CORRECT under the three hostile constraints of this DO
 * (ARCHITECTURE-HANDOFF rules 11/12):
 *   - there are NO alarms;
 *   - the tick loop stops the moment the room empties;
 *   - a deploy wipes all memory.
 * So nothing here schedules anything.  Periods are pure functions of
 * the clock (UTC day key `yyyymmdd`, ISO week key `GGGG-Www`), state
 * lives in storage under `cadence:<scope>:<subject>`, and settlement is
 * LAZY: per-player scopes resolve on join, global scopes resolve on a
 * rate-limited tick slot AND on first relevant activity.  A week that
 * ends in an empty room settles when the next player shows up.
 *
 * IDEMPOTENCY: the cadence record is only the fast-path skip.  The real
 * wall is the _creditPlayer opId (`daily:<pid>:<period>`,
 * `jackpotwin:<period>`) -- a crash between the credit and the record
 * write converges as `dup` on the retry (rules 4/5).
 *
 * CONSUMERS SHIPPED HERE:
 *   1. Daily login reward (per-player, on join).  Zero client work:
 *      rides _creditPlayer -> inbox_delivered, which the client already
 *      renders as a "📫 You received ..." chat line.
 *   2. Weekly jackpot draw (global; handoff backlog item J).  The
 *      GamblePanel pool was a pure client stub that burned local coins
 *      into nothing.  Deposits are escrow-at-placement (rule 7 -- the
 *      pool is money at rest and must survive deploys) in ONE gated
 *      event (rule 8); the draw resolves lazily, ticket-weighted, one
 *      winner, house takes nothing (v1).
 *
 * STORAGE (registered in the handoff rule-2 table):
 *   cadence:<scope>:<subject>  {period, streak, ts}
 *   jackpot:draw               {period, pool, entries: {pid: tickets}}
 *     (single key on purpose -- one record makes deposit/read/rollover
 *      atomic under the input gate; simpler than the two-key sketch in
 *      the handoff item J note.) */

export const CADENCE = {
  DAILY_BASE_GOLD: 25,
  DAILY_STREAK_GOLD: 10,   // per extra consecutive day
  DAILY_STREAK_CAP: 7,     // day 7+ all pay the max (85g)
  JACKPOT_TICKET: 50,      // gold per ticket
  JACKPOT_MIN: 50,
  JACKPOT_MAX: 5000,       // per single deposit
};

export const cadenceMethods = {
  // UTC day key: 20260703.  `now` injectable for tests.
  _cadencePeriodDaily(now) {
    const d = new Date(now || Date.now());
    return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
  },

  // ISO-8601 week key: '2026-W27'.  Self-contained UTC implementation:
  // ISO weeks start Monday; week 1 contains the year's first Thursday.
  _cadencePeriodWeekly(now) {
    const d = new Date(now || Date.now());
    const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const day = t.getUTCDay() || 7;            // Mon=1..Sun=7
    t.setUTCDate(t.getUTCDate() + 4 - day);    // shift to this week's Thursday
    const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
    return t.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
  },

  async _cadenceGet(scope, subject) {
    return (await this.state.storage.get('cadence:' + scope + ':' + subject)) || null;
  },

  async _cadenceSet(scope, subject, record) {
    await this.state.storage.put('cadence:' + scope + ':' + subject, { ...record, ts: Date.now() });
  },

  // ── Consumer 1: daily login reward ──
  // Called from the join handler after the inbox drain.  One storage
  // get per join; a put + credit only when a new UTC day started.
  async _cadenceLoginReward(playerId, now) {
    try {
      const today = this._cadencePeriodDaily(now);
      const rec = await this._cadenceGet('login', playerId);
      if (rec && rec.period === today) return; // already settled today
      const yesterday = this._cadencePeriodDaily((now || Date.now()) - 86400000);
      const streak = (rec && rec.period === yesterday) ? (rec.streak || 1) + 1 : 1;
      const gold = CADENCE.DAILY_BASE_GOLD
        + CADENCE.DAILY_STREAK_GOLD * (Math.min(streak, CADENCE.DAILY_STREAK_CAP) - 1);
      // The opId is the idempotency wall; the record write after it is
      // just the fast path (crash between them -> dup on retry).
      await this._creditPlayer(playerId, {
        opId: 'daily:' + playerId + ':' + today,
        source: 'daily',
        kind: 'gold',
        payload: { amount: gold },
        note: 'Daily reward — day ' + streak + (streak >= CADENCE.DAILY_STREAK_CAP ? ' (max streak!)' : ''),
      });
      await this._cadenceSet('login', playerId, { period: today, streak });
    } catch (e) { /* rewards must never block a join */ }
  },

  // ── Consumer 2: weekly jackpot ──
  _jackpotSend(playerId, extra) {
    const ws = this._wsBySessionId(playerId);
    if (!ws) return;
    this._jackpotState(extra).then((payload) => {
      try { ws.send(JSON.stringify({ type: 'jackpot_state', payload })); } catch (e) {}
    }).catch(() => {});
  },

  async _jackpotState(extra) {
    const draw = (await this.state.storage.get('jackpot:draw')) || null;
    return {
      period: draw ? draw.period : this._cadencePeriodWeekly(),
      pool: draw ? draw.pool : 0,
      yourTickets: (draw && extra && extra.playerId && draw.entries[extra.playerId]) || 0,
      ...(extra || {}),
    };
  },

  async _handleJackpotDeposit(session, payload) {
    // v2.3.1146: live-ops kill switch -- deposits stop cold, nothing
    // debited (the pool and existing entries are untouched and the
    // draw still resolves on schedule).
    if (this._flagOn && this._flagOn('disable_jackpot')) return;
    if (!session || !session.id) return;
    const ps = this.playerState[session.id];
    if (!ps || ps.dying || ps.dead || ps.disconnected) return;
    const amount = Math.floor(Number(payload && payload.amount));
    if (!Number.isFinite(amount) || amount < CADENCE.JACKPOT_MIN || amount > CADENCE.JACKPOT_MAX) return;
    if (amount % CADENCE.JACKPOT_TICKET !== 0) return;
    if ((ps.coins || 0) < amount) return;
    // Settle any stale draw BEFORE taking the deposit so a new week's
    // first deposit can't land in last week's pool.
    await this._jackpotMaybeResolve();
    const period = this._cadencePeriodWeekly();
    const draw = (await this.state.storage.get('jackpot:draw')) || { period, pool: 0, entries: {} };
    // Single gated event (rule 8): debit live state + grow the pool,
    // both committed by the same event's output gate.  No opId needed
    // -- a resent deposit is legitimately a new deposit.
    ps.coins -= amount;
    this._saveRpg(session.id, ps);
    this._queuePlayerStateFlush(session.id);
    draw.pool += amount;
    draw.entries[session.id] = (draw.entries[session.id] || 0) + amount / CADENCE.JACKPOT_TICKET;
    await this.state.storage.put('jackpot:draw', draw);
    this._jackpotSend(session.id, { playerId: session.id, deposited: amount });
  },

  // Lazy weekly settlement (rule 12): called on join, inside the
  // deposit handler, and from the tick's rate-limited slot.  Ticket-
  // weighted single winner; offline winners get paid via the inbox for
  // free (rule 4).  Crash between credit and record reset converges:
  // the jackpotwin:<period> opId stamps first, the retry gets `dup`,
  // and the reset still proceeds (rules 5/6).
  async _jackpotMaybeResolve(now) {
    try {
      const draw = await this.state.storage.get('jackpot:draw');
      if (!draw) return;
      const current = this._cadencePeriodWeekly(now);
      if (draw.period === current) return;
      const entrants = Object.entries(draw.entries || {});
      if (entrants.length === 0 || !(draw.pool > 0)) {
        await this.state.storage.put('jackpot:draw', { period: current, pool: 0, entries: {} });
        return;
      }
      const totalTickets = entrants.reduce((s, [, t]) => s + t, 0);
      let roll = Math.random() * totalTickets;
      let winner = entrants[0][0];
      for (const [pid, tickets] of entrants) {
        roll -= tickets;
        if (roll <= 0) { winner = pid; break; }
      }
      await this._creditPlayer(winner, {
        opId: 'jackpotwin:' + draw.period,
        source: 'jackpot',
        kind: 'gold',
        payload: { amount: draw.pool },
        note: 'Weekly jackpot — ' + draw.entries[winner] + ' ticket(s) of ' + totalTickets,
      });
      const winnerSession = this._sessionById(winner);
      this.eventBuffer.push({
        type: 'jackpot_result',
        payload: {
          period: draw.period,
          amount: draw.pool,
          winnerId: winner,
          winnerName: (winnerSession && winnerSession.name) || 'An offline hero',
        },
      });
      await this.state.storage.put('jackpot:draw', { period: current, pool: 0, entries: {} });
    } catch (e) { /* lazy settlement retries on the next trigger */ }
  },
};
