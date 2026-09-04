/* TEMPORARY AUDIT PROBE — the TOP of the screen on an installed iPhone.
   Simulates env(safe-area-inset-top)=59 by re-declaring the ONE rule that
   reads it (.bt-zone-header), then measures every top-pinned overlay
   against the rail's real painted bottom and against the status-bar strip. */
import * as H from './harness.mjs';

const SAT = 59;

const survey = (P, sat) => P.page.evaluate((SAT) => {
  const hdr = document.querySelector('.bt-zone-header');
  const hr = hdr ? hdr.getBoundingClientRect() : null;
  const out = [];
  const all = document.querySelectorAll('body *');
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed' && cs.position !== 'absolute') continue;
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    if (r.top > 130) continue;
    if (r.height > 400) continue;   /* full-screen layers are not "top-pinned" */
    out.push({
      tag: el.tagName.toLowerCase(),
      cls: (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '').toString().slice(0, 60),
      id: el.id || '',
      data: [...el.attributes].filter(a => a.name.startsWith('data-')).map(a => a.name).join(','),
      z: cs.zIndex,
      top: Math.round(r.top), bottom: Math.round(r.bottom),
      cssTop: cs.top,
      text: (el.textContent || '').trim().slice(0, 40),
    });
  }
  return {
    SAT,
    innerH: window.innerHeight,
    railTop: hr ? Math.round(hr.top) : null,
    railBottom: hr ? Math.round(hr.bottom) : null,
    railH: hr ? Math.round(hr.height) : null,
    boxes: out,
  };
}, sat);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'TopAudit', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* make the optional top-region HUDs real */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S) {
      S._cursedUntil = Date.now() + 600000; S._bleedUntil = Date.now() + 600000;
      if (!S.rpg) S.rpg = {};
      S.rpg._quests = { tut_1: 'active' };
      S._deathDrops = [{ zone: 'frost', expiry: Date.now() + 600000, items: [{ qty: 3 }] }];
      S._activeClanWar = null;
    }
  });
  await P.page.waitForTimeout(1500);

  for (const sat of [0, SAT]) {
    if (sat) {
      await P.page.evaluate((v) => {
        const st = document.createElement('style');
        st.id = 'bt-fake-notch';
        /* exactly what the browser computes for .bt-zone-header when
           env(safe-area-inset-top) resolves to v */
        st.textContent = `.bt-zone-header{height:calc(50px + ${v}px)!important;padding:${v + 4}px 5px 0!important}`;
        document.head.appendChild(st);
        window.dispatchEvent(new Event('resize'));
      }, sat);
      await P.page.waitForTimeout(700);
    }
    const s = await survey(P, sat);
    console.log(`\n  ══ SAT=${sat}  rail ${s.railTop}..${s.railBottom} (h ${s.railH}) ══`);
    for (const b of s.boxes) {
      const underStatusBar = b.top < sat;
      const underRail = b.top < s.railBottom;
      console.log(`    ${String(b.top).padStart(4)}..${String(b.bottom).padStart(4)} z=${String(b.z).padStart(6)}`
        + ` cssTop=${b.cssTop.padStart(7)} ${underStatusBar ? 'STATUSBAR ' : '          '}`
        + `${underRail ? 'UNDER-RAIL ' : '           '}`
        + `${b.tag}#${b.id}.${b.cls}[${b.data}] "${b.text}"`);
    }
    /* Nothing pinned near the top may sit inside the status-bar strip, and
       nothing that paints BELOW the rail (z < 20) may start above its bottom
       edge.  Both are trivially true at SAT=0 -- that is the whole point:
       every existing scenario runs there and sees a healthy screen. */
    for (const b of s.boxes) {
      if (b.id === 'bt-resume-banner' || b.cls.includes('bt-zone-header')) continue;
      rec.ok(`SAT=${sat}: "${b.text.slice(0, 24)}" (top ${b.top}) clears the status bar (${sat}px)`,
        b.top >= sat, b);
      if (Number(b.z) < 20) {
        rec.ok(`SAT=${sat}: "${b.text.slice(0, 24)}" (z ${b.z}) starts below the rail bottom ${s.railBottom}`,
          b.top >= s.railBottom, { box: b, railBottom: s.railBottom });
      }
    }
  }
  /* the away/idle banner, built from wsClient.js's own cssText */
  const banner = await P.page.evaluate(() => {
    const el = document.createElement('div');
    el.id = 'bt-resume-banner';
    el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#1b2536;color:#fff;font:13px/1.5 sans-serif;padding:10px 12px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.5);';
    el.textContent = 'You were away, so your character logged out. ';
    const b = document.createElement('button');
    b.textContent = "I'm back";
    b.style.cssText = 'margin-left:8px;padding:4px 12px;border-radius:6px;border:1px solid rgba(255,255,255,.3);background:#3dd497;color:#08231a;font-weight:700;cursor:pointer;';
    el.appendChild(b);
    document.body.appendChild(el);
    const r = el.getBoundingClientRect(), br = b.getBoundingClientRect();
    const cs = getComputedStyle(document.documentElement);
    return {
      bannerTop: Math.round(r.top), bannerBottom: Math.round(r.bottom),
      textTop: Math.round(r.top + parseFloat(getComputedStyle(el).paddingTop)),
      btnTop: Math.round(br.top), btnBottom: Math.round(br.bottom), btnRight: Math.round(br.right),
      sat: cs.getPropertyValue('--sat') || '(unset)',
      sab: cs.getPropertyValue('--sab') || '(unset)',
      probePadTop: (() => { const p = document.getElementById('bt-sab-probe');
        return p ? getComputedStyle(p).paddingTop : '(no probe)'; })(),
    };
  });
  console.log('\n  ══ away banner ══ ' + JSON.stringify(banner));
  rec.ok(`the away/idle banner clears the status bar (text top ${banner.textTop} >= ${SAT})`,
    banner.textTop >= SAT, banner);
  rec.ok('resize() stamps a --sat for the top inset the way it stamps --sab',
    banner.sat.trim() !== '' && banner.sat.trim() !== '(unset)', banner);

  await P.ctx.close().catch(() => {});
}
