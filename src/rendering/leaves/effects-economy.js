/* ═══ v2.3.6220: THE ECONOMY SYSTEM'S LEAVES OF effectsRenderer.js (card FX) ═══
 *
 * Top-level functions of src/rendering/systems/effectsRenderer.js that read
 * no `this` and reach no module state (the code census, part 5 of
 * docs/plan/census/M-tables.md), moved here VERBATIM -- each body byte for
 * byte, its comment with it; only `export` and the imports are new -- and
 * imported back by name.  A constant only they read came with them.
 *
 * A leaf imports nothing from the renderers (four-lines' IMPORT_CYCLE_FILES
 * has no room): only what the renderer itself imported, from the same files. */
import { sw } from '@/game/switches.js';
import { PILE_R } from '../tables/economy.js';

export const _hexTint = (h) => { const n = parseInt(String(h || '').replace('#', ''), 16); return Number.isFinite(n) ? n : 0xffffff; };
/* ═══ v2.3.4124: LOOT POPS OUT OF THE MONSTER, THEN THE BEAM RISES ═══
   The owner, 2026-11-03: "Monster deaths to loot drops need more of a
   transition. It's next frame there's a pinhole of light beaming upwards."
   Each item now leaves from the monster's BODY (POP_H above the pile, where
   the body stood: the pile sits PILE_Y_OFFSET under it), arcs out to its spot
   with a little hop up first, and bounces ONCE (POP_ARC_S + POP_BOUNCE_S,
   about half a second, each item a touch after the one before), and only
   when it is down does the pile's beam rise (BEAM_AT_S, below).
   `?lootpop=0`: the v2.3.2771 fall and two hops, for one phone. */
export const LOOT_POP = (() => { try { return !sw('lootpop'); } catch (e) { return true; } })();
export const _hash = (x) => { const v = Math.sin(x) * 43758.5453; return v - Math.floor(v); };
/* v2.3.4124: the age the landing (and the beam after it) plays at.  YOUR pile
   that landed while you watched (its loot_drop: _shine set, not late) is timed
   from the moment it reached THIS phone, by this phone's clock: on the QA box
   a kill's loot_drop came ~0.9 s after the worker's drop time (l.ts), so a pop
   on l.ts had already finished when the pile first showed -- the owner's
   "next frame there's a pinhole of light", again -- and a phone whose clock
   runs ahead of or behind the worker's would skip or stall it.  Anything else
   (another's pile, one synced on the way in) keeps the worker's time: lying
   still when you arrive, as v2.3.2771. */
export function landAgeOf(l, now, age) {
  if (LOOT_POP && l._shine && !l._shine.late && Number.isFinite(l._shine.at)) return (now - l._shine.at) / 1000;
  return age;
}
export function applySquash(sp, sq, rot = 0) {
  if (!sp) return;
  sp.rotation = rot || 0;
  if (!sq) return;
  sp.scale.set(sp.scale.x * (1 + 0.6 * sq), sp.scale.y * (1 - sq));
}

/* v2.3.2771 squash; v2.3.2772 and tilt.  Rotation is WRITTEN every call
   (0 once settled) so a pile never keeps a stale lean. */
/* ═══ v2.3.2773: A PILE SPREADS OUT, IT DOES NOT STACK ═══
   Owner: "Instead of a vertical line can you make the loot spread out a bit
   within a proximal circle."  The coin, shard and rare items used to sit in a
   column over the remains (coin 10 px up, shard 24, rare icons 30).  Each now
   has its own spot in a small circle around the pile's middle -- a sunflower
   (golden-angle) spiral from a per-pile starting angle, so two piles never
   look stamped from one template and no two items land on the same spot.  The
   rarest go nearest the middle (they are what you are walking over for); the
   circle is squashed vertically (x 0.55) because the ground is seen at an
   angle.  A lone item stays in the middle.  Keys are the items present, so
   the layout is rebuilt only when the pile's contents change (a claim). */
export function pileLayout(l, keys) {
  const sig = keys.join(',');
  if (l._layoutSig === sig && l._layout) return l._layout;
  if (l._landSeed == null) l._landSeed = Math.random();
  const out = Object.create(null);
  const n = keys.length;
  const a0 = l._landSeed * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    if (n === 1) { out[keys[i]] = { ox: 0, oy: 0 }; continue; }
    const a = a0 + i * 2.39996;   /* the golden angle */
    const r = PILE_R * (0.4 + 0.6 * Math.sqrt((i + 0.5) / n)) * (0.85 + 0.3 * _hash(l._landSeed * 37 + i * 4.1));
    out[keys[i]] = { ox: Math.cos(a) * r, oy: Math.sin(a) * r * 0.55 };
  }
  l._layout = out; l._layoutSig = sig;
  return out;
}
