/* ═══ v2.3.3520: THE ROAD WITH NO LOADING SCREEN WAITS FOR YOUR BRO TOO ═══
 *
 * The owner, playtesting: "flicker of hair/torso after returning/joining".
 *
 * Two roads into the world: the ordinary one (Continue, your row, the
 * loading screen), which waits for every picture of your bro before it lifts
 * (pixiRenderer preloadPlayerAssets, the animation-preload law); and the
 * straight-in road (BroTown's auto-rejoin: the black-screen watchdog's
 * recovery reload, or a row from the picker that switches keys), which has
 * NO loading screen -- the world went up at once while those same pictures
 * were still being made, behind a small spinner.  Measured on it
 * (mp-joinflicker, a copper torso and iron greaves the worker holds as worn):
 * 26 of the first 58 frames drew the plain body under the armour, the mask
 * not baked yet for that frame of the run, against 2 on the ordinary road
 * and none after a renderer rebuild or a tab switch.  Hair waits on the same
 * preload (its colour, its clip under a hat).
 *
 * So that road now holds the world behind a veil of its own until the
 * preload is done -- AVATAR_HOLD_CAP_MS at the most, so a hung download costs
 * a moment of flicker, never a world that does not appear.  Its own element
 * (the zone overlay's look, `.bt-zone-loading`), not the shared zone overlay:
 * that one is put away by six callers who do not know about each other, any
 * of whom would have lifted this too soon; and the class is what the
 * black-screen watchdog already reads as "veiled, meant to be dark"
 * (BroTown `_wdVeiled`).  S._avatarArtHold holds the bro still under it, as
 * the other holds do.
 *
 * No imports: the caller hands it the wait and the name to show. */

export const AVATAR_HOLD_CAP_MS = 20000;   /* the loading screen's own cap on the same preload (IntroVideo hardCap) */

/* `?avatarholdms=` (1-180 s) for a slow test machine, where the preload takes
   longer than the cap: mp-joinflicker waits for the pictures themselves */
function _capMs() {
  try {
    const m = /[?&]avatarholdms=(\d+)/.exec((typeof location !== 'undefined' && location.search) || '');
    if (m) return Math.max(1000, Math.min(180000, Number(m[1])));
  } catch (e) { /* the cap */ }
  return AVATAR_HOLD_CAP_MS;
}

/** v2.3.3689: while the veil is up, wait for `wait` too.  The worker's
    state_sync can put a different look on (the first join of a Login Key on
    a new device, a picker row that had no look yet), and the veil's preload
    had made the device's old one: that look's pictures are waited for under
    the same veil.  False when there is no veil up to hold. */
export function holdForAvatarAlso(S, wait) {
  const h = S && S._avatarArtHold;
  if (!h || h.liftedAt || !wait || typeof h._also !== 'function') return false;
  h._also(wait);
  return true;
}

/** Hold the world until `wait` settles (or the cap).  `name` is the veil's
    line ("BroTown").  Returns the hold record, also on S._avatarArtHold. */
export function holdForAvatar(S, wait, name) {
  if (!S || !wait) return null;
  const h = { t: Date.now(), liftedAt: 0, why: null };
  S._avatarArtHold = h;
  let el = null;
  try {
    if (typeof document !== 'undefined' && document.body) {
      el = document.createElement('div');
      el.className = 'bt-zone-loading bt-avatar-hold';
      const spin = document.createElement('div');
      spin.className = 'bt-zone-loading-spin';
      const lbl = document.createElement('div');
      lbl.className = 'bt-zone-loading-name';
      lbl.textContent = name || '';
      el.appendChild(spin);
      el.appendChild(lbl);
      document.body.appendChild(el);
    }
  } catch (e) { el = null; }
  const lift = (why) => {
    if (h.liftedAt) return;
    h.liftedAt = Date.now();
    h.why = why;
    if (S._avatarArtHold === h) S._avatarArtHold = null;
    try { if (el) el.remove(); } catch (e) { /* gone */ }
  };
  /* v2.3.3689: more than one wait (holdForAvatarAlso), lifted when every one
     has settled, the cap still counted from when the veil went up */
  let pending = 0;
  const settle = () => { if (--pending <= 0) lift('ready'); };
  h._also = (p) => { pending++; Promise.resolve(p).then(settle, settle); };
  h._also(wait);
  setTimeout(() => lift('cap'), _capMs());
  /* QA (mp-joinflicker): when it went up, when it came down and why */
  try { if (typeof window !== 'undefined') window.__btAvatarHold = h; } catch (e) { /* no window */ }
  return h;
}
