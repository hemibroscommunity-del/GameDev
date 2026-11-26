/* ═══ v2.3.6693: THE CODEX UNDER THE NEW DASHBOARD: THE COLLECTION (card UI2-codex, the build's step 6) ═══
 *
 * BottomDashboard's PANELS `encyclopedia`, chosen by EncyclopediaPanel.jsx on
 * the frame's switch (`?ui2=0`: today's Codex, MonsterCodex.jsx).  The
 * owner's words (the master specification, part 8 and Q73): "a complete
 * encyclopedia"; "illustrated entity cards, with artwork as the dominant
 * visual and a small amount of essential information".
 *
 * The kit's Ui2Collection: the kinds in one row at the top (sideways a column
 * at the left), Monsters chosen on opening; a monster's card a raised door
 * (its picture first and largest, its name, its element and land, your
 * kills, NEW); a kind with nothing yet its honest line, Pets with its one
 * door to the pet journal.  What a card says is src/game/codexView.js's (the
 * game's rule, a page open at one kill, is read there only).  A tap opens
 * the monster's showcase (dash/MonsterShowcase.jsx); the NEW MONSTER card's
 * ask lands there too (takeCodexOpen).  A kill arrives by the 500 ms look at
 * the Codex's own count (`_codex.rev`), its redraw a startTransition.
 *
 * The cards' pictures are the pet sheet's 256-colour twin the loading screen
 * already fetched (PetPortrait): nothing loads here. */
import React, { useEffect, useState } from 'react';
import { Ui2Collection, Ui2CollectionCard, Ui2Empty, Ui2Tile, ui2RootClass } from '@/ui/kit/index.js';
import { PetPortrait } from '@/ui/petPortrait.jsx';
import { codexView } from '@/game/codexView.js';
import { codexCounts, codexFresh, codexLive, takeCodexOpen } from '@/game/monsterCodex.js';
import { dashNavView } from '@/game/dashNav.js';
import { SAY } from '@/data/say/codexPages.js';
import { SAY as SAY_CX } from '@/data/say/monsterCodex.js';
import { say } from '@/game/say.js';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { useClock, useRoom } from '../sheet/CharacterPage.jsx';
import { deskWideActive } from '../../deskWide.js';
import { openCodexMonster } from './codexPageOpen.js';
import './codexUi2.css';

const revOf = (S) => String(S && S._codex ? S._codex.rev : -1);

/* the collection's visit on the frame (its kept kind is the entry's `sel`) */
function visit() {
  try { const t = dashNavView(dashboardPanelBus.nav()).top; return t && t.id === 'encyclopedia' ? t : null; } catch (e) { return null; }
}

export function CodexPage({ getS }) {
  useClock(() => revOf(getS()), 500);
  const [ref, room] = useRoom();
  const [shelf, setShelf] = useState(() => { const v = visit(); return v && typeof v.sel === 'string' ? v.sel : 'monsters'; });
  /* the NEW MONSTER card's tap: that monster's showcase, over the collection */
  useEffect(() => {
    const k = takeCodexOpen(getS());
    if (k) openCodexMonster(k, getS);
  });
  const S = getS();
  const view = codexView({ shelf, countsOf: (k) => codexCounts(S, k), freshOf: (k) => codexFresh(S, k) });
  const pick = (id) => {
    setShelf(id);
    const v = visit();
    if (v) { try { dashboardPanelBus.go({ type: 'keep', key: v.key, sel: id }); } catch (e) { /* the frame went */ } }
  };
  const c = S && S._codex;
  const note = c && c.unavailable ? say(SAY_CX, 'monsterCodex.noteUnavailable')
    : !(c && c.known) && !codexLive(S) ? say(SAY_CX, 'monsterCodex.noteOld') : '';
  const side = room.short;
  const big = !side && deskWideActive();
  const px = big ? 72 : 48;
  return (
    <div ref={ref} className={ui2RootClass('u2-codex')} data-codex-root={view.shelf} data-codex-met={view.met} data-codex-side={side ? 1 : 0}>
      <Ui2Collection shelves={view.shelves} shelf={view.shelf} onShelf={pick} side={side} big={big}
        label={say(SAY, 'codexPages.shelvesAria')}
        head={view.cards.length ? (note || view.metWords) : null}>
        {view.cards.map((card) => (
          <Ui2CollectionCard key={card.kind} data-cx-card={card.kind} data-cx-known={card.met ? 1 : 0} data-cx-fresh={card.fresh ? 1 : 0}
            dim={!card.met}
            art={<PetPortrait pet={{ kind: card.kind, stage: 1 }} size={px} shadow={!card.met} />}
            mark={card.fresh ? say(SAY_CX, 'monsterCodex.cardNew') : null}
            name={card.name}
            /* on a phone (a card about 120 px wide upright, 170 on its side) the element is its icon beside the
               land: its word beside the land did not fit (the showcase says it); a computer's card has the room */
            sub={card.met && card.element && big ? card.element.name + ' · ' + card.land : card.land}
            subArt={card.met && card.element ? card.element.icon : null}
            aria-label={card.met && card.element ? card.name + ', ' + card.element.name + ', ' + card.land + ', ' + card.line : undefined}
            line={card.line}
            onClick={() => openCodexMonster(card.kind, getS)} />
        ))}
        {view.empty ? (
          <div className="u2-codex-empty" data-codex-empty={view.shelf}>
            <Ui2Empty title={view.empty.title} why={view.empty.why} />
            {view.empty.door ? (
              <Ui2Tile size="compact" label={view.empty.door.word} data-codex-door={view.empty.door.page}
                onClick={() => { try { dashboardPanelBus.push(view.empty.door.page); } catch (e) { /* no frame */ } }} />
            ) : null}
          </div>
        ) : null}
      </Ui2Collection>
    </div>
  );
}
