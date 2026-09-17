/* ═══ v2.3.2618: ACE'S COIN FLIP ═══
 *
 * The dialog's state, outside React, for the same reason shopBus is: the
 * thing that OPENS it (an NPC proximity check inside the game loop) and the
 * thing that RESOLVES it (a WebSocket message handler) both live outside the
 * component tree, and threading setState down to either is how those files
 * end up importing UI.
 *
 * THE OUTCOME IS THE SERVER'S, NOT OURS.  `result` is only ever written from
 * an `ace_flip_result` event, and the coins it moved arrive separately on the
 * authoritative player_state echo.  The panel picks WHICH strip to play off
 * `result.won` -- it never decides what won.  A client that rolled its own
 * coin for 3x the stake would be a solo gold faucet, which is exactly what
 * the Gamble Hall's own history records (gamble.js header).
 */
const listeners = new Set();
const emit = () => { for (const fn of listeners) fn(); };

export const aceFlipBus = {
  open: false,
  /* The stake the player has dialled in, in gold. */
  stake: 0,
  /* True from the moment the request goes out until the result lands, so a
     second tap cannot send a second stake -- on a phone a double-tap is the
     normal way to press something once.  Also what the coin animates on. */
  pending: false,
  /* {won, stake, risk, delta} straight off the wire, or null. */
  result: null,
  /* Bumped on every settled flip so the panel can re-run the coin animation
     even when two flips in a row have the same outcome.  A counter rather
     than a boolean for exactly that reason. */
  settled: 0,
  /* One line of Ace talking back -- a refusal, or what just happened. */
  note: '',

  setOpen(v) {
    this.open = !!v;
    if (!this.open) { this.pending = false; this.result = null; this.note = ''; }
    emit();
  },
  setStake(v) { this.stake = Math.max(0, Math.floor(Number(v) || 0)); emit(); },
  setPending(v) { this.pending = !!v; emit(); },
  setNote(t) { this.note = t || ''; emit(); },
  /* Called from the gameEvents handler. Clears `pending` in the same tick it
     records the outcome, so the button can never be left stuck if the coin
     animation is interrupted by the panel closing. */
  settle(payload) {
    this.result = payload || null;
    this.pending = false;
    this.settled = (this.settled + 1) % 1000000;
    emit();
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

if (typeof window !== 'undefined') window.__btAceFlipBus = aceFlipBus;
