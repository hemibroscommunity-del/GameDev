/* ═══ v2.3.3921: THE PLACE'S NAME ON THE TOP BAR ═══
 *
 * The owner, 2026-11-02: "The top bar is underwhelming (says 'brotown')".  In
 * the world the bar names the land you stand in -- its name as the minimap's
 * plate prints it (the ground worker's words for the spot under you,
 * wheelTrial.js wheelHere) -- and "BroTown" at home: the town, the commons,
 * the sea between.  Over water the last land is kept, so the name never
 * blinks as you cross a stream.  "BroTown" stays the town's name exactly:
 * every phone test knows the live world by it (TRAPS §244, the harness).
 * Off the Wheel (a dungeon, a building) it is the zone's own title, as it
 * always was (zoneTitle.js). */
import { wheelHere } from '@/game/wheelTrial.js';
import { isElementLand } from '@/data/wheelLands.js';
import { ZONES } from '@/data/zones.js';
import { zoneTitle } from './zoneTitle.js';

const HOME = 'BroTown';
let _lastLand = null;   /* { region, title } while you are in a land */

/** The name the top bar shows, and the land it is (null at home). */
export function placeOf(S) {
  if (!S) return { name: HOME, land: null };
  if (S.currentZone !== 'wheel') return { name: zoneTitle(S), land: null };
  const home = (ZONES.wheel && ZONES.wheel.name) || HOME;
  let here = null;
  try { here = S.player ? wheelHere(S.player.x, S.player.y) : null; } catch (e) { here = null; }
  if (here && here.region) {
    if (isElementLand(here.region) && here.words && here.words.title) _lastLand = { region: here.region, title: here.words.title };
    else if (!here.water) _lastLand = null;
  }
  return _lastLand ? { name: _lastLand.title, land: _lastLand.region } : { name: home, land: null };
}

export function placeName(S) { return placeOf(S).name; }
