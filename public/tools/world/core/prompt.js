/* ═══ v2.3.2931: THE PROMPT FOR ONE SQUARE ═══
 *
 * Every prompt is built from four things and nothing else:
 *   - the STYLE BIBLE (plan.style / plan.never) -- identical for all squares;
 *   - the STYLE KEY picture, when the owner has made one -- attached to every
 *     square's chat, so the look is matched to a picture, not to words;
 *   - what the BLUEPRINT puts in this square -- its region and which stage
 *     of it (each spoke has four looks, one per twenty levels), the border
 *     landscape where two regions meet, the passes and gates, the town's
 *     streets and plots, and exactly which edges each road, the river and
 *     the railway cross (and which way the river flows);
 *   - which parts of the square are already PAINTED (finished neighbours) --
 *     shown to ChatGPT in the template image.
 *
 * Owner, 2026-09-29: "I made the zone maps as a lazy 'make me a volcanic map'
 * in early demo stages.  Obviously I should include much more specificity."
 * The specificity lives in plan.js (stages, borders, landmarks) and is
 * assembled here per square, so each prompt carries its own complete
 * instructions plus real pixels of its neighbours.  Consistency never
 * depends on ChatGPT remembering earlier squares, which it cannot be trusted
 * to do: paste the same prompt with the same template and you are asking the
 * same question.
 */
import { coverage, colorNameOf, routeCrossings } from './layout.js';
import { cellName, cellRect, gridInfo, SIDES } from './grid.js';

const REGION_MIN = 0.03;   /* ignore a region with less of the square's land than this */
const BORDER_MIN = 0.08;   /* ...and a border unless both sides have this much */
const BAND_MIN = 0.2;      /* mention a region's second band when it holds this much of it */
const KIND_MIN = 0.003;    /* ignore a terrain shape smaller than this */

const cap = (s) => String(s).replace(/^./, (m) => m.toUpperCase());

function where(cx, cy) {
  const h = cx < 0.34 ? 'left' : cx > 0.66 ? 'right' : '';
  const v = cy < 0.34 ? 'top' : cy > 0.66 ? 'bottom' : '';
  if (!h && !v) return 'in the middle';
  if (h && v) return `in the ${v}-${h}`;
  return v ? `along the ${v}` : `along the ${h} side`;
}
/* how a second region enters a square: "comes in along the top", "comes in
   at the bottom-left", or -- centred on the square, i.e. all round it --
   "fills the rest" */
function comesIn(cx, cy) {
  const w = where(cx, cy);
  if (w === 'in the middle') return 'fills the rest';
  return w.startsWith('in ') ? `comes in at ${w.slice(3)}` : `comes in ${w}`;
}
function toward(cx, cy) {
  const h = cx < 0.4 ? 'left' : cx > 0.6 ? 'right' : '';
  const v = cy < 0.4 ? 'top' : cy > 0.6 ? 'bottom' : '';
  if (!h && !v) return 'the middle';
  return h && v ? `the ${v}-${h}` : `the ${v || h}`;
}

function list(items) {
  if (items.length <= 1) return items.join('');
  return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
}

/* "Frost Ridge -- the snowbound taiga: deep snow ..." for the stage of a
   region that holds most of it in this square, plus the next stage when it
   holds enough to show. */
function regionDescription(plan, cov, id) {
  const rd = plan.regions[id];
  const bands = (cov.bands[id] || []).filter((b) => b.n > 0).sort((a, b) => b.n - a.n);
  const z = rd.stages && bands[0] ? rd.stages[bands[0].stage] : null;
  const look = z ? `${z.name}: ${z.paint}` : rd.paint;
  const text = z && rd.stages.length > 1 ? `${rd.name} — ${look}` : `${rd.name}: ${z ? z.paint : rd.paint}`;
  let more = '';
  const b2 = bands[1];
  if (z && b2 && b2.frac >= BAND_MIN && rd.stages[b2.stage]) {
    const z2 = rd.stages[b2.stage];
    more = ` Toward ${toward(b2.cx, b2.cy)} it becomes ${z2.name}: ${z2.paint}.`;
  }
  return { text, look, more };
}

/* The landscape between two regions (null when there is nothing to say). */
function borderLine(plan, a, b) {
  if (a === 'town' || b === 'town') return null;
  const ra = plan.regions[a], rb = plan.regions[b];
  if (a === 'commons' || b === 'commons') {
    const other = a === 'commons' ? rb : ra;
    return other.commonsEdge ? `Where ${plan.regions.commons.name} meets ${other.name}, ${other.commonsEdge}.` : null;
  }
  const brief = (plan.borders || {})[[a, b].sort().join('|')];
  return brief ? `Between ${ra.name} and ${rb.name} the land blends through ${brief.land}.` : null;
}

/* Brotown's streets, square and plots in this square, from the plan's
   geometry (art px from the world centre). */
function townLines(plan, g, rect, cov) {
  const T = plan.town, K = plan.classes;
  if (!T) return [];
  const has = (cid) => cov.classes.some((k) => k.cls === cid && k.frac > KIND_MIN);
  if (!has('street') && !has('plaza') && !cov.lots.some((l) => l.town)) return [];
  const rx0 = rect.x - g.cx, ry0 = rect.y - g.cy, rx1 = rx0 + rect.w, ry1 = ry0 + rect.h;
  const overlaps = (x0, y0, x1, y1) => x1 > rx0 && x0 < rx1 && y1 > ry0 && y0 < ry1;
  const out = [];
  const plaza = cov.classes.find((k) => k.cls === 'plaza');
  if (plaza && plaza.frac > KIND_MIN) {
    const hall = cov.lots.find((l) => l.id === (T.hallLot && T.hallLot.id));
    out.push(`The town square (${K.plaza.colorName}) is ${where(plaza.cx, plaza.cy)}${hall ? `, with the empty plot for the ${hall.name} (${K.lot.colorName}) at its centre` : ''}.`);
  }
  const roadAt = (x, y) => {
    let best = null, bd = Infinity;
    for (const r of plan.roads || []) {
      const dx = r.pts[0][0] * g.P - x, dy = r.pts[0][1] * g.P - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = r; }
    }
    return best && bd < 300 * 300 ? best : null;
  };
  const streets = [
    { name: 'Main Street', x0: -T.main, y0: -(T.gateNS || T.gate), x1: T.main, y1: T.gateNS || T.gate, ns: true },
    { name: 'Market Row', x0: -(T.gateEW || T.gate), y0: -T.row, x1: T.gateEW || T.gate, y1: T.row, ns: false },
  ];
  for (const s of streets) {
    if (!overlaps(s.x0, s.y0, s.x1, s.y1)) continue;
    const a = s.ns ? (s.y0 < ry0 ? 'top' : null) : (s.x0 < rx0 ? 'left' : null);
    const b = s.ns ? (s.y1 > ry1 ? 'bottom' : null) : (s.x1 > rx1 ? 'right' : null);
    const gateA = s.ns ? 'north' : 'west', gateB = s.ns ? 'south' : 'east';
    const endA = s.ns ? [0, s.y0] : [s.x0, 0], endB = s.ns ? [0, s.y1] : [s.x1, 0];
    const col = `(${K.street.colorName})`;
    if (a && b) out.push(`${s.name} ${col} runs straight through it from the ${a} edge to the ${b} edge.`);
    else {
      const edge = a || b, gate = a ? gateB : gateA, end = a ? endB : endA;
      const road = roadAt(end[0], end[1]);
      out.push(`${s.name} ${col} comes in from the ${edge} edge and ends at the town's ${gate} gate${road ? `, where it becomes ${road.name}` : ''}.`);
    }
  }
  if (cov.lots.some((l) => l.town)) {
    out.push(`Raised wooden boardwalks (${K.boardwalk.colorName}) run along the street in front of the building plots (${K.lot.colorName}). Every plot stays EMPTY — bare, level earth. The buildings are added to the game separately, so do not paint any.`);
  }
  return out;
}

/* One sentence per stretch of road, river or railway inside the square. */
function routeLines(plan, bp, rect) {
  const out = [];
  const near = (p, q, d) => (p[0] - q[0]) * (p[0] - q[0]) + (p[1] - q[1]) * (p[1] - q[1]) < d * d;
  const g = gridInfo(plan);
  /* v2.3.2994: a road that starts this near the centre starts at a town
     gate -- 1.5 squares was the old town's; the 1.5x town's north gate is
     past it (each street its own gate, gateNS / gateEW) */
  const TG = plan.town;
  const gateReach = Math.max(1.5 * g.P, TG ? Math.max(TG.gate || 0, TG.gateNS || 0, TG.gateEW || 0) + 0.25 * g.P : 0);
  const planRoad = Object.create(null), planRiver = Object.create(null), planRail = Object.create(null);
  for (const r of plan.roads || []) planRoad[r.id] = r;
  for (const r of plan.rivers || []) planRiver[r.id] = r;
  for (const r of plan.rails || []) planRail[r.id] = r;
  /* what a route begins or ends at: a landmark, a gate or a place */
  const endsAt = (pt) => {
    const at = bp.pois.find((p) => (p.kind === 'landmark' || p.kind === 'gate' || p.kind === 'place') && near(pt, [p.x, p.y], p.r * 1.3 + 40));
    return at ? at.name : null;
  };
  /* the road a road ends ON, when it ends on one of its points (a pass
     reaching the next spoke's trunk) */
  const joins = (route) => {
    const me = planRoad[route.id];
    if (!me) return null;
    const pe = me.pts[me.pts.length - 1];
    const other = (plan.roads || []).find((o) => o.id !== me.id && o.pts.some((q) => q[0] === pe[0] && q[1] === pe[1]));
    return other ? other.name : null;
  };
  const branchOf = (route) => {
    const src = (route.kind === 'road' ? plan.roads : plan.rails) || [];
    const me = (route.kind === 'road' ? planRoad : planRail)[route.id];
    if (!me) return null;
    const p0 = me.pts[0];
    const trunk = src.find((o) => o.id !== me.id && o.pts.some((q) => q[0] === p0[0] && q[1] === p0[1]));
    return trunk ? trunk.name : null;
  };
  for (const route of bp.routes) {
    const n0 = out.length;
    for (const s of routeCrossings(route, rect)) {
      const name = cap(route.name);
      const first = route.pts[s.first], last = route.pts[s.last];
      if (route.kind === 'river') {
        const rv = planRiver[route.id] || {};
        if (s.from && s.to) out.push(s.from === s.to ? `${name} curves in and out along the ${s.from} edge.` : `${name} flows in from the ${s.from} edge and out by the ${s.to} edge.`);
        else if (!s.from && s.to) out.push(`${name} rises here${rv.source ? `, ${rv.source},` : ''} and flows out by the ${s.to} edge.`);
        else if (s.from && !s.to) out.push(`${name} flows in from the ${s.from} edge${rv.mouth ? ` and ${rv.mouth}` : ' and out into the sea'}.`);
        else out.push(`${name} runs across the square.`);
        continue;
      }
      if (s.from && s.to) {
        out.push(s.from === s.to ? `${name} dips in and out along the ${s.from} edge.` : `${name} runs through it from the ${s.from} edge to the ${s.to} edge.`);
      } else if (!s.from && s.to) {
        const trunk = branchOf(route);
        const at = endsAt(first);
        out.push(trunk ? `${name} branches off ${trunk} here and heads out by the ${s.to} edge.`
          : at ? `${name} begins at ${at} here and heads out by the ${s.to} edge.`
            : route.kind === 'road' && Math.hypot(first[0] - g.cx, first[1] - g.cy) < gateReach ? `${name} begins at the town gate here and heads out by the ${s.to} edge.`
              : `${name} begins here and heads out by the ${s.to} edge.`);
      } else if (s.from && !s.to) {
        const at = endsAt(last), joined = route.kind === 'road' ? joins(route) : null;
        out.push(joined ? `${name} comes in from the ${s.from} edge and joins ${joined} here.`
          : at ? `${name} comes in from the ${s.from} edge and ends at ${at}.` : `${name} comes in from the ${s.from} edge and ends here${route.abandoned ? ', unfinished' : ''}.`);
      } else {
        out.push(`${name} runs across the square.`);
      }
    }
    if (route.abandoned && route.paint && out.length > n0) out.push(`It is ${route.paint}.`);
  }
  return out;
}

/* The legend: what each coloured shape in THIS square's sketch means.
   Colours are grouped, so a class whose look depends on the region (a cliff,
   the river) gets one line saying how it looks in each region present. */
function legendLines(plan, bp, cov, rect) {
  const K = plan.classes;
  const groups = new Map();
  const add = (color, region, text, label) => {
    if (!color || !text) return;
    let e = groups.get(color);
    if (!e) groups.set(color, (e = { color, label, parts: [] }));
    if (!e.parts.some((p) => p.text === text)) e.parts.push({ region, text });
  };
  const crossing = (kind) => bp.routes.filter((r) => r.kind === kind && routeCrossings(r, rect, 1).length);
  for (const k of cov.classes) {
    if (k.frac < KIND_MIN || k.cls === 'anchor') continue;
    const rd = plan.regions[k.region] || {};
    const color = colorNameOf(plan, k.cls, k.region);
    switch (k.cls) {
      case 'ground': add(color, k.region, k.region === 'town' ? `the open ground of ${rd.name}: its yards` : `the open ground of ${rd.name}`); break;
      case 'obstacle': add(color, k.region, `${rd.obstaclePaint || 'dense trees and rocks'}, too thick to walk through`); break;
      case 'water': add(color, k.region, rd.waterPaint || 'water'); break;
      case 'cliff': add(color, k.region, rd.cliffPaint || 'a sheer rock cliff'); break;
      case 'landmark': add(color, k.region, rd.landmark ? `${rd.landmark.name}: ${rd.landmark.paint}` : 'a landmark'); break;
      case 'gate': add(color, k.region, rd.gate ? `${rd.gate.name}: ${rd.gate.paint}` : 'an ancient stone gate'); break;
      case 'river': {
        const rv = crossing('river')[0];
        add(color, k.region, rd.riverPaint || 'a clear river', rv ? rv.name : null);
        break;
      }
      case 'rail': {
        const rails = crossing('rail');
        const live = rails.filter((r) => !r.abandoned);
        add(color, null, !live.length && rails.length && rails[0].paint ? rails[0].paint : K.rail.paint);
        break;
      }
      case 'bridge': {
        const b = cov.pois.find((p) => p.kind === 'bridge');
        add(color, null, (b && b.paint) || K.bridge.paint, b ? b.name : null);
        break;
      }
      default: if (K[k.cls] && K[k.cls].paint) add(color, null, K[k.cls].paint);
    }
  }
  const out = [];
  for (const e of groups.values()) {
    const lead = e.label ? `${e.label}: ` : '';
    if (e.parts.length === 1) out.push(`${e.color} = ${lead}${e.parts[0].text}`);
    else out.push(`${e.color} = ${lead}${e.parts.map((p) => `in ${plan.regions[p.region] ? plan.regions[p.region].name : 'places'}, ${p.text}`).join('; ')}`);
  }
  return out;
}

/*   finished: { top, right, bottom, left } -- sides with painted pixels
     anchorsIn: names of finished paintings inside the square
     opts.first: nothing anywhere in the world is painted yet
     opts.styleKey: the owner keeps a style key and attaches it
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
    bits.push(`${cap(list(anchorsIn))} reaches into this square, already painted.`);
  }
  if (sea > 0.9) bits.push('This square is almost all open sea.');
  regions.forEach((e, i) => {
    const d = regionDescription(plan, cov, e.id);
    if (i === 0) {
      const lead = anchorsIn.length ? 'The rest is' : 'This square is';
      bits.push(`${lead} ${regions.length === 1 || e.frac > 0.8 ? '' : 'mostly '}${d.text}.${d.more}`);
    } else {
      bits.push(`${plan.regions[e.id].name} ${comesIn(e.cx, e.cy)} — ${d.look}.`);
    }
  });
  const big = regions.filter((e) => e.frac >= BORDER_MIN).map((e) => e.id);
  for (let i = 0; i < big.length; i++) for (let j = i + 1; j < big.length; j++) {
    const line = borderLine(plan, big[i], big[j]);
    if (line) bits.push(line);
  }
  if (sea > 0.02 && sea <= 0.9) {
    const s = cov.classes.filter((k) => k.cls === 'ocean')[0];
    bits.push(`Open sea ${where(s.cx, s.cy)}, with a natural shoreline.`);
  }
  bits.push(...townLines(plan, g, rect, cov));
  bits.push(...routeLines(plan, bp, rect));
  const K = plan.classes;
  for (const p of cov.pois) {
    if (p.kind === 'landmark' || p.kind === 'gate') {
      const lm = p.kind === 'gate' ? plan.regions[p.region].gate : plan.regions[p.region].landmark;
      const many = /s$/.test(lm.name);
      bits.push(`${cap(lm.name)} (${lm.colorName} in the plan) ${many ? 'stand' : 'stands'} ${where(p.cx, p.cy)}.`);
    } else if (p.kind === 'pass') {
      const pa = plan.regions[p.a], pb = plan.regions[p.b], look = (plan.passPaint || {})[p.tier];
      bits.push(`${cap(p.name)}, the pass joining ${pa.name} and ${pb.name}, crosses ${where(p.cx, p.cy)}${look ? `: ${look}` : ''}.`);
    } else if (p.kind === 'place') {
      bits.push(`The empty plot ${where(p.cx, p.cy)} (${K.lot.colorName}) is kept for ${p.name}${p.paint ? `, ${p.paint}` : ''}. Leave it empty: the building is added separately.`);
    } else if (p.kind === 'bridge') {
      bits.push(`${cap(p.name)} (${K.bridge.colorName}) carries ${p.road} over the river ${where(p.cx, p.cy)}.`);
    } else if (p.kind === 'falls') {
      bits.push(`${cap(p.name)} is ${where(p.cx, p.cy)}: ${p.paint}.`);
    }
  }
  const summary = bits.join(' ');

  const legend = legendLines(plan, bp, cov, rect);

  /* ── what's already painted ── */
  const sides = SIDES.filter((s) => finished[s]);
  const paintedBits = [];
  if (sides.length) paintedBits.push(`the painted strip${sides.length > 1 ? 's' : ''} along the ${list(sides)} edge${sides.length > 1 ? 's are' : ' is'} finished neighbouring squares of the same map`);
  if (anchorsIn.length) paintedBits.push(`${list(anchorsIn)} ${anchorsIn.length > 1 ? 'are' : 'is'} finished art`);

  const person = Math.round(120 / plan.worldPxPerArtPx / 5) * 5;
  const across = Math.round(g.N / (120 / plan.worldPxPerArtPx));
  const style = plan.style.map((s) => s.replace('{person}', String(person)).replace('{across}', String(across)));

  const L = [];
  L.push(`Paint square ${id} of a large pixel-art game map. I have attached its template image${opts.styleKey ? ' and the map\'s style key' : ''}.`);
  L.push('');
  L.push('HOW TO READ THE TEMPLATE');
  if (opts.styleKey) {
    L.push('• There are two pictures: the TEMPLATE for this square (flat colours, with any finished parts painted in) and the STYLE KEY (a sheet of nine small sample tiles). Paint in exactly the style of the style key — its pixel size, colours, shading, light and level of detail — but do not copy its tiles, its grid or anything in it.');
  }
  if (paintedBits.length) {
    L.push(`• Everything fully painted is finished: ${paintedBits.join(', and ')}. Keep every painted part exactly as it is, in exactly the same place, and continue it seamlessly into the rest of the square — the same roads, water, cliffs, colours, pixel size and shading, with no line or change of style where it meets your painting.`);
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

/* The one-off prompt for the style key sheet (plan.styleKey), with the scale
   filled in -- shown by the builder before the first square. */
export function styleKeyPrompt(plan) {
  return plan.styleKey ? plan.styleKey.prompt.join('\n') : '';
}
