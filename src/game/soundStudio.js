/* ═══ v2.3.3498: THE SOUND STUDIO -- WHAT YOU JUST HEARD, AND THE WAY IN ═══
 *
 * The owner: "I think sounds were wired in the wrong places.  The labels
 * should tell you where they go.  Might need to build a quick studio to show
 * which sounds belong where."  The studio itself (ui/panels/SoundStudio.jsx)
 * is loaded only when it is opened; this small part is always here, for two
 * things:
 *
 *   1. WHAT YOU JUST HEARD.  A sound that is wrong is noticed the moment it
 *      plays, so the game keeps the last HEARD_MAX sounds it started -- which
 *      recording, when, and what asked for it -- and the studio's "Heard just
 *      now" names each by the moment it belongs to.  BT_AUDIO.play is the one
 *      door every sample goes through (data/gameDisplay.js); it is wrapped
 *      here, and each of BT_AUDIO's table helpers (a hit by material, a prop,
 *      a ball, a status, a noise, a step...) is wrapped to say what it is
 *      while its samples start (BT_AUDIO._tag; game/eventSounds.js's cue player says
 *      its cue's name the same way).  A play the game makes straight from a
 *      recording says nothing, and the studio names it by its recording.  A
 *      ring of plain objects written in place: nothing grows, nothing is
 *      allocated per sound once the ring is full.
 *   2. THE WAY IN: openSoundStudio() (the Test panel's "Sound studio", and
 *      ?sounds in the address once the world is up), and window.__btSoundStudio
 *      for the tests.
 *
 * Sound only, like every helper here: nothing may throw into a caller. */
import { BT_AUDIO } from '@/data/index.js';

/* How many started sounds are remembered. */
export const HEARD_MAX = 48;

const _ring = [];
let _next = 0;
let _seq = 0;

function remember(key, tag) {
  let e = _ring[_next];
  if (!e) { e = { key: '', tag: null, at: 0, seq: 0 }; _ring[_next] = e; }
  e.key = key;
  e.tag = tag || null;
  e.at = Date.now();
  e.seq = ++_seq;
  _next = (_next + 1) % HEARD_MAX;
}

/** The sounds started lately, oldest first: [{key, tag, at, seq}] (copies). */
export function heardSounds() {
  return _ring.filter((e) => e && e.seq > 0).sort((a, b) => a.seq - b.seq).map((e) => ({ key: e.key, tag: e.tag, at: e.at, seq: e.seq }));
}

export function clearHeard() {
  for (const e of _ring) if (e) e.seq = 0;
}

const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

/* What each of BT_AUDIO's helpers is, from its arguments -- the studio's own
   row ids (ui/panels/SoundStudio.jsx rowsFor). */
const TAGS = {
  materialHit: (a, A) => 'hit:' + (has(A.HIT_VOICES, a[0]) ? a[0] : 'flesh'),
  propHit: (a, A) => 'prop:' + (has(A.PROP_SOUNDS, a[0]) ? a[0] : 'stone') + ':' + (a[1] && a[1].big ? 'big' : 'hit'),
  propBreak: (a, A) => 'prop:' + (has(A.PROP_SOUNDS, a[0]) ? a[0] : 'stone') + ':' + (a[1] === 'building' ? 'building' : a[1] === 'tree' ? 'tree' : 'brk'),
  shotHit: (a, A) => 'shot:' + (has(A.SHOT_SOUNDS, a[0]) ? a[0] : 'goo'),
  elemHit: (a) => 'elem:' + a[0],
  monsterNoise: (a) => 'noise:' + a[0],
  footstep: (a) => 'step:' + (a[1] && a[1] !== 'swim' ? a[1] : 'dirt'),
  sprintPush: () => 'other:sprint',
  swimStroke: () => 'other:swimStroke',
  swimSplash: (a) => (a[0] === 'out' ? 'other:swimOut' : 'other:swimIn'),
  swordSwing: () => 'other:swing',
  specialSwipe: () => 'other:swipe',
  magicHit: () => 'other:magicHit',
  monsterHitHero: (a) => (a[0] ? 'other:heroArmour' : 'other:heroBare'),
  playerDeath: () => 'other:playerDeath',
  monsterDeath: (a, A) => (a[0] === 'snowman' ? 'other:dieSnowman' : a[0] === 'skeleton' ? 'other:dieSkeleton'
    : has(A.DEATH_CUES, a[0]) ? 'cue:' + A.DEATH_CUES[a[0]] : 'other:dieOther'),
  enterBuilding: () => 'cue:door',
  /* the menu's own ticks: the studio's taps make them, so its "Heard just
     now" leaves them out unless asked */
  uiTick: (a) => (a[0] === 'ui-click' ? 'other:uiClick' : a[0] === 'ui-equip' ? 'other:uiEquip' : a[0] === 'ui-close' ? 'other:uiClose' : 'ui:' + a[0]),
};

let _installed = false;

/** Wrap BT_AUDIO.play and its helpers so every started sound is remembered.
 *  Once; harmless when BT_AUDIO is not there (a Node test). */
export function installHeard(A) {
  const au = A || BT_AUDIO;
  if (_installed || !au || typeof au.play !== 'function') return false;
  _installed = true;
  const play = au.play;
  au.play = function () {
    const h = play.apply(this, arguments);
    try { if (h) remember(String(arguments[0]), au._tag); } catch (e) { /* sound only */ }
    return h;
  };
  for (const name of Object.keys(TAGS)) {
    const fn = au[name];
    if (typeof fn !== 'function') continue;
    const tagOf = TAGS[name];
    au[name] = function () {
      const prev = au._tag;
      try { au._tag = tagOf(arguments, au); } catch (e) { au._tag = null; }
      try { return fn.apply(this, arguments); } finally { au._tag = prev; }
    };
  }
  return true;
}

/* ── the way in ── */
let _host = null;
let _root = null;
let _opening = null;

/** Open the studio (loads it the first time). */
export function openSoundStudio(opts) {
  if (_root) return Promise.resolve(true);
  if (_opening) return _opening;
  _opening = Promise.all([import('react-dom/client'), import('react'), import('@/ui/panels/SoundStudio.jsx')])
    .then(([RDC, R, M]) => {
      _host = document.createElement('div');
      _host.setAttribute('data-sound-studio-host', '');
      document.body.appendChild(_host);
      _root = RDC.createRoot(_host);
      _root.render(R.createElement(M.SoundStudio, { onClose: closeSoundStudio, tab: opts && opts.tab }));
      return true;
    })
    .catch((e) => { try { console.warn('[sound studio] could not open', e); } catch (_e) { /* */ } return false; })
    .finally(() => { _opening = null; });
  return _opening;
}

export function closeSoundStudio() {
  try { if (_root) _root.unmount(); } catch (e) { /* */ }
  try { if (_host && _host.parentNode) _host.parentNode.removeChild(_host); } catch (e) { /* */ }
  _root = null;
  _host = null;
}

if (typeof window !== 'undefined') {
  installHeard();
  window.__btSoundStudio = {
    open: (opts) => openSoundStudio(opts),
    close: () => closeSoundStudio(),
    isOpen: () => !!_root,
    heard: () => heardSounds(),
    clear: () => clearHeard(),
  };
  /* ?sounds in the address: the studio, once the world is up (the loading
     screen gone) -- the owner's quick way in, and the tests' */
  try {
    if (/[?&]sounds(=|&|$)/.test(window.location.search)) {
      const t0 = Date.now();
      const wait = () => {
        const S = window._gameState && window._gameState.current;
        const up = S && S.player && !document.body.classList.contains('bt-intro-up');
        if (up) openSoundStudio();
        else if (Date.now() - t0 < 180000) setTimeout(wait, 1000);
      };
      setTimeout(wait, 1000);
    }
  } catch (e) { /* */ }
}
