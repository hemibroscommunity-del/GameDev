/* ═══ v2.3.3355: A BRO WHO EMOTES MOVES (docs/specs/emote-moves.md) ═══
 *
 * The fun & social plan's Phase 1 (docs/FUN-SOCIAL-PLAN.md), the owner's "Go
 * recommended": a wave, a laugh, a flex, a shrug, a facepalm and a cheer for a
 * moment, and sit, sleep, flop and three dances held until you move -- the
 * WHOLE drawn bro tilted, squashed, hopped or mirrored in code
 * (game/emoteMoves.js holds the moves and the math), so every look, every hat
 * and every piece of gear works with no new art and no new memory.
 *
 * Run once a frame AFTER the depth pass, the swimmers and the jumpers and
 * BEFORE the lights (pixiRenderer), jumpFx's order for its reasons: a figure
 * is sorted where it STANDS and only then drawn moving, so an emote never
 * changes what it stands in front of; and the lights then cast its pieces
 * where they are drawn about where it stands (figureFeetY / figureFeetX take
 * the emote's own fix off), so a hop's shadow stays on the ground.
 *
 * Applied ABOUT THE FEET (placeEmote): the boots stay where the server knows
 * they are.  The HUD inside the figure -- the name plate and HP bar
 * (_uiLayer), the two spend bars -- is never tilted, squashed or flipped:
 * each is given the inverse of the emote (holdMatrix), so a sleeping bro's
 * name plate does not lie down with him and a dancer's HP bar does not dance.
 * It only comes DOWN as far as the top of the figure does (a sitter's 30%, a
 * sleeper to just over him), and the speech bubble and emoji over it with it
 * (`_emoteHudDrop`, effectsRenderer).
 *
 * Yours: S._emoteMove (a moment) or S._pose (held), both set by
 * game/interactions.js sendMove.  Another player's: other._emoteMove from the
 * `emote` relay's `{move}` (game/chat.js), other._po from their tick entry
 * (wsClient.js; the worker keeps it, server/src/poses.js).
 *
 * Not drawn on a figure that is hidden (a combat or gathering stand-in is
 * drawn in its place), dead, in the air (jumpFx lifted it this frame) or
 * swimming (swimFx sank it).  Every property this writes is put back the
 * next frame unless something else wrote it since -- the entity pass writes
 * the position and the scale fresh each frame and the rotation never, so a
 * figure left tilted by a frame the entity pass did not touch is righted
 * here first (the swim's and the jump's rule).  Nothing at all is touched
 * while nobody emotes. */
import { Matrix } from 'pixi.js';
import { figureFeetUnits, figureFeetY, figureFeetX, figureSwimLine, selfCorpseUp } from './systems/entityRenderer.js';
import { emoteFrameFor, settleFrame, placeEmote, holdMatrix, onceFrame, holdFrame, moveKind, EMOTE_MOVES } from '../game/emoteMoves.js';

const NEAR_ZERO = 1e-4;
/* v2.3.3357: a pet copies its player's held pose a beat late, its hops and
   slides at its own size (a pet stands about half a bro) */
const PET_LAG_MS = 300;
const PET_K = 0.5;

function isZero(f) {
  return Math.abs(f.hop) < NEAR_ZERO && Math.abs(f.dx) < NEAR_ZERO && Math.abs(f.rot) < NEAR_ZERO
    && Math.abs(f.kx - 1) < NEAR_ZERO && Math.abs(f.ky - 1) < NEAR_ZERO;
}

export class EmoteFx {
  constructor() {
    this._m = new Matrix();
    this._probe = { self: null, peers: 0, ms: 0 };
    this._er = null;
    if (typeof window !== 'undefined') {
      const self = this;
      window.__btEmoteFx = () => self._probe;
      /* QA (mp-emotemoves): a figure as it was last drawn, in its layer's
         space -- where it stands, its scale and tilt, where its name plate
         is (the HUD layer's whole transform) and where its body is.  'self'
         or a player's id. */
      window.__btEmoteFigure = (id) => self._figure(id);
      /* v2.3.3357 (mp-joinin): a pet's or a townsperson's picture as last
         drawn -- 'pet' (yours), 'peerPet' or 'npc' with an id */
      window.__btEmoteSprite = (kind, id) => self._spriteProbe(kind, id);
    }
  }

  _spriteProbe(kind, id) {
    const er = this._er;
    if (!er) return null;
    let d = null;
    if (kind === 'pet') d = er.petDisplay;
    else if (kind === 'peerPet') d = er.peerPetDisplays && er.peerPetDisplays.get(id);
    else if (kind === 'npc') d = er.npcDisplays && er.npcDisplays.get(id);
    const spr = d && !d.destroyed ? (kind === 'npc' ? d._fig : d._sprite) : null;
    if (!spr || spr.destroyed) return null;
    const r = (v) => +v.toFixed(3);
    const base = spr._emo || { sx0: spr.scale.x, sy0: spr.scale.y };
    return { visible: !!d.visible, emoting: !!spr._emo, rot: r(spr.rotation), x: r(spr.x), y: r(spr.y),
      kx: r(spr.scale.x / (base.sx0 || 1)), ky: r(spr.scale.y / (base.sy0 || 1)) };
  }

  _figure(id) {
    const er = this._er;
    if (!er) return null;
    const d = id === 'self' ? er.playerDisplay : (er.otherPlayerDisplays && er.otherPlayerDisplays.get(id));
    if (!d || d.destroyed) return null;
    d.updateLocalTransform();
    const L = d.localTransform;
    const r = (v) => +v.toFixed(3);
    const out = {
      x: r(d.x), y: r(d.y), rot: r(d.rotation), sx: r(d.scale.x), sy: r(d.scale.y), visible: !!d.visible,
      feetX: r(figureFeetX(d)), feetY: r(figureFeetY(d)), emoting: !!d._emo, plate: null, body: null,
      hudDrop: d._emo ? r(d._emoteHudDrop || 0) : 0,
      /* boots to crown standing, world px */
      h: r((() => { const l = figureSwimLine(d); return (l.feet - l.crown) * Math.abs(d._emo ? d._emo.sy0 : d.scale.y); })()),
    };
    const ui = d._uiLayer;
    if (ui && !ui.destroyed) {
      ui.updateLocalTransform();
      const m = new Matrix().appendFrom(ui.localTransform, L);
      out.plate = { a: r(m.a), b: r(m.b), c: r(m.c), d: r(m.d), tx: r(m.tx), ty: r(m.ty) };
    }
    const b = d._spriteBody;
    if (b && !b.destroyed) {
      const pt = L.apply(b.position);
      out.body = { x: r(pt.x), y: r(pt.y) };
    }
    return out;
  }

  update(S, er) {
    this._er = er || null;
    const t0 = performance.now();
    const now = Date.now();
    const p = this._probe;
    p.self = null;
    p.peers = 0;
    if (S && er) {
      const pd = er.playerDisplay;
      S._emoteHudDrop = 0;
      if (pd && !pd.destroyed) {
        this._restore(pd);
        const pose = S._pose && EMOTE_MOVES[S._pose.id] ? S._pose : null;
        let f = null;
        if ((S._emoteMove || pose) && !selfCorpseUp(S)) {
          f = settleFrame(emoteFrameFor(S._emoteMove, pose && pose.id, pose && pose.at, now));
        }
        if (f && this._apply(pd, f, S)) {
          p.self = {
            id: pose ? pose.id : (S._emoteMove && S._emoteMove.id) || null,
            hop: +f.hop.toFixed(2), rot: +f.rot.toFixed(3), kx: +f.kx.toFixed(3), ky: +f.ky.toFixed(3),
            feet: +figureFeetY(pd).toFixed(2), x: +pd.x.toFixed(2), y: +pd.y.toFixed(2),
          };
        }
      }
      if (er.otherPlayerDisplays) {
        const others = S.others || null;
        for (const [id, d] of er.otherPlayerDisplays) {
          if (!d || d.destroyed) continue;
          this._restore(d);
          const o = others && others[id];
          if (!o) continue;
          o._emoteHudDrop = 0;
          if (o._isDead) continue;
          /* a moment that is over is forgotten here (it is drawn only here) */
          if (o._emoteMove && !onceFrame(o._emoteMove.id, now - (o._emoteMove.at || 0))) o._emoteMove = null;
          const hold = o._po && EMOTE_MOVES[o._po] ? o._po : null;
          if (!o._emoteMove && !hold) continue;
          const f = settleFrame(emoteFrameFor(o._emoteMove, hold, o._poAt, now));
          if (this._apply(d, f, o)) p.peers++;
        }
      }
    }
    if (S && er) this._updateFollowers(S, er, now, p);
    p.ms = +(performance.now() - t0).toFixed(3);
  }

  /* ═══ v2.3.3357: YOUR PET AND THE TOWNSFOLK JOIN IN ═══
     A pet copies its player's held pose (sit, sleep, flop, a dance) a beat
     late -- the dances in step, as they keep the clock's beat -- and a
     townsperson does the move game/townsfolkReact.js gave him (Lil Bro
     copying you, Blacksmith Bro's flex, Mayor Bro's cheer).  Each is ONE
     picture anchored at its feet, so the move is put on that picture alone:
     tilted and squashed about its anchor, hopped and slid in its parent's
     units; its shadow, name and badges stay where they are.  Put back every
     frame, as the figures are. */
  _updateFollowers(S, er, now, p) {
    p.pets = 0;
    p.npcs = 0;
    const pd = er.petDisplay;
    if (pd && !pd.destroyed && pd._sprite && !pd._sprite.destroyed) {
      this._restoreSprite(pd._sprite);
      const hold = S._pose && moveKind(S._pose.id) === 'hold' && !selfCorpseUp(S) ? S._pose : null;
      if (hold && pd.visible && this._applySprite(pd._sprite, settleFrame(holdFrame(hold.id, now, hold.at + PET_LAG_MS)), PET_K)) p.pets++;
    }
    if (er.peerPetDisplays) {
      const others = S.others || null;
      for (const [id, d] of er.peerPetDisplays) {
        const spr = d && !d.destroyed ? d._sprite : null;
        if (!spr || spr.destroyed) continue;
        this._restoreSprite(spr);
        const o = others && others[id];
        const hold = o && !o._isDead && moveKind(o._po) === 'hold' ? o._po : null;
        if (hold && d.visible && this._applySprite(spr, settleFrame(holdFrame(hold, now, (o._poAt || now) + PET_LAG_MS)), PET_K)) p.pets++;
      }
    }
    if (er.npcDisplays && er.npcDisplays.size) {
      const byId = new Map();
      for (const n of (S.npcs || [])) if (n && n.id != null) byId.set(n.id, n);
      for (const [id, d] of er.npcDisplays) {
        const fig = d && !d.destroyed ? d._fig : null;
        if (!fig || fig.destroyed) continue;
        this._restoreSprite(fig);
        const npc = byId.get(id);
        if (!npc) continue;
        /* a moment that is over is forgotten (one may start a beat from now) */
        const em = npc._emoteMove;
        if (em && (!EMOTE_MOVES[em.id] || now - (em.at || 0) > (EMOTE_MOVES[em.id].ms || 0))) npc._emoteMove = null;
        const hold = moveKind(npc._po) === 'hold' ? npc._po : null;
        if (!npc._emoteMove && !hold) continue;
        if (d.visible && this._applySprite(fig, settleFrame(emoteFrameFor(npc._emoteMove, hold, npc._poAt, now)), 1)) p.npcs++;
      }
    }
  }

  /* one picture in frame `f`, about its anchor (its feet); `k` sizes the hop
     and the slide (world px) to the figure.  False when nothing moved. */
  _applySprite(spr, f, k) {
    if (isZero(f)) return false;
    if (spr.rotation !== 0 || spr.skew.x !== 0 || spr.skew.y !== 0) return false;
    const x0 = spr.x, y0 = spr.y, sx0 = spr.scale.x, sy0 = spr.scale.y;
    const ps = spr.parent && Math.abs(spr.parent.scale.y) > 1e-3 ? Math.abs(spr.parent.scale.y) : 1;
    spr.x = x0 + (f.dx * k) / ps;
    spr.y = y0 - (f.hop * k) / ps;
    spr.rotation = f.rot;
    spr.scale.x = sx0 * f.kx;
    spr.scale.y = sy0 * f.ky;
    spr._emo = { x0, y0, sx0, sy0, xw: spr.x, yw: spr.y, rw: spr.rotation, sxw: spr.scale.x, syw: spr.scale.y };
    return true;
  }

  _restoreSprite(spr) {
    const r = spr._emo;
    if (!r) return;
    spr._emo = null;
    if (spr.x === r.xw) spr.x = r.x0;
    if (spr.y === r.yw) spr.y = r.y0;
    if (spr.rotation === r.rw) spr.rotation = 0;
    if (spr.scale.x === r.sxw) spr.scale.x = r.sx0;
    if (spr.scale.y === r.syw) spr.scale.y = r.sy0;
  }

  /* put back what this wrote last frame, wherever nothing has written since */
  _restore(d) {
    const r = d._emo;
    if (!r) return;
    d._emo = null;
    d._emoteYw = null;
    d._emoteXw = null;
    d._emoteFeetFix = 0;
    d._emoteXFix = 0;
    if (d.x === r.xw) d.x = r.x0;
    if (d.y === r.yw) d.y = r.y0;
    if (d.rotation === r.rw) d.rotation = 0;
    if (d.scale.x === r.sxw) d.scale.x = r.sx0;
    if (d.scale.y === r.syw) d.scale.y = r.sy0;
    for (const h of r.held) {
      const n = h.n;
      if (!n || n.destroyed) continue;
      if (n.position.x === h.xw) n.position.x = h.x0;
      if (n.position.y === h.yw) n.position.y = h.y0;
      if (n.scale.x === h.sxw) n.scale.x = h.sx0;
      if (n.scale.y === h.syw) n.scale.y = h.sy0;
      if (n.rotation === h.rw) n.rotation = 0;
      if (n.skew.x === h.kxw) n.skew.x = 0;
      if (n.skew.y === h.kyw) n.skew.y = 0;
    }
  }

  /* draw one figure in frame `f`; false when it is not drawn moving.
     `who` (S for you, the peer's record) is told how far its HUD came down
     (`_emoteHudDrop`, world px), which the effects pass adds to the band its
     speech bubble and emoji stand on, a frame later (it draws first) */
  _apply(d, f, who) {
    if (!d.visible || isZero(f)) return false;
    /* in the air (jumpFx lifted it this frame) or in the water (swimFx) */
    if (d._jumpY != null && d.y === d._jumpY) return false;
    if (d._swimK > 0) return false;
    /* only a figure drawn the plain way: upright, unskewed, from its origin
       (a corpse's fallback is tipped over: entityRenderer's death branch) */
    if (d.rotation !== 0 || d.skew.x !== 0 || d.skew.y !== 0 || d.pivot.x !== 0 || d.pivot.y !== 0) return false;
    const sx0 = d.scale.x, sy0 = d.scale.y;
    if (!(Math.abs(sx0) > 1e-3) || !(Math.abs(sy0) > 1e-3)) return false;
    const F = figureFeetUnits(d);
    const line = figureSwimLine(d);
    const x0 = d.x, y0 = d.y;
    const pl = placeEmote({ x: x0, y: y0, sx: sx0, sy: sy0 }, f, F, line.feet - line.crown);
    if (![pl.x, pl.y, pl.sx, pl.sy, pl.q.a, pl.q.d, pl.q.tx, pl.q.ty].every(Number.isFinite)) return false;
    const held = [];
    for (const n of [d._uiLayer, d._resMpBlocks, d._resEnBlocks]) {
      if (!n || n.destroyed || n.parent !== d) continue;
      if (n.rotation !== 0 || n.skew.x !== 0 || n.skew.y !== 0 || n.pivot.x !== 0 || n.pivot.y !== 0) continue;
      const u = { x: n.position.x, y: n.position.y, sx: n.scale.x, sy: n.scale.y };
      const m = holdMatrix(pl.q, u);
      this._m.set(m.a, m.b, m.c, m.d, m.tx, m.ty);
      n.setFromMatrix(this._m);
      held.push({
        n, x0: u.x, y0: u.y, sx0: u.sx, sy0: u.sy,
        xw: n.position.x, yw: n.position.y, sxw: n.scale.x, syw: n.scale.y,
        rw: n.rotation, kxw: n.skew.x, kyw: n.skew.y,
      });
    }
    d.x = pl.x;
    d.y = pl.y;
    d.rotation = pl.rot;
    d.scale.x = pl.sx;
    d.scale.y = pl.sy;
    d._emo = { x0, y0, sx0, sy0, xw: d.x, yw: d.y, rw: d.rotation, sxw: d.scale.x, syw: d.scale.y, held };
    d._emoteYw = d.y;
    d._emoteXw = d.x;
    d._emoteFeetFix = pl.feetFix;
    d._emoteXFix = pl.xFix;
    d._emoteHudDrop = pl.hudDrop;
    if (who) who._emoteHudDrop = pl.hudDrop;
    return true;
  }
}
