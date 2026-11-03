/* ═══ v2.3.4036: THE WEIGH-IN AND THE BIGGEST-FISH BOARDS, ON THE PHONE ═══
 *
 * The bag's Inspect on a fish asks the worker to weigh one catch of it
 * (`fish_inspect {key}`, server fishlog.js); the answer, `fish_weight`, is
 * shown on the weigh-in card (ui/panels/FishWeighCard.jsx) with a Records
 * link to More -> Ranks -> Biggest fish, which asks for the boards
 * (`fish_board_request`, answered `fish_board`).  The worker rolls and keeps
 * everything; this file only sends the asks and keeps the last answers for
 * the screens.  Both asks only against a worker that says caps.fishweigh.
 *
 * Node-tested where it can be (fish-variants.test.mjs); the one import is the
 * import-free words table.  Spec: docs/specs/fish-variants.md. */
import { fishKeyInfo, fishWeighWords } from '../data/fishVariants.js';

const listeners = new Set();
const st = { card: null, pending: null, want: null };
function emit() { for (const fn of listeners) { try { fn(); } catch (_e) { /* a screen's own */ } } }

/** Screens follow the card and the boards: returns the unsubscribe. */
export function subscribeFishWeigh(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** The worker weighs (caps.fishweigh, read directly: caps-audit). */
export function fishWeighLive(S) {
  return !!(S && S._serverCaps && S._serverCaps.fishweigh);
}

/** Is `key` a fish the bag can offer Inspect on? */
export function canInspectFish(S, key) {
  return fishWeighLive(S) && !!fishKeyInfo(key);
}

/** Inspect: one catch of `key` weighed.  The card opens at once, "Weighing…",
 *  and fills when the answer comes. */
export function askFishWeigh(S, key) {
  if (!canInspectFish(S, key) || !S.channel) return false;
  try { S.channel.send({ type: 'fish_inspect', payload: { key } }); } catch (_e) { return false; }
  st.pending = key;
  st.card = { key, pending: true, at: Date.now() };
  emit();
  return true;
}

/** `fish_weight` from the worker (wsClient's direct switch). */
export function onFishWeight(S, p) {
  if (!p || typeof p !== 'object' || typeof p.key !== 'string') return;
  st.pending = null;
  st.card = { ...p, words: fishWeighWords(p), at: Date.now() };
  if (typeof window !== 'undefined') {
    const q = window.__btFishWeigh || (window.__btFishWeigh = { n: 0, last: null });
    q.n++;
    q.last = st.card;
  }
  emit();
}

/** The weigh-in card's current answer (or `{pending}`), null when closed. */
export function fishWeighCard() { return st.card; }
export function closeFishWeighCard() { st.card = null; st.pending = null; emit(); }

/** Ask for the boards (the Biggest fish tab). */
export function askFishBoard(S) {
  if (!fishWeighLive(S) || !S.channel) return false;
  try { S.channel.send({ type: 'fish_board_request', payload: {} }); } catch (_e) { return false; }
  return true;
}

/** `fish_board` from the worker: kept on S for the tab. */
export function onFishBoard(S, p) {
  if (!S || !p || typeof p !== 'object') return;
  S._fishBoard = { ...p, at: Date.now() };
  if (typeof window !== 'undefined') window.__btFishBoard = S._fishBoard;
  emit();
}

/** The Records link: which species the Biggest fish tab should open on (read
 *  once by the Ranks page, then cleared). */
export function wantFishBoard(sp) { st.want = sp || 'minnow'; emit(); }
export function takeFishBoardWant() { const w = st.want; st.want = null; return w; }
