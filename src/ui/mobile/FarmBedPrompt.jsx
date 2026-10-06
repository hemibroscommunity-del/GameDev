/* ═══ v2.3.3124: THE BED YOU STAND AT, AS A BUTTON ═══
 *
 * On your farm the bed your boots are in reach of offers its next step --
 * "Dig", "Plant Carrot", "Water", "Fertilize", "Harvest" -- in the interact
 * prompt's own slot (the Wheel's doors' Enter), the same step the right
 * stick's picture shows and E takes (game/farmWalk.js).  One tap of it and
 * you kneel there.  Planting with more than one kind of seed in the bag puts
 * the seeds' own pictures over it, the one it will plant lit: a tap picks
 * another -- the only choice farming asks of you, made where you stand (the
 * owner: "I don't want the game to just be reading a bunch of boring
 * menus").
 *
 * onClick only, the Enter button's rule (BroTown v2.3.3032): a touchstart
 * that hides the button lets the phone's follow-up click land on whatever is
 * under it.  Reads the game state on a short timer, like the other prompts.
 */
import React from 'react';
import { FARM } from '@/data/farmCrops.js';
import { farmArtUrl } from '@/rendering/farmWorld.js';
import { startFarmStep, farmSeedToPlant, farmSeedsInHand, pickFarmSeed } from '@/game/farmWalk.js';

const WORDS = { dig: 'Dig', plant: 'Plant', water: 'Water', feed: 'Fertilize', harvest: 'Harvest' };
const ICON = (step) => '/ui/controls/farm-' + step + '.svg?v=2.3.3124';
const POLL_MS = 150;

function read(S) {
  const near = S && S.currentZone === 'farm_home' && S._nearBed && S._nearBed.step
    && !S._farmWork && !S._farmArtHold && !S._dying ? S._nearBed : null;
  if (!near) return null;
  const seed = near.step === 'plant' ? farmSeedToPlant(S) : null;
  const seeds = near.step === 'plant' ? farmSeedsInHand(S) : [];
  return { key: near.i + '|' + near.step + '|' + seed + '|' + seeds.join(',') + '|' + (S._isDesktop ? 1 : 0),
    i: near.i, step: near.step, seed, seeds, desktop: !!S._isDesktop };
}

export function FarmBedPrompt({ stateRef, hidden }) {
  const [v, setV] = React.useState(null);
  React.useEffect(() => {
    const t = setInterval(() => {
      const n = read(stateRef.current);
      setV((old) => ((old ? old.key : '') === (n ? n.key : '') ? old : n));
    }, POLL_MS);
    return () => clearInterval(t);
  }, []);
  if (!v || hidden) return null;
  const crop = v.seed && FARM.CROPS[v.seed];
  const label = v.step === 'plant' ? (crop ? 'Plant ' + crop.name : 'Plant') : WORDS[v.step];
  const go = (e) => {
    if (e) e.preventDefault();
    const S = stateRef.current;
    if (S) startFarmStep(S, v.i);
    setV(read(stateRef.current));
  };
  const pick = (id) => (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const S = stateRef.current;
    if (S) pickFarmSeed(S, id);
    setV(read(stateRef.current));
  };
  return (
    <div data-farm-bed-prompt={v.step} data-farm-bed={v.i}
      style={{ position: 'fixed', zIndex: 35, left: 'calc(50% + 24px)', transform: 'translateX(-50%)',
        bottom: 'calc(var(--sheet-h, var(--dash-h)) + 24px + var(--nml-lift, 0px))',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, pointerEvents: 'none' }}>
      {v.seeds.length > 1 && (
        <div data-farm-seed-picker="1" style={{ display: 'flex', gap: 4, pointerEvents: 'auto' }}>
          {v.seeds.map((id) => (
            <button key={id} data-farm-seed-pick={id} data-on={id === v.seed ? 1 : 0} onClick={pick(id)} aria-label={FARM.CROPS[id].name}
              style={{ width: 40, height: 40, padding: 3, borderRadius: 10, cursor: 'pointer', touchAction: 'manipulation',
                background: id === v.seed ? 'rgba(42,54,62,.96)' : 'rgba(17,25,29,.86)',
                border: id === v.seed ? '2px solid #D8AA58' : '1px solid rgba(216,170,88,.35)' }}>
              <img src={farmArtUrl(id + '-ripe')} alt="" draggable={false}
                style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'auto', pointerEvents: 'none' }} />
            </button>
          ))}
        </div>
      )}
      <button data-farm-step={v.step} onClick={go}
        style={{ pointerEvents: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px 7px 10px',
          background: 'rgba(17,25,29,.94)', border: '1.5px solid #D8AA58', borderRadius: 10, color: '#fff',
          fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer', touchAction: 'manipulation', fontFamily: 'inherit' }}>
        {v.desktop && <kbd style={{ background: 'rgba(255,255,255,.2)', padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>E</kbd>}
        <img src={ICON(v.step)} alt="" draggable={false} style={{ width: 22, height: 22, pointerEvents: 'none' }} />
        {label}
      </button>
    </div>
  );
}
