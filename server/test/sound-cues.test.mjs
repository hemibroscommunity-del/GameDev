/* ═══ v2.3.3343: THE SOUNDS MADE FROM RECORDINGS ALREADY IN THE GAME ═══
 *
 * The owner, 2026-10-18, on the list of missing sounds: "Start adding the have
 * ones" -- every event that played nothing and can be made from a recording
 * the game already ships.  The sounds are data/eventSounds.js's table, played
 * by game/eventSounds.js.  This holds:
 *
 *   1. every cue to the shape BT_AUDIO._playLayer plays,
 *      [key, offset, duration, vol, rate, delay, fade], within sane bounds;
 *   2. every layer's sample to SFX_MANIFEST -- decoded on the loading screen,
 *      so the memory budget does not move -- never a Wheel-only `step-*` clip
 *      (a cue must sound the same everywhere), its file on disk;
 *   3. every slice inside its file, the file's length read from its own MPEG
 *      frames (a slice past the end plays silence and reports nothing);
 *   4. CUE_GAP_MS to the table;
 *   5. every place that plays a cue to a name in the table (the literal names
 *      at every cue / cueAt / cuePeer call, and the two passed through a
 *      variable), every file that calls a player to an import of it, and
 *      every cue to a place that plays it (no dead cue);
 *   6. the deaths: every monster look dies as SOMETHING -- a slime's splat, a
 *      death of its own, or bones -- and never two at once;
 *   7. the river's loop: its own source on the music bus, never
 *      startSfxLoop, ticked by the game loop;
 *   8. the door: enterBuilding plays the table's knock, not the beep() that
 *      has played nothing since v2.3.1103;
 *  10. v2.3.3434, the third look (the owner: "Good look for more"): every
 *      emote and move heard as something chosen (MOVE_SOUNDS holds every move
 *      of game/emoteMoves.js), yours, other players' and the townsfolk's; a
 *      harvest's prize landing in the bag; and a menu opened by tapping the
 *      world (your bro's chat box, a player's card, a townsperson's window)
 *      opening with the menu click.
 *   9. v2.3.3434, the second round (the owner: "Look for more too"): the
 *      Gambling Den's dice and pot, the arena's stakes and sign-up, a guild
 *      quest, an alliance war's end, invites to duel and trade, the market,
 *      the farm's harvest and bed, pets out, away and released (and the four
 *      kinds that answer in their own voice), and the forge's anvil.
 *  11. v2.3.3462, the owner's recordings ("I have the rest of the sounds"):
 *      every one-shot cut by tools/audio/cut_owner_sounds.py in SFX_MANIFEST
 *      at the rate it is decoded at (24 kHz ones in LOW_RATE_SFX), every loop
 *      kept out of it; your hurt grunt, the heartbeat on its own clock,
 *      munch and gulp, the chat's pop, the chime, the "denied" tick at the
 *      refusals, the laugh and the snore, the war horn, the boss's roar, the
 *      explosion, the townsfolk's voices; the land's air, the sea's, the
 *      crowd's and a fire's beds, loaded where they play and let go; and the
 *      dance's beat on the music deck, never decoded.
 *  12. v2.3.3523, the sound studio (the owner: "The labels should tell you
 *      where they go.  Might need to build a quick studio to show which
 *      sounds belong where"): every cue, and every key of BT_AUDIO's
 *      HIT_VOICES, PROP_SOUNDS, SHOT_SOUNDS, ELEM_SOUNDS, MONSTER_NOISE_CLIPS
 *      and the footstep clips, has its "where it plays" in data/soundStudio.js,
 *      in a section the studio has -- a new sound is labelled in the same
 *      change -- and nothing there names a sound that is gone; every other
 *      row plays a recording in SFX_MANIFEST or a BT_AUDIO helper that
 *      exists; game/soundStudio.js tags only helpers that exist, and cue()
 *      says its cue's name while its samples start.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700))); }
}

const root = new URL('../../', import.meta.url);
const src = (p) => readFileSync(new URL(p, root), 'utf8');
const { EVENT_SOUNDS, CUE_GAP_MS, MOVE_SOUNDS } = await import('../../src/data/eventSounds.js');
const { MONSTER_VARIANTS } = await import('../../src/data/monsterVariants.js');
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const NAMES = Object.keys(EVENT_SOUNDS);

/* SFX_MANIFEST, read from gameDisplay.js's text (the file needs a browser) */
const GD = src('src/data/gameDisplay.js');
const MANIFEST = Object.create(null);
{
  const a = GD.indexOf('BT_AUDIO.SFX_MANIFEST = {');
  const block = GD.slice(a, GD.indexOf('\n};', a));
  for (const m of block.matchAll(/^\s*'([a-z0-9-]+)'\s*:\s*'([^']+)'/gm)) MANIFEST[m[1]] = m[2];
}

/* ── an mp3's length, from its frames (the walk tools/trim_mp3_tail.mjs makes) ── */
const BR1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
const BR2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
const RATES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };
function frameAt(b, i, ver, sr) {
  if (i + 4 > b.length || b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) return null;
  const v = (b[i + 1] >> 3) & 3, layer = (b[i + 1] >> 1) & 3, bi = (b[i + 2] >> 4) & 15, si = (b[i + 2] >> 2) & 3, pad = (b[i + 2] >> 1) & 1;
  if (v === 1 || layer !== 1 || bi === 0 || bi === 15 || si === 3) return null;
  const rate = RATES[v][si];
  if (ver != null && (v !== ver || rate !== sr)) return null;
  const br = (v === 3 ? BR1 : BR2)[bi] * 1000;
  const len = Math.floor(((v === 3 ? 144 : 72) * br) / rate) + pad;
  return len > 4 ? { v, rate, len, dur: (v === 3 ? 1152 : 576) / rate } : null;
}
const lengths = Object.create(null);
function mp3Seconds(url) {
  if (lengths[url] != null) return lengths[url];
  const b = readFileSync(new URL('public' + url.split('?')[0], root));
  let i = 0;
  if (b.toString('ascii', 0, 3) === 'ID3') i = 10 + ((b[6] & 0x7f) << 21 | (b[7] & 0x7f) << 14 | (b[8] & 0x7f) << 7 | (b[9] & 0x7f));
  let first = null;
  for (; i + 4 <= b.length; i++) { const h = frameAt(b, i, null, null); if (h && frameAt(b, i + h.len, h.v, h.rate)) { first = h; break; } }
  let secs = 0, bytes = 0;
  if (first) for (let j = i; ; ) { const h = frameAt(b, j, first.v, first.rate); if (!h) break; secs += h.dur; bytes += h.len; j += h.len; }
  /* a walk that lost its place is no length at all (trim_mp3_tail's rule) */
  const whole = first && b.length - (i + bytes) <= first.len + 128;
  lengths[url] = whole ? secs : -1;
  return lengths[url];
}

/* ── 1. the shape ── */
{
  const bad = [];
  for (const name of NAMES) {
    const layers = EVENT_SOUNDS[name];
    if (!Array.isArray(layers) || layers.length < 1 || layers.length > 4) { bad.push([name, 'layers']); continue; }
    for (const L of layers) {
      const ok = Array.isArray(L) && L.length >= 5 && L.length <= 7
        && typeof L[0] === 'string'
        && Number.isFinite(L[1]) && L[1] >= 0
        && Number.isFinite(L[2]) && L[2] >= 0
        && Number.isFinite(L[3]) && L[3] > 0 && L[3] <= 10
        && Number.isFinite(L[4]) && L[4] >= 0.4 && L[4] <= 2.5
        && (L[5] === undefined || (Number.isFinite(L[5]) && L[5] >= 0 && L[5] <= 2))   /* play() holds a delay to 2 s */
        && (L[6] === undefined || (Number.isFinite(L[6]) && L[6] >= 0));
      if (!ok) bad.push([name, L]);
      /* _playLayer fades only a slice with a length of its own: a fade on a
         slice that runs to the end of its file would silently do nothing */
      else if (L[6] > 0 && !(L[2] > 0 && L[6] <= L[2])) bad.push([name, 'fade', L]);
    }
  }
  check(`1a every cue (${NAMES.length}) is 1-4 layers of [key, offset, duration, vol, rate, delay?, fade?] within bounds`, NAMES.length >= 100 && bad.length === 0, bad);
  check('1b the names are words a call site can spell (no space, no __proto__)', NAMES.every((n) => /^[a-z][A-Za-z0-9]*$/.test(n)), NAMES.filter((n) => !/^[a-z][A-Za-z0-9]*$/.test(n)));
}

/* ── 2. the manifest and the files ── */
{
  const keys = new Set();
  for (const n of NAMES) for (const L of EVENT_SOUNDS[n]) keys.add(L[0]);
  const missing = [...keys].filter((k) => !has(MANIFEST, k));
  check(`2a every sample a cue plays (${keys.size}) is in SFX_MANIFEST, decoded on the loading screen`, Object.keys(MANIFEST).length > 30 && missing.length === 0, missing);
  const wheel = [...keys].filter((k) => /^step-/.test(k));
  check('2b no cue plays a Wheel-only footstep clip (they load only in the Wheel)', wheel.length === 0, wheel);
  const gone = [...keys].filter((k) => has(MANIFEST, k) && !existsSync(new URL('public' + MANIFEST[k].split('?')[0], root)));
  check('2c every one of those files is in public/', gone.length === 0, gone);
}

/* ── 3. every slice inside its file ── */
{
  const out = [], unread = [];
  for (const n of NAMES) {
    for (const L of EVENT_SOUNDS[n]) {
      if (!has(MANIFEST, L[0])) continue;
      const len = mp3Seconds(MANIFEST[L[0]]);
      if (!(len > 0)) { unread.push(L[0]); continue; }
      /* one mp3 frame (~26 ms) of slack: the decoder's own padding */
      const end = L[2] > 0 ? L[1] + L[2] : len;
      if (!(L[1] < len - 0.05) || end > len + 0.03) out.push({ cue: n, key: L[0], from: L[1], to: +end.toFixed(3), len: +len.toFixed(3) });
    }
  }
  check('3a every sample\'s frames walk cleanly (its length is known)', unread.length === 0, [...new Set(unread)]);
  check('3b every slice starts inside its file and ends by its end', out.length === 0, out);
  check('3c the frame walk reads a known file right (sword-hit3 is about 0.5 s, not 0)', (() => {
    const s = mp3Seconds(MANIFEST['sword-hit3']); return s > 0.2 && s < 3;
  })(), mp3Seconds(MANIFEST['sword-hit3']));
}

/* ── 4. the least gaps ── */
{
  const g = Object.keys(CUE_GAP_MS);
  check('4a every CUE_GAP_MS name is a cue, its gap 1-1000 ms', g.length > 0 && g.every((k) => has(EVENT_SOUNDS, k) && Number.isFinite(CUE_GAP_MS[k]) && CUE_GAP_MS[k] > 0 && CUE_GAP_MS[k] <= 1000),
    g.filter((k) => !has(EVENT_SOUNDS, k) || !(CUE_GAP_MS[k] > 0 && CUE_GAP_MS[k] <= 1000)));
}

/* ── 5. the call sites ── */
const files = [];
(function walk(dir) {
  for (const f of readdirSync(new URL(dir, root))) {
    const p = dir + f;
    if (statSync(new URL(p, root)).isDirectory()) walk(p + '/');
    else if (/\.(js|jsx)$/.test(f)) files.push(p);
  }
})('src/');
const PLAYER = 'src/game/eventSounds.js';

/* a call's arguments, split at its top-level commas (strings and brackets kept whole) */
function argsAt(text, open) {
  const args = []; let depth = 0, cur = '', q = null;
  for (let i = open + 1; i < text.length; i++) {
    const c = text[i];
    if (q) { cur += c; if (c === '\\') { cur += text[++i]; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; cur += c; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    if (c === ')' || c === ']' || c === '}') { if (depth === 0) { args.push(cur.trim()); return args; } depth--; }
    if (c === ',' && depth === 0) { args.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  return null;
}
/* the names a piece of code can be: every quoted word in it that is not
   being COMPARED (payload.ability === 'slam' ? 'windSlam' : 'windLunge') */
function namesIn(code) {
  const out = [];
  for (const m of code.matchAll(/(['"])([A-Za-z0-9_]+)\1/g)) {
    if (/(===|!==|==|!=)\s*$/.test(code.slice(0, m.index))) continue;
    out.push(m[2]);
  }
  return out;
}
const callRe = (fn) => new RegExp('(?<![\\w.$])' + fn + '\\(', 'g');

const used = new Set(), unknown = [], indirect = [], unimported = [];
const PLAYERS = ['cue', 'cueAt', 'cuePeer', 'peerShare', 'peerStepShare', 'peerOwn', 'cueLater' /* v2.3.3523 */];
for (const p of files) {
  if (p === PLAYER) continue;
  const text = src(p);
  const imports = [...text.matchAll(/import\s*\{([^}]*)\}\s*from\s*'[^']*\/game\/eventSounds\.js'/g)].flatMap((m) => m[1].split(',').map((s) => s.trim()));
  for (const fn of PLAYERS) {
    for (const m of text.matchAll(callRe(fn))) {
      if (/function\s+$/.test(text.slice(Math.max(0, m.index - 12), m.index))) continue;
      if (!imports.includes(fn)) unimported.push(p + ' ' + fn);
      if (fn !== 'cue' && fn !== 'cueAt' && fn !== 'cuePeer' && fn !== 'cueLater') continue;
      const args = argsAt(text, m.index + fn.length);
      const line = text.slice(0, m.index).split('\n').length;
      if (!args) { unknown.push(p + ':' + line + ' unreadable'); continue; }
      const arg = (fn === 'cue' || fn === 'cueLater') ? args[0] : args[1];
      const names = namesIn(arg || '');
      if (!names.length) { indirect.push({ p, line, arg }); continue; }
      for (const n of names) { if (has(EVENT_SOUNDS, n)) used.add(n); else unknown.push(p + ':' + line + ' ' + n); }
    }
  }
}
{
  /* the two names passed through a variable, each read where it is set */
  const KNOWN = {
    'src/networking/wsClient.js _pickCue': () => {
      const t = src('src/networking/wsClient.js');
      const a = t.indexOf('var _pickCue = ');
      return a < 0 ? [] : namesIn(t.slice(a, t.indexOf(';', a)));
    },
    /* v2.3.3434: the moves' cues, read from the table that names them */
    'src/game/moveSounds.js n': () => Object.values(MOVE_SOUNDS || {}).flat(),
    /* v2.3.3462: your hurt grunts and the townsfolk's hums, one of a list */
    'src/game/ownSounds.js HURT_CUES[i]': () => {
      const t = src('src/game/ownSounds.js');
      const a = t.indexOf('export const HURT_CUES = ');
      return a < 0 ? [] : namesIn(t.slice(a, t.indexOf(';', a)));
    },
    'src/game/npcVoices.js VOICE_CUES[v[0]]': () => {
      const t = src('src/game/npcVoices.js');
      const a = t.indexOf('export const VOICE_CUES = ');
      return a < 0 ? [] : namesIn(t.slice(a, t.indexOf(';', a)));
    },
    'src/ui/panels/buildings/StorePanel.jsx snd': () => {
      const t = src('src/ui/panels/buildings/StorePanel.jsx');
      const out = [];
      for (const m of t.matchAll(/(?<![\w.$])act\(/g)) {
        const a = argsAt(t, m.index + 3);
        if (a && a.length >= 3) out.push(...namesIn(a[2]));
      }
      return out;
    },
  };
  /* v2.3.3523: the sound studio plays EVERY cue for the owner to hear (its
     ▶); that is no place in the game playing one, so it is no use here --
     else 5d could never find a dead cue */
  const STUDIO = 'src/ui/panels/SoundStudio.jsx name';
  const strange = [];
  for (const c of indirect) {
    const key = c.p + ' ' + c.arg;
    if (key === STUDIO) continue;
    if (!has(KNOWN, key)) { strange.push(c); continue; }
    const names = KNOWN[key]();
    if (!names.length) strange.push({ ...c, why: 'no names found where it is set' });
    for (const n of names) { if (has(EVENT_SOUNDS, n)) used.add(n); else unknown.push(key + ' ' + n); }
  }
  check(`5a every name a call site plays is in the table (${used.size} names at the calls)`, used.size > 60 && unknown.length === 0, unknown);
  check('5b a call that passes its name in a variable is one this test knows how to read (add a rule here for a new one)', strange.length === 0, strange);
  check('5c every file that calls a player imports it from game/eventSounds.js', unimported.length === 0, [...new Set(unimported)]);

  /* where else a cue is named: the door (enterBuilding reads EVENT_SOUNDS.door)
     and the deaths (DEATH_CUES, read by monsterDeath) */
  for (const m of GD.matchAll(/EVENT_SOUNDS\.([A-Za-z0-9_]+)/g)) used.add(m[1]);
  const dc = GD.match(/BT_AUDIO\.DEATH_CUES = \{([^}]*)\}/);
  for (const n of namesIn(dc ? dc[1] : '')) used.add(n);
  const dead = NAMES.filter((n) => !used.has(n));
  check('5d every cue is played somewhere (no dead cue in the table)', dead.length === 0, dead);
}

/* ── 6. the deaths ── */
{
  const dc = GD.match(/BT_AUDIO\.DEATH_CUES = \{([^}]*)\}/);
  const ss = GD.match(/BT_AUDIO\.SLIME_SHEET_DEATHS = \{([^}]*)\}/);
  const pairs = dc ? [...dc[1].matchAll(/(\w+)\s*:\s*'(\w+)'/g)].map((m) => [m[1], m[2]]) : [];
  const slimes = ss ? [...ss[1].matchAll(/(\w+)\s*:/g)].map((m) => m[1]) : [];
  const V = Object.keys(MONSTER_VARIANTS);
  check('6a DEATH_CUES names monster looks and cues that exist', pairs.length >= 4
    && pairs.every(([a, c]) => V.includes(a) && has(EVENT_SOUNDS, c)), pairs);
  const sheets = V.filter((k) => MONSTER_VARIANTS[k].useSlimeSheets).sort();
  check('6b SLIME_SHEET_DEATHS is exactly the looks drawn on the slime sheet (entityRenderer plays their splat)',
    slimes.slice().sort().join() === sheets.join(), { slimes, sheets });
  const md = GD.slice(GD.indexOf('BT_AUDIO.monsterDeath = function'), GD.indexOf('BT_AUDIO.loadSample = function'));
  check('6c monsterDeath plays nothing for them, so no slime dies twice',
    /hasOwnProperty\.call\(this\.SLIME_SHEET_DEATHS, arch\)\) return;/.test(md));
  /* a new monster look must be given a death: bones are chosen, never fallen into */
  const BONES = ['mummy', 'skeleton'];
  const own = new Set(pairs.map((p) => p[0]));
  const undecided = V.filter((k) => !own.has(k) && !slimes.includes(k) && !BONES.includes(k));
  const twice = V.filter((k) => [own.has(k), slimes.includes(k), BONES.includes(k)].filter(Boolean).length > 1);
  check('6d every monster look dies as one thing: a slime\'s splat, a death of its own, or bones', undecided.length === 0 && twice.length === 0, { undecided, twice });
  check('6e the thorn shambler (the rock monster\'s body, mossy) dies as the rock monster does',
    pairs.some(([a, c]) => a === 'thornShambler' && c === 'dieRock') && pairs.some(([a, c]) => a === 'rockmonster' && c === 'dieRock'));
}

/* ── 7. the river's loop ── */
{
  const w = src('src/game/waterAmbience.js');
  check('7a the river\'s loop plays river-water, already in the manifest', /const KEY = 'river-water';/.test(w) && has(MANIFEST, 'river-water'));
  check('7b ...on its own source on the music bus, never startSfxLoop (the fishing loop of that sample is stopped every frame nobody fishes)',
    /_out\('music'\)/.test(w) && !/startSfxLoop|stopSfxLoop/.test(w.replace(/\/\*[\s\S]*?\*\//g, '')));
  const near = +((w.match(/RIVER_NEAR = (\d+)/) || [])[1]), far = +((w.match(/RIVER_FAR = (\d+)/) || [])[1]), vol = +((w.match(/RIVER_VOL = ([\d.]+)/) || [])[1]);
  check('7c it rises from nothing to full as you near the water, never louder than the fishing loop (0.35)', near > 0 && far > near && vol > 0 && vol <= 0.35, { near, far, vol });
  check('7d silent while you fish (the fishing loop is the water then), only in the Wheel', /skill === 'fishing'/.test(w) && /currentZone === 'wheel'/.test(w));
  const bt = src('src/ui/BroTown.jsx');
  check('7e the game loop ticks it', /import \{ tickWaterAmbience \} from '@\/game\/waterAmbience\.js'/.test(bt) && /tickWaterAmbience\(S, /.test(bt));
}

/* ── 8. the door ── */
{
  const a = GD.indexOf('enterBuilding: function enterBuilding(');   /* v2.3.3664: (kind) -- a dungeon's mouth keeps the knock */
  const body = GD.slice(a, GD.indexOf('chatSend: function chatSend()', a));
  check('8a a door is heard: enterBuilding plays the table\'s knock, not beep() (silent since v2.3.1103)',
    a > 0 && /EVENT_SOUNDS\.door/.test(body) && !/this\.beep\(/.test(body));
  check('8b ...and stamps it as the tap\'s own sound, so the Enter button\'s click yields', /this\._uiSpecificAt = this\._now\(\)/.test(body));
}

/* ── 9. v2.3.3434: the second round ("Look for more too") ──
   Each of these places called collect() or beep(), both silent since
   v2.3.1103, or nothing; each now plays its cue, and none still leans on the
   silent call it replaced. */
{
  /* a `case 'x':` block of a switch, to the next case */
  const caseOf = (text, name) => {
    const a = text.indexOf("case '" + name + "':");
    if (a < 0) return '';
    const b = text.indexOf("\n          case '", a + 10);
    return text.slice(a, b < 0 ? a + 4000 : b);
  };
  const GE = src('src/networking/gameEvents.js');
  const WS = src('src/networking/wsClient.js');
  const silent = /BT_AUDIO\.(collect|beep|levelUp)\(/;
  const plays = (block, ...names) => names.every((n) => new RegExp("cue\\([^)]*'" + n + "'").test(block));
  const wired = [
    ['gamble_result (the Gambling Den\'s dice)', caseOf(GE, 'gamble_result'), ['betWon', 'betLost']],
    ['jackpot_state (coins into the weekly pot)', caseOf(GE, 'jackpot_state'), ['betIn']],
    ['jackpot_result (the pot is yours)', caseOf(GE, 'jackpot_result'), ['jackpotWin']],
    ['arena_stake_placed', caseOf(GE, 'arena_stake_placed'), ['betIn']],
    ['arena_stake_result', caseOf(GE, 'arena_stake_result'), ['betWon', 'betLost']],
    ['guild_quest_result', caseOf(GE, 'guild_quest_result'), ['guildQuest']],
    ['duel_request', caseOf(GE, 'duel_request'), ['duelAsk']],
    ['duel_wager_request', caseOf(GE, 'duel_wager_request'), ['duelAsk']],
    ['trade2_invite', caseOf(GE, 'trade2_invite'), ['tradeAsk']],
    ['alliance_war_end', caseOf(WS, 'alliance_war_end'), ['warWon', 'warLost']],
  ];
  const bad = wired.filter(([, b, n]) => !b || !plays(b, ...n) || silent.test(b)).map(([w]) => w);
  check(`9a the server's answers (${wired.length}) play their cues, none of them still the silent collect()/beep()`, bad.length === 0, bad);
  check('9a2 the jackpot fanfare is the winner\'s alone (the draw goes to everyone)', /winnerId === S\.myId\) cue\('jackpotWin'\)/.test(caseOf(GE, 'jackpot_result')));

  const FF = src('src/game/farmFeedback.js').replace(/\/\*[\s\S]*?\*\//g, '');   /* the code, not what its comments say */
  check('9b a crop pulled from its bed is heard (farmHarvest), not collect()', /harvest: \(\) => cue\('farmHarvest'\)/.test(FF) && !/harvest:[^\n]*collect\(/.test(FF));
  const EX = src('src/ui/panels/buildings/ExchangePanel.jsx');
  check('9c the General Store\'s market speaks as the auction house does: bought, sold, listed, called off',
    /cue\(mktMode === 'buy' \? 'marketBuy' : 'marketSold'\)/.test(EX) && /cue\('marketList'\)/.test(EX) && /cue\('tradeOff'\)/.test(EX) && !/BT_AUDIO\.(collect|beep)\(/.test(EX));
  check('9d signing up for the arena is heard', /'Entered arena queue!'[^\n]*\n\s*cue\('arenaJoin'\)/.test(src('src/ui/panels/buildings/PartyPanel.jsx')));
  const BT = src('src/ui/BroTown.jsx');
  const rests = BT.split(/'Fully Rested!'|'Zzz\.\.\. Stats restored!'/).slice(1).map((t) => t.slice(0, 400));
  /* v2.3.3539: the worker pays a rest now (server/src/rest.js): the bed's
     Sleep button was a copy of the E key's rest and calls it, so the phone has
     two of its own (for an older worker), and the worker's answer is heard
     through game/rest.js, which plays the cue wsClient hands it */
  const RJ = src('src/game/rest.js');
  check('9e every way to rest is heard: the farm bed\'s two on the phone, and the worker\'s rest at the Hotel or the bed',
    rests.length === 2 && rests.every((t) => /cue\('rested'\)/.test(t) && !silent.test(t))
      && /out\.sound\('rested'\)/.test(RJ) && /sound: cue,/.test(caseOf(WS, 'rest_result')) && !silent.test(caseOf(WS, 'rest_result')),
    { rests: rests.length, played: /out\.sound\('rested'\)/.test(RJ), handed: /sound: cue,/.test(caseOf(WS, 'rest_result')) });

  /* the pets: out, away, released -- and the four kinds whose wild look has
     a recording answer with it */
  const TR = src('src/game/trapping.js');
  check('9f a pet taken out, put away and released is heard', /cue\('petFree'\)/.test(TR) && /if \(pet\) \{ cue\('petOut'\); petVoice\(pet\.kind\); \} else cue\('petAway'\)/.test(TR));
  const { PET_KINDS } = await import('../../src/data/trapping.js');
  const { MONSTER_NOISE_CLIPS } = await import('../../src/data/monsterNoiseClips.js');
  const MN = src('src/game/monsterNoises.js');
  const nb = MN.slice(MN.indexOf('export const NOISE_OF'), MN.indexOf('});', MN.indexOf('export const NOISE_OF')));
  const NOISE_OF = Object.fromEntries([...nb.matchAll(/(\w+)\s*:\s*'([a-z-]+)'/g)].map((m) => [m[1], m[2]]));
  const voiced = Object.keys(PET_KINDS).filter((k) => has(NOISE_OF, PET_KINDS[k].look)).sort();
  check('9g the pets with a voice are exactly the kinds whose wild look has one (Snowling, Gobling, Sparklet, Dewdrop)',
    voiced.join() === ['dewdrop', 'gobling', 'snowling', 'sparklet'].join(), { voiced, NOISE_OF });
  check('9h ...each voice a recording in SFX_MANIFEST, and played small: quicker and higher, softer than the wild one',
    voiced.every((k) => has(MONSTER_NOISE_CLIPS, NOISE_OF[PET_KINDS[k].look]) && has(MANIFEST, 'noise-' + NOISE_OF[PET_KINDS[k].look]))
    && /PET_VOICE_RATE = 1\.\d+;/.test(TR) && /PET_VOICE_K = 0\.\d+;/.test(TR)
    && /ownKey\(PET_KINDS, kind\)/.test(TR) && /ownKey\(NOISE_OF, k\.look\)/.test(TR));

  /* the forge at work */
  const TA = src('src/game/townAmbience.js');
  const { WHEEL_BUILDING_DOORS } = await import('../../src/data/wheelBuildingDoors.js');
  const plot = (TA.match(/FORGE_PLOT = '(\w+)'/) || [])[1];
  check('9i the anvil is heard at the forge itself: the plot whose door opens the Blacksmith\'s', !!plot && WHEEL_BUILDING_DOORS[plot] === 'blacksmith', { plot, door: plot && WHEEL_BUILDING_DOORS[plot] });
  const R = +((TA.match(/ANVIL_R = (\d+)/) || [])[1]), lo = +((TA.match(/ANVIL_MIN_MS = (\d+)/) || [])[1]), hi = +((TA.match(/ANVIL_MAX_MS = (\d+)/) || [])[1]), k = +((TA.match(/ANVIL_K = ([\d.]+)/) || [])[1]);
  check('9j ...now and then (3 s or more apart), near it only, softly: a sound of the town under everything',
    R > 0 && R <= 1150 && lo >= 3000 && hi > lo && k > 0 && k <= 0.8, { R, lo, hi, k });
  check('9k ...by distance (cueAt), only in the Wheel, `?noforge` for the town as it was, ticked by the game loop',
    /cueAt\(S, 'anvil', forge\.x, forge\.y, ANVIL_K\)/.test(TA) && /isWheelTrialZone\(S\.currentZone\)/.test(TA) && /noforge/.test(TA)
    && /import \{ tickTownAmbience \} from '@\/game\/townAmbience\.js'/.test(BT) && /tickTownAmbience\(S, /.test(BT));
}

/* ── 10. v2.3.3434: the third look ("Good look for more") ── */
{
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '');   /* the code, not what its comments say */
  const { EMOTE_MOVES } = await import('../../src/game/emoteMoves.js');
  const ids = Object.keys(EMOTE_MOVES).sort(), keyed = Object.keys(MOVE_SOUNDS || {}).sort();
  check(`10a every move (${ids.length}) is heard as something chosen: MOVE_SOUNDS names exactly the moves of emoteMoves.js`, ids.length >= 12 && ids.join() === keyed.join(), { missing: ids.filter((k) => !keyed.includes(k)), extra: keyed.filter((k) => !ids.includes(k)) });
  const badCue = keyed.filter((k) => !Array.isArray(MOVE_SOUNDS[k]) || !MOVE_SOUNDS[k].length || !MOVE_SOUNDS[k].every((n) => has(EVENT_SOUNDS, n)));
  check('10b ...each move one cue or more, every one in the table', badCue.length === 0, badCue);
  check('10c a move with an emoji pops it (the pop, or the cheer\'s own pops); Sit, with none, its bump',
    ids.every((k) => !EMOTE_MOVES[k].pop || MOVE_SOUNDS[k].includes('emotePop') || MOVE_SOUNDS[k].includes('cheerPop') || MOVE_SOUNDS[k].includes('flop'))
    && MOVE_SOUNDS.sit.includes('sitDown'));
  const IN = strip(src('src/game/interactions.js'));
  check('10d your emote and your move are heard (moveSounds), not BT_AUDIO.emote() (two beep()s, silent)',
    /ownEmoteSound\(\)/.test(IN) && /ownMoveSound\(id\)/.test(IN) && !/BT_AUDIO\.emote\(/.test(IN));
  const CH = strip(src('src/game/chat.js'));
  const he = CH.slice(CH.indexOf('function handleEmote'), CH.indexOf('function handleDiceEvent'));
  check('10e another player\'s emote or move is heard at the peer share (peerMoveSound), not the two silent beep()s',
    he.length > 100 && /peerMoveSound\(S, /.test(he) && !/BT_AUDIO\.beep\(/.test(he));
  const MS = src('src/game/moveSounds.js');
  const known = +((MS.match(/PEER_KNOWN_MS = (\d+)/) || [])[1]), npcK = +((MS.match(/NPC_K = ([\d.]+)/) || [])[1]);
  check('10f a player already sitting or dancing when they come near is not heard sitting down; a townsperson\'s copy softer than yours',
    known >= 500 && npcK > 0 && npcK < 1 && /_mvKnownAt/.test(MS), { known, npcK });
  const BT = src('src/ui/BroTown.jsx');
  check('10g the game loop hears poses begin and the townsfolk\'s copies (tickMoveSounds)', /import \{[^}]*\btickMoveSounds\b[^}]*\} from '@\/game\/moveSounds\.js'/.test(BT) && /tickMoveSounds\(S, /.test(BT));
  check('10h your move\'s own sound wins the tap over the menu click (the picker\'s tiles are buttons)', /BT_AUDIO\._uiSpecificAt = BT_AUDIO\._now\(\)/.test(MS));
  const LS = strip(src('src/game/lifeSkillRewards.js'));
  const fly = LS.slice(LS.indexOf('function _flyResourceToInventory'), LS.indexOf('function startExtraction'));
  check('10i a harvest\'s prize is heard landing in the bag (bagIn), at the end of its flight', /setTimeout\(function \(\) \{ cue\('bagIn'\); \}, \d+\)/.test(fly));
  /* a tap on the world reaches no <button>, so the menus it opens took no click */
  const chatOpen = BT.slice(BT.indexOf('var openSelfChat = function'), BT.indexOf('var openSelfChat = function') + 1400);
  const mark = BT.slice(BT.indexOf('var _mark = function (r)'), BT.indexOf('var _mark = function (r)') + 1200);
  const inspects = (BT.match(/BT_AUDIO\.uiClickNow\(\); \} catch \(_ce\) \{ \/\* sound only \*\/ \}\s+\/\* v2\.3\.\d+[^\n]*\n\s*setInspectPlayer\(\{/g) || []).length;
  /* a player's card opens two ways from a tap (a partymate; anyone else not
     in a duel with you) -- since v2.3.3399 a tap on your duel opponent aims
     and opens no card (#956) */
  check('10j the menus a tap on the world opens click as every menu does: your bro\'s chat box, a townsperson\'s window, a player\'s card (2 ways)',
    /chatBubbleBus\.setOpen\(true\)[\s\S]*BT_AUDIO\.uiClickNow\(\)/.test(chatOpen)
    && /r === 'quest' \|\| r === 'flip' \|\| r === 'shop' \|\| r === 'pets'\) \{ try \{ BT_AUDIO\.uiClickNow\(\)/.test(mark)
    && inspects === 2, { inspects });
}

/* ── 11. v2.3.3462: the owner's recordings ("I have the rest of the sounds") ── */
{
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '');   /* the code, not what its comments say */
  const { OWNER_SOUNDS, OWNER_LOOPS, LOOP_REFS } = await import('../../src/data/ownerSoundClips.js');
  /* an mp3's sample rate, from its first frame */
  const rateOf = (url) => {
    const b = readFileSync(new URL('public' + url.split('?')[0], root));
    let i = 0;
    if (b.toString('ascii', 0, 3) === 'ID3') i = 10 + ((b[6] & 0x7f) << 21 | (b[7] & 0x7f) << 14 | (b[8] & 0x7f) << 7 | (b[9] & 0x7f));
    for (; i + 4 <= b.length; i++) { const h = frameAt(b, i, null, null); if (h && frameAt(b, i + h.len, h.v, h.rate)) return h.rate; }
    return 0;
  };
  const shots = Object.keys(OWNER_SOUNDS);
  const offManifest = shots.filter((k) => MANIFEST[k] !== OWNER_SOUNDS[k].url);
  check(`11a every one-shot the cutter made (${shots.length}) is in SFX_MANIFEST at its own address`, shots.length >= 16 && offManifest.length === 0, offManifest);
  const wrongRate = shots.filter((k) => rateOf(OWNER_SOUNDS[k].url) !== (OWNER_SOUNDS[k].low ? 24000 : 48000));
  check('11b ...each file at the rate it is decoded at: the voice and noise ones 24 kHz (LOW_RATE_SFX), the UI\'s 48 kHz', wrongRate.length === 0, wrongRate.map((k) => [k, rateOf(OWNER_SOUNDS[k].url)]));
  const lowFn = GD.slice(GD.indexOf('BT_AUDIO.LOW_RATE_SFX'), GD.indexOf('BT_AUDIO._lowRate = function'));
  check('11c LOW_RATE_SFX is made from the cutter\'s own table, and `zoneamb-`/`amb-` loops decode low too',
    /OWNER_SOUNDS\[k\]\.low/.test(lowFn) && /\^\(zoneamb\|amb\)-/.test(GD));
  const loops = Object.keys(OWNER_LOOPS);
  const inManifest = loops.filter((k) => Object.values(MANIFEST).some((u) => u.split('?')[0] === OWNER_LOOPS[k].url));
  check(`11d no loop (${loops.length}) is in SFX_MANIFEST (each loads where it plays), every file on disk`,
    loops.length >= 6 && inManifest.length === 0 && loops.every((k) => existsSync(new URL('public' + OWNER_LOOPS[k].url, root))), inManifest);
  check('11e every loop but the dance is 24 kHz mono (decoded at 24 kHz: half the memory)',
    loops.filter((k) => k !== 'dance').every((k) => rateOf(OWNER_LOOPS[k].url) === 24000), loops.map((k) => [k, rateOf(OWNER_LOOPS[k].url)]));
  check('11f the levels the loops were set against are the river\'s and the wind\'s own', Number.isFinite(LOOP_REFS.river) && Number.isFinite(LOOP_REFS.wind));

  /* one decode a file */
  const ls = GD.slice(GD.indexOf('BT_AUDIO.loadSample = function'), GD.indexOf('BT_AUDIO.loadSfxManifest = function'));
  check('11g loadSample decodes a file once whatever keys name it (fish-on-hook twice, lure-drop twice), and the low ones on their own context',
    /_sampleTag\[k\] === tag && this\._samples\[k\]/.test(ls) && /_tagLoads\[tag\]/.test(ls) && /self\._decodeLow\(buf, resolve, reject\)/.test(ls) && /OfflineAudioContext/.test(ls));
  const dm = GD.slice(GD.indexOf('decodedMB: function decodedMB()'), GD.indexOf('_touchZoneMusic: function'));
  check('11h ...and decodedMB counts a shared buffer once', /seen\.has\(s\)/.test(dm));

  /* the land's air */
  const za = GD.slice(GD.indexOf('ZONE_AMBIENT: {'), GD.indexOf('},', GD.indexOf('ZONE_AMBIENT: {')));
  check('11i the Verdant Wilds\' birdsong and the Flame Fields\' lava are their lands\' air (ZONE_AMBIENT, keyed as the land music is)',
    /verdant: OWNER_LOOPS\.forest\.url/.test(za) && /ember: OWNER_LOOPS\.lava\.url/.test(za));
  check('11j a land\'s air loops without its file\'s silent edges', /if \(\/\^zoneamb-\/\.test\(key\)\) this\._loopOverEdges\(src, buf\)/.test(GD));
  const lo = GD.slice(GD.indexOf('BT_AUDIO._loopOverEdges = function'), GD.indexOf('BT_AUDIO.stopSfxLoop = function'));
  check('11j2 ...finding them by copying the edges out (copyFromChannel), never the whole buffer handed over as raw memory unless that is all a browser has',
    /buf\.copyFromChannel\(head, 0, 0\)/.test(lo) && /buf\.copyFromChannel\(tail, 0, n - cap\)/.test(lo)
      && lo.indexOf('getChannelData') > lo.indexOf("typeof buf.copyFromChannel === 'function'"));

  /* the beds: the sea, the crowd, a fire */
  const AB = src('src/game/ambientBeds.js'), ABc = strip(AB);
  check('11k the sea, BroTown\'s crowd and a fire are beds of their own on the music bus, never startSfxLoop',
    /_out\('music'\)/.test(ABc) && !/startSfxLoop|stopSfxLoop/.test(ABc) && /'sea-surf'/.test(AB) && /'town-crowd'/.test(AB) && /'fire-crackle'/.test(AB));
  check('11l ...loaded only where they play (`amb-`), stopped when quiet and let go after, at once out of the Wheel',
    /'amb-' \+/.test(ABc) && /delete BT_AUDIO\._samples\[keyOf\(id\)\]/.test(ABc) && /FREE_AFTER_MS/.test(ABc) && /currentZone === 'wheel'/.test(ABc));
  check('11m ...the sea\'s water is never a river\'s or a pond\'s (they have the river\'s loop)', /waterDistance\(px, py\) < FRESH_PX/.test(ABc));
  check('11n ...a fire is a burning building, your campfire or another player\'s', /burningNow\(\)/.test(ABc) && /S\._campfire/.test(ABc) && /S\._peerCampfires/.test(ABc));
  const BT = src('src/ui/BroTown.jsx');
  check('11o the game loop ticks the beds, the heartbeat and your dance\'s beat',
    /tickAmbientBeds\(S, _jNow\)/.test(BT) && /tickHeartbeat\(S, _jNow\)/.test(BT) && /tickDanceMusic\(S\)/.test(BT));

  /* your body */
  const MC = strip(src('src/game/monsterCombat.js'));
  check('11p the heartbeat is on a clock of its own (ownSounds), not monsterCombat\'s frame count of two silent beep()s',
    !/_heartbeatTimer/.test(MC) && !/beep\(45,/.test(MC));
  const OS = src('src/game/ownSounds.js');
  check('11q ...one beat a second under a quarter of your health, quicker under a tenth',
    /HEART_AT = 0\.25/.test(OS) && /HEART_FAST_AT = 0\.1/.test(OS) && /HEART_MS = 1000/.test(OS) && /HEART_FAST_MS = \d+/.test(OS));
  const GE = strip(src('src/networking/gameEvents.js'));
  check('11r a blow that lands on you is grunted (a monster\'s, the felling one, a player\'s), never a block or a tick',
    (GE.match(/hurtGrunt\(S, /g) || []).length === 3 && /if \(!payload\.blocked && !tickKind\(payload\)\) hurtGrunt\(S, payload\.dmgTaken\)/.test(GE));

  /* eating and drinking */
  const BTc = strip(BT);
  const eat = BTc.slice(BTc.indexOf('return eatBus.subscribe('), BTc.indexOf('return eatBus.subscribe(') + 5000);
  check('11s eating is heard (munch, a meal and a heal), "HP full" and a held bite refused (denied); no silent beep() left in it',
    (eat.match(/cue\('munch'\)/g) || []).length === 2 && (eat.match(/cue\('denied'\)/g) || []).length === 2 && !/BT_AUDIO\.beep\(/.test(eat));
  const IDP = strip(src('src/ui/mobile/dash/ItemDetailPopup.jsx'));
  const drink = IDP.slice(IDP.indexOf('const onDrink = () =>'), IDP.indexOf('const onOpenChest'));
  check('11t drinking is heard (gulp), a held drink refused', /cue\('gulp'\)/.test(drink) && /cue\('denied'\)/.test(drink));
  check('11u the Cookhouse\'s Eat and the old bag\'s munch too',
    /cue\('munch'\)/.test(strip(src('src/ui/panels/buildings/CookPanel.jsx'))) && /cue\('munch'\)/.test(strip(src('src/ui/panels/InventoryPanel.jsx'))));

  /* the chat */
  const CH = strip(src('src/game/chat.js'));
  check('11v every chat line coming in pops (4 lanes) and yours going out softer (4); no silent chatReceive/chatSend left',
    (CH.match(/cue\('chatPop'\)/g) || []).length === 4 && (CH.match(/cue\('chatSent'\)/g) || []).length === 4 && !/chatReceive\(|chatSend\(/.test(CH));

  /* the chime */
  const caseOf = (text, name) => {
    const a = text.indexOf("case '" + name + "':");
    if (a < 0) return '';
    const b = text.indexOf("\n          case '", a + 10);
    return text.slice(a, b < 0 ? a + 4000 : b);
  };
  const chimes = ['inbox_delivered', 'friend_dm', 'party_invited', 'clan_invite', 'jackpot_result', 'server_announce'];
  const noChime = chimes.filter((n) => !/cue\('notify'\)/.test(caseOf(GE, n)));
  check('11w mail, a friend\'s message or request, a party or clan invite, an announcement, someone else\'s jackpot: the chime',
    noChime.length === 0 && /case 'friend_accepted':\s*cue\('notify'\)/.test(GE), noChime);

  /* the refusals */
  const denied = [
    ['src/game/combatHelpers.js', 4], ['src/game/playerActions.js', 1], ['src/game/abilities.js', 3],
    ['src/game/farmFeedback.js', 1], ['src/ui/panels/SprintButton.jsx', 1], ['src/game/groundLoot.js', 1],
    ['src/game/wheelHome.js', 1], ['src/game/zoneTransitions.js', 3], ['src/networking/wsClient.js', 1],
    ['src/ui/panels/buildings/PartyPanel.jsx', 2], ['src/ui/panels/buildings/ExchangePanel.jsx', 1], ['src/ui/panels/DungeonCreatorPanel.jsx', 1],
  ];
  const short = denied.filter(([f, n]) => (strip(src(f)).match(/cue\('denied'(, [\d.]+)?\)/g) || []).length < n).map(([f, n]) => [f, n, (strip(src(f)).match(/cue\('denied'/g) || []).length]);
  const geDenied = ['arena_stake_error', 'guild_quest_error', 'gear_locked', 'trade_reject'].filter((n) => !/cue\('denied'\)/.test(caseOf(GE, n)));
  check('11x every refusal says "no" out loud: swimming, dazed, staggered, offline, no mana, no energy, no shield, not in combat, the farm, sprint, a pile not yours, the Mayor\'s gates, a held bite, not enough gold, the worker\'s stake, turn-in, gear-lock and trade refusals',
    short.length === 0 && geDenied.length === 0, { short, geDenied });

  /* the moves, the townsfolk */
  check('11y the Laugh laughs and Sleep snores', MOVE_SOUNDS.laugh.includes('laugh') && MOVE_SOUNDS.sleep.includes('snore'));
  const MS = strip(src('src/game/moveSounds.js'));
  check('11z ...and one asleep snores on (you, a player near you, a townsperson copying you)',
    /SNORE_EVERY_MS = \d+/.test(src('src/game/moveSounds.js')) && /cue\('snore'\)/.test(MS) && /cuePeer\(S, 'snore'/.test(MS) && /cueAt\(S, 'snore'/.test(MS));
  const NV = src('src/game/npcVoices.js');
  /* v2.3.3664: a talk opened and a quest taken -- the quest panel's subject is
     the quest and its status, so taking it is a new subject -- and a keeper
     opening his building; NOT a line popping up over him (the owner: "should
     play when you begin talking to someone or taking a quest") */
  check('11za each townsperson answers in his own hum: a talk opened (the quest panel, a tap, E, a keeper\'s building), a quest taken; never as his line pops up -- npcChat()\'s silent beep() gone',
    /npcSpeaks\(stateRef\.current, questPanel\.npc\)/.test(src('src/ui/panels/QuestPanel.jsx'))
    && /var _subject = questPanel\.quest\.id \+ ':' \+ questPanel\.status;/.test(src('src/ui/panels/QuestPanel.jsx'))
    && (strip(src('src/game/desktopControls.js')).match(/npcSpeaks\(S, npc\)/g) || []).length === 5
    && /npcSpeaks\(S, _pn\)/.test(BTc) && /r === 'opens'/.test(BTc) && !/npcChatter/.test(BTc) && !/BT_AUDIO\.npcChat\(/.test(BTc)
    && !/npcChatter|CHATTER_/.test(strip(NV)));
  /* v2.3.3664: Lil Bro's own "hmm", the owner's recording -- not a hum */
  check('11za2 Lil Bro speaks in his own "hmm" (the cue lilBroHmm), not a townsperson\'s hum pitched up',
    /export const LIL_BRO = 'Lil Bro';/.test(NV) && /if \(name === LIL_BRO\) return cue\('lilBroHmm', k\);/.test(NV)
      && !/^\s*'Lil Bro':/m.test(NV) && has(EVENT_SOUNDS, 'lilBroHmm') && EVENT_SOUNDS.lilBroHmm[0][0] === 'lil-bro-hmm');

  /* the dance */
  const dance = GD.slice(GD.indexOf('BT_AUDIO.setDanceMusic = function'), GD.indexOf('BT_AUDIO._deckEnsure = function') > GD.indexOf('BT_AUDIO.setDanceMusic = function') ? GD.indexOf('BT_AUDIO._deckEnsure = function') : GD.indexOf('BT_AUDIO.setDanceMusic = function') + 900);
  check('11zb your dance takes the music deck (streamed), never decoded: none where the deck cannot run',
    /if \(this\._danceWant\) return this\._danceWant;/.test(GD) && /this\._streamMusic\(\)/.test(dance) && !/loadSample|decodeAudioData/.test(dance)
    && /this\._danceWant = null;\s+\/\* v2\.3\.\d+: never decoded/.test(GD));
  check('11zc ...on the dances\' own beat (120 a minute: DANCE_BEAT_MS 500)', OWNER_LOOPS.dance.beatMs === +((src('src/game/emoteMoves.js').match(/DANCE_BEAT_MS = (\d+)/) || [])[1]));

  /* the sources */
  const CUT = src('tools/audio/cut_owner_sounds.py');
  const srcs = [...new Set([...CUT.matchAll(/'((?:player|ui|emote|world|npc|voice)\/[^']+\.mp3)'/g)].map((m) => m[1]))];
  /* v2.3.3523: the sprint's grunt is the owner's angry grunt now (the effort;
     tools/audio/cut_sprint_voice.py, assets/sfx-source/player/), and their
     "Grunt 1" (voice/, it sounds hit) is cut here as the second hurt sound */
  check(`11zd the owner's recordings (${srcs.length} cut here -- the 21 less the sprint's grunt, and the splash and chime sent after -- and the sprint's grunt) are kept in assets/sfx-source/, none left at the top of the project`,
    srcs.length === 22 && srcs.every((f) => existsSync(new URL('assets/sfx-source/' + f, root)))
    && srcs.includes('voice/freesound_community-grunt-1-85280.mp3') && !srcs.includes('player/freesound_community-angry-grunt-103204.mp3')
    && existsSync(new URL('assets/sfx-source/player/freesound_community-angry-grunt-103204.mp3', root))
    && /angry-grunt-103204\.mp3/.test(src('tools/audio/cut_sprint_voice.py'))
    && readdirSync(new URL('./', root)).filter((f) => /\.mp3$/i.test(f)).length === 0, srcs.filter((f) => !existsSync(new URL('assets/sfx-source/' + f, root))));

  /* the two sent after: the swim's splash and the points' chime */
  const SP = OWNER_SOUNDS['swim-splash'];
  const spIn = SP && SP.parts[SP.names.indexOf('in')], spOut = SP && SP.parts[SP.names.indexOf('out')];
  check('11ze the swim\'s splash is the owner\'s ("gets in and out of the water"): one file at 24 kHz, IN the whole splash, OUT its slosh after it, each part at its own level (half a hit, a quarter)',
    !!SP && SP.low && MANIFEST['swim-splash'] === SP.url && !!spIn && !!spOut && spIn[0] === 0 && spOut[0] > spIn[1]
      && SP.levels[SP.names.indexOf('in')] === 0.5 && SP.levels[SP.names.indexOf('out')] === 0.25 && spIn[2] > 0 && spOut[2] > 0, SP);
  const swimTab = GD.slice(GD.indexOf('BT_AUDIO.SWIM_SAMPLES ='), GD.indexOf('BT_AUDIO._noteHero = function'));
  check('11zf ...BT_AUDIO.SWIM_SPLASH is made from its parts, swimSplash plays them at 1, and SWIM_SAMPLES asks for the file with the strokes\'',
    /OWNER_SOUNDS\['swim-splash'\]/.test(swimTab) && /S\.names\.indexOf\(name\)/.test(swimTab) && /in: part\('in'\), out: part\('out'\)/.test(swimTab)
      && /var vol = 1;/.test(swimTab) && /SWIM_SAMPLES = \[[^\]]*'swim-splash'/.test(swimTab) && !/'catch-splash', 0, 0\.45/.test(swimTab));
  check('11zg ...and another player\'s splash at their share of 1 (swimFx.js peerOwn), not the old step-volume multiple',
    /peerOwn\(_S, on \? 'peerSwimIn' : 'peerSwimOut', BT_AUDIO\.SWIM_SPLASH\[on \? 'in' : 'out'\], 1, fx, fy\)/.test(src('src/rendering/swimFx.js')));
  const PS = OWNER_SOUNDS['points-spent'];
  check('11zh points spent chime the owner\'s level-up ("after applying skill stat points"): in the manifest at 24 kHz, the cue at its level, one a batch',
    !!PS && PS.low && MANIFEST['points-spent'] === PS.url && PS.level === 0.8 && has(EVENT_SOUNDS, 'pointsSpent')
      && EVENT_SOUNDS.pointsSpent[0][0] === 'points-spent' && Math.abs(EVENT_SOUNDS.pointsSpent[0][3] - PS.vol) < 1e-9 && CUE_GAP_MS.pointsSpent >= 500);
  const WSC = src('src/networking/wsClient.js');
  check('11zi ...played on the worker\'s word: its confirmation of a spend (prog3_allocated, and the old stat_allocated), never the press',
    /cue\('pointsSpent'\)/.test(caseOf(WSC, 'prog3_allocated')) && /cue\('pointsSpent'\)/.test(caseOf(WSC, 'stat_allocated'))
      && !/pointsSpent/.test(src('src/ui/mobile/sheet/HeroExpanded.jsx')));
}

/* ── 12. v2.3.3523: the sound studio, every sound labelled ── */
{
  const ST = await import('../../src/data/soundStudio.js');
  const { MONSTER_NOISE_CLIPS } = await import('../../src/data/monsterNoiseClips.js');
  const { FOOTSTEP_CLIPS } = await import('../../src/data/footstepClips.js');
  const SECTIONS = new Set(ST.STUDIO_SECTIONS.map((x) => x[0]));
  const label = (v) => typeof v === 'string' && v.trim().length >= 4;
  /* a BT_AUDIO table's top-level keys, read off gameDisplay.js's text */
  const tableKeys = (name) => {
    const a = GD.indexOf('BT_AUDIO.' + name + ' = {');
    if (a < 0) return null;
    const out = [];
    for (const ln of GD.slice(a).split('\n').slice(1)) {
      if (/^\};/.test(ln)) break;
      const m = /^ {2}(['"]?)([A-Za-z0-9_-]+)\1:/.exec(ln);
      if (m) out.push(m[2]);
    }
    return out;
  };
  const badCues = NAMES.filter((n) => !(has(ST.CUE_PLACES, n) && SECTIONS.has(ST.CUE_PLACES[n][0]) && label(ST.CUE_PLACES[n][1])));
  const staleCues = Object.keys(ST.CUE_PLACES).filter((n) => !has(EVENT_SOUNDS, n));
  check(`12a every cue (${NAMES.length}) says where it plays, in one of the studio's sections`, badCues.length === 0, badCues);
  check('12b ...and the studio names no cue that is gone', staleCues.length === 0, staleCues);
  const pairs = [
    ['HIT_VOICES', ST.HIT_VOICE_PLACES], ['PROP_SOUNDS', ST.PROP_PLACES], ['SHOT_SOUNDS', ST.SHOT_PLACES], ['ELEM_SOUNDS', ST.ELEM_PLACES],
  ];
  for (const [t, places] of pairs) {
    const keys = tableKeys(t) || [];
    const missing = keys.filter((k) => !(has(places, k) && label(places[k])));
    const stale = Object.keys(places).filter((k) => !keys.includes(k));
    check(`12c BT_AUDIO.${t}: every key (${keys.length}) labelled, none gone`, keys.length >= 3 && missing.length === 0 && stale.length === 0, { missing, stale });
  }
  const noiseMiss = Object.keys(MONSTER_NOISE_CLIPS).filter((k) => !label(ST.NOISE_PLACES[k]));
  const noiseStale = Object.keys(ST.NOISE_PLACES).filter((k) => !has(MONSTER_NOISE_CLIPS, k));
  check('12d every monster noise labelled, none gone', noiseMiss.length === 0 && noiseStale.length === 0, { noiseMiss, noiseStale });
  const grounds = ['dirt', ...Object.keys(FOOTSTEP_CLIPS).filter((k) => FOOTSTEP_CLIPS[k] !== FOOTSTEP_CLIPS.grass || k === 'grass')];
  const stepMiss = grounds.filter((k) => !label(ST.STEP_PLACES[k]));
  const stepStale = Object.keys(ST.STEP_PLACES).filter((k) => !grounds.includes(k));
  check('12e every ground\'s footstep labelled (dirt included), none gone', stepMiss.length === 0 && stepStale.length === 0, { stepMiss, stepStale });
  const kinds = new Set(ST.PROP_KINDS.map((x) => x[0]));
  check('12f the object sounds\' kinds are PROP_SOUNDS\' own rows (hit, big, brk, tree, building), each label with a place for the words',
    ['hit', 'big', 'brk', 'tree', 'building'].every((k) => kinds.has(k)) && ST.PROP_KINDS.every((x) => /%s/.test(x[1])));
  const ids = new Set(); const badOther = [];
  for (const [id, sec, lab, how] of ST.OTHER_PLAYS) {
    if (ids.has(id)) badOther.push(id + ' twice');
    ids.add(id);
    if (!SECTIONS.has(sec) || !label(lab)) badOther.push(id + ' section/label');
    if (how.sample && !has(MANIFEST, how.sample)) badOther.push(id + ' sample ' + how.sample);
    if (how.fn && !new RegExp('(BT_AUDIO\\.' + how.fn + ' = function|^ {2}' + how.fn + ': function)', 'm').test(GD)) badOther.push(id + ' fn ' + how.fn);
    if (!how.sample === !how.fn) badOther.push(id + ' plays neither or both');
  }
  check(`12g every other row (${ST.OTHER_PLAYS.length}) plays a recording in SFX_MANIFEST or a BT_AUDIO helper that exists`, badOther.length === 0, badOther);
  const recMiss = Object.keys(ST.SAMPLE_SOURCES).filter((k) => !has(MANIFEST, k));
  check('12h every recording the studio credits is in SFX_MANIFEST', recMiss.length === 0, recMiss);
  const GS = src('src/game/soundStudio.js');
  const tagBody = GS.slice(GS.indexOf('const TAGS = {'), GS.indexOf('let _installed'));
  const tagged = [...tagBody.matchAll(/^ {2}([A-Za-z]+): /gm)].map((m) => m[1]);
  const tagMiss = tagged.filter((fn) => !new RegExp('(BT_AUDIO\\.' + fn + ' = function|^ {2}' + fn + ': function)', 'm').test(GD));
  check(`12i the studio's "heard just now" tags only BT_AUDIO helpers that exist (${tagged.length})`, tagged.length >= 15 && tagMiss.length === 0, tagMiss);
  const EP = src('src/game/eventSounds.js');
  check('12j cue(), cueLater() and peerOwn() say what they play while their samples start (BT_AUDIO._tag, put back after)',
    (EP.match(/BT_AUDIO\._tag = 'cue:' \+ name/g) || []).length === 2 && /BT_AUDIO\._tag = 'peer:' \+ label/.test(EP)
      && (EP.match(/finally \{ BT_AUDIO\._tag = prev; \}/g) || []).length === 3);
  check('12k the studio is loaded only when it opens (a dynamic import), and the game imports its small part at boot',
    /import\('@\/ui\/panels\/SoundStudio\.jsx'\)/.test(GS) && /import '@\/game\/soundStudio\.js';/.test(src('src/ui/BroTown.jsx'))
      && !/from '@\/ui\/panels\/SoundStudio\.jsx'/.test(src('src/ui/BroTown.jsx')));
}

/* ── 13. v2.3.3610: the music, and where each track plays ──
   The owner: "A huge part of the game is emotional resonance from music.  I
   don't know what music plays for the town vs the other zones (etc)" -- then
   their own ten tracks (assets/music-source/2026-10-26/). */
{
  const ST = await import('../../src/data/soundStudio.js');
  /* ZONE_MUSIC's entries, read off gameDisplay.js's text */
  const zm = GD.slice(GD.indexOf('  ZONE_MUSIC: {'), GD.indexOf('\n  },', GD.indexOf('  ZONE_MUSIC: {')));
  const ZM = Object.create(null);
  /* v2.3.3672: `_` too -- the farm's key is the zone's id, `farm_home` */
  for (const m of zm.matchAll(/^ {4}([a-z_]+): '([^']+)'/gm)) ZM[m[1]] = m[2];
  const keys = ST.MUSIC_PLACES.map((m) => m[0]);
  const want = Object.keys(ZM).filter((k) => !ST.MUSIC_CLOSED.includes(k));
  check(`13a every track a player can hear has its line in the studio's music list (${want.join(', ')}), and the theme and the dances' beat`,
    want.every((k) => keys.includes(k)) && keys.includes('theme') && keys.includes('dance') && new Set(keys).size === keys.length,
    { want, keys });
  const bad = ST.MUSIC_PLACES.filter(([k, where, title]) => !(typeof where === 'string' && where.length >= 8 && typeof title === 'string' && title.length >= 4)
    || !(k === 'theme' || k === 'dance' || has(ZM, k)));
  check('13b ...each with where it plays and the track\'s own name, and each a ZONE_MUSIC key, the theme or the dance', bad.length === 0, bad);
  const files = Object.entries(ZM).map(([k, u]) => [k, u.split('?')[0]]);
  const missing = files.filter(([, f]) => !existsSync(new URL('public' + f, root)));
  check(`13c every ZONE_MUSIC file is in public/audio/music/ (${files.length})`, missing.length === 0, missing);
  /* the owner's score, place by place */
  const PLACE = { town: 'village', frost: 'frost', ember: 'fire', sky: 'desert', verdant: 'forest', hollows: 'rock', tidal: 'water', mist: 'murky', dungeon: 'skirmish', minigame: 'minigame' };
  const off = Object.entries(PLACE).filter(([k, f]) => ZM[k] !== '/audio/music/' + f + '.mp3?v=2.3.3610');
  check('13d the owner\'s ten tracks play where they were made for, each at a new address (?v=2.3.3610)', off.length === 0, off);
  check('13e the Electric Foundry has no track of its own yet (the theme plays there)', !has(ZM, 'thunder'));
  const masters = ['Town Square Loop', 'Frozen Cave Loop', 'Fire level', 'Wind level', 'Forest Loop', 'Rock level', 'Water lvl', 'Murky Loop', 'Swift Skirmish Clash', 'Minigame']
    .filter((n) => !existsSync(new URL('assets/music-source/2026-10-26/' + n + '.mp3', root)));
  const top = readdirSync(root).filter((f) => /\.mp3$/i.test(f));
  check('13f the owner\'s ten masters are kept in assets/music-source/2026-10-26/, none left at the top of the repo', masters.length === 0 && top.length === 0, { masters, top });
  /* v2.3.3672: the owner's farm track, "for that later" (the farm's sounds came
     first, #1151) -- made with Suno and uploaded the same day */
  check('13f2 the farm plays the owner\'s "Homestead Morning" (farm.mp3 at ?v=2.3.3672, the zone\'s own id), its master kept in assets/music-source/2026-10-27/ and its line in the studio',
    ZM.farm_home === '/audio/music/farm.mp3?v=2.3.3672' && existsSync(new URL('assets/music-source/2026-10-27/Homestead Morning.mp3', root))
      && ST.MUSIC_PLACES.some(([k, , t]) => k === 'farm_home' && t === 'Homestead Morning')
      && !/your farm/i.test((ST.MUSIC_PLACES.find(([k]) => k === 'theme') || [])[1] || ''), { farm: ZM.farm_home });
  /* ...and asked for: every way onto the farm sets its map straight in, so the
     zone change's music call never runs there (the farm kept BroTown's track);
     holdFarmUntilReady is the one call they all make */
  const FT = src('src/game/farmTrip.js');
  const hold = FT.slice(FT.indexOf('export function holdFarmUntilReady(S)'), FT.indexOf('const seq = ++_seq;', FT.indexOf('export function holdFarmUntilReady(S)')));
  check('13f3 ...asked for by every way onto the farm (farmTrip.js holdFarmUntilReady, before its loading screen holds you)',
    /if \(S\.currentZone === 'farm_home'\) \{\s*try \{ BT_AUDIO\.startZoneAmbient\('farm_home'\); \}/.test(hold)
      && /import \{ BT_AUDIO \} from '@\/data\/index\.js';/.test(FT));
  const sa = GD.slice(GD.indexOf('"startZoneAmbient", function startZoneAmbient(zoneId)'));
  check('13g every dungeon is filed under `dungeon` where every zone\'s music is asked for',
    /if \(typeof zoneId === 'string' && zoneId\.indexOf\('dungeon:'\) === 0\) zoneId = 'dungeon';/.test(sa.slice(0, 3000)));
  /* the arena's map is set straight in, so the zone change's own music call
     never runs: entering one asks for it itself (mp-googrotto found the land's
     music playing on inside) */
  const GE = src('src/networking/gameEvents.js');
  const ds = GE.slice(GE.indexOf("case 'dungeon_started':"), GE.indexOf("case 'dungeon_started':") + 9000);
  check('13g2 ...and entering a dungeon asks for it (gameEvents.js dungeon_started), after the zone is the dungeon\'s',
    /S\.currentZone = payload\.zone;[\s\S]{0,800}BT_AUDIO\.startZoneAmbient\(payload\.zone\)/.test(ds));
  const WM = await import('../../src/game/wheelMusic.js');
  check('13h Lil Bro\'s race asks for the race music while it counts down and runs, and no longer once it is done',
    WM.RACE_MUSIC === 'minigame' && WM.raceMusicOn({ _race: { phase: 'count' } }) && WM.raceMusicOn({ _race: { phase: 'run' } })
      && !WM.raceMusicOn({ _race: { phase: 'asked' } }) && !WM.raceMusicOn({ _race: { phase: 'done' } }) && !WM.raceMusicOn({}) && !WM.raceMusicOn(null));
  const SS = src('src/ui/panels/SoundStudio.jsx');
  check('13i the studio\'s Music tab plays a track from its file with the game\'s music bus turned down, and puts it back',
    /data-studio-tab="music"/.test(SS) && /new Audio\(url\)/.test(SS) && /A\._musicBus\.gain\.setTargetAtTime\(on \|\| A\.muted \? 0 : A\.musicLevel/.test(SS)
      && /A\._musicPreview = on \? true : null;/.test(SS) && /if \(A\._musicPreview\) return null;/.test(src('src/game/wheelMusic.js')));
}

/* ── 14. v2.3.3664: the owner's recordings of 2026-10-27 ──
   "You can add more sound effects for farming ... "flat-hoe" for
   blacksmithing ... the other hoe sound is for when you till the dirt ...
   a clay sound for molding the ground (apply fertilizer) ... wood carving
   (making bows, staffs, etc) and doors opening ("entering" town buildings)
   ... Light fire (when lighting a fire), coins (during pickup), and the last
   sound is when any object gets picked up and placed in your bag" -- and Lil
   Bro's "hmm". */
{
  const { OWNER_SOUNDS } = await import('../../src/data/ownerSoundClips.js');
  const FW = await import('../../src/game/farmWork.js');
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '');
  const NEW = {
    coins: '336571__anthousai__coins-05.wav', 'bag-close': '467605__triqystudio__closebag.wav',
    'lil-bro-hmm': '482422__roses1401__hmm.mp3', 'fire-light': '507724__wdomino__light-fire-sound.wav',
    'door-open': '740271__mavom22__wavesaudiodooropensfx.wav', 'wood-carve': '796658__frostnox__wood-carve-5.ogg',
    'farm-harvest': '872487__heyheytheree__harvest-cozy-game-sfx-free.wav', 'farm-water': '516257__wyronroberth__grab-_-can-watering.mp3',
    'farm-hoe': '497987__16hpanskadvorakova_aneta__hoe-work.wav', 'farm-mould': '490099__manuelaurreaf__molding.wav',
    'forge-strike': '636098__theboulder3400__flat-hoe.mp3',
  };
  const CUT = src('tools/audio/cut_owner_sounds.py');
  const gone = Object.entries(NEW).filter(([k, f]) => !has(OWNER_SOUNDS, k) || !existsSync(new URL('assets/sfx-source/2026-10-27/' + f, root)) || !CUT.includes(f));
  check('14a the eleven recordings are cut by the owner\'s cutter from their sources as supplied (assets/sfx-source/2026-10-27/), each in its table',
    gone.length === 0, gone);
  const parts = ['farm-hoe', 'farm-mould', 'forge-strike'].filter((k) => !(has(OWNER_SOUNDS, k) && Array.isArray(OWNER_SOUNDS[k].parts) && OWNER_SOUNDS[k].parts.length >= 2
    && OWNER_SOUNDS[k].parts.every((p) => p.length === 3 && p[2] > 0 && p[2] <= 0.66)));
  check('14b the hoe\'s strikes, the clay\'s squeezes and the hammer\'s blows are files of parts, each part at a volume of its own', parts.length === 0, parts);
  check('14c the coins and the hoe keep their sparkle (48 kHz: most of the coins is above 6 kHz), the rest are decoded at 24 kHz',
    OWNER_SOUNDS.coins.low === false && OWNER_SOUNDS['farm-hoe'].low === false
      && Object.keys(NEW).filter((k) => k !== 'coins' && k !== 'farm-hoe').every((k) => OWNER_SOUNDS[k].low === true));
  const L0 = (n) => (EVENT_SOUNDS[n] || []).map((L) => L[0]);
  check('14d a town building\'s door is the owner\'s door opening; a dungeon\'s mouth (a cave) keeps the knock',
    L0('door').join() === 'door-open' && L0('caveMouth').join() === 'wood-chop'
      && /BT_AUDIO\.enterBuilding\('mouth'\)/.test(src('src/game/wheelDungeons.js'))
      && /kind === 'mouth' \? EVENT_SOUNDS\.caveMouth : EVENT_SOUNDS\.door/.test(GD));
  check('14e a campfire catching is the owner\'s fire lit (the flint strikes still start it)', L0('campfire').join() === 'fire-light' && L0('fireStrike').every((k) => k === 'mine-strike'));
  check('14f blacksmithing is the owner\'s hammer on the flat hoe: a bar smelted, a blade or armour forged, the forge at work in town',
    ['smelt', 'forge', 'armourForge', 'anvil'].every((n) => L0(n).includes('forge-strike')) && !L0('anvil').includes('mine-strike') && !L0('smelt').includes('mine-strike'));
  check('14g woodworking is the owner\'s knife carving: a bow or staff made, hardened wood, traps (more than one stroke each)',
    ['woodwork', 'hardWood', 'trapsMade'].every((n) => L0(n).filter((k) => k === 'wood-carve').length >= 2) && !L0('woodwork').includes('axe-chop'));
  check('14h a crop harvested is the owner\'s harvest (with the soil giving)', L0('farmHarvest').includes('farm-harvest') && !L0('farmHarvest').includes('lure-drop'));
  const beat = (st, i) => FW.farmBeatPlay(st, i) || {};
  check('14i the farm\'s work lands to the owner\'s hoe (a dig, its strikes in turn), can (a watering) and clay (fertilizing, its squeezes in turn)',
    beat('dig', 0).key === 'farm-hoe' && beat('dig', 0).offset !== beat('dig', 1).offset && beat('dig', 3).offset === beat('dig', 0).offset
      && beat('water', 0).key === 'farm-water' && beat('feed', 0).key === 'farm-mould' && beat('feed', 0).offset !== beat('feed', 1).offset
      && FW.farmBeatPlay('nothing', 0) === null && FW.farmBeatPlay('__proto__', 0) === null
      && /farmBeatPlay\(step, i\)/.test(src('src/game/farmWalk.js')) && /farmBeatPlay\(fx\.step, ent\._farmBeat - 1, share\)/.test(src('src/rendering/systems/effectsRenderer.js')));
  const WS = strip(src('src/networking/wsClient.js'));
  check('14j coins picked up are the owner\'s coins (the worker\'s credit, never a refused pickup); the spilled coins still sound a sale',
    L0('coinsPickup').join() === 'coins' && /if \(!payload\.quiet\) cue\('coinsPickup'\);/.test(WS) && /BT_AUDIO\.play\('coin-pickup', \{ vol: 0\.45 \}\)/.test(WS));
  check('14k anything more than gold into the bag closes it (the owner\'s bag), a beat after its own note; a harvest\'s flight lands to it too',
    L0('bagIn').join() === 'bag-close' && /cueLater\('bagIn', 0\.14\)/.test(WS) && /cue\('bagIn'\)/.test(src('src/game/lifeSkillRewards.js')));
  const SS = await import('../../src/data/soundStudio.js');
  const uncredited = Object.keys(NEW).filter((k) => !has(SS.SAMPLE_SOURCES, k) || !src('CREDITS.md').includes(NEW[k].split('__')[0]));
  check('14l each recording credited in the studio and in CREDITS.md (its Freesound number), its license marked to confirm', uncredited.length === 0 && /CONFIRM/.test(src('CREDITS.md')), uncredited);
}

/* ── 15. v2.3.3686: the jump lands on the owner's "goblin fall" ──
   v2.3.3680 put it on the roll ("I'll just uploaded a sound effect to use for
   that included in the label is 'kneeling goblin'"); the owner, 2026-10-28:
   "goblin fall is just the label of the file I want to use for when the
   character's jump lands" (502553__kneeling__goblin-fall).  The roll is its
   rush of air again. */
{
  const { OWNER_SOUNDS } = await import('../../src/data/ownerSoundClips.js');
  const SS = await import('../../src/data/soundStudio.js');
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '');
  const L0 = (n) => (EVENT_SOUNDS[n] || []).map((L) => L[0]);
  const DG = strip(src('src/game/dodge.js'));
  const GE = strip(src('src/networking/gameEvents.js'));
  const CUT = src('tools/audio/cut_owner_sounds.py');
  check('15a the landing is cut by the owner\'s cutter from the recording as supplied, at 24 kHz with its overtones (its thump is under 100 Hz)',
    has(OWNER_SOUNDS, 'jump-land') && OWNER_SOUNDS['jump-land'].low === true && OWNER_SOUNDS['jump-land'].url === '/sfx/player/jump-land.mp3'
      && existsSync(new URL('assets/sfx-source/2026-10-27/502553__kneeling__goblin-fall.mp3', root))
      && existsSync(new URL('public/sfx/player/jump-land.mp3', root)) && !existsSync(new URL('public/sfx/player/roll-tumble.mp3', root))
      && /'jump-land', NEW_SRC \+ '502553__kneeling__goblin-fall\.mp3'/.test(CUT) && /'jump-land': \{'harm'/.test(CUT)
      && !/roll-tumble/.test(strip(CUT.replace(/#.*$/gm, ''))));
  check('15b your jump\'s landing plays it, and another player\'s at their share where they land',
    L0('jumpLand').join() === 'jump-land' && !has(EVENT_SOUNDS, 'rollTumble')
      && /cue\('jumpLand'\)/.test(strip(src('src/game/jumpActions.js')))
      && /cuePeer\(S, 'jumpLand', _jpB\[0\], _jpB\[1\]\)/.test(GE));
  check('15c the roll is its rush of air again: yours, a retreat shot\'s, another player\'s (a dash or lunge quicker)',
    L0('dodgeRoll').join() === 'arrow-fly' && !/rollTumble/.test(DG) && !/rollTumble/.test(GE)
      && (DG.match(/cue\('dodgeRoll'\)/g) || []).length === 2 && /cue\('dodgeRoll', 0\.9, 1\.2\)/.test(DG)
      && /cue\('dodgeRoll', 0\.9, 1\.25\)/.test(src('src/game/abilities.js'))
      && /cue\('dodgeRoll', _dgk, payload\.kind === 'dodge' \|\| payload\.kind === 'retreat_shot' \? 1 : 1\.2\)/.test(GE));
  check('15d labelled in the studio, its recording credited (and in CREDITS.md, its license to confirm)',
    /jumpLand: \['move', "Landing from a jump: your \\"goblin fall\\"/.test(src('src/data/soundStudio.js'))
      && !/rollTumble/.test(src('src/data/soundStudio.js'))
      && has(SS.SAMPLE_SOURCES, 'jump-land') && !has(SS.SAMPLE_SOURCES, 'roll-tumble')
      && /jump-land\.mp3` \| "goblin fall" by \*\*kneeling\*\*, Freesound 502553 \| \*\*CONFIRM\*\*/.test(src('CREDITS.md')));
}

/* ── 16. v2.3.3682: the double jump's flip is the owner's "sfx jump flip" ──
   "I just uploaded the second jump (flip) sound effect to GitHub"
   (563530__catthulu__sfx-jump-flip). */
{
  const { OWNER_SOUNDS } = await import('../../src/data/ownerSoundClips.js');
  const SS = await import('../../src/data/soundStudio.js');
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '');
  const L0 = (n) => (EVENT_SOUNDS[n] || []).map((L) => L[0]);
  check('16a the flip is cut by the owner\'s cutter from the recording as supplied, at 24 kHz',
    has(OWNER_SOUNDS, 'jump-flip') && OWNER_SOUNDS['jump-flip'].low === true && OWNER_SOUNDS['jump-flip'].url === '/sfx/player/jump-flip.mp3'
      && existsSync(new URL('assets/sfx-source/2026-10-27/563530__catthulu__sfx-jump-flip.wav', root))
      && /'jump-flip', NEW_SRC \+ '563530__catthulu__sfx-jump-flip\.wav'/.test(src('tools/audio/cut_owner_sounds.py')));
  check('16b your flip plays it (the second press in the air), and another player\'s flip at their share; a plain jump keeps its push-off',
    L0('jumpFlip').join() === 'jump-flip' && L0('jumpUp').join() === 'jump-hup'
      && /cue\('jumpFlip'\)/.test(strip(src('src/game/jumpActions.js')))
      && /cuePeer\(S, payload\.flip \? 'jumpFlip' : 'jumpUp'/.test(strip(src('src/networking/gameEvents.js'))));
  check('16c loaded with the game\'s sounds, labelled in the studio, its recording credited (its license to confirm)',
    /'jump-flip': '\/sfx\/player\/jump-flip\.mp3'/.test(src('src/data/gameDisplay.js'))
      && /jumpFlip: \['move'/.test(src('src/data/soundStudio.js'))
      && has(SS.SAMPLE_SOURCES, 'jump-flip') && /563530/.test(src('CREDITS.md')));
}

/* ── 17. v2.3.3708: the jump is the owner's "hup" ──
   "File with 'hup' is the jump" (613568__mrdeadh__hup, uploaded 2026-10-28):
   one short voice, the jump's push-off for you and, at their share, for
   anyone who sees you jump. */
{
  const { OWNER_SOUNDS } = await import('../../src/data/ownerSoundClips.js');
  const SS = await import('../../src/data/soundStudio.js');
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '');
  const L0 = (n) => (EVENT_SOUNDS[n] || []).map((L) => L[0]);
  const CUT = src('tools/audio/cut_owner_sounds.py');
  check('17a the hup is cut by the owner\'s cutter from the recording as supplied, at 24 kHz (a voice, nothing laid over it)',
    has(OWNER_SOUNDS, 'jump-hup') && OWNER_SOUNDS['jump-hup'].low === true && OWNER_SOUNDS['jump-hup'].url === '/sfx/player/jump-hup.mp3'
      && OWNER_SOUNDS['jump-hup'].level === 0.45 && OWNER_SOUNDS['jump-hup'].dur > 0.1 && OWNER_SOUNDS['jump-hup'].dur < 0.25
      && existsSync(new URL('assets/sfx-source/2026-10-27/613568__mrdeadh__hup.mp3', root))
      && existsSync(new URL('public/sfx/player/jump-hup.mp3', root))
      && /'jump-hup', NEW_SRC \+ '613568__mrdeadh__hup\.mp3'/.test(CUT) && !/'jump-hup': \{/.test(CUT));
  check('17b your jump plays it (the cue, at the recording\'s level), and another player\'s jump at their share',
    L0('jumpUp').join() === 'jump-hup' && EVENT_SOUNDS.jumpUp.length === 1 && EVENT_SOUNDS.jumpUp[0][3] === OWNER_SOUNDS['jump-hup'].vol
      && /cue\('jumpUp'\)/.test(strip(src('src/game/jumpActions.js')))
      && /cuePeer\(S, [^)]*'jumpUp'/.test(strip(src('src/networking/gameEvents.js'))));
  check('17c loaded with the game\'s sounds, labelled in the studio, its recording credited (and in CREDITS.md, its license to confirm)',
    /'jump-hup': '\/sfx\/player\/jump-hup\.mp3'/.test(src('src/data/gameDisplay.js'))
      && /jumpUp: \['move', 'Your jump: your "hup"/.test(src('src/data/soundStudio.js'))
      && has(SS.SAMPLE_SOURCES, 'jump-hup')
      && /jump-hup\.mp3` \| "hup" by \*\*mrdeadh\*\*, Freesound 613568 \| \*\*CONFIRM\*\*/.test(src('CREDITS.md')));
}

/* ── 18. v2.3.3714: decoded sound held only while it is needed (`?sfxcache`) ──
   With the switch on, only data/sfxCache.js PINNED is decoded on the loading
   screen; every other sound keeps its file's bytes and is decoded on its first
   play.  No sound in combat or movement may wait for a decode: every layer of
   every cue the studio files under fighting, your hits, getting hurt, moving
   or the monsters, and every layer of BT_AUDIO's HIT_VOICES, SHOT_SOUNDS,
   ELEM_SOUNDS, PROP_SOUNDS and CROWN_SOUNDS, the swings, the monsters'
   noises, the hits on you and the deaths, is pinned. */
{
  const SC = await import('../../src/data/sfxCache.js');
  const { CUE_PLACES } = await import('../../src/data/soundStudio.js');
  const { MONSTER_NOISE_CLIPS } = await import('../../src/data/monsterNoiseClips.js');
  const PIN = new Set(SC.PINNED);
  const FIGHT = new Set(['fight', 'hits', 'hurt', 'move', 'monsters']);
  const need = new Map();
  const want = (k, why) => { if (has(MANIFEST, k) && !need.has(k)) need.set(k, why); };
  for (const n of NAMES) if (CUE_PLACES[n] && FIGHT.has(CUE_PLACES[n][0])) for (const L of EVENT_SOUNDS[n]) want(L[0], 'cue ' + n);
  /* a BT_AUDIO table's block, every sample named in it */
  const tableSamples = (name) => {
    const a = GD.indexOf('BT_AUDIO.' + name + ' = ');
    if (a < 0) return null;
    const end = GD.indexOf('\n};', a);
    const blk = GD.slice(a, end < 0 ? GD.indexOf('\n', a) : end).replace(/\/\*[\s\S]*?\*\//g, '');
    return [...blk.matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]).filter((k) => has(MANIFEST, k));
  };
  const TABLES = ['HIT_VOICES', 'SHOT_SOUNDS', 'ELEM_SOUNDS', 'PROP_SOUNDS', 'CROWN_SOUNDS', 'COMBAT_CRITICAL_SFX', 'SWING_ROTATION', 'SWIM_SAMPLES'];
  const missingTable = TABLES.filter((t) => !tableSamples(t));
  for (const t of TABLES) for (const k of tableSamples(t) || []) want(k, t);
  for (const c of Object.keys(MONSTER_NOISE_CLIPS)) want('noise-' + c, 'monster noise');
  for (const k of ['monster-death', 'slime-death', 'snowman-death', 'skeleton-death', 'armor-hit-1', 'armor-hit-2', 'footstep-v2', 'footstep-v3', 'ui-click', 'ui-close', 'ui-equip']) want(k, 'the player\'s own');
  const unpinned = [...need].filter(([k]) => !PIN.has(k));
  check(`18a every combat and movement sound (${need.size}) is pinned: decoded up front, never let go`, missingTable.length === 0 && need.size >= 40 && unpinned.length === 0, { missingTable, unpinned });
  check('18b the pinned list names only sounds in SFX_MANIFEST, once each', SC.PINNED.every((k) => has(MANIFEST, k)) && PIN.size === SC.PINNED.length,
    SC.PINNED.filter((k) => !has(MANIFEST, k)));
  const pre = [...Object.values(SC.PREFETCH.zone).flat(), ...SC.PREFETCH.building, ...SC.PREFETCH.family.flat()];
  check('18c every sound decoded ahead (a zone\'s, a building\'s, a family\'s) is in SFX_MANIFEST', pre.every((k) => has(MANIFEST, k)), pre.filter((k) => !has(MANIFEST, k)));
  check('18d the cache: 8 MB or under (the aim), the cold-play aim 30 ms, a late play logged after 1.5 s', SC.BUDGET_MB > 0 && SC.BUDGET_MB <= 8 && SC.COLD_MS === 30 && SC.LATE_MS === 1500);
  /* the LRU: the least recently played let go first, never the one just in */
  const L = SC.makeLru(100);
  L.add('a', 40); L.add('b', 40); L.touch('a');
  const out = L.add('c', 40);
  const big = SC.makeLru(10).add('x', 50);
  check('18e the cache lets go of the least recently played first, and never of the one just decoded', out.join() === 'b' && L.bytes === 80 && L.has('a') && L.has('c') && big.length === 0, { out, bytes: L.bytes });
  /* the switch: off by default, `?sfxcache` on; play() decodes a cold sound and plays it when ready */
  const G = GD.replace(/\/\*[\s\S]*?\*\//g, '');
  check('18f off by default (the game as it was); `?sfxcache` turns it on; with it on the manifest decodes only the pinned, a cold play() is decoded and played when ready',
    /BT_AUDIO\.SFX_CACHE = false;/.test(G) && /\[\?&\]sfxcache\(\?:=/.test(G)
      && /if \(this\.SFX_CACHE && !this\._sfxPinned\[k\] && !pinUrl\[m\[k\]\]\) this\._sfxHold\(m\[k\]\);/.test(G)
      && /if \(url && this\.SFX_CACHE\) \{ try \{ return this\._playCold\(key, url, opts\); \}/.test(G));
}

/* ── 19. v2.3.3727: a crowd of one sound starts as a few (`?voicecap`) ──
   The owner wants many copies of the same sound starting at nearly the same
   moment grouped into one or a few.  data/voiceCap.js: at most N copies of
   one recording start within W ms; the first always plays; different
   recordings never hold each other back; the menu's ticks, the loops and the
   music never pass it; off by default. */
{
  const VC = await import('../../src/data/voiceCap.js');
  const C = VC.makeVoiceCap(VC.VOICE_N, VC.VOICE_W_MS);
  const burst = [];
  for (let i = 0; i < 10; i++) burst.push(C.allow('monster-hit', 1000 + i));
  check(`19a ten copies of one recording in one instant: ${VC.VOICE_N} start, the rest held back`,
    VC.VOICE_N >= 2 && VC.VOICE_N <= 4 && VC.VOICE_W_MS === 50 && burst.filter(Boolean).length === VC.VOICE_N && burst[0] === true, burst);
  const D = VC.makeVoiceCap(3, 50);
  const first = D.allow('sword-hit3', 0);
  const rot = ['sword-swing-1', 'sword-swing-2', 'sword-swing-3'].map((k) => D.allow(k, 1));
  check('19b the first copy always plays, and different recordings never hold each other back (the swing rotation layers)', first && rot.every(Boolean), rot);
  const E = VC.makeVoiceCap(3, 50);
  const flurry = [];
  for (let i = 0; i < 8; i++) flurry.push(E.allow('sword-hit2', i * 250));   /* a fast flurry: four swings a second */
  const later = [E.allow('monster-hit', 0), E.allow('monster-hit', 0), E.allow('monster-hit', 0), E.allow('monster-hit', 0), E.allow('monster-hit', 60)];
  check('19c a flurry of swings (one each 250 ms) is untouched, and a held recording starts again once its window has passed', flurry.every(Boolean) && later.join() === 'true,true,true,false,true', { flurry, later });
  const F = VC.makeVoiceCap(1, 50);
  check('19d the menu\'s sounds never pass it (uiTick has its own rule)', F.allow('ui-click', 0) && F.allow('ui-click', 0) && F.allow('ui-equip', 0) && F.allow('ui-equip', 0));
  check('19e `?voicecap` on at N, W; `?voicecap=4:60` other values; nothing else turns it on',
    VC.parseVoiceCap('?voicecap').n === VC.VOICE_N && VC.parseVoiceCap('?a=1&voicecap=4:60').w === 60 && VC.parseVoiceCap('?voicecap=4').n === 4
      && VC.parseVoiceCap('') === null && VC.parseVoiceCap('?voicecapx') === null && VC.parseVoiceCap('?novoicecap') === null);
  const G = GD.replace(/\/\*[\s\S]*?\*\//g, '');
  const loopFn = G.slice(G.indexOf('BT_AUDIO.startSfxLoop = function'), G.indexOf('BT_AUDIO.stopSfxLoop = function'));
  const playFn = G.slice(G.indexOf('BT_AUDIO.play = function'), G.indexOf('BT_AUDIO._startOn = function'));
  check('19f every one-shot play() start asks the gate before it starts (cold or warm), off by default; the loops do not',
    /BT_AUDIO\.VOICE_CAP = null;/.test(G) && /BT_AUDIO\.VOICE_CAP = parseVoiceCap\(location\.search/.test(G)
      && /var buf = this\._samples\[key\];\s*if \(!this\._voiceGate\(key, buf, opts\)\) return null;/.test(playFn)
      && loopFn.length > 100 && !/_voiceGate/.test(loopFn));
}

console.log(`\nsound-cues: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
