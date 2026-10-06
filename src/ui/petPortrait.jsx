import React from 'react';
import { PET_SHEET } from '@/data/petSheet.js';
import { PET_ART, petTint, petKindOfOld } from '@/data/trapping.js';

/* ═══ v2.3.3120: A PET'S PORTRAIT, FOR THE PAGES ═══
 * The catch card and the Pets page show a pet as the world draws it: the first
 * front frame of its row of the pet sheet (src/rendering/petSprites.js), in
 * its colour (data/trapping.js petTint) -- multiplied, as a sprite tint is.
 * The sheet is the picture the loading screen already fetched, so this reads
 * it from the browser's cache; each portrait is one small canvas, gone with
 * the row that holds it. */
const URL = PET_SHEET.url + '?v=2.3.3120';
let _img = null;
let _imgReady = null;
function sheet() {
  if (_imgReady) return _imgReady;
  _imgReady = new Promise((resolve) => {
    if (typeof Image === 'undefined') { resolve(null); return; }
    const im = new Image();
    im.onload = () => { _img = im; resolve(im); };
    im.onerror = () => { _imgReady = null; resolve(null); };
    im.src = URL;
  });
  return _imgReady;
}

function draw(cv, pet, shadow) {
  if (!cv || !_img || !pet) return;
  const kind = (pet.kind && Object.prototype.hasOwnProperty.call(PET_ART, pet.kind)) ? pet.kind : petKindOfOld(pet);
  const base = PET_ART[kind].base;
  const b = PET_SHEET.bases[base];
  if (!b) return;
  const C = PET_SHEET.cell;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, cv.width, cv.height);
  g.imageSmoothingEnabled = true;
  g.drawImage(_img, 0, b.row * C, C, C, 0, 0, cv.width, cv.height);
  const tint = petTint({ ...pet, kind });
  if (tint !== 0xffffff) {
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = '#' + tint.toString(16).padStart(6, '0');
    g.fillRect(0, 0, cv.width, cv.height);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(_img, 0, b.row * C, C, C, 0, 0, cv.width, cv.height);
    g.globalCompositeOperation = 'source-over';
  }
  /* v2.3.3121: a kind not caught yet, in the journal: its shape alone */
  if (shadow) {
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#0b1418';
    g.fillRect(0, 0, cv.width, cv.height);
    g.globalCompositeOperation = 'source-over';
  }
}

/** <PetPortrait pet={...} size={48} />  (`shadow`: its shape alone, v2.3.3121) */
export function PetPortrait({ pet, size, shadow }) {
  const ref = React.useRef(null);
  const px = size || 48;
  const sig = pet ? [pet.kind, pet.stage, pet.gold, pet.archetype, pet.element, shadow ? 1 : 0].join('|') : '';
  React.useEffect(() => {
    let live = true;
    sheet().then(() => { if (live) draw(ref.current, pet, !!shadow); });
    return () => { live = false; };
  }, [sig]);   /* redrawn when what it shows changes (`sig`), not every render */
  return (
    <canvas ref={ref} width={64} height={64} data-pet-portrait={pet ? pet.kind || 'old' : ''} data-pet-shadow={shadow ? 1 : undefined}
      style={{ width: px, height: px, imageRendering: 'auto', display: 'block' }} />
  );
}

export default PetPortrait;
