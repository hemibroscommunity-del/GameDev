/* ═══ v2.3.3398: THE FORGE HEARD AT WORK ═══
 *
 * The owner, 2026-10-18, on the missing sounds: "Look for more too".  The
 * Blacksmith's forge in the Wheel's BroTown throws sparks (v2.3.2983,
 * data/buildingLife.js: "a few sparks jumping off the forge") and nothing was
 * heard.  Now, while you stand within ANVIL_R of its door, three strikes on
 * the anvil come every ANVIL_MIN_MS-ANVIL_MAX_MS (data/eventSounds.js
 * `anvil`, the pickaxe's ring), heard by distance on the hits' own curve
 * (eventSounds.cueAt -> hitSounds.earVol: full within 220 px), at ANVIL_K of
 * the cue's level -- a sound of the town, under everything you do.
 *
 * WHERE: the forge's door, from the ground worker's doors (wheelTownDoors,
 * the plot FORGE_PLOT), so it is heard only where the forge stands, and not
 * at all before the town's objects are in or with `?noobjects`.  Nothing
 * loads: the sample is in SFX_MANIFEST.  `?noforge` is the town as it was.
 * window.__btForge is the tests' probe. */
import { cueAt } from '@/game/eventSounds.js';
import { wheelTownDoors } from '@/game/wheelTownDoors.js';
import { isWheelTrialZone } from '@/game/worldTrial.js';

export const FORGE_PLOT = 'blacksmith';
/* heard within this many game px of the forge's door: earVol has it at
   about 0.3 here, so the strikes fade out before they stop */
export const ANVIL_R = 640;
export const ANVIL_MIN_MS = 4200;
export const ANVIL_MAX_MS = 7800;
export const ANVIL_K = 0.55;

const st = { next: 0, played: 0, last: null, off: null };

function off() {
  if (st.off === null) {
    try { st.off = typeof location !== 'undefined' && /[?&]noforge(?:[&=]|$)/.test(location.search); } catch (e) { st.off = false; }
  }
  return st.off;
}

/** Once a frame from the game loop (BroTown.jsx, beside the river's). */
export function tickTownAmbience(S, now) {
  try {
    if (!S || !S.player || off() || now < st.next) return;
    if (!isWheelTrialZone(S.currentZone)) { st.next = now + 1000; return; }
    const forge = wheelTownDoors().find((d) => d.id === FORGE_PLOT);
    if (!forge) { st.next = now + 2000; return; }
    const dx = S.player.x - forge.x, dy = S.player.y - forge.y;
    if (dx * dx + dy * dy > ANVIL_R * ANVIL_R) { st.next = now + 700; return; }
    st.next = now + ANVIL_MIN_MS + Math.random() * (ANVIL_MAX_MS - ANVIL_MIN_MS);
    const played = cueAt(S, 'anvil', forge.x, forge.y, ANVIL_K);
    st.played += 1;
    st.last = { at: now, d: Math.round(Math.sqrt(dx * dx + dy * dy)), played: !!played };
  } catch (e) { /* sound only */ }
}

/* QA probe, house style: what the forge last did, and `soon()` to have it
   strike on the next frame instead of waiting out its gap. */
if (typeof window !== 'undefined') {
  window.__btForge = {
    st,
    consts: { FORGE_PLOT, ANVIL_R, ANVIL_MIN_MS, ANVIL_MAX_MS, ANVIL_K },
    soon: () => { st.next = 0; },
  };
}
