import React from 'react';
import { SMELT_RECIPES } from '@/data/items.js';
import { BAR_THUMBS, ORE_THUMBS } from '@/ui/mobile/dash/InventoryPanel.jsx';

/* ═══ v2.3.2822: SMELTING -- THE BLACKSMITH'S FIRST ROW ═══
 *
 * Owner: "Make one bar require 5 copper ore.  You get xp for each time you
 * smelt it into a bar."
 *
 * One row per bar (SMELT_RECIPES, the mirror of server smelting.js).  The
 * buttons only ASK: `smelt_bar { barKey, count }` goes to the worker, which
 * takes the ore and pays the bar and the XP; the bag and the level arrive on
 * the player_state that follows, and the words + chime on `smelt_result`
 * (wsClient).  No local prediction -- there is nothing here worth predicting,
 * and a predicted bar is a bar the worker can take back.
 *
 * GATED ON caps.smelting (rule 19): an older worker has no case for
 * smelt_bar and would REBROADCAST it to the room, so without the flag the
 * section is not drawn at all.
 *
 * A DOUBLE-TAP IS ONE SMELT.  `busy` holds the buttons from the send until
 * the ore count changes (the answer landed) or 3s pass (it was refused) --
 * the same reason Salvage arms before it fires: on a phone the second tap of
 * a double-tap is an accident far more often than a request. */

const LS_HEAD = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: '#8D9B98', marginBottom: 4 };
const LS_WELL = {
  background: '#111E23', borderRadius: 10, padding: 4, marginBottom: 12,
  boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.025)',
};
const btn = (on) => ({
  minHeight: 44, padding: '0 12px', borderRadius: 10, fontSize: 13, fontWeight: 700,
  fontFamily: 'inherit', cursor: on ? 'pointer' : 'default',
  border: on ? '1px solid rgba(229,237,233,.20)' : '1px solid rgba(229,237,233,.11)',
  background: on ? '#293B41' : '#24363C', color: on ? '#F4F0E7' : '#667875',
});

export function SmeltSection({ rpgState, stateRef }) {
  const S = stateRef.current;
  const [busy, setBusy] = React.useState(null);
  const inv = (rpgState && rpgState.inventory) || {};
  const oreSig = Object.keys(SMELT_RECIPES).map((k) => inv[SMELT_RECIPES[k].ore] || 0).join(',');
  React.useEffect(() => { setBusy(null); }, [oreSig]);
  React.useEffect(() => {
    if (!busy) return undefined;
    const t = setTimeout(() => setBusy(null), 3000);
    return () => clearTimeout(t);
  }, [busy]);

  if (!S || !S._serverCaps || !S._serverCaps.smelting) return null;
  const lvl = (rpgState.lifeSkills && rpgState.lifeSkills.blacksmithing && rpgState.lifeSkills.blacksmithing.level) || 1;

  const send = (barKey, count) => {
    if (!S.channel) return;
    try { S.channel.send({ type: 'smelt_bar', payload: { barKey, count } }); } catch (e) { return; }
    setBusy(barKey);
  };

  return (
    <div data-smelt-section="1">
      <div style={LS_HEAD}>Smelting</div>
      <div style={LS_WELL}>
        {Object.keys(SMELT_RECIPES).map((key) => {
          const r = SMELT_RECIPES[key];
          const ore = Math.floor(inv[r.ore] || 0);
          const can = Math.floor(ore / r.oreCost);
          const locked = lvl < r.minLvl;
          const on = !locked && can > 0 && busy !== key;
          return (
            <div key={key} data-smelt-row={key} style={{ padding: '6px 6px 8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <img src={BAR_THUMBS[key]} alt="" draggable={false} style={{ width: 40, height: 40, objectFit: 'contain', flex: 'none' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#F4F0E7' }}>
                    {r.name}
                    <span data-smelt-have={key} style={{ fontWeight: 400, color: '#8D9B98', marginLeft: 6 }}>×{Math.floor(inv[key] || 0)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#B6C1BE', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    <img src={ORE_THUMBS[r.ore]} alt="" draggable={false} style={{ width: 16, height: 16, objectFit: 'contain' }} />
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: ore >= r.oreCost ? '#B6C1BE' : '#D98C6A' }}>{ore}/{r.oreCost}</span>
                    <span>{r.oreName} → 1 bar · +{r.xp} Smithing XP</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button data-smelt-one={key} disabled={!on} style={{ ...btn(on), flex: 1 }}
                  onClick={() => { if (on) send(key, 1); }}>
                  {locked ? 'Smithing ' + r.minLvl + ' needed' : can > 0 ? 'Smelt' : 'Need ' + (r.oreCost - ore) + ' more ore'}
                </button>
                {can > 1 && (
                  <button data-smelt-all={key} disabled={!on} style={{ ...btn(on), flex: 1 }}
                    onClick={() => { if (on) send(key, can); }}>
                    Smelt all ({can})
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
