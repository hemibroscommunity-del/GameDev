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
 *
 * ═══ v2.3.2943: `?trial=wheel` -- THE WHEEL, ON YOUR OWN SWATCHES ═══
 * Owner, after the swatches came out sharp: "I want to continue on."  The
 * second switch puts the World View on the plan the World Builder and the
 * Ground Studio are building (docs/WORLD-MAP-PIPELINE.md, the Wheel): 43,008
 * game px square, the sea between the spokes, and ground laid on this device
 * from the owner's swatches by a worker (src/game/wheelTrial.js,
 * src/rendering/wheelGround.js) -- nothing baked, nothing to upload: a
 * swatch made in the Ground Studio on the same site is under your feet the
 * next time you walk in.  You arrive in the town square; the sea and the
 * rivers stop you; the marker just west of where you land takes you back.
 * Everything else about the switch -- the World View it rides on, the
 * readout, `?trial=off` -- is as above.
 */
/* Relative, not '@/': tiledMaps.js imports this module, and
   tools/qa/qa-mapfree-race.mjs loads tiledMaps.js straight into Node, where the
   Vite alias does not exist. */
import { ZONES } from '../data/zones.js';
import { WORLDVIEW_EXITS, WORLDVIEW_ARRIVAL, COMING_SOON_MARKS } from '../data/effects.js';
import { wheelStart, wheelWarm, wheelStop, wheelRunning, wheelWalkGrid, wheelOverview, wheelHere, wheelMade, wheelEdges, wheelBlends, wheelResetCounts, wheelStats } from './wheelTrial.js';

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
/* v2.3.2943: the Wheel's, as the plan puts them today (the ground worker's
   'ready' reports them from the plan itself, and they are corrected then). */
const WHEEL = {
  worldW: 43008, worldH: 43008,
  arrival: { x: 21504, y: 21792 },       /* the town square */
};
/* How long the Wheel's worker outlives your leaving: a quick look back into
   town does not cost the plan build again. */
const WHEEL_LINGER_MS = 5000;

let _on = false;
let _mode = null;             /* 'world' (the baked island) or 'wheel' */
let _wheelAwayAt = 0;
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
export function worldTrialMode() { return _mode; }
export function isWorldTrialZone(zoneId) { return _on && zoneId === WORLD_TRIAL_ZONE; }
export function isWheelTrialZone(zoneId) { return _mode === 'wheel' && isWorldTrialZone(zoneId); }
export function worldTrialReady() { return _ready; }
/* Leaving frees every piece (chunkGround.destroy), so the next way in has to
   warm the first screen again -- re-arm the zone gate for it. */
export function worldTrialLeft() { _ready = false; }
export function worldTrialManifest() { return _manifest; }

/* Which trial this tab is in: 'world', 'wheel' or null.  The stored value
   was '1' before v2.3.2943, when there was only the island. */
function readFlag() {
  if (typeof window === 'undefined') return null;
  let v = null;
  try { v = new URLSearchParams(window.location.search).get('trial'); } catch (e) { /* no URL */ }
  try {
    if (v === 'world' || v === 'wheel') window.sessionStorage.setItem(FLAG_KEY, v);
    else if (v === 'off') window.sessionStorage.removeItem(FLAG_KEY);
    const got = window.sessionStorage.getItem(FLAG_KEY);
    return got === 'wheel' ? 'wheel' : got === 'world' || got === '1' ? 'world' : null;
  } catch (e) {
    return v === 'world' || v === 'wheel' ? v : null;   /* storage blocked: the URL alone decides */
  }
}

/* Called once from main.jsx, before the game mounts. */
export function applyWorldTrial() {
  if (_on) return false;
  const mode = readFlag();
  if (!mode) return false;
  _on = true;
  _mode = mode;
  const z = ZONES[WORLD_TRIAL_ZONE];
  const size = mode === 'wheel' ? WHEEL : BAKED;
  z.name = mode === 'wheel' ? 'The Wheel (trial)' : 'World Trial';
  z.w = Math.round(size.worldW / TILE);
  z.h = Math.round(size.worldH / TILE);
  /* v2.3.2943: 1344 x 1344 tiles for the Wheel, and every one of them 0 but
     the way home -- generateZoneMap shares one row among all the rest
     instead of making 1.8 million cells (~14 MB on iPhone) */
  if (mode === 'wheel') z.sharedRows = true;
  /* The vista's own tricks -- the figure shrinking with distance, the wide
     reference zoom, the magnifier ring, the haze -- are for a painting of a
     far-away place.  At full size the island is walked like any zone. */
  delete z.playerScale;
  delete z.refViewW;
  delete z.refViewH;
  delete z.playerLens;
  delete z.atmosphere;
  /* the sea, for anything drawn before a piece arrives */
  z.palette = { ground: mode === 'wheel' ? '#1c467e' : '#123a63', path: '#c9a36a', accent: '#86b94f' };
  if (mode === 'wheel') setExits(exitBeside(WHEEL.arrival), WHEEL.arrival, 'west');
  else setExits(BAKED.townExit, BAKED.arrival);
  COMING_SOON_MARKS.length = 0;
  /* QA probe, house style (cf. __btZoneLabels): the live numbers the readout
     shows, for tools/qa/mp/mp-worldtrial.mjs to assert on. */
  if (typeof window !== 'undefined') {
    window.__btWorldTrial = { mode, stats: mode === 'wheel' ? wheelStats : worldTrialStats, manifest: () => _manifest, ready: () => _ready,
      running: () => wheelRunning(), hud: () => (_hud ? _hud.textContent : ''),
      map: () => { const c = worldTrialMapPicture(WORLD_TRIAL_ZONE); return c ? { w: c.width, h: c.height } : null; } };
  }
  return true;
}

/* The Wheel's way home: four tiles WEST of where you land, on the square.
   Out of the marker's two-tile reach, as the island's is, but beside you
   rather than ahead: the roads out of the square run north and south, and a
   marker on one of them sent you home the first time you set off exploring. */
function exitBeside(a) {
  return { tx: Math.floor(a.x / TILE) - 4, ty: Math.floor(a.y / TILE) };
}

function setExits(exit, arrival, dir = 'north') {
  WORLDVIEW_EXITS.length = 0;
  WORLDVIEW_EXITS.push({ zoneId: 'town', tx: exit.tx, ty: exit.ty, dir, label: 'Town', color: '#cdb27a' });
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
  return isWorldTrialZone(zoneId) && _mode === 'world' ? WORLD_TRIAL_BASE + 'overview.webp' : null;
}
/* v2.3.2943: the Wheel's is drawn on the phone -- a canvas, not a URL. */
export function worldTrialMapPicture(zoneId) {
  return isWorldTrialZone(zoneId) && _mode === 'wheel' ? wheelOverview() : null;
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
  if (_mode === 'wheel') return preloadWheel();
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

/* v2.3.2943: the Wheel's way in -- the worker builds the plan (about a
   second), then lays the first screen round the town square, all behind the
   ordinary zone loading overlay.  A browser that cannot run the worker walks
   in onto flat sea, with the reason on the readout. */
async function preloadWheel() {
  const t0 = performance.now();
  wheelResetCounts();
  const info = await wheelStart();
  if (info.arrival) setExits(exitBeside(info.arrival), info.arrival, 'west');
  await wheelWarm(WORLDVIEW_ARRIVAL.x, WORLDVIEW_ARRIVAL.y, 360, 620);
  _ready = true;
  wheelStats.entryMs = Math.round(performance.now() - t0);
}

/* Once per frame from zoneTransitions: hand isSolid the walk grid while you
   are in the trial, and keep the readout in step.  One falsy check when the
   trial is off. */
let _hud = null;
let _hudAt = 0;
export function syncWorldTrial(S) {
  if (!_on || !S) return;
  const inTrial = S.currentZone === WORLD_TRIAL_ZONE;
  const now = performance.now();
  if (_mode === 'wheel') {
    syncWheel(S, inTrial, now);
  } else if (inTrial && _walkGrid) {
    S._tiledWalkable = S._tiledWalkable || {};
    if (S._tiledWalkable[WORLD_TRIAL_ZONE] !== _walkGrid) S._tiledWalkable[WORLD_TRIAL_ZONE] = _walkGrid;
  }
  if (now - _hudAt < 250) return;
  _hudAt = now;
  drawHud(inTrial, S);
}

/* The Wheel's walk grid, and its worker's life: kept while you are in the
   Wheel or walking into it, stopped WHEEL_LINGER_MS after you leave. */
function syncWheel(S, inTrial, now) {
  const coming = S._zoneLoading && S._zoneLoading.toZone === WORLD_TRIAL_ZONE;
  const grid = wheelWalkGrid();
  S._tiledWalkable = S._tiledWalkable || {};
  /* set whenever there is one, not only once inside: the way in reads it on
     its first frame (nudgeSpawnToWalkable), before this runs again */
  if (grid && S._tiledWalkable[WORLD_TRIAL_ZONE] !== grid) S._tiledWalkable[WORLD_TRIAL_ZONE] = grid;
  if (inTrial || coming) { _wheelAwayAt = 0; return; }
  if (!wheelRunning()) return;
  if (!_wheelAwayAt) { _wheelAwayAt = now; return; }
  if (now - _wheelAwayAt < WHEEL_LINGER_MS) return;
  _wheelAwayAt = 0;
  wheelStop();
  _ready = false;
  if (S._tiledWalkable[WORLD_TRIAL_ZONE] === grid) delete S._tiledWalkable[WORLD_TRIAL_ZONE];
}

function drawHud(show, S) {
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
  if (_mode === 'wheel') { _hud.textContent = wheelHud(S); return; }
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

/* v2.3.2943: the Wheel's readout -- short lines, it sits on a phone's edge. */
function wheelHud(S) {
  const s = wheelStats;
  if (s.error) return 'WHEEL TRIAL\ncannot lay ground:\n' + String(s.error).slice(0, 60);
  const avg = s.loads ? Math.round(s.sumMs / s.loads) : 0;
  const mb = (s.resident * s.pieceBytes / 1048576).toFixed(0);
  const P = S && S.player;
  const here = P && S.currentZone === WORLD_TRIAL_ZONE ? wheelHere(P.x, P.y) : null;
  let mine = 0, game = 0;
  const made = wheelMade() || {};
  for (const id of Object.keys(made)) { if (made[id] === 'studio') mine++; else game++; }
  return 'WHEEL TRIAL\n' +
    'way in  ' + (s.entryMs == null ? '…' : (s.entryMs / 1000).toFixed(1) + ' s') + (s.planMs != null ? ' · plan ' + (s.planMs / 1000).toFixed(1) : '') + '\n' +
    'ground  ' + s.resident + ' pieces ~' + mb + ' MB' + (s.loading ? ' +' + s.loading : '') + '\n' +
    'laid    ' + s.loads + ' · avg ' + avg + ' ms · worst ' + s.maxMs + '\n' +
    'pop-ins ' + s.popIns +
    /* v2.3.2959: a connection's trouble, when there is any -- downloads
       that failed and are tried again, and pieces still waiting for a
       picture to fill in */
    (s.dlFails ? ' · ' + s.dlFails + ' retried' : '') + (s.short ? ' · ' + s.short + ' filling in' : '') + '\n' +
    /* v2.3.2946: none at all usually means the Ground Studio was used in the
       other browser -- the Claude app's own and Safari keep separate copies */
    (mine + game ? 'swatches ' + mine + ' yours · ' + game + ' in game' : 'swatches none in this browser') +
    (s.downloading ? ' · ' + s.downloading + ' coming' : '') +
    (s.unreadable ? ' · ' + s.unreadable + ' unreadable' : '') + '\n' +
    /* v2.3.2947: the grounds whose edge pieces were found (v2.3.2948: none
       unless the address says `edgepieces` -- they are put away) */
    (wheelEdges().length ? 'edges   ' + wheelEdges().length + ' with edge pieces\n' : '') +
    /* v2.3.2951: the pairs of alike grounds with a blend picture */
    (wheelBlends().length ? 'blends  ' + wheelBlends().length + ' made\n' : '') +
    'here    ' + (here ? here.name.slice(0, 34) + (here.water ? '' : here.made ? ' ✓' : ' (not made)') : '…') +
    /* only when something went wrong: what, so a phone screenshot says it */
    (s.failures ? '\nfailed  ' + s.failures + ': ' + String(s.lastFailure || '').slice(0, 40) : '');
}
