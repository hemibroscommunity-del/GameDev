/* ═══ v2.3.5346: THE ECONOMY SYSTEM'S HAND-TUNED TABLES (grand plan step 5.5, card M) ═══
 *
 * The renderers' tables and tuned constants of the `economy` system
 * (docs/plan/census/M-tables.md), moved here verbatim with the comment above
 * each: no imports, no logic, imported back by the same names.  A value here
 * is a pixel on screen: change it as you would have in the renderer.
 */

/* ── from effectsRenderer.js (v2.3.5346) ── */

/* ═══ v2.3.2316: GROUND LOOT AT TWICE THE SIZE ═══
 * Owner: "sprite size for monster loot while on the ground increase by 2x
 * (includes coin too)."
 *
 * ONE multiplier at module scope rather than five edited numbers, because the
 * sizes it scales live in five branches -- the slime splat, a variant's own
 * remnantsScalePx, the snowman's remnants, the standalone coin pile, and the
 * coin that rides ON a monster's remnants (this method). That last one is the
 * one a hunt-and-edit pass misses: it is in a different method from the other
 * four, and it is the coin the owner actually sees on a monster drop.
 *
 * PURELY VISUAL, checked rather than assumed: the pickup radius is a
 * hard-coded 20 world px in groundLoot.js (`lDist < 20`) and the magnet range
 * 50, neither derived from these numbers. So nothing here moves collection
 * range -- the one way a size change could quietly become a gameplay change.
 * WORLD px, like everything on the loot layer, so it scales with zoom exactly
 * as the old size did. */
const LOOT_SCALE = 2;

/* ═══ v2.3.2771: A PILE LANDS, ITS RAREST THING ON TOP ═══
 * Owner: "Make it so loot from monster drops kind of bounces when it first
 * lands (each item independently).  Show rarer items in top in terms of drop
 * rate if overlap.  Show 'RARE DROP!' message if there's a rare item in the
 * pile and have it just give a faint white shine upward from its position."
 *
 * DRAW ORDER IS DROP RATE.  The loot layer sorts by zIndex, and each kind of
 * thing on a pile takes the slot its rarity earns (server rates, index.js /
 * data.js): the remains and the coins come with nearly every kill, a zone
 * shard with 10%, a weapon with 0.05-3% (by monster level), the rare gem with
 * 0.5%, an iron armour piece with 0.2%.  Rarer draws over commoner, on one
 * pile or where two piles overlap; labels over all items, names over labels.
 * The ground rings stay underneath everything, as the glow they are. */
const LOOT_Z = {
  ring: -10, remnant: 0, coin: 10, coinLabel: 11, shard: 20,
  weapon: 30, gem: 40, armor: 50, beam: 55, label: 60, owner: 70, rareText: 80,
};

/* v2.3.3473: a dropped item's picture, in world px (a bro is ~106 tall): a
   good deal bigger than a rare drop's icon (~26), as it is the whole pile.
   v2.3.3499: 40 -> 60, the owner: "Make dropped items 50% larger (hard to
   see)" -- its shadow, stand-in and count with it (all are shares of it), the
   count's type 16 -> 22, and the picture made at 128 px (dropIcons.js) so it
   is as sharp at the new size.  A dead player's pile (_updateGroundLoot's
   death branch) grows by the same DROP_GROW.  The pickup and magnet reach are
   groundLoot.js's own numbers and do not move. */
const DROP_GROW = 1.5;

const BEAM_H_PX = 200;         /* the tallest beam, world px (a pile is ~60 tall) */

const BEAM_W_PX = 12;          /* v2.3.4124: twice v2.3.3916's 6 (a pile is ~60 across) */

const BEAM_TEX_W = 16, BEAM_TEX_H = 128;

const BEAM_HALO_W = 3.2;       /* the halo, this many times the core's width... */

const MOTE_PX = 5;             /* a mote's size, world px */

/* rank (dropLines RARITY_TIERS / GRADE_WORDS): 0 Normal, 1 Uncommon,
   2 Rare (a gem, a mystery gear piece), 3 Very rare */
const LOOT_BEAMS_BY_RANK = [1, 1, 2, 3];

const BEAM_SLOTS = [
  [{ dx: 0, h: 1, ph: 0 }],
  [{ dx: -7, h: 1, ph: 0 }, { dx: 7, h: 0.78, ph: 2.1 }],
  [{ dx: 0, h: 1, ph: 0 }, { dx: -12, h: 0.72, ph: 2.1 }, { dx: 12, h: 0.84, ph: 4.2 }],
];

/* A rare item is anything rarer than 1 in 100 -- the weapon, gem and armour
   lanes.  What earns the RARE DROP! call and the shine. */
const RARE_KINDS = { weapon: true, gem: true, armor: true };

const POP_H = 44;          /* from the body, world px over the pile's foot */

const POP_BOUNCE_H = 7;

const HOP_KEYS = { remnant: 0, coin: 1, shard: 2, weapon: 3, gem: 4, armor: 5 };

const PILE_R = 26;

export { LOOT_SCALE, LOOT_Z, DROP_GROW, BEAM_H_PX, BEAM_W_PX, BEAM_TEX_W, BEAM_TEX_H, BEAM_HALO_W, MOTE_PX, LOOT_BEAMS_BY_RANK, BEAM_SLOTS, RARE_KINDS, POP_H, POP_BOUNCE_H, HOP_KEYS, PILE_R };
