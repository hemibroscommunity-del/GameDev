import React from 'react';
import { petKindName, cleanPetName, PET_NAME, PET_BIG_AT } from '@/data/trapping.js';
import { sendPetName } from '@/game/petBook.js';
import { PetPortrait } from '@/ui/petPortrait.jsx';

/* ═══ v2.3.3111: A NEW PET'S CARD ═══
 * Plan: docs/PET-TRAPPING-PLAN.md -- the trap "snaps shut (a card shows your
 * new pet)".  Shown once the snap has played (game/trapping.js puts the pet on
 * S._trap.card at the end of the animation), over the world, never over a
 * menu.  It says what you caught, its level, and a Golden or Big ribbon when
 * it is one; you may name it here ("each player names their own pet", the
 * owner's yes), or later on the Pets page.  A name the worker would refuse is
 * never sent: the same rule runs here (data/trapping.js cleanPetName).
 * Its own clock, like the TRAP button. */
const POLL_MS = 200;

export function TrapCatchCard({ stateRef }) {
  const [, setTick] = React.useState(0);
  const seenRef = React.useRef(null);
  const [name, setName] = React.useState('');
  React.useEffect(() => {
    const id = setInterval(() => {
      const S = stateRef && stateRef.current;
      const c = S && S._trap && S._trap.card;
      const k = c ? c.at : null;
      if (k !== seenRef.current) { seenRef.current = k; setName(''); setTick((x) => (x + 1) % 1000000); }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [stateRef]);

  const S = stateRef && stateRef.current;
  const card = S && S._trap && S._trap.card;
  if (!card || !card.pet) return null;
  const pet = card.pet;
  const kindName = petKindName(pet.kind, pet.stage);
  const big = Number(pet.size) >= PET_BIG_AT;
  const clean = cleanPetName(name);
  const close = () => { if (S._trap) S._trap.card = null; seenRef.current = null; setTick((x) => (x + 1) % 1000000); };
  const give = () => {
    if (clean && sendPetName(S, pet.id, clean)) close();
  };
  return (
    <div data-trap-card={pet.id} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
      style={{ position: 'fixed', left: '50%', top: '22%', transform: 'translateX(-50%)', zIndex: 60,
        width: 'min(300px, calc(100vw - 32px))', boxSizing: 'border-box', padding: '14px 14px 12px', borderRadius: 16,
        background: '#1E2E34', border: '1px solid ' + (pet.gold ? '#EAC675' : 'rgba(229,237,233,.2)'),
        boxShadow: '0 10px 30px rgba(0,0,0,.5)', color: '#F4F0E7', fontFamily: "'Source Sans 3',sans-serif", textAlign: 'center' }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: '#7EE0A8' }}>Caught!</div>
      <div style={{ display: 'grid', placeItems: 'center', margin: '6px auto 4px', width: 96, height: 96, borderRadius: 14,
        background: pet.gold ? 'radial-gradient(circle, rgba(234,198,117,.35), rgba(17,30,35,.9))' : '#111E23' }}>
        <PetPortrait pet={pet} size={88} />
      </div>
      <div style={{ fontSize: 17, fontWeight: 800 }}>{kindName}</div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', margin: '5px 0 10px', flexWrap: 'wrap' }}>
        <span style={{ padding: '2px 8px', borderRadius: 999, background: '#111E23', fontSize: 12, fontWeight: 800, color: '#D8AA58' }}>Lv {pet.lv || 1}</span>
        {pet.gold ? <span data-trap-card-gold="1" style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(234,198,117,.18)', fontSize: 12, fontWeight: 800, color: '#EAC675' }}>Golden!</span> : null}
        {big ? <span data-trap-card-big="1" style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(126,224,168,.14)', fontSize: 12, fontWeight: 800, color: '#7EE0A8' }}>Big</span> : null}
      </div>
      <input data-trap-card-name="1" value={name} maxLength={PET_NAME.MAX + 4} placeholder={'Name your ' + kindName}
        onChange={(e) => setName(e.target.value)}
        style={{ width: '100%', boxSizing: 'border-box', minHeight: 40, padding: '0 10px', borderRadius: 10, fontSize: 15,
          background: '#111E23', color: '#F4F0E7', border: '1px solid ' + (name && !clean ? '#D8635D' : 'rgba(229,237,233,.2)'), fontFamily: 'inherit' }} />
      <div style={{ fontSize: 11, color: name && !clean ? '#E59A94' : '#8D9B98', margin: '4px 0 10px', minHeight: 14 }}>
        {name && !clean ? 'Names are 2-16 letters, numbers or spaces' : 'You can name it later on the Pets page'}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button data-trap-card-done="1" onClick={close}
          style={{ flex: 1, minHeight: 44, borderRadius: 10, fontSize: 14, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer',
            background: '#293B41', color: '#F4F0E7', border: '1px solid rgba(229,237,233,.2)' }}>Done</button>
        <button data-trap-card-give="1" disabled={!clean} onClick={give}
          style={{ flex: 1, minHeight: 44, borderRadius: 10, fontSize: 14, fontWeight: 800, fontFamily: 'inherit', cursor: clean ? 'pointer' : 'default',
            background: clean ? 'linear-gradient(180deg,#E2B765,#D2A14D)' : '#1A292F', color: clean ? '#172126' : '#8D9B98',
            border: '1px solid ' + (clean ? '#EAC675' : 'rgba(229,237,233,.11)') }}>Name it</button>
      </div>
    </div>
  );
}

export default TrapCatchCard;
