/* ═══ v2.3.6872: THE COUNTER -- ONE COMPONENT FOR EVERY TOWN STATION (card MN step 13) ═══
 *
 * The card's Decided 6: one component, four modes (Make, Trade, Keep,
 * Play); "a station is always its one mode".  It opens in the new panel
 * (Menus3Panel.jsx: the header carries the station's name, its mode and the
 * gold, and the X) when a town station's door or keeper opens it under
 * `?menus3` (menus3Wire.js menus3StationGate: today's window id ->
 * src/game/menus3Counter.js counterStation).  The SPEC's Quick-Tap and Undo
 * are overruled there: nothing acts on a single tap and nothing is taken
 * back.
 *
 * Step 13 mounts Make for the Blacksmith (Menus3Make.jsx).  A mode is one
 * line below; Trade, Keep and Play (card MN steps 14 and 15) mount theirs
 * beside it, each with the bag only where its station uses it.  Its own
 * script (lazyPanels.js Menus3CounterLazy): the page's first script does not
 * grow. */
import { Menus3Make } from './Menus3Make.jsx';

export function Menus3Counter({ R, getS, station }) {
  const s = station || null;
  if (!s) return null;
  if (s.mode === 'make' && s.bench === 'blacksmith') return <Menus3Make R={R} getS={getS} />;
  return null;   /* a mode not built yet never reaches here: its window opens as today (counterStation) */
}
