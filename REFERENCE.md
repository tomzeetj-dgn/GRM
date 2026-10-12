# GRM — Reference

Working notes for the GRM site. A living spec; update it whenever the locked
hero or the glow/gradient layers change. `main` is the only branch; pushing
deploys to GitHub Pages immediately.

Repo: `/Users/tomzee/Code/GRM`
Remote: `https://github.com/tomzeetj-dgn/GRM.git` (branch `main`, auto-push)
Live: `https://tomzeetj-dgn.github.io/GRM/` · Local: `python3 -m http.server 8080` → `127.0.0.1:8080`

---

## 1. Site map & theming

Multi-page umbrella brand. Division pages carry a shared header/footer
(injected) plus a full-bleed division logo behind the page hero. The home
page is hero-only on desktop (`overflow: hidden`, no nav links, no mobile
menu, no footer — guarded by the `isHome` flag). On phones (§8) home becomes a
naturally scrolling stack and the brand-only header is re-shown.

| Division page | URL       | body theme      | Accent (--accent / --accent-lite) |
| ------------- | --------- | --------------- | --------------------------------- |
| Studio        | `/studio/`  | `theme-studio`    | `#7a5d11` / `#f5cf6a` (deep `#3a2c05`, hair `rgba(245,207,106,.32)`) |
| Label         | `/label/`   | `theme-label`     | `#0c5e4a` / `#2ee6a8` (deep `#062e24`, hair `rgba(46,230,168,.32)`) |
| Liveroom      | `/liveroom/`| `theme-liveroom`  | `#8a3d1a` / `#ff8f56` (deep `#4a1f0a`, hair `rgba(255,143,86,.32)`) |

Header brand links to `index.html`; division navigation links live in the
injected chrome (only on division pages). The home page offers no nav.

---

## 2. The home hero — LOCKED core, do not touch

- **Three `<a class="panel">` dividers** — Studio, Label, Liveroom — each a
  link to its division. Interactive: hover / keyboard (Arrow keys move
  focus+expand) / touch (tap) / `focus-visible`. One expands at a time
  (accordion); `mouseleave` / `pointer-leave` / Escape resettles via
  `settle()`.
- **Expansion is flex-grow only** (`flex-grow: 1` → `3.2` on
  `.is-expanded`), transitioned `650ms var(--ease-hero)`. **Expand/hover/
  active logic is frozen** — never modify the mechanics, hover states,
  `is-expanded` toggling, arrow-key handling, `aria-expanded` mirroring, or
  the accordion reset.
- `.panel__logo-window` is `position:absolute; inset:0; z-index:0; overflow:
  hidden; pointer-events:none`. The imgs are centered by a `50vw/50vh` offset
  + `translate(-50%,-50%)`, sized `min(130vw, 1872px)` square,
  `object-fit:contain`, `mix-blend-mode:screen`. **Logo geometry is frozen** —
  width/height/transform/position/blend must stay pixel-identical (logo holds
  `array of 3 windows`; JS `syncLogoWindows()` syncs positions when hover/
  expand re-layouts).
- Content is `z-index:2`; that's where the readability gradient layer (z1)
  and the glow layer go — between logo (z0) and content (z2) — visually only,
  never touching pointer events or geometry.

Geometry checkpoints (verified pixel-identical across every change):
- Neutral panel widths: `479 / 480 / 480` (equal thirds)
- Expanded widths: `886 / 277 / 278` (flex-grow 3.2 on the active)
- Logo window: full panel; imgs share one centered `min(130vw,1872px)` box

---

## 3. Readability gradient (on active panel type)

`.panel::before` — a pure visual layer **over the logo, under the content**,
`pointer-events:none`, i.e. no clipping/geometry interaction. Designed so it
never reads as a footer/black rectangle: it darkens the *bottom edge* of the
active panel to separate the panel name + tag + accent overline; it dissolves
to fully transparent well before the central logo glow region.

```css
.panel::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1; /* logo(0) < gradient < content(2) */
  background: linear-gradient(
    to top,
    rgba(0,0,0,0.85) 0%,   /* strongest at bottom edge */
    rgba(0,0,0,0.60) 14%,
    rgba(0,0,0,0.34) 28%,
    rgba(0,0,0,0.14) 40%,
    rgba(0,0,0,0.05) 52%,
    rgba(0,0,0,0)    62%   /* fully dissolved before central glow */
  );
  opacity: 0;
  transition: opacity 420ms ease 90ms;
  pointer-events: none;
}
.panel.is-expanded::before,
.panel:focus-visible::before { opacity: 1; }
```

Timing is matched to the content reveal so the fade reads as one motion.

---

## 4. Logo glow-on-hover (current)

Each panel logo window now stacks two renders and crossfades between them —
**no CSS filter, no drop-shadow**. The division logos are baked PNG renders;
hovering/focusing/expanding a panel fades the colored **Glow** render in over
the flat **NoGlow** base executed in-place (same window → same geometry, and
both imgs inherit the single `.panel__logo-window img` rule, so the glow
tracks the base exactly as it scales on expand).

Markup (Studio shown; Label/Liveroom identical with their own files):
```html
<div class="panel__logo-window panel__logo-window--studio" aria-hidden="true">
  <img src="assets/img/GRM Studio NoGlow.png" alt="">
  <img class="panel__logo--glow" src="assets/img/GRM Studio Glow.png" alt=""
       aria-hidden="true">
</div>
```

CSS (added to the hero block in `css/style.css`):
```css
.panel__logo-window .panel__logo--glow {
  position: absolute;      /* inherits the shared img centering */
  opacity: 0;
  transition: opacity 520ms var(--ease-hero) 60ms;
}
.panel:hover .panel__logo--glow,
.panel:focus-visible .panel__logo--glow,
.panel.is-expanded .panel__logo--glow { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .panel__logo-window .panel__logo--glow { transition: none; }
}
```

- Drop-shadow filters were **removed** (NoGlow base is flat; the CSS glow was
  redundant smoke on top of the baked renders).
- `mix-blend-mode: screen` on the shared `img` rule keeps each division's
  palette true and lets the glow read as light without tinting the window.
- Reduced motion disables the fade; both layers are still pointer-events:none.

---

## 5. Type & chrome

- **Display face** (self-hosted): `UltraCondensedSansSerif`
  (`@font-face` → `assets/fonts/UltraCondensedSansSerif.{woff2,ttf}`,
  `font-weight:100 900; font-stretch:62.5% 125%`). Used on brand, division
  names, display titles. Fallback stack `"Archivo", "Arial Narrow", sans-serif`.
- Body copy follows system/`Inter` stack.
- Header/footer chrome injected by `injectSiteChrome()` in `js/main.js`; the
  home page via `isHome` skips nav + mobile menu + footer.
- Division accent overrides live on `body.theme-*` (see table above) and tint
  the chrome + hero.

---

## 6. Workflow conventions

- Commit + push are always done together (Pages deploys on push).
- Git identity is auto-configured per-commit (git warns about it — cosmetic,
  not blocking).
- Visual checks use the local server + headless browser inspection via temp
  scripts in `/var/folders/dq/ykxsg1g13s1bh13_hh1rl3x80000gn/T/opencode/`
  (outside the repo, never committed).
- After any hero change: re-verify the neutral/expanded geometry
  (`479/480/480` → `886/277/278`) and the gradient `opacity` in expanded vs
  neutral before calling it done — the logo window is the one thing that
  must never move.
- Hard-refresh (Cmd+Shift+R) to clear cached hero assets on the live page.

---

## 7. Label — polish slate (Phase 1)

All Label-phase rules are fully scoped to `body.theme-label` / `.label-*` in the
appended "GRM LABEL — PHASE ONE" block of `css/style.css` plus the page-local
script at the bottom of `label/index.html`. No shared rule is modified.

- **Hero metadata**: `body.theme-label .label-hero-meta` (facts line
  `Est. 2017 · Belgrade · 13 releases · 10 artists`), positioned to inherit
  the hero slot shared with the scroll cue (the cue drops on Label only);
  rides the arrival/morph fade sequence.
- **Editorial opener (manifesto)**: statement `WE RELEASE MUSIC / WE BELIEVE IN.`
  (markup lowercase + uppercase transform; single mint accent on `<em>believe</em>`),
  `--label-copy:rgba(236,233,226,.78)` lives ONLY on `body.theme-label`;
  copy 38rem measure, `clamp(1.05rem,.95vw,1.15rem)`/1.7, `padding-top:calc(var(--sec) + clamp(24px,3vh,48px))`;
  facts row is spans (no dl), letter-spacing `.22em`, tabular-nums.
- **Roster — compact editorial index** (replaces the full-width image wipe). No bands,
  no masked stage, no wipe, no veil, no drift. Ten rows, each: `01    DZU    03 RELEASES`
  (index + display-face name + release count). Row height ~77px @1440 (name
  `clamp(2rem,3.5vw,3.5rem)`, #ece9e2; index/count 14px body, `--text-faint`, .16em,
  hover/focus -> `--text-muted`). Restrained hairline separators, no cards/boxes/radius. `vitić`
  is lowercase in the source (no `text-transform` on names). Roster footprint ~1.1-1.3 viewports.
- **Preview module** — a single editorial annotation module on the right of the list (desktop >=820px
  only), anchored to the roster column (module top aligns with the first row; `position:sticky; top:clamp(16px,4vh,48px)`).
  Composition inside one quiet module (no card/background/shadow/radius; spacing, hairlines and type only):
  1. eyebrow `Selected release` (reuses `.eyebrow`)
  2. one-line copy — `Point at a name in the index to browse their latest sleeve.`
  3. artwork frame — `clamp(220px,22vw,320px)`, aspect-ratio 1, 1px hairline border, crisp 1:1 crop, no glow/blur/tilt/zoom
  4. metadata beneath — active artist name (display face, title-capped) over `Latest release · <title>` (14px→11.2px stack),
     split by a hairline border-top above the name
  Two stacked `.label-roster__frame-img` layers crossfade 250ms on row hover/focus/click; module title+meta follow the
  row via per-row `data-title` (real release titles, e.g. `Prizma`, `Trap je Mrtav`, `Slojevi`). Frame capped at 320px so
  2x DPR <= 640 against native 640x640 artwork — no upscaling. Reduced-motion swaps instantly. No layout shift (absolute
  layers in a fixed aspect-ratio frame); rapid pointer movement is stable (swap only on src change, two layers only).
  Hidden below 820px (pure typographic list, easy to browse on touch).
- **Active row state** (hover / keyboard-focus only; no dimension or position animation): index `01..10` -> Label mint
  (`--accent-lite`), release count -> `--label-copy` (.78, brighter than its rest .46), name -> `#ffffff` (subtle,
  already near-white). The row geometry stays fixed.
- Dead wipe CSS/JS fully removed (`.label-roster__band/stage/image/veil`, `.is-lit`, wipes, drift);
  the roster preview IIFE is page-local in `label/index.html`.
- **Image treatment (retired)** — the old full-width band treatment (opacity .6, dual-layer veil,
  saturate/brightness filter, 700ms clip wipe) was removed with the wipe. Do not reintroduce behind
  the roster.
- **CTA**: `#submissions` kept with the `hidden` attribute — folds into the Label end slate later
  (reversible).

---

## 8. Home — mobile stacked destinations

Additive, phone-only layer in `css/style.css` + the
`HOME · MOBILE STACKED DESTINATION SELECTOR` `onReady` block in `js/main.js`.
It activates at the existing 767px hero breakpoint **or** on phones in
landscape (`(pointer: coarse) and (max-height: 560px)`), so a touch-only
landscape phone never receives the hover-only desktop accordion. The desktop
accordion, hover, `settle()`, `syncLogoWindows()` and the frozen logo geometry
are never touched above those queries.

- Rest: the three `.panel` links stack as full-width destination panels that
  together fill the entire available mobile viewport — **the selector IS the
  screen**, headerless. Each carries `.panel__mobile` — a cinematic
  `--zone-bg` photograph, dark scrim, division tint, the division's single-colour
  **Glow** mark, a large condensed title, a division-colour accent rule, a short
  descriptor and a northeast arrow. `.panel__logo-window`, `.panel__content`,
  `.panel__zone` and `.panel::before` are all retired on the stacked layout.
- Headerless + full viewport: on mobile Home `body[data-page="home"]
  .site-header { display: none }` (the desktop home header is already hidden, so
  the mobile re-show is gone) — no brand logo, nav, hamburger, border or
  reserved height, and no spacer. `.hero` is `100vh`/`100dvh` with a
  `min-height: 100svh` floor (tracks the collapsing/expanding browser chrome so
  the three equal `flex: 1 1 0` bands always total the visible height); no
  `padding-top`/header offset survives, so Studio starts at the top edge and
  Liveroom reaches the bottom edge with no scroll. Safe-area insets are applied
  to internal content only (`panel__mobile-body` left/right/bottom), never to the
  outer height. A deliberate compacted landscape treatment
  (`(pointer: coarse) and (max-height: 560px) and (orientation: landscape)`)
  shrinks the marks/copy so the three bands still fit a shallow phone viewport
  without ever exposing the hover-dependent desktop accordion.
- Tap the whole panel (capture-phase listener on `#heroPanels`, so it never
  reaches the desktop click handler). Two non-overlapping phases:
  1. **Isolation (~180ms, `ease-out`)** — tap adds `is-mobile-isolating` to the
     hero, which fades every panel's `media`/`scrim`/`tint`/`title`/`rule`/
     `desc`/`arrow` to 0, fades the non-selected marks, and makes the row
     dividers transparent, revealing the near-black `--bg`. The selected mark is
     lifted into a fixed `.grm-mobile-transition-logo` and held **stationary** at
     its own rect, so the stage resolves to *black + one logo*.
  2. **Morph (560ms)** — only once the isolation has run does the fixed mark
     ease (`--ease-hero`) from its resting box to the destination page's
     **measured** logo rect; navigation commits 40ms after the morph completes,
     so the arrival has nothing to jump. Total tap → destination ≈ 840ms.
  A second tap during either phase is ignored (single per-navigation lock). On a
  `pageshow` bfcache return the lock re-arms and the isolation state is fully
  torn down so the home is never left hidden.
- Destination rect source of truth: the division pages' published
  `grm-dest-logo:v2:<page>:<w>x<h>` (sessionStorage, prefix held in the shared
  `DEST_LOGO_KEY` const so the reader — Home — and the writer — the division
  pages — can never diverge). The `:vN` version is bumped whenever the
  destination hero geometry changes, so a stale pre-change rect can never
  survive as the morph target. On a cold first tap the real
  page is rendered in an offscreen same-origin iframe and the logo rect is read
  the moment the stylesheet lays it out, before the heavy artwork loads; the
  frame is removed immediately, cancelling those image loads. Rects are cached
  per viewport (with in-flight dedupe); prefetch warms all three on idle/1.5s and
  on touch intent.
- Accessibility: real links; `aria-label`s `GRM Studio` / `GRM Label` /
  `GRM Liveroom` are applied only while the stacked layout is active, so the
  desktop accordion's own naming is unchanged.
- Reduced motion: the takeover is skipped entirely and the tap navigates
  instantly (default link behaviour); all panel info still renders.
- Split of the layer is capability-aware, not width-only; tablet-landscape and
  desktop continue to use the locked accordion.

### 8a. Mobile destination hero — centred mark

The Studio/Label/Liveroom heroes are laid out on the same mobile query
(`(max-width: 767px), (pointer: coarse) and (max-height: 560px)`) so the mark the
Home handoff lands on sits **dead-centre** in the destination viewport, with the
title/subtitle below it and the scroll cue near the bottom edge.

- Layout, not transforms: the hero is `display: block` with
  `min-height: 100svh` and top padding `calc(50svh − var(--logo-w) / 2)`, so the
  mark's own box centre lands on `50svh` (the visible-viewport centre) for any
  square mark, independent of its intrinsic size. `--logo-w` is
  `min(clamp(400px, 58vw, 880px), 100vw − 2·var(--gutter))` — exactly the width
  the mark already rendered — and the mark gets `aspect-ratio: 1/1`.
- Transform-neutral: the lockup loses its desktop `translateY(-10vh)`, the mark
  loses its `top: −38px` nudge, and the title/h1 lose their offset, so the mark
  carries no transform of its own and the measured rect *is* the morph target —
  zero-jump is structural, not tuned.
- Scroll cue: the lockup is `position: static` (so the studio cue, which lives
  inside the lockup, resolves against the hero like the division cues) and both
  cues become `top: auto; bottom: clamp(24px, 7svh, 72px)`.
- No header offset is used; the hero's own `100svh` viewport defines centre.
- Landscape phone caps the mark by height as well
  (`min(clamp(200px, 40vw, 420px), 46svh, content)`) so it still centres.
- Desktop (≥768px) and tablet-landscape are untouched: the block is mobile-only,
  so the locked `grid`/`place-items: center`/`translateY(-10vh)`/`top: −38px`
  composition and the `:v2` desktop rect are unchanged.

