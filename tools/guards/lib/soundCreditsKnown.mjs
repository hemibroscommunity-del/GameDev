/* v2.3.5782: the recordings the game ships that need no CREDITS.md row, each
   with why (./soundCredits.mjs says what a row is).  A census (the plan's
   rule 3): only ever shorter.  On main at 2026-11-17 one recording had no
   row, listed below (a Found for the owner, docs/plan/status/U2.md).  An owner's own recording (made by them, no licence to
   record) goes here with why, in the PR that adds it. */
export const KNOWN = Object.freeze({
  /* the desert's wind (src/data/gameDisplay.js `sky`); tools/assets/families.mjs
     calls it the owner's upload, kept whole.  No row says where it came from or
     its licence: the owner's to say, then its row, then this line goes. */
  'public/audio/ambient/wind-dunes.mp3': 'found with no row at 5782: its source is the owner\'s to say',
});
