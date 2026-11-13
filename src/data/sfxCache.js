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
   another.  v2.3.5006: with the four AHEAD sounds (below, 4.5 MB) not
   pinned, every sound not pinned is ~7.8 MB: the budget now lets go of some
   on a long session, as a cap should (the river or the reel kept going by
   its own source while it plays, never cut). */
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
  /* v2.3.5006: the four whose decode alone took longer than COLD_MS (the
     river's and the reel's loops, the level-up's sting, the win's marimba)
     were pinned here for that reason only, none of them a fight's sound:
     4.5 MB held for good.  They are AHEAD now (below); `?sfxahead=0` pins
     them again. */
];

/* ═══ v2.3.5006: THE FOUR SLOW ONES DECODED AHEAD, NOT HELD FOR GOOD ═══
 * The owner said yes to the memory list (2026-11-12): the sound line was
 * ~23 MB, ~90% of it PINNED, and 4.5 MB of that four sounds pinned only
 * because their first decode took 16-51 ms (mp-sfxcache, a Chromium on the
 * QA box with the game beside it): the river's loop 1.46 MB, the level-up's
 * sting 1.18, the marimba of a win 0.93, the reel's loop 0.91.  None is a
 * fight's sound (sound-cues §18a).  Each is now decoded AHEAD, where its play
 * can be seen coming (AHEAD_WHEN), and goes into the capped cache like any
 * sound not pinned: let go when the cache is full and it is the one played
 * longest ago.  An ahead that missed (a walk that outran it, the cache that
 * let it go just before) makes the sound wait for its decode: up to ~50 ms
 * late, never dropped (window.__btSfxCache().aheadLate counts each wait).
 * `?sfxahead=0` pins the four again, for one phone (parseSfxAhead). */
export const AHEAD = ['river-water', 'fish-reel', 'level-up', 'flip-win'];
/* what is decoded ahead, by the moment that sees it coming
   (BT_AUDIO.sfxAhead(name)); a call that knows exactly which sound comes
   names the sound itself (the daily wheel's landing, a salvage's essence) */
export const AHEAD_WHEN = {
  /* nearing a river or a pond: RIVER_AHEAD_PX past the river's reach
     (game/waterAmbience.js), and kept recent while you are by it */
  water: ['river-water'],
  /* a fishing spot comes in reach (BroTown, the harvest button offers it):
     the water under the cast and the reel's loop, seconds before either */
  fishSpot: ['river-water', 'fish-reel'],
  /* the cast (lifeSkillRewards.startExtraction): the reel turns only after
     the wind-up, seconds later */
  cast: ['fish-reel', 'river-water'],
  /* a skill past LEVEL_AHEAD_FRAC of its level (wsClient, player_state:
     levelNear below): LevelUpBurst plays the sting on the burst's first frame */
  levelNear: ['level-up'],
  /* Ace's coin in the air (AceFlipPanel's toss) and a daily chest shaking
     (ChestReveal): the win's marimba at the answer */
  flip: ['flip-win'],
};
/* a skill this far through its level has its level-up's sting decoded ahead */
export const LEVEL_AHEAD_FRAC = 0.8;

/** The switch, from a location.search: on unless `sfxahead=0` (or `off`),
 *  which pins the four again (the game as it was). */
export function parseSfxAhead(search) {
  const m = /[?&]sfxahead=([^&]*)/.exec(String(search || ''));
  return !(m && /^(0+|off|false|no)$/i.test(m[1]));
}

/** Is any skill past `frac` of its level?  `rpg`: the combat skills
 *  (`prog3.sk.sword/bow/staff`, toward `reqP3(level)`) and the life skills
 *  (`lifeSkills.<skill>`, toward `reqLife(level)`) -- each {level, xp}, xp
 *  toward the next level; anything else in lifeSkills (gems, pets, plots) is
 *  not a skill and is passed over. */
export function levelNear(rpg, reqP3, reqLife, frac) {
  const f = frac == null ? LEVEL_AHEAD_FRAC : frac;
  const near = (sk, req) => {
    if (!sk || typeof sk !== 'object' || Array.isArray(sk) || typeof req !== 'function') return false;
    const lv = Number(sk.level), xp = Number(sk.xp);
    if (!Number.isFinite(lv) || !Number.isFinite(xp) || lv < 1) return false;
    const need = Number(req(Math.floor(lv)));
    return need > 0 && xp >= need * f;
  };
  const sk = rpg && rpg.prog3 && rpg.prog3.sk;
  if (sk) for (const c of ['sword', 'bow', 'staff']) if (near(sk[c], reqP3)) return true;
  const life = rpg && rpg.lifeSkills;
  if (life && typeof life === 'object') for (const k of Object.keys(life)) if (near(life[k], reqLife)) return true;
  return false;
}

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
    /* the river under a cast (startSfxLoop): the reel's clicks (v2.3.5006:
       the river itself and the reel's loop are AHEAD, above) */
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
