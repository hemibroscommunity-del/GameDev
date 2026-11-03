/* v2.3.4158: THE EXPO'S ONE-WI-FI SWITCH (Test panel, DevPanel.jsx)
   At the expo the judges probably share one internet address, and the
   server lets one address hold 16 places and open 20 connections a minute
   (server/src/flood.js; live flags `ip_sockets` and `ip_joins_min`, 0 = no
   limit).  Only a terminal command moved them, and the owner is never asked to
   run one.  This is the list of admin calls the two buttons make, pure so a
   node test holds it to the documented writes (docs/OPERATIONS.md).
   `on` true: both limits off; false: both flags cleared (back to 16 and 20). */
export const EXPO_ADDRESS_FLAGS = Object.freeze(['ip_sockets', 'ip_joins_min']);

export function expoAddressFlags(on) {
  return EXPO_ADDRESS_FLAGS.map((name) => on
    ? { path: '/flags', body: { name, value: 0 }, method: 'POST' }
    : { path: '/flags?name=' + encodeURIComponent(name), body: null, method: 'DELETE' });
}

/* the current state in plain words, from the loaded flags (null = not loaded) */
export function expoAddressWords(flags) {
  if (!flags) return 'not loaded yet (click "Show live flags" below to see)';
  const off = (n) => flags[n] === 0;
  if (off('ip_sockets') && off('ip_joins_min')) return 'EXPO MODE: no limit on places or connections from one address';
  if (flags.ip_sockets === undefined && flags.ip_joins_min === undefined) return 'normal (16 places and 20 connections a minute from one address)';
  const w = (n, label) => flags[n] === undefined ? label + ' normal' : (flags[n] === 0 ? label + ' no limit' : label + ' ' + flags[n]);
  return 'mixed: ' + w('ip_sockets', 'places') + ', ' + w('ip_joins_min', 'connections a minute');
}
