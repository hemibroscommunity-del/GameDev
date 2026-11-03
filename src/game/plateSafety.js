/* ═══ v2.3.4113: WHERE YOU ARE AND WHETHER YOU ARE SAFE, ON THE MINIMAP ═══
 *
 * The owner, 2026-11-03: "Remove name of town and "safe" or other
 * designation from top bar (currently centered). The minimap label area
 * already does this."  The top bar's centre no longer names the place or
 * carries the Safe / PvP / Outlaw chip (v2.3.3974); the minimap's name plate
 * (rendering/systems/wheelMinimap.js _plate) says it all, as it already said
 * the land and "safe" at home:
 *   - in No man's land its second line is "No man's land 12" in red (the
 *     number is the monster level there, caps.nmlsteps, so the land's level
 *     band it replaces is not lost);
 *   - while you carry the red skull (you attacked first) "Outlaw · 18 min",
 *     in red, anywhere in the world;
 *   - else the plate's own words ("safe", "safe, no monsters", the band).
 * A tap on the plate while either shows opens the rules window
 * (ui/mobile/NmlBadge.jsx PlateTap), as a tap on the chip did.
 * `window.__btPlaceHold = { nml, red }` (QA, the UI review) stages either.
 */
import { nmlHere, NML_RED } from '@/game/noMansLand.js';

/** Your own skull from `nml_skull` (S._nmlSelf {red, white, at}), minutes
 *  of play left -- moved here from NmlBadge.jsx so the plate can read it. */
export function nmlSkullLeft(S, now) {
  const o = S && S._nmlSelf;
  if (!o) return null;
  const gone = Math.max(0, now - (o.at || now));
  const red = Math.max(0, (Number(o.red) || 0) - gone), white = Math.max(0, (Number(o.white) || 0) - gone);
  if (red > 0) return { type: 'red', min: Math.ceil(red / 60000) };
  if (white > 0) return { type: 'white', min: Math.ceil(white / 60000) };
  return null;
}

function heldPlace() {
  try { const h = typeof window !== 'undefined' ? window.__btPlaceHold : null; return h && typeof h === 'object' ? h : null; } catch (e) { return null; }
}

/** No man's land's number where you stand and your red skull's minutes, as
 *  the plate and its tap read them ({ nml, redMin, own }). */
export function plateRisk(S, now) {
  const hold = heldPlace();
  let nml = 0;
  try { nml = nmlHere(S); } catch (e) { nml = 0; }
  if (hold && Number(hold.nml) >= 0) nml = Math.floor(Number(hold.nml)) || 0;
  const sk = nmlSkullLeft(S, now || Date.now());
  let redMin = sk && sk.type === 'red' ? sk.min : 0;
  if (hold && Number(hold.red) >= 0) redMin = Number(hold.red) || 0;
  return { nml, redMin, own: sk ? sk.type : null };
}

const RED = parseInt(String(NML_RED).slice(1), 16);
const DOT = '·';

/** The plate's second line while it says more than the land's own words:
 *  { kind: 'outlaw' | 'pvp', text, color (0xRRGGBB), nml }, else null. */
export function plateSafety(S, now) {
  if (!S || S.currentZone !== 'wheel') return null;
  const r = plateRisk(S, now);
  if (r.redMin > 0) return { kind: 'outlaw', text: `Outlaw ${DOT} ${r.redMin} min`, color: RED, nml: r.nml };
  if (r.nml > 0) return { kind: 'pvp', text: `No man's land ${r.nml}`, color: RED, nml: r.nml };
  return null;
}
