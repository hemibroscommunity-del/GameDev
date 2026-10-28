/* ═══ v2.3.3727: A CROWD OF ONE SOUND STARTS AS A FEW (`?voicecap`) ═══
 *
 * The owner asked about many copies of the SAME sound starting at nearly the
 * same moment in a crowd, and wants them grouped into one or a few.  Other
 * players' sounds already are (game/eventSounds.js peerShare, 4 a 200 ms;
 * their steps 3 a 200 ms; hitSounds.js's echo hits 3 a 150 ms), and the menu's
 * ticks (BT_AUDIO.uiTick, one a gesture).  YOUR OWN fight and the MONSTERS'
 * had no limit on purpose (gameDisplay.js, the v2.3.2639 note: a flurry is
 * meant to layer): a whirlwind into a pack of ten starts ten hit voices, and
 * then their deaths, in one instant -- one loud, smeared, phasey burst, the
 * same recording on top of itself, that can clip.
 *
 * With the switch on, every one-shot BT_AUDIO.play starts (and every cue
 * layer, which plays through it) passes one rule: at most N copies of one
 * recording (the same sample key) may START within W ms of each other, by
 * when each is scheduled to sound (a layer's delay counts).  A copy over that
 * is not started.
 *   - The first copy always plays (the v2.3.2452 first-blow rule): a key with
 *     nothing started in its window is never held back.
 *   - Different keys never hold each other back: the swing rotation's three
 *     recordings still layer, a hit's material layers still sound together.
 *   - The menu's sounds (`ui-*`, BT_AUDIO.uiTick's own rule), the loops
 *     (startSfxLoop) and the music never pass it.
 * The kept copies are not made louder: no level change here without a
 * listen (the owner's call).
 *
 * Off by default (the game as it was).  `?voicecap` turns it on at N, W
 * below; `?voicecap=4:60` tries other values.  It changes no memory: every
 * copy of a recording plays one decoded buffer.  Plain data, no imports, so
 * node tests it (server/test/sound-cues.test.mjs §19). */

export const VOICE_N = 3;
export const VOICE_W_MS = 50;

/** Never held back: the menu's ticks have their own rule (uiTick). */
export function exempt(key) {
  return typeof key !== 'string' || /^ui-/.test(key);
}

/** `?voicecap`, `?voicecap=N:W` from a location.search: null when off. */
export function parseVoiceCap(search) {
  const m = /[?&]voicecap(?:=(\d+)(?::(\d+))?)?(?:&|$)/.exec(String(search || ''));
  if (!m) return null;
  const n = m[1] ? Math.max(1, Math.min(16, parseInt(m[1], 10))) : VOICE_N;
  const w = m[2] ? Math.max(5, Math.min(500, parseInt(m[2], 10))) : VOICE_W_MS;
  return { n, w };
}

/** The rule: `allow(key, t)` says whether a copy of `key` scheduled to start
 *  at `t` ms may start, and if so remembers it.  `now` (default t) lets go of
 *  starts long past. */
export function makeVoiceCap(n, w) {
  const starts = new Map();   /* key -> start times, ms (client keys: a Map) */
  return {
    n, w,
    allow(key, t, now) {
      if (exempt(key)) return true;
      const keep = (now == null ? t : now) - w - 2500;   /* a layer's delay is at most 2 s */
      let a = starts.get(key);
      if (a) {
        a = a.filter((s) => s > keep);
        let near = 0;
        for (const s of a) if (Math.abs(s - t) < w) near++;
        if (near >= n) { starts.set(key, a); return false; }
      } else a = [];
      a.push(t);
      starts.set(key, a);
      return true;
    },
    clear() { starts.clear(); },
  };
}
