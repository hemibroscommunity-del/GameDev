/* ═══ v2.3.3612: ON A COMPUTER, "TAP" READS "CLICK" ═══
   The owner, 2026-10-26: the judges play the DESKTOP version.  The game's
   words were written for a phone: "Tap Race!", "tap a log in your Bag",
   "tap TRAP".  On a computer every one of those is a click, and a judge reading
   "tap" is told the game was not made for the screen in front of them.

   ONE RULE, AT THE PLACES THE WORDS ARE SHOWN, never in the data: the
   townsfolk's lines and the quests' words stay as written (server tests count
   their characters, and a phone reads them as they are), and `deskWords`
   swaps the word as they are drawn, only under a mouse -- `(pointer:fine)`,
   the house test for a computer (game.css's keys, QuestCoach, NameModal).
   Whole words only: "tap", "taps", "tapped", "tapping", capitalised as found.
   "TAP" in capitals (a button's own name) and any word that merely starts
   with the letters ("tapestry") stay.

   No imports: the dialogue window, the quest pages and the coach read it. */

let _fine = null;
function fineMq() {
  if (_fine === null) {
    try { _fine = (typeof window !== 'undefined' && window.matchMedia) ? window.matchMedia('(pointer:fine)') : false; } catch (e) { _fine = false; }
  }
  return _fine;
}

/** Is this a computer (a mouse, `(pointer:fine)`)?  Read live: a laptop with a
 *  touch screen can switch. */
export function onComputer() {
  const mq = fineMq();
  return !!(mq && mq.matches);
}

const ENDINGS = { '': '', s: 's', ped: 'ed', ping: 'ing' };

/** `s` with "tap" said as "click" on a computer; as it is on a phone.
 *  `computer` forces the answer (the tests). */
export function deskWords(s, computer) {
  if (typeof s !== 'string' || s.indexOf('ap') < 0) return s;
  const on = computer === undefined ? onComputer() : !!computer;
  if (!on) return s;
  return s.replace(/\b([Tt])ap(s|ped|ping)?\b/g, (m, t, end) => (t === 'T' ? 'Click' : 'click') + ENDINGS[end || '']);
}
