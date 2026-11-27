/* ═══ v2.3.6681: THE MENU'S DIRECTORY, ITS HUBS, AND THE HOMESTEAD'S PLACE (card UI2-frame) ═══
 *
 * The specification (part 1.1): "The Universal Menu is an equal-weight
 * directory, not a prioritized list. A 4-column x 2-row grid".  Eight equal
 * kit tiles (src/ui/kit/Tile.jsx), each the picture its door has today and one
 * word (src/game/dashDests.js MENU_DESTS): four across and two down where the
 * page is two rows of bag squares tall (upright, a computer), one row of
 * eight on a phone on its side (82 px of page: the master notes' part 3).
 * The row count follows the page's own height, read the one allowed way (its
 * ResizeObserver's entry: docs/specs/layout-reads.md, way 5); the first draw
 * guesses from the kept window size.  No tile is larger than another.
 * The same grid draws the two small hubs (Social; Settings) for the doors the
 * pages under them do not have (DASH_HUBS), and a tile passes where it grew
 * from (its cell) for the growing motion (step 2's PR 2).
 *
 * The game's state comes from the parent (open-hand.test): `marks` are the
 * counts, dots and the warm light BottomDashboard already works out. */
import React, { useEffect, useRef, useState } from 'react';
import { Ui2Tile } from '@/ui/kit/index.js';
import { menuGridShape } from '@/game/dashDests.js';
import { menuTileArt, MENU_GAP, MENU_TILE_PAD } from '@/game/menuTile.js';   /* v2.3.6784: the picture's rule (card UI3-menus) */
import { winVh } from '../playViewport.js';
import { frameTap } from './DashHeader.jsx';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { openWorldMap } from '../../WorldMapOverlay.jsx';
import { profileFromSelf } from '../../panels/playerProfile.js';
import { clanPartyOn } from '@/game/alliance.js';
import { SAY } from '@/data/say/dashFrame.js';
import { SAY as BRO } from '@/data/say/broCard.js';   /* the Homestead's words are the Bro row's, as today */
import { say } from '@/game/say.js';

/** A door's word (its key in src/data/say/dashFrame.js; each written out so
    the words' guard can read them). */
export function doorWord(key) {
  switch (key) {
    case 'dashFrame.menu': return say(SAY, 'dashFrame.menu');
    case 'dashFrame.gear': return say(SAY, 'dashFrame.gear');
    case 'dashFrame.bro': return say(SAY, 'dashFrame.bro');
    case 'dashFrame.quests': return say(SAY, 'dashFrame.quests');
    case 'dashFrame.social': return say(SAY, 'dashFrame.social');
    case 'dashFrame.ranks': return say(SAY, 'dashFrame.ranks');
    case 'dashFrame.codex': return say(SAY, 'dashFrame.codex');
    case 'dashFrame.homestead': return say(SAY, 'dashFrame.homestead');
    case 'dashFrame.map': return say(SAY, 'dashFrame.map');
    case 'dashFrame.settings': return say(SAY, 'dashFrame.settings');
    case 'dashFrame.friends': return say(SAY, 'dashFrame.friends');
    case 'dashFrame.party': return say(SAY, 'dashFrame.party');
    case 'dashFrame.clan': return say(SAY, 'dashFrame.clan');
    case 'dashFrame.guilds': return say(SAY, 'dashFrame.guilds');
    case 'dashFrame.notifications': return say(SAY, 'dashFrame.notifications');
    case 'dashFrame.account': return say(SAY, 'dashFrame.account');
    case 'dashFrame.feedback': return say(SAY, 'dashFrame.feedback');
    case 'dashFrame.about': return say(SAY, 'dashFrame.about');
    case 'dashFrame.journey': return say(SAY, 'dashFrame.journey');
    /* v2.3.6683 (card UI2-bro): Bro's six doors (src/game/broHub.js) */
    case 'dashFrame.character': return say(SAY, 'dashFrame.character');
    case 'dashFrame.combat': return say(SAY, 'dashFrame.combat');
    case 'dashFrame.equipment': return say(SAY, 'dashFrame.equipment');
    case 'dashFrame.lifeSkills': return say(SAY, 'dashFrame.lifeSkills');
    case 'dashFrame.feats': return say(SAY, 'dashFrame.feats');
    case 'dashFrame.pets': return say(SAY, 'dashFrame.pets');
    case 'dashFrame.titles': return say(SAY, 'dashFrame.titles');   /* v2.3.6684: the passport's Titles */
    case 'dashFrame.sword': return say(SAY, 'dashFrame.sword');   /* v2.3.6685: a weapon's page (card UI2-combat) */
    case 'dashFrame.bow': return say(SAY, 'dashFrame.bow');
    case 'dashFrame.staff': return say(SAY, 'dashFrame.staff');
    case 'dashFrame.sharedAttributes': return say(SAY, 'dashFrame.sharedAttributes');   /* v2.3.6686: the Shared page */
    case 'dashFrame.dps': return say(SAY, 'dashFrame.dps');   /* v2.3.6686: the stat tree's layers */
    /* v2.3.6691 (card UI2-quests): the Quests pages beside a quest's own */
    case 'dashFrame.questRewards': return say(SAY, 'dashFrame.questRewards');
    case 'dashFrame.questsDaily': return say(SAY, 'dashFrame.questsDaily');
    case 'dashFrame.questsDone': return say(SAY, 'dashFrame.questsDone');
    case 'dashFrame.questsOffers': return say(SAY, 'dashFrame.questsOffers');
    default: return say(SAY, 'dashFrame.page');
  }
}

/* the short page: a phone on its side (the first guess, before the page's
   own box is known) */
const shortGuess = () => { try { return winVh() < 500; } catch (e) { return false; } };

/**
 * doors   [{ id, word, art, key }] in order
 * marks   { [id]: { count, dot, glow } }
 * onDoor  (door, from) => void; `from` is its cell: { cell: [col, row], of: [cols, rows] }
 * label   the grid's QA name (data-dash-grid)
 */
export function MenuGrid({ doors, marks, onDoor, label, wordFor }) {
  const ref = useRef(null);
  const [short, setShort] = useState(shortGuess);
  /* v2.3.6784 (card UI3-menus, reading 1): the grid's own box, from the SAME entry that says short (its width
     and its height; docs/specs/layout-reads.md way 5: no new read); before the first entry the rule gives
     yesterday's 46 / 28 */
  const [box, setBox] = useState(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    let ro = null;
    try {
      ro = new ResizeObserver((entries) => {
        const e = entries && entries[0];
        const r = e && e.contentRect;
        const h = r ? r.height : 0;
        const w = r ? r.width : 0;
        if (h > 0) setShort(h < 110);
        if (h > 0 && w > 0) setBox((b) => (b && b.width === w && b.height === h ? b : { width: w, height: h }));
      });
      ro.observe(el);
    } catch (e) { ro = null; }
    return () => { try { if (ro) ro.disconnect(); } catch (e) { /* gone */ } };
  }, []);
  const shape = menuGridShape(doors.length, short);
  /* v2.3.6784: the owner, 2026-11-26: "Enlarge the icons by approximately 25%" (46 -> 58 upright, 28 -> 35
     sideways), as far as the tile's room lets it, the band never taller; the tile's padding 2 everywhere (the
     kit's 4 leaves 56 at 390 x 844).  Bro's six and the hubs draw through here too: one rule, one tile. */
  const art = menuTileArt(box, { cols: shape.cols, rows: shape.rows, short });
  return (
    <div ref={ref} data-dash-grid={label} data-grid-rows={shape.rows} data-menu-art={art}
      style={{
        display: 'grid', height: '100%', minHeight: 0, gap: MENU_GAP,
        gridTemplateColumns: `repeat(${shape.cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${shape.rows}, minmax(0, 1fr))`,
      }}>
      {doors.map((d, i) => {
        const m = (marks && marks[d.id]) || {};
        const from = { cell: [i % shape.cols, Math.floor(i / shape.cols)], of: [shape.cols, shape.rows] };
        return (
          <Ui2Tile key={d.id} size="primary" art={d.art || undefined} artSize={art}
            label={wordFor ? wordFor(d) : doorWord(d.word)}
            badge={m.count} dot={m.dot} glow={m.glow}
            locked={d.locked || undefined} data-locked={d.locked ? '' : undefined}
            data-dest={d.id} data-key={d.key || undefined}
            style={{ minWidth: 0, minHeight: 44, padding: MENU_TILE_PAD }}
            {...frameTap(() => onDoor(d, from))} />
        );
      })}
    </div>
  );
}

/** The Homestead's place (the card's reading 4): what the Bro row says today,
    plots ready and where the farm is, and nothing more -- a place kept with
    an honest line, never a farm shown as playable from here (the notes' F4:
    managing the farm from the dashboard is the owner's call). */
export function HomesteadPage({ plots }) {
  const n = Math.max(0, Number(plots) || 0);
  return (
    <div data-dash-page="homestead" style={{ display: 'flex', alignItems: 'center', gap: 12, height: '100%', padding: '0 12px' }}>
      <img src="/icons/ui/bldg-farm.webp" alt="" draggable={false} style={{ width: 64, height: 64, objectFit: 'contain', flex: 'none' }} />
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.35, color: 'var(--ui2-text-ivory)' }}>
        {say(BRO, n > 0 ? 'broCard.farmReady' : 'broCard.farmNone', { n })}
      </p>
    </div>
  );
}

/** A door of the Menu or a hub: its page over the directory, or the World map
    over the game (Map: what More's tile and the minimap open; where there is
    none, the Map page, as More did). */
export function openDoor(d, from) {
  if (d.opens === 'worldMap') {
    if (!openWorldMap()) dashboardPanelBus.go({ type: 'push', id: 'map', from });
    return;
  }
  dashboardPanelBus.go({ type: 'push', id: d.page, from });
}

/** Plots ready on your farm (the Bro row's count, from your own profile). */
export function farmPlots(S) {
  try {
    const p = profileFromSelf(S);
    return p && p.homestead ? Math.max(0, Number(p.homestead.plotsReady) || 0) : 0;
  } catch (e) { return 0; }
}

/** A hub tile's word: Party once clans are parties, Clan under the kill switch
    (More's `labelFor`, v2.3.3526). */
export function hubWordFor(S) {
  let party = true;
  try { party = clanPartyOn(S); } catch (e) { party = true; }
  return (d) => doorWord(d.id === 'clan' && !party ? d.wordClan : d.word);
}
