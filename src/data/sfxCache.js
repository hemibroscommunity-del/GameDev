/* ═══ v2.3.3714: DECODED SOUND HELD ONLY WHILE IT IS NEEDED (`?sfxcache`) ═══
 *
 * The owner: "The game needs to be extremely memory efficient."  Every sound
 * effect in BT_AUDIO.SFX_MANIFEST (data/gameDisplay.js) was fetched and
 * DECODED on the loading screen and kept decoded for the whole session: about
 * 27 MB of raw 32-bit samples (the memory check's `sound` line) for 2 MB of
 * mp3s -- the fanfares, the fishing reel, the townsfolk's hums, the farm,
 * the forge, all held while you fight at the Flame Fields.
 *
 * With the switch on (`?sfxcache`, BT_AUDIO.SFX_CACHE):
 *   - PINNED below is decoded up front, as today, and never let go: every
 *     sound a fight, a walk or a tap can play quickly and often, so no sound
 *     in combat or movement ever waits for a decode.  server/test/
 *     sound-cues.test.mjs §18 holds it to every combat and movement cue of
 *     EVENT_SOUNDS and every hit, shot, element and prop sound;
 *   - every other sound keeps only its FILE's bytes (a few per cent of its
 *     decoded size; a Blob, kept by the browser outside the page's heap), and
 *     is decoded on its first play into a cache of BUDGET_MB, the least
 *     recently played let go first;
 *   - a cold play waits for its decode and plays as soon as it is ready
 *     (measured in a real Chromium: well under COLD_MS for every cue --
 *     mp-sfxcache), never dropped: one later than LATE_MS is counted and
 *     logged instead of playing out of time;
 *   - where play is predictable it is decoded ahead (PREFETCH): a zone's or
 *     building's sounds on the way in, the rest of a family on its first
 *     sound (the river under a cast warms the reel's clicks).
 * No sample rate is lowered (the owner has not approved duller sounds).
 *
 * v2.3.3735: ON BY DEFAULT.  The owner: "I think including the new memory
 * change work by default would be better.  I can always revert the change if
 * I don't like it or it doesn't work well."  `?sfxcache=0` turns it off for
 * one phone (every sound decoded on the loading screen and held, as before);
 * `?sfxcache=8` tries another budget (parseSfxCache, below).
 *
 * Plain data and a small LRU, no imports, so node tests it. */

/* The cache's byte budget for the decoded sounds that are NOT pinned.  Every
   one of them decoded at once is 3.3 MB today (mp-sfxcache), so 4 holds them
   all: the budget is the cap for sounds added later.  `?sfxcache=8` tries
   another. */
export const BUDGET_MB = 4;
/* A cold play: the aim for its decode, and the point past which it is not
   played (a sound that late is out of time with what it belongs to). */
export const COLD_MS = 30;
export const LATE_MS = 1500;

/* Decoded up front and never let go.  The fight, the hits, getting hurt,
   moving and the monsters (soundStudio's sections fight/hits/hurt/move/
   monsters), every HIT_VOICES / SHOT_SOUNDS / ELEM_SOUNDS / PROP_SOUNDS /
   MONSTER_NOISE_CLIPS layer, the swings, the footsteps, swimming, and the
   taps (the menu click, close and equip). */
export const PINNED = [
  /* your weapons */
  'sword-swing', 'sword-swing-1', 'sword-swing-2', 'sword-swing-3', 'special-swipe', 'bamboo-swing',
  'sword-hit', 'sword-hit2', 'sword-hit3',
  'bow-pullback', 'arrow-fly', 'arrow-hit',
  'magic-cast', 'magic-hit', 'magic-hit2', 'whirlwind',
  'shield-block', 'shield-bash',
  /* hits on monsters, monsters on you, their throws, noises and deaths */
  'monster-hit', 'snowman-hit', 'armor-hit-1', 'armor-hit-2', 'slime-projectile-hit',
  'monster-death', 'slime-death', 'snowman-death', 'skeleton-death',
  'noise-goblin-rawr', 'noise-skeleton-rattle', 'noise-slime-bounce', 'noise-snowman-snarl',
  'boss-roar', 'explosion', 'tree-fall', 'catch-splash', 'lure-drop', 'pan-sizzle', 'mine-strike', 'wood-chop', 'axe-chop',
  'cook-success', 'ore-crack',   /* a hit's and a status's layers (HIT_VOICES, ELEM_SOUNDS) */
  'hurt-1', 'hurt-2', 'heartbeat',
  /* moving */
  'footstep-v2', 'footstep-v3', 'jump-hup', 'jump-land', 'jump-flip', 'sprint-grunt', 'sprint-breath',
  'swim-splash', 'fish-on-hook',
  /* the taps (and a townsperson's hum, every tap on one: 47 times in
     mp-questline) */
  'ui-click', 'ui-close', 'ui-equip', 'npc-voices',
  /* the loot of a fight, as it falls and goes in the bag (lootDrop, bagIn:
     coin-flip 9 times in one mp-battlemem), a coin picked up off the ground,
     and your own death's sting (playerDeath) */
  'coin-pickup', 'coins', 'coin-flip', 'bag-close', 'flip-lose',
  /* the Blacksmith's anvil ringing in the town (townAmbience: 21 times in one
     mp-questline) */
  'forge-strike',
  /* the quest turn-in: a combat cue's layer (discovery) */
  'quest-complete-v2',
  /* the four whose decode alone took longer than COLD_MS on a run (mp-
     sfxcache, in a Chromium on the QA box with the game running beside it):
     the river's and the reel's loops (51, 45 ms), the level-up's sting (24-38
     ms, which LevelUpBurst.jsx plays on the burst's first frame) and the
     marimba of a win (16-32 ms) */
  'river-water', 'fish-reel', 'level-up', 'flip-win',   /* (unpinning the river: game/waterAmbience.js reads _samples itself and would need to ask for it) */
];

/* Decoded ahead, from the game's own state: a zone entered (startZoneAmbient),
   a building's door (enterBuilding), a family's first sound. */
export const PREFETCH = {
  zone: {
    farm_home: ['farm-hoe', 'farm-water', 'farm-mould', 'farm-harvest', 'bag-close'],
  },
  /* the Woodworker's knife (the rest of the buildings' sounds are pinned) */
  building: ['wood-carve'],
  /* the first sound of a family warms the rest of it */
  family: [
    /* the river under a cast (startSfxLoop): the reel's clicks */
    ['river-water', 'fishing-reeling'],
    /* the farm's first stroke: the rest of its work */
    ['farm-hoe', 'farm-water', 'farm-mould', 'farm-harvest'],
  ],
};

/** The switch, from a location.search: on unless `sfxcache=0` (or `off`);
 *  `sfxcache=N` (N > 0) a budget of N MB, 1-32. */
export function parseSfxCache(search) {
  const m = /[?&]sfxcache(?:=([^&]*))?(?:&|$)/.exec(String(search || ''));
  if (!m || m[1] == null || m[1] === '') return { on: true, mb: BUDGET_MB };
  if (/^(0+(\.0*)?|off|false|no)$/i.test(m[1])) return { on: false, mb: BUDGET_MB };
  const n = parseFloat(m[1]);
  return { on: true, mb: n > 0 ? Math.max(1, Math.min(32, n)) : BUDGET_MB };
}

/** The keys a family's first sound warms (none when `key` starts none). */
export function familyOf(key) {
  const out = [];
  for (const f of PREFETCH.family) if (f[0] === key) for (let i = 1; i < f.length; i++) out.push(f[i]);
  return out;
}

/** A least-recently-played list of decoded files by their bytes.  `add`
 *  returns the entries to let go to come back under the budget (never the
 *  one just added); `touch` marks one played. */
export function makeLru(budgetBytes) {
  const order = new Map();   /* id -> bytes, oldest first */
  let total = 0;
  return {
    get bytes() { return total; },
    get size() { return order.size; },
    has: (id) => order.has(id),
    ids: () => [...order.keys()],
    touch(id) {
      if (!order.has(id)) return;
      const b = order.get(id);
      order.delete(id); order.set(id, b);
    },
    remove(id) {
      if (!order.has(id)) return;
      total -= order.get(id);
      order.delete(id);
    },
    add(id, bytes) {
      if (order.has(id)) { total -= order.get(id); order.delete(id); }
      order.set(id, bytes); total += bytes;
      const out = [];
      let left = total;
      for (const [k, b] of order) {
        if (left <= budgetBytes) break;
        if (k === id) continue;
        out.push(k); left -= b;
      }
      for (const k of out) { total -= order.get(k); order.delete(k); }
      return out;
    },
    clear() { order.clear(); total = 0; },
  };
}
