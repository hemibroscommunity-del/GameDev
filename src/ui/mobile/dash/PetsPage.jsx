/* ═══ v2.3.6696: PETS UNDER THE NEW DASHBOARD: THE COMPANION, OWNED, A PET, ALL (card UI2-pets, the build's step 6) ═══
 *
 * BottomDashboard's PANELS `pets` (the landing) and its three frame pages
 * (`petsOwned`, `petsOne`, `petsAll`: dash/petsPageOpen.js), chosen by
 * PetsPanel.jsx on the frame's switch (`?ui2=0`: today's one scrolling page).
 * The owner's words (the master specification, part 4.6): "Active companion
 * dominates the overview, with actual appearance, identity and relevant
 * supported stats. Secondary destinations: Owned Pets and All Pets."
 *
 * Built from the kit: the screen's zones (Ui2Zones), the showcase (the pet
 * out with you large, its name over its doors, its level, XP and ward flat
 * under them), the collection (Owned's cards, All's journal by stage), the
 * empty state, the row of actions and the one confirmation.  What each page
 * says, and every action's rule, is src/game/petPages.js's; every press asks
 * the worker (src/game/petBook.js, the action door) and holds its control
 * until the record moves (petsPageOpen.js's one pending state).  A change
 * arrives by the 400 ms look at the record (`S._petBookRev`), its redraw a
 * startTransition (useClock).
 *
 * The portraits are the pet sheet the loading screen already fetched
 * (PetPortrait): nothing loads here.  A journal card opens its kind's page of
 * the Codex (the monster it comes from): All is the pets' collection, the
 * Codex keeps the encyclopedia, and neither copies the other. */
import React, { useState } from 'react';
import {
  Ui2Zones, Ui2Showcase, Ui2Collection, Ui2CollectionCard, Ui2Empty, Ui2Tile, Ui2Actions, Ui2Confirm, Ui2Action,
  Ui2Progress, ui2RootClass,
} from '@/ui/kit/index.js';
import { PetPortrait } from '@/ui/petPortrait.jsx';
import { petsLanding, petsOwned, petsOne, petsJournal, PET_HOLDS, PET_STAGES } from '@/game/petPages.js';
import { petbookOn, petList, activePet, sendPetActive, sendPetName, sendPetRelease, pethouseOn, sendPetHouseBuy } from '@/game/petBook.js';
import { trapLevel, petlevelsOn, petwardsOn } from '@/game/trapping.js';
import { cleanPetName, PET_NAME, PET_HOUSE, TRAP_WORDS, petKindName } from '@/data/trapping.js';
import { storePetsEnabled, storeListPet } from '@/ui/storeApi.js';
import { claimSell, releaseSell } from '@/game/storeAnswer.js';   /* the store's one-tap lock (TRAPS §265), as today's page */
import { OWNER_ICON } from '@/data/ownerIcons.js';
import { SAY } from '@/data/say/pets.js';
import { say, sayPieces } from '@/game/say.js';
import { useClock, useRoom } from '../sheet/CharacterPage.jsx';
import { deskWideActive } from '../../deskWide.js';
import { openCodexMonster } from './codexPageOpen.js';
import { openPetsPage, petsTop, keepPetsSel, petsKeepGetter, petsPressNow, petsMarks, petsPendCount } from './petsPageOpen.js';
import './petsUi2.css';

const POLL_MS = 400;
const revOf = (S) => (S ? Math.floor(Number(S._petBookRev) || 0) : -1);
const STAGE_WORDS = { 1: say(SAY, 'pets.stageLow'), 2: say(SAY, 'pets.stageHigh') };

/* what a page hands petPages.js, read once a draw from the game's state */
function readS(S, extra) {
  return {
    live: petbookOn(S),
    book: (S && S._petBook) || null,
    list: petList(S),
    active: activePet(S),
    T: trapLevel(S),
    levels: petlevelsOn(S),
    wards: petwardsOn(S),
    house: pethouseOn(S),
    coins: Math.floor(Number(S && S.rpg && S.rpg.coins) || 0),
    ...(extra || {}),
  };
}
/* the clock's key: the record, the catch's hide, your gold and the presses' marks */
function clockKey(getS, controls) {
  const S = getS();
  const m = petsMarks(revOf(S), controls);
  return [revOf(S), (S && S._trap && S._trap.rev) || 0, Math.floor(Number(S && S.rpg && S.rpg.coins) || 0),
    controls.map((c) => m[c]).join(','), petsPendCount()].join('|');
}

/* the name over the doors: the name, then its kind (when it has its own name) and badges, then its XP bar */
function PetHead({ v, short, tags }) {
  return (
    <span className="u2-pets-head">
      <span className="u2-pets-name" data-pets-name="">{v.name}</span>
      {tags.length ? <span className="u2-pets-tags" data-pets-tags="">{tags.join(' · ')}</span> : null}
      {v.xp && !short ? <Ui2Progress value={v.xp.frac} label={say(SAY, 'pets.factXp')} /> : null}
    </span>
  );
}
function petFacts(v) {
  const out = [{ id: 'level', k: say(SAY, 'pets.factLevel'), v: v.level.words }];
  if (v.xp) out.push({ id: 'xp', k: say(SAY, 'pets.factXp'), v: v.xp.words, attrs: { 'data-pet-xp': v.xp.capped ? 'cap' : v.xp.xp + '/' + v.xp.need } });
  /* today's "Softens chills 34%", its verb the label and the rest the value: a third of the strip holds it */
  if (v.ward) out.push({ id: 'ward', k: say(SAY, 'pets.factWard'), v: say(SAY, 'pets.wardValue', { what: v.ward.what, pct: v.ward.pct }), attrs: { 'data-pet-ward': v.ward.pct } });
  return out;
}
/* a press: out through the one pending state, and drawn at once (its control's pending mark), not at the next look */
function usePress(getS) {
  const [, bump] = useState(0);
  return (control, send) => {
    const went = petsPressNow(control, revOf(getS()), send);
    bump((v) => (v + 1) % 1e9);
    return went;
  };
}
const trapWord = () => <b key="trap" className="u2-pets-trap">{say(SAY, 'pets.trapButton')}</b>;

/* ── the landing (page `pets`) ── */
export function PetsPage({ getS, who, wire }) {
  petsKeepGetter(getS);
  useClock(() => clockKey(getS, [PET_HOLDS.active]), POLL_MS);
  const [ref, room] = useRoom();
  const press = usePress(getS);
  const S = getS();
  const m = petsLanding(readS(S, { who, wire }));
  const marks = petsMarks(revOf(S), [PET_HOLDS.active]);
  const short = room.short;
  const px = short ? 56 : deskWideActive() ? 120 : 96;
  const doors = m.doors.map((d) => ({ id: d.id, label: d.label, summary: d.summary, onClick: () => openPetsPage(d.page, getS), attrs: { 'data-pets-door': d.id } }));
  let identity = null;
  let summary = null;
  let doorZone = null;
  if (m.state === 'loading') identity = <Ui2Empty kind="loading" rows={2} />;
  else if (m.pet) {
    const v = m.pet;
    const tags = [v.kindWord, v.gold ? say(SAY, 'pets.badgeGolden') : null, v.big ? say(SAY, 'pets.badgeBig') : null].filter(Boolean);
    const portrait = <PetPortrait pet={v.pet} size={px} />;
    identity = (
      <Ui2Showcase short={short} className="u2-pets-show"
        figure={m.state === 'pet'
          ? <button type="button" className="u2-pets-figure" data-pets-figure={v.id} aria-label={v.name} onClick={() => openPetsPage('petsOne', getS, v.id)}>{portrait}</button>
          : <span className="u2-pets-figure" data-pets-figure="">{portrait}</span>}
        head={<PetHead v={v} short={short} tags={tags} />}
        doors={doors} facts={petFacts(v)} />
    );
    if (m.note) summary = <span className="u2-pets-note" data-pets-note="">{m.note}</span>;
    else if (v.level.note && !short) summary = <span className="u2-pets-note" data-pets-held="">{v.level.note}</span>;
  } else {
    const e = m.empty;
    identity = <Ui2Empty kind={e.kind} title={e.title} why={e.why} how={e.how ? sayPieces(SAY, 'pets.emptySteps', { trap: trapWord() }) : null} />;
    if (doors.length) {
      doorZone = (
        <div className="u2-pets-doors" data-pets-doors={doors.length}>
          {doors.map((d) => <Ui2Tile key={d.id} size="compact" label={d.label} sub={d.summary} onClick={d.onClick} {...d.attrs} />)}
        </div>
      );
    }
  }
  /* sideways (about 63 px of page) the companion, its level and its two doors take the row: Put away is on the
     pet's own page, one tap on the pet (what cannot fit becomes a door, never smaller words) */
  const actions = m.actions.length && !short ? (
    <Ui2Actions marks={{ away: marks[PET_HOLDS.active] }}
      actions={m.actions.map((a) => ({ ...a, label: say(SAY, 'pets.putAway'), c: 'silver',
        onPress: () => press(PET_HOLDS.active, () => sendPetActive(S, null)) }))} />
  ) : null;
  return (
    <div ref={ref} className={ui2RootClass('u2-pets')} data-pets-page="pets" data-pets-state={m.state} data-pets-side={short ? 1 : 0}>
      <Ui2Zones identity={identity} summary={summary} doors={doorZone} actions={actions} />
    </div>
  );
}

/* ── Owned ── */
function Owned({ getS }) {
  useClock(() => clockKey(getS, [PET_HOLDS.house]), POLL_MS);
  const [ref, room] = useRoom();
  const [ask, setAsk] = useState(false);
  const press = usePress(getS);
  const S = getS();
  const f = readS(S);
  const m = petsOwned(f);
  const mark = petsMarks(revOf(S), [PET_HOLDS.house])[PET_HOLDS.house];
  const side = room.short;
  const big = !side && deskWideActive();
  const px = big ? 72 : 48;
  const h = m.house;
  let house = null;
  if (h && h.state === 'full') house = <div className="u2-pets-house" data-pet-house="full"><span className="u2-pets-house-words">{h.words}</span></div>;
  else if (h) {
    const price = say(SAY, 'pets.housePrice', { gold: h.price.toLocaleString() });
    house = (
      <div className="u2-pets-house" data-pet-house={h.cap}>
        <img className="u2-pets-house-art" src={OWNER_ICON.petHouse.src} alt="" draggable={false} width={OWNER_ICON.petHouse.w} height={OWNER_ICON.petHouse.h}
          onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        {ask ? (
          <Ui2Confirm action={{ id: 'house', cost: 'costly', label: say(SAY, 'pets.houseBuy'), c: 'gold' }}
            words={say(SAY, 'pets.houseAsk', { step: PET_HOUSE.STEP, price })}
            onYes={() => { press(PET_HOLDS.house, () => sendPetHouseBuy(S, h.cap)); setAsk(false); }}
            onNo={() => setAsk(false)} />
        ) : (
          <>
            <span className="u2-pets-house-words">{say(SAY, 'pets.houseOffer', { step: PET_HOUSE.STEP, price,
              have: h.have != null ? say(SAY, 'pets.houseHave', { coins: h.have.toLocaleString() }) : '' })}</span>
            <Ui2Action c="gold" label={say(SAY, 'pets.houseMore')} data-pet-house-buy={h.cap} pending={mark === 'out'}
              disabled={!h.can || mark !== 'free'} onClick={() => { if (h.can) setAsk(true); }} />
          </>
        )}
      </div>
    );
  }
  return (
    <div ref={ref} className={ui2RootClass('u2-pets')} data-pets-page="petsOwned" data-pets-owned="" data-pets-count={m.cards.length} data-pets-side={side ? 1 : 0}>
      <Ui2Collection side={side} big={big} label={say(SAY, 'pets.ownedAria')} head={m.cards.length ? m.head : null}>
        {house}
        {m.cards.map((c) => (
          <Ui2CollectionCard key={c.id} data-pets-card={c.id} data-pets-out={c.out ? 1 : 0}
            art={<PetPortrait pet={c.pet} size={px} />}
            mark={c.out ? say(SAY, 'pets.badgeOut') : null}
            name={c.name} sub={c.level.words}
            line={c.badges.filter((b) => b !== say(SAY, 'pets.badgeOut')).join(' · ') || (c.kindWord || null)}
            aria-label={[c.name, c.level.words, ...c.badges].join(', ')}
            onClick={() => openPetsPage('petsOne', getS, c.id)} />
        ))}
        {!m.cards.length ? (
          <Ui2Empty title={say(SAY, 'pets.emptyTitle')} how={sayPieces(SAY, 'pets.emptySteps', { trap: trapWord() })} />
        ) : null}
      </Ui2Collection>
    </div>
  );
}

/* ── one pet ── */
function One({ getS, id }) {
  const controls = [PET_HOLDS.active, PET_HOLDS.name(id), PET_HOLDS.release(id)];
  useClock(() => clockKey(getS, controls), POLL_MS);
  const [ref, room] = useRoom();
  const [mode, setMode] = useState(null);   /* null, 'name', 'release', 'sell' */
  const [text, setText] = useState('');
  const [price, setPrice] = useState('');
  const [sellMsg, setSellMsg] = useState(null);
  const [sellBusy, setSellBusy] = useState(false);
  const press = usePress(getS);
  const S = getS();
  const sellOn = storePetsEnabled();
  const m = petsOne(readS(S, { id, sellOn, now: Date.now() }));
  const marks = petsMarks(revOf(S), controls);
  const short = room.short;
  if (!m) {
    return (
      <div ref={ref} className={ui2RootClass('u2-pets')} data-pets-page="petsOne" data-pets-one="" data-pets-gone={id || ''}>
        <Ui2Empty title={sellMsg && sellMsg.ok ? sellMsg.text : say(SAY, 'pets.gone')} why={sellMsg && sellMsg.ok ? say(SAY, 'pets.listedNote', { text: sellMsg.text }) : null} />
      </div>
    );
  }
  const v = m.pet;
  const px = short ? 56 : deskWideActive() ? 120 : 96;
  const tags = [v.kindWord, ...v.badges].filter(Boolean);
  const identity = (
    <Ui2Showcase short={short} className="u2-pets-show" figure={<span className="u2-pets-figure">{<PetPortrait pet={v.pet} size={px} />}</span>}
      head={<PetHead v={v} short={short} tags={tags} />} facts={petFacts(v)} />
  );
  const notes = [];
  if (v.level.note) notes.push(<span key="held" className="u2-pets-note" data-pets-held="">{v.level.note}</span>);
  if (v.ward && !v.out) notes.push(<span key="ward" className="u2-pets-note" data-pets-ward-note="">{say(SAY, 'pets.wardOutNote')}</span>);
  if (m.trade && !sellOn) notes.push(<span key="trade" className="u2-pets-note" data-pet-trade={m.trade.ok ? 'ok' : m.trade.why}>{m.trade.words}</span>);
  if (sellMsg && !sellMsg.ok) notes.push(<span key="sell" className="u2-pets-note is-bad" data-pet-sell-msg="">{sellMsg.text}</span>);
  const clean = cleanPetName(text);
  let actions = null;
  if (mode === 'name') {
    actions = (
      <div className="u2-pets-input" data-pets-naming={id}>
        <input data-pet-name-input={id} autoFocus value={text} maxLength={PET_NAME.MAX + 4} placeholder={petKindName(v.kind, v.stage)}
          onChange={(e) => setText(e.target.value)} aria-invalid={text && !clean ? 'true' : undefined} />
        <Ui2Action c="gold" label={say(SAY, 'pets.nameSave')} data-pet-name-save={id} data-enter="" disabled={!clean}
          onClick={() => { if (clean && press(PET_HOLDS.name(id), () => sendPetName(S, id, clean))) { setMode(null); setText(''); } }} />
        <Ui2Action c="silver" label={say(SAY, 'pets.houseKeep')} data-esc="" onClick={() => { setMode(null); setText(''); }} />
        {text && !clean ? <span className="u2-why" data-u2-why="name">{say(SAY, 'pets.nameRule')}</span> : null}
      </div>
    );
  } else if (mode === 'release') {
    actions = (
      <Ui2Confirm action={{ id: 'release', cost: 'irreversible', label: say(SAY, 'pets.releaseYes'), c: 'red' }}
        words={say(SAY, 'pets.releaseAsk', { name: v.name })}
        onYes={() => { press(PET_HOLDS.release(id), () => sendPetRelease(S, id)); setMode(null); }}
        onNo={() => setMode(null)} no={say(SAY, 'pets.releaseKeep')} />
    );
  } else if (mode === 'sell') {
    const pr = Math.floor(Number(price) || 0);
    actions = (
      <div className="u2-pets-input" data-pets-selling={id}>
        <input data-pet-price={id} value={price} inputMode="numeric" pattern="[0-9]*" placeholder={say(SAY, 'pets.pricePlaceholder')}
          onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, '').slice(0, 9))} />
        <Ui2Action c="gold" label={say(SAY, 'pets.listButton')} data-pet-list={id} data-enter="" disabled={!(pr >= 1) || sellBusy} pending={sellBusy}
          onClick={async () => {
            /* the store's one-tap lock, held by the pet's id until the answer (TRAPS §265; as today's page) */
            const lk = 'pet:' + id;
            if (!claimSell(lk, Date.now())) return;
            setSellBusy(true);
            let r = null;
            try { r = await storeListPet(id, pr); } finally { if (!(r && r.unsure)) releaseSell(lk); }   /* no answer is not a no (TRAPS §288): the lock is kept to its time */
            setSellBusy(false);
            if (r && r.unsure) setSellMsg({ ok: false, text: say(SAY, 'pets.listUnsure') });
            else if (r && r.ok) { setSellMsg({ ok: true, text: say(SAY, 'pets.listedFor', { price: pr }) }); setMode(null); }
            else setSellMsg({ ok: false, text: (r && r.reason && TRAP_WORDS[r.reason]) || (r && r.error) || say(SAY, 'pets.notListed') });
          }} />
        <Ui2Action c="silver" label={say(SAY, 'pets.houseKeep')} data-esc="" onClick={() => setMode(null)} />
      </div>
    );
  } else {
    const face = {
      active: { label: say(SAY, v.out ? 'pets.putAway' : 'pets.takeOut'), c: v.out ? 'silver' : 'gold',
        onPress: () => press(PET_HOLDS.active, () => sendPetActive(S, v.out ? null : id)) },
      rename: { label: say(SAY, 'pets.rename'), c: 'silver', onPress: () => { setText(v.pet.name || ''); setMode('name'); } },
      release: { label: say(SAY, 'pets.release'), c: 'red', onPress: () => setMode('release') },
      sell: { label: say(SAY, 'pets.sellShort'), c: 'silver', onPress: () => { setPrice(''); setSellMsg(null); setMode('sell'); } },
    };
    actions = (
      <Ui2Actions marks={{ active: marks[PET_HOLDS.active], rename: marks[PET_HOLDS.name(id)], release: marks[PET_HOLDS.release(id)] }}
        actions={m.actions.map((a) => ({ ...a, ...face[a.id] }))} />
    );
  }
  return (
    /* sideways a pet's page scrolls in its box: the pet, then its notes, then its actions */
    <div ref={ref} className={ui2RootClass('u2-pets' + (short ? ' is-scroll' : ''))} data-pets-page="petsOne" data-pets-one={id} data-pets-out={v.out ? 1 : 0} data-pets-side={short ? 1 : 0}>
      <Ui2Zones identity={identity} summary={notes.length ? <span className="u2-pets-notes">{notes}</span> : null} actions={actions} />
    </div>
  );
}

/* ── All: the journal ── */
function All({ getS, top }) {
  useClock(() => String(revOf(getS())), POLL_MS);
  const [ref, room] = useRoom();
  const [shelf, setShelf] = useState(() => (top && (top.sel === '1' || top.sel === '2') ? top.sel : '1'));
  const S = getS();
  const j = petsJournal((S && S._petBook) || null);
  const side = room.short;
  const big = !side && deskWideActive();
  const px = big ? 72 : 48;
  const shelves = PET_STAGES.map((st) => ({ id: String(st), word: STAGE_WORDS[st] }));
  const cells = j.cells[Number(shelf)] || [];
  const pick = (id) => { setShelf(id); keepPetsSel(petsTop(), id); };
  return (
    <div ref={ref} className={ui2RootClass('u2-pets')} data-pets-page="petsAll" data-pets-all="" data-pets-journal={j.caught} data-pets-side={side ? 1 : 0}>
      <Ui2Collection shelves={shelves} shelf={shelf} onShelf={pick} side={side} big={big} label={say(SAY, 'pets.allAria')} head={j.words}>
        {cells.map((c) => {
          const line = c.caught
            ? say(SAY, 'pets.cellCaught', { count: c.n }) + (c.big ? ' · ' + say(SAY, 'pets.cellBiggest', { pct: c.big }) : '')
            : say(SAY, c.tried ? 'pets.cellNotCaught' : 'pets.cellNotTried');
          return (
            <Ui2CollectionCard key={c.kind + c.stage} data-pets-cell={c.kind + '.' + c.stage} data-pets-caught={c.caught ? 1 : 0}
              dim={!c.caught}
              art={<PetPortrait pet={{ kind: c.kind, stage: c.stage }} size={px} shadow={!c.caught} />}
              mark={c.gold > 0 ? say(SAY, 'pets.cellGolden', { gold: c.gold }) : null}
              name={c.name} sub={c.land} line={line}
              aria-label={[c.name, c.land, line, say(SAY, 'pets.cellTries', { tries: c.tries })].join(', ')}
              onClick={() => openCodexMonster(c.kind, getS)} />
          );
        })}
        <span className="u2-pets-note u2-pets-foot">{say(SAY, 'pets.journalNote')}</span>
      </Ui2Collection>
    </div>
  );
}

/* ── the three frame pages, one component (the dashboard draws the top's
   component in one place: the page is read from the top each draw, and each
   visit, its entry's own key, is a page of its own) ── */
export function PetsSubPage({ getS }) {
  petsKeepGetter(getS);
  const top = petsTop();
  if (!top) return <div className={ui2RootClass('u2-pets')} data-pets-page="" data-pets-gone=""><Ui2Empty title={say(SAY, 'pets.gone')} /></div>;
  if (top.id === 'petsOwned') return <Owned key={top.key} getS={getS} />;
  if (top.id === 'petsAll') return <All key={top.key} getS={getS} top={top} />;
  return <One key={top.key} getS={getS} id={top.sel} />;
}

/* v2.3.6861 (card MN step 4): one pet's page, the same, in the new menus' Bag (menus3/Menus3Bag.jsx) */
export { One as PetOne };
