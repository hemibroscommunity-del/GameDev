import React from 'react';
import { COL, panelStyle } from './common.js';
import { dashboardPanelBus } from '../dashboardPanelBus.js';

/* ═══ v2.3.2820: ABOUT, PRIVACY, RULES, CREDITS ═══
 * The 2026-09-24 demo audit: a public demo with no privacy notice, no rules
 * and no credits anywhere a player could see them -- CREDITS.md lived only
 * in the repository, and the game keeps a per-device id for anti-cheat
 * (networking/index.js DEVICE NONCE), which is exactly the thing a privacy
 * notice exists to say out loud.
 *
 * WHAT THIS PAGE CLAIMS IS WHAT THE CODE DOES -- keep it that way.  Each
 * "we store" line maps to a real store: the character record and progress
 * (GameRoom DO storage: auth:, char:, rpg:), the device nonce (join ->
 * botfp.js), crash reports (/api/feedback/crash, crashTrap.js), feedback
 * tickets (Feedback DO), reported chat lines (chatmod.js), and a linked
 * wallet address (broverify.js bro_link:).  Add a row here in the same PR
 * as any new thing the game keeps about a player.
 *
 * It is a plain-language starting draft written from the code, not legal
 * advice; the owner signs off on the wording (and the age line) before it
 * is relied on. */

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ fontSize: 13, fontWeight: 800, color: COL.accent, margin: '0 0 6px' }}>{title}</div>
    <div style={{ fontSize: 13, color: COL.text2, lineHeight: 1.5 }}>{children}</div>
  </div>
);
const Li = ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>;
const ul = { margin: 0, paddingLeft: 18 };

export const AboutPanel = () => (
  <div style={panelStyle} data-about="">
    <Section title="Bro Town">
      An early demo of an online action RPG. Everything you do is saved on our
      server, so the world is shared with everyone playing. It is a work in
      progress: things change, break and get fixed often, and progress may be
      reset while the demo runs.
    </Section>

    <Section title="What we keep, and why">
      <ul style={ul}>
        <Li><b style={{ color: COL.text }}>Your character</b> — its name, look,
          level, items and gold, so you can come back to it.</Li>
        <Li><b style={{ color: COL.text }}>A scrambled copy of your Login Key</b> —
          so only you can open your character. We never store the key itself.</Li>
        <Li><b style={{ color: COL.text }}>A device id</b> — a random id and a
          rough summary of your browser and screen, to spot cheating and bot
          accounts. It stays on our server and is not shared.</Li>
        <Li><b style={{ color: COL.text }}>Crash reports</b> — the error message
          and your browser type when the game breaks, so we can fix it.</Li>
        <Li><b style={{ color: COL.text }}>Feedback you send</b> — it appears on the
          public Feedback board with your character's name.</Li>
        <Li><b style={{ color: COL.text }}>Reported chat</b> — if someone reports a
          chat message, we keep that message so it can be reviewed.</Li>
        <Li><b style={{ color: COL.text }}>A wallet address</b> — only if you choose
          to link one to verify a Hemi Bro.</Li>
      </ul>
      <div style={{ marginTop: 6 }}>
        No ads, no selling your data, no email or real name required. Chat is
        seen by other players in real time.
      </div>
    </Section>

    <Section title="Rules">
      <ul style={ul}>
        <Li>Be decent in chat. Harassment, hate and spam get muted or removed.</Li>
        <Li>No cheating, bots, or exploiting bugs. Report bugs instead.</Li>
        <Li>Keep your Login Key private — anyone with it can play your character.</Li>
        <Li>Bro Town is meant for players aged 13 and over.</Li>
        <Li>The demo is provided as-is, and characters or items may be changed or
          reset while it is being built.</Li>
      </ul>
    </Section>

    <Section title="Credits">
      A Hemi Bros game. Most art and all music were made for this
      game with AI tools (OpenAI image generation, Suno). Sound effects come from
      Pixabay and Freesound creators, including floraphonic,
      freesound_community, matthewvakaliuk73627 and litupsubway. Fonts: Baloo 2,
      Press Start 2P and Source Sans 3 (SIL Open Font License). Built with
      React, PixiJS, Vite and Cloudflare Workers.
    </Section>

    <button onClick={() => dashboardPanelBus.push('feedback')} className="button-primary"
      style={{ minHeight: 44, padding: '0 18px', fontSize: 13, touchAction: 'manipulation', width: '100%' }}>
      Questions or problems? Send feedback
    </button>
  </div>
);
