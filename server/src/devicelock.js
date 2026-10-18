/* ═══ v2.3.3344: A CHARACTER'S LOGIN KEY WORKS ON THE DEVICES IT IS PLAYED ON ═══
 *
 * docs/specs/device-lock.md.  The owner chose it on at once, their own tool the
 * only way onto a new device for now, and a short note to players.
 *
 * A Login Key alone used to be enough to play a character from anywhere.  A key
 * is a few words: it can be written down, shared, seen over a shoulder or
 * guessed at, and the worker had nothing else to go on.  Now it also asks the
 * DEVICE -- the random token every phone keeps in its browser and sends with
 * each join (index.js getDeviceNonce, `join.device.id`, the one the bot checks
 * already read: botfp.js) -- and honours the key only from a device that
 * character has been played on:
 *
 *   - auth:<id> keeps `devs`, up to DEVICE_LOCK.MAX devices ({d, at}), written
 *     only when one is added (never a write a join: cost-guard);
 *   - a key from one of them: in, as before;
 *   - a key from any other device (or none): refused, join_rejected
 *     {reason: 'device'} and close 4016, never 'auth' -- 'auth' makes the
 *     phone throw its key away for a fresh character (wsClient.js), and an
 *     unknown reason makes an older phone stop retrying;
 *   - a character no device is known for yet: its next device is taken and
 *     remembered (the first-device rule; how it was for everyone before);
 *   - the owner's PASS lets one new device in within DEVICE_LOCK.PASS_MS
 *     (/api/admin/device-pass), and FORGET clears the list, SEALS it and puts
 *     out whoever is playing it, so nobody gets in until a pass does -- for a
 *     character someone else got into, who has its key
 *     (/api/admin/device-forget).  Forget gives no pass of its own: the one it
 *     put out could take it first.  The owner gives one when the character's
 *     player is ready to log in.
 *
 * THE DEVICES THE WORKER ALREADY KNEW.  On at once, a character with no list
 * would take whichever device came first after the deploy -- for a character
 * whose player is away, possibly not theirs.  So the first time the rule needs
 * a list the worker has not got, it fills every character's from what it
 * already holds (`_deviceFill`, once, marked `devlock:filled`): the bot checks'
 * `device:<deviceId>` records (the characters each device played) and each
 * gatherer's `botstat:<id>` (its last device).  Not complete: on a device with
 * several characters botfp.js forgets one 30 days after it was first listed
 * (its write filters the others by a lastSeen it never refreshes), so a
 * character can be missing a device it really uses -- refused there, the
 * owner's pass the way in.
 *
 * The same rule holds on the account requests that take a key
 * (account.js): the login check answers `device: 'unknown'` instead of
 * switching a phone to a key it could not play, and the restart refuses.
 *
 * Kill switch `devicelock: false`: the join, the login check and the restart as
 * they were, nothing read or written for it.
 */
import { BOTFP } from './botfp.js';
import { makeLoginKey } from './keywords.js';   /* v2.3.3355: the owner's "Give it a new key" */

export const DEVICE_LOCK = Object.freeze({
  /* devices remembered per character; the oldest added goes first */
  MAX: 12,
  /* the owner's pass: how long one new device may come in */
  PASS_MS: 30 * 60000,
  /* the close after a refusal (4015 is the origin lock's) */
  CLOSE: 4016,
  /* the one-time fill's marker */
  FILLED_KEY: 'devlock:filled',
  /* a failed fill is tried again at most this often */
  FILL_RETRY_MS: 60000,
  /* the auth: records read and written a batch */
  FILL_BATCH: 128,
});

/* A device id as botfp.js cleans it (its `cleanTok`), so the `device:` keys it
   wrote are the same strings: lower case, [a-z0-9_-], 32 at most.  The join
   sends `{id, env}`, the account requests the id alone. */
export function cleanDevice(dev) {
  const raw = dev && typeof dev === 'object' ? dev.id : dev;
  if (typeof raw !== 'string') return null;
  const d = raw.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, BOTFP.DEVICE_ID_MAX);
  return d || null;
}

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

export const deviceLockMethods = {
  /* ═══ v2.3.3372: ONE CHANGE AT A TIME TO A CHARACTER'S LOGIN RECORD ═══
     Every change to `auth:<id>` reads the record, works out the next one and
     writes it -- the join's check (a new character registered, a device
     remembered: join.js _verifyJoinAuth), the key handed out or first used
     after a join (loginkeys.js _keysAfterJoin), and the owner's Forget, Give
     a new key and device pass (_deviceLockAdminRoute below).  Between the
     read and the write each can wait on something that is not storage -- the
     account check's fetch (a new character's, once the owner switches it on),
     a key's or a phrase's hash -- and while it does, other events run
     (handoff rule 9): two at once both read the same record and the second
     write throws the first away.  In the suite's room (login-keys §12) the
     owner's Forget was written back over by a join's handout that had read
     the record before it, the forgotten devices and keys with it, and a join
     that remembered its device after a Forget brought them all back.  On
     Cloudflare the hashes are thought to answer at once, so today only the
     fetch is known to open that gap -- and none of this may depend on it.
     Each change runs here now, after every one started before it for the
     same id has finished, whatever became of it (inbox.js _inboxSerial's
     shape).  In memory only: a restart has nothing running.  Never nested --
     a run that took it never asks for it again. */
  _authSerial(id, fn) {
    if (!this._authChains) this._authChains = new Map();
    const key = String(id);
    const prev = this._authChains.get(key) || Promise.resolve();
    const run = prev.then(() => fn(), () => fn());
    const tail = run.then(() => {}, () => {});
    this._authChains.set(key, tail);
    tail.then(() => { if (this._authChains.get(key) === tail) this._authChains.delete(key); });
    return run;
  },

  /* v2.3.3372: put a player out for their login (`why` 'device' or 'key'),
     and let them LEAVE: the AFK sweep's three steps (tick.js, flood.js
     _floodClose) -- the close, the leaving run now (the save, player_leave,
     the party's and duel's grace), the session gone.  Not the kick's old way
     (admin.js, before v2.3.3356): deleting the session first left the body
     standing in the world. */
  async _authPutOut(ws, why) {
    try { ws.send(JSON.stringify({ type: 'join_rejected', reason: why })); } catch (e) { /* closed */ }
    try { ws.close(why === 'key' ? 4017 : DEVICE_LOCK.CLOSE, why); } catch (e) { /* closed */ }   /* 4017: LOGIN_KEYS.CLOSE (loginkeys.js imports this file) */
    try { await this.webSocketClose(ws); } catch (e) { /* best effort */ }
    this.sessions.delete(ws);
  },

  /* the kill switch, read the lower-case way (TRAPS §117) */
  _deviceLockOn() {
    const f = this._liveFlags;
    return !(f && typeof f === 'object' && own(f, 'devicelock') && !f.devicelock);
  },

  /* the overview's counts */
  _dlTally(k, n) {
    const c = this._dlCount || (this._dlCount = { known: 0, first: 0, pass: 0, refused: 0, checks: 0 });
    c[k] = (c[k] || 0) + (n || 1);
  },

  /* What a matching key from `device` may do for this character now:
     'known' (one of its devices), 'pass' (the owner let one new device in),
     'first' (no device known for it yet), or 'refuse'. */
  _deviceDecide(auth, device, now) {
    const devs = auth && Array.isArray(auth.devs) ? auth.devs : [];
    if (device && devs.some((e) => e && e.d === device)) return 'known';
    if (device && auth && auth.pass && typeof auth.pass.until === 'number' && auth.pass.until > now) return 'pass';
    if (!devs.length && !(auth && auth.sealed)) return 'first';
    return 'refuse';
  },

  /* Remember `device` for this character after a 'first' or 'pass' decision:
     added at the end, the oldest added dropped past MAX; a pass is spent and
     a seal broken by the device it let in.  One put, and only when something
     changed. */
  async _deviceRemember(id, auth, device, how, now) {
    if (!auth || typeof auth !== 'object' || !device) return;
    const devs = Array.isArray(auth.devs) ? auth.devs.filter((e) => e && typeof e.d === 'string' && e.d !== device) : [];
    devs.push({ d: device, at: now });
    while (devs.length > DEVICE_LOCK.MAX) devs.shift();
    const next = { ...auth, devs };
    if (how === 'pass') { delete next.pass; delete next.sealed; }
    await this.state.storage.put('auth:' + id, next);
  },

  /* The list for a character that has none yet: run the one-time fill first
     (every caller that is about to decide awaits it; the input gate keeps the
     rest of the room's events out while its storage reads are in flight). */
  async _deviceFillReady(now) {
    if (this._devFilled) return;
    if (this._devFillFailAt && now - this._devFillFailAt < DEVICE_LOCK.FILL_RETRY_MS) return;
    if (!this._devFillP) {
      this._devFillP = this._deviceFill()
        .catch((e) => { this._devFillFailAt = Date.now(); console.warn('[devicelock] fill failed:', e && e.message); })
        .finally(() => { this._devFillP = null; });
    }
    await this._devFillP;
  },

  /* The devices the worker already knew, into each registered character's
     list (see the header).  Once: `devlock:filled` {at, chars, devices}. */
  async _deviceFill() {
    const S = this.state.storage;
    const done = await S.get(DEVICE_LOCK.FILLED_KEY);
    if (done) { this._devFilled = true; return; }
    /* pid -> Map(device -> when it was last seen there) */
    const byId = new Map();
    const add = (pid, d, at) => {
      if (typeof pid !== 'string' || !pid || !d) return;
      let m = byId.get(pid);
      if (!m) byId.set(pid, (m = new Map()));
      if (!m.has(d) || m.get(d) < at) m.set(d, at);
    };
    const devs = await S.list({ prefix: 'device:' });
    for (const [k, v] of devs) {
      const d = cleanDevice(k.slice('device:'.length));
      if (!d || !v || !Array.isArray(v.ids)) continue;
      for (const e of v.ids) if (e && typeof e.id === 'string') add(e.id, d, Number(e.lastSeen) || 0);
    }
    const stats = await S.list({ prefix: 'botstat:' });
    for (const [k, v] of stats) {
      const d = v && cleanDevice(v.deviceId);
      if (d) add(k.slice('botstat:'.length), d, Number(v.updatedAt) || 0);
    }
    let chars = 0, devices = 0;
    const ids = [...byId.keys()];
    for (let i = 0; i < ids.length; i += DEVICE_LOCK.FILL_BATCH) {
      const puts = Object.create(null);
      const batch = ids.slice(i, i + DEVICE_LOCK.FILL_BATCH);
      /* one read a batch (storage.get takes up to 128 keys) */
      const got = await S.get(batch.map((pid) => 'auth:' + pid));
      for (const pid of batch) {
        const auth = got && got.get ? got.get('auth:' + pid) : null;
        /* only registered characters, and never over a list a join already
           wrote (Array.isArray: a character registered since keeps its own) */
        if (!auth || typeof auth !== 'object' || Array.isArray(auth.devs)) continue;
        const list = [...byId.get(pid)].map(([d, at]) => ({ d, at }))
          .sort((a, b) => a.at - b.at).slice(-DEVICE_LOCK.MAX);
        puts['auth:' + pid] = { ...auth, devs: list };
        chars++; devices += list.length;
      }
      if (Object.keys(puts).length) await S.put(puts);
    }
    await S.put(DEVICE_LOCK.FILLED_KEY, { at: Date.now(), chars, devices });
    this._devFilled = true;
    this._devFillInfo = { chars, devices };
  },

  /* The join's half (join.js _verifyJoinAuth, after the key matched):
     true to let it in, 'device' to refuse. */
  async _deviceLockJoin(id, auth, device, now) {
    if (!this._deviceLockOn()) return true;
    let a = auth;
    if (!Array.isArray(a.devs)) {
      await this._deviceFillReady(now);
      a = (await this.state.storage.get('auth:' + id)) || auth;
    }
    const how = this._deviceDecide(a, device, now);
    if (how === 'refuse') { this._dlTally('refused'); return 'device'; }
    this._dlTally(how);
    if ((how === 'first' || how === 'pass') && device) await this._deviceRemember(id, a, device, how, now);
    return true;
  },

  /* The account requests' half (account.js): the decision without writing
     anything -- 'refuse' when this device could not play the character. */
  async _deviceLockCheck(id, auth, device, now) {
    if (!this._deviceLockOn()) return 'off';
    this._dlTally('checks');
    let a = auth;
    if (!Array.isArray(a.devs)) {
      await this._deviceFillReady(now);
      a = (await this.state.storage.get('auth:' + id)) || auth;
    }
    return this._deviceDecide(a, device, now);
  },

  /* /api/admin/device-pass and /api/admin/device-forget (admin.js, after the
     key check).  null for every other path. */
  async _deviceLockAdminRoute(request, url, path, json) {
    if (request.method !== 'POST' || (path !== '/device-pass' && path !== '/device-forget' && path !== '/key-new')) return null;
    let body = null;
    try { body = await request.json(); } catch (e) { body = null; }
    const id = body && typeof body.playerId === 'string' ? body.playerId.trim() : '';
    if (!id) return json({ ok: false, error: 'playerId required' }, 400);
    const now = Date.now();
    await this._deviceFillReady(now);
    /* v2.3.3372: the read, the put-out and the write in the record's queue
       (_authSerial): a join's handout can no longer read the record before
       this write and write it back after, the forgotten device and keys with
       it */
    const r = await this._authSerial(id, () => this._deviceLockAdminRun(id, path, now));
    if (r.error) return json({ ok: false, error: r.error });
    await this._adminLog({ op: path.slice(1), playerId: id, forgot: r.forgot, taken: r.taken });
    return json({
      ok: true, until: r.until, devices: r.devices, forgot: r.forgot, sealed: r.sealed, wasOnline: r.wasOnline,
      taken: r.taken, ...(r.key ? { key: r.key } : {}),
    });
  },

  /* The three tools' change to one record, in its queue (above). */
  async _deviceLockAdminRun(id, path, now) {
    const auth = await this.state.storage.get('auth:' + id);
    /* 200 and the reason in words: the Test panel says "Failed: <error>" for
       it, where a 404 reads as "is that character online?" (DevPanel.jsx) */
    if (!auth || typeof auth !== 'object') return { error: 'No character has that code. Check it for typos.' };
    const next = { ...auth };
    let forgot = 0, wasOnline = false, taken = 0, key = null, h = null;
    if (path === '/device-pass') {
      next.pass = { until: now + DEVICE_LOCK.PASS_MS, at: now };
    } else {
      /* no pass here (the header says why) -- and an old one goes too */
      forgot = Array.isArray(auth.devs) ? auth.devs.length : 0;
      next.devs = [];
      next.sealed = true;
      delete next.pass;
      /* v2.3.3355: and every new Login Key taken back (loginkeys.js): one
         may be in the hands of whoever got in.  The record first (below):
         an index entry it no longer lists finds nothing, so a failure
         between the two leaves no key working */
      next.keys = [];
      /* v2.3.3355: "Give it a new key" -- the full reset for a stolen
         character: the old key retired too, and ONE new key, for the owner to
         send its player (shown once in the Test panel, never logged) */
      if (path === '/key-new') {
        delete next.pfHash; delete next.fresh; next.oldGone = 1;
        key = makeLoginKey();
        h = await this._keyHash(key);
        next.keys = [{ h, d: null, at: now, ok: 0 }];
      }
      /* whoever is playing it now is put out, and LEAVES (_authPutOut).
         v2.3.3355: with the key's reason after a new key (its screen offers
         the key form), the device's after a forget.  v2.3.3372: a join
         already past its check but not yet playing is put out by its own
         handout, which reads this record after this write (loginkeys.js
         _keysAfterJoin). */
      const live = this._wsBySessionId && this._wsBySessionId(id);
      if (live) {
        wasOnline = true;
        await this._authPutOut(live, key ? 'key' : 'device');
      }
    }
    /* v2.3.3355: a new key's index in the same write as its record */
    if (key) await this.state.storage.put({ ['auth:' + id]: next, ['keyidx:' + h]: { id, at: now } });
    else await this.state.storage.put('auth:' + id, next);
    if (path !== '/device-pass') taken = this._keysTakeBack ? await this._keysTakeBack(auth) : 0;
    return {
      until: next.pass ? next.pass.until : null,
      devices: Array.isArray(next.devs) ? next.devs.length : 0, forgot, sealed: !!next.sealed, wasOnline,
      taken, key,
    };
  },

  /* for /api/admin/overview */
  _deviceLockInfo() {
    const c = this._dlCount || {};
    return {
      on: this._deviceLockOn(), filled: !!this._devFilled, fill: this._devFillInfo || null,
      known: c.known || 0, first: c.first || 0, pass: c.pass || 0, refused: c.refused || 0, checks: c.checks || 0,
    };
  },
};
