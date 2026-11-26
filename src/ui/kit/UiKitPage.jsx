/* ═══ v2.3.6680: THE KIT'S PAGE, `?uikit=1` (card UI2, the build's step 1) ═══
 *
 * The spec's "component preview/test fixture": every piece of the kit in
 * every state, and TWO samples composed from it (the Bro landing, the
 * Character page), each INSIDE a box of the dashboard's real size on this
 * screen: the game's own sizes (sheetGeometry.js barHeight, identityRowHeight;
 * at 390 x 844 a 390 x 243 band, its 52 px header row, a 191 px page), and
 * on a computer the band's 480 px at most.  The samples are SAMPLES: the live
 * Bro tab is not changed by this page.
 *
 * It lies over the game (the world goes on under it).  The samples show a
 * player's real data when the state is HANDED to the page: the global is
 * closed to new readers (open-hand.test), so a QA page's harness hands it
 * (`window.__btUiKitHand(S)`, mp-uikit); with none handed, the samples say
 * so, honestly empty.  The serif loads behind the page's own "Loading the kit"
 * (document.fonts.load; a face that fails, the fallback serif).  QA reads
 * window.__btUiKit. */
import React, { useEffect, useState } from 'react';
import {
  Ui2Frame, Ui2Header, Ui2Tile, Ui2Group, Ui2Value, Ui2Stat, Ui2Action, Ui2ActionRow, Ui2Disabled,
  Ui2Slot, Ui2Progress, Ui2Loading, ui2RootClass,
  Ui2Zones, Ui2Actions, Ui2Empty, Ui2Confirm,
} from './index.js';
import { UI2_SIZE, UI2_SPACE, UI2_ACTION_NAMES, UI2_GRADES, UI2_FONT, UI2_TYPE } from '@/game/ui2Tokens.js';
import { barHeight, identityRowHeight, BAND_ASSEMBLY_MAX_W } from '../mobile/sheet/sheetGeometry.js';
import { computerFrame } from '@/game/deviceProfile.js';   /* a computer's window: the band is one block, 480 px at most */
import { winVw, winVh } from '../mobile/playViewport.js';
import { readKitPlayer, KIT_ART } from './sampleData.js';
import { assetUrl } from '../../game/assetUrl.js';   /* v2.3.6743: an icon built from parts gets its file's version (card KEEP PR 3b) */

/* the band's room on this screen: the game's own functions, and its rule for a
   phone on its side and a computer (never over 243, never over a third) */
export function kitRoom(w, h, desk) {
  const upright = h > w;
  let bh = barHeight(w, h);
  if (!upright || desk) bh = Math.min(bh, 243, Math.floor(h / 3));
  const head = identityRowHeight(w, h);
  const bw = desk ? Math.min(w, BAND_ASSEMBLY_MAX_W) : w;
  /* the page's content box: the frame's rim, the page's margin and its pad */
  const rim = UI2_SIZE.rim;
  const cw = bw - 2 * rim - 2 * UI2_SPACE.s - 2 * UI2_SPACE.s;
  const ch = bh - 2 * rim - head - UI2_SPACE.s - 2 * UI2_SPACE.s;
  return { w: bw, h: bh, head, cw, ch, wide: cw >= 560 };
}

const G = UI2_SPACE.m;
const grid = (cols, rows, extra) => ({ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`, gap: G, height: '100%', ...extra });
const row = (extra) => ({ display: 'flex', gap: G, alignItems: 'stretch', minWidth: 0, ...extra });
const col = (extra) => ({ display: 'flex', flexDirection: 'column', gap: G, minWidth: 0, ...extra });
const ACT_WORD = Object.freeze({ gold: 'Equip', green: 'Accept', blue: 'Travel', red: 'Delete', silver: 'Cancel' });

function Plate({ id, caption, room, title = 'Bro', head, children }) {
  return (
    <figure style={{ margin: '0 0 14px' }} data-u2-plate={id}>
      <figcaption style={{ font: `${UI2_TYPE.small}px/1.3 'Source Sans 3', sans-serif`, color: '#BCC8CC', margin: '0 0 4px 2px' }}>{caption}</figcaption>
      <Ui2Frame w={room.w} h={room.h} headH={room.head} label={caption} head={head || <Ui2Header title={title} />}>
        {children}
      </Ui2Frame>
    </figure>
  );
}

/* ── the pieces, every state ── */
function TilesPlate({ room }) {
  const n = 8;
  const cols = room.wide ? 8 : 4;
  const rows = room.wide ? 1 : 2;
  const cellH = Math.floor((room.ch - (rows - 1) * G) / rows);
  const art = Math.max(20, Math.min(46, cellH - 34));
  const T = [
    { label: 'Default' }, { label: 'Pressed', state: 'pressed' }, { label: 'Selected', selected: true },
    { label: 'Focused', state: 'focused' }, { label: 'Locked', locked: true }, { label: 'Count', badge: 3 },
    { label: 'New', dot: true }, { label: 'Rare event', glow: true },
  ];
  const arts = [KIT_ART.character, KIT_ART.combat, KIT_ART.equipment, KIT_ART.life, KIT_ART.feats, KIT_ART.pets, KIT_ART.quests, KIT_ART.clan];
  return (
    <div style={grid(cols, rows)}>
      {T.slice(0, n).map((t, i) => <Ui2Tile key={t.label} art={arts[i]} artSize={art} {...t} data-u2-demo={t.label} />)}
    </div>
  );
}

function ActionsPlate({ room }) {
  const cols = room.wide ? 10 : 5;
  const rows = room.wide ? 1 : 2;
  const cells = [];
  for (const c of UI2_ACTION_NAMES) cells.push(<Ui2Action key={c} c={c} label={ACT_WORD[c]} style={{ padding: '0 4px' }} data-u2-demo={c} />);
  for (const c of UI2_ACTION_NAMES) cells.push(<Ui2Action key={c + 'p'} c={c} label={ACT_WORD[c]} state="pressed" style={{ padding: '0 4px' }} data-u2-demo={c + ' pressed'} />);
  return <div style={grid(cols, rows, { height: rows === 1 ? UI2_SIZE.touch : '100%', alignContent: 'start', gridTemplateRows: `repeat(${rows}, ${UI2_SIZE.touch}px)` })}>{cells}</div>;
}

function ActionUsePlate({ room }) {
  const price = { art: KIT_ART.gold, text: '1,250' };
  const items = [
    <Ui2ActionRow key="buy" aside={price}><Ui2Action c="gold" label="Buy" wide /></Ui2ActionRow>,
    <Ui2Disabled key="off" c="gold" label="Equip" why="Needs Sword level 12" />,
    <div key="pend" style={row()}><Ui2Action c="green" label="Claim" pending style={{ flex: 1 }} /><Ui2Action c="blue" label="Travel" state="focused" style={{ flex: 1 }} /><Ui2Action c="silver" label="Cancel" style={{ flex: 1 }} /></div>,
  ];
  if (room.wide) return <div style={row({ alignItems: 'center', height: '100%' })}>{items.map((x, i) => <div key={i} style={{ flex: [1.1, 1.5, 1.6][i], minWidth: 0 }}>{x}</div>)}</div>;
  return <div style={col({ justifyContent: 'flex-start' })}>{items}</div>;
}

function InfoPlate({ room }) {
  const stats = (
    <div style={row({ flex: room.wide ? '1.4 1 0' : '0 0 auto' })}>
      <Ui2Stat v="1,284" k="DPS" art="/icons/ui/hero/dps.webp" style={{ flex: 1 }} />
      <Ui2Stat v="312" k="Defense" art="/icons/ui/hero/defense.webp" state="pressed" style={{ flex: 1 }} />
      <Ui2Stat v="18%" k="Crit" art="/icons/ui/hero/crit.webp" selected style={{ flex: 1 }} />
    </div>
  );
  const bars = (
    <Ui2Group style={{ flex: room.wide ? '1 1 0' : '0 0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
      <Ui2Progress value={0.62} left="Experience" right="62%" label="Experience" />
      <Ui2Progress value={1} left="Crafting" right="Done" label="Crafting" />
    </Ui2Group>
  );
  const vals = (
    <div style={row({ flex: room.wide ? '1 1 0' : '0 0 auto' })}>
      <Ui2Group k="Clan" style={{ flex: 1 }}><Ui2Value v="No clan" none /></Ui2Group>
      <Ui2Group k="Gold" style={{ flex: 1 }}><Ui2Value v="1,250" /></Ui2Group>
    </div>
  );
  return <div style={room.wide ? row({ height: '100%' }) : col()}>{stats}{bars}{vals}</div>;
}

function SlotsPlate({ room }) {
  const s = room.wide ? 40 : 44;
  const art = '/icons/items/' ;
  const pics = ['sword-blacksteel.webp', 'bow.webp', 'staff.webp', 'chest-plate-iron.webp'];
  const slots = (
    <div style={row({ alignItems: 'center', flex: '0 0 auto' })}>
      {UI2_GRADES.map((g, i) => <Ui2Slot key={g} grade={g} size={s} art={assetUrl(art + pics[i])} name={g} />)}
      <Ui2Slot grade="rare" size={s} art={assetUrl(art + pics[1])} state="selected" />
      <Ui2Slot grade="elite" size={44} art={assetUrl(art + pics[2])} state="focused" onClick={() => {}} />
      <Ui2Slot size={s} empty />
    </div>
  );
  const marks = (
    <div style={row({ flex: room.wide ? '1 1 0' : '0 0 auto' })}>
      <Ui2Tile size="compact" art={KIT_ART.quests} label="Quests" sub="2 to hand in" badge={2} style={{ flex: room.wide ? '1 0 auto' : 1 }} />
      <Ui2Tile size="compact" art={KIT_ART.life} label="Skills" sub="A new level" dot style={{ flex: room.wide ? '1 0 auto' : 1 }} />
    </div>
  );
  const load = <Ui2Group style={{ flex: room.wide ? '1 1 0' : '1 1 auto', minWidth: 0 }}><Ui2Loading rows={2} words={room.wide && room.cw < 760 ? 'Loading\u2026' : 'Loading the market\u2026'} /></Ui2Group>;
  return <div style={room.wide ? row({ height: '100%', alignItems: 'center' }) : col({ height: '100%' })}>{slots}{marks}{load}</div>;
}

/* ── the two samples ── */
function BroSample({ room, me }) {
  const cols = room.wide ? 6 : 3;
  const rows = room.wide ? 1 : 2;
  const cellH = Math.floor((room.ch - (rows - 1) * G) / rows);
  const art = Math.max(22, Math.min(52, cellH - 32));
  const T = [
    ['Character', KIT_ART.character, {}],
    ['Combat', KIT_ART.combat, { badge: me ? me.points : 0 }],
    ['Equipment', KIT_ART.equipment, {}],
    ['Life Skills', KIT_ART.life, { dot: me ? me.lifeNew : false }],
    ['Feats', KIT_ART.feats, {}],
    ['Pets', KIT_ART.pets, {}],
  ];
  return <div style={grid(cols, rows)}>{T.map(([l, a, x]) => <Ui2Tile key={l} label={l} art={a} artSize={art} {...x} data-u2-door={l} />)}</div>;
}

function CharacterSample({ room, me }) {
  const none = !me;
  const W = me ? me.weapons : [{ cat: 'sword', label: 'Sword', art: KIT_ART.sword }, { cat: 'bow', label: 'Bow', art: KIT_ART.bow }, { cat: 'staff', label: 'Staff', art: KIT_ART.staff }];
  const lv = (v) => (none ? '—' : v);
  const face = me ? me.portrait : KIT_ART.character;
  const port = room.wide ? Math.min(56, room.ch) : 76;
  const portrait = (
    <span className="u2-group" style={{ width: port, height: port, padding: 2, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }} data-u2-portrait="">
      <img src={face} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 7 }} />
    </span>
  );
  const nm = none ? 'No player' : me.name;
  /* a long name steps down a size rather than lose its end (the game's names run to 16 letters) */
  const nmSize = nm.length <= 10 ? UI2_TYPE.title : nm.length <= 13 ? UI2_TYPE.value : UI2_TYPE.label;
  const name = <span style={{ fontSize: nmSize, fontWeight: 700, whiteSpace: 'nowrap', textShadow: '0 1px 0 rgba(0,0,0,.55)' }} data-u2-name="">{nm}</span>;
  const title = <Ui2Stat v={none ? '—' : (me.title || 'No title')} k="Title" style={{ minWidth: 0 }} data-u2-title="" />;
  const combat = (
    <Ui2Group style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: '2px 8px' }} data-u2-combat="">
      <span className="u2-group-k">Combat Lv</span>
      <span style={{ fontSize: room.wide ? UI2_TYPE.value : UI2_TYPE.big, fontWeight: 700, color: 'var(--ui2-text-gold)', lineHeight: 1.05 }}>{lv(me && me.level)}</span>
    </Ui2Group>
  );
  const weapon = (w) => (room.wide ? (
    <Ui2Group key={w.cat} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 6px', flex: 1, minHeight: 0 }} data-u2-weapon={w.cat}>
      <img src={w.art} alt="" draggable={false} style={{ width: 22, height: 22, objectFit: 'contain' }} />
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span className="u2-group-k">{w.label}</span>
        <span style={{ whiteSpace: 'nowrap', fontSize: UI2_TYPE.small }}>Lv <b style={{ color: 'var(--ui2-text-gold)', fontSize: UI2_TYPE.value }}>{lv(w.lvl)}</b></span>
      </span>
    </Ui2Group>
  ) : (
    <Ui2Group key={w.cat} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 8px', flex: 1, minHeight: 0 }} data-u2-weapon={w.cat}>
      <img src={w.art} alt="" draggable={false} style={{ width: 22, height: 22, objectFit: 'contain' }} />
      <span style={{ fontSize: UI2_TYPE.label, fontWeight: 700, flex: 1 }}>{w.label}</span>
      <span style={{ fontSize: UI2_TYPE.label, whiteSpace: 'nowrap' }}><span className="u2-group-k" style={{ display: 'inline' }}>Lv </span><b style={{ color: 'var(--ui2-text-gold)', fontSize: UI2_TYPE.value }}>{lv(w.lvl)}</b></span>
    </Ui2Group>
  ));
  const fact = (k, v, isNone, art) => (
    <Ui2Group key={k} k={k} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }} data-u2-fact={k}>
      <Ui2Value v={v} none={isNone} />
    </Ui2Group>
  );
  const facts = [
    fact('Clan', none ? '—' : (me.clan || 'No clan'), none || !me.clan),
    fact('Guild', 'Skill guilds', false),   /* v2.3.6684: the ten skill guilds every player is in (the passport's line; no guild name invented) */
    fact('Feats', none ? '—' : me.ap.toLocaleString('en-US') + ' pts', none),
    fact('Quests', none ? '—' : me.quests + ' done', none),
  ];
  if (room.wide) {
    return (
      <div style={row({ height: '100%', alignItems: 'center' })}>
        {portrait}
        <div style={col({ gap: 2, flex: '1.2 1 0', justifyContent: 'center' })}>{name}{combat}</div>
        <div style={{ flex: '1.2 1 0', minWidth: 0 }}>{title}</div>
        {W.map((w) => <div key={w.cat} style={{ flex: '1 1 0', minWidth: 0, height: 44, display: 'flex' }}>{weapon(w)}</div>)}
        {facts.slice(2).map((f, i) => <div key={i} style={{ flex: '0.9 1 0', minWidth: 0, height: 52, display: 'flex' }}>{f}</div>)}
      </div>
    );
  }
  return (
    <div style={col({ height: '100%' })}>
      <div style={row({ flex: '1 1 auto', minHeight: 0 })}>
        <div style={col({ flex: '1.15 1 0' })}>
          <div style={row()}>{portrait}<div style={col({ flex: 1, gap: 4, justifyContent: 'space-between' })}>{name}{title}</div></div>
          {combat}
        </div>
        <div style={col({ flex: '1 1 0', gap: 4 })}>{W.map(weapon)}</div>
      </div>
      <div style={row({ flex: '0 0 52px' })}>{facts}</div>
    </div>
  );
}

/* ── v2.3.6683 (card UI2-bro): a screen's pieces ── */
/* the zones: identity, summary and actions drawn, the doors' zone empty and its room given back;
   the row of actions in fixed slots: Equip on, Sell off with its own rule's reason, slot 1 empty
   (nobody moves over), Drop pending, Trade waiting with its outcome unknown */
function ZonesPlate({ room }) {
  const acts = [
    { id: 'equip', slot: 0, cost: 'routine', label: 'Equip', c: 'gold', check: () => null, onPress: () => {} },
    { id: 'sell', slot: 2, cost: 'costly', label: 'Sell', c: 'gold', check: () => 'Not at a shop' },
    { id: 'drop', slot: 3, cost: 'irreversible', label: 'Drop', c: 'red', check: () => null },
  ];
  return (
    <Ui2Zones
      identity={<div style={row({ alignItems: 'center' })}><img src={KIT_ART.character} alt="" style={{ width: 40, height: 40 }} /><Ui2Group k="Identity" style={{ flex: 1 }}><Ui2Value v="A name, a title, a level" /></Ui2Group></div>}
      summary={<Ui2Group k="Summary"><Ui2Value v="Facts that open nothing are recessed" /></Ui2Group>}
      doors={[]}
      actions={<Ui2Actions actions={acts} marks={{ drop: 'out' }} />} />
  );
}
function EmptyPlate({ room }) {
  return (
    <div style={col({ height: '100%' })}>
      <Ui2Empty kind="absent" art={KIT_ART.pets} title="No pet yet" why="You have no companion." how="Pets are found in the world." />
      <Ui2Empty kind="locked" art={KIT_ART.pets} title="Pets" why="Not open on this server yet." />
      <Ui2Empty kind="loading" rows={1} />
    </div>
  );
}
function ConfirmPlate({ room }) {
  const drop = { id: 'drop', slot: 0, cost: 'irreversible', label: 'Drop', c: 'red' };
  const equip = { id: 'equip', slot: 0, cost: 'routine', label: 'Equip', c: 'gold' };
  return (
    <div style={col({ justifyContent: 'center', height: '100%' })}>
      <Ui2Confirm action={drop} words="Drop the Copper Sword? It cannot be undone." onYes={() => {}} onNo={() => {}} />
      <Ui2Group k="A routine action (Equip)"><Ui2Value v={Ui2Confirm({ action: equip }) === null ? 'never asks: it goes at once' : 'asks (wrong)'} /></Ui2Group>
      <Ui2Actions actions={[{ id: 'title', slot: 0, cost: 'routine', label: 'Equip title', c: 'gold', check: () => null }]} marks={{ title: 'unknown' }} />
    </div>
  );
}

export function UiKitPage() {
  const [room, setRoom] = useState(() => kitRoom(winVw(), winVh(), computerFrame()));
  const [me, setMe] = useState(null);
  const [fonts, setFonts] = useState(false);
  useEffect(() => {
    let gone = false;
    const done = () => { if (!gone) setFonts(true); };
    try {
      const fam = UI2_FONT.fontFamily.split(',')[0];
      /* no flat timer raced against it (TRAPS §279): a face that fails rejects, and the page goes on
         in the fallback serif; the browser's own network limits end a stalled one */
      Promise.all(UI2_FONT.weights.map((w) => document.fonts.load(`${w} 16px ${fam}`))).then(done, done);
    } catch (e) { done(); }
    /* QA: the harness hands the state in (never taken here: open-hand.test) */
    try { window.__btUiKitHand = (S) => { if (!gone) setMe(readKitPlayer(S)); }; } catch (e) { /* no window */ }
    const onResize = () => setRoom(kitRoom(winVw(), winVh(), computerFrame()));
    window.addEventListener('resize', onResize);
    return () => { gone = true; window.removeEventListener('resize', onResize); try { window.__btUiKitHand = null; } catch (e) { /* no window */ } };
  }, []);
  useEffect(() => {
    try {
      window.__btUiKit = { ready: fonts, room, player: !!me, plates: document.getElementsByClassName('u2-frame').length,
        font: fonts && document.fonts.check(`700 16px ${UI2_FONT.fontFamily.split(',')[0]}`) };
    } catch (e) { /* no window */ }
  }, [fonts, room, me]);
  const shineOff = /(^|\s)ui2-noshine(\s|$)/.test(ui2RootClass());
  const page = { position: 'fixed', inset: 0, zIndex: 2147483000, overflowY: 'auto', overflowX: 'hidden', background: '#0A1118', padding: '10px 0 40px', WebkitOverflowScrolling: 'touch' };
  if (!fonts) return <div className={ui2RootClass()} style={page} data-u2-kit="loading"><p style={{ textAlign: 'center', marginTop: 80 }}>Loading the kit{'…'}</p></div>;
  const wrap = { width: room.w, margin: '0 auto' };
  return (
    <div className={ui2RootClass()} style={page} data-u2-kit="ready">
      <div style={{ ...wrap, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '0 6px 8px', font: `${UI2_TYPE.body}px/1.3 'Source Sans 3', sans-serif`, color: '#BCC8CC' }}>
        <span>The dashboard kit (v2.3.6680) at this screen's band: {room.w} x {room.h}, header {room.head}</span>
        <a href={shineOff ? '?uikit=1' : '?uikit=1&ui2shine=0'} style={{ color: '#EAC675', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>{shineOff ? 'Shine on' : 'Shine off'}</a>
      </div>
      <div style={wrap}>
        <Plate id="bro" room={room} title="Bro" caption={'Sample: the Bro landing' + (me ? ' (your doors; a count where points wait)' : ' (no player handed to this page)')}><BroSample room={room} me={me} /></Plate>
        <Plate id="character" room={room} title="Character" caption={'Sample: the Character page' + (me ? ' (your real data)' : ' (no player handed to this page: honest empty lines)')}><CharacterSample room={room} me={me} /></Plate>
        {/* v2.3.6681 (card UI2-frame): the header at the frame's two roots and a deep page */}
        <Plate id="headers" room={room} caption="The header: Gear's root (Close, Gear, Menu ›), the Menu's root (‹ Gear, Menu, Close), a deep page (‹ Back, its title, Menu, Close)" head={<Ui2Header title="Gear" closeStart menuNext />}>
          <div style={col({ justifyContent: 'center', height: '100%' })}>
            <Ui2Header title="Menu" backLabel="Gear" onMenu={false} />
            <Ui2Header title="Life Skills" backLabel="Bro" />
          </div>
        </Plate>
        <Plate id="tiles" room={room} title="Tiles" caption="Destination tiles: default, pressed, selected (pushed in), focused, locked, a count, new, the rare warm light"><TilesPlate room={room} /></Plate>
        <Plate id="actions" room={room} title="Actions" caption="The five action colours, one dark label: default, then pressed"><ActionsPlate room={room} /></Plate>
        <Plate id="use" room={room} title="Actions" caption="An action with its price; disabled with its reason; pending; focused; dismiss"><ActionUsePlate room={room} /></Plate>
        <Plate id="info" room={room} title="Information" caption="Stat headlines (default, pressed, selected), progress, recessed information"><InfoPlate room={room} /></Plate>
        {/* v2.3.6683 (card UI2-bro): a screen's pieces */}
        <Plate id="zones" room={room} title="A screen" caption="Zones: identity, summary, actions (the empty doors' zone gives its room back); actions in fixed slots: on, off with its reason, an empty slot, pending"><ZonesPlate room={room} /></Plate>
        <Plate id="empty" room={room} title="Empty states" caption="Empty states: absent (what, why, how), locked (why), loading (never a 0)"><EmptyPlate room={room} /></Plate>
        <Plate id="confirm" room={room} title="Confirm" caption="The one confirmation: only for the costly or irreversible; a routine action never asks; an outcome not confirmed yet"><ConfirmPlate room={room} /></Plate>
        <Plate id="slots" room={room} title="Items" caption="Rarity slots (Normal, Rare, Elite, Godly; selected; focused; empty), a count, a dot, still loading"><SlotsPlate room={room} /></Plate>
      </div>
    </div>
  );
}
