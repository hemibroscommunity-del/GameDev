/* ═══ v2.3.3430: TEST MODE ON THIS PHONE (server/src/testmode.js) ═══
   The owner's switch in the Test panel: for one of their own characters, the
   worker stops doubting what the phone says -- the speed limits on moving,
   the timing checks on harvesting and cooking, the limits on hits on
   monsters, the quest order, the roll window, the bot scoring.  Every one of
   those checks is the WORKER's; the phone changes nothing about how it plays.
   All it does with test mode is SHOW it: the TEST MODE tag on the top bar
   (ZoneHeader.jsx), so the owner never forgets which character is which.

   Set from state_sync's `testMode` at every join (absent = off) and from the
   worker's `test_mode {on}` when the owner flips it (wsClient.js, the direct
   switch: a relayed copy is never taken). */
export function applyTestMode(S, on) {
  if (S) S._testMode = on === true;
}

export function testModeOn(S) {
  return !!(S && S._testMode === true);
}
