/* ═══ v2.3.3198: THE MONSTER CODEX, ON THE PHONE ═══
 *
 * Owner, 2026-10-12: "After you kill a monster you learn more about it ...
 * it'll be another dashboard section that just displays information."
 *
 * The worker counts each player's kills of each of the nine kinds
 * (server/src/codex.js) and says so twice: the whole record at join
 * (`codex_state`) and, on every kill it counted, the kind's new counts on that
 * kill's own `combat_credit` (`cx`).  This keeps the latest of those in
 * `S._codex` for the Codex page (src/ui/mobile/dash/MonsterCodex.jsx) and,
 * when a kill opens a page -- the first of its kind; every fact on the page
 * opens with it, the owner's call -- says so over your head, in plain words
 * (world text never carries emoji: the iPhone Safari crash, nodeLabels.js),
 * and remembers it as NEW until its page is opened.
 *
 * Nothing here decides anything: a count is only ever the worker's. */
import { pushDmgPopup } from '@/game/combatHelpers.js';
import { CODEX_KINDS, codexEntry, codexFactsAt } from '@/data/monsterCodex.js';

const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

function codexOf(S) {
  if (!S._codex) S._codex = { known: false, unavailable: false, k: Object.create(null), fresh: Object.create(null), rev: 0 };
  return S._codex;
}
function bump(c) { c.rev = (c.rev + 1) % 1e9; }

/** Is the codex counting on this worker? (`caps.codex`, set by state_sync) */
export function codexLive(S) {
  return !!(S && S._serverCaps && S._serverCaps.codex);
}

/** A kind's counts: [kills, kills past level 20]. */
export function codexCounts(S, kind) {
  const c = S && S._codex;
  return c && has(c.k, kind) ? c.k[kind] : [0, 0];
}

/** The whole record, at join: `{v, k}` or `{unavailable}`. */
export function onCodexState(S, p) {
  if (!S || !p) return;
  const c = codexOf(S);
  c.known = true;
  c.unavailable = !!p.unavailable;
  const k = Object.create(null);
  if (!p.unavailable && p.k && typeof p.k === 'object') {
    for (const kind of CODEX_KINDS) {
      if (!has(p.k, kind) || !Array.isArray(p.k[kind])) continue;
      const n = Math.max(0, Math.floor(Number(p.k[kind][0]) || 0));
      const n2 = Math.max(0, Math.min(n, Math.floor(Number(p.k[kind][1]) || 0)));
      if (n) k[kind] = [n, n2];
    }
  }
  c.k = k;
  bump(c);
}

/** One kill the worker counted (`combat_credit.cx` = {k, n, n2}). */
export function onCodexKill(S, cx) {
  if (!S || !cx || typeof cx.k !== 'string' || !CODEX_KINDS.includes(cx.k)) return;
  const c = codexOf(S);
  const before = has(c.k, cx.k) ? c.k[cx.k] : [0, 0];
  const n = Math.max(0, Math.floor(Number(cx.n) || 0));
  const n2 = Math.max(0, Math.min(n, Math.floor(Number(cx.n2) || 0)));
  c.k[cx.k] = [n, n2];
  /* what this kill opened that the last count had not -- the whole page at
     the first kill, nothing after */
  const was = codexFactsAt(before[0]);
  const opened = codexFactsAt(n).filter((f) => !was.includes(f));
  if (opened.length) {
    const fresh = has(c.fresh, cx.k) ? c.fresh[cx.k] : [];
    for (const f of opened) if (!fresh.includes(f)) fresh.push(f);
    c.fresh[cx.k] = fresh;
    const e = codexEntry(cx.k);
    const what = 'New in the Codex: ' + (e ? e.name : 'a monster');
    try { const P = S.player; if (P) pushDmgPopup(S, P.x, P.y - 96, what, '#5FD3C0'); } catch (e2) { /* popup only */ }
  }
  bump(c);
}

/** The facts a kind has that its page has not shown yet. */
export function codexFresh(S, kind) {
  const c = S && S._codex;
  return c && has(c.fresh, kind) ? c.fresh[kind] : [];
}
/** How many kinds have something new to read. */
export function codexFreshCount(S) {
  const c = S && S._codex;
  if (!c) return 0;
  let n = 0;
  for (const kind of CODEX_KINDS) if (has(c.fresh, kind) && c.fresh[kind].length) n++;
  return n;
}
/** Its page was opened: nothing on it is new any more. */
export function codexSeen(S, kind) {
  const c = S && S._codex;
  if (!c || !has(c.fresh, kind)) return;
  delete c.fresh[kind];
  bump(c);
}
