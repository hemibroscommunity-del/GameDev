/* ═══ v2.3.3755: EACH MEMORY SAVER, OFF FROM THE TEST PANEL ═══
 *
 * The owner turned every memory saver on by default on 2026-10-28 ("I can
 * always revert the change if I don't like it"), the night before the judges.
 * Reverting one is a pull request and a deploy, and a judge cannot add `?x=0`
 * to an address, so each saver can be turned off for every phone, live, from
 * the Test panel ("Memory savers", DevPanel.jsx): one live flag a saver,
 * `off_<name>: true` (a live flag holds a boolean or a number, never a list),
 * which this worker hands every phone as ONE comma list:
 *   - at join, caps.clientoff ('sfxcache,voicecap', '' with none);
 *   - at once whenever an `off_` flag is set or cleared (liveops.js), as the
 *     privileged `client_off {off}` to every phone (_clientOffChanged).
 * The phone's half, and the savers' names: src/game/clientOff.js.  Nothing on
 * the worker reads the names; nothing is stored but the flags themselves.
 */
export const CLIENT_OFF = Object.freeze({
  PREFIX: 'off_',
});

export const clientOffMethods = {
  /* the savers turned off, as the comma list the phones read */
  _clientOffList() {
    const f = this._liveFlags;
    if (!f || typeof f !== 'object') return '';
    const out = [];
    for (const k of Object.keys(f)) {
      if (k.startsWith(CLIENT_OFF.PREFIX) && f[k] === true && k.length > CLIENT_OFF.PREFIX.length) out.push(k.slice(CLIENT_OFF.PREFIX.length));
    }
    return out.sort().join(',');
  },

  /* liveops.js, when an `off_` flag is set or cleared: every phone told */
  _clientOffChanged() {
    this.broadcastAll({ type: 'client_off', off: this._clientOffList() });
  },
};
