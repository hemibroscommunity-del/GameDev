import React from 'react';

/* ═══ v2.3.2216: WHAT A STAT IS FOR, SHOWN RATHER THAN SAID ═══
 *
 * Owner, on the Points screen: "Small information ℹ️ next to the name.
 * Tapping it launches into a new window that describes its effect.  It also
 * has a preview of what the effect does (exaggerated)."
 *
 * One scene per stat, played twice side by side -- NOW on the left, WITH
 * MORE POINTS on the right -- so the player reads the difference rather
 * than a definition.  The right pane is exaggerated on purpose: a crit that
 * lands every other hit, a swing twice as fast, a bar that fills to the
 * brim.  Those are not the game's numbers (the real per-point rate prints
 * under the demo, and the owner's stat-preview code supplies it); they are
 * a caricature of the stat's job, which is the thing a definition cannot
 * carry.
 *
 * Pure CSS (game.css, `.bt-sd-*`): no sprite sheet, no canvas, nothing for
 * the preload manifest -- the only images are the stat icons the row is
 * already showing, so they are cached by the time the window opens.  Every
 * animation goes still under prefers-reduced-motion with the end state on
 * screen, so a player who has motion off still gets the comparison.
 *
 * The stat KEY chooses the scene; the caller passes the row's own icon so a
 * future icon swap on the row carries into the window without a second
 * table here. */

/* `x` fans a run of pops across the pane so two that overlap in time do not
   also overlap in space (a still of the crit scene caught a 10 sitting on a
   25!); `y` lifts a pop clear of a figure standing under it. */
const Pop = ({ text, size, cls, delay, dur, x, y }) => (
  <span className={'bt-sd-pop' + (cls ? ' bt-sd-pop--' + cls : '')}
    style={{ fontSize: size, '--sd-delay': delay || '0s', '--sd-dur': dur || '1.6s',
      '--sd-x': (x != null ? x : 50) + '%', '--sd-y': (y != null ? y : 22) + 'px' }}>{text}</span>
);

const Pane = ({ after, children }) => (
  <div className={'bt-sd-pane' + (after ? ' bt-sd-pane--after' : '')}>
    <span className="bt-sd-cap">{after ? 'With more points' : 'Now'}</span>
    {children}
  </div>
);

/* Each scene is a pair of render functions so the two panes stay in lock
   step: same elements, same timing, only the exaggerated value differs. */
const SCENES = {
  dmg: {
    now:   () => <><span className="bt-sd-target" /><Pop text="12" size={15} /></>,
    after: () => <><span className="bt-sd-target" /><Pop text="21" size={24} /></>,
  },
  crit: {
    /* A run of ordinary hits with a rare gold one, against a run where every
       other hit is gold.  Same four beats each side; the right side simply
       lands more of them critical. */
    now:   () => <><span className="bt-sd-target" />
      <Pop text="10" size={14} delay="0s"   dur="3.2s" x={26} />
      <Pop text="10" size={14} delay=".8s"  dur="3.2s" x={42} />
      <Pop text="10" size={14} delay="1.6s" dur="3.2s" x={58} />
      <Pop text="25!" size={20} cls="gold" delay="2.4s" dur="3.2s" x={74} /></>,
    after: () => <><span className="bt-sd-target" />
      <Pop text="10" size={14} delay="0s"   dur="3.2s" x={26} />
      <Pop text="25!" size={20} cls="gold" delay=".8s"  dur="3.2s" x={42} />
      <Pop text="10" size={14} delay="1.6s" dur="3.2s" x={58} />
      <Pop text="25!" size={20} cls="gold" delay="2.4s" dur="3.2s" x={74} /></>,
  },
  critDmg: {
    now:   () => <><span className="bt-sd-target" /><Pop text="25!" size={18} cls="gold" /></>,
    after: () => <><span className="bt-sd-target" /><Pop text="60!" size={28} cls="gold" /></>,
  },
  aspd: {
    now:   (icon) => <img className="bt-sd-icon bt-sd-swing" src={icon} alt="" draggable={false} style={{ '--sd-dur': '1.3s' }} />,
    after: (icon) => <img className="bt-sd-icon bt-sd-swing" src={icon} alt="" draggable={false} style={{ '--sd-dur': '.55s' }} />,
  },
  def: {
    /* The same blow arrives from the left; on the right it shrinks as it
       reaches you, and lands as a smaller number. */
    now:   (icon) => <><img className="bt-sd-figure" src={icon} alt="" draggable={false} style={{ bottom: 10 }} />
      <span className="bt-sd-in" style={{ fontSize: 18, '--sd-hit': 1 }}>−20</span></>,
    after: (icon) => <><img className="bt-sd-figure" src={icon} alt="" draggable={false} style={{ bottom: 10 }} />
      <span className="bt-sd-in" style={{ fontSize: 18, '--sd-hit': .6 }}>−8</span></>,
  },
  hp: {
    now:   (icon) => <><img className="bt-sd-icon" src={icon} alt="" draggable={false} style={{ top: '38%' }} />
      <span className="bt-sd-bar"><i style={{ '--sd-from': '45%', '--sd-to': '45%', '--sd-color': '#E35D5B' }} /></span></>,
    after: (icon) => <><img className="bt-sd-icon" src={icon} alt="" draggable={false} style={{ top: '38%' }} />
      <span className="bt-sd-bar"><i style={{ '--sd-from': '45%', '--sd-to': '96%', '--sd-color': '#E35D5B' }} /></span></>,
  },
  dodge: {
    /* Left: the slash connects and a red number comes off you.  Right: you
       are not where the slash arrives, and it says so. */
    now:   (icon) => <><span className="bt-sd-slash" /><img className="bt-sd-figure" src={icon} alt="" draggable={false} />
      <Pop text="−20" size={15} cls="red" delay=".7s" dur="1.8s" y={48} /></>,
    after: (icon) => <><span className="bt-sd-slash" /><img className="bt-sd-figure bt-sd-figure--dodge" src={icon} alt="" draggable={false} />
      <Pop text="MISS" size={14} cls="miss" delay=".7s" dur="1.8s" y={48} /></>,
  },
  stam: {
    now:   (icon) => <><img className="bt-sd-icon" src={icon} alt="" draggable={false} style={{ top: '38%' }} />
      <span className="bt-sd-bar"><i style={{ '--sd-from': '40%', '--sd-to': '40%', '--sd-color': '#DFAE4E' }} /></span></>,
    after: (icon) => <><img className="bt-sd-icon" src={icon} alt="" draggable={false} style={{ top: '38%' }} />
      <span className="bt-sd-bar"><i style={{ '--sd-from': '40%', '--sd-to': '96%', '--sd-color': '#DFAE4E' }} /></span></>,
  },
  elem: {
    /* Burn ticks: three small ones, then three big ones with a hotter glow. */
    now:   (icon) => <><span className="bt-sd-glow" style={{ '--sd-glow': 1.05 }} /><img className="bt-sd-icon" src={icon} alt="" draggable={false} />
      <Pop text="2" size={12} cls="burn" delay="0s"  dur="2.1s" x={34} y={40} />
      <Pop text="2" size={12} cls="burn" delay=".7s" dur="2.1s" x={50} y={44} />
      <Pop text="2" size={12} cls="burn" delay="1.4s" dur="2.1s" x={66} y={40} /></>,
    after: (icon) => <><span className="bt-sd-glow" style={{ '--sd-glow': 1.5 }} /><img className="bt-sd-icon" src={icon} alt="" draggable={false} />
      <Pop text="7" size={19} cls="burn" delay="0s"  dur="2.1s" x={34} y={40} />
      <Pop text="7" size={19} cls="burn" delay=".7s" dur="2.1s" x={50} y={44} />
      <Pop text="7" size={19} cls="burn" delay="1.4s" dur="2.1s" x={66} y={40} /></>,
  },
};

/** The two-pane demo for one spendable stat.  Unknown keys render nothing
 *  rather than a broken stage, so a new stat gets its description and its
 *  numbers on day one and its scene when somebody draws it. */
export const StatDemo = ({ stat, iconSrc }) => {
  const scene = SCENES[stat];
  if (!scene) return null;
  return (
    <div className="bt-sd" data-stat-demo={stat} aria-hidden="true">
      <Pane>{scene.now(iconSrc)}</Pane>
      <Pane after>{scene.after(iconSrc)}</Pane>
    </div>
  );
};

/** For QA: which stats have a drawn scene. */
export const STAT_DEMO_KEYS = Object.keys(SCENES);
