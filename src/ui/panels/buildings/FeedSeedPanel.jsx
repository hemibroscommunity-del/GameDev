import React from 'react';
import { BT_AUDIO, LIFE_SKILL_XP, TILE, ZONES, generateZoneMap, updateZoneDimensions } from '@/data/index.js';
import { FARM, FARM_CROP_ORDER, FARM_LOOK, farmGrowMs, farmYieldShown, farmTimeLeft } from '@/data/farmCrops.js';
import { farmBus } from '@/ui/mobile/farmBus.js';
import { FARM_ERR_TEXT, farmItemName } from '@/game/farmFeedback.js';
import { pushDmgPopup } from '@/game/combatHelpers.js';
import { rememberFarmTrip } from '@/game/wheelTownDoors.js';

/* ═══ v2.3.3083: THE FEED & SEED, A REAL FARM ═══
 *
 * Owner: "mechanics similar to the old FarmVille game where you have to wait
 * to harvest and each has a wait time different depending on what it is.
 * Need to dig, plant seeds, fertilize, water, etc."  Then: "Good.  Go ahead
 * and build it" (docs/FARMING-PLAN.md, Phase 1).
 *
 * The window the Feed & Seed's door opens, drawn from what the WORKER says
 * the farm is (server/src/farm.js, through ui/mobile/farmBus.js).  It shows
 * against a worker that advertises caps.farm; otherwise FarmPanel keeps its
 * old browser-only face (rule 19).
 *
 * THE RULES THIS WINDOW KEEPS (the blacksmith's, SmithyPanel.jsx)
 *   - Pictures and numbers, not sentences.  Each bed is a square of ground:
 *     grass, furrows, a sprout, the crop.  A drop in its corner is water, a
 *     worm is compost, the corner number is the time left.
 *   - No local prediction.  A tap asks the worker; the beds change when its
 *     answer lands.  Nothing can be shown that the worker did not do.
 *   - Pick a tool, then tap a bed or DRAG across beds -- one message for the
 *     whole drag (Hay Day's one-finger sweep, the plan's phone gesture).  The
 *     tool starts on whatever the farm needs next (ripe crops: Harvest; rough
 *     ground: Dig; tilled: Plant; dry crops: Water) until you choose one.
 *   - Water and compost are optional and say what they buy: "6m" beside "8m",
 *     "x3" beside "x2".
 *
 * Test hooks: data-farm, data-farm-tab, data-farm-tool, data-farm-seed,
 * data-bed / data-bed-state, data-farm-all, data-farm-buy, data-farm-status,
 * data-farm-visit; window.__btFarm (the bus). */

const C = {
  sheet: '#1E2E34', well: '#111E23', raised: '#293B41', card: '#24363C',
  text: '#F4F0E7', sub: '#B6C1BE', mute: '#8D9B98', faint: '#667875',
  brass: '#D8AA58', good: '#55B98A', bad: '#D8635D', water: '#7CC8EA', line: 'rgba(229,237,233,.11)',
};
const COIN = '/icons/ui/cur-gold.webp';
const XP = '/icons/ui/cur-xp.webp';

const Icon = ({ src, size = 16 }) => (
  <img src={src} alt="" draggable={false} style={{ width: size, height: size, objectFit: 'contain', flex: 'none' }}
    onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
);
const Glyph = ({ g, size = 18, style }) => (
  <span aria-hidden="true" style={{ fontSize: size, lineHeight: 1, display: 'inline-block', ...style }}>{g}</span>
);
function Chip({ children, color, icon }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 999,
      background: C.well, fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: color || C.sub, whiteSpace: 'nowrap' }}>
      {icon ? <Icon src={icon} size={14} /> : null}{children}
    </span>
  );
}

const TOOLS = [
  { id: 'dig', label: 'Dig', look: FARM_LOOK.dig },
  { id: 'plant', label: 'Plant', look: FARM_LOOK.seed },
  { id: 'water', label: 'Water', look: FARM_LOOK.water },
  { id: 'feed', label: 'Fertilize', look: FARM_LOOK.compost },   /* the owner's word; 'feed' on the wire */
  { id: 'harvest', label: 'Harvest', look: FARM_LOOK.harvest },
];

/* Would the worker do anything with this tool on this bed?  The window's
   guess, to light the beds up and to skip the ones a drag crossed for
   nothing; the worker decides (farm.js applies the same tests). */
function fits(op, p, now) {
  if (!p) return false;
  if (op === 'dig') return p.s === 'rough';
  if (op === 'plant') return p.s === 'tilled';
  if (op === 'water') return p.s === 'planted' && !p.water && now < p.readyAt;
  if (op === 'feed') return p.s === 'planted' && !p.feed;
  if (op === 'harvest') return p.s === 'planted' && now >= p.readyAt;
  return false;
}
/* The tool the farm needs next, in the order a farmer works: pick what is
   ripe, sow what is dug (if there are seeds to sow), water what is growing,
   then break new ground.  Sowing comes BEFORE digging -- found by mp-farm:
   with three beds dug and three still grass, "dig first" sent the player's
   "Plant all" tap to the grass and the seeds they had just bought sat in the
   bag. */
function autoTool(plots, now, hasSeeds, hasCompost) {
  const any = (op) => plots.some((p) => fits(op, p, now));
  if (any('harvest')) return 'harvest';
  if (hasSeeds && any('plant')) return 'plant';
  if (any('water')) return 'water';
  if (any('dig')) return 'dig';
  if (hasCompost && any('feed')) return 'feed';
  if (any('plant')) return 'plant';
  return 'harvest';
}

const SOIL = {
  rough: 'radial-gradient(circle at 22% 30%, #6FA34F 0 2px, transparent 3px), radial-gradient(circle at 70% 62%, #6FA34F 0 2px, transparent 3px), radial-gradient(circle at 44% 82%, #7BAF59 0 2px, transparent 3px), radial-gradient(circle at 84% 22%, #7BAF59 0 2px, transparent 3px), #4A7236',
  tilled: 'repeating-linear-gradient(180deg, #7A5332 0 7px, #5E3F25 7px 12px)',
  wet: 'repeating-linear-gradient(180deg, #56391F 0 7px, #41301D 7px 12px)',
};

function Bed({ i, p, now, tool, hot }) {
  const planted = p.s === 'planted';
  /* A crop this client does not know yet (a newer worker's) still draws, as a
     plain sprout, rather than taking the window down. */
  const crop = planted ? (FARM.CROPS[p.crop] || { name: 'Crop', look: FARM_LOOK.sprout }) : null;
  const ripe = planted && now >= p.readyAt;
  const span = planted ? Math.max(1, p.readyAt - p.plantedAt) : 1;
  const prog = planted ? Math.max(0, Math.min(1, (now - p.plantedAt) / span)) : 0;
  const state = ripe ? 'ripe' : p.s;
  const can = fits(tool, p, now);
  let glyph = null, gSize = 0;
  if (ripe) { glyph = crop.look; gSize = 38; }
  else if (planted) {
    if (prog < 0.5) { glyph = FARM_LOOK.seed; gSize = 22 + 10 * prog; }
    else { glyph = FARM_LOOK.sprout; gSize = 26 + 10 * prog; }
  }
  return (
    <div data-bed={i} data-bed-state={state} role="button" aria-label={'Bed ' + (i + 1) + ', ' + (ripe ? crop.name + ' ready' : planted ? crop.name + ' growing' : p.s)}
      style={{
        position: 'relative', aspectRatio: '1 / 1', borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
        background: planted && p.water ? SOIL.wet : (p.s === 'rough' ? SOIL.rough : SOIL.tilled),
        boxShadow: hot ? `inset 0 0 0 3px ${C.brass}` : ripe ? `inset 0 0 0 2px ${C.good}, 0 0 10px rgba(85,185,138,.45)` : can ? 'inset 0 0 0 2px rgba(216,170,88,.55)' : 'inset 0 0 0 1px rgba(0,0,0,.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none', WebkitUserSelect: 'none',
      }}>
      {glyph ? <Glyph g={glyph} size={gSize} style={ripe ? { animation: 'bt-farm-ripe 1.6s ease-in-out infinite', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.45))' } : { filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.4))' }} /> : null}
      {planted && p.water ? <Glyph g={FARM_LOOK.water} size={13} style={{ position: 'absolute', top: 4, left: 5 }} /> : null}
      {planted && p.feed ? <Glyph g={FARM_LOOK.compost} size={13} style={{ position: 'absolute', top: 4, right: 5 }} /> : null}
      {planted && !ripe ? (
        <div style={{ position: 'absolute', left: 5, right: 5, bottom: 5 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#F4F0E7', textAlign: 'center', textShadow: '0 1px 2px #000', fontVariantNumeric: 'tabular-nums' }}>
            {farmTimeLeft(p.readyAt - now)}
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(0,0,0,.45)', overflow: 'hidden', marginTop: 2 }}>
            <div style={{ width: `${prog * 100}%`, height: '100%', background: p.water ? C.water : '#DFAE4E' }} />
          </div>
        </div>
      ) : null}
      {ripe ? (
        <div style={{ position: 'absolute', bottom: 5, left: 0, right: 0, textAlign: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#0E2219', background: C.good, borderRadius: 999, padding: '1px 8px' }}>Ready</span>
        </div>
      ) : null}
    </div>
  );
}

export function FeedSeedPanel({ rpgState, stateRef, setBuildingPanel }) {
  const S = stateRef.current || {};
  React.useSyncExternalStore(farmBus.subscribe, farmBus.getSnapshot);
  const R = rpgState || {};
  const inv = R.inventory || {};
  const coins = R.coins || 0;
  const skill = (R.lifeSkills && R.lifeSkills.farming) || { level: 1, xp: 0 };
  const lvl = skill.level || 1;
  const need = LIFE_SKILL_XP(lvl);
  const pct = Math.max(0, Math.min(1, (skill.xp || 0) / need));

  const [tab, setTab] = React.useState('beds');
  /* {tool, at} -- a tool the player chose, and when.  null = the tool follows the farm. */
  const [picked, setPicked] = React.useState(null);
  const [seedPick, setSeedPick] = React.useState(null);
  const [hot, setHot] = React.useState([]);
  const [, tick] = React.useReducer((x) => x + 1, 0);
  const drag = React.useRef(null);

  /* Ask the worker for the beds when the window opens; redraw once a second
     so the time left counts down (the times are the worker's, not ours). */
  React.useEffect(() => { farmBus.open(S); }, []);
  React.useEffect(() => { const t = setInterval(tick, 1000); return () => clearInterval(t); }, []);

  const view = farmBus.view;
  const now = farmBus.serverNow();
  const plots = view ? view.plots : [];
  const pending = !!farmBus.pending;
  const last = farmBus.last;

  const unlocked = (id) => lvl >= FARM.CROPS[id].lvl;
  const seedCount = (id) => Math.floor(inv[FARM.CROPS[id].seed] || 0);
  const seed = seedPick && unlocked(seedPick) ? seedPick
    : (FARM_CROP_ORDER.find((id) => unlocked(id) && seedCount(id) > 0) || 'carrot');
  const compost = Math.floor(inv[FARM.COMPOST] || 0);
  const count = (op) => plots.filter((p) => fits(op, p, now)).length;
  /* A chosen tool holds until the worker answers and it has nothing left to
     do (every bed watered, nothing ripe): then the tool follows the farm
     again.  Held through its first answer so a tap on, say, Harvest when
     nothing is ripe still reads as the player's choice. */
  const canDo = (op) => count(op) > 0 && (op !== 'feed' || compost > 0) && (op !== 'plant' || seedCount(seed) > 0);
  const chosen = picked && (canDo(picked.tool) || !(last && last.at > picked.at)) ? picked.tool : null;
  const tool = chosen || autoTool(plots, now, FARM_CROP_ORDER.some((id) => unlocked(id) && seedCount(id) > 0), compost > 0);
  const toolCount = { dig: count('dig'), plant: seedCount(seed), water: count('water'), feed: compost, harvest: count('harvest') };

  const say = (text, color) => { try { const P = S.player; if (P) pushDmgPopup(S, P.x, P.y - 34, text, color || C.brass); } catch (e) { /* popup only */ } };

  /* Send `tool` for these beds, keeping only the ones it fits. */
  const go = (beds) => {
    if (pending || !view) return;
    const list = beds.filter((i) => fits(tool, plots[i], now));
    if (!list.length) return;
    if (tool === 'plant' && seedCount(seed) <= 0) { say(FARM_ERR_TEXT['no-seeds'], C.bad); setTab('seeds'); return; }
    if (tool === 'feed' && compost <= 0) { say(FARM_ERR_TEXT['no-compost'], C.bad); setTab('seeds'); return; }
    farmBus.act(S, tool, list, tool === 'plant' ? seed : undefined);
  };

  /* One finger across the beds: collect what it crosses, send once. */
  const bedAt = (x, y) => {
    const el = typeof document !== 'undefined' ? document.elementFromPoint(x, y) : null;
    const b = el && el.closest ? el.closest('[data-bed]') : null;
    return b ? Number(b.getAttribute('data-bed')) : null;
  };
  const onDown = (e) => {
    if (pending || !view) return;
    const i = bedAt(e.clientX, e.clientY);
    if (i == null) return;
    drag.current = { list: [i], set: new Set([i]) };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* capture is a nicety */ }
    setHot([i]);
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const i = bedAt(e.clientX, e.clientY);
    if (i == null || d.set.has(i)) return;
    d.set.add(i); d.list.push(i);
    setHot(d.list.slice());
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    setHot([]);
    if (d) go(d.list);
  };

  const visit = () => {
    const S2 = stateRef.current, P2 = S2 && S2.player;
    if (!S2 || !P2) return;
    /* The trip FarmPanel always made (v2.3.877 / v2.3.3032), unchanged: the
       farm map loads behind the warp and the gate leads back to this door. */
    import('@/rendering/preloadAnimations.js').then((m) => m.preloadZoneAssets('farm_home')).catch(() => {});
    rememberFarmTrip(S2);
    S2.currentZone = 'farm_home';
    updateZoneDimensions('farm_home');
    S2.map = generateZoneMap('farm_home');
    S2.monsters = []; S2.gatherNodes = []; S2.npcs = null;
    const fz = ZONES.farm_home;
    P2.x = Math.floor(fz.w / 2) * TILE;
    P2.y = (fz.h - 4) * TILE;
    S2.groundLoot = []; S2.hitParticles = []; S2.deathExplosions = []; S2.arrows = []; S2._ambientParticles = [];
    S2._zoneWipe = Date.now();
    pushDmgPopup(S2, P2.x, P2.y - 40, 'Your Farm', '#59BF91');
    try { BT_AUDIO.beep(500, 0.08, 0.1, 'sine'); } catch (e) { /* sound only */ }
    setBuildingPanel(null);
  };

  /* The line under the beds: what the last answer did, or why not. */
  let status = null;
  if (pending) status = { text: '…', color: C.mute };
  else if (last && last.err && !(last.did && last.did.n > 0)) status = { text: FARM_ERR_TEXT[last.err] || 'Could not', color: C.bad };
  else if (last && last.did && last.did.n > 0) {
    const d = last.did;
    if (d.op === 'harvest' && d.items) {
      status = { text: Object.keys(d.items).map((k) => '+' + d.items[k] + ' ' + farmItemName(k)).join(' · ') + (d.xp ? ' · +' + d.xp + ' XP' : ''), color: C.good };
    } else if (d.op === 'buy') status = { text: '+' + d.n + ' ' + farmItemName(d.item), color: C.good };
    else {
      const verb = { dig: 'Dug', plant: 'Planted', water: 'Watered', feed: 'Fertilized' }[d.op] || 'Done';
      status = { text: verb + ' ' + d.n + (d.n === 1 ? ' bed' : ' beds') + (last.err ? ' · ' + (FARM_ERR_TEXT[last.err] || '') : ''), color: last.err ? C.brass : C.sub };
    }
  }

  return (
    <div data-farm="1" style={{ margin: -20, background: C.sheet, borderRadius: 14, fontFamily: "'Source Sans 3',sans-serif",
      display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
      {/* header: the farmer you are */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 44px 10px 14px' }}>
        <Icon src="/icons/ui/skill-farming.webp?v=2.3.1224" size={30} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.10em', textTransform: 'uppercase', color: C.text }}>Feed &amp; Seed</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <span data-farm-level={lvl} style={{ fontSize: 12, fontWeight: 800, color: C.brass }}>Farming {lvl}</span>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.well, overflow: 'hidden' }}>
              <div style={{ width: `${pct * 100}%`, height: '100%', background: 'linear-gradient(90deg,#C9923E,#EAC675)' }} />
            </div>
          </div>
        </div>
      </div>
      {/* tabs */}
      <div style={{ display: 'flex', gap: 3, margin: '0 12px 10px', padding: 3, borderRadius: 10, background: C.well }}>
        {[{ id: 'beds', label: 'Beds', g: FARM_LOOK.sprout }, { id: 'seeds', label: 'Seeds', g: FARM_LOOK.seed }].map((t) => (
          <button key={t.id} data-farm-tab={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, minHeight: 44, border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: tab === t.id ? C.raised : 'transparent', boxShadow: tab === t.id ? `inset 0 -2px 0 ${C.brass}` : 'none',
              color: tab === t.id ? C.text : C.mute, fontSize: 13, fontWeight: 800 }}>
            <Glyph g={t.g} size={16} />{t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 12px 12px' }}>
        {tab === 'beds' && (
          !view ? (
            <div data-farm-status="loading" style={{ padding: '28px 0', textAlign: 'center', color: C.mute, fontSize: 13 }}>
              {last && last.err ? (
                <>
                  <div style={{ color: C.bad, marginBottom: 10 }}>{FARM_ERR_TEXT[last.err] || 'Could not'}</div>
                  {last.err !== 'off' && <button onClick={() => farmBus.open(S)} style={btn(true)}>Try again</button>}
                </>
              ) : 'Opening the farm…'}
            </div>
          ) : (
            <>
              {/* tools */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, marginBottom: 8 }}>
                {TOOLS.map((t) => {
                  const on = tool === t.id;
                  return (
                    <button key={t.id} data-farm-tool={t.id} data-farm-tool-on={on ? 1 : 0} onClick={() => setPicked({ tool: t.id, at: Date.now() })}
                      style={{ minHeight: 56, border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', padding: '4px 0',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, position: 'relative',
                        background: on ? C.raised : C.well, boxShadow: on ? `inset 0 0 0 2px ${C.brass}` : 'none',
                        color: on ? C.text : C.sub, fontSize: 11, fontWeight: 800 }}>
                      <Glyph g={t.look} size={20} />{t.label}
                      <span style={{ position: 'absolute', top: 3, right: 4, fontSize: 10, fontWeight: 800, color: toolCount[t.id] ? C.brass : C.faint, fontVariantNumeric: 'tabular-nums' }}>
                        {toolCount[t.id]}
                      </span>
                    </button>
                  );
                })}
              </div>
              {/* which seed the Plant tool sows */}
              {tool === 'plant' && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                  {FARM_CROP_ORDER.map((id) => {
                    const c = FARM.CROPS[id];
                    const open = unlocked(id);
                    const on = open && id === seed;
                    return (
                      <button key={id} data-farm-seed={id} disabled={!open} onClick={() => setSeedPick(id)}
                        style={{ minHeight: 36, padding: '0 9px', borderRadius: 999, border: 'none', fontFamily: 'inherit',
                          cursor: open ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: on ? C.raised : C.well, boxShadow: on ? `inset 0 0 0 2px ${C.brass}` : 'none',
                          color: open ? C.text : C.faint, fontSize: 12, fontWeight: 800, opacity: open ? 1 : 0.7 }}>
                        <Glyph g={c.look} size={15} />{open ? '×' + seedCount(id) : 'Lv ' + c.lvl}
                      </button>
                    );
                  })}
                  {seedCount(seed) <= 0 && (
                    <button onClick={() => setTab('seeds')} style={{ ...btn(true), minHeight: 36, padding: '0 10px' }}>Buy seeds</button>
                  )}
                </div>
              )}
              {/* the beds: tap one, or drag across several */}
              <div data-farm-beds="1" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
                style={{ display: 'grid', gridTemplateColumns: `repeat(${plots.length > 9 ? 5 : 3}, 1fr)`, gap: 6,
                  touchAction: 'none', opacity: pending ? 0.75 : 1 }}>
                {plots.map((p, i) => <Bed key={i} i={i} p={p} now={now} tool={tool} hot={hot.includes(i)} />)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, minHeight: 36 }}>
                <div data-farm-status="1" style={{ flex: 1, fontSize: 12, fontWeight: 700, color: status ? status.color : C.faint, lineHeight: 1.3 }}>
                  {status ? status.text : 'Tap a bed, or drag across them'}
                </div>
                <button data-farm-all={tool} disabled={pending || !count(tool)} onClick={() => go(plots.map((_, i) => i))}
                  style={{ ...btn(!!count(tool) && !pending), minHeight: 36, padding: '0 12px' }}>
                  {TOOLS.find((t) => t.id === tool).label} all
                </button>
              </div>
            </>
          )
        )}

        {tab === 'seeds' && (
          <div data-farm-shop="1">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
              <Chip icon={COIN} color={C.brass}>{coins}</Chip>
            </div>
            {FARM_CROP_ORDER.map((id) => {
              const c = FARM.CROPS[id];
              const open = unlocked(id);
              return (
                <ShopRow key={id} item={c.seed} look={c.look} name={c.name} have={seedCount(id)} price={c.price}
                  coins={coins} locked={open ? null : 'Farming ' + c.lvl} pending={pending}
                  onBuy={(n) => farmBus.buy(S, c.seed, n)}>
                  <Chip>{'⏱ ' + farmTimeLeft(farmGrowMs(c, false))}</Chip>
                  <Chip color={C.water}>{FARM_LOOK.water + ' ' + farmTimeLeft(farmGrowMs(c, true))}</Chip>
                  <Chip>{FARM_LOOK.harvest + ' ×' + farmYieldShown(c, false)}</Chip>
                  <Chip color={C.good}>{FARM_LOOK.compost + ' ×' + farmYieldShown(c, true)}</Chip>
                  <Chip icon={XP} color="#9FD3F0">+{c.xp}</Chip>
                </ShopRow>
              );
            })}
            <ShopRow item={FARM.COMPOST} look={FARM_LOOK.compost} name="Compost" have={compost} price={FARM.COMPOST_PRICE}
              coins={coins} pending={pending} onBuy={(n) => farmBus.buy(S, FARM.COMPOST, n)}>
              <Chip color={C.good}>+50% harvest</Chip>
            </ShopRow>
            {status && (last && last.did && last.did.op === 'buy' || (last && last.err === 'coins')) ? (
              <div data-farm-status="1" style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: status.color }}>{status.text}</div>
            ) : null}
          </div>
        )}

        <button data-farm-visit="1" onClick={visit} style={{ ...btn(true), width: '100%', marginTop: 12, minHeight: 44 }}>
          Visit Your Farm
        </button>
      </div>
    </div>
  );
}

function ShopRow({ item, look, name, have, price, coins, locked, pending, onBuy, children }) {
  const can = (n) => !locked && !pending && coins >= price * n;
  return (
    <div data-farm-row={item} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: `1px solid ${C.line}` }}>
      <Glyph g={look} size={26} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: locked ? C.faint : C.text }}>
          {name} <span style={{ color: C.mute, fontWeight: 700 }}>{'×' + have}</span>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
          {locked ? <Chip color={C.bad}>{'🔒 ' + locked}</Chip> : children}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {[1, 5].map((n) => (
          <button key={n} data-farm-buy={item} data-farm-buy-n={n} disabled={!can(n)} onClick={() => onBuy(n)}
            style={{ ...btn(can(n)), minHeight: 34, padding: '0 8px', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
            {'+' + n} <Icon src={COIN} size={13} />{price * n}
          </button>
        ))}
      </div>
    </div>
  );
}

function btn(on) {
  return {
    border: `1px solid ${on ? 'rgba(229,237,233,.20)' : 'rgba(229,237,233,.08)'}`, borderRadius: 10, cursor: on ? 'pointer' : 'default',
    background: on ? C.raised : C.well, color: on ? C.text : C.faint, fontFamily: 'inherit', fontWeight: 800, fontSize: 13,
  };
}
