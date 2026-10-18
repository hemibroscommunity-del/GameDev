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
 *  10. v2.3.3398, the third look (the owner: "Good look for more"): every
 *      emote and move heard as something chosen (MOVE_SOUNDS holds every move
 *      of game/emoteMoves.js), yours, other players' and the townsfolk's; a
 *      harvest's prize landing in the bag; and a menu opened by tapping the
 *      world (your bro's chat box, a player's card, a townsperson's window)
 *      opening with the menu click.
 *   9. v2.3.3398, the second round (the owner: "Look for more too"): the
 *      Gambling Den's dice and pot, the arena's stakes and sign-up, a guild
 *      quest, an alliance war's end, invites to duel and trade, the market,
 *      the farm's harvest and bed, pets out, away and released (and the four
 *      kinds that answer in their own voice), and the forge's anvil.
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
const PLAYERS = ['cue', 'cueAt', 'cuePeer', 'peerShare', 'peerStepShare', 'peerOwn'];
for (const p of files) {
  if (p === PLAYER) continue;
  const text = src(p);
  const imports = [...text.matchAll(/import\s*\{([^}]*)\}\s*from\s*'[^']*\/game\/eventSounds\.js'/g)].flatMap((m) => m[1].split(',').map((s) => s.trim()));
  for (const fn of PLAYERS) {
    for (const m of text.matchAll(callRe(fn))) {
      if (/function\s+$/.test(text.slice(Math.max(0, m.index - 12), m.index))) continue;
      if (!imports.includes(fn)) unimported.push(p + ' ' + fn);
      if (fn !== 'cue' && fn !== 'cueAt' && fn !== 'cuePeer') continue;
      const args = argsAt(text, m.index + fn.length);
      const line = text.slice(0, m.index).split('\n').length;
      if (!args) { unknown.push(p + ':' + line + ' unreadable'); continue; }
      const arg = fn === 'cue' ? args[0] : args[1];
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
    /* v2.3.3398: the moves' cues, read from the table that names them */
    'src/game/moveSounds.js n': () => Object.values(MOVE_SOUNDS || {}).flat(),
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
  const strange = [];
  for (const c of indirect) {
    const key = c.p + ' ' + c.arg;
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
  const a = GD.indexOf('enterBuilding: function enterBuilding()');
  const body = GD.slice(a, GD.indexOf('chatSend: function chatSend()', a));
  check('8a a door is heard: enterBuilding plays the table\'s knock, not beep() (silent since v2.3.1103)',
    a > 0 && /EVENT_SOUNDS\.door/.test(body) && !/this\.beep\(/.test(body));
  check('8b ...and stamps it as the tap\'s own sound, so the Enter button\'s click yields', /this\._uiSpecificAt = this\._now\(\)/.test(body));
}

/* ── 9. v2.3.3398: the second round ("Look for more too") ──
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
  check('9e every way to rest in the farm\'s bed (3) is heard', rests.length === 3 && rests.every((t) => /cue\('rested'\)/.test(t) && !silent.test(t)), rests.length);

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

/* ── 10. v2.3.3398: the third look ("Good look for more") ── */
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
  check('10g the game loop hears poses begin and the townsfolk\'s copies (tickMoveSounds)', /import \{ tickMoveSounds \} from '@\/game\/moveSounds\.js'/.test(BT) && /tickMoveSounds\(S, /.test(BT));
  check('10h your move\'s own sound wins the tap over the menu click (the picker\'s tiles are buttons)', /BT_AUDIO\._uiSpecificAt = BT_AUDIO\._now\(\)/.test(MS));
  const LS = strip(src('src/game/lifeSkillRewards.js'));
  const fly = LS.slice(LS.indexOf('function _flyResourceToInventory'), LS.indexOf('function startExtraction'));
  check('10i a harvest\'s prize is heard landing in the bag (bagIn), at the end of its flight', /setTimeout\(function \(\) \{ cue\('bagIn'\); \}, \d+\)/.test(fly));
  /* a tap on the world reaches no <button>, so the menus it opens took no click */
  const chatOpen = BT.slice(BT.indexOf('var openSelfChat = function'), BT.indexOf('var openSelfChat = function') + 1400);
  const mark = BT.slice(BT.indexOf('var _mark = function (r)'), BT.indexOf('var _mark = function (r)') + 1200);
  const inspects = (BT.match(/BT_AUDIO\.uiClickNow\(\); \} catch \(_ce\) \{ \/\* sound only \*\/ \}\s+\/\* v2\.3\.3398[^\n]*\n\s*setInspectPlayer\(\{/g) || []).length;
  check('10j the menus a tap on the world opens click as every menu does: your bro\'s chat box, a townsperson\'s window, a player\'s card (3 ways)',
    /chatBubbleBus\.setOpen\(true\)[\s\S]*BT_AUDIO\.uiClickNow\(\)/.test(chatOpen)
    && /r === 'quest' \|\| r === 'flip' \|\| r === 'shop' \|\| r === 'pets'\) \{ try \{ BT_AUDIO\.uiClickNow\(\)/.test(mark)
    && inspects === 3, { inspects });
}

console.log(`\nsound-cues: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
