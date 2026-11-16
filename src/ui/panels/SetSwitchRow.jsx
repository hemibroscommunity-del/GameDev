import React, { useState, useCallback } from 'react';
import { OWNER_SWITCHES, ownerSwitch, parseValue, whyNot, confirmWords } from '../../game/ownerSwitches.js';
/* ═══ v2.3.5602: THE TEST PANEL SETS A SWITCH (card OPS PR 3) ═══
 *
 * The Live flags section could show and clear every switch, but set only the
 * few that have buttons of their own; any other value took a terminal command,
 * and the owner is never asked to run one (CLAUDE.md §1).  Two recoveries
 * need one: `newersave` off right after a dashboard rollback (OPERATIONS,
 * "Rolling back": red team RT-2 F4) and `max_players` to hold the room to
 * fewer seats.
 *
 * The row: the owner's usual switches as chips (game/ownerSwitches.js, each
 * with what it does in words), or any name typed in small letters; a value
 * (on, off, or a number); a first tap that shows what it will do, a second
 * that sends it through the panel's own `call('/flags', { name, value })`
 * (the same POST its other taps make, with the admin key); then the flags
 * list is shown again.  The server judges every name: a refusal comes back
 * in the panel's message line.  Nothing is sent before the second tap.
 *
 * (The worker's four old camelCase switches, liveops.js CAMEL_SWITCHES, are
 * not offered here: the row checks the lower-case rule the server gives every
 * switch since v2.3.3295.)
 *
 * v2.3.5602 (mended for sitting 19b, its gatekeeper's review): what it says
 * (the confirm, a refusal, the result, the server's error) is shown right
 * under its own Set button, as well as in the panel's message line, which
 * on a phone is ~1,300 px above it: a refused tap looked dead.
 *
 * A box of the Test panel, not a window of its own.  Notes:
 * docs/UI-DESIGN-NOTES.md, "The Test panel sets a switch".
 */
export function SetSwitchRow({ call, busy, setMsg, COL, btn, chip, label, onFlags }) {
  const [name, setName] = useState('');
  const [valueText, setValueText] = useState('');
  const [armed, setArmed] = useState(false);
  const [note, setNote] = useState('');   /* v2.3.5602 (mend): said under its own button */
  const say = useCallback((t) => { setNote(t); setMsg(t); }, [setMsg]);
  const field = {
    width: '100%', boxSizing: 'border-box', background: COL.well, color: COL.text,
    border: '1px solid ' + COL.border, borderRadius: 8, padding: '11px 10px', marginBottom: 8, minHeight: 44,
    touchAction: 'manipulation',
  };
  const pick = (n) => { setName(n); setValueText(''); setArmed(false); };
  const sw = ownerSwitch(name.trim());
  const value = parseValue(valueText);
  const set = useCallback(async () => {
    const n = name.trim();
    const v = parseValue(valueText);
    const why = whyNot(n, v);
    if (why) { setArmed(false); say(why); return; }
    if (!armed) { setArmed(true); say(confirmWords(n, v) + ' Tap Set again to do it.'); return; }
    setArmed(false);
    const j = await call('/flags', { name: n, value: v }, undefined, { say: setNote });
    if (!j) return;   /* the panel's call has said what went wrong, here too */
    if (onFlags) onFlags(j.flags || {});
    say('Set ' + n + ' to ' + (typeof v === 'boolean' ? (v ? 'on' : 'off') : v)
      + '. It is in the Live flags list above; its Clear puts back what the server does by itself.');
  }, [armed, call, name, onFlags, say, valueText]);
  return (
    <div data-setswitch="1">
      <div style={label}>Set a switch</div>
      <div style={{ color: COL.muted, fontSize: 12, marginBottom: 7, lineHeight: 1.4 }}>
        Changes the live game for everyone at once, no update needed. Pick a switch or type its name, then a value.
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {OWNER_SWITCHES.map((s) => (
          <button key={s.name} type="button" data-setswitch-pick={s.name}
            style={{ ...chip, touchAction: 'manipulation', borderColor: name.trim() === s.name ? COL.accent : COL.border }}
            disabled={busy} onClick={() => pick(s.name)}>{s.name}</button>
        ))}
      </div>
      <input data-setswitch-name="1" value={name}
        onChange={(e) => { setName(e.target.value.toLowerCase()); setArmed(false); }}
        placeholder="switch name (like newersave)" autoCapitalize="off" autoCorrect="off" spellCheck={false}
        style={field} />
      {sw && sw.kind === 'onoff' ? (
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {['on', 'off'].map((v) => (
            <button key={v} type="button" data-setswitch-value={v}
              style={{ ...chip, flex: 1, touchAction: 'manipulation', borderColor: valueText === v ? COL.accent : COL.border }}
              disabled={busy} onClick={() => { setValueText(v); setArmed(false); }}>{v}</button>
          ))}
        </div>
      ) : (
        <input data-setswitch-value-text="1" value={valueText}
          onChange={(e) => { setValueText(e.target.value); setArmed(false); }}
          placeholder={sw && sw.kind === 'number' ? 'a number (' + sw.min + ' to ' + sw.max + ')' : 'on, off, or a number'}
          inputMode={sw && sw.kind === 'number' ? 'numeric' : 'text'}
          autoCapitalize="off" autoCorrect="off" spellCheck={false} style={field} />
      )}
      <button type="button" data-setswitch-set="1"
        style={{ ...btn(armed), touchAction: 'manipulation' }}
        disabled={busy || !name.trim() || value === null} onClick={set}>
        {armed ? 'Sure? Set ' + name.trim() : 'Set'}
      </button>
      {note ? (
        <div data-setswitch-note="1" role="status" style={{ color: COL.text, fontSize: 12.5, lineHeight: 1.4, marginTop: 6 }}>{note}</div>
      ) : null}
    </div>
  );
}
