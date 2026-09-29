/* ═══ v2.3.2932: THE WORLD TRIAL ═══
 *
 * Owner, 2026-09-29: "Can we do one trial run where you just replicate the
 * entire worldview map using copies of existing art so I can test loading
 * times and game feel?"
 *
 * WHAT IT IS.  Open the game with `?trial=world` and the World View stops
 * being the small painted vista: it becomes the WHOLE island at full size --
 * 13,312 x 13,312 world px, the World Builder's plan baked out of copies of
 * today's zone paintings (tools/world/bake-trial-world.mjs) -- streamed in
 * 512-art-px chunks as you walk (src/rendering/chunkGround.js).  Walk down the
 * town's stairs as usual and you arrive at the foot of the town painting, in
 * the middle of the island; the marker there takes you back.  The switch
 * sticks for the browser tab (sessionStorage, so an iPhone reload does not
 * drop it); `?trial=off` turns it off.
 *
 * WHY IT RIDES ON THE WORLD VIEW AND NOT A NEW ZONE.  A new zone id has to be
 * added to the worker's allowlist (VALID_ZONE_IDS, server/src/data.js) before
 * a client may stand in it, and the PR preview a trial is tested on talks to
 * the PRODUCTION worker -- so a new zone could only be tried after merging and
 * deploying the server.  The World View is a zone every worker already
 * accepts, is a safe hub with no monsters, and the worker never clamps a
 * position to a zone's size (movement.js checks speed, not bounds).  So the
 * whole trial is client-side and ships on the preview link, and a player
 * without the switch sees the ordinary World View -- nothing here runs for
 * them beyond one falsy check.
 *
 * WHAT IT CHANGES, AT BOOT, WHEN SWITCHED ON: the World View's zone entry
 * (size, name, the vista-only perspective/zoom/lens keys), its exits (one, back
 * to town, at the stairs), its arrival point and "coming soon" marks.  Every
 * consumer already reads those shared tables, so rewriting them once is the
 * whole integration -- the trial adds no second code path to the hub logic.
 *
 * WHAT IT MEASURES (the readout, bottom-left while you are in the trial):
 * how long the way in took, pieces resident and their memory, the last and
 * slowest piece load, and pop-ins -- a piece that was still loading when it
 * came on screen.  Add `&perf=1` for the frame-time HUD beside it.
 */
/* Relative, not '@/': tiledMaps.js imports this module, and
   tools/qa/qa-mapfree-race.mjs loads tiledMaps.js straight into Node, where the
   Vite alias does not exist. */
import { ZONES } from '../data/zones.js';
import { WORLDVIEW_EXITS, WORLDVIEW_ARRIVAL, COMING_SOON_MARKS } from '../data/effects.js';

export const WORLD_TRIAL_ZONE = 'worldview';
export const WORLD_TRIAL_BASE = '/maps/world-trial-v1/';
const FLAG_KEY = 'bt-world-trial';
const TILE = 32;

/* What the bake wrote (manifest.json), for the tables that must be right at
   BOOT, before the manifest can have arrived.  preloadWorldTrial re-reads
   them from the manifest and corrects these if a re-bake moved them. */
const BAKED = {
  worldW: 13312, worldH: 13312,
  arrival: { x: 6558, y: 7969 },
  townExit: { tx: 204, ty: 245 },
};

let _on = false;
let _manifest = null;
let _manifestP = null;
let _walkGrid = null;
let _ready = false;

/* Live numbers for the readout; written by chunkGround.js. */
export const worldTrialStats = {
  entryMs: null,         /* the way in: manifest + the first screen of pieces */
  resident: 0,           /* pieces in memory now */
  loading: 0,            /* pieces in flight now */
  loads: 0,              /* pieces loaded since entering */
  lastMs: 0,             /* the last piece's load time */
  maxMs: 0,              /* the slowest */
  sumMs: 0,
  popIns: 0,             /* came on screen before its picture had arrived */
  bytes: 0,              /* compressed bytes fetched (from the manifest's mean) */
};

export function worldTrialOn() { return _on; }
export function isWorldTrialZone(zoneId) { return _on && zoneId === WORLD_TRIAL_ZONE; }
export function worldTrialReady() { return _ready; }
/* Leaving frees every piece (chunkGround.destroy), so the next way in has to
   warm the first screen again -- re-arm the zone gate for it. */
export function worldTrialLeft() { _ready = false; }
export function worldTrialManifest() { return _manifest; }

function readFlag() {
  if (typeof window === 'undefined') return false;
  let v = null;
  try { v = new URLSearchParams(window.location.search).get('trial'); } catch (e) { /* no URL */ }
  try {
    if (v === 'world') window.sessionStorage.setItem(FLAG_KEY, '1');
    else if (v === 'off') window.sessionStorage.removeItem(FLAG_KEY);
    return window.sessionStorage.getItem(FLAG_KEY) === '1';
  } catch (e) {
    return v === 'world';       /* storage blocked: the URL alone decides */
  }
}

/* Called once from main.jsx, before the game mounts. */
export function applyWorldTrial() {
  if (_on || !readFlag()) return false;
  _on = true;
  const z = ZONES[WORLD_TRIAL_ZONE];
  z.name = 'World Trial';
  z.w = Math.round(BAKED.worldW / TILE);
  z.h = Math.round(BAKED.worldH / TILE);
  /* The vista's own tricks -- the figure shrinking with distance, the wide
     reference zoom, the magnifier ring, the haze -- are for a painting of a
     far-away place.  At full size the island is walked like any zone. */
  delete z.playerScale;
  delete z.refViewW;
  delete z.refViewH;
  delete z.playerLens;
  delete z.atmosphere;
  /* the sea, for anything drawn before a piece arrives */
  z.palette = { ground: '#123a63', path: '#c9a36a', accent: '#86b94f' };
  setExits(BAKED.townExit, BAKED.arrival);
  COMING_SOON_MARKS.length = 0;
  /* QA probe, house style (cf. __btZoneLabels): the live numbers the readout
     shows, for tools/qa/mp/mp-worldtrial.mjs to assert on. */
  if (typeof window !== 'undefined') window.__btWorldTrial = { stats: worldTrialStats, manifest: () => _manifest, ready: () => _ready };
  return true;
}

function setExits(exit, arrival) {
  WORLDVIEW_EXITS.length = 0;
  WORLDVIEW_EXITS.push({ zoneId: 'town', tx: exit.tx, ty: exit.ty, dir: 'north', label: 'Town', color: '#cdb27a' });
  WORLDVIEW_ARRIVAL.x = arrival.x;
  WORLDVIEW_ARRIVAL.y = arrival.y;
}

async function loadManifest() {
  if (_manifest) return _manifest;
  if (!_manifestP) {
    _manifestP = fetch(WORLD_TRIAL_BASE + 'manifest.json').then((r) => {
      if (!r.ok) throw new Error('manifest ' + r.status);
      return r.json();
    }).then((m) => {
      _manifest = m;
      if (m.townExit && m.arrival) setExits(m.townExit, m.arrival);
      _walkGrid = decodeWalk(m.walk);
      return m;
    }).catch((e) => { _manifestP = null; throw e; });
  }
  return _manifestP;
}

/* The bake's walk bits (1 = blocked: the sea and the river) as the grid
   isSolid() reads -- rows of booleans, false = blocked. */
function decodeWalk(w) {
  if (!w || !w.bits) return null;
  const bin = atob(w.bits);
  const rows = [];
  for (let ty = 0; ty < w.rows; ty++) {
    const row = new Array(w.cols);
    for (let tx = 0; tx < w.cols; tx++) {
      const k = ty * w.cols + tx;
      row[tx] = !(bin.charCodeAt(k >> 3) & (1 << (k & 7)));
    }
    rows.push(row);
  }
  return rows;
}

/* The picture to show for the whole zone (the dashboard's Map panel): the
   island overview in the trial, which the zone gate already warmed. */
export function worldTrialMapImage(zoneId) {
  return isWorldTrialZone(zoneId) ? WORLD_TRIAL_BASE + 'overview.webp' : null;
}

export function chunkUrl(i, j) {
  const m = _manifest;
  return WORLD_TRIAL_BASE + ((m && m.chunk) || 'c_{i}_{j}.webp').replace('{i}', i).replace('{j}', j);
}
export function chunkWorldSize() {
  const m = _manifest;
  return m ? m.worldW / m.cols : BAKED.worldW / 20;
}

/* The per-zone gate's half of the trial (preloadAnimations.preloadZoneAssets):
   the manifest, the blurry whole-island underlay, and every piece the first
   screen round the arrival point needs.  Awaited behind the ordinary zone
   loading overlay, and timed -- that is the "loading time" of walking into a
   seamless world, the number the trial exists to show. */
export async function preloadWorldTrial() {
  if (!_on) return;
  const t0 = performance.now();
  const m = await loadManifest();
  const { Assets } = await import('pixi.js');
  const cs = m.worldW / m.cols;
  const a = m.arrival;
  /* a phone screen's worth of world round the arrival, plus one piece */
  const reach = 900;
  const i0 = Math.max(0, Math.floor((a.x - reach) / cs)), i1 = Math.min(m.cols - 1, Math.floor((a.x + reach) / cs));
  const j0 = Math.max(0, Math.floor((a.y - reach) / cs)), j1 = Math.min(m.rows - 1, Math.floor((a.y + reach) / cs));
  const urls = [WORLD_TRIAL_BASE + 'overview.webp'];
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) urls.push(chunkUrl(i, j));
  await Promise.all(urls.map((u) => Assets.load(u).catch(() => null)));
  _ready = true;
  worldTrialStats.entryMs = Math.round(performance.now() - t0);
  worldTrialStats.bytes += (m.meanChunkBytes || 0) * (urls.length - 1);
}

/* Once per frame from zoneTransitions: hand isSolid the walk grid while you
   are in the trial, and keep the readout in step.  One falsy check when the
   trial is off. */
let _hud = null;
let _hudAt = 0;
export function syncWorldTrial(S) {
  if (!_on || !S) return;
  const inTrial = S.currentZone === WORLD_TRIAL_ZONE;
  if (inTrial && _walkGrid) {
    S._tiledWalkable = S._tiledWalkable || {};
    if (S._tiledWalkable[WORLD_TRIAL_ZONE] !== _walkGrid) S._tiledWalkable[WORLD_TRIAL_ZONE] = _walkGrid;
  }
  const now = performance.now();
  if (now - _hudAt < 250) return;
  _hudAt = now;
  drawHud(inTrial);
}

function drawHud(show) {
  if (typeof document === 'undefined' || !document.body) return;
  if (!_hud) {
    _hud = document.createElement('div');
    _hud.id = 'bt-world-trial';
    _hud.style.cssText = [
      'position:fixed', 'left:6px', 'bottom:calc(env(safe-area-inset-bottom, 0px) + 150px)', 'z-index:2147483600',
      'background:rgba(8,14,20,.72)', 'color:#E8F1EA', 'border:1px solid rgba(216,168,95,.55)', 'border-radius:8px',
      'font:11px/1.35 ui-monospace,Menlo,Consolas,monospace', 'padding:5px 7px', 'white-space:pre',
      'pointer-events:none',
    ].join(';');
    document.body.appendChild(_hud);
  }
  _hud.style.display = show ? 'block' : 'none';
  if (!show) return;
  const s = worldTrialStats;
  const avg = s.loads ? Math.round(s.sumMs / s.loads) : 0;
  const mb = (s.resident * 1).toFixed(0);          /* 512 x 512 RGBA = 1 MB a piece */
  /* short lines: this sits on a phone's left edge */
  _hud.textContent =
    'WORLD TRIAL\n' +
    'way in  ' + (s.entryMs == null ? '…' : (s.entryMs / 1000).toFixed(1) + ' s') + '\n' +
    'memory  ' + s.resident + ' pieces ~' + mb + ' MB' + (s.loading ? ' +' + s.loading : '') + '\n' +
    'loaded  ' + s.loads + ' · avg ' + avg + ' ms\n' +
    'last    ' + s.lastMs + ' ms · worst ' + s.maxMs + '\n' +
    'pop-ins ' + s.popIns + ' · ' + (s.bytes / 1048576).toFixed(1) + ' MB in';
}
