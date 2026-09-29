/* ═══ v2.3.2931: THE PROMPT FOR ONE SQUARE ═══
 *
 * Every prompt is built from three things and nothing else:
 *   - the STYLE BIBLE (plan.style / plan.never) -- identical for all squares;
 *   - what the BLUEPRINT puts in this square -- regions, terrain, landmarks,
 *     where trails and rivers cross its edges;
 *   - which parts of the square are already PAINTED (finished neighbours,
 *     the town painting) -- shown to ChatGPT in the template image.
 *
 * Consistency across ninety separate generations therefore never depends on
 * ChatGPT remembering earlier squares, which it cannot be trusted to do: each
 * square carries its own complete instructions plus real pixels of its
 * neighbours.  Paste the same prompt with the same template and you are
 * asking the same question.
 */
import { coverage, colorNameOf } from './layout.js';
import { cellName, cellRect, gridInfo } from './grid.js';

const REGION_MIN = 0.03;   /* ignore a region with less of the square than this */
const KIND_MIN = 0.003;    /* ...and a terrain shape smaller than this */

function where(cx, cy) {
  const h = cx < 0.34 ? 'left' : cx > 0.66 ? 'right' : '';
  const v = cy < 0.34 ? 'top' : cy > 0.66 ? 'bottom' : '';
  if (!h && !v) return 'in the middle';
  if (h && v) return `in the ${v}-${h}`;
  return v ? `along the ${v}` : `along the ${h} side`;
}

function list(items) {
  if (items.length <= 1) return items.join('');
  return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
}

/* What each coloured shape in the sketch means, in this region. */
function legendLine(plan, k) {
  const rd = plan.regions[k.region] || {};
  const K = plan.classes;
  const color = colorNameOf(plan, k.cls, k.region);
  switch (k.cls) {
    case 'ground': return `${color} = open ground of ${rd.name}: ${rd.paint}`;
    case 'path': return `${color} = ${K.path.paint}`;
    case 'obstacle': return `${color} = ${rd.obstaclePaint || 'dense trees and rocks'}, too thick to walk through`;
    case 'water': return `${color} = ${rd.waterPaint || 'water'}`;
    case 'ocean': return `${color} = ${K.ocean.paint}`;
    case 'cliff': return `${color} = ${rd.cliffPaint || 'a sheer rock cliff'}`;
    case 'lava': return `${color} = ${K.lava.paint}`;
    case 'landmark': return `${color} = ${rd.landmark ? rd.landmark.paint : 'a landmark'}`;
    default: return null;
  }
}

/*   finished: { top, right, bottom, left } -- sides with painted pixels
     anchorsIn: names of finished paintings inside the square (e.g. the town)
     opts.first: nothing anywhere in the world is painted yet
     Returns { id, text, summary, legend[], finished, anchors, sea, regions } */
export function buildPrompt(plan, bp, c, r, finished = {}, anchorsIn = [], opts = {}) {
  const g = gridInfo(plan);
  const id = cellName(c, r);
  const rect = cellRect(g, c, r);
  const cov = coverage(plan, bp, rect);

  const land = cov.classes.filter((k) => k.cls !== 'ocean' && k.cls !== 'anchor');
  const landTotal = land.reduce((s, k) => s + k.n, 0);
  const sea = cov.classes.filter((k) => k.cls === 'ocean').reduce((s, k) => s + k.frac, 0);

  /* regions by share of the LAND in this square */
  const regShare = new Map();
  for (const k of land) {
    const e = regShare.get(k.region) || { id: k.region, n: 0, su: 0, sv: 0 };
    e.n += k.n; e.su += k.cx * k.n; e.sv += k.cy * k.n;
    regShare.set(k.region, e);
  }
  const regions = [...regShare.values()].map((e) => ({ ...e, frac: landTotal ? e.n / landTotal : 0, cx: e.su / e.n, cy: e.sv / e.n }))
    .filter((e) => e.frac >= REGION_MIN).sort((a, b) => b.n - a.n);

  /* ── what's in it ── */
  const bits = [];
  const anchorFrac = cov.classes.filter((k) => k.cls === 'anchor').reduce((s, k) => s + k.frac, 0);
  if (anchorsIn.length && anchorFrac > 0.25) {
    bits.push(`Most of this square is ${list(anchorsIn)}, already painted — only the ground around it is left to paint.`);
  } else if (anchorsIn.length) {
    bits.push(`${list(anchorsIn).replace(/^./, (m) => m.toUpperCase())} reaches into this square, already painted.`);
  }
  if (regions.length) {
    const main = plan.regions[regions[0].id];
    const rest = anchorsIn.length ? 'The rest is' : 'This square is';
    if (regions.length === 1 || regions[0].frac > 0.8) bits.push(`${rest} ${main.name}.`);
    else bits.push(`${rest} mostly ${main.name}.`);
    for (const e of regions.slice(1)) bits.push(`${plan.regions[e.id].name} comes in ${where(e.cx, e.cy)}.`);
  }
  if (sea > 0.9) bits.unshift('This square is almost all open sea.');
  else if (sea > 0.02) {
    const s = cov.classes.filter((k) => k.cls === 'ocean')[0];
    bits.push(`Open sea ${where(s.cx, s.cy)}, with a natural shoreline.`);
  }
  for (const l of cov.landmarks) {
    const lm = plan.regions[l.region].landmark;
    const many = /s$/.test(lm.name);
    bits.push(`The ${lm.name} (${lm.colorName} in the plan) ${many ? 'stand' : 'stands'} ${where(l.cx, l.cy)}.`);
  }
  const cross = (cls) => ['top', 'right', 'bottom', 'left'].filter((s) => cov.edges[s].has(cls));
  const tr = cross('path');
  if (tr.length >= 2) bits.push(`A trail runs through it, leaving by the ${list(tr)} edges.`);
  else if (tr.length === 1) bits.push(`A trail comes in from the ${tr[0]} edge.`);
  const summary = bits.join(' ');

  /* ── the legend: only what this square's sketch actually shows ── */
  const seen = new Set();
  const legend = [];
  for (const k of cov.classes) {
    if (k.frac < KIND_MIN || k.cls === 'anchor') continue;
    const line = legendLine(plan, k);
    if (line && !seen.has(line)) { seen.add(line); legend.push(line); }
  }

  /* ── what's already painted ── */
  const sides = ['top', 'right', 'bottom', 'left'].filter((s) => finished[s]);
  const paintedBits = [];
  if (sides.length) paintedBits.push(`the painted strip${sides.length > 1 ? 's' : ''} along the ${list(sides)} edge${sides.length > 1 ? 's are' : ' is'} finished neighbouring squares of the same map`);
  if (anchorsIn.length) paintedBits.push(`${list(anchorsIn)} ${anchorsIn.length > 1 ? 'are' : 'is'} finished art`);

  const person = Math.round(120 / plan.worldPxPerArtPx / 5) * 5;
  const across = Math.round(g.N / (120 / plan.worldPxPerArtPx));
  const style = plan.style.map((s) => s.replace('{person}', String(person)).replace('{across}', String(across)));

  const L = [];
  L.push(`Paint square ${id} of a large hand-painted game map. I have attached its template image.`);
  L.push('');
  L.push('HOW TO READ THE TEMPLATE');
  if (paintedBits.length) {
    L.push(`• Everything fully painted is finished: ${paintedBits.join(', and ')}. Keep every painted part exactly as it is, in exactly the same place, and continue it seamlessly into the rest of the square — the same trails, water, cliffs, trees, colours and brushwork, with no line or change of style where it meets your painting.`);
  } else if (opts.first) {
    L.push('• Nothing is painted yet anywhere: this square sets the look for the whole map.');
  } else {
    L.push('• Nothing in this square is painted yet.');
  }
  L.push('• Everything in flat colour is a layout plan. Paint over it with real terrain, keeping every shape in the same place and at the same size:');
  for (const l of legend) L.push(`   – ${l}`);
  L.push('• Where two ground colours meet, blend the two landscapes gradually over a wide area — never a straight line.');
  L.push('• Keep the framing exactly: do not zoom, crop, rotate or shift anything.');
  L.push('');
  L.push('WHAT IS IN THIS SQUARE');
  L.push(summary || 'Open ground.');
  L.push('');
  L.push('STYLE (identical for every square of this map)');
  for (const s of style) L.push(`• ${s}`);
  L.push(`• Never add: ${list(plan.never)}.`);
  L.push('');
  L.push('Give back one square image: the finished map square.');

  return {
    id, text: L.join('\n'), summary, legend,
    finished: sides, anchors: anchorsIn,
    sea, regions: regions.map((e) => ({ id: e.id, name: plan.regions[e.id].name, frac: e.frac })),
  };
}
