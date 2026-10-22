/* ═══ v2.3.3566: A DUNGEON'S PICTURES, LOADED AND LET GO ═══
 *
 * The owner's ChatGPT pictures of each dungeon (src/data/dungeonArt.js, cut
 * by tools/world/add-dungeon-art.mjs): its arena's walls, the things that
 * stand in it, and the boss's chest.  Loaded behind the dungeon's loading
 * screen with its floor (networking/gameEvents.js dungeon_started, the
 * preloading law) and let go a beat after you leave (wheelDungeons.js
 * dropDungeonZone), as the floor is.  A land with no pictures yet -- or a
 * picture that will not load -- keeps the code-drawn walls and a bare floor.
 *
 * The record a load resolves to is the arena zone's `arenaArt`:
 *   { home, urls, front, top, things: { 'pillar-1': Texture, ... },
 *     chest: { 'shut-1': Texture, 'open-1': Texture } | null }
 * The wall textures are whole files; every thing and chest is a frame of its
 * picture (destroyed on the way out, never its source, which Assets.unload
 * lets go).
 *
 * The mouths out in the world are rendering/wheelDoors.js's own.
 */
import { Assets, Texture, Rectangle } from 'pixi.js';
import { DUNGEON_ART, DUNGEON_ART_V, BOSS_CHEST_ART } from '@/data/dungeonArt.js';

const own = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

/** The address a picture is asked for at: a new cut is a new address
    (public/_headers keeps /world/dungeons/* for a year). */
export function dungeonArtUrl(url) {
  return url + '?v=' + encodeURIComponent(DUNGEON_ART_V);
}

/** Has land `home` a set of pictures? */
export function hasDungeonArt(home) {
  return own(DUNGEON_ART, home);
}

function frames(tex, list) {
  const out = Object.create(null);
  for (const f of list) {
    out[f.id] = new Texture({ source: tex.source, frame: new Rectangle(f.x, f.y, f.w, f.h) });
    out[f.id]._dgFoot = f.foot;
  }
  return out;
}

/* every record not yet let go: a file is unloaded only when none of them
   holds it -- straight back into the same dungeon (dungeon.js, v2.3.3556)
   loads the cached pictures again before the last arena's free has come */
const _live = new Set();

/** Load land `home`'s arena pictures.  Resolves to its record, or null (no
    pictures, or the walls would not load -- a thing or the chest that fails
    is simply left out). */
export async function loadDungeonArt(home) {
  if (!hasDungeonArt(home)) return null;
  const A = DUNGEON_ART[home];
  /* held from the first ask, before any await: a free of the last arena
     that comes while these load must not unload a file this one is taking */
  const want = [A.walls.front.url, A.walls.top.url, A.inside.url].concat(BOSS_CHEST_ART ? [BOSS_CHEST_ART.url] : []);
  const rec = { home, urls: want.map(dungeonArtUrl), front: null, top: null, things: Object.create(null), chest: null };
  _live.add(rec);
  const load = async (url) => { try { return await Assets.load(url); } catch (e) { return null; } };
  const [front, top, inside, chest] = await Promise.all(rec.urls.map(load));
  if (rec._freed) return null;
  rec.front = front; rec.top = top;
  if (inside) rec.things = frames(inside, A.inside.frames);
  if (chest) rec.chest = frames(chest, BOSS_CHEST_ART.frames);
  if (!front || !top) { freeDungeonArt(rec); return null; }
  return rec;
}

/** Let a record's pictures go: its frames destroyed (never their sources),
    each file unloaded.  `rec` null is nothing to do. */
export function freeDungeonArt(rec) {
  if (!rec || rec._freed) return;
  rec._freed = true;
  _live.delete(rec);
  for (const set of [rec.things, rec.chest]) {
    if (!set) continue;
    for (const k of Object.keys(set)) { try { set[k].destroy(false); } catch (e) { /* gone */ } }
  }
  for (const url of rec.urls) {
    if ([..._live].some((r) => r.urls.includes(url))) continue;
    Promise.resolve().then(() => Assets.unload(url)).catch(() => { /* a leak, not a crash */ });
  }
  rec.urls = [];
}

/** QA: how many records are held, and their files. */
export function dungeonArtLive() {
  return [..._live].map((r) => ({ home: r.home, urls: r.urls.slice() }));
}
/* QA (mp-grottoart), armed by the harness only */
if (typeof window !== 'undefined' && window.__btProbe) window.__btDungeonArtLive = dungeonArtLive;
