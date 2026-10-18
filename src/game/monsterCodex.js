/* ═══ v2.3.3209: THE MONSTER CODEX, ON THE PHONE ═══
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
 * Nothing here decides anything: a count is only ever the worker's.
 *
 * ═══ v2.3.3336: A NEW MONSTER IS ANNOUNCED, AND THE ANNOUNCEMENT OPENS ITS PAGE ═══
 * Owner, playtesting: "Make the new codex entry for monsters as a 'new
 * monster' announcement instead of a new codex entry and have it jump to the
 * codex area."  The page-opening kill no longer floats "New in the Codex: X"
 * over your head (world text: nothing to tap).  It raises a NEW MONSTER card
 * (src/ui/panels/NewMonsterCard.jsx) for `ANNOUNCE_MS`: `announce` below says
 * which, and a tap on it asks the Codex to open on that monster's page
 * (`codexOpenPage` / `takeCodexOpen`, read by the Codex panel). */
import { CODEX_KINDS, codexFactsAt } from '@/data/monsterCodex.js';

/* v2.3.3336: how long the NEW MONSTER card stays up -- long enough to read
   and reach in a fight, short enough not to sit over it */
export const ANNOUNCE_MS = 6000;

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
    /* v2.3.3336: announced on its card, not in words over your head */
    c.announce = { kind: cx.k, at: Date.now() };
  }
  bump(c);
}

/** v2.3.3336: the NEW MONSTER card's subject while it is up: {kind, at}. */
export function codexAnnouncement(S, now) {
  const c = S && S._codex;
  const a = c && c.announce;
  if (!a) return null;
  if ((now || Date.now()) - a.at >= ANNOUNCE_MS) { c.announce = null; return null; }
  return a;
}
/** v2.3.3336: put the card away (its time is up, or it was tapped). */
export function codexAnnounceDone(S, at) {
  const c = S && S._codex;
  if (c && c.announce && (at == null || c.announce.at === at)) { c.announce = null; bump(c); }
}
/** v2.3.3336: ask the Codex to open on a kind's page; the Codex panel takes it
    when it is open or next opens (takeCodexOpen). */
export function codexOpenPage(S, kind) {
  if (!S || !CODEX_KINDS.includes(kind)) return;
  const c = codexOf(S);
  c.openReq = kind;
  bump(c);
}
/** v2.3.3336: the page asked for, if one is waiting -- without taking it (a
    first render's guess; takeCodexOpen is what clears it). */
export function codexOpenWaiting(S) {
  const c = S && S._codex;
  return (c && c.openReq) || null;
}
/** v2.3.3336: the page asked for, once (null when none is waiting). */
export function takeCodexOpen(S) {
  const c = S && S._codex;
  const k = c && c.openReq;
  if (!k) return null;
  c.openReq = null;
  return k;
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
