/* ═══ v2.3.5622: THE NAME RULES (card MOD PR 2; the red team's RT-3 S2) ═══
 *
 * The red team (2026-11-14, docs/security/rt3-findings.md S2, proof
 * t1-names.mjs): a character's name could be anything -- a direction override,
 * a zero-width space and a line break were stored for good in `char:<pid>` --
 * and `track` changed it mid-game: one message made a character
 * "Owner\u202e (admin)\n\n\nSYSTEM: your account is banned, send your login",
 * and every peer and room chat read it.  The owner's "names are permanent"
 * (v2.3.1814, join.js) held only at the join.  Now:
 *
 *   A NEW NAME (a character made from now on) is 1 to 20 letters (any
 *   alphabet), digits, spaces, hyphens, apostrophes or underscores, spaces
 *   collapsed, NFC (the name box asks 2 letters at least, its own rule:
 *   data/joinGate.js);
 *   no emoji (a known iPhone Safari crash in the world's outlined text, the
 *   pet names' rule: petbook.js cleanPetName), no hidden or direction
 *   characters, and never a name that reads as the game or its staff
 *   (reservednames.js).  The phone's name box runs the same rule
 *   (src/game/charName.js; mirror-audit) and says why before it joins, so an
 *   honest player never meets the worker's refusal: `join_rejected {reason:
 *   'name', why}`, close CHAR_NAME.CLOSE, before the character is made.
 *   Names already on file are kept as they are (no migration).
 *
 *   THE NAME IS THE RECORD'S: `track` never changes it (`_stampRecordName`,
 *   beside `_stampRecordLook`): a character with a record shows the record's
 *   name, whatever a phone says; a guest (no record) is cleaned by the rule,
 *   and a name that fails it is dropped.
 *
 *   THE OWNER'S RENAME: POST /api/admin/rename {playerId, name, force}
 *   (admin.js's key): `char:<pid>.name`, the live session, a `player_update`
 *   to everyone; the board's row follows at its next report (its signature
 *   holds the name).  The same rule, but `force: true` lets the owner give a
 *   name the staff list holds (the owner's own character).  Logged.
 *
 * KILL SWITCH `namerules: false` in the live flags: a new name is taken as
 * before (control characters stripped, 64 at most) and `track` names pass;
 * the owner's rename stays.
 *
 * Not here: names unique across characters (it needs every name on file read
 * once, a migration: the owner's call, under the card's Needs).
 */
import { nameReadsAsStaff } from './reservednames.js';

export const CHAR_NAME = Object.freeze({ MIN: 1, MAX: 20, CLOSE: 4023 });

/** A name by the rule: `{ name }` when it may be taken, else `{ why }`:
 *  'short', 'long', 'chars' (a character the rule refuses: an emoji, a hidden
 *  or direction mark, a sign) or 'staff' (it reads as the game or its staff). */
export function checkCharName(raw) {
  if (typeof raw !== 'string' || raw.length > 64) return { why: 'chars' };
  const s = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (s.length < CHAR_NAME.MIN) return { why: 'short' };
  if (s.length > CHAR_NAME.MAX) return { why: 'long' };
  if (!/^[\p{L}\p{N} '_-]+$/u.test(s) || !/[\p{L}\p{N}]/u.test(s)) return { why: 'chars' };
  if (nameReadsAsStaff(s)) return { why: 'staff' };
  return { name: s };
}

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

export const charNameMethods = {
  /* the kill switch: `namerules: false` in the live flags */
  _nameRulesOn() {
    const f = this._liveFlags;
    return !(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'namerules') && !f.namerules);
  },

  /** The join's half (join.js, right after the freeze gate, before any
   *  takeover and before the record is made): true when it refused this
   *  socket because a NEW character's name breaks the rule.  `joinData` is
   *  the join's own `data` (its name tidied in place: spaces, NFC).  A
   *  character on file is never asked: its name is kept. */
  async _charNameRefuse(ws, charId, joinData) {
    if (typeof charId !== 'string' || charId.indexOf('bp_') !== 0 || !this._nameRulesOn()) return false;
    if (!joinData || typeof joinData !== 'object') return false;
    const stored = await this.state.storage.get('char:' + charId);
    if (stored && stored.look) return false;
    const raw = joinData && typeof joinData.name === 'string' ? joinData.name : '';
    if (!raw.trim()) return false;   /* a nameless join makes no character (join.js), nothing to judge */
    const c = checkCharName(raw);
    if (c.name) { joinData.name = c.name; return false; }
    try { ws.send(JSON.stringify({ type: 'join_rejected', reason: 'name', why: c.why })); } catch (e) { /* closed */ }
    try { ws.close(CHAR_NAME.CLOSE, 'name'); } catch (e) { /* closed */ }
    if (this._playerLeaves) await this._playerLeaves(ws, 'refused');
    return true;
  },

  /** `track`'s half (index.js, beside _stampRecordLook): the record's name
   *  wins; a guest's is cleaned by the rule or dropped. */
  _stampRecordName(session, clean) {
    if (!clean || !own(clean, 'name') || !this._nameRulesOn()) return;
    const rec = session && session.char;
    if (rec && typeof rec.name === 'string' && rec.name) { clean.name = rec.name; return; }
    const c = checkCharName(clean.name);
    if (c.name) clean.name = c.name; else delete clean.name;
  },

  /* ── THE OWNER'S RENAME (admin.js, after the key) ── */
  async _charNameAdminRoute(request, url, path, json) {
    if (path !== '/rename' || request.method !== 'POST') return null;
    let body = null;
    try { body = await request.json(); } catch (e) { body = null; }
    const id = body && typeof body.playerId === 'string' ? body.playerId.trim().slice(0, 64) : '';
    if (!id) return json({ ok: false, error: 'playerId required' }, 400);
    const c = checkCharName(body.name);
    let name = c.name;
    if (!name && c.why === 'staff' && body.force === true) name = String(body.name).normalize('NFC').replace(/\s+/g, ' ').trim();
    if (!name) return json({ ok: false, error: 'name refused: ' + c.why }, 400);
    const rec = await this.state.storage.get('char:' + id);
    if (!rec) return json({ ok: false, error: 'no such character' }, 404);
    const was = rec.name;
    await this.state.storage.put('char:' + id, { ...rec, name });
    const ws = this._wsBySessionId ? this._wsBySessionId(id) : null;
    const sess = ws && this.sessions ? this.sessions.get(ws) : null;
    if (sess) {
      if (sess.char) sess.char = { ...sess.char, name };
      sess.name = name;
      if (sess.data && typeof sess.data === 'object') sess.data.name = name;
      const ps = this.playerState && this.playerState[id];
      if (ps) ps.name = name;
      if (this.broadcastAll) this.broadcastAll({ type: 'player_update', id, data: { name } });
    }
    if (this._adminLog) await this._adminLog({ op: 'rename', playerId: id, from: was, to: name });
    return json({ ok: true, playerId: id, from: was, name, online: !!sess });
  },
};
