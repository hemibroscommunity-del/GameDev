/* ═══ THE BLOCK BUTTON'S SHIELD ON A CALM DISC (v2.3.3677) ═══
 *
 * The owner, 2026-10-27: "I want a different icon for the shield block (the
 * light explosion makes it look like an attach)".  The owner's gold shield is
 * lifted off its burst onto a still steel-blue disc (tools/ui/cut-owner-icons.py
 * `calm`).
 *
 * On a phone (390 x 844, 2x) in the world's BroTown, against a real worker:
 *   1. a Pine Shield worn and a blow taken (a fight on): the Block button is up
 *      and wears the new picture, asked for at its new address (?v=2.3.3677),
 *      loaded whole (160 px);
 *   2. on screen, round the shield inside the button's ring, the disc is the
 *      calm blue (blue over red in most of it) and none of the old burst's
 *      yellows is left; the shield's own gold is still in the middle;
 *   3. the shield up (a tap): the button lit, the same picture;
 *   4. no page errors.
 * Pictures: tools/qa/mp/out/blockface-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

/* the button's pixels: the ring of the disc round the shield, and its middle */
function colours(buf) {
  const png = H.decodePng(buf);
  const ch = png.channels || Math.round(png.data.length / (png.width * png.height));
  const W = png.width, Hh = png.height, cx = (W - 1) / 2, cy = (Hh - 1) / 2, R = Math.min(W, Hh) / 2;
  let ring = 0, blue = 0, burst = 0, mid = 0, gold = 0;
  for (let y = 0; y < Hh; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * ch;
      const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2];
      const d = Math.hypot(x - cx, y - cy) / R;
      /* the disc between the shield and the game's ring, left and right of it
         (the shield is ~0.55 of the radius wide at these heights) */
      if (d > 0.66 && d < 0.9 && Math.abs(y - cy) < R * 0.35) {
        ring++;
        if (b > r + 20) blue++;
        if (r > 200 && g > 150 && b < 120) burst++;   /* the old burst's yellows */
      }
      if (d < 0.2) { mid++; if (r > 150 && g > 90 && b < 90 && r > b + 80) gold++; }
    }
  }
  return { ring, blue, burst, mid, gold };
}

/* the right cluster round the Block button, for the pictures */
const around = (P) => P.page.evaluate((vw) => {
  const b = document.querySelector('[data-shield]');
  const r = b.getBoundingClientRect();
  const x = Math.max(0, Math.round(r.left - 60)), y = Math.max(0, Math.round(r.top - 150));
  return { x, y, width: Math.min(vw - x, 260), height: 260 };
}, PHONE.width);

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Blocky', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the world' }).catch(() => null);
    rec.ok('in the world (guard)', !!inW, inW);
    if (!inW) return;
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 30 });
    await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});

    /* a Pine Shield on the arm, as the bag's Equip wears it (mp-shieldgem) */
    await H.devOp(wsPort, 'kit', me, { what: 'shield' });
    const gid = await H.waitFor(P, (S) => { const p = ((S.rpg && S.rpg.shieldStash) || []).find((q) => q && q.gid && /Shield/.test(q.name)); return p ? p.gid : null; },
      (v) => !!v, { timeout: 10000, label: 'the shield in the bag' }).catch(() => null);
    rec.ok('a shield in the bag (guard)', !!gid, gid);
    if (!gid) return;
    await P.page.evaluate((g) => {
      const S = window._gameState.current, R = S.rpg;
      const i = R.shieldStash.findIndex((p) => p && p.gid === g);
      if (R.shield) R.shieldStash.push(R.shield);
      R.shield = R.shieldStash.splice(i, 1)[0];
      S.channel.send({ type: 'shield_wear', payload: { gid: g } });
    }, gid);

    /* a fight on: a blow taken through the game's own handler keeps the
       button up 5 s, so it is struck again before each look */
    const blow = () => P.page.evaluate(() => {
      const S = window._gameState.current;
      window.__btDispatch({ type: 'monster_attack', payload: { monsterId: 'qa-block', targetId: S.myId, dmg: 1, dmgTaken: 1, zone: S.currentZone,
        attackerX: S.player.x + 40, attackerY: S.player.y, ability: 'qa' } });
    });
    await blow();
    const btn = await H.waitFor(P, () => {
      const b = document.querySelector('[data-shield]');
      const img = b && b.querySelector('[data-icon="block"] img');
      if (!img) return null;
      return { src: img.getAttribute('src'), w: img.naturalWidth, done: img.complete };
    }, (v) => !!v && v.done && v.w > 0, { timeout: 8000, label: 'the Block button' }).catch(() => null);
    rec.ok(`1. the Block button is up and wears the new picture, at its new address, loaded whole (${btn && btn.src}, ${btn && btn.w} px)`,
      !!btn && /\/ui\/controls\/abil-block\.webp\?v=2\.3\.3677$/.test(btn.src) && btn.w === 160, btn);

    /* 2. on screen: a calm blue disc round the shield, no burst left */
    await blow();
    await P.page.waitForTimeout(300);
    const face = await P.page.$('[data-shield] [data-icon="block"]');
    const buf = face ? await face.screenshot() : null;
    const c = buf ? colours(buf) : null;
    await blow();
    if (buf) await P.page.screenshot({ path: join(OUT, 'blockface-down.png'), clip: await around(P) }).catch(() => {});
    rec.ok(`2. round the shield the disc is the calm blue (${c && c.blue} of ${c && c.ring} px blue, ${c && c.burst} of the old burst's yellow) and the shield's gold is in the middle (${c && c.gold} of ${c && c.mid})`,
      !!c && c.ring > 50 && c.blue / c.ring > 0.8 && c.burst === 0 && c.gold / c.mid > 0.5, c);

    /* 3. the shield up: lit, the same picture */
    await blow();
    await P.page.evaluate(() => { const b = document.querySelector('[data-shield]'); if (b) b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    const up = await H.waitFor(P, () => {
      const b = document.querySelector('[data-shield]');
      const img = b && b.querySelector('[data-icon="block"] img');
      return b ? { state: b.getAttribute('data-shield'), src: img && img.getAttribute('src') } : null;
    }, (v) => !!v && v.state === 'up', { timeout: 5000, label: 'the shield up' }).catch(() => null);
    await P.page.screenshot({ path: join(OUT, 'blockface-up.png'), clip: await around(P) }).catch(() => {});
    rec.ok(`3. a tap raises the shield: the button lit, the same picture (${up && up.state})`,
      !!up && up.state === 'up' && /abil-block\.webp\?v=2\.3\.3677$/.test(up.src || ''), up);
    rec.ok('4. no page errors', errors.length === 0, errors.slice(0, 3));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
