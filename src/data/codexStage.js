/* ═══ v2.3.3196: THE CODEX'S STAGE -- EACH MONSTER, PLAYED FROM ITS OWN STRIPS ═══
 *
 * Owner, 2026-10-12: "Maybe an animation similar to how the skills preview
 * window currently works."  The Points window's preview (src/ui/mobile/sheet/
 * StatDemo.jsx) plays your character against a slime with the world's own
 * art, stepped through its strips by CSS (game.css bt-sd-strip) -- no frame
 * loop.  A codex page does the same with its own monster (src/ui/mobile/dash/
 * CodexStage.jsx), and this is what it draws with: each look's strips at the
 * URLs the world loads them from (so a monster you have met is a cache hit),
 * how many cells, how long they run in the world, and where in a cell the art
 * stands (`ground`: the art's lowest row, measured off the frames), so every
 * look stands on the stage's one ground line.
 *
 *   artRows the art's height in its own cell, px (measured, the tallest frame)
 *   artH   the height the art is shown at on the stage, CSS px -- the world's
 *          sizes kept in proportion, a little bigger, so a slime is still the
 *          small one and a golem the big one
 *   x0/x1  the art's left and right in its cell (its middle stands on the spot)
 *   tint   a multiply, as a sprite tint (the reskins); `recolor` the blue
 *          slime's retint (src/rendering/monsterRecolor.js) -- both baked by
 *          the stage onto its own copies, which it lets go when it closes
 *   shot   what it throws: a picture, or a drawn ball of `color`
 *
 * The facings are the west ones (the monster stands on the right, facing your
 * character), by the world's own maps: the fire goblin's west walk is its
 * `walk-sw` file and its west attack `attack-sw` (fireGoblinSprites.js), the
 * snowman's south-west strips face left unmirrored (snowmanSprites.js). */

const SN = '?v=2.1.14', FG = '?v=2.3.26', MU = '?v=2.3.58', SK = '?v=2.3.63', FI = '?v=2.3.135', RM = '?v=2.3.137';

export const CODEX_LOOKS = Object.freeze({
  slime: Object.freeze({
    cell: 128, x0: 37, x1: 91, artRows: 58, artH: 50,
    strips: Object.freeze({
      idle: { url: '/sprites/monsters/slime-idle-v5.png', n: 24, ms: 2880, ground: 86 },
      shoot: { url: '/sprites/monsters/slime-shoot-v2.png', n: 8, ms: 420, ground: 86 },
      death: { url: '/sprites/monsters/slime-death-v10.png', n: 15, ms: 400, ground: 108 },
    }),
    shot: { color: '#5ca84c', px: 15 },
  }),
  snowman: Object.freeze({
    cell: 128, x0: 3, x1: 127, artRows: 126, artH: 76,
    strips: Object.freeze({
      idle: { url: '/sprites/monsters/snowman/snowman-sw.png' + SN, n: 24, ms: 3000, ground: 126 },
      throw: { url: '/sprites/monsters/snowman/snowman-attack-sw.png' + SN, n: 8, ms: 560, ground: 126 },
      burrow: { url: '/sprites/monsters/snowman/snowman-burrow.png' + SN, n: 8, ms: 600, ground: 122 },
      pile: { url: '/sprites/monsters/snowman/snowman-pile.png' + SN, n: 8, ms: 720, ground: 122 },
      emerge: { url: '/sprites/monsters/snowman/snowman-emerge.png' + SN, n: 8, ms: 600, ground: 122 },
    }),
    shot: { url: '/sprites/monsters/snowman/snowball.png' + SN, px: 16,
      burst: { url: '/sprites/effects/snowball-burst-v1.png', n: 8, ms: 420, cell: 128, px: 44 } },
  }),
  fireGoblin: Object.freeze({
    cell: 256, x0: 22, x1: 230, artRows: 218, artH: 70,
    strips: Object.freeze({
      idle: { url: '/sprites/monsters/fire-goblin/walk-sw.png' + FG, n: 8, ms: 720, ground: 217, still: true },
      walk: { url: '/sprites/monsters/fire-goblin/walk-sw.png' + FG, n: 8, ms: 720, ground: 217 },
      attack: { url: '/sprites/monsters/fire-goblin/attack-sw.png' + FG, n: 8, ms: 400, ground: 219 },
    }),
    shot: { url: '/sprites/monsters/fire-goblin/fireball.png' + FG, px: 30 },
  }),
  mummy: Object.freeze({
    cell: 256, x0: 83, x1: 168, artRows: 220, artH: 88,
    strips: Object.freeze({
      idle: { url: '/sprites/monsters/mummy/walk-w.png' + MU, n: 16, ms: 1400, ground: 247, still: true },
      walk: { url: '/sprites/monsters/mummy/walk-w.png' + MU, n: 16, ms: 1400, ground: 247 },
      transform: { url: '/sprites/monsters/mummy/transform.png' + MU, n: 8, ms: 480, ground: 238 },
    }),
  }),
  /* the mummy's bones, after the first hit (the worker's _variantTransform) --
     drawn bigger, as the world draws it (liveScalePx 120 against 96) */
  skeleton: Object.freeze({
    cell: 256, x0: 20, x1: 228, artRows: 202, artH: 104,
    strips: Object.freeze({
      run: { url: '/sprites/monsters/skeleton/run-w.png' + SK, n: 8, ms: 600, ground: 230 },
    }),
  }),
  rockmonster: Object.freeze({
    cell: 256, x0: 4, x1: 251, artRows: 247, artH: 96,
    strips: Object.freeze({ idle: { url: '/sprites/monsters/rockmonster/walk-west.png' + RM, n: 1, ms: 0, ground: 248 } }),
  }),
  fishman: Object.freeze({
    cell: 256, x0: 7, x1: 249, artRows: 247, artH: 96,
    strips: Object.freeze({ idle: { url: '/sprites/monsters/fishman/walk-west.png' + FI, n: 1, ms: 0, ground: 252 } }),
  }),
});

/* ═══ EACH KIND ON THE STAGE ═══
   look      the strips above it is drawn from
   tint      its own colour (the reskins: monsterVariants.js mireWisp 0x7a5fa8,
             bogLurker 0x5f7a5a); recolor: the blue slime's retint
   elderTint its second stage's colour (wheelStageLooks.js, in PLACE of its
             own, as the world wears it)
   hit       its ordinary attack: 'throw' (a strip, then a ball crossing the
             gap) or 'swing' (it leans into you)
   special   'burrow' | 'lunge' | 'unwrap' | 'slam' | 'burst'
   shotColor its ball's colour, when it is drawn (monsterShots.js gooColorOf) */
export const CODEX_STAGE = Object.freeze({
  snowling: Object.freeze({ look: 'snowman', elderTint: 0x8fc8ff, hit: 'throw', special: 'burrow' }),
  gobling: Object.freeze({ look: 'fireGoblin', elderTint: 0x8c8c9c, hit: 'throw', special: 'lunge' }),
  mumling: Object.freeze({ look: 'mummy', elderTint: 0xffd27a, hit: 'swing', special: 'unwrap' }),
  pebbling: Object.freeze({ look: 'rockmonster', elderTint: 0xc8a0ff, hit: 'swing', special: 'slam' }),
  sparklet: Object.freeze({ look: 'slime', elderTint: 0x60c0ff, hit: 'throw', special: 'lunge' }),
  finling: Object.freeze({ look: 'fishman', elderTint: 0xffb070, hit: 'swing', special: 'slam' }),
  wisplet: Object.freeze({ look: 'slime', tint: 0x7a5fa8, elderTint: 0x70e8ff, hit: 'throw', special: 'lunge', shotColor: '#2c3f32' }),
  lurkling: Object.freeze({ look: 'fishman', tint: 0x5f7a5a, elderTint: 0xc090ff, hit: 'swing', special: 'slam' }),
  dewdrop: Object.freeze({ look: 'slime', recolor: [58, 122, 208], elderTint: 0x9cffb0, hit: 'throw', special: 'burst', shotColor: '#3a7ad0' }),
});

/* the words over the monster as its special winds up -- SLAM and LUNGE in the
   world's own colours (gameEvents.js), the rest the stage's */
export const CODEX_SPECIAL_LABEL = Object.freeze({
  slam: { text: 'SLAM!', color: '#f5c542' },
  lunge: { text: 'LUNGE!', color: '#E8955A' },
  burrow: { text: 'BURROW!', color: '#cfe8ff' },
  unwrap: { text: 'UNWRAPPED!', color: '#ffd27a' },
  burst: { text: 'BURST!', color: '#7fb6ff' },
});

/* how long each special's wind-up is in the world (server/src/telegraph.js) */
export const CODEX_WINDUP_MS = Object.freeze({ slam: 900, lunge: 1200, burst: 1600 });

/** Every picture a kind's stage may draw: [{ key, url, look, raw }], for the
 *  stage to load (and bake its colour onto) when the page opens -- its strips,
 *  and what it throws (`raw`: drawn as it is, never in the monster's colour --
 *  the world tints the monster, not its snowball).  All of them are in before
 *  the first beat plays: a fireball that loads as it is thrown is not drawn
 *  on its first flight. */
export function codexStageUrls(kind) {
  const st = Object.prototype.hasOwnProperty.call(CODEX_STAGE, kind) ? CODEX_STAGE[kind] : null;
  if (!st) return [];
  const out = [];
  const add = (lookId, prefix) => {
    const L = CODEX_LOOKS[lookId];
    for (const k of Object.keys(L.strips)) out.push({ key: prefix + k, url: L.strips[k].url, look: lookId, raw: false });
  };
  add(st.look, '');
  if (st.special === 'unwrap') add('skeleton', 'skel:');
  const shot = CODEX_LOOKS[st.look].shot;
  if (shot && shot.url) out.push({ key: 'shot:ball', url: shot.url, look: null, raw: true });
  if (shot && shot.burst && shot.burst.url) out.push({ key: 'shot:burst', url: shot.burst.url, look: null, raw: true });
  return out;
}
