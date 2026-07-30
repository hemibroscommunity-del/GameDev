/* ═══ v2.3.1146: BEHAVIORAL ANTI-BOT FOR LIFE SKILLS (docs/specs/anticheat-botfp.md;
 * server half of docs/ANTICHEAT-SPEC.md, shipped FLAG-ONLY per owner decision) ═══
 *
 * The client has fingerprinted every gathering gesture since v2.3.694:
 * node_strike.swipeFp {len, n, dur, ent, tv, vc, h} — path entropy, timing
 * variance, velocity curvature, and an 8px-quantized path hash — plus
 * join.device {id, env}.  Until now the server kept a partial session ring
 * (dropping tv/vc/h) and never scored, persisted, or correlated anything.
 *
 * This module is the detection engine.  OWNER POLICY (2026-07-03): the
 * behavioral side is EVIDENCE-ONLY — it counts, scores with decay, and
 * writes shadow flags for the owner to review via GET /api/botstat.
 * Nothing behavioral changes gameplay automatically.  Two deliberate
 * exceptions, both owner-approved:
 *   - the entropy floor caps a claimed 'perfect' to 'ok' (the client
 *     ITSELF has required ent >= 0.04 for perfect since v2.3.694, so an
 *     under-floor perfect is a forged packet, not behavior);
 *   - the economic hourly caps (ANTICHEAT-SPEC §6) silently withhold
 *     grants past a rate no human can reach (see HARVEST_HOUR_CAP note).
 *
 * Storage (ARCHITECTURE-HANDOFF rule 1: the rpg blob is NEVER extended):
 *   botstat:<playerId> — durable per-identity summary (counters, hour
 *     window, replay-ring tail, Welford stats, score, flags).  Registered
 *     in the handoff storage-key table.
 *   device:<deviceId>  — identity list per device nonce (fleet signal).
 * Live state is in-memory Maps (rule 11 — a deploy loses nothing of
 * value; the durable halves above survive).  No alarms (rule 12): the
 * hour window rolls over lazily at evaluation time.  No new WS event
 * types (rule 13 untouched); the admin surface is HTTP, invisible (404)
 * unless env.ADMIN_KEY is configured AND presented. */

export const BOTFP = {
  // ── per-strike floors ──
  // ENT_FLOOR mirrors the client's own 'perfect' gate (ExtractionSwipeLayer
  // v2.3.694).  Every honest completing gesture reverses/rotates (a fishing
  // circle alone yields ent ≈ 0.1); near-collinear input cannot fill the
  // reps meter honestly.
  ENT_FLOOR: 0.04,
  // TV_FLOOR is a WEAK signal on purpose: iOS Safari coalesces pointermove
  // to display refresh and quantizes performance.now() to 1ms, so a REAL
  // iPhone can legitimately send tv 0-1.  tv never acts alone.
  TV_FLOOR: 1,
  // Human oscillation passes finger speed through ~0 at every reversal, so
  // honest vc sits >= ~0.1 even for smooth stylus motion; constant-velocity
  // synthetic drags land < 0.01.
  VC_FLOOR: 0.02,
  // A strike only counts as synthetic when >= 2 independent floors trip at
  // once — the worst legitimate case (frame-locked iPhone events) trips
  // exactly one (tv).  This is the structural false-positive guard.
  SYNTH_MIN_FLOORS: 2,
  // ── replay ring ──
  // Humans never reproduce an 8px-quantized ~100-sample path bit-for-bit.
  // FNV-1a 32-bit birthday collision within a 64-window ≈ 5e-7 per strike,
  // and a collision only adds decaying score — it can't flag alone.
  H_RING: 64,
  H_RING_PERSIST: 32,       // tail persisted so reconnect-cycling can't clear it
  // ── accumulator ──
  RING: 64,                 // recent {ent,tv,vc} per identity
  EVAL_EVERY: 25,           // run the accumulator checks every Nth strike
  COLLAPSE_MIN_N: 48,       // variance checks need a real sample
  // Human σ(ent) across harvests is large by construction: the three
  // gestures (circle/pump/chop) differ by > 0.1 in MEAN entropy alone, and
  // within one skill grip/speed drift gives σ >= ~0.05.  σ < 0.02 over 48
  // harvests means the same curve 48 times.
  ENT_VAR_FLOOR: 0.0004,
  VC_VAR_FLOOR: 0.0001,
  INTERVALS: 32,            // inter-strike gaps tracked (short gaps only)
  INTERVAL_MAX_MS: 45000,   // ignore long gaps (walking between zones etc.)
  INTERVAL_MIN_N: 20,
  // CV floor is deliberately review-grade evidence only: a disciplined
  // human camping the 6-node rotation at respawn cadence can be regular.
  INTERVAL_CV_FLOOR: 0.05,
  // ── scoring / flags ──
  SCORE_SYNTH: 2, SCORE_REPLAY: 3, SCORE_COLLAPSE: 5, SCORE_INTERVAL: 2,
  SCORE_HALF_LIFE_MS: 1800000,   // 30 min — evidence decays, humans wash out
  FLAG_AT: 10,                   // ~5 synthetic strikes or 3+ replays inside a half-life
  FLAG_MIN_GAP_MS: 3600000,      // at most one auto-flag written per hour per identity
  FLAG_CAP: 20,
  // ── fleet signal (device correlation) ──
  FLEET_MIN_IDS: 4,              // identities on one device nonce
  FLEET_ACTIVE_MIN: 3,           // of which this many harvested heavily this hour
  FLEET_ACTIVE_STRIKES: 30,
  // ── economic hourly caps (ANTICHEAT-SPEC §6, owner-approved clamps) ──
  // World supply per gathering skill is 180/hour — a teleporting bot cannot
  // exceed it, a human cannot reach it.  270 sits 50% above that physical
  // ceiling: zero false-positive risk by design.
  // v2.3.1592: the ceiling is UNCHANGED at 180, but it is now reached a
  // different way.  It used to be 6 nodes × 30 respawns/hour (a 2-minute
  // timer); the owner's "one resource per zone, quick respawn" pass made it
  // 1 node × 180 respawns/hour (a 20-second timer).  Same product, so this
  // cap and its margin needed no edit — but the DERIVATION did, because a
  // future session reading "6 nodes × 30" would have no idea which half of
  // it they were allowed to change.  Whoever touches NODE_RESPAWN_TIME or
  // _getZoneNodeConfig owns this number: nodes × (3600 / respawnSeconds)
  // must stay well under HARVEST_HOUR_CAP.  node-respawn.test.mjs asserts
  // exactly that against the live constants, so the two cannot drift.
  HARVEST_HOUR_CAP: 270,
  // Sustained human cooking ≈ 450/h (one ~8s minigame each incl. open
  // delay); the only prior bound was _cookRateOk's 20/min = 1200/h.
  COOK_HOUR_CAP: 700,
  // ── plumbing ──
  PUT_MIN_MS: 30000,             // botstat: put throttle (flags flush immediately)
  MAP_CAP: 128, MAP_EVICT_TO: 96,
  DEVICE_CAP: 256, DEVICE_IDS_CAP: 8,
  DEVICE_ID_MAX: 32, DEVICE_ENV_MAX: 16,
  WELFORD_CAP: 200,              // halve n/M2 past this — exponential forgetting
};

const now_ = () => Date.now();
const cleanTok = (s, max) => String(s || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, max);

function freshRecord(now) {
  return {
    deviceId: null, deviceEnv: null,
    ring: [], hRing: [], intervals: [],
    lastStrikeAt: 0, strikeCount: 0,
    score: 0, lastDecayAt: now, lastFlagAt: 0,
    counters: { strikes: 0, noFpStrikes: 0, syntheticStrikes: 0, entFloorHits: 0,
                replayHits: 0, taplessCooks: 0, cooks: 0, capClamps: 0 },
    hour: { hourStart: now, bySkill: {} },
    welford: { n: 0, entMean: 0, entM2: 0, vcMean: 0, vcM2: 0 },
    flags: [],
    dirty: false, lastPutAt: 0,
  };
}

function ringVariance(ring, key) {
  const n = ring.length;
  if (n === 0) return Infinity;
  let mean = 0;
  for (const s of ring) mean += s[key];
  mean /= n;
  let m2 = 0;
  for (const s of ring) { const d = s[key] - mean; m2 += d * d; }
  return m2 / n;
}

export const botfpMethods = {
  // ── join: device capture + durable hydration ──
  // Runs inside the join case (input gate held across the await — rule 9).
  async _botfpOnJoin(session, msg) {
    if (!this._botfp) { this._botfp = new Map(); this._deviceIndex = new Map(); }
    const id = session.id;
    if (!id) return;
    const now = now_();
    const rec = this._botfpRecord(id, now);

    // device nonce: random localStorage token + coarse env hash — not PII.
    const dev = msg && msg.device;
    if (dev && typeof dev === 'object') {
      const devId = cleanTok(dev.id, BOTFP.DEVICE_ID_MAX);
      const devEnv = cleanTok(dev.env, BOTFP.DEVICE_ENV_MAX);
      if (devId) {
        rec.deviceId = devId;
        rec.deviceEnv = devEnv || null;
        if (!this._deviceIndex.has(devId)) {
          if (this._deviceIndex.size >= BOTFP.DEVICE_CAP) {
            const first = this._deviceIndex.keys().next().value;
            this._deviceIndex.delete(first);
          }
          this._deviceIndex.set(devId, new Set());
        }
        const ids = this._deviceIndex.get(devId);
        ids.add(id);
        while (ids.size > 16) { ids.delete(ids.values().next().value); }
        // durable device record — put only when the identity list changes.
        try {
          const key = 'device:' + devId;
          const stored = (await this.state.storage.get(key)) || { v: 1, env: devEnv, firstSeen: now, ids: [] };
          const cutoff = now - 30 * 86400000;
          let list = (stored.ids || []).filter((e) => e && e.lastSeen > cutoff && e.id !== id);
          list.push({ id, lastSeen: now });
          if (list.length > BOTFP.DEVICE_IDS_CAP) list = list.slice(-BOTFP.DEVICE_IDS_CAP);
          const changed = JSON.stringify(list.map((e) => e.id)) !== JSON.stringify((stored.ids || []).map((e) => e.id));
          if (changed) {
            stored.ids = list; stored.env = devEnv || stored.env;
            this.state.storage.put(key, stored).catch(() => {});
          } else {
            // refresh lastSeen lazily on the next real change; avoids a put per join
          }
        } catch (e) { /* device record is best-effort */ }
      }
    }

    // hydrate the durable summary so reconnect-cycling resets nothing.
    try {
      const stored = await this.state.storage.get('botstat:' + id);
      if (stored && stored.v === 1) {
        rec.counters = { ...rec.counters, ...(stored.counters || {}) };
        if (stored.hour && typeof stored.hour.hourStart === 'number') rec.hour = stored.hour;
        if (Array.isArray(stored.hRing)) rec.hRing = stored.hRing.slice(-BOTFP.H_RING);
        if (stored.welford) rec.welford = stored.welford;
        if (typeof stored.score === 'number') { rec.score = stored.score; rec.lastDecayAt = stored.updatedAt || now; }
        if (Array.isArray(stored.flags)) rec.flags = stored.flags.slice(-BOTFP.FLAG_CAP);
        if (typeof stored.lastFlagAt === 'number') rec.lastFlagAt = stored.lastFlagAt;
      }
    } catch (e) { /* absent record is the common case */ }
  },

  _botfpRecord(id, now) {
    if (!this._botfp) { this._botfp = new Map(); this._deviceIndex = new Map(); }
    let rec = this._botfp.get(id);
    if (rec) return rec;
    if (this._botfp.size >= BOTFP.MAP_CAP) {
      // LRU-ish eviction by lastStrikeAt; flush dirty evictees first.
      const entries = [...this._botfp.entries()].sort((a, b) => a[1].lastStrikeAt - b[1].lastStrikeAt);
      while (this._botfp.size > BOTFP.MAP_EVICT_TO && entries.length) {
        const [eid, erec] = entries.shift();
        this._botfpMaybePut(eid, erec, true);
        this._botfp.delete(eid);
      }
    }
    rec = freshRecord(now || now_());
    this._botfp.set(id, rec);
    return rec;
  },

  _botfpDecay(rec, now) {
    if (rec.score > 0) {
      const dt = now - rec.lastDecayAt;
      if (dt > 0) rec.score *= Math.pow(0.5, dt / BOTFP.SCORE_HALF_LIFE_MS);
      if (rec.score < 0.01) rec.score = 0;
    }
    rec.lastDecayAt = now;
  },

  // Lazy hour-window rollover (rule 12: no alarms).
  _botfpHourOk(rec, skill, cap, now) {
    if (now - rec.hour.hourStart >= 3600000) {
      rec.hour = { hourStart: now, bySkill: {} };
    }
    const n = (rec.hour.bySkill[skill] || 0) + 1;
    rec.hour.bySkill[skill] = n;
    rec.dirty = true;
    return n <= cap;
  },

  // ── the gathering hook: called from _handleNodeStrike after the timing
  // gates, before rewards.  Returns { accuracy, grant }. ──
  _botfpOnStrike(session, ps, ctx) {
    const now = ctx.now || now_();
    const rec = this._botfpRecord(session.id, now);
    this._botfpDecay(rec, now);
    let accuracy = ctx.accuracy;

    // Economic cap first — behavior-independent backstop (§6).
    if (!this._botfpHourOk(rec, ctx.skill, BOTFP.HARVEST_HOUR_CAP, now)) {
      rec.counters.capClamps++;
      this._botfpMaybePut(session.id, rec, rec.counters.capClamps === 1);
      return { accuracy, grant: false };
    }

    // Inter-strike interval evidence (short gaps only — long gaps are walks).
    if (rec.lastStrikeAt) {
      const gap = now - rec.lastStrikeAt;
      if (gap <= BOTFP.INTERVAL_MAX_MS) {
        rec.intervals.push(gap);
        if (rec.intervals.length > BOTFP.INTERVALS) rec.intervals.shift();
      }
    }
    rec.lastStrikeAt = now;
    rec.strikeCount++;
    rec.counters.strikes++;
    rec.dirty = true;

    const fp = ctx.swipeFp;
    if (!fp || typeof fp !== 'object') {
      // Old client / stripped payload: permissive, evidence-counted only —
      // the _extractionMissing posture.
      rec.counters.noFpStrikes++;
      this._botfpMaybePut(session.id, rec, false);
      return { accuracy, grant: true };
    }

    const ent = Number(fp.ent) || 0;
    const tv = Number(fp.tv) || 0;
    const vc = Number(fp.vc) || 0;
    const h = (typeof fp.h === 'number' || typeof fp.h === 'string') ? String(fp.h) : null;

    // Forgery guard (NOT behavioral): the client itself refuses 'perfect'
    // below the entropy floor, so an under-floor perfect claim is a forged
    // packet.  Cap it to 'ok'.
    if (accuracy === 'perfect' && ent < BOTFP.ENT_FLOOR) {
      accuracy = 'ok';
      rec.counters.entFloorHits++;
    }

    // Synthetic-input floors — require >= 2 independently-tripped floors.
    let floors = 0;
    if (ent < BOTFP.ENT_FLOOR) floors++;
    if (tv <= BOTFP.TV_FLOOR) floors++;
    if (vc <= BOTFP.VC_FLOOR) floors++;
    if (floors >= BOTFP.SYNTH_MIN_FLOORS) {
      rec.counters.syntheticStrikes++;
      rec.score += BOTFP.SCORE_SYNTH;
    }

    // Replay ring — bit-identical path hash reuse.
    if (h) {
      if (rec.hRing.includes(h)) {
        rec.counters.replayHits++;
        rec.score += BOTFP.SCORE_REPLAY;
      }
      rec.hRing.push(h);
      if (rec.hRing.length > BOTFP.H_RING) rec.hRing.shift();
    }

    // Distribution accumulators (gathering only — cook flips are short
    // near-straight strokes and would pollute these).
    rec.ring.push({ ent, tv, vc });
    if (rec.ring.length > BOTFP.RING) rec.ring.shift();
    const w = rec.welford;
    if (w.n >= BOTFP.WELFORD_CAP) { w.n = Math.floor(w.n / 2); w.entM2 /= 2; w.vcM2 /= 2; }
    w.n++;
    let d = ent - w.entMean; w.entMean += d / w.n; w.entM2 += d * (ent - w.entMean);
    d = vc - w.vcMean; w.vcMean += d / w.n; w.vcM2 += d * (vc - w.vcMean);

    if (rec.strikeCount % BOTFP.EVAL_EVERY === 0) this._botfpEval(session.id, rec, now);
    if (rec.score >= BOTFP.FLAG_AT) this._botfpFlag(session.id, rec, 'suspicion-threshold', { score: Math.round(rec.score * 10) / 10 }, now);

    this._botfpMaybePut(session.id, rec, false);
    return { accuracy, grant: true };
  },

  // Accumulator checks — every EVAL_EVERY strikes, cheap array math.
  _botfpEval(id, rec, now) {
    // Variance collapse: humans drift attempt-to-attempt; replay-with-noise
    // bots converge.
    if (rec.ring.length >= BOTFP.COLLAPSE_MIN_N) {
      const entVar = ringVariance(rec.ring, 'ent');
      const vcVar = ringVariance(rec.ring, 'vc');
      if (entVar < BOTFP.ENT_VAR_FLOOR || vcVar < BOTFP.VC_VAR_FLOOR) {
        rec.score += BOTFP.SCORE_COLLAPSE;
        this._botfpFlag(id, rec, 'variance-collapse',
          { entVar: Number(entVar.toFixed(6)), vcVar: Number(vcVar.toFixed(6)), n: rec.ring.length }, now);
      }
    }
    // Inter-strike regularity: evidence-grade only (a respawn-camping human
    // can be regular) — adds score, never flags alone.
    if (rec.intervals.length >= BOTFP.INTERVAL_MIN_N) {
      let mean = 0;
      for (const g of rec.intervals) mean += g;
      mean /= rec.intervals.length;
      let m2 = 0;
      for (const g of rec.intervals) { const dd = g - mean; m2 += dd * dd; }
      const cv = mean > 0 ? Math.sqrt(m2 / rec.intervals.length) / mean : 1;
      if (cv < BOTFP.INTERVAL_CV_FLOOR) rec.score += BOTFP.SCORE_INTERVAL;
    }
    // Fleet signal: many identities on one device nonce harvesting heavily
    // in the same hour — the anchor against passphrase cycling.
    if (rec.deviceId && this._deviceIndex) {
      const ids = this._deviceIndex.get(rec.deviceId);
      if (ids && ids.size >= BOTFP.FLEET_MIN_IDS) {
        let active = 0;
        const list = [];
        for (const oid of ids) {
          const orec = this._botfp.get(oid);
          if (!orec) continue;
          let total = 0;
          for (const v of Object.values(orec.hour.bySkill)) total += v;
          if (total >= BOTFP.FLEET_ACTIVE_STRIKES && now - orec.hour.hourStart < 3600000) {
            active++;
            list.push(oid);
          }
        }
        if (active >= BOTFP.FLEET_ACTIVE_MIN) {
          this._botfpFlag(id, rec, 'device-fleet', { deviceId: rec.deviceId, activeIds: list }, now);
        }
      }
    }
  },

  // Shadow flag: persisted evidence for owner review.  Rate-limited so a
  // stuck bot doesn't fill the flag ring with duplicates.
  _botfpFlag(id, rec, kind, detail, now) {
    if (now - rec.lastFlagAt < BOTFP.FLAG_MIN_GAP_MS) return;
    rec.lastFlagAt = now;
    rec.flags.push({ at: now, kind, detail, counters: { ...rec.counters } });
    if (rec.flags.length > BOTFP.FLAG_CAP) rec.flags.shift();
    rec.dirty = true;
    this._botfpMaybePut(id, rec, true);
  },

  // ── the cooking hook: hourly cap + replay + presence bookkeeping.
  // Returns { drop }. ──
  _botfpOnCook(session, ps, payload) {
    const now = now_();
    const rec = this._botfpRecord(session.id, now);
    this._botfpDecay(rec, now);
    if (!this._botfpHourOk(rec, 'cooking', BOTFP.COOK_HOUR_CAP, now)) {
      rec.counters.capClamps++;
      this._botfpMaybePut(session.id, rec, rec.counters.capClamps === 1);
      return { drop: true };
    }
    rec.counters.cooks++;
    const fp = payload && payload.swipeFp;
    if (fp && typeof fp === 'object') {
      const h = (typeof fp.h === 'number' || typeof fp.h === 'string') ? String(fp.h) : null;
      if (h) {
        if (rec.hRing.includes(h)) {
          rec.counters.replayHits++;
          rec.score += BOTFP.SCORE_REPLAY;
          if (rec.score >= BOTFP.FLAG_AT) this._botfpFlag(session.id, rec, 'suspicion-threshold', { score: Math.round(rec.score * 10) / 10, via: 'cook' }, now);
        }
        rec.hRing.push(h);
        if (rec.hRing.length > BOTFP.H_RING) rec.hRing.shift();
      }
    } else if (payload && payload.kind === 'cooked') {
      // ANTICHEAT-SPEC §1 burn-in bookkeeping: cooked with no behavioral
      // data.  Old clients land here legitimately (caps-gated attach), so
      // this only counts — rejection is a future step once burn-in
      // telemetry says new clients dominate.
      rec.counters.taplessCooks++;
    }
    rec.dirty = true;
    this._botfpMaybePut(session.id, rec, false);
    return { drop: false };
  },

  // Throttled fire-and-forget durable write (no per-tick writes; flags and
  // first-cap-clamp flush immediately via force).
  _botfpMaybePut(id, rec, force) {
    const now = now_();
    if (!force && (!rec.dirty || now - rec.lastPutAt < BOTFP.PUT_MIN_MS)) return;
    rec.lastPutAt = now;
    rec.dirty = false;
    const obj = {
      v: 1, updatedAt: now,
      deviceId: rec.deviceId, deviceEnv: rec.deviceEnv,
      counters: rec.counters,
      hour: rec.hour,
      hRing: rec.hRing.slice(-BOTFP.H_RING_PERSIST),
      welford: rec.welford,
      score: rec.score, lastFlagAt: rec.lastFlagAt,
      flags: rec.flags,
    };
    try { this.state.storage.put('botstat:' + id, obj).catch(() => {}); } catch (e) {}
  },

  _botfpFlush(session) {
    if (!session || !session.id || !this._botfp) return;
    const rec = this._botfp.get(session.id);
    if (rec) this._botfpMaybePut(session.id, rec, true);
  },

  // ── owner read surface.  Invisible (404) unless env.ADMIN_KEY is both
  // configured and presented — nothing for players to probe.  Sibling to a
  // future /api/admin/* umbrella; zero dependency on it. ──
  async _botfpAdminFetch(request) {
    const notFound = () => new Response('Not found', { status: 404 });
    const key = this.env && this.env.ADMIN_KEY;
    if (!key || request.headers.get('x-admin-key') !== key) return notFound();
    const url = new URL(request.url);
    const headers = { 'Content-Type': 'application/json' };
    const id = url.searchParams.get('id');
    if (id) {
      const stored = (await this.state.storage.get('botstat:' + id)) || null;
      const live = this._botfp && this._botfp.get(id);
      const merged = live ? {
        ...(stored || {}),
        live: {
          score: Math.round(live.score * 100) / 100,
          counters: live.counters, hour: live.hour,
          ringN: live.ring.length, deviceId: live.deviceId,
        },
      } : stored;
      return new Response(JSON.stringify({ id, botstat: merged }), { headers });
    }
    if (url.searchParams.get('flagged') === '1') {
      const out = [];
      const listing = await this.state.storage.list({ prefix: 'botstat:' });
      for (const [k, v] of listing) {
        if (v && Array.isArray(v.flags) && v.flags.length > 0) {
          out.push({ id: k.slice('botstat:'.length), flags: v.flags, counters: v.counters, updatedAt: v.updatedAt });
          if (out.length >= 50) break;
        }
      }
      return new Response(JSON.stringify({ flagged: out }), { headers });
    }
    return new Response(JSON.stringify({ usage: '/api/botstat?id=<playerId> | /api/botstat?flagged=1' }), { headers });
  },
};
