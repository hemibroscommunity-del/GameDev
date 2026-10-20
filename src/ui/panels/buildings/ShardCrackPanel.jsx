import React from 'react';
import { ZONE_SHARDS, SHARD_GEM_ELEMENT, RAW_PER_GEM, SHARD_CRACK_MAX, shardCrackChance, shardCrackNextStep } from '@/data/shards.js';
import { WEAPON_GEMS } from '@/data/weaponGems.js';
import { GEM_ELEMENTS, gemCount, gemColor, gemElementName, gemIcon, gemRawKey, gemCutKey } from '@/data/gems.js';
import { thumbFor } from '@/ui/mobile/dash/InventoryPanel.jsx';
import { askShardCrack, askGemCombine, shardCrackBus, shardCrackReasonText, SHARD_CRACK_WAIT_MS } from '@/game/shardCrack.js';
import { cue } from '@/game/eventSounds.js';

/* ═══ v2.3.3515: THE GEM WORKS' FIRST TAB -- SHARDS TO GEMS ═══
 *
 * The owner, 2026-10-19: "a fun method would be for the shards to have a
 * certain percent chance of containing that elements raw gem.  Like maybe a
 * 10% chance.  Then after collecting a certain number of raw gems they can be
 * combined into an elemental gem."  And on docs/GEM-PLAN.md, 2026-10-20: "All
 * of that sounds good" -- its Phase 2.
 *
 * Shown in GemcutPanel's place against a worker that cracks
 * (caps.shardcrack, game/shardCrack.js):
 *   - SHARDS: a row a land you hold shards of -- the chance each holds that
 *     land's raw gem at your Gem Cutting level, Crack (one) and All (up to
 *     50, one ask);
 *   - THE CRACK: the worker's own rolls, played a tile a shard -- each one
 *     appears, then crumbles or splits and lets its raw gem out (game.css
 *     .bt-crack-*), with the gem's ring for each find;
 *   - RAW GEMS: a row an element, its count toward the next gem, Combine
 *     (three into one, never failing -- the gem plan's decision 4);
 *   - THE RARE GEM: tap an element, then cut (decision 6: any of the eight);
 *   - YOUR GEMS: the elemental gems in the bag, for the Set gems tab.
 * Nothing here changes a count: the worker answers and the bag follows
 * (player_state re-renders this window).
 *
 * Test hooks: data-crack-row / -one / -all / -have, data-crack-tiles (the
 * answer's seq), data-crack-tile ('hit'|'miss'), data-raw-row, data-combine,
 * data-rare-pick, data-rare-cut, data-gem-have, data-crack-refused. */
const C = {
  panel: '#1E2E34', strip: '#27393F', well: '#111E23', raised: '#293B41',
  text: '#F4F0E7', sub: '#B6C1BE', mute: '#8D9B98', dis: '#667875',
  brass: '#D8AA58', bad: '#E58C7A', line: 'rgba(229,237,233,.11)', strong: 'rgba(229,237,233,.20)',
};
const WRAP = { margin: -20, background: C.panel, borderRadius: 14, overflow: 'hidden', textAlign: 'left' };
const BODY = { padding: '12px 14px 14px' };
const MOD = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: C.mute, margin: '14px 0 6px' };
const ROW = { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 2px', minHeight: 48, borderTop: '1px solid ' + C.line };
const EMPTY = { fontSize: 12, color: C.mute, textAlign: 'center', padding: '12px 10px', borderRadius: 8, background: C.well, border: '1px solid ' + C.line, lineHeight: 1.5 };
const PIC = { width: 32, height: 32, objectFit: 'contain', flexShrink: 0 };

/* each shard's turn in the reveal, and the most tiles whose sounds play */
const TILE_MS = 70;
const MISS_SOUNDS = 3;

const LANDS = Object.keys(SHARD_GEM_ELEMENT);
const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const count = (inv, k) => (inv && own(inv, k) ? Math.max(0, Math.floor(Number(inv[k]) || 0)) : 0);

function Btn({ on, onClick, children, primary, ...rest }) {
  return (
    <button type="button" disabled={!on} onClick={() => { if (on) onClick(); }} {...rest}
      style={{ minHeight: 44, minWidth: 58, padding: '0 10px', borderRadius: 10, fontSize: 13, fontWeight: 800, fontFamily: 'inherit',
        cursor: on ? 'pointer' : 'default', fontVariantNumeric: 'tabular-nums', touchAction: 'manipulation', flexShrink: 0,
        border: on ? (primary ? '1px solid #EAC675' : '1px solid ' + C.strong) : '1px solid ' + C.line,
        background: on ? (primary ? 'linear-gradient(180deg,#E2B765,#D2A14D)' : C.raised) : '#1A292F',
        color: on ? (primary ? '#172126' : C.text) : C.mute }}>
      {children}
    </button>
  );
}

function Header({ lvl, chance }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 40px 12px 16px', background: C.strip, borderBottom: '1px solid ' + C.line }}>
      <img src="/icons/ui/bldg-gemcut.webp" alt="" draggable={false} style={{ width: 26, height: 26, objectFit: 'contain', flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.10em', color: C.text }}>Gem Cutter</div>
        <div style={{ fontSize: 11, color: C.mute, marginTop: 1 }}>{'Gem Cutting Lv ' + lvl + ' · ' + chance + '% a shard'}</div>
      </div>
    </div>
  );
}

/* the worker's rolls, a tile a shard -- drawn under the row that was cracked
   and brought into view: below eight lands' rows it was off the screen */
function Reveal({ res }) {
  const box = React.useRef(null);
  React.useEffect(() => {
    try { if (box.current && box.current.scrollIntoView) box.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* a look only */ }
  }, [res.seq]);
  const name = 'Raw ' + gemElementName(res.element) + ' Gem';
  const land = ZONE_SHARDS[res.land];
  const n = res.rolls.length;
  const head = n + ' ' + (land ? land.label : 'Shard') + (n === 1 ? '' : 's') + ' cracked: '
    + (res.found > 0 ? (res.found > 1 ? res.found + ' ' + name + 's!' : 'a ' + name + '!') : 'no gem this time');
  const gemPic = gemIcon(gemRawKey(res.element));
  const shardPic = land ? thumbFor(land.key) : null;
  return (
    <div ref={box} data-crack-tiles={res.seq} style={{ margin: '2px 0 8px', padding: '8px 10px', borderRadius: 10, background: C.well, border: '1px solid ' + C.line }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: res.found > 0 ? gemColor(res.element) : C.sub }}>{head}</div>
      <div className="bt-crack-tiles">
        {res.rolls.map((r, i) => {
          const hit = r <= res.chance;
          return (
            <div key={i} data-crack-tile={hit ? 'hit' : 'miss'} className={'bt-crack-tile ' + (hit ? 'hit' : 'miss')}
              style={{ '--d': (i * TILE_MS) + 'ms', '--gc': gemColor(res.element) }}>
              {shardPic ? <img className="bt-crack-shard" src={shardPic} alt="" draggable={false} /> : null}
              {hit && gemPic ? <img className="bt-crack-gem" src={gemPic} alt="" draggable={false} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ShardCrackPanel({ rpgState, stateRef }) {
  const S = (stateRef && stateRef.current) || {};
  const R = rpgState || {};
  const inv = R.inventory || {};
  const gc = R.lifeSkills && R.lifeSkills.gemCutting;
  const lvl = Math.max(1, Math.floor(Number(gc && typeof gc === 'object' ? gc.level : 1) || 1));
  const chance = shardCrackChance(lvl);
  const next = shardCrackNextStep(lvl);
  const [, bump] = React.useReducer((x) => x + 1, 0);
  const [rarePick, setRarePick] = React.useState(null);
  /* only an answer that came while this window was open is played (and
     heard): reopening the window does not crack the shards again */
  const openedAt = React.useRef(Date.now());
  React.useEffect(() => shardCrackBus.subscribe(bump), []);
  const pending = shardCrackBus.pending();
  React.useEffect(() => {
    if (!pending) return undefined;
    /* an ask nobody answered lets go of the buttons after its wait */
    const t = setTimeout(bump, SHARD_CRACK_WAIT_MS + 50);
    return () => clearTimeout(t);
  }, [pending && pending.at]);
  const last = shardCrackBus.get();
  const fresh = last && last.at >= openedAt.current ? last : null;
  const crackRes = fresh && fresh.kind === 'crack' && fresh.ok && fresh.rolls.length ? fresh : null;
  /* the crack heard as it is seen: the gem's ring on each find, the shard
     breaking on the first few that held none */
  React.useEffect(() => {
    if (!crackRes) return undefined;
    const timers = [];
    let misses = 0;
    crackRes.rolls.forEach((r, i) => {
      const hit = r <= crackRes.chance;
      if (!hit && misses++ >= MISS_SOUNDS) return;
      timers.push(setTimeout(() => { try { cue(hit ? 'gemCut' : 'gemShatter', hit ? 1 : 0.4); } catch (e) { /* sound only */ } }, i * TILE_MS + (hit ? 320 : 240)));
    });
    return () => { for (const t of timers) clearTimeout(t); };
  }, [crackRes && crackRes.seq]);

  const busy = !!pending;
  /* a land's row stays while its crack is playing, its last shard gone */
  const shardRows = LANDS.map((land) => ({ land, shard: ZONE_SHARDS[land], have: count(inv, 'shard_' + land), element: SHARD_GEM_ELEMENT[land] }))
    .filter((r) => r.shard && (r.have > 0 || (crackRes && crackRes.land === r.land)));
  const rawRows = GEM_ELEMENTS.map((e) => ({ e, have: gemCount(R, e, true) })).filter((r) => r.have > 0);
  const gems = GEM_ELEMENTS.map((e) => ({ e, have: gemCount(R, e, false) })).filter((r) => r.have > 0);
  const rare = count(inv, 'rare_gem');
  const refused = fresh && !fresh.ok ? fresh : null;

  return (
    <div style={WRAP} data-shard-crack>
      <Header lvl={lvl} chance={chance} />
      <div style={BODY}>
        <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.5 }}>
          Crack a land's shards: some hold its raw gem. {RAW_PER_GEM} raw gems make one elemental gem to set into your gear.
        </div>
        <div style={{ fontSize: 11, color: C.mute, marginTop: 3 }}>
          {'Each shard: ' + chance + '%' + (next ? ' (' + next.pct + '% at Gem Cutting ' + next.minLvl + ')' : '') + '.'}
        </div>

        <div style={MOD}>Shards</div>
        {shardRows.length ? shardRows.map((r) => {
          const all = Math.min(r.have, SHARD_CRACK_MAX);
          return (
            <React.Fragment key={r.land}>
            <div data-crack-row={r.land} style={ROW}>
              <img src={thumbFor(r.shard.key)} alt="" draggable={false} style={PIC} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: r.shard.color }}>{r.shard.label}</div>
                <div data-crack-have={r.have} style={{ fontSize: 11, color: C.sub, fontVariantNumeric: 'tabular-nums' }}>
                  {'×' + r.have + ' · ' + chance + '% a Raw ' + gemElementName(r.element) + ' Gem'}
                </div>
              </div>
              <Btn on={!busy && r.have > 0} data-crack-one={r.land} onClick={() => askShardCrack(S, r.land, 1)}>Crack</Btn>
              {all > 1 ? <Btn on={!busy} primary data-crack-all={r.land} onClick={() => askShardCrack(S, r.land, all)}>{'All ' + all}</Btn> : null}
            </div>
            {crackRes && crackRes.land === r.land ? <Reveal res={crackRes} /> : null}
            </React.Fragment>
          );
        }) : <div style={EMPTY}>No shards to crack. Monsters and resources out in the lands drop their land's shard.</div>}


        <div style={MOD}>Raw gems</div>
        {rawRows.length ? rawRows.map((r) => {
          const can = r.have >= RAW_PER_GEM;
          const pips = r.have % RAW_PER_GEM;
          return (
            <div key={r.e} data-raw-row={r.e} style={ROW}>
              <img src={gemIcon(gemRawKey(r.e))} alt="" draggable={false} style={{ ...PIC, opacity: 0.75 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: gemColor(r.e) }}>{'Raw ' + gemElementName(r.e) + ' Gem'}</div>
                <div style={{ fontSize: 11, color: C.sub, fontVariantNumeric: 'tabular-nums' }}>
                  {'×' + r.have + ' · ' + (can ? RAW_PER_GEM + ' make a ' + gemElementName(r.e) + ' Gem'
                    : (RAW_PER_GEM - pips) + ' more for a ' + gemElementName(r.e) + ' Gem')}
                </div>
              </div>
              <Btn on={can && !busy} primary data-combine={r.e} onClick={() => askGemCombine(S, r.e, false)}>{can ? 'Combine' : 'Need ' + RAW_PER_GEM}</Btn>
            </div>
          );
        }) : <div style={EMPTY}>Raw gems you find show here.</div>}

        {rare > 0 ? (
          <>
            <div style={MOD}>Rare Gem</div>
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 6 }}>{'×' + rare + ' · cut it into any elemental gem: pick one.'}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {WEAPON_GEMS.map((e) => {
                const on = rarePick === e;
                return (
                  <button key={e} type="button" data-rare-pick={e} disabled={busy} onClick={() => setRarePick(on ? null : e)}
                    style={{ minHeight: 40, padding: '0 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, fontFamily: 'inherit', touchAction: 'manipulation',
                      cursor: busy ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                      border: '1px solid ' + (on ? gemColor(e) : C.line), background: on ? C.raised : C.well, color: gemColor(e) }}>
                    <img src={gemIcon(gemCutKey(e))} alt="" draggable={false} style={{ width: 18, height: 18, objectFit: 'contain' }} />
                    {gemElementName(e)}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 8 }}>
              <Btn on={!!rarePick && !busy} primary data-rare-cut={rarePick || ''} onClick={() => { askGemCombine(S, rarePick, true); setRarePick(null); }}>
                {rarePick ? 'Cut into a ' + gemElementName(rarePick) + ' Gem' : 'Pick a gem first'}
              </Btn>
            </div>
          </>
        ) : null}

        <div style={MOD}>Your gems</div>
        {gems.length ? (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {gems.map((g) => (
                <div key={g.e} data-gem-have={g.e} style={{ minHeight: 36, padding: '0 10px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 12, fontWeight: 700, background: C.well, border: '1px solid ' + C.line, color: gemColor(g.e), fontVariantNumeric: 'tabular-nums' }}>
                  <img src={gemIcon(gemCutKey(g.e))} alt="" draggable={false} style={{ width: 18, height: 18, objectFit: 'contain' }} />
                  {gemElementName(g.e) + ' Gem ×' + g.have}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: C.mute, marginTop: 6 }}>Set them into your gear on the Set gems tab.</div>
          </>
        ) : <div style={EMPTY}>Elemental gems you make show here.</div>}

        {refused ? (
          <div data-crack-refused={refused.reason || 'bad'} style={{ fontSize: 12, color: C.bad, marginTop: 10 }}>
            {shardCrackReasonText(refused.reason, refused.kind === 'combine' ? refused : null)}
          </div>
        ) : null}
      </div>
    </div>
  );
}
