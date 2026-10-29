/* ═══ v2.3.3768: THE PARTY STRIP FOLDS TO A CHIP ═══
 *
 * The owner, 2026-10-28: "Also is partying unobtrusive right now? Just wanting
 * to make sure the screen isn't cluttered with party stuff".  It was not: in a
 * party the roster strip (PartyHUD.jsx) stood open at the top left all the
 * time, 164 px wide and about 150 px tall for four -- some 40% of a sideways
 * phone's height -- and could not be put away.
 *
 * Now it is a CHIP by default: the party mark, "3/4", and a pip a member
 * coloured as their health bar is.  A tap opens the list, a tap on its head
 * folds it again, and the choice is kept on the device (LIST_KEY).  The list
 * opens BY ITSELF for ATTN_MS when something needs you -- a member joins or
 * leaves, goes down, or drops under LOW_FRAC of their health -- and folds
 * again after, unless you opened it yourself.
 *
 * The rules live here, with no imports, so server/test/party-chip.test.mjs
 * runs them in node exactly as the page does.
 */

/** Where the device keeps "I opened the party list" ('open'; folded else). */
export const LIST_KEY = 'bt_party_list';
/** How long the list stays open by itself when something needs you. */
export const ATTN_MS = 4000;
/** Under this share of their health a member is "low" (the bar's red). */
export const LOW_FRAC = 0.25;
/** How long the first tap on a kick waits for the second (the ✖ Leave's). */
export const KICK_ARM_MS = 3000;

/* the bar's colours (PartyHUD v2.3.1232: green, stamina amber, red) */
export const PIP_COLOR = Object.freeze({ ok: '#59BF91', mid: '#D8A94D', low: '#D95C54', down: '#D95C54', off: '#5E6A6C' });

function healthFrac(m) {
  return m && m.maxHp > 0 ? Math.max(0, Math.min(1, m.hp / m.maxHp)) : 0;
}

/** A member's pip: 'off' (offline or away), 'down', or the bar's colour by
 *  their health -- 'ok' over half, 'mid' over LOW_FRAC, 'low' under. */
export function pipOf(m) {
  if (!m) return 'off';
  if (m.off || m.away) return 'off';
  if (m.dead) return 'down';
  const f = healthFrac(m);
  return f > 0.5 ? 'ok' : f > LOW_FRAC ? 'mid' : 'low';
}

/**
 * What changed that needs you, from the last roster seen to this one.
 * `prev` is the caller's memory (null the first time: nothing is news on the
 * first roster, it is just the party you are in), and the memory for next
 * time comes back as `seen`.  You are never news to yourself: your own health
 * has its own bar.  An offline member's health is not news either.
 * Returns { why: 'join' | 'leave' | 'down' | 'low' | null, seen }.
 */
export function partyAttention(prev, members, myId) {
  const seen = Object.create(null);
  const list = Array.isArray(members) ? members : [];
  let why = null;
  const rank = { join: 1, leave: 1, low: 2, down: 3 };
  const take = (w) => { if (!why || rank[w] > rank[why]) why = w; };
  for (const m of list) {
    if (!m || typeof m.id !== 'string') continue;
    const off = !!(m.off || m.away);
    const down = !off && !!m.dead;
    const low = !off && !down && healthFrac(m) < LOW_FRAC;
    seen[m.id] = { down, low, off };
    if (!prev || m.id === myId) continue;
    const was = Object.prototype.hasOwnProperty.call(prev, m.id) ? prev[m.id] : null;
    if (!was) { take('join'); continue; }
    if (down && !was.down) take('down');
    else if (low && !was.low && !was.down) take('low');
  }
  if (prev) {
    for (const id in prev) {
      if (id !== myId && !seen[id]) take('leave');
    }
  }
  return { why, seen };
}

/** Is the list open now: opened by you, or by itself until `attnUntil`. */
export function listOpen(pinned, attnUntil, now) {
  return !!pinned || (typeof attnUntil === 'number' && typeof now === 'number' && now < attnUntil);
}
