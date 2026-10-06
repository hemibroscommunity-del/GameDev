/* ═══ v2.3.3064: EACH LAND OF THE WHEEL, ITS OWN MUSIC ═══
 *
 * Asked how to make the Wheel easier to find your way round, the list the
 * owner said to go on building ("Continue building recommended") had music
 * by land in it.  The Wheel is ONE zone, so the zone music never changed
 * inside it: it played the town's track after a login (the loading screen's
 * hand-over asks for town's, IntroVideo.jsx) and the game's own theme after a
 * death, a dungeon or the farm (their way back asks for the Wheel's, and the
 * Wheel had none) -- the same everywhere you walked, either way.
 *
 * Now the land under you picks it, each a key of BT_AUDIO.ZONE_MUSIC
 * (data/gameDisplay.js):
 *   - Brotown and the commons round it, the safe ground: the town's track;
 *   - Frost Ridge frost.mp3, the Flame Fields fire.mp3, the Wind Dunes
 *     desert.mp3 with its wind (ZONE_AMBIENT), the Verdant Wilds forest.mp3
 *     (the old meadow's): the four lands the owner made music for, as they
 *     made banners for the same four;
 *   - the other four (the Stone Hollows, the Electric Foundry, the Water
 *     Caves, the Poison Forest: hollows, thunder, tidal, mist) have no track yet and
 *     play the game's theme.  A track under the land's id in ZONE_MUSIC makes
 *     it theirs, nothing else to change.
 *
 * The land is the banner's (wheelHere(...).region, asked every frame by the
 * minimap, rendering/systems/wheelMinimap.js), with a lean toward the land:
 * its music MUSIC_INTO_LAND_MS after you cross into it, home's only after
 * MUSIC_HOME_MS on the safe ground.  Each land's first monsters stand at its
 * inner end, on that line, and a fight there steps back and forth across it:
 * the land's music stays for the fight and the town's comes back once you
 * have really come home.  The sea and anything unknown keep what plays.
 *
 * Arriving decides at once, on an answer for the cell you stand in (`fresh`:
 * the worker lingers after you leave, so its last answer can be where you
 * died).  The Wheel itself asks for nothing (startZoneAmbient('wheel') keeps
 * what plays, gameDisplay.js): every way in comes through today's town,
 * which has started the town's track by then.
 *
 * `?nolandmusic` is the Wheel as it was (BT_AUDIO.wheelLandMusic false).
 *
 * No imports but the land table, so node tests the rules
 * (tools/world/test-world-core.mjs "the lands' music"); the sound itself is
 * mp-landmusic's, on a phone.
 */
import { landLook } from '../data/wheelLands.js';

/** In a land this long before its music starts (its banner comes at 600 ms). */
export const MUSIC_INTO_LAND_MS = 1200;
/** On the safe ground this long before the town's music comes back. */
export const MUSIC_HOME_MS = 8000;
/** Brotown's and the commons' music. */
export const HOME_MUSIC = 'town';

/** The music key for region `id` -- the town's for the safe ground, the
 *  land's own id for a land -- or null where the music should not change
 *  (the sea, a realm past a gate, unknown). */
export function wheelMusicKey(id) {
  if (!landLook(id)) return null;
  return id === 'commons' ? HOME_MUSIC : id;
}

const _m = { want: null, since: 0, settled: false, log: [], A: null };

/** Forget the visit: the next arrival decides at once. */
export function resetWheelMusic() {
  _m.want = null;
  _m.since = 0;
  _m.settled = false;
}

/** Called every frame the Wheel's minimap draws, with wheelHere()'s answer.
 *  Starts the land's music on `A` (BT_AUDIO) when it is due and returns its
 *  key, else null. */
export function noteWheelMusic(here, S, A, now = Date.now()) {
  if (A) _m.A = A;   /* the one the minimap hands in, for the probe below */
  if (!S || S.currentZone !== 'wheel' || !A || !A.wheelLandMusic) { resetWheelMusic(); return null; }
  const want = wheelMusicKey(here && here.region);
  if (!want) return null;
  /* the first word of a visit only from where you stand */
  if (!_m.settled && !here.fresh) return null;
  if (want !== _m.want) { _m.want = want; _m.since = now; }
  if (A._currentZoneAmbient === want) { _m.settled = true; return null; }
  const wait = !_m.settled ? 0 : want === HOME_MUSIC ? MUSIC_HOME_MS : MUSIC_INTO_LAND_MS;
  if (now - _m.since < wait) return null;
  _m.settled = true;
  A.startZoneAmbient(want);
  _m.log.push({ key: want, at: now });
  if (_m.log.length > 20) _m.log.shift();
  return want;
}

/* QA probe (tools/qa/mp/mp-landmusic.mjs): what the land watch wants, what
   is playing, and every change it made this page. */
try {
  if (typeof window !== 'undefined') {
    window.__btLandMusic = () => {
      const A = _m.A;
      const amb = A && A._zoneAmbientKey;
      return {
        on: !!(A && A.wheelLandMusic),
        ctx: A && A.ctx ? A.ctx.state : null,
        want: _m.want, since: _m.since, settled: _m.settled,
        playing: A ? A._currentZoneAmbient || null : null,
        url: A ? A._zoneMusicUrl || null : null,
        source: !!(A && A._zoneMusicSource),
        ambience: amb || null,
        ambienceLoop: !!(amb && A._sfxLoops && A._sfxLoops[amb]),
        windKept: !!(A && A._samples && A._samples['zoneamb-sky']),
        cached: A && A._zoneMusicLru ? A._zoneMusicLru.slice() : [],
        themeDucked: !!(A && A._globalMusicDucked),
        log: _m.log.slice(),
        asks: A && A._zoneAsks ? A._zoneAsks.slice() : [],
      };
    };
  }
} catch (e) { /* a debug handle must never be the thing that breaks the page */ }
