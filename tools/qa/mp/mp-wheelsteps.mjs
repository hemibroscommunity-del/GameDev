/* ═══ EACH GROUND ITS OWN FOOTSTEP, WALKED (v2.3.2967) ═══
 *
 * Owner, 2026-10-01: "I also want to give each ground type its own footstep
 * sound.  Grass sounds like walking through grass, walking through rocks
 * sounds like walking through rocks etc." -- and then the recordings, cut by
 * tools/audio/cut_footsteps.py into src/data/footstepClips.js.
 *
 * On a phone viewport, against a real worker, in `?trial=wheel`:
 *   1. in town every foot plant is today's dirt step, asked for no ground;
 *   2. on the way into the Wheel its ten clips decode, behind its overlay;
 *   3. in THIS browser's own mp3 decoder every step window holds its step
 *      whole -- next to nothing of a clip's sound outside its windows, and
 *      each window quiet at both ends (an mp3 decoder may start the sound a
 *      little late: the windows have room for it, and this proves it);
 *   4. walking on the town square, the commons' grass and Frost Ridge's
 *      snow, every foot plant asks for the sound of the ground DRAWN under
 *      the feet (the worker's `under`, wheelTrial.wheelGroundAt) and plays
 *      it -- several different sounds, and the drawn ground agreeing with the
 *      plan's own ground for the spot most of the time (the pieces' grids
 *      are where they belong, not shifted or turned);
 *   5. back in town the steps are dirt again, and once the Wheel's worker
 *      stops the clips are let go;
 *   6. (v2.3.2968) a sound changed in the Ground Studio -- the commons made
 *      snow, kept in the studio's storage on this site -- is what the game
 *      plays on the next way in.
 */
import * as H from './harness.mjs';
/* v2.3.2978: the Wheel is its own zone, 'wheel', against a worker that runs
   its monsters (server/src/wheelzone.js) -- 'worldview' against an older one */
const WHEELISH = (z) => z === 'worldview' || z === 'wheel';

const PHONE = { width: 390, height: 844 };
const FROST = { x: 18464, y: 18464 };   /* the north-west spoke, Frost Ridge's second stage */

const holdTitle = (P, ms) => P.page.evaluate(async (hold) => {
  const el = document.querySelector('.bt-zone-header__title');
  if (!el) return 'no title element';
  const r = el.getBoundingClientRect();
  const opts = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, pointerType: 'touch' };
  el.dispatchEvent(new PointerEvent('pointerdown', opts));
  await new Promise((res) => setTimeout(res, hold));
  el.dispatchEvent(new PointerEvent('pointerup', opts));
  return 'ok';
}, ms);
const panelUp = (P) => P.page.evaluate(() => !!Array.from(document.querySelectorAll('strong')).find((n) => n.textContent === 'Test panel'));
const tap = (P, text) => P.page.evaluate((t) => {
  const b = Array.from(document.querySelectorAll('button')).find((n) => (n.textContent || '').indexOf(t) >= 0);
  if (!b) return false;
  b.click();
  return true;
}, text);

/* every footstep, as the renderer asks for it: the sound asked, what was
   played, and the ground drawn under the player at that moment */
const watchSteps = (P) => P.page.evaluate(() => {
  const A = window.BT_AUDIO;
  if (!A || A.__stepsWatched) return;
  A.__stepsWatched = true;
  window.__steps = [];
  const orig = A.footstep;
  A.footstep = function (armored, surface) {
    const S = window._gameState.current, T = window.__btWorldTrial;
    const g = T && T.ground ? T.ground(S.player.x, S.player.y) : null;
    const r = orig.call(this, armored, surface);
    window.__steps.push({ zone: S.currentZone, surface: surface == null ? null : surface, ground: g ? g.id : null, want: g ? g.step || null : null,
      played: A._lastStep ? A._lastStep.played : null, x: Math.round(S.player.x), y: Math.round(S.player.y) });
    return r;
  };
});
const takeSteps = (P) => P.page.evaluate(() => { const s = window.__steps || []; window.__steps = []; return s; });
/* back and forth, so the walk stays on the ground it started on */
const pace = async (P, ms = 1400) => {
  /* the keys drive the game only when no text box has the focus (the admin
     key's box kept it: desktopControls.js) */
  await P.page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
  await P.page.keyboard.down('d'); await P.page.waitForTimeout(ms); await P.page.keyboard.up('d');
  await P.page.keyboard.down('a'); await P.page.waitForTimeout(ms); await P.page.keyboard.up('a');
  await P.page.waitForTimeout(300);
};

/* the middle of a patch of `sound` within `r` px of (x, y), from the pieces
   laid there, or null */
const findGround = (P, x, y, sound, r = 420) => P.page.evaluate(({ x, y, sound, r }) => {
  const T = window.__btWorldTrial;
  let best = null;
  for (let dy = -r; dy <= r; dy += 24) for (let dx = -r; dx <= r; dx += 24) {
    const g = T.ground(x + dx, y + dy);
    if (!g || g.step !== sound) continue;
    let n = 0;
    for (let ky = -3; ky <= 3; ky++) for (let kx = -3; kx <= 3; kx++) { const h = T.ground(x + dx + kx * 30, y + dy + ky * 30); if (h && h.step === sound) n++; }
    if (!best || n > best.n) best = { x: x + dx, y: y + dy, n };
  }
  return best;
}, { x, y, sound, r });

export async function run({ browser, wsPort, webPort, rec }) {
  const { FOOTSTEP_CLIPS } = await import(H.REPO + '/src/data/footstepClips.js');
  const { TOWN_EXITS } = await import(H.REPO + '/src/data/effects.js');
  const keys = [...new Set(Object.values(FOOTSTEP_CLIPS).map((c) => c.key))];
  const clips = Object.fromEntries(Object.entries(FOOTSTEP_CLIPS).filter(([k]) => k !== 'forest'));

  const P = await H.newPlayer(browser, { name: 'Stepper', wsPort, webPort, viewport: PHONE, touch: true, query: 'trial=wheel' });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* setup: the Mayor gate stands between town and the World View */
  if (!(await panelUp(P))) { await holdTitle(P, 1500); await P.page.waitForTimeout(900); }
  await P.page.evaluate((k) => {
    const inp = document.querySelector('input[type="password"]');
    if (!inp) return;
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(inp, k);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }, H.ADMIN_KEY);
  await tap(P, 'Save key on this device');
  await P.page.waitForTimeout(1500);
  await tap(P, 'Finish all quests');
  await P.page.waitForTimeout(2000);
  await tap(P, 'Close');
  await P.page.waitForTimeout(600);
  /* v2.3.3013: the Wheel's next stretches have monsters now (levels 6-20),
     and one stands 6 px from FROST: a level-8 snowman killed the stepper
     mid-walk, and the respawn took it home through today's town, so every
     check after the walk read the wrong place.  This is a test of footsteps,
     not of a fight: the operator's god mode (server/src/devtools.js) lands
     nothing on the stepper -- no damage, so no status either */
  const myId = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'vitals', myId, { god: true, godMinutes: 20 });
  /* a real gesture: the audio context is born in one */
  await P.page.touchscreen.tap(195, 300);
  await P.page.waitForTimeout(400);
  await watchSteps(P);

  /* ── 1. town: today's dirt step ── */
  let steps = [];
  for (let k = 0; k < 4 && steps.length < 2; k++) { await pace(P, 1600); steps.push(...(await takeSteps(P))); }
  rec.ok(`in town every foot plant is today's dirt step, for no ground (${steps.length} steps)`,
    steps.length >= 2 && steps.every((s) => s.surface === null && s.played === 'dirt'), steps.slice(0, 4));

  /* ── 2. into the Wheel: the clips decode on the way in ── */
  const door = TOWN_EXITS.find((e) => e.zoneId === 'worldview');
  await H.hopTo(P, door.tx * 32 + 16, (door.ty - 1) * 32 + 16);
  let zone = null;
  for (let i = 0; i < 60; i++) {
    zone = await H.readState(P, (S) => S.currentZone);
    if (WHEELISH(zone) && !(await H.readState(P, (S) => !!S._zoneLoading))) break;
    await P.page.waitForTimeout(1000);
  }
  const loaded = await P.page.evaluate((ks) => ks.filter((k) => !!(window.BT_AUDIO._samples || {})[k]), keys);
  rec.ok(`on the way into the Wheel its ${keys.length} footstep clips decode, before the overlay lifts (${loaded.length})`,
    WHEELISH(zone) && loaded.length === keys.length, { zone, missing: keys.filter((k) => !loaded.includes(k)) });
  await takeSteps(P);

  /* ── 3. this browser's decoder: every window holds its step ── */
  const fit = await P.page.evaluate((clips) => {
    const out = {};
    for (const [name, c] of Object.entries(clips)) {
      const b = window.BT_AUDIO._samples[c.key];
      if (!b) { out[name] = { missing: true }; continue; }
      const d = b.getChannelData(0), sr = b.sampleRate;
      const inside = new Uint8Array(d.length);
      let total = 0, outside = 0, edges = 0, weak = 0;
      for (const [off, dur] of c.steps) {
        const a = Math.floor(off * sr), z = Math.min(d.length, Math.floor((off + dur) * sr));
        let pk = 0;
        for (let i = a; i < z; i++) { inside[i] = 1; pk = Math.max(pk, Math.abs(d[i])); }
        const e = Math.floor(0.01 * sr);
        let e0 = 0, e1 = 0;
        for (let i = a; i < a + e; i++) e0 = Math.max(e0, Math.abs(d[i]));
        for (let i = z - e; i < z; i++) e1 = Math.max(e1, Math.abs(d[i]));
        edges = Math.max(edges, e0 / pk, e1 / pk);
        if (pk < 0.01) weak++;
      }
      for (let i = 0; i < d.length; i++) { const v = d[i] * d[i]; total += v; if (!inside[i]) outside += v; }
      out[name] = { steps: c.steps.length, outside: +(outside / total).toFixed(5), edges: +edges.toFixed(3), weak, sr };
    }
    return out;
  }, clips);
  const bad = Object.entries(fit).filter(([, f]) => f.missing || f.outside > 0.01 || f.edges > 0.12 || f.weak);
  rec.ok('in this browser\'s own decoder every step window holds its step whole: under 1% of each clip outside its windows, every window quiet at both ends',
    bad.length === 0, bad.length ? Object.fromEntries(bad) : fit);

  /* ── 4. walking on several grounds ── */
  const T0 = await P.page.evaluate(() => { const S = window._gameState.current; return { x: S.player.x, y: S.player.y }; });
  const map = await P.page.evaluate(() => { const m = window.__btWorldTrial.wheelMap(); return m ? { commons: m.hub.commons } : null; });
  const heard = [];
  const walkOn = async (label, x, y, sound) => {
    await H.hopTo(P, x, y, { tries: 90 });
    await P.page.waitForTimeout(2500);
    const at = sound ? await findGround(P, x, y, sound) : null;
    if (sound && !at) return { label, found: false };
    if (at) { await H.hopTo(P, at.x, at.y, { tries: 30 }); await P.page.waitForTimeout(600); }
    await takeSteps(P);
    /* a headless box draws few frames a second, and the foot-plant trigger
       fires only on the frames it lands on: walk until a few are heard */
    const s = [];
    for (let k = 0; k < 4 && s.length < 3; k++) { await pace(P, 1600); s.push(...(await takeSteps(P))); }
    heard.push(...s);
    return { label, found: true, at, n: s.length, sounds: [...new Set(s.map((q) => q.played))] };
  };
  const walks = [];
  walks.push(await walkOn('the town square', T0.x, T0.y, null));
  if (map && map.commons) walks.push(await walkOn('the commons', map.commons.x, map.commons.y, 'grass'));
  walks.push(await walkOn('Frost Ridge', FROST.x, FROST.y, 'snow'));
  const onWheel = heard.filter((s) => WHEELISH(s.zone));
  const mism = onWheel.filter((s) => s.want && s.surface !== s.want);
  const wrongPlay = onWheel.filter((s) => s.surface && s.played !== s.surface);
  rec.ok(`every foot plant in the Wheel asks for the sound of the ground drawn under the feet (${onWheel.length} steps)`,
    onWheel.length >= 6 && mism.length === 0, { mism: mism.slice(0, 5), walks });
  rec.ok('...and plays it, its own clip (dirt only where the ground is dirt)', wrongPlay.length === 0 && onWheel.every((s) => s.played), wrongPlay.slice(0, 5));
  const sounds = [...new Set(onWheel.map((s) => s.played))];
  rec.ok(`...several grounds, several sounds: ${sounds.join(', ')}`, sounds.length >= 3 && sounds.includes('snow') && sounds.includes('grass'), { sounds, walks });

  /* the pieces' grids are where they belong: the drawn ground agrees with
     the plan's own ground for the spot (wheelHere, the readout's) most of
     the time -- not always, where two grounds mix the pictures decide */
  await P.page.waitForTimeout(800);
  const agree = await P.page.evaluate(() => {
    const T = window.__btWorldTrial, S = window._gameState.current;
    const line = (T.hud() || '').split('\n').find((l) => l.indexOf('here') === 0) || '';
    const planned = line.replace(/^here\s+/, '').replace(/ ✓$| \(not made\)$/, '');
    const g = T.ground(S.player.x, S.player.y);
    return { planned, drawn: g ? g.name.slice(0, 34) : null };
  });
  rec.ok('...in the middle of a patch the drawn ground under the feet is the plan\'s own for the spot (the readout\'s)', !!agree.drawn && agree.drawn === agree.planned, agree);

  /* ── 5. home: dirt again, and the clips let go ── */
  const exit = await P.page.evaluate(() => {
    const S = window._gameState.current;
    for (let y = 0; y < S.map.length; y++) { const row = S.map[y]; const x = row.indexOf(8); if (x >= 0) return { tx: x, ty: y }; }
    return null;
  });
  await H.hopTo(P, exit.tx * 32 + 16 + 40, exit.ty * 32 + 16, { tries: 120 });
  let back = null;
  for (let i = 0; i < 40; i++) {
    back = await H.readState(P, (S) => S.currentZone);
    if (back === 'town' && !(await H.readState(P, (S) => !!S._zoneLoading))) break;
    await P.page.waitForTimeout(700);
  }
  await P.page.waitForTimeout(1200);
  await takeSteps(P);
  steps = [];
  for (let k = 0; k < 4 && steps.length < 2; k++) { await pace(P, 1600); steps.push(...(await takeSteps(P))); }
  rec.ok(`back in town the steps are dirt again (${steps.length} steps)`, back === 'town' && steps.length >= 2 && steps.every((s) => s.surface === null && s.played === 'dirt'), { back, steps: steps.slice(0, 3) });
  await P.page.waitForTimeout(7000);   /* WHEEL_LINGER_MS (5 s) and a little */
  const left = await P.page.evaluate((ks) => ks.filter((k) => !!(window.BT_AUDIO._samples || {})[k]), keys);
  rec.ok('once the Wheel\'s worker stops, its footstep clips are let go', left.length === 0, left);

  /* ── 6. v2.3.2968: a sound changed in the Ground Studio is the game's ──
     The studio keeps a change in its own storage on this site ('misc',
     'steps'), as its card's menu does; the next way into the Wheel plays it */
  await P.page.evaluate(() => new Promise((res, rej) => {
    const r = indexedDB.open('brotown-ground-studio', 1);
    r.onupgradeneeded = () => { for (const s of ['raw', 'prep', 'misc']) if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s); };
    r.onsuccess = () => {
      const db = r.result, tx = db.transaction('misc', 'readwrite');
      tx.objectStore('misc').put({ commons: 'snow' }, 'steps');
      tx.oncomplete = () => { db.close(); res(); };
      tx.onerror = () => rej(tx.error);
    };
    r.onerror = () => rej(r.error);
  }));
  await H.hopTo(P, door.tx * 32 + 16, (door.ty - 1) * 32 + 16);
  zone = null;
  for (let i = 0; i < 60; i++) {
    zone = await H.readState(P, (S) => S.currentZone);
    if (WHEELISH(zone) && !(await H.readState(P, (S) => !!S._zoneLoading))) break;
    await P.page.waitForTimeout(1000);
  }
  const commonsAt = (walks.find((w) => w.label === 'the commons') || {}).at;
  let onCommons = [];
  if (WHEELISH(zone) && commonsAt) {
    await H.hopTo(P, commonsAt.x, commonsAt.y, { tries: 90 });
    await P.page.waitForTimeout(2500);
    await takeSteps(P);
    for (let k = 0; k < 4 && onCommons.length < 3; k++) { await pace(P, 1600); onCommons.push(...(await takeSteps(P)).filter((q) => q.ground === 'commons')); }
  }
  rec.ok(`a sound changed in the Ground Studio is the game's: the commons, made snow there, plays snow (${onCommons.length} steps)`,
    onCommons.length >= 1 && onCommons.every((q) => q.want === 'snow' && q.surface === 'snow' && q.played === 'snow'), { zone, commonsAt, steps: onCommons.slice(0, 4) });
  rec.ok('no page errors', P.logs.filter((l) => /pageerror/.test(l)).length === 0, P.logs.filter((l) => /pageerror/.test(l)).slice(0, 5));
}
