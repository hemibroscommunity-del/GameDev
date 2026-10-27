/* ON A COMPUTER, "TAP" READS "CLICK" -- v2.3.3612 (src/game/deskWords.js).
 *
 * The owner, 2026-10-26: the judges play the desktop version.  The game's
 * words were written for a phone ("Tap Race!", "tap a log in your Bag", "tap
 * TRAP"), and deskWords swaps the word where it is shown, only under a mouse.
 *
 *   1. On a phone every string is as written.
 *   2. On a computer: tap, taps, tapped, tapping (and Tap...) as click, clicks,
 *      clicked, clicking; "double-tap" as "double-click".
 *   3. What stays: "TAP" in capitals (shouted, as a label would), the TRAP
 *      button's name (another word), words that only
 *      start with the letters ("tapestry"), words that only end with them
 *      ("mistap" is not a word we use, but "stap" is not a tap), and anything
 *      not a string.
 *   4. Every townsperson's line that says "tap" reads well as "click" (the
 *      lines themselves are untouched: quest-lines counts their characters).
 *   5. The places a computer player reads them call it: the quest plate, the
 *      townsfolk's window, the quest windows, the coach's cards, the codex's
 *      new-monster card, the chat box. */
import { deskWords } from '../../src/game/deskWords.js';
import { QUEST_CHAINS } from '../../src/data/gameSystems.js';
import { readFileSync } from 'fs';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

/* ── 1. a phone ── */
{
  const s = 'Tap Race! Touch all 4 corner flags, and tap the fire to cook.';
  check('1: on a phone a line is as written', deskWords(s, false) === s, deskWords(s, false));
}

/* ── 2. a computer ── */
{
  const c = (s) => deskWords(s, true);
  check('2: Tap -> Click', c('Tap Race!') === 'Click Race!', c('Tap Race!'));
  check('2: tap -> click mid-sentence', c('Catch 2 fish, tap a log in your Bag, and tap the fire.') === 'Catch 2 fish, click a log in your Bag, and click the fire.', c('Catch 2 fish, tap a log in your Bag, and tap the fire.'));
  check('2: taps, tapped, tapping', c('two taps; you tapped it; keep tapping') === 'two clicks; you clicked it; keep clicking', c('two taps; you tapped it; keep tapping'));
  check('2: double-tap -> double-click', c('Double-tap to cycle.') === 'Double-click to cycle.', c('Double-tap to cycle.'));
  check('2: the welcome', c('Find Mayor Bro — he wants a word. Follow the gold road on your map, then tap him.') === 'Find Mayor Bro — he wants a word. Follow the gold road on your map, then click him.');
}

/* ── 3. what stays ── */
{
  const c = (s) => deskWords(s, true);
  check('3: TAP in capitals stays, and TRAP is another word', c('tap TRAP on a monster') === 'click TRAP on a monster' && c('TAP') === 'TAP', c('tap TRAP on a monster'));
  check('3: a word that only starts with the letters stays', c('a tapestry, a tapir, taproot') === 'a tapestry, a tapir, taproot', c('a tapestry, a tapir, taproot'));
  check('3: a word that only ends with them stays', c('a stap, a strap') === 'a stap, a strap', c('a stap, a strap'));
  check('3: anything not a string passes through', deskWords(null, true) === null && deskWords(5, true) === 5 && deskWords(undefined, true) === undefined);
  check('3: no "ap" at all: the same string back', c('Bring me 4 Slime Remains.') === 'Bring me 4 Slime Remains.');
}

/* ── 4. every townsperson's line that says "tap" ── */
{
  let n = 0;
  const bad = [];
  for (const [id, q] of Object.entries(QUEST_CHAINS)) {
    const d = q.dialogue || {};
    for (const k of ['start', 'progress', 'complete']) {
      let t;
      try { t = d[k]; } catch (e) { continue; }
      if (typeof t !== 'string' || !/\btap/i.test(t)) continue;
      n++;
      const out = deskWords(t, true);
      if (/\b[Tt]ap(s|ped|ping)?\b/.test(out) || out.length < t.length) bad.push(id + '.' + k);
    }
    if (typeof q.desc === 'string' && /\btap/i.test(q.desc) && /\b[Tt]ap\b/.test(deskWords(q.desc, true))) bad.push(id + '.desc');
  }
  check(`4: every townsperson's line that says "tap" (${n}) reads "click" on a computer`, n >= 3 && bad.length === 0, bad);
  check('4: the lines themselves are untouched (quest-lines counts them)', /\btap\b/i.test(QUEST_CHAINS.fish_1.dialogue.start));
}

/* ── 5. the places a computer player reads them ── */
{
  const R = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
  const calls = [
    ['src/ui/BroTown.jsx', /deskWords\(questMsg\.sub\)/],
    ['src/ui/panels/NpcDialogue.jsx', /deskWords\(chunks\[i\]\)/],
    ['src/ui/panels/QuestOfferPanel.jsx', /deskWords\(quest\.desc\)/],
    ['src/ui/mobile/dash/QuestDetailPanel.jsx', /deskWords\(quest\.desc\)/],
    ['src/ui/mobile/dash/QuestsPanel.jsx', /deskWords\(/],
    ['src/ui/mobile/QuestCoach.jsx', /deskWords\(view\.body\)/],
    ['src/ui/panels/NewMonsterCard.jsx', /deskWords\('Tap to see it in the Codex/],
    ['src/ui/panels/ChatPanel.jsx', /deskWords\("Tap to type/],
    /* found by mp-deskwords, which reads every page and window on a computer */
    ['src/ui/mobile/dash/QuestDetailPanel.jsx', /deskWords\(`Find \$\{quest\.npc\} in town and tap him/],
    ['src/ui/mobile/dash/SocialPanel.jsx', /deskWords\('Tap another player/],
    ['src/ui/mobile/dash/ClanPanel.jsx', /deskWords\('Make a party: pick a player and tap/],
    ['src/ui/mobile/dash/PetsPanel.jsx', /deskWords\('No pets yet\./],
  ];
  const missing = calls.filter(([p, re]) => !re.test(R(p))).map(([p]) => p);
  check('5: the quest plate, the townsfolk\'s window, the quest windows, the coach, the codex card, the chat box and the Friends, party and Pets pages call it', missing.length === 0, missing);
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
