import React from 'react';
import { BT_AUDIO, LIFE_SKILL_XP, generateZoneMap, updateZoneDimensions } from '@/data/index.js';
import { FARM, FARM_CROP_ORDER, FARM_LOOK, farmGrowMs, farmYieldShown, farmTimeLeft } from '@/data/farmCrops.js';
import { farmBus } from '@/ui/mobile/farmBus.js';
import { FARM_ERR_TEXT, farmItemName } from '@/game/farmFeedback.js';
import { pushDmgPopup } from '@/game/combatHelpers.js';
import { rememberFarmTrip } from '@/game/wheelTownDoors.js';
import { ITEM_NAMES, iconFor, thumbFor } from '@/ui/mobile/dash/InventoryPanel.jsx';   /* v2.3.3118: the order board names and draws goods as the bag does */
import { FARM_ART } from '@/data/farmArt.js';   /* v2.3.3124: the owner's farm pictures */
import { farmArtUrl } from '@/rendering/farmWorld.js';
import { FARM_ARRIVE } from '@/data/farmLayout.js';   /* v2.3.3124: the farm you walk */
import { holdFarmUntilReady } from '@/game/farmTrip.js';

/* ═══ v2.3.3111: THE FEED & SEED, A REAL FARM ═══
 *
 * Owner: "mechanics similar to the old FarmVille game where you have to wait
 * to harvest and each has a wait time different depending on what it is.
 * Need to dig, plant seeds, fertilize, water, etc."  Then: "Good.  Go ahead
 * and build it" (docs/FARMING-PLAN.md, Phase 1).
 *
 * ═══ v2.3.3124: ...AND THE BEDS ARE ON YOUR FARM, NOT IN HERE ═══
 * The owner, 2026-10-06: "Hold on I don't want this type of farming.  I want
 * your character to be able to walk around on the farm.  I want the planting
 * process to happen by your character taking action on the plot of ground
 * ... I don't want the game to just be reading a bunch of boring menus."  So
 * the Beds tab -- the tools, the drag across six squares -- is gone: the beds
 * are worked where they lie (game/farmWalk.js, rendering/farmWorld.js).  The
 * Feed & Seed is the farm's SHOP and its order board, as a town's store is:
 * seeds and compost (Seeds), today's three orders (Orders), a line saying how
 * your beds are doing, and the way to them (Visit Your Farm).
 *
 * The window is drawn from what the WORKER says (server/src/farm.js, through
 * ui/mobile/farmBus.js), against a worker that advertises caps.farm;
 * otherwise FarmPanel keeps its old browser-only face (rule 19).  No local
 * prediction: a tap asks the worker, the window shows its answer.
 *
 * Test hooks: data-farm, data-farm-tab, data-farm-buy, data-farm-row,
 * data-farm-pic, data-farm-locked(-crop), data-farm-status, data-farm-visit,
 * data-farm-summary; window.__btFarm (the bus).
 * v2.3.3118: data-farm-orders, data-farm-order={slot} / data-farm-order-done,
 * data-farm-deliver={slot}, data-farm-orders-reset. */

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

/* ═══ v2.3.3124: THE OWNER'S PICTURES ═══
   Each crop as the owner drew it grown, and the compost bin (ChatGPT, from
   docs/art/FARM-ART-PROMPTS.md, cut into game sprites by
   tools/world/add-farm-art.mjs: public/world/farm/, src/data/farmArt.js).
   Plain <img>s, drawn smooth as the bag draws its item pictures (a third of
   their own size: shrunk by dropping pixels, leaves turn to grit).  A crop a
   newer worker grows, with no picture here, keeps its glyph. */
const hasArt = (name) => typeof name === 'string' && Object.prototype.hasOwnProperty.call(FARM_ART, name);
const FarmPic = ({ name, g, size = 26 }) => (hasArt(name)
  ? <img src={farmArtUrl(name)} alt="" draggable={false} data-farm-pic={name}
      style={{ width: size, height: size, objectFit: 'contain', imageRendering: 'auto', flex: 'none' }}
      onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
  : <Glyph g={g} size={size} />);
function Chip({ children, color, icon }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 999,
      background: C.well, fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: color || C.sub, whiteSpace: 'nowrap' }}>
      {icon ? <Icon src={icon} size={14} /> : null}{children}
    </span>
  );
}

/* v2.3.3124: how your beds are doing, in one line -- what is ready, what is
   growing, what waits for you -- so the window says when the farm is worth a
   visit (the beds themselves are on the farm) */
function farmSummary(view, now) {
  if (!view || !Array.isArray(view.plots)) return null;
  let ready = 0, growing = 0, waiting = 0;
  for (let i = 0; i < Math.min(view.beds, view.plots.length); i++) {
    const p = view.plots[i];
    if (p && p.s === 'planted') { if (now >= p.readyAt) ready += 1; else growing += 1; } else waiting += 1;
  }
  const parts = [];
  if (ready) parts.push(ready + ' ready to harvest');
  if (growing) parts.push(growing + ' growing');
  if (waiting) parts.push(waiting + (waiting === 1 ? ' bed' : ' beds') + ' to plant');
  return { ready, text: parts.join(' · ') };
}

export function FeedSeedPanel({ rpgState, stateRef, setBuildingPanel, closed }) {
  const S = stateRef.current || {};
  React.useSyncExternalStore(farmBus.subscribe, farmBus.getSnapshot);
  const R = rpgState || {};
  const inv = R.inventory || {};
  const coins = R.coins || 0;
  const skill = (R.lifeSkills && R.lifeSkills.farming) || { level: 1, xp: 0 };
  const lvl = skill.level || 1;
  const need = LIFE_SKILL_XP(lvl);
  const pct = Math.max(0, Math.min(1, (skill.xp || 0) / need));

  /* v2.3.3124: Seeds first -- the beds are on your farm now */
  const [tab, setTab] = React.useState('seeds');
  const [, tick] = React.useReducer((x) => x + 1, 0);

  /* Ask the worker for the farm when the window opens (its summary and
     today's orders); redraw once a second so the board's countdown counts
     down (the times are the worker's, not ours). */
  /* v2.3.3111: `closed` (FarmPanel: the worker's kill switch) asks nothing --
     the switch can outlive a rollback to a worker with no farm at all, which
     would hand a farm_open to the whole room. */
  React.useEffect(() => { if (!closed) farmBus.open(S); }, []);
  React.useEffect(() => { const t = setInterval(tick, 1000); return () => clearInterval(t); }, []);

  const view = farmBus.view;
  const now = farmBus.serverNow();
  /* v2.3.3118 (review): yesterday's board, past midnight by the worker's
     clock -- its Deliver stays dark while the new one is asked for. */
  const boardOld = !!(farmBus.orders && now >= farmBus.orders.resetsAt);
  const pending = !!farmBus.pending;
  const summary = farmSummary(view, now);
  const last = farmBus.last;

  const unlocked = (id) => lvl >= FARM.CROPS[id].lvl;
  /* v2.3.3115: only the crops THIS worker grows (caps.farmCrops counts them,
     in the order they came -- FARM.CROPS' own).  A newer page offered an
     older worker's farm the potato and the pumpkin, and the buy hung on "No
     answer yet" (review).  A farm worker from before it grows the first four. */
  const grownCount = S._serverCaps && typeof S._serverCaps.farmCrops === 'number' ? S._serverCaps.farmCrops : 4;
  /* v2.3.3118: the order board, only on a worker that has one (caps.farmorders;
     an older worker has no case for farm_order and would rebroadcast it). */
  const ordersOn = !!(S._serverCaps && S._serverCaps.farmorders);
  const board = ordersOn ? farmBus.orders : null;
  /* v2.3.3118 (review): the board asks for itself.  At midnight, with the
     window open, it asks for the new day's board -- "New orders in 0m" stood
     beside yesterday's until a refused tap or a reopen; and the Orders tab
     with no board yet asks once (a page that rejoined a worker with the
     board after it opened, its first ask answered by one without). */
  const askedReset = React.useRef(0);
  const askedBoard = React.useRef(false);
  React.useEffect(() => {
    if (closed || !ordersOn || farmBus.pending) return;
    const b = farmBus.orders;
    if (b && farmBus.serverNow() >= b.resetsAt && askedReset.current !== b.resetsAt) {
      askedReset.current = b.resetsAt;
      farmBus.open(S);
    } else if (!b && !farmBus.ordersSeen && tab === 'orders' && !askedBoard.current) {
      askedBoard.current = true;
      farmBus.open(S);
    }
  });
  const CROP_IDS = Object.keys(FARM.CROPS);
  const crops = FARM_CROP_ORDER.filter((id) => CROP_IDS.indexOf(id) < grownCount);
  /* v2.3.3119: the Farming levels that still have crops to open, lowest first. */
  const lockedLevels = Array.from(new Set(crops.filter((id) => !unlocked(id)).map((id) => FARM.CROPS[id].lvl))).sort((a, b) => a - b);
  const seedCount = (id) => Math.floor(inv[FARM.CROPS[id].seed] || 0);
  const compost = Math.floor(inv[FARM.COMPOST] || 0);

  const visit = () => {
    const S2 = stateRef.current, P2 = S2 && S2.player;
    if (!S2 || !P2) return;
    /* The trip FarmPanel always made (v2.3.877 / v2.3.3032), unchanged: the
       farm map loads behind the warp and the gate leads back to this door. */
    rememberFarmTrip(S2);
    S2.currentZone = 'farm_home';
    updateZoneDimensions('farm_home');
    S2.map = generateZoneMap('farm_home');
    S2.monsters = []; S2.gatherNodes = []; S2.npcs = null;
    /* v2.3.3124: in at the farm's gate (data/farmLayout.js), under the
       farm's loading screen until it is all there (game/farmTrip.js) */
    P2.x = FARM_ARRIVE.x; P2.y = FARM_ARRIVE.y; P2.vx = 0; P2.vy = 0;
    holdFarmUntilReady(S2);
    S2.groundLoot = []; S2.hitParticles = []; S2.deathExplosions = []; S2.arrows = []; S2._ambientParticles = [];
    S2._zoneWipe = Date.now();
    pushDmgPopup(S2, P2.x, P2.y - 40, 'Your Farm', '#59BF91');
    try { BT_AUDIO.beep(500, 0.08, 0.1, 'sine'); } catch (e) { /* sound only */ }
    setBuildingPanel(null);
  };

  /* What the last answer did, or why not (a buy's or an order's). */
  let status = null;
  if (pending) status = { text: '…', color: C.mute };
  else if (last && last.err && !(last.did && last.did.n > 0)) status = { text: FARM_ERR_TEXT[last.err] || 'Could not', color: C.bad };
  else if (last && last.did && last.did.n > 0) {
    const d = last.did;
    if (d.op === 'harvest' && d.items) {
      status = { text: Object.keys(d.items).map((k) => '+' + d.items[k] + ' ' + farmItemName(k)).join(' · ') + (d.xp ? ' · +' + d.xp + ' XP' : ''), color: C.good };
    } else if (d.op === 'buy') status = { text: '+' + d.n + ' ' + farmItemName(d.item), color: C.good };
    else if (d.op === 'order') status = { text: 'Delivered · +' + d.gold + ' gold · +' + d.xp + ' XP', color: C.good };   /* v2.3.3118 */
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
      {/* v2.3.3124: your farm -- how its beds are doing, and the way there */}
      <div style={{ margin: '0 12px 10px' }}>
        {!closed && summary && summary.text ? (
          <div data-farm-summary={summary.ready} style={{ fontSize: 12, fontWeight: 700, color: summary.ready ? C.good : C.sub, marginBottom: 6 }}>
            {'Your farm: ' + summary.text}
          </div>
        ) : null}
        <button data-farm-visit="1" onClick={visit} style={{ ...btn(true), width: '100%', minHeight: 44,
          border: `1.5px solid ${C.brass}`, color: C.text }}>
          Visit Your Farm
        </button>
      </div>
      {/* tabs */}
      {!closed && <div style={{ display: 'flex', gap: 3, margin: '0 12px 10px', padding: 3, borderRadius: 10, background: C.well }}>
        {[{ id: 'seeds', label: 'Seeds', g: FARM_LOOK.seed }]
          .concat(ordersOn ? [{ id: 'orders', label: 'Orders', g: '\uD83D\uDCDC' }] : []).map((t) => (
          <button key={t.id} data-farm-tab={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, minHeight: 44, border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: tab === t.id ? C.raised : 'transparent', boxShadow: tab === t.id ? `inset 0 -2px 0 ${C.brass}` : 'none',
              color: tab === t.id ? C.text : C.mute, fontSize: 13, fontWeight: 800 }}>
            <Glyph g={t.g} size={16} />{t.label}
          </button>
        ))}
      </div>}

      <div style={{ padding: '0 12px 12px' }}>
        {closed && (
          <div data-farm-status="closed" style={{ padding: '24px 0 8px', textAlign: 'center' }}>
            <div style={{ color: C.text, fontSize: 14, fontWeight: 800 }}>{FARM_ERR_TEXT.off}</div>
            <div style={{ color: C.sub, fontSize: 12, marginTop: 6 }}>Your beds keep growing.</div>
          </div>
        )}
        {!closed && tab === 'seeds' && (
          <div data-farm-shop="1">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
              <Chip icon={COIN} color={C.brass}>{coins}</Chip>
            </div>
            {crops.filter(unlocked).map((id) => {
              const c = FARM.CROPS[id];
              return (
                <ShopRow key={id} item={c.seed} look={c.look} pic={id + '-ripe'} name={c.name} have={seedCount(id)} price={c.price}
                  coins={coins} locked={null} pending={pending}
                  onBuy={(n) => farmBus.buy(S, c.seed, n)}>
                  <Chip>{'⏱ ' + farmTimeLeft(farmGrowMs(c, false))}</Chip>
                  <Chip color={C.water}>{FARM_LOOK.water + ' ' + farmTimeLeft(farmGrowMs(c, true))}</Chip>
                  <Chip>{FARM_LOOK.harvest + ' ×' + farmYieldShown(c, false)}</Chip>
                  <Chip color={C.good}>{FARM_LOOK.compost + ' ×' + farmYieldShown(c, true)}</Chip>
                  <Chip icon={XP} color="#9FD3F0">+{c.xp}</Chip>
                </ShopRow>
              );
            })}
            <ShopRow item={FARM.COMPOST} look={FARM_LOOK.compost} pic="compost-bin" name="Compost" have={compost} price={FARM.COMPOST_PRICE}
              coins={coins} pending={pending} onBuy={(n) => farmBus.buy(S, FARM.COMPOST, n)}>
              <Chip color={C.good}>+50% harvest</Chip>
            </ShopRow>
            {/* v2.3.3119: the crops still to come, one line a level -- twelve
                locked rows stood between a new farmer and the compost. */}
            {lockedLevels.map((l) => (
              <div key={l} data-farm-locked={l} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', padding: '8px 0',
                borderTop: `1px solid ${C.line}`, fontSize: 12, color: C.sub }}>
                <span style={{ fontWeight: 800, color: C.mute }}>{'🔒 Farming ' + l}</span>
                {crops.filter((id) => FARM.CROPS[id].lvl === l).map((id) => (
                  <span key={id} data-farm-locked-crop={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <FarmPic name={id + '-ripe'} g={FARM.CROPS[id].look} size={18} />{FARM.CROPS[id].name}
                  </span>
                ))}
              </div>
            ))}
            {/* v2.3.3111: every answer to a buy -- and its silence: a timeout
                said nothing here, so the buttons just woke up again and invited a
                second purchase of something the worker may already have sold. */}
            {status && last && ((last.did && last.did.op === 'buy') || last.op === 'buy' || last.err === 'off') ? (
              <div data-farm-status="1" style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: status.color }}>{status.text}</div>
            ) : null}
          </div>
        )}

        {/* ═══ v2.3.3118: THE ORDER BOARD (server farmorders.js) ═══
            Three orders a day, each the worker's: what it wants, what it
            pays, whether it is done.  Deliver is lit only when the bag holds
            enough -- the worker checks again and takes the goods itself. */}
        {!closed && tab === 'orders' && (
          <div data-farm-orders="1" data-farm-orders-old={boardOld ? 1 : 0}>
            {!board ? (
              /* v2.3.3118 (review): closed, failed or on its way -- this was "…"
                 for all three, forever (farmBus.ordersSeen). */
              <div data-farm-status={farmBus.ordersSeen ? 'orders-closed' : 'loading'} style={{ padding: '28px 0', textAlign: 'center', color: C.mute, fontSize: 13 }}>
                {farmBus.ordersSeen ? (
                  <div style={{ color: C.text, fontWeight: 800 }}>{FARM_ERR_TEXT['orders-closed']}</div>
                ) : last && last.err && last.op === 'open' && !pending ? (
                  <>
                    <div style={{ color: C.bad, marginBottom: 10 }}>{FARM_ERR_TEXT[last.err] || 'Could not'}</div>
                    {last.err !== 'off' && last.err !== 'newer' && <button onClick={() => farmBus.open(S)} style={{ ...btn(true), minHeight: 44, padding: '0 18px' }}>Try again</button>}
                  </>
                ) : 'Opening the orders…'}
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.sub }}>Today's orders</span>
                  <Chip icon={COIN} color={C.brass}>{coins}</Chip>
                </div>
                {board.list.map((o, i) => {
                  if (o.gone) {
                    return (
                      <div key={i} data-farm-order={i} style={{ padding: '10px 0', borderTop: `1px solid ${C.line}`, fontSize: 12, color: C.faint }}>
                        {FARM_ERR_TEXT['order-gone']}
                      </div>
                    );
                  }
                  const have = Math.floor(inv[o.key] || 0);
                  const can = !o.done && !pending && !boardOld && have >= o.n;
                  return (
                    <div key={i} data-farm-order={i} data-farm-order-done={o.done ? 1 : 0}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: `1px solid ${C.line}` }}>
                      {thumbFor(o.key) ? <Icon src={thumbFor(o.key)} size={26} /> : <Glyph g={iconFor(o.key)} size={26} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: o.done ? C.mute : C.text }}>
                          {o.n + ' × ' + (ITEM_NAMES[o.key] || 'Goods')}
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                          <Chip color={have >= o.n ? C.good : C.sub}>{'You have ' + have}</Chip>
                          <Chip icon={COIN} color={C.brass}>{'+' + o.gold}</Chip>
                          <Chip icon={XP} color="#9FD3F0">{'+' + o.xp}</Chip>
                        </div>
                      </div>
                      {o.done ? (
                        <span style={{ fontSize: 12, fontWeight: 800, color: C.good, minWidth: 76, textAlign: 'center' }}>Delivered ✓</span>
                      ) : (
                        <button data-farm-deliver={i} disabled={!can} onClick={() => farmBus.order(S, i)}
                          style={{ ...btn(can), minHeight: 44, minWidth: 76, padding: '0 10px', fontSize: 12 }}>
                          Deliver
                        </button>
                      )}
                    </div>
                  );
                })}
                <div data-farm-orders-reset="1" style={{ marginTop: 8, fontSize: 12, color: C.mute }}>
                  {boardOld ? 'New orders are on their way…' : 'New orders in ' + farmTimeLeft(Math.max(0, board.resetsAt - now))}
                </div>
                {boardOld && last && last.err && last.op === 'open' && !pending && last.err !== 'off' && last.err !== 'newer' ? (
                  <button onClick={() => farmBus.open(S)} style={{ ...btn(true), minHeight: 44, padding: '0 18px', marginTop: 6 }}>Try again</button>
                ) : null}
                {status && last && ((last.did && last.did.op === 'order') || last.op === 'order') ? (
                  <div data-farm-status="1" style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: status.color }}>{status.text}</div>
                ) : null}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

function ShopRow({ item, look, pic, name, have, price, coins, locked, pending, onBuy, children }) {
  const can = (n) => !locked && !pending && coins >= price * n;
  return (
    <div data-farm-row={item} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: `1px solid ${C.line}` }}>
      <FarmPic name={pic} g={look} size={34} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: locked ? C.faint : C.text }}>
          {name} <span style={{ color: C.mute, fontWeight: 700 }}>{'×' + have}</span>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
          {locked ? <Chip color={C.bad}>{'🔒 ' + locked}</Chip> : children}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1, 5].map((n) => (
          <button key={n} data-farm-buy={item} data-farm-buy-n={n} disabled={!can(n)} onClick={() => onBuy(n)}
            style={{ ...btn(can(n)), minHeight: 44, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
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
