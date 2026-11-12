/* v2.3.4884: is this party_state the same as the one the screen already holds?
   The worker re-sends the whole roster about every 2 s while you are in a party
   (party.js VITALS_MS), and nearly every one is identical.  setParty with a
   fresh object re-rendered the whole BroTown tree each time.  This compares
   EVERYTHING in the two plain wire objects (no field is picked, so a field the
   worker adds later can never be missed and freeze the party strip).  No
   imports, so node can test it. */
export function sameWire(a, b) {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  var ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (var i = 0; i < ka.length; i++) {
    var k = ka[i];
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!sameWire(a[k], b[k])) return false;
  }
  return true;
}
