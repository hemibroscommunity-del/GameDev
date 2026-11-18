#!/usr/bin/env node
/* ═══ v2.3.6100: THE CAPS CENSUS (card CAP PR 1; grand plan step 7.5, step 1) ═══
 *
 * A cap ("the worker does X": `state_sync.caps`, CAP_GATES in
 * src/ui/panels/DevPanel.jsx) keeps the page's old way for a worker without
 * it.  Step 7.5 takes those old ways out, in 7.3's batches, by 7.2's rule
 * (four weeks deployed with no override); an old way that settles value on
 * the page (coins, loot, xp, hp, a bag) goes first, as 4.2's.  Step 1 is this
 * census: ONE row a cap in CAP_GATES, with
 *
 *   born     the change that put the cap in the worker's caps literal: the
 *            first commit (oldest first, merges aside) whose server/src/join.js
 *            or, before v2.3.1173 split it out, server/src/index.js holds the
 *            name in a `caps: {` literal; its v2.3.N tag (the subject's, else
 *            the body's) and short hash;
 *   switch   its row in the switch table (tools/guards/lib/switches.mjs), if
 *            it has one: a worker (or both-sides) row named the cap, or the cap
 *            in lower case (a row whose switch leaves the cap as
 *            it is, `disable_weapon_drops` for `weaponDrops`, is not its row);
 *   reads    where the page reads it (src/**, comments stripped):
 *              `_serverCaps.x`, `_serverCaps?.x`, `_serverCaps['x']` (the
 *              caps audit's reads), and through the caps object under another
 *              name (`caps`, `_caps`, `SC`, `_betCaps`: `caps.x`, `caps['x']`)
 *              or by name in a row (`cap: 'x'`, `needsCap: 'x'`) -- the last
 *              two only for a name in CAP_GATES;
 *   counts   a number or a list the page reads as such (rows, crops, a
 *            version), judged by hand below (COUNTS): it stays, it is not an
 *            old way;
 *   settles  whether its old page way settles value ON THE PAGE, judged by
 *            hand below (SETTLES): `value`, `no`, or `?` where it is unclear
 *            (never guessed);
 *   old way  `yes` where the page still reads it and it does not count:
 *            each read is a branch kept for a worker without the cap.  This
 *            is the column card CAP's PR 2 guard counts (it only falls).
 *
 * Nothing is removed here: no cap, no old way, no read.
 *
 *   node tools/dev/caps-census.mjs           writes docs/plan/census/caps.md
 *   node tools/dev/caps-census.mjs --check   fails (exit 1) when that file is
 *                                            not what this would write
 *
 * Births read git history: a shallow clone cannot say them (`git fetch
 * --unshallow` first); the guard (tools/guards/caps-census.test.mjs) imports
 * only the scanner below and never needs git.  Node only, no packages.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

export const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
export const CENSUS = 'docs/plan/census/caps.md';
const ALIASES = ['caps', '_caps', 'SC', '_betCaps'];

/* ── the hand-judged columns ────────────────────────────────────────────── */

/* A cap the page reads as a number or a list (TRAPS §9: a cap that grows gates
   by its count).  It stays: it is a number, not an old way. */
export const COUNTS = Object.freeze({
  bagWeapons: 'the weapon bag\'s size',
  clientoff: 'the list of memory savers the worker turned off',
  cookRows: 'how many recipes the worker cooks',
  dungeonLands: 'how many lands have a dungeon',
  farmCrops: 'how many crops the farm grows',
  power: 'the power index\'s version',
  rejoinResend: 'how many slots the worker says again after state_sync',
  report: 'the field report\'s version',
  statboards: 'how many stat boards',
  wheelsize: 'which Wheel the worker plays (its length)',
});

/* Whether the page's old way (a worker without the cap) settles value on the
   page: SETTLES, at the end of this file (a long table).  Three were `?`
   (questTrack, meals, prog3): the planning session read them as value, the
   safe side (they go first, with care); each row says so. */

/* ── the scanner (the guard imports it) ─────────────────────────────────── */

/* The text with its comments blanked to spaces (newlines kept, so line
   numbers hold).  Strings and template text are kept as they are. */
export function stripComments(t) {
  let out = '';
  let i = 0;
  const n = t.length;
  while (i < n) {
    const c = t[i], d = t[i + 1];
    if (c === '/' && d === '*') {
      const e = t.indexOf('*/', i + 2);
      const end = e < 0 ? n : e + 2;
      out += t.slice(i, end).replace(/[^\n]/g, ' ');
      i = end;
      continue;
    }
    if (c === '/' && d === '/') {
      const e = t.indexOf('\n', i);
      const end = e < 0 ? n : e;
      out += ' '.repeat(end - i);
      i = end;
      continue;
    }
    if (c === '\'' || c === '"' || c === '`') {
      let j = i + 1;
      while (j < n && t[j] !== c) {
        if (t[j] === '\\') j++;
        else if (c !== '`' && t[j] === '\n') break;
        j++;
      }
      out += t.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

export function capGates(root = ROOT) {
  const panel = readFileSync(join(root, 'src/ui/panels/DevPanel.jsx'), 'utf8');
  const m = panel.match(/const CAP_GATES = \[([\s\S]*?)\];/);
  if (!m) throw new Error('CAP_GATES not found in src/ui/panels/DevPanel.jsx');
  return [...new Set([...stripComments(m[1]).matchAll(/'([A-Za-z0-9_]+)'/g)].map((x) => x[1]))];
}

function srcFiles(root, dir = 'src', out = []) {
  for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const rel = dir + '/' + e.name;
    if (e.isDirectory()) srcFiles(root, rel, out);
    else if (/\.(js|jsx|mjs)$/.test(e.name)) out.push(rel);
  }
  return out.sort();
}

/* Every read of a cap on the page: Map cap -> [{ file, line }], in file and
   line order.  `files` (optional) is { path: text }, in place of src/ (the
   guard's break proof). */
export function pageReads(root = ROOT, gates = capGates(root), files = null) {
  const known = new Set(gates);
  const reads = new Map();
  const add = (cap, file, text, idx) => {
    if (!reads.has(cap)) reads.set(cap, []);
    reads.get(cap).push({ file, line: text.slice(0, idx).split('\n').length });
  };
  const list = files ? Object.keys(files).sort() : srcFiles(root);
  const al = ALIASES.join('|');
  const RES = [
    [/_serverCaps\??\.\s*([A-Za-z0-9_$]+)/g, false],
    [/_serverCaps\??\.?\[\s*['"]([A-Za-z0-9_$]+)['"]\s*\]/g, false],
    [new RegExp('(?<![A-Za-z0-9_$.])(?:' + al + ')\\??\\.\\s*([A-Za-z0-9_$]+)', 'g'), true],
    [new RegExp('(?<![A-Za-z0-9_$.])(?:' + al + ')\\??\\.?\\[\\s*[\'"]([A-Za-z0-9_$]+)[\'"]\\s*\\]', 'g'), true],
    [/(?<![A-Za-z0-9_$])(?:cap|needsCap)\s*:\s*['"]([A-Za-z0-9_$]+)['"]/g, true],
  ];
  for (const f of list) {
    const raw = files ? files[f] : readFileSync(join(root, f), 'utf8');
    if (!/_serverCaps|caps|SC|Cap/.test(raw)) continue;
    const t = stripComments(raw);
    const hits = [];
    for (const [re, onlyKnown] of RES) {
      re.lastIndex = 0;
      for (const m of t.matchAll(re)) {
        if (onlyKnown && !known.has(m[1])) continue;
        hits.push([m.index, m[1]]);
      }
    }
    hits.sort((a, b) => a[0] - b[0]);
    for (const [idx, cap] of hits) add(cap, f, t, idx);
  }
  return reads;
}

/* The caps whose old page way is still there: read on the page, not a count.
   The guard's number (it only falls). */
export function oldWays(reads, gates) {
  /* a name read straight off `_serverCaps` counts even before it is in
     CAP_GATES (the cap-gates guard asks for that line; this one for the
     census's row) */
  const names = new Set([...gates, ...reads.keys()]);
  return [...names].filter((c) => (reads.get(c) || []).length > 0 && !COUNTS[c]).sort();
}

/* The census file's own list of them (the guard reads the file, not git). */
export function censusOldWays(root = ROOT) {
  const t = readFileSync(join(root, CENSUS), 'utf8');
  const out = [];
  for (const line of t.split('\n')) {
    const m = line.match(/^\| `([A-Za-z0-9_$]+)` \|(.*)\|\s*$/);
    if (!m) continue;
    const cells = m[2].split('|').map((s) => s.trim());
    if (cells[cells.length - 1] === 'yes') out.push(m[1]);
  }
  return out.sort();
}

/* ── the switch table and the births (writing only) ────────────────────── */

async function switchRows(root) {
  const mod = await import(pathToFileURL(join(root, 'tools/guards/lib/switches.mjs')).href);
  return mod.SWITCHES.filter((r) => r.side === 'worker' || r.side === 'both');
}

function switchFor(cap, rows) {
  const lc = cap.toLowerCase();
  const by = rows.find((r) => r.name === cap) || rows.find((r) => r.name === lc);
  return by ? by.name : null;
}

/* The keys of every `caps: {` literal in a file's text. */
export function capsLiteralKeys(text) {
  const keys = new Set();
  const t = stripComments(text);
  let from = 0;
  for (;;) {
    const at = t.indexOf('caps: {', from);
    if (at < 0) break;
    let i = at + 'caps: {'.length;
    let depth = 1;
    let seg = i;
    const segs = [];
    while (i < t.length && depth > 0) {
      const c = t[i];
      if (c === '\'' || c === '"' || c === '`') {
        let j = i + 1;
        while (j < t.length && t[j] !== c) { if (t[j] === '\\') j++; j++; }
        i = j + 1;
        continue;
      }
      if (c === '{' || c === '(' || c === '[') depth++;
      else if (c === '}' || c === ')' || c === ']') { depth--; if (!depth) break; }
      else if (c === ',' && depth === 1) { segs.push(t.slice(seg, i)); seg = i + 1; }
      i++;
    }
    segs.push(t.slice(seg, i));
    for (const s of segs) {
      const m = s.trim().match(/^([A-Za-z0-9_$]+)\s*:/);
      if (m) keys.add(m[1]);
    }
    from = i;
  }
  return keys;
}

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 });
}

function births(root, gates) {
  if (git(root, ['rev-parse', '--is-shallow-repository']).trim() === 'true') {
    throw new Error('a shallow clone cannot say when each cap was born: run `git fetch --unshallow` first');
  }
  const want = new Set(gates);
  const born = new Map();
  const log = git(root, ['log', '--reverse', '--topo-order', '--no-merges', '--format=%H',
    'HEAD', '--', 'server/src/join.js', 'server/src/index.js']).split('\n').filter(Boolean);
  for (const h of log) {
    if (born.size === want.size) break;
    const names = git(root, ['ls-tree', '--name-only', h, 'server/src/join.js', 'server/src/index.js'])
      .split('\n').filter(Boolean);
    let fresh = null;
    for (const f of names) {
      const keys = capsLiteralKeys(git(root, ['show', h + ':' + f]));
      for (const k of keys) {
        if (want.has(k) && !born.has(k)) (fresh || (fresh = [])).push(k);
      }
    }
    if (!fresh) continue;
    const msg = git(root, ['log', '-1', '--format=%s%n%b', h]);
    const tag = (msg.match(/v2\.3\.(\d+)/) || [])[1] || 'untagged';
    for (const k of fresh) born.set(k, `${tag} (${h.slice(0, 9)})`);
  }
  return born;
}

/* ── the file ──────────────────────────────────────────────────────────── */

const SETTLES_ORDER = { value: 0, '?': 1, no: 2 };

export async function build(root = ROOT) {
  const gates = capGates(root);
  const reads = pageReads(root, gates);
  const rows = await switchRows(root);
  const born = births(root, gates);
  const row = (cap) => {
    const r = reads.get(cap) || [];
    const files = new Map();
    for (const x of r) files.set(x.file, (files.get(x.file) || 0) + 1);
    const counts = !!COUNTS[cap];
    const j = SETTLES[cap];
    const settles = counts ? 'no' : (j ? j[0] : '?');
    return {
      cap, settles, why: counts ? 'counts: ' + COUNTS[cap] : (j ? j[1] : 'not judged yet'),
      sw: switchFor(cap, rows), born: born.get(cap) || 'unknown', n: r.length,
      files: [...files].map(([f, k]) => (k > 1 ? `${f.replace(/^src\//, '')} ×${k}` : f.replace(/^src\//, ''))),
      counts, old: r.length > 0 && !counts,
    };
  };
  const all = gates.map(row).sort((a, b) =>
    (SETTLES_ORDER[a.settles] - SETTLES_ORDER[b.settles])
    || ((a.sw ? 1 : 0) - (b.sw ? 1 : 0))
    || (a.cap.toLowerCase() < b.cap.toLowerCase() ? -1 : a.cap.toLowerCase() > b.cap.toLowerCase() ? 1 : 0)
    || (a.cap < b.cap ? -1 : a.cap > b.cap ? 1 : 0));
  const tot = {
    caps: all.length,
    value: all.filter((r) => r.settles === 'value').length,
    unclear: all.filter((r) => r.settles === '?').length,
    noSwitch: all.filter((r) => !r.sw).length,
    counts: all.filter((r) => r.counts).length,
    old: all.filter((r) => r.old).length,
    unread: all.filter((r) => !r.n).length,
    reads: all.reduce((s, r) => s + r.n, 0),
    unborn: all.filter((r) => r.born === 'unknown').length,
  };
  const esc = (s) => String(s).replace(/\|/g, '\\|');
  const L = [];
  L.push('# The caps census (grand plan 7.5, step 1; card CAP, tag 6100)');
  L.push('');
  L.push('Written by `node tools/dev/caps-census.mjs`; never by hand. `--check` fails when this file is');
  L.push('not what it would write. What each column means, and how it is read: the generator\'s header.');
  L.push('Nothing is removed by this census: no cap, no old way, no read.');
  L.push('');
  L.push('## Totals');
  L.push('');
  L.push(`- caps in \`CAP_GATES\`: **${tot.caps}**`);
  L.push(`- whose old page way settles value (they go first, as 4.2's): **${tot.value}**`);
  L.push(`- unclear whether they settle value (\`?\`, never guessed): **${tot.unclear}**`);
  L.push(`- with no row in the switch table (no \`on\` day, no end): **${tot.noSwitch}**`);
  L.push(`- that count (a number or a list: they stay): **${tot.counts}**`);
  L.push(`- **whose old page way is still there (old way \`yes\`): ${tot.old}** -- the count that only falls (\`tools/guards/caps-census.test.mjs\`)`);
  L.push(`- not read on the page at all: **${tot.unread}**`);
  L.push(`- reads on the page, all caps: **${tot.reads}**`);
  L.push(`- births git could not find: **${tot.unborn}**`);
  L.push('');
  L.push('## The caps');
  L.push('');
  L.push('Sorted: settles value first, then unclear, then the rest; in each, no switch row first; then by name.');
  L.push('');
  L.push('| cap | settles | why | switch row | born | reads | read in | old way |');
  L.push('|---|---|---|---|---|---|---|---|');
  for (const r of all) {
    L.push(`| \`${r.cap}\` | ${r.settles} | ${esc(r.why)} | ${r.sw ? '`' + r.sw + '`' : '--'} | ${r.born} | ${r.n} | ${r.files.length ? esc(r.files.join(', ')) : '--'} | ${r.counts ? 'count' : r.old ? 'yes' : 'no'} |`);
  }
  L.push('');
  return { text: L.join('\n'), tot };
}

/* ── SETTLES: judged by hand, reading each read ─────────────────────────── */
export const SETTLES = Object.freeze({
  abil: ['no', 'false: no ability buttons appear and nothing is sent'],
  accuracy: ['no', 'false: counts no shots and hides the accuracy page'],
  aceFlip: ['no', 'false: Ace refuses the flip with a note, nothing sent'],
  aceItems: ['no', 'false: hides the item wager and its records board'],
  achievements: ['no', 'false: hides the Achievements page, AP tile and banners'],
  alliance: ['no', 'false: hides the alliance windows and tags'],
  amuletForge: ['value', 'false: the page rolls and mints its own gold nugget drops on kills'],
  areaChat: ['no', 'false: says area chat needs an update, sends nothing'],
  arena: ['no', 'page-side arena payout and fee debit already deleted; no false-branch reads remain'],
  arenaap: ['no', 'false: the arena window does not promise achievement points'],
  arenaapfirst: ['no', 'false: the arena window omits the first-win-only wording'],
  armorforge: ['no', 'false: hides the Armor tab and its forge hint'],
  bank: ['no', 'false: the Bank window offers no vault deposits or withdrawals'],
  beastmaster: ['no', 'false: Beastmaster Bro and his quests are not shown'],
  bigorb: ['no', 'false: fires the old three-orb volley, the worker still rolls damage'],
  blockScale: ['no', 'false: predicts the old fifths mana cost and draws five blocks'],
  boards2: ['no', 'false: hides the daily spin records board'],
  bodyTake: ['no', 'false: ignores body_place, no landing at the taken-over body'],
  botfp: ['no', 'false: the cook request omits the swipe fingerprint field'],
  bowDraw: ['no', 'false: the bow is flicked, not drawn (feel only)'],
  bowvolley: ['no', 'false: fires one arrow instead of three; the worker rolls damage'],
  broCount: ['no', 'false: runs the worn-Bro verify request instead of the wallet count'],
  broVerify: ['no', 'false: hides the wallet verify control'],
  bundle: ['no', 'false: sends messages one at a time'],
  charLock: ['no', 'false: picks a look each session instead of trusting the stored character'],
  chatMute: ['no', 'false: sends no mute, filters muted lines with the local list'],
  clanparty: ['no', 'false: clan windows stay clan windows instead of pointing to the Saloon'],
  clans: ['no', 'false: page keeps local war scores and wipes clan locally; no gold minted'],
  codex: ['no', 'false: the Codex Monsters tab says it opens after the update'],
  cropeat: ['no', 'false: the bag offers no Eat on a crop'],
  dailyChest: ['no', 'false: hides the chest\'s Open button, nothing sent'],
  dailyquests: ['no', 'false: hides the daily quests window and its sends'],
  dailyspin: ['no', 'false: hides the free spin and sends nothing'],
  dice: ['no', 'false: /roll is sent as a plain chat line'],
  dungeon: ['value', 'false: the page spawns the dungeon locally and pays its own gold and XP'],
  elemBurst: ['no', 'false: hides the burst button, predicts the old mana cost'],
  elemup: ['no', 'false: the page guesses its own UP popup (display only)'],
  emotemoves: ['no', 'false: hides the Moves tab'],
  emotes: ['no', 'only an explicit false hides the emote picker'],
  eventCapes: ['no', 'false: hides the ticket Open and cape buttons'],
  farm: ['value', 'false: legacy farm panel harvests crops into the bag and grants farming XP'],
  farmorders: ['no', 'false: hides the Orders tab and sends no farm_order'],
  fishheal: ['no', 'false: heal predictions and labels use the old formula'],
  fishvariants: ['no', 'false: no rare-fish popup or dev tools shown'],
  fishweigh: ['no', 'false: hides Inspect and the biggest-fish board'],
  forgeladder: ['no', 'false: shows the old forge list and level requirements'],
  freeSwing: ['no', 'false: the sword keeps its normal swing interval'],
  friends: ['no', 'false: shows the old local-storage friend list, sends nothing'],
  gamble: ['no', 'false: says the table is closed; the local roll is gone'],
  gatherhits: ['no', 'false: the wind-up is a local timer, the server still pays'],
  gatherreq: ['no', 'false: no level refusal or level label drawn over nodes'],
  gearlevel: ['no', 'false: labels and gates gear by Defense points and Magic'],
  gearq: ['no', 'false: damage and armour readouts use the old formulas (display)'],
  gearRef: ['no', 'false: sends the whole armour object instead of its id'],
  gemExtract: ['no', 'false: hides the gem extract rows and Upgrade tab, nothing sent'],
  gems: ['value', 'false: the page rolls its own raw gem drops and gem cuts'],
  gidnames: ['no', 'false: the action door names a weapon by its place, not its id'],
  guilds: ['no', 'false: says Not open yet, the old local mint is gone'],
  harden: ['no', 'false: hides the Upgrade tab and hardening rows'],
  hardenedwood: ['no', 'false: hides the Hardened tab, shows the old harden cost'],
  hardenkeep: ['no', 'false: failure text and chip say the level drops back'],
  hardenmats: ['no', 'false: shows the old hardening costs without materials'],
  hardenwoodskill: ['no', 'false: the hardening line names Blacksmithing, not Woodworking'],
  harvestGrade: ['no', 'no page read; only a dev panel opt-in label'],
  heapburn: ['no', 'false: no burn shown or heap_burn sent'],
  hitladder: ['no', 'false: the skills page shows the even 1..level odds'],
  hpEndGrids: ['no', 'false: grid spending is shown disabled online'],
  itemdrop: ['no', 'false: hides the Drop button'],
  jackpot: ['no', 'false: says the jackpot is closed; the local stub is gone'],
  killroll: ['no', 'false: the codex shows each drop rolled on its own'],
  laststand: ['no', 'false: the Last Stand row shows inactive (SOON)'],
  loginspin: ['no', 'false: hides the daily spin button and never asks'],
  meals: ['value', 'was ?, read as value by the planning session: the old instant cook heals R.hp on the page'],
  milestonesRetired: ['no', 'false: predicts the old stamina bar and Burst gate for display'],
  monsterhold: ['no', 'false: the Enchanter and item words describe the old lock'],
  monstermoves: ['no', 'false: draws no monster move warnings'],
  movediet: ['no', 'false: sends every move at the full rate'],
  movepath: ['no', 'false: sends ordinary moves without the path mark'],
  nearjoin: ['no', 'false: the page does not expect near snapshots, presence only'],
  nmlchoice: ['no', 'false: the window sends no nml_attack'],
  nmlgroup: ['no', 'false: attackers are not marked as foes as a group'],
  nmllock: ['no', 'false: hides the lock words and buttons'],
  nmlnear: ['no', 'false: No man\'s land rings counted from the old first tier for display'],
  nmlsteps: ['no', 'false: counts the No man\'s land level the old way for display'],
  nodehp: ['no', 'false: node HP bar uses the old 5 x (tier+1) formula'],
  nomansland: ['no', 'false: hides the PvP banner, skulls and tap-to-attack'],
  nostatcap: ['no', 'false: the [+] button greys at the old per-level bound'],
  oneformula: ['no', 'false: predicts old HP bar and damage numbers; worker settles'],
  onelevel: ['no', 'false: predicts the level as the sum of skills (display)'],
  onetoone: ['no', 'false: shows the five-to-one smelt and hardened-wood recipes'],
  party: ['no', 'false: hides party invite tiles and buttons'],
  partyChat: ['no', 'false: says party chat needs an update, sends nothing'],
  partydungeon: ['no', 'false: shows the dungeon\'s own levels instead of the party line'],
  partykeep: ['no', 'false: shows the small in-memory party layout'],
  pathall: ['no', 'false: the message diet only for ?diet=1 phones'],
  perfectStrike: ['no', 'false: arrow claims name no shot (feel and claim shape only)'],
  petbook: ['no', 'false: opens the old Pet House, which only picks the active pet'],
  petfetch: ['no', 'false: the pet does not run to far loot piles'],
  pethouse: ['no', 'false: hides the More room button, nothing sent'],
  petlevels: ['no', 'false: hides pet XP bars; nothing predicted'],
  petLoot: ['value', 'false: the pet self-credits ground loot coins and weapons into local state'],
  petshow: ['no', 'false: other players\' pets are not drawn'],
  pettrade: ['no', 'false: hides the pet trade lane and pet listings'],
  petwards: ['no', 'false: hides the ward line on the Pets page'],
  pointsreset: ['no', 'false: hides the Reset button'],
  potionBag: ['no', 'false: hides the Drink button and sends nothing'],
  presence2: ['no', 'false: keeps the old ghost sweep presence roster'],
  prog3: ['value', 'was ?, read as value by the planning session: the old recalc sets level and pools on the page'],
  prog3Chan: ['no', 'false: shows one shared points total; the worker judges spends'],
  prog3elem: ['no', 'false: hides new stat rows and shows the global elemental stat'],
  prog3rel: ['no', 'false: stat readouts predict the old linear math'],
  prog3shared: ['no', 'false: draws the old points grid and pools (display only)'],
  prog3x: ['no', 'false: hides the new stat rows and banner says +1 (display)'],
  pvpbalance: ['no', 'false: sends the PvP claim every frame, the worker still settles'],
  pvpbrew: ['no', 'false: the PvP claim folds the brew in, the worker still settles'],
  pvpextras: ['no', 'false: area moves target no player'],
  pvpheal: ['no', 'false: the page holds no bite back; the worker decides'],
  pvplunge: ['no', 'false: the lunge does not target a player'],
  questTrack: ['value', 'was ?, read as value by the planning session: the page counts quest kills and claims them at join'],
  quiet: ['no', 'false: phone sends moves and keepalives as before'],
  race: ['no', 'false: hides Lil Bro\'s Race button and course'],
  reqid: ['no', 'false: requests go without the once-only request id'],
  rest: ['value', 'false: the bed restores HP, stamina, mana and Well Rested on the page'],
  revealbag: ['no', 'false: no Reveal button or reveal ask'],
  ride: ['no', 'false: hides the skateboard button'],
  risechest: ['no', 'false: the chest just says Empty for now'],
  salvage: ['no', 'false: hides the Salvage tab and essence info'],
  season: ['no', 'false: hides the season stars, tiers and claims'],
  shardcrack: ['no', 'false: old gem cut panel, worker-settled under caps.gems'],
  shieldgem: ['value', 'false: the page takes the gem, sets the shield gem, adds XP'],
  shieldwear: ['no', 'false: the worn shield is not reported to the worker'],
  shockspark: ['no', 'false: the gem\'s text omits the spark'],
  smelting: ['no', 'false: hides the Smelt tab and its sends'],
  soakhit: ['no', 'false: the gem card does not mention softer blows'],
  spar: ['no', 'false: the Test panel hides the sparring buttons'],
  sponsor: ['no', 'false: says betting is closed; the old self-mint is gone'],
  sprint: ['no', 'false: hides the Sprint button and unmarked moves'],
  staffGather: ['no', 'false: the staff\'s gather feel is off'],
  store: ['no', 'false: hides the auction house Sell button and store panel'],
  storeChat: ['no', 'false: hides the store chat icon'],
  storeGear: ['no', 'false: hides the gear Sell buttons in the auction house'],
  storeGearRef: ['no', 'false: a gear listing names its piece by selector, not id'],
  storeOffer: ['no', 'false: hides the offer box'],
  t2bench: ['no', 'false: readouts keep the legacy t2Accel display math'],
  t2simple: ['no', 'false: the page does not derive level and takes the worker\'s echo'],
  t2uniform: ['no', 'false: the panel refuses spends past the legacy caps'],
  tierxp: ['no', 'false: the harvest XP popup predicts the old base XP'],
  tour: ['no', 'false: the tour\'s two townsfolk are not spawned'],
  tourgear: ['no', 'false: craft windows show the old costs and level asks'],
  trade: ['no', 'no page read left, the old local trade mint is gone'],
  trade2: ['no', 'false: opens the old one-way gift panel, which only sends requests'],
  trade2Review: ['no', 'false: single-stage Confirm instead of ready and review'],
  trade2Weapons: ['no', 'false: hides the weapon picker in the trade window'],
  trapcraft: ['no', 'false: hides the Traps tab'],
  trapping: ['no', 'false: hides the trap pop-up and marks'],
  weaponDrops: ['value', 'false: the page rolls and mints its own weapon drops'],
  weapongem: ['value', 'false: the Enchanter slots the gem locally, taking it and granting XP'],
  wheeldungeons: ['no', 'false: hides dungeon mouths and sends no dungeon start'],
  wheelmonsters: ['no', 'false: the trial rides the worldview zone instead of wheel'],
  wheelnodes: ['no', 'false: skips the node resync request'],
  whirlWindup: ['no', 'false: whirlwind strikes on the press; the worker resolves the hit'],
  whisper: ['no', 'false: refuses to send a whisper with a hint'],
  xpdecay: ['no', 'false: XP predictions and skill readouts show no fade'],
});

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const { text, tot } = await build();
  const path = join(ROOT, CENSUS);
  if (process.argv.includes('--check')) {
    let have = '';
    try { have = readFileSync(path, 'utf8'); } catch { /* missing */ }
    if (have !== text) {
      console.log(`FAIL ${CENSUS} is out of date: run  node tools/dev/caps-census.mjs  and commit it`);
      process.exit(1);
    }
    console.log(`ok   ${CENSUS} is up to date (${tot.caps} caps, ${tot.old} old ways)`);
  } else {
    writeFileSync(path, text);
    console.log(`wrote ${CENSUS}: ${JSON.stringify(tot)}`);
  }
}
