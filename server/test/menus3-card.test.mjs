/* ═══ v2.3.6871: THE ONE CARD, ITS RULES (card MN step 3; src/game/menus3Card.js) ═══
 *
 * The owner's "one compact card with at most 2 buttons" (SPEC.md section 5),
 * its rules played on the module itself.  This suite imports nothing from
 * server/src: it tests the page's own rules (as menus3-roster.test does) and
 * does not deploy.
 *
 *   1. THE KINDS: the four this step moved, each a title, at most two
 *      answers, the quiet `no` first and the lead `yes` second, each with a
 *      label; an unknown, a forged or a '__proto__' kind is no card;
 *   2. TODAY'S WORDS: each kind's words are today's prompt's own (the same
 *      table rows), the name and the party's size put in;
 *   3. GOLD STAYS OUT: a duel with a wager is no card (today's window keeps
 *      it); without one it is; a forged wager string is read as a number;
 *   4. THE LEAD'S COLOUR: releasing a pet is danger (it cannot be undone),
 *      an invite commits; `no` always adjusts;
 *   5. AN ANSWER: only the card's own two ids answer; anything else is null;
 *   6. THE SWITCH: under `?menus3=0` (on=false) no prompt is the card's;
 *   7. THE LIST: every prompt the owner's document places on the card is
 *      listed with today's file, each 'card' row a kind this module draws,
 *      each 'today' row with its reason; the long forged arg is cut. */
import { CARD_KINDS, CARD_TODAY, CARD_ANSWERS, CARD_MAX_ANSWERS, cardOf, cardTakes, cardAnswer } from '../../src/game/menus3Card.js';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let failures = 0, passes = 0;
function check(name, ok, info) {
  if (ok) { passes++; console.log('  ok   ' + name); } else { failures++; console.log('  FAIL ' + name + (info !== undefined ? ' -- ' + JSON.stringify(info) : '')); }
}

console.log('1. the kinds');
check('1a. four kinds, in the order moved', CARD_KINDS.join() === 'party.invite,duel.invite,clan.invite,pet.release', CARD_KINDS);
check('1b. the two answers are no then yes; at most two', CARD_ANSWERS.join() === 'no,yes' && CARD_MAX_ANSWERS === 2);
for (const k of CARD_KINDS) {
  const c = cardOf(k, { fromName: 'Mira', name: 'Rex', clanTag: 'AB', clanName: 'Abbey' });
  check(`1c. ${k}: a title, two answers no then yes, each labelled`, !!c && !!c.title && c.answers.length === 2 && c.answers[0].id === 'no' && c.answers[1].id === 'yes' && c.answers.every((a) => typeof a.label === 'string' && a.label.length > 0), c);
}
check('1d. an unknown kind is no card', cardOf('trade.request', {}) === null && cardOf('', {}) === null && cardOf(null) === null && cardOf(5) === null);
check('1e. a prototype key is no card', cardOf('__proto__', {}) === null && cardOf('toString', {}) === null && cardOf('constructor', {}) === null);

console.log('2. today\'s words');
const p = cardOf('party.invite', { fromName: 'Mira', partySize: 3 });
check('2a. the party invite: today\'s title, "Mira invites you (3 in party)", Decline / Join', p.title === 'Party Invite' && p.line === 'Mira invites you (3 in party)' && p.answers[0].label === 'Decline' && p.answers[1].label === 'Join', p);
const p1 = cardOf('party.invite', { fromName: 'Mira', partySize: 1 });
check('2b. a party of one says no size, as today', p1.line === 'Mira invites you', p1.line);
const d = cardOf('duel.invite', { fromName: 'Kael', wager: 0 });
check('2c. the duel: today\'s title, challenge line and no-wager rules, Decline / Accept', d.title === 'Duel Challenge' && d.line === 'Kael challenges you!' && /No wager/.test(d.fine) && d.answers[0].label === 'Decline' && d.answers[1].label === 'Accept', d);
const c = cardOf('clan.invite', { fromName: 'Sol', clanTag: 'AB', clanName: 'Abbey' });
check('2d. the clan invite: "Sol invites you to join [AB] Abbey.", two minutes, Not now / Accept', c.title === 'Clan invite' && c.line === 'Sol invites you to join [AB] Abbey.' && /two minutes/.test(c.fine) && c.answers[0].label === 'Not now' && c.answers[1].label === 'Accept', c);
const r = cardOf('pet.release', { name: 'Rex' });
check('2e. release: "Release Rex for good?", Keep / Release, no line', r.title === 'Release Rex for good?' && r.line === '' && r.answers[0].label === 'Keep' && r.answers[1].label === 'Release', r);

console.log('3. gold stays out');
check('3a. a duel with a wager is no card', cardOf('duel.invite', { fromName: 'Kael', wager: 50 }) === null);
check('3b. a wager given as a string still counts', cardOf('duel.invite', { fromName: 'Kael', wager: '25' }) === null);
check('3c. no wager, or a forged one that is no number, is the card', !!cardOf('duel.invite', { fromName: 'Kael' }) && !!cardOf('duel.invite', { fromName: 'Kael', wager: 'x' }));

console.log('4. the lead\'s colour');
check('4a. release is danger', r.answers[1].role === 'danger');
check('4b. every invite commits', ['party.invite', 'duel.invite', 'clan.invite'].every((k) => cardOf(k, { fromName: 'A' }).answers[1].role === 'commit'));
check('4c. no always adjusts', CARD_KINDS.every((k) => cardOf(k, { fromName: 'A', name: 'B' }).answers[0].role === 'adjust'));

console.log('5. an answer');
check('5a. the card\'s own ids answer', cardAnswer(p, 'yes') === 'yes' && cardAnswer(p, 'no') === 'no');
check('5b. anything else is nothing', cardAnswer(p, 'maybe') === null && cardAnswer(p, '__proto__') === null && cardAnswer(null, 'yes') === null && cardAnswer({}, 'yes') === null);

console.log('6. the switch');
check('6a. on: the card takes its kinds', cardTakes('party.invite', {}, true) && cardTakes('duel.invite', { wager: 0 }, true));
check('6b. off (?menus3=0): nothing is the card\'s', !cardTakes('party.invite', {}, false) && !cardTakes('pet.release', {}, false));
check('6c. on, a wager still stays in today\'s window', !cardTakes('duel.invite', { wager: 10 }, true));

console.log('7. the list');
const want = ['party invite', 'duel challenge, no wager', 'clan invite', 'release a pet', 'duel challenge with a wager', 'trade request', 'friend request', 'log out / switch bro', 'death', 'Hotel rest', 'Land Office travel', 'dungeon entry', 'dungeon exit', 'townsfolk talk', 'quest offer', 'quest reward', 'New monster'];
const whats = CARD_TODAY.map((x) => x.what);
check('7a. every prompt the document places on the card is listed', want.every((w) => whats.includes(w)), want.filter((w) => !whats.includes(w)));
check('7b. each \'card\' row is a kind this module draws; every kind has its row', CARD_TODAY.filter((x) => x.home === 'card').every((x) => CARD_KINDS.includes(x.kind)) && CARD_KINDS.every((k) => CARD_TODAY.some((x) => x.kind === k)));
check('7c. each \'today\' row says why', CARD_TODAY.filter((x) => x.home === 'today').every((x) => typeof x.why === 'string' && x.why.length > 3));
check('7d. every file named exists', CARD_TODAY.every((x) => existsSync(path.join(ROOT, x.file))), CARD_TODAY.filter((x) => !existsSync(path.join(ROOT, x.file))).map((x) => x.file));
const long = cardOf('party.invite', { fromName: 'x'.repeat(500) });
check('7e. a forged long name is cut', long.line.length < 80, long.line.length);
check('7f. an object for a name is no name', cardOf('party.invite', { fromName: { toString: () => 'evil' } }).line === ' invites you');

console.log(`\nmenus3-card: ${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
