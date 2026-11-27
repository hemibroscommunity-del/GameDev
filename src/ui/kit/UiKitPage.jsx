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
 * so, honestly empty.  The face loads behind the page's own "Loading the kit"
 * (document.fonts.load; a face that fails, the fallback; v2.3.6785: the face
 * is the game's Source Sans 3, no longer a serif).  QA reads
 * window.__btUiKit.
 *
 * v2.3.6780 (card UI3-kit): the plate "Three weights" (the owner, 2026-11-26:
 * raised for destinations and actions, the stat sunk with a large number,
 * facts flat in one container), upright and sideways in the band's real box;
 * every demo tile is pressable (a named tap, counted on window.__btUiKit.taps:
 * a raised face is never drawn on a thing that cannot be pressed); the
 * pressed and selected stat demos are stats that open; no colour written
 * here (the kit's tokens); and the link to `?ui2look=0`, yesterday's look. */
import React, { useEffect, useState } from 'react';
import {
  Ui2Frame, Ui2Header, Ui2Tile, Ui2Group, Ui2Value, Ui2Stat, Ui2Action, Ui2ActionRow, Ui2Disabled,
  Ui2Slot, Ui2Progress, Ui2Loading, ui2RootClass, Ui2TwoPanel, Ui2ItemGrid,
  Ui2Zones, Ui2Actions, Ui2Empty, Ui2Confirm, Ui2Facts, Ui2Fact, ui2LookWas,
  Ui2Collection, Ui2CollectionCard, Ui2Showcase,
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
/* v2.3.6780: a demo that is pressable does something you can see: the tap is counted (QA reads it) */
function kitTap(id) {
  return function onKitTap() {
    try { const k = window.__btUiKit; if (k) { k.taps = (k.taps || 0) + 1; k.lastTap = id; } } catch (e) { /* no window */ }
  };
}

function Plate({ id, caption, room, title = 'Bro', head, children }) {
  return (
    <figure style={{ margin: '0 0 14px' }} data-u2-plate={id}>
      <figcaption style={{ font: `${UI2_TYPE.small}px/1.3 ${UI2_FONT.fontFamily}`, color: 'var(--ui2-text-muted)', margin: '0 0 4px 2px' }}>{caption}</figcaption>
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
      {T.slice(0, n).map((t, i) => <Ui2Tile key={t.label} art={arts[i]} artSize={art} {...t} data-u2-demo={t.label} onClick={kitTap(t.label)} />)}
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
  /* v2.3.6780: a stat's number is large now (24): three in a row leave no room for a picture */
  const stats = (
    <div style={row({ flex: room.wide ? '1.4 1 0' : '0 0 auto' })}>
      <Ui2Stat v="1,284" k="DPS" style={{ flex: 1 }} onClick={kitTap('DPS')} data-u2-demo="stat" />
      <Ui2Stat v="312" k="Defense" state="pressed" style={{ flex: 1 }} onClick={kitTap('Defense')} data-u2-demo="stat pressed" />
      <Ui2Stat v="18%" k="Crit" selected style={{ flex: 1 }} onClick={kitTap('Crit')} data-u2-demo="stat selected" />
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

/* v2.3.6688: the two panels and the one grid of item cells (card UI2-gear PR 2): a look from the
   left panel (a cell selected, pushed in), the summary in the right panel's place; default and empty cells */
function WorkspacePlate({ room }) {
  const art = '/icons/items/';
  const pics = ['sword-blacksteel.webp', 'bow.webp', 'staff.webp', 'chest-plate-iron.webp'];
  const cells = UI2_GRADES.map((g, i) => ({ key: 'k' + i, grade: g, art: assetUrl(art + pics[i]) /* v2.3.6743: its file's version (the mend) */, label: g }));
  /* v2.3.6688 (the mends; mp-uikit 1b, 1c): the fixture holds what its panel shows without a scroll, so the kit's
     audit reads every cell (a storage grid scrolls by intent in the game, which the audit would count as cut):
     upright two rows of three; sideways (a 46 px panel) ONE row of 44 px cells, and the summary's one stat
     without its group's label line. */
  const s = room.wide ? UI2_SIZE.touch : Math.max(UI2_SIZE.touch, Math.min(52, Math.floor((room.cw / 2 - 3 * G) / 3)));
  const cols = room.wide ? Math.max(4, Math.min(8, Math.floor((room.cw / 2 - 3 * G) / (s + 3)))) : 3;
  const stat = <Ui2Stat k="Now → If equipped" v="7.5 → 9.4" />;
  return (
    <Ui2TwoPanel height={room.ch}
      left={{ label: 'Inventory', kind: 'storage', children: <Ui2ItemGrid cells={cells} cols={cols} size={s} selectedKey="k1" fill={room.wide ? cols : 6} onPick={() => {}} /> }}
      right={{ label: 'Summary', kind: 'summary', children: room.wide ? stat : <Ui2Group k="DPS">{stat}</Ui2Group> }} />
  );
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
      <Ui2Tile size="compact" art={KIT_ART.quests} label="Quests" sub="2 to hand in" badge={2} style={{ flex: room.wide ? '1 0 auto' : 1 }} onClick={kitTap('Quests')} />
      <Ui2Tile size="compact" art={KIT_ART.life} label="Skills" sub="A new level" dot style={{ flex: room.wide ? '1 0 auto' : 1 }} onClick={kitTap('Skills')} />
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
  return <div style={grid(cols, rows)}>{T.map(([l, a, x]) => <Ui2Tile key={l} label={l} art={a} artSize={art} {...x} data-u2-door={l} onClick={kitTap(l)} />)}</div>;
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
  /* v2.3.6780: a title that opens nothing here is a fact, flat in its container (it was a raised stat) */
  const title = <Ui2Facts style={{ minWidth: 0 }} data-u2-title=""><Ui2Fact k="Title" v={none ? '—' : (me.title || 'No title')} none={none || !me.title} /></Ui2Facts>;
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
  /* v2.3.6780 (card UI3-kit): supporting information is flat rows in ONE container, not a box each
     (it was four recessed groups; "Skill guilds" no longer fitted its box, mp-uikit 1c) */
  const fact = (k, v, isNone) => <Ui2Fact key={k} k={k} v={v} none={isNone} data-u2-fact={k} />;
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
        <Ui2Facts dir="row" style={{ flex: '1.8 1 0', minWidth: 0, alignSelf: 'center' }}>{facts.slice(2)}</Ui2Facts>
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
      <Ui2Facts dir="row" style={{ flex: '0 0 auto' }}>{facts}</Ui2Facts>
    </div>
  );
}

/* ── v2.3.6780 (card UI3-kit): THE THREE WEIGHTS, side by side ──
   The owner, 2026-11-26: "Navigation buttons: Raised, beveled, prominent. Reserved for destinations
   and actions. Important statistics: Recessed surfaces with large numbers. No heavy beveling.
   Supporting information: Flat, aligned within shared containers."  A raised door; a stat that opens
   (its chevron); a stat that does not (none); a pill; a facts container of four rows, one a door.
   The words and numbers are the mock-up's examples (the game's own fill the real screens). */
function WeightsPlate({ room }) {
  const door = <Ui2Tile size="compact" art={KIT_ART.combat} label="Combat" onClick={kitTap('Combat')} data-u3-weight="raised" style={{ flex: room.wide ? '0 0 auto' : undefined }} />;
  const opens = <Ui2Stat v="120.5" k="DPS" onClick={kitTap('120.5 DPS')} data-u3-weight="stat-opens" style={{ flex: room.wide ? '0 0 auto' : undefined }} />;
  const still = <Ui2Stat v="23" k="Level" data-u3-weight="stat" style={{ flex: room.wide ? '0 0 auto' : '1 1 auto' }} />;
  const pill = <Ui2Stat size="pill" art={KIT_ART.gold} v="1,250" data-u3-weight="pill" style={{ flex: '0 0 auto', alignSelf: 'center' }} />;
  const facts = (
    <Ui2Facts dir={room.wide ? 'row' : undefined} data-u3-weight="facts" style={{ flex: room.wide ? '1 1 0' : '1 1 auto' }}>
      <Ui2Fact k="Damage" v={'26–44'} data-u3-fact="damage" />
      <Ui2Fact k="Critical" v="38%" data-u3-fact="critical" />
      <Ui2Fact k="Speed" v="2.10/s" data-u3-fact="speed" />
      <Ui2Fact k="Quests" v="12 done" onClick={kitTap('Quests fact')} data-u3-fact="quests" />
    </Ui2Facts>
  );
  if (room.wide) return <div style={row({ alignItems: 'center', height: '100%' })}>{door}{opens}{still}{pill}{facts}</div>;
  return (
    <div style={row({ height: '100%' })}>
      <div style={col({ flex: '1 1 0', justifyContent: 'space-between' })}>{door}{opens}<div style={row({ alignItems: 'stretch' })}>{still}{pill}</div></div>
      <div style={col({ flex: '1.05 1 0', justifyContent: 'center' })}>{facts}</div>
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
      /* v2.3.6780: sideways (a 66 px page) only the actions' zone fits; the identity and summary zones give
         their room back there, as the doors' does (they stood out of the box since v2.3.6683: mp-uikit 1b) */
      identity={room.wide ? null : <div style={row({ alignItems: 'center' })}><img src={KIT_ART.character} alt="" style={{ width: 40, height: 40 }} /><Ui2Group k="Identity" style={{ flex: 1 }}><Ui2Value v="A name, a title, a level" /></Ui2Group></div>}
      summary={room.wide ? null : <Ui2Facts><Ui2Fact k="Summary" v="Facts are flat rows" /></Ui2Facts>}
      doors={[]}
      actions={<Ui2Actions actions={acts} marks={{ drop: 'out' }} />} />
  );
}
function EmptyPlate({ room }) {
  return (
    /* v2.3.6780: side by side when the phone is on its side (stacked, they stood out of the box: mp-uikit 1b) */
    <div style={room.wide ? row({ height: '100%', alignItems: 'center' }) : col({ height: '100%' })}>
      <Ui2Empty kind="absent" art={KIT_ART.pets} title="No pet yet" why="You have no companion." how="Pets are found in the world." />
      <Ui2Empty kind="locked" art={KIT_ART.pets} title="Pets" why="Not open on this server yet." />
      <Ui2Empty kind="loading" rows={1} />
    </div>
  );
}
/* v2.3.6693 (card UI2-codex): the collection and the showcase, with the kit's own pictures (no game state here) */
const SAMPLE_SHELVES = [{ id: 'monsters', word: 'Monsters' }, { id: 'items', word: 'Items' }, { id: 'lands', word: 'Lands' }, { id: 'pets', word: 'Pets' }];
function CollectionPlate({ room }) {
  const [shelf, setShelf] = useState('monsters');
  const pic = (src, dim) => <img src={src} alt="" draggable={false} style={{ width: 44, height: 44, objectFit: 'contain', opacity: dim ? 0.35 : 1 }} />;
  return (
    /* sideways the kinds' column scrolls in the real page; the plate's 63 px box holds its first one (and the count
       line is not drawn there) */
    <Ui2Collection shelves={room.wide ? SAMPLE_SHELVES.slice(0, 1) : SAMPLE_SHELVES} shelf={shelf} onShelf={setShelf} side={room.wide} head={shelf === 'monsters' && !room.wide ? '2 of 3 met' : null}>
      {shelf === 'monsters' ? (
        <>
          <Ui2CollectionCard art={pic(KIT_ART.pets)} name="Snowman" sub="Frost · Frost Ridge" line="3 defeated" mark="NEW" onClick={() => {}} />
          <Ui2CollectionCard art={pic(KIT_ART.combat)} name="Fire Goblin" sub="Flame · Flame Fields" line="12 defeated" onClick={() => {}} />
          <Ui2CollectionCard art={pic(KIT_ART.pets, true)} name="???" sub="Earth Forest" line="Not met yet" dim onClick={() => {}} />
        </>
      ) : <Ui2Empty title="Not in the Codex yet" why="Their pages are still being written." />}
    </Ui2Collection>
  );
}
function ShowcasePlate({ room }) {
  const door = (id, label, summary) => ({ id, label, summary, onClick: () => {} });
  return (
    <Ui2Showcase short={room.wide}
      figure={<img src={KIT_ART.pets} alt="" draggable={false} style={{ width: room.wide ? 56 : 84, height: room.wide ? 56 : 84, objectFit: 'contain' }} />}
      doors={[door('combat', 'Combat', 'The Lunge'), door('loot', 'Loot', '8 drops'), door('habitat', 'Habitat', 'Flame Fields'), door('story', 'Story', 'Cinder Goblin')]}
      facts={[{ id: 'levels', k: 'Levels', v: 'Lv 1–40' }, { id: 'element', k: 'Element', v: 'Flame' }, { id: 'type', k: 'Type', v: 'Humanoid' }, { id: 'kills', k: 'Defeated', v: '12' }, { id: 'strength', k: 'Strength', v: 'By level' }]} />
  );
}
function ConfirmPlate({ room }) {
  const drop = { id: 'drop', slot: 0, cost: 'irreversible', label: 'Drop', c: 'red' };
  const equip = { id: 'equip', slot: 0, cost: 'routine', label: 'Equip', c: 'gold' };
  return (
    /* v2.3.6780: side by side when the phone is on its side (stacked, they stood out of its 66 px page: mp-uikit 1b) */
    <div style={room.wide ? row({ alignItems: 'center', height: '100%' }) : col({ justifyContent: 'center', height: '100%' })}>
      <div style={{ flex: room.wide ? '2 1 0' : '0 0 auto', minWidth: 0 }}><Ui2Confirm action={drop} words="Drop the Copper Sword? It cannot be undone." onYes={() => {}} onNo={() => {}} /></div>
      <Ui2Group k="A routine action (Equip)" style={{ flex: room.wide ? '1.2 1 0' : '0 0 auto' }}><Ui2Value v={Ui2Confirm({ action: equip }) === null ? 'never asks: it goes at once' : 'asks (wrong)'} /></Ui2Group>
      <div style={{ flex: room.wide ? '1 1 0' : '0 0 auto', minWidth: 0 }}><Ui2Actions actions={[{ id: 'title', slot: 0, cost: 'routine', label: 'Equip title', c: 'gold', check: () => null }]} marks={{ title: 'unknown' }} /></div>
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
         in the fallback face; the browser's own network limits end a stalled one */
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
      window.__btUiKit = { ready: fonts, room, player: !!me, plates: document.getElementsByClassName('u2-frame').length, look: ui2LookWas() ? 'was' : 'new', taps: 0, lastTap: null,
        font: fonts && document.fonts.check(`700 16px ${UI2_FONT.fontFamily.split(',')[0]}`) };
    } catch (e) { /* no window */ }
  }, [fonts, room, me]);
  const shineOff = /(^|\s)ui2-noshine(\s|$)/.test(ui2RootClass());
  const was = ui2LookWas();
  const page = { position: 'fixed', inset: 0, zIndex: 2147483000, overflowY: 'auto', overflowX: 'hidden', background: 'var(--ui2-well-deep)', padding: '10px 0 40px', WebkitOverflowScrolling: 'touch' };
  if (!fonts) return <div className={ui2RootClass()} style={page} data-u2-kit="loading"><p style={{ textAlign: 'center', marginTop: 80 }}>Loading the kit{'…'}</p></div>;
  const wrap = { width: room.w, margin: '0 auto' };
  return (
    <div className={ui2RootClass()} style={page} data-u2-kit="ready">
      <div style={{ ...wrap, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '0 6px 8px', font: `${UI2_TYPE.body}px/1.3 ${UI2_FONT.fontFamily}`, color: 'var(--ui2-text-muted)' }}>
        <span>The dashboard kit (v2.3.6680) at this screen's band: {room.w} x {room.h}, header {room.head}</span>
        <a href={shineOff ? '?uikit=1' : '?uikit=1&ui2shine=0'} style={{ color: 'var(--ui2-text-gold)', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>{shineOff ? 'Shine on' : 'Shine off'}</a>
        {/* v2.3.6780: yesterday's look, to compare (remembered on this phone; ?ui2look=1 returns) */}
        <a href={was ? '?uikit=1&ui2look=1' : '?uikit=1&ui2look=0'} data-u2-look={was ? 'was' : 'new'} style={{ color: 'var(--ui2-text-gold)', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>{was ? 'New look' : 'Old look'}</a>
      </div>
      <div style={wrap}>
        <Plate id="bro" room={room} title="Bro" caption={'Sample: the Bro landing' + (me ? ' (your doors; a count where points wait)' : ' (no player handed to this page)')}><BroSample room={room} me={me} /></Plate>
        <Plate id="character" room={room} title="Character" caption={'Sample: the Character page' + (me ? ' (your real data)' : ' (no player handed to this page: honest empty lines)')}><CharacterSample room={room} me={me} /></Plate>
        {/* v2.3.6681 (card UI2-frame): the header at the frame's two roots and a deep page */}
        <Plate id="headers" room={room} caption="The header: Gear's root (Close, Gear, Menu ›), the Menu's root (‹ Gear, Menu, Close), a deep page (‹ Back, its title, Menu, Close)" head={<Ui2Header title="Gear" closeStart menuNext />}>
          {/* v2.3.6688 (the mends): sideways the page is 74 px tall, two 44 px headers stood out of it (mp-uikit 1b at 844x390, red since this plate came, b38b302): side by side there */}
          <div style={room.wide ? row({ alignItems: 'center', height: '100%' }) : col({ justifyContent: 'center', height: '100%' })}>
            <div style={{ flex: '1 1 0', minWidth: 0, width: '100%' }}><Ui2Header title="Menu" backLabel="Gear" onMenu={false} /></div>
            <div style={{ flex: '1 1 0', minWidth: 0, width: '100%' }}><Ui2Header title="Life Skills" backLabel="Bro" /></div>
          </div>
        </Plate>
        <Plate id="tiles" room={room} title="Tiles" caption="Destination tiles: default, pressed, selected (pushed in), focused, locked, a count, new, the rare warm light"><TilesPlate room={room} /></Plate>
        <Plate id="actions" room={room} title="Actions" caption="The five action colours, one dark label: default, then pressed"><ActionsPlate room={room} /></Plate>
        <Plate id="use" room={room} title="Actions" caption="An action with its price; disabled with its reason; pending; focused; dismiss"><ActionUsePlate room={room} /></Plate>
        {/* v2.3.6780 (card UI3-kit): the three weights */}
        <Plate id="weights" room={room} title="Three weights" caption="Three weights: a raised door (it goes somewhere), a stat that opens (its chevron), a stat that does not, a pill, facts flat in one container (one row a door)"><WeightsPlate room={room} /></Plate>
        <Plate id="info" room={room} title="Information" caption="Stats that open (default, pressed, selected: sunk, a large number, the chevron), progress, recessed information"><InfoPlate room={room} /></Plate>
        {/* v2.3.6683 (card UI2-bro): a screen's pieces */}
        <Plate id="zones" room={room} title="A screen" caption="Zones: identity, summary, actions (the empty doors' zone gives its room back); actions in fixed slots: on, off with its reason, an empty slot, pending"><ZonesPlate room={room} /></Plate>
        <Plate id="empty" room={room} title="Empty states" caption="Empty states: absent (what, why, how), locked (why), loading (never a 0)"><EmptyPlate room={room} /></Plate>
        <Plate id="confirm" room={room} title="Confirm" caption="The one confirmation: only for the costly or irreversible; a routine action never asks; an outcome not confirmed yet"><ConfirmPlate room={room} /></Plate>
        <Plate id="slots" room={room} title="Items" caption="Rarity slots (Normal, Rare, Elite, Godly; selected; focused; empty), a count, a dot, still loading"><SlotsPlate room={room} /></Plate>
        <Plate id="workspace" room={room} title="Gear" caption="Two panels: the storage grid with a cell selected (pushed in) and empty cells; the summary in the opposite panel's place"><WorkspacePlate room={room} /></Plate>
        {/* v2.3.6693 (card UI2-codex) */}
        <Plate id="collection" room={room} title="Codex" caption="The collection: the kinds (raised doors, the chosen one pushed in), illustrated cards (the picture first; NEW; one not met greyed), a kind's honest empty line"><CollectionPlate room={room} /></Plate>
        <Plate id="showcase" room={room} title="Fire Goblin" caption="The showcase: the entry large, four doors each with its summary, its essentials flat in one strip"><ShowcasePlate room={room} /></Plate>
      </div>
    </div>
  );
}
