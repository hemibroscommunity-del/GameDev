/* ═══ v2.3.3785: THE BANK'S VAULT, THE PHONE'S HALF ═══
   The owner: "Oh yeah make it so you can actually deposit and retrieve items
   and gold from the bank".  The worker holds the vault (server/src/bank.js,
   docs/specs/bank-vault.md); this file asks it and keeps what it answered.

   The worker is the authority for all of it: a move is ASKED (bank_deposit /
   bank_withdraw), nothing in the bag, the purse or the vault changes here, and
   the bag and the purse come back on the player_state that follows the
   answer.  `S._bank` is the vault as the last bank_state said it.

   Each move carries an opId, so a resend after a drop moves nothing twice.
   One move at a time: a tap while one waits is ignored for ASK_MS, then the
   window may ask again (the worker answers every ask).

   No imports: the Bank's window and the tests read it. */

export const BANK_ASK_MS = 4000;
/* the amount chips, the owner's list: 10, 100 and All */
export const BANK_CHIPS = Object.freeze([10, 100]);

const listeners = new Set();
let rev = 0;
export function bankSubscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function bankRev() { return rev; }
function bump() { rev++; listeners.forEach((fn) => { try { fn(rev); } catch (e) { /* a window gone */ } }); }

/** Does this worker keep vaults (caps.bank)? */
export function bankOn(S) {
  return !!(S && S._serverCaps && S._serverCaps.bank);
}

let seq = 0;
function newOpId() {
  seq = (seq + 1) % 1e6;
  return 'bk-' + Date.now().toString(36) + '-' + seq.toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36);
}

/** Ask for the vault (the window does as it opens). */
export function bankOpen(S) {
  if (!S || !S.channel || !bankOn(S)) return false;
  try { S.channel.send({ type: 'bank_open', payload: {} }); } catch (e) { return false; }
  return true;
}

/** Is a move waiting for its answer? */
export function bankBusy(S, now) {
  const p = S && S._bankPending;
  const t = typeof now === 'number' ? now : Date.now();
  return !!(p && t - p.at < BANK_ASK_MS);
}

/** Ask for a move: dir 'in' | 'out', kind 'item' | 'gold', id (an item's
 *  key), n (a whole count).  Returns whether it was sent. */
export function bankMove(S, dir, kind, id, n, now) {
  if (!S || !S.channel || !bankOn(S)) return false;
  if (dir !== 'in' && dir !== 'out') return false;
  if (kind !== 'item' && kind !== 'gold') return false;
  if (kind === 'item' && (typeof id !== 'string' || !id)) return false;
  if (!Number.isInteger(n) || n < 1) return false;
  const t = typeof now === 'number' ? now : Date.now();
  if (bankBusy(S, t)) return false;
  const opId = newOpId();
  const payload = kind === 'gold' ? { kind, n, opId } : { kind, id, n, opId };
  S._bankPending = { at: t, opId };
  try {
    S.channel.send({ type: dir === 'in' ? 'bank_deposit' : 'bank_withdraw', payload });
  } catch (e) { S._bankPending = null; return false; }
  bump();
  return true;
}

/** bank_state from the worker (wsClient's DIRECT switch). */
export function onBankState(S, p) {
  if (!S || !p || typeof p !== 'object') return;
  const items = Array.isArray(p.items) ? p.items.filter((it) => it && typeof it.key === 'string' && Number(it.n) > 0)
    .map((it) => ({ key: it.key, n: Math.floor(Number(it.n)) })) : [];
  S._bank = {
    ok: p.ok !== false,
    on: p.on !== false,
    gold: Math.max(0, Math.floor(Number(p.gold) || 0)),
    items,
    slots: Math.max(0, Math.floor(Number(p.slots) || 0)),
    noBank: Array.isArray(p.noBank) ? p.noBank.filter((k) => typeof k === 'string') : [],
    last: p.last && typeof p.last === 'object' ? p.last : null,
    at: Date.now(),
  };
  if (S._bankPending && (!p.last || p.last.opId === S._bankPending.opId)) S._bankPending = null;
  bump();
}

/** What the vault holds of `key`. */
export function bankHas(S, key) {
  const b = S && S._bank;
  const it = b && b.items.find((i) => i.key === key);
  return it ? it.n : 0;
}

const REFUSED = Object.freeze({
  not_here: 'Stand at the Bank to use the vault',
  not_enough: "You don't have that many",
  vault_full: 'The vault is full',
  bag_full: "Your bag can't hold that many",
  bad_key: 'That is not there any more',
  kept: 'Tools stay in your bag',
  busy: 'One moment, the bank is busy',
  off: 'The vault is closed for now',
  newer: 'The vault is closed for now',
  bad: "That didn't go through",
});

/** The line under the window for the last move: what happened, or why not.
 *  `name(key)` names an item. */
export function bankLastWords(last, name) {
  if (!last || typeof last !== 'object') return null;
  if (!last.ok) return { ok: false, text: REFUSED[last.err] || REFUSED.bad };
  const n = Math.floor(Number(last.n) || 0);
  const what = last.kind === 'gold' ? n.toLocaleString('en-US') + ' gold'
    : n + ' ' + (typeof name === 'function' ? name(last.id) : String(last.id || 'items'));
  return { ok: true, text: last.dir === 'in' ? 'Put ' + what + ' in the vault' : 'Took ' + what + ' out' };
}

/** A typed amount, read: a whole number from 1 to `max`, or 0. */
export function bankAmount(text, max) {
  const n = Math.floor(Number(String(text == null ? '' : text).replace(/[^0-9]/g, '')) || 0);
  if (n < 1) return 0;
  return typeof max === 'number' && max >= 0 ? Math.min(n, max) : n;
}
