/* ═══ v2.3.6693: THE CODEX'S COLLECTION, AND THE GAME'S ONE RULE FOR A PAGE OPEN (card UI2-codex) ═══
 *
 * src/game/codexView.js makes what the collection shows (the kinds, each
 * monster's card, a kind's honest empty line) and reads the game's rule (a
 * page opens at CODEX_OPEN_AT kills) in ONE place.  The checks, on the real
 * module:
 *   V1  nine cards, the Codex's own kinds in its order, only on Monsters;
 *   V2  a monster not met: "???", "Not met yet", its land, no element, no
 *       NEW, no kills -- never its name;
 *   V3  met exactly at CODEX_OPEN_AT kills, never below (no second
 *       threshold): every card's `met` is codexMet's, for 0 to 3 kills;
 *   V4  every kind keeps its place (Monsters, Items, Resources, Townsfolk,
 *       Lands, Pets, in that order; Monsters chosen when none is), and each
 *       one with nothing says so; Mechanics and Furnishings are not invented;
 *   V5  a door only where something is behind it: Pets' to page `petsAll` (v2.3.6696: the pet journal), none
 *       on the others;
 *   V6  a met card is the game's: its name, its element (word and icon), its
 *       land, its kills; NEW only while its page has something unread;
 *   V7  never "Wheel" on screen (the owner, v2.3.3552);
 *   V8  the count of met monsters.
 *
 * THE DODGES, each a one-line change to codexView.js planted in memory
 * (lib/plantImport.mjs) and seen red (a plant that stays green fails):
 *   P1 a not-met monster's name shown        P2 met at 0 kills (a second threshold)
 *   P3 an empty kind hidden                   P4 a door with nothing behind it
 *   P5 "Wheel" on screen                      P6 NEW on a monster not met
 *
 * Run: node tools/guards/codex-view.test.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { plantText, importAs } from './lib/plantImport.mjs';
import { CODEX_KINDS, CODEX_ENTRIES, CODEX_ELEMENTS, CODEX_OPEN_AT } from '../../src/data/monsterCodex.js';
import { ZONES } from '../../src/data/zones.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const REL = 'src/game/codexView.js';
let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 800))); }
}

const SHELVES = ['monsters', 'items', 'resources', 'townsfolk', 'lands', 'pets'];
const words = (o) => JSON.stringify(o);

/* the checks, on a module (the real one, or a planted copy): the ids that fail */
function verdict(M) {
  const bad = [];
  const say = (id, ok) => { if (!ok) bad.push(id); };
  const counts = (n) => () => [n, 0];
  const none = M.codexView({ countsOf: counts(0), freshOf: () => ['page'] });
  const all = M.codexView({ countsOf: counts(3), freshOf: (k) => (k === 'gobling' ? ['page'] : []) });
  /* V1 */
  say('V1', none.cards.length === 9 && none.cards.map((c) => c.kind).join() === CODEX_KINDS.join()
    && SHELVES.slice(1).every((s) => M.codexView({ shelf: s, countsOf: counts(3) }).cards.length === 0));
  /* V2 */
  say('V2', none.cards.every((c) => !c.met && c.name === '???' && /Not met yet/.test(c.line) && c.element === null && c.fresh === false && c.kills === 0
    && c.land && !words(c).includes(CODEX_ENTRIES[c.kind].name)));
  /* V3 */
  let v3 = true;
  for (let n = 0; n <= 3; n++) {
    for (const c of M.codexView({ countsOf: counts(n) }).cards) if (c.met !== (n >= CODEX_OPEN_AT) || c.met !== M.codexMet(n)) v3 = false;
  }
  say('V3', v3 && M.codexMet(CODEX_OPEN_AT) && !M.codexMet(CODEX_OPEN_AT - 1));
  /* V4 */
  say('V4', M.CODEX_SHELVES.map((s) => s.id).join() === SHELVES.join() && M.CODEX_SHELVES.map((s) => s.word).join() === 'Monsters,Items,Resources,Townsfolk,Lands,Pets'
    && M.codexView({}).shelf === 'monsters' && M.codexView({ shelf: 'nope' }).shelf === 'monsters'
    && SHELVES.slice(1).every((s) => { const v = M.codexView({ shelf: s }); return v.shelf === s && v.empty && /Not in the Codex yet/.test(v.empty.title) && v.empty.why; })
    && !M.CODEX_SHELVES.some((s) => /mechanic|furnish/i.test(s.id + s.word)));
  /* V5 */
  say('V5', SHELVES.slice(1).every((s) => { const e = M.codexView({ shelf: s }).empty; return !!e && (s === 'pets' ? !!(e.door && e.door.page === 'petsAll' && e.door.word) : e.door === null); })
    && all.empty === null);
  /* V6 */
  say('V6', all.cards.every((c) => {
    const e = CODEX_ENTRIES[c.kind];
    const el = CODEX_ELEMENTS[e.element];
    return c.met && c.name === e.name && c.land === ZONES[e.home].name && c.element && c.element.name === el.name && c.element.icon === el.icon && c.kills === 3 && /3 defeated/.test(c.line)
      && c.fresh === (c.kind === 'gobling');
  }));
  /* V7 */
  const every = [none, all, ...SHELVES.map((s) => M.codexView({ shelf: s }))];
  say('V7', !every.some((v) => /\bwheel\b/i.test(words(v))));
  /* V8 */
  const some = M.codexView({ countsOf: (k) => [k === 'dewdrop' || k === 'gobling' ? 0 : 1, 0] });
  say('V8', some.met === 7 && some.total === 9 && /7 of 9 met/.test(some.metWords) && none.met === 0);
  return bad;
}

const real = await import('../../src/game/codexView.js');
const bad = verdict(real);
for (const id of ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8']) check(id + ' on the real codexView.js', !bad.includes(id), id);

const PLANTS = [
  ['P1', 'V2', 'a not-met monster\'s name shown', "return Object.freeze({ kind, met: false, name: say(SAY_CX, 'monsterCodex.unknownName'), land,", 'return Object.freeze({ kind, met: false, name: e.name, land,'],
  ['P2', 'V3', 'met at 0 kills (a second threshold beside CODEX_OPEN_AT)', '  const met = codexMet(n);', '  const met = n >= 0;'],
  ['P3', 'V4', 'an empty kind hidden', "const SHELF_IDS = Object.freeze(['monsters', 'items', 'resources', 'townsfolk', 'lands', 'pets']);", "const SHELF_IDS = Object.freeze(['monsters', 'resources', 'townsfolk', 'lands', 'pets']);"],
  ['P4', 'V5', 'a door with nothing behind it', "why: say(SAY, 'codexPages.emptyWhy'), door: null })", "why: say(SAY, 'codexPages.emptyWhy'), door: Object.freeze({ page: 'encyclopedia', word: 'Browse' }) })"],
  ['P5', 'V7', '"Wheel" on screen', '  const land = codexLandName(e.home);', "  const land = codexLandName(e.home) + ', on the Wheel';"],
  ['P6', 'V2', 'NEW on a monster not met', "line: say(SAY_CX, 'monsterCodex.cardNotMet'), fresh: false });", "line: say(SAY_CX, 'monsterCodex.cardNotMet'), fresh: Array.isArray(fresh) && fresh.length > 0 });"],
];
for (const [id, want, what, from, to] of PLANTS) {
  const text = plantText(ROOT, REL, from, to);
  if (text === null) { check(`${id} (${what}): its line is found once in codexView.js`, false, 'the plant\'s line moved: update the plant'); continue; }
  const red = verdict(await importAs(ROOT, REL, text));
  check(`${id} plant (${what}) turns ${want} red`, red.includes(want), 'red: ' + (red.join(', ') || 'nothing'));
}

console.log(failed ? `\n${failed} FAILED` : '\nall ok');
process.exit(failed ? 1 : 0);
