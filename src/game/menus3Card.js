/* ═══ v2.3.6871: THE ONE CARD, ITS RULES (card MN step 3, the Card) ═══
 *
 * The owner's document (docs/design/menus3/SPEC.md section 5, "Universal
 * Card"): "All NPC dialogue, offers, invites, rewards, death prompts, and
 * confirmations share one compact card with at most 2 buttons."  The
 * wireframe draws it as a small card in the middle over a dim (its
 * `.modalcard`): the title bold, a muted line under it, and a row of two
 * buttons, the quiet one left and the lead one right.
 *
 * This module says, for each KIND the card shows, its words (today's own
 * words, from today's tables: the card changes the look, never the game's
 * words) and its two answers.  The answers are named `yes` and `no` here;
 * what each SENDS is not the card's: the prompt that shows the card calls
 * ITS OWN handler with the answer (the same request and payload as today's
 * window, through `act()`), so nothing about the game changes.
 *
 * WHAT IS THE CARD'S (the card's step 3, rule 3): only a prompt that is
 * today a line of words and one or two answers.  A prompt with more than
 * two answers, a list, a slider, a wager or any gold, bag or login step
 * keeps today's window (`cardOf` answers null), and is listed in
 * CARD_TODAY with why, for the owner.  `?menus3=0` shows every old prompt
 * exactly as today (the components ask menus3On() first).
 *
 * Imports only the words (node's suite: server/test/menus3-card.test.mjs). */
import { say } from './say.js';
import { SAY as PARTY } from '../data/say/partyHud.js';
import { SAY as DUEL } from '../data/say/duelRequest.js';
import { SAY as CLAN } from '../data/say/clanInvite.js';
import { SAY as PETS } from '../data/say/pets.js';

/** At most two answers (the owner's "at most 2 buttons"). */
export const CARD_MAX_ANSWERS = 2;

/** The two answers' names.  `no` is the quiet one on the left (Esc presses
 *  it: data-esc), `yes` the lead one on the right (Enter: data-enter). */
export const CARD_ANSWERS = Object.freeze(['no', 'yes']);

/* a string arg, never an object or a forged long one */
function str(v, max) {
  if (typeof v === 'number' && isFinite(v)) v = String(v);
  if (typeof v !== 'string') return '';
  return v.length > (max || 40) ? v.slice(0, max || 40) : v;
}
function num(v) { const n = Number(v); return isFinite(n) ? n : 0; }

/* ── the kinds: each its words and its two answers (today's words) ──
   `role` is the lead answer's colour in the kit (src/ui/kit/Action.jsx
   intent): 'commit' does the thing, 'danger' cannot be undone. */
const KINDS = Object.create(null);

/* a party invite (today: src/ui/panels/PartyHUD.jsx, party.invite) */
KINDS['party.invite'] = (a) => ({
  title: say(PARTY, 'partyHud.inviteTitle'),
  line: say(PARTY, 'partyHud.invites', { name: str(a.fromName) }) + (num(a.partySize) > 1 ? say(PARTY, 'partyHud.inviteSize', { size: num(a.partySize) }) : ''),
  fine: '',
  no: say(PARTY, 'partyHud.decline'),
  yes: say(PARTY, 'partyHud.join'),
  role: 'commit',
});

/* a duel challenge WITHOUT a wager (today: src/ui/panels/DuelRequestPanel.jsx).
   With a wager it is gold: today's window keeps it (cardOf answers null). */
KINDS['duel.invite'] = (a) => (num(a.wager) > 0 ? null : {
  title: say(DUEL, 'duelRequest.title'),
  line: say(DUEL, 'duelRequest.challenges', { name: str(a.fromName) }),
  fine: say(DUEL, 'duelRequest.rulesNoWager'),
  no: say(DUEL, 'duelRequest.decline'),
  yes: say(DUEL, 'duelRequest.accept'),
  role: 'commit',
});

/* a clan invite (today: src/ui/panels/ClanInviteCard.jsx).  Clans are gone
   in the owner's document; until the step that replaces them, the invite a
   player can still get is answered here (nothing lost). */
KINDS['clan.invite'] = (a) => ({
  title: say(CLAN, 'clanInvite.title'),
  line: say(CLAN, 'clanInvite.invites', { from: str(a.fromName), clan: '[' + str(a.clanTag, 8) + '] ' + str(a.clanName) }),
  fine: say(CLAN, 'clanInvite.howLong'),
  no: say(CLAN, 'clanInvite.later'),
  yes: say(CLAN, 'clanInvite.accept'),
  role: 'commit',
});

/* releasing a pet for good (today: src/ui/mobile/dash/PetsPage.jsx, the
   kit's Ui2Confirm in the pet's actions) */
KINDS['pet.release'] = (a) => ({
  title: say(PETS, 'pets.releaseAsk', { name: str(a.name) }),
  line: '',
  fine: '',
  no: say(PETS, 'pets.releaseKeep'),
  yes: say(PETS, 'pets.releaseYes'),
  role: 'danger',
});

/** The kinds the card shows, in the order this step moved them. */
export const CARD_KINDS = Object.freeze(['party.invite', 'duel.invite', 'clan.invite', 'pet.release']);

/**
 * The card for a prompt: { kind, title, line, fine, answers: [{ id, label, role }] }
 * (the quiet `no` first, the lead `yes` second), or null when the prompt is
 * not the card's (an unknown kind, a duel with a wager): its window stays.
 */
export function cardOf(kind, args) {
  if (typeof kind !== 'string' || !Object.prototype.hasOwnProperty.call(KINDS, kind)) return null;
  const w = KINDS[kind](args && typeof args === 'object' ? args : {});
  if (!w) return null;
  const answers = [
    { id: 'no', label: w.no, role: 'adjust' },
    { id: 'yes', label: w.yes, role: w.role === 'danger' ? 'danger' : 'commit' },
  ].filter((x) => !!x.label).slice(0, CARD_MAX_ANSWERS);
  return { kind, title: w.title, line: w.line || '', fine: w.fine || '', answers };
}

/** Is this prompt the card's now (under the new menus)? */
export function cardTakes(kind, args, on) {
  return !!on && !!cardOf(kind, args);
}

/** An answer pressed: 'yes' or 'no' when the card has it, else null (a
 *  forged id answers nothing). */
export function cardAnswer(card, id) {
  if (!card || !Array.isArray(card.answers)) return null;
  for (let i = 0; i < card.answers.length; i++) if (card.answers[i].id === id) return id;
  return null;
}

/**
 * EVERY PROMPT THE OWNER'S DOCUMENT PLACES ON THE CARD (SPEC.md section 5
 * and its placement map), with today's file and where it is now: 'card'
 * (moved by this step) or 'today' (today's window, and why: the owner's to
 * decide, or a later step's).  The PR body lists the same.
 */
export const CARD_TODAY = Object.freeze([
  { what: 'party invite', file: 'src/ui/panels/PartyHUD.jsx', home: 'card', kind: 'party.invite' },
  { what: 'duel challenge, no wager', file: 'src/ui/panels/DuelRequestPanel.jsx', home: 'card', kind: 'duel.invite' },
  { what: 'clan invite', file: 'src/ui/panels/ClanInviteCard.jsx', home: 'card', kind: 'clan.invite' },
  { what: 'release a pet', file: 'src/ui/mobile/dash/PetsPage.jsx', home: 'card', kind: 'pet.release' },
  { what: 'duel challenge with a wager', file: 'src/ui/panels/DuelRequestPanel.jsx', home: 'today', why: 'gold (the wager)' },
  { what: 'trade request', file: 'src/ui/panels/IncomingTradePanel.jsx', home: 'today', why: 'a list (what they offer) and gold' },
  { what: 'friend request', file: 'src/ui/menus3/Menus3Roster.jsx', home: 'today', why: 'no prompt today: a row in Requests (the incoming one only chimes)' },
  { what: '"Attack?" in no man\'s land', file: 'src/ui/mobile/NmlAskCard.jsx', home: 'today', why: 'up to four answers (Attack, Party, Trade, Ignore)' },
  { what: 'threat incoming', file: 'src/ui/panels/ThreatIncomingPanel.jsx', home: 'today', why: 'a countdown and its rules (not in the owner\'s list)' },
  { what: 'log out / switch bro', file: 'src/ui/mobile/dash/AccountPanel.jsx', home: 'today', why: 'a login step' },
  { what: 'leave a trade', file: 'src/ui/panels/TradeWindowPanel.jsx', home: 'today', why: 'inside the trade window (step 14, Counter · Trade)' },
  { what: 'restart the character', file: 'src/ui/mobile/dash/settingsParts.jsx', home: 'today', why: 'a screen with its sending, offline and refused states' },
  { what: 'drop / sell an item', file: 'src/ui/mobile/dash/ItemDetailPopup.jsx', home: 'today', why: 'a quantity picker (and a price)' },
  { what: 'buy pet house room', file: 'src/ui/mobile/dash/PetsPage.jsx', home: 'today', why: 'gold' },
  { what: 'create a clan', file: 'src/ui/panels/ClanPanel.jsx', home: 'today', why: 'gold' },
  { what: 'death', file: 'src/ui/mobile/DeathCard.jsx', home: 'today', why: 'no answers today: the way back is automatic' },
  { what: 'Hotel rest', file: 'src/ui/panels/buildings/WheelHallPanel.jsx', home: 'today', why: 'a row inside the hall\'s window (next card PR)' },
  { what: 'Land Office travel', file: 'src/ui/panels/buildings/LandOfficePanel.jsx', home: 'today', why: 'inside the building\'s window (next card PR)' },
  { what: 'dungeon entry', file: 'src/ui/BroTown.jsx', home: 'today', why: 'one interact button at the mouth, no prompt' },
  { what: 'dungeon exit', file: 'src/game/zoneTransitions.js', home: 'today', why: 'no prompt (a step on the way out); cleared: a countdown and the loot' },
  { what: 'townsfolk talk', file: 'src/ui/panels/NpcDialogue.jsx', home: 'today', why: 'pages of words (Next) and an action' },
  { what: 'quest offer', file: 'src/ui/panels/QuestOfferPanel.jsx', home: 'today', why: 'a list (the rewards)' },
  { what: 'quest reward', file: 'src/ui/panels/QuestOfferPanel.jsx', home: 'today', why: 'a list and a chooser' },
  { what: 'New monster', file: 'src/ui/panels/NewMonsterCard.jsx', home: 'today', why: 'no answers: the whole card is a tap, timed (next card PR)' },
]);
