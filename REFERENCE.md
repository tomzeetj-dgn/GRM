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
stack of three destination panels; Home is headerless at every size (§9).

| Division page | URL       | body theme      | Accent (--accent / --accent-lite) |
| ------------- | --------- | --------------- | --------------------------------- |
| Production (route `studio`) | `/studio/`  | `theme-studio`    | `#7a5d11` / `#f5cf6a` (deep `#3a2c05`, hair `rgba(245,207,106,.32)`) |
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
- Hover-revealed division **names** carry no redundant "GRM" (the mark already
  states the brand): `.panel__name` reads `Production` / `Label` / `Liveroom`
  (EN) and `Produkcija` / `Label` / `Liveroom` (SR) via `home.panel.*.name`.
  The Header wordmark (`GRM HOUSE`), the label panel's possessive tag
  (`GRM's record label`) and the mobile panel aria-labels stay as-is — those
  are brand references, not division names.
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

## 7. Label — polish slate (Phase 1) — HISTORICAL

> Superseded: the roster index / preview module described here was replaced by
> About · Behind GRM · Selected Releases (see §10, §12, §14 and `label/index.html`).
> Kept for history only.

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
  `grm-dest-logo:v4:<page>:<w>x<h>` (sessionStorage, prefix held in the shared
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
- The mobile block is mobile-only: below it, the locked
  `grid`/`place-items: center`/`translateY(-10vh)`/`top: −38px` composition stays.
  The mark's *width* above the mobile query is now height-aware (see *Mid-range
  scale* below), but on landscape/laptop/desktop it resolves to the same `58vw`,
  so those rects are unchanged.

#### Optical centring + one-screen hero (2026-10-20, supersedes the box-centring above)

On the mobile query the hero is now a flex column (`justify-content:center`,
symmetric `padding: clamp(40px,8svh,160px) var(--gutter)`, `min-height:100svh`),
and the lockup carries `margin-top: calc(-1 * var(--logo-w) * 0.236)`. Taking the
mark's transparent top strip out of the centred size lifts the box by half of it,
so the VISIBLE group (top of the drawn mark → bottom of the subtitle) sits on
50svh at every phone size, in EN and SR, whatever the subtitle wraps to
(measured: 0.0px off-centre at 390×844, 430×932 and 844×390; previously
72–85px low). Mark→title and title→subtitle gaps are unchanged.
- The scroll cue stays bottom-anchored (`bottom: clamp(24px,7svh,72px)`), level on
  all three pages.
- Nothing from the next section enters the first screen on mobile: Label's
  negative hero `margin-bottom` is reset to 0 and Liveroom's `.liveroom-room`
  gets `margin-top:0; padding-top:72px` (mobile query only).
- `DEST_LOGO_KEY` bumped to `grm-dest-logo:v4`; the mobile Home handoff lands
  exactly on the new rect (verified 390×844, 430×932). Tablet/desktop logo rects
  are byte-identical to before (820, 1024, 1280, 1440, 1920).
- Known, pre-existing: on landscape phones (≈844×390) the subtitle and the scroll
  cue still collide (they did before this change too).

#### Text lockup under the mark

The Glow artwork is square with ~23.6% transparent padding top and bottom, so the
space the eye reads below the mark is that transparent strip **plus** the flex
gap, not the gap alone. The mobile text lockup therefore hangs off the mark's
*visible* base: the lockup gap is zeroed and the two gaps are set explicitly —
title `margin-top: calc(0.39·var(--lockup-gap) − 0.61·var(--logo-pad-b))` (drops
the perceived logo→title space ~61% from the un-tightened lockup, i.e. ~19% below
the previous pass) and subtitle `margin-top: calc(0.85·var(--lockup-gap))`, left
as approved — so the mark, title and subtitle read as one compact unit, title and
subtitle moving together. `--logo-pad-b` is
`calc(var(--logo-w) × 0.236)`, derived from the artwork, so the reduction scales
with the mark instead of being a per-viewport magic number. The mark itself is
untouched, so its centred rect and the morph are unchanged. The subtitle floor is
raised a touch on mobile (`clamp(0.73rem, 1vw, 0.86rem)`, tracking `0.22em`); the
title typography, the scroll cue position, and all arrival choreography are
untouched. The cue is bottom-anchored and independent (unchanged).

##### Title wording + horizontal centring

The division word no longer carries the redundant "GRM" prefix — the mark above
it already states the brand. The hero titles are now `PRODUCTION` / `LABEL` /
`LIVEROOM` (EN) and `PRODUKCIJA` / `LABEL` / `LIVEROOM` (SR), driven by the
existing i18n keys `studio.hero.title`, `label.hero.title`, `liveroom.hero.title`
(EN in `js/translations.js`; SR keys added alongside). The HTML fallback strings
match. Only the wording changed on desktop/tablet — positioning is untouched.

The title `<p>` was `text-align:start` while the `<h1>` was already
`text-align:center`; at ≥390px the longer string reached the lockup width and its
wrapped lines read left-under-the-mark. The mobile title rule therefore adds
`text-align:center` so title + subtitle share the mark's centre axis at every
width (including the cases that used to wrap). Horizontal only — `text-align`
moves inline content inside the fixed box, so the box, `--logo-w`, the mark's
`left`/`top` optical offset and the morph target are all unchanged, and the
explicit logo→title / title→subtitle gaps are identical.

#### Mid-range scale (768–1439px) — height-aware mark

Above the mobile query the mark was a pure `58vw`, so it was proportional to
*width* at every size. On a **tall** viewport (portrait tablet, e.g. 768×1024 /
820×1180 / 1024×1366) that left the mark only ~40–44% of the visible height while
wide-but-short viewports (landscape/laptop/desktop) already filled 77–103%. The
mark width is now height-aware —

- Logo: `clamp(400px, max(58vw, 50svh), 880px)` (base, `.is-division-logo-landed`
  and both heroes share the same expression, so landing never jumps). The `50svh`
  floor only wins on tall viewports: portrait tablets grow ~15–24%, while
  landscape/laptop (≥768×768) and desktop (≥1440) stay exactly `58vw` — verified
  unchanged at 1024×768, 1180×820, 1280×800, 1366×768 and 1440×900.
- Title: `clamp(1.75rem, max(10.5vw, 9svh), 6.5rem)` — grows *in relationship*
  with the mark on tall viewports yet never exceeds the `6.5rem` (104px) desktop
  cap, so it can't outgrow desktop or mobile.
- Subtitle: floor raised `.68rem → .74rem` (`clamp(0.74rem, 1vw, 0.86rem)`) so the
  mid-range minimum is legible (10.88 → 11.84px); the `.86rem` cap and the `0.24em`
  tracking are unchanged, and the mobile `0.73rem` override is untouched.
- Because the *destination* rect changes on tall viewports, `DEST_LOGO_KEY` is
  bumped to `:v3`; the desktop takeover re-aims to the published rect and is
  verified to land exactly on it at every mid-range size. The mobile handoff
  (`--logo-w`, `58vw`) is unchanged, so its zero-jump/jitter-0 property holds.

---

## 9. Bilingual infrastructure (Phase 1 — architecture + switcher)

English is canonical; the markup itself is the English fallback (JS-off reads
English). Phase 1 shipped the architecture and the EN/SR language control; the
**switch-visibility fix (switch-fix)** then populated `sr` for the **global +
Home layer** (approved values only — see below), so clicking SR now visibly
changes the UI. Deeper page copy (footer lede, destination tags/meta, bios)
stays English and is **not** present in `sr`, falling back per-key to `en` until
approved in a later pass (no machine translation).

- **Engine** (`js/i18n.js`, loaded in `<head>` before `js/main.js`) exposes
  `window.GRMi18n = { lang, t, setLang, apply, refresh }`. Storage key
  `grm-language` (localStorage), default `en`, supported `[en, sr]`,
  `<html lang="en|sr-Latn">` synced (set as early as possible). Missing keys
  fall back per-key: current → `en` → authored DOM text, never blank/undefined/
  raw key names. Hooks: `data-i18n` (text; on `<meta>` sets `content`),
  `data-i18n-aria-label`, `data-i18n-alt`, `data-i18n-title`,
  `data-i18n-placeholder`, `data-i18n-content`, `data-i18n-value`; `t(key,
  {params})` supports `{n}` interpolation. One delegated `click` listener on
  `document` serves every `[data-lang]` button — including ones injected later
  into the header chrome and the Home overlay. `.lr-word` split-nodes are
  never rewritten (liveroom ghost-materialise survives); `data-i18n-skip` opt-out.
- **Dictionary** (`js/translations.js`): namespaced EN map of the current copy
  (~150 keys across chrome/home/studio/label/liveroom + dynamic schedule week/
  month tokens). `sr` now carries the **global + Home layer** only: nav home/
  production/label/liveroom, all a11y labels (header brand, primary/mobile nav,
  language, menu open/close), `common.skip/scroll`, footer column/city/back-to-
  top/contact labels, Home metadata (title/desc/ogTitle/ogDesc), Home hero +
  3 panel a11y labels, the 3 mobile panel titles/descriptors, and the desktop
  Studio panel tag. Approved values: Home→Početna, Production→Produkcija,
  Label→Label, Liveroom→Liveroom, AUDIO / VIDEO PRODUCTION→AUDIO / VIDEO
  PRODUKCIJA, ARTISTS & RELEASES→IZVOĐAČI & IZDANJA, LIVE EVENTS & REHEARSALS→
  NASTUPI & PROBE. Any key absent from `sr` falls back to `en`. Do NOT machine-
  translate; deeper copy is added only when approved.
- **Switcher**: `EN / SR` chip (`.lang-switch`) injected by `injectSiteChrome()`
  in `js/main.js` into a `.site-header__actions` wrapper on every **non-Home**
  page (sits right of the nav, before the hamburger on ≤1000px). **Home is
  headerless at EVERY size** (headerless-Home fix): the injected header is
  `display: none` on `body[data-page="home"]` for all widths, and
  `injectSiteChrome` emits **no nav, toggle or mobile-menu markup on Home at
  all** — only the (hidden) brand. No brand, nav, hamburger, border or reserved
  space (`.site-header` is `position:fixed`, so hiding it shifts no geometry).
  Home's language control is the standalone fixed `.lang-switch--home` overlay
  (top-right, `safe-area` aware, z 900) appended to `<body>`, visible at **all**
  widths and positioned independently of the hidden header (`top` = a
  header-safe `clamp(18px,2.8vh,30px)`, `right` = the page's own responsive
  `--gutter`). It fades with the Home UI during the Home→division takeover
  (`body[data-page="home"]:has(.hero.is-takeover) .lang-switch--home`), so only
  the destination header's chip is ever visible after arrival. Buttons carry
  `aria-current="true"` / `.is-active` on the active language, driven by the engine.
- **Font safety** (no blocker): the display `@font-face` already loads
  `assets/fonts/UltraCondensedSansSerif-Serbian.ttf`, which covers all Serbian
  Latin (`č ć š ž đ Č Ć Š Ž Đ`, 0 missing of 214 glyphs). Body/UI = Inter +
  Archivo loaded from Google Fonts; Inter's **latin-ext** subset
  (`unicode-range: U+0100-02BA`, includes `Đ/đ`) loads on demand — canvas proof:
  `đ` renders at 8.66px in Inter vs 8.43px mono / 7px serif, so no single-glyph
  fallback. `document.fonts.check` returns false only **before** that lazy face
  is requested; after `document.fonts.load(...,"đ")` it is true. The non-Serbian
  TTF (204 glyphs) is unused; the woff2 variants are unused.
- **Dynamic strings routed through i18n** in `main.js`: the liveroom schedule
  week/month labels (`schedule.thisWeek/nextWeek/lastWeek/inWeeks/weeksAgo`,
  `schedule.months[]`), mobile Home panel accessible names, menu open/close
  aria-labels, and the division switch re-applies on `grm:languagechange`.
- **Sacred areas unchanged**: home accordion mechanics, logo geometries
  (`syncLogoWindows`, `DEST_LOGO_KEY` rects), isolation/takeover transitions,
  division↔division morphs, plaque carousel, showreel, intro sequence, and the
  `HOME_INTRO_DEBUG_REPLAY=true` debug flag (main.js:18) are untouched. Header
  markup/design is unchanged on destination pages; Home emits a brand-only,
  nav-free header (no nav/toggle/mobile-menu markup) and hides it entirely, so
  the three panels remain the only Home navigation.
- **QA (verified)**: original matrix 110 checks (switcher placement/`aria-
  current` across desktop 1440×900, tablet 820×1180, mobile 390×844 × 4 pages).
  **Switch-fix run: 44/44** — nav `Početna/Produkcija/Label/Liveroom`, Studio
  tag `Audio/Video Produkcija`, `html lang="sr-Latn"`, `localStorage="sr"`,
  destinations keep the chip + SR nav, persistence survives navigation, no
  reload (URL unchanged), scroll preserved. **Headerless-Home fix (7 viewports,
  390×844 → 1920×1080):** Home header `display:none` and `#headerMount` 0px at
  every size, no nav/toggle/lang-switch/mobile-menu inside it, exactly one
  visible control (`.lang-switch--home`, `position:fixed`, top-right at the
  responsive `--gutter`: right 20px @390 / 86px @1440 / 96px @1920); panels
  unchanged (desktop 479/480/480 @1440, mobile 281/282/282 @390), hero = full
  viewport; SR click → `lang="sr-Latn"`, `localStorage="sr"`, SR `.is-active`;
  Home→ Production/Label/Liveroom takeover fades the overlay (opacity→0,
  `pointer-events:none`, header stays `none`) and lands with the destination
  header (`display:flex`, 4 nav links + chip, no overlay); returning Home →
  header `none` + one overlay; `studio/` header intact; reduced-motion Home
  headerless; zero console errors. Screenshots in
  `docs/home-headerless-remove/screens/`.
- **Known Phase-1 gaps (scheduled)**: long-form editorial body copy/bios stay
  English (unkeyed, documented). Liveroom ghost-materialise text and the taken-
  slot `aria-label`s stay English this phase (split-safety + not keyed).


## 10. Content reveal system (Liveroom motion — Production + Label)

The Liveroom "ghost materialise" is now the **shared content-reveal language**
for Production and Label. It is not a new animation: the exact Liveroom values
are reused, and the existing global `.reveal` / `.in-view` pair is the
transport (so every approved `.in-view` dependency is preserved).

- **Source of truth** — `.lr-room` / `.lr-word` in `css/style.css`:
  `opacity:0; filter:blur(24px); transform:translateY(30px) scale(.99)` →
  `.in` = `opacity:1; filter:blur(0); transform:none`, transition
  `opacity/filter/transform 1.4s cubic-bezier(.22,1,.3,1)`. Observer trigger
  (`js/main.js`, Liveroom block) is `threshold:0.15`, **no rootMargin**,
  one-shot (unobserve). `.lr-word` is the 80ms/word cadence.
- **Transport** — the global `.reveal` block (`css/style.css` §REVEALS) now
  carries those exact values, and `js/main.js` (§REVEALS) matches the trigger
  (`{ threshold: 0.15 }`). Class name is kept because other approved reveals key
  off `.in-view` (`.label-people__entry.in-view` image develop). Shared stagger
  token `--reveal-stagger: 80ms` drives `[data-delay="1|2|3"]`.
- **Production (`studio`)** — every content block below the hero now arrives on
  the shared `.reveal`: the **SOUND heading** (`.discipline--sound`), the
  **SOUND photo strip** (`.grm-photo-strip`), the **release-plaque archive**
  (`.grm-sound__row`, revealed as its stable outer wrapper), and the **final CTA
  plate** (`.grm-cta__card`, revealed as a unit; its `.grm-cta__media` keeps its
  own `brightness/contrast/saturate` filter, which a per-child reveal would have
  clobbered). The hero arrival choreography is untouched. The photo-strip hover
  redistribution is unlocked by the same `.in-view` class that reveals the strip
  (`.grm-photo-strip.in-view …`), so interaction and motion share one state.
- **Excluded (component-owned — never double-animated)** — the VISUAL showreel
  aperture (`.visual-block` / `.showreel-aperture`, entirely excluded per task:
  the aperture exposes the footage + VISUAL identity as one object), and the
  Label people portrait develop (`.in-view` → scale/saturate). The SOUND strip
  and plaque archive entrances that used to be component-owned
  (`grm-sound--reveal-ready/strip-in/entered`, `grm-sound--releases-prepared/in`)
  were **retired**; those two blocks now use the shared `.reveal`. The VISUAL
  showreel therefore keeps ONLY its own aperture animation — see §11 for its
  (separately changed) responsive geometry.
- **Label** — every existing `.reveal` element (about/people/releases) inherits
  the new motion automatically (no markup change). The **`.label-about`
  section keeps its own coordinated develop-from-black** (`is-revealed`); its
  `.reveal` children carry `filter:none` so the global blur cannot leak in and
  the two reveals never stack.
- **Reduced motion** — unchanged behaviour, extended: `.reveal` resolves to
  `opacity:1; filter:none; transform:none; transition:none` (global + about +
  main.js adds `.in-view`), so content is always visible, nothing hidden.
- **Localization-safe** — the motion is class-driven (i18n rewrites
  `textContent`, never nodes), so a language switch keeps `.in-view` and never
  replays a reveal; motion does not depend on text length or language.
- **QA (verified)** — 7 viewports (320×568, 390×844, 430×932, 820×1180,
  1024×768, 1440×900, 1920×1080) × Production + Label: no horizontal overflow,
  no console errors, every `.reveal` settles to `blur(0)`; `.reveal` computed
  transition/transform is byte-identical to `.lr-room`; the strip + archive
  reveal on scroll and the showreel aperture still fires; strip hover and
  plaque drag/autoplay intact; reduced-motion shows 0 hidden elements; language
  switch does not replay. Recordings (PNG frame sequences) in
  `docs/production-reveal/recordings/`; report in
  `docs/production-reveal/REPORT.md`.


## 11. Production Visual showreel — responsive geometry (viewport-shaped)

The VISUAL showreel frame is a full-bleed object that takes the shape of the
screen it is viewed on (phone-shaped on a phone, tablet-shaped on a tablet,
desktop-shaped on a desktop). Its **animation is unchanged** (see §10 excluded);
only the container geometry was reworked.

- **Rule** — `.visual-block` is `width:100%` of the (already full-width)
  `.production-visual` section and `height:100svh` (with a `height:100vh`
  legacy fallback), so the frame's aspect ratio equals the viewport's at every
  size. There is no fixed `16/9`/`21/9` ratio and no `--showreel-frame-w` width
  any more; the `aspect-ratio:16/9` was removed from `.visual-block__media`
  (now `height:100%`). `.production-visual` carries `padding:0` so the frame
  runs edge to edge with no letterbox bands.
- **Units** — `100svh` (smallest viewport height) is used for stable,
  mobile-safe sizing: it never overflows the screen the way legacy `100vh`
  does, and it does not re-crop mid-scroll the way `100dvh` would. `100vh` is
  kept only as a fallback for engines without `svh`.
- **Media** — `.visual-block__video` keeps `object-fit:cover` (footage fills
  the frame, never stretches) with `object-position:center` (the existing
  centred framing; the source is 1280×720 and the bright content is central, so
  a centred crop keeps it on portrait).
- **Aperture** — unchanged in behaviour: each mask is `height:50%` of the
  `.showreel-aperture__stage` and `js/main.js` translates it by
  `half = stage.clientHeight/2`. `HALF_HAIRLINE` (1.5), `DURATION` (1400ms),
  `easeInOutCubic`, and the trigger (`rootMargin` bottom `-32%`, i.e. ~68vh)
  are byte-identical. The driver no longer measures/sets the frame width; a
  `ResizeObserver` on the stage (plus the existing `resize` listener) re-measures
  `half` on orientation/layout change with no reload and no polling.
- **Overlays** — `.visual-block__identity` and `.visual-block__link` are inset
  with `env(safe-area-inset-*)`; the identity also clears the fixed header
  (`calc(var(--header-h) + …)`) since the frame now starts at the viewport top.
  Typography is unchanged.
- **No global reveal** — the shared `.reveal`/`.in-view` system is **not**
  applied to the showreel; it keeps only the aperture animation.
- **QA (verified)** — 16 viewports (320×568 → 1920×1080, incl. 768×1024,
  820×1180, 1024×768, 1180×820): frame ratio == viewport ratio, frame == client
  viewport, closed masks `-1.5/1.5` → open `±half`, no horizontal overflow.
  Orientation 820×1180→1180×820 without reload re-seats the masks to the new
  half; reduced-motion and no-JS hide the masks and keep the viewport-shaped
  frame; the video autoplays (1280×720). Screenshots +
   recordings in `docs/production-showreel/`; report
   `docs/production-showreel/REPORT.md`.


## 12. Hover stroke — Liveroom Room language, reused on Label + Production

The Liveroom Room bento **hover stroke** is now a **shared interaction cue**
reused, verbatim, on Label *Selected releases* and Production *SOUND* tiles.
No new treatment was invented: the exact Liveroom technique moves across.

- **Source of truth** — `.liveroom-room__img::after` in `css/style.css`:
  `content:""; position:absolute; inset:0; box-shadow:inset 0 0 0 1px
  var(--accent-lite); opacity:0; transition:opacity 250ms ease;
  pointer-events:none`, flipped to `opacity:1` while the tile is the active
  hover target. It is a **pseudo-element box-shadow**, not a border, so it
  follows the tile's current box and never causes layout shift.
- **Colour is contextual** — `var(--accent-lite)` is themed per division
  (`theme-studio #f5cf6a` gold, `theme-label #2ee6a8` green,
  `theme-liveroom #ff8f56`), so the same rule renders the correct division
  colour automatically: green on Label, gold on Production, orange on Live.
- **Label *Selected releases*** (`label/index.html` + `css/style.css`) — each
  `.label-releases__item`'s `<img>` is wrapped in a crop layer
  `.label-releases__media` (`position:relative; overflow:hidden`) that now owns
  the `1px var(--border-strong)` frame the `<img>` used to carry (geometry
  byte-identical: the wrapper border box is the column, so the square outline
  and visible image area are unchanged). The stroke is
  `.label-releases__media::after` (same values as Liveroom). On
  `@media (hover:hover) and (pointer:fine)` the hovered release also pushes its
  artwork in: `.label-releases__item:hover .label-releases__media img {
  transform:scale(1.035) }` over `600ms var(--ease-out)` — the Liveroom image
  zoom, slightly stronger. The tile itself does **not** move (`:hover`
  `translateY` is inert while `.reveal.in-view` is present); the reveal
  transform (on the `<figure>`) and the zoom transform (on the `<img>`) stay on
  **separate layers**. The releases are `<figure>`s, not links, so no
  `:focus-visible` cue is added.
- **Production *SOUND*** (`studio/index.html` + `css/style.css`) — the four
  `.grm-photo` tiles get the stroke as a **dedicated child element**
  `.grm-photo__stroke` (a `<span aria-hidden="true">`), because `.grm-photo`
  already spends `::before` and `::after` on its two exposure scrims. The layer
  sits at `z-index:3` over the scrims and is flipped to `opacity:1` by
  `@media (min-width:901px) and (hover:hover) and (pointer:fine)
  { .grm-photo-strip.in-view .grm-photo:hover .grm-photo__stroke }`. No image
  zoom is added here — the strip's own expansion motion is left untouched; the
  stroke simply tracks the tile as the grid redistributes. It is
  `display:none` in the ≤900px 2×2 layout, where there is no hover.
- **Reduced motion** — mirrors Liveroom exactly: transitions are removed
  (`.label-releases__media img`, `.label-releases__media::after`,
  `.grm-photo__stroke`), so the state change still reads but is instant, and the
  layout never moves. Nothing is hidden.
- **Scroll reveals untouched** — the shared `.reveal`/`.in-view` system (§10) is
  unchanged; the SOUND stroke is gated by the same `.in-view` that unlocks the
  strip's hover, so cue and reveal share one state.
- **QA (verified)** — 6 viewports (320×568, 390×844, 768×1024, 1024×768,
  1180×820, 1440×900): stroke appears on the hovered tile only, in the division
  colour, with no horizontal overflow, no console errors, no layout shift
  (`offsetWidth/Height` byte-stable rest→hover), and reset on leave. Label
  artwork scales `1.035`; neighbours stay unscaled (`transform:none`), and the
  tile never lifts (`transform:none`). A pixel diff of the Label hovered tile
  finds ~1570 accent-green pixels — essentially the 1px perimeter of the 396px
  square. Reduced-motion reports `transitionDuration:0s` and an instant stroke.
  Recordings + screenshots in `docs/hover-stroke/`; report
  `docs/hover-stroke/REPORT.md`.

## 13. Division ↔ division transition — one logo, destination always at top

The division↔division identity handoff (Production/Label/Liveroom nav links) is a
**fixed transition proxy** that carries the outgoing mark across a full page
load. The destination hero logo is the single source of truth; the destination
always begins at `scrollY = 0`.

- **Root cause of the "ghost logo" (scrolled source).** Each source page's click
  handler (`js/main.js`, "DIVISION <-> DIVISION: source side") stores the outgoing
  logo's **viewport** rect in `sessionStorage["grm-morph-start"]` and the
  destination in `grm-morph-arrival`. The destination arrival block then built
  the `.division-morph-logo` / `.studio-morph-logo` proxy at that **source**
  rect and cross-faded it into the real destination logo. When the source was
  scrolled, the proxy sat at the scrolled rect (e.g. `top:-652`) while the real
  logo rendered at its own top (`top:-52`) → **two copies of the same mark**
  (the ghost). The destination was in fact already at `scrollY=0` (no scroll was
  being preserved); the divergence was purely the proxy's start position.
- **Fix.** The proxy is now created **after `document.fonts.ready` + a rAF**
  (layout settled) and positioned on the **destination** logo's measured
  `getBoundingClientRect()` — the same rect the real logo occupies. The real
  logo stays visible until that frame (so there is never a blank or a second
  mark), is then set `visibility:hidden` (never `display:none`, so its DOMRect
  is preserved) and revealed on the proxy's `transitionend`. The proxy and the
  real logo therefore share one rect from first appearance to the zero-jump
  handoff.
- **Destination begins at the top — invisibly.** On arrival the reset uses
  `resetDivisionScrollTop()` (`js/main.js`), which forces
  `root.style.scrollBehavior = "auto"` around `window.scrollTo(0,0)` and then
  restores it — because the global `html { scroll-behavior: smooth }` would
  otherwise animate the reset and reveal it. The reset happens while the
  transition layer owns the screen. The source's geometry is captured (in the
  click handler) **before** any navigation, so nothing is lost.
- **No redesign.** Structure, the `700ms ease` opacity cross-fade, the staggered
  `48/82/116s`-clock header/title/descriptor/scroll reveals, colours, glow and
  duration are unchanged; only the proxy's start position moved from the source
  rect to the destination rect, and the real logo is now hidden for the
  single-frame handoff instead of being exposed underneath the offset proxy.
  The same `getBoundingClientRect()` is read after fonts + layout settle, so the
  EN/SR locale (which changes the hidden lockup's text height) is already
  applied.
- **Back/forward.** The morph runs only when `grm-morph-arrival` is present
  (the managed forward click); it is consumed on read, so a bfcache/`history`
  return is untouched — Back restores the outgoing page's scroll (verified:
  `/label/` at `600`), Forward returns the destination to the top.
- **Cached rects.** `DEST_LOGO_KEY` (`grm-dest-logo:v4`, `js/main.js`) publishes
  the division hero logo's **scroll-0** rect for the Home takeover to aim at; it
  is not used by this path (the destination is measured live).
- **QA (verified).** All 6 division routes (`Label↔Production↔Liveroom`) × 5
  scroll positions (0, partially clipped, off-screen, mid-page, near-bottom) × 7
  viewports (390×844, 430×932, 820×1180, 1024×768, 1280×800, 1440×900,
  1920×1080): **0** frames with two logos at differing rects, proxy rect == real
  rect at every coexisting frame, destination `scrollY` always `0`, no console
  errors, no zero-logo flashes. Home→division arrivals regression-tested
  (desktop + mobile): unchanged. Reduced motion skips the morph (instant, real
   logo at top). Recordings + per-frame logs in `docs/ghost-logo/`; report
   `docs/ghost-logo/REPORT.md`.

## 14. Label — Behind GRM expertise credit labels

- **What.** Each `.label-people__entry` (§02 "The people behind GRM") now carries
  a row of small **expertise credit labels** where the single role line used to
  be — printed record-sleeve metadata, not UI chips. The row opens each profile
  — it sits **above the name** (tags → name → bio) and is **left-aligned** (no
  leading ordinal — the `01 /` index was removed).
- **Markup.** `.label-people__role` wraps a
  `<ul class="label-people__credits" role="list" aria-label
  data-i18n-aria-label="label.people.credits.aria">`, whose `<li
  class="credit-label" data-cat="…" data-i18n="label.people.credit.…">` items
  are the tags. `data-cat` maps to a colour: `production` / `label` / `liveroom`
  / `neutral`.
- **Look.** `.credit-label` is a 27px (25px ≤620px) inline-flex tag: `1px` radius,
  bg `rgba(10,10,10,.82)`, hairline `1px` border `var(--border-strong)`, warm-grey
  `10px/600` uppercase text at `0.15em` tracking, and a `2px` division-coloured
  top edge via `::before` at `opacity:.85`. The colour lives on the edge only;
  the text stays neutral. Four global tokens were added to `:root`:
  `--credit-production:#f5cf6a`, `--credit-label:#2ee6a8`,
  `--credit-live:#ff8f56`, `--credit-neutral:rgba(236,233,226,.5)` — global (not
  theme-scoped) so the Label page can still spark Production/Liveroom colours.
- **Hover.** Informational only — no `cursor:pointer`, no navigation. A
  profile-level `@media (hover:hover)` rule lifts the tag border
  (`.22→.34`), background, text (`--text-muted→--text`) and the accent
  (`opacity→1`, `brightness 1.18`). No glow/scale/per-tag motion; neutralised
  under `prefers-reduced-motion`.
- **Motion.** Tags are children of the existing `.label-people__entry.reveal`
  unit, so they ride the sacred Label reveal (blur/`translateY`/opacity, 1.4s
  `cubic-bezier(.22,1,.3,1)`) with no new cascade.
- **Bilingual.** New `label.people.credit.*` + `label.people.credits.aria` keys,
  EN and SR (Latin: Osnivač, Kreativna direkcija, Produkcija, Izdanja, Audio
  inženjering, Aranžman, Art direkcija, Fotografija, Mastering, A&R). The old
  `label.people.role.1..5` keys are left in place but unused.
- **Colour map (derived from bios).** Marko → Founder [neutral], Creative
  Direction, A&R [label], Production [production]. Jelena → Label, A&R, Releases
  [label]. Nikola → Production, Audio Engineering, Arrangement [production].
  Milan “Igla” Subotić → Founder [neutral], Video Production/Editing [production],
  Motion Design [label], Liveroom [liveroom] (replaced the earlier placeholder profile).
  Aleksa → Audio Engineering, Mastering [production]. Counts 4/3/3/3/2.
  **No Liveroom/orange tag** — no member has a live remit (see report).
- **QA (verified).** 1440/1024 desktop + 620/390/320 mobile, EN + SR: tags stay
  inside the intro column (`right ≤ intro.right`), document `overflowX = 0`,
  **0** console errors, tags wrap naturally (1–3 rows) never clipped,
  tags→name gap 16.8px desktop / 14.4px @1024 / ~11.9px mobile, name→bio gap
  21.4px desktop / 18.2px @1024 / ~13.9px mobile, tag height 27px (25px
  mobile), accent colours correct per `data-cat`, `aria-label` switches
  Expertise/Ekspertiza, `lang` → `sr-Latn`. Home/Studio/Liveroom smoke: 0
  credit-labels, no overflow/errors. Screenshots + `docs/credit-labels/REPORT.md`.




## 15. Debugging + refactor pass (2026-10-20)

Baseline before the pass: `e85eebe` (mobile hero centring). Each step is its
own commit and was verified with full-page renders + computed styles of every
element on all 4 pages at 8 viewports (390×844, 430×932, 844×390 touch,
820×1180, 1024×768, 1280×800, 1440×900, 1920×1080), hover states, and the
transition suite (Home→division desktop + mobile, 6 division routes).

- **Bug fixes** — Label→Label nav no longer fades + reloads + leaves stale
  morph keys (the same-page handler was removed); landscape phones hide the
  decorative scroll cue (it collided with the subtitle); the scroll-progress
  hairline starts at `left:0` (was −29px); Home intro console logging removed
  (intro still replays every visit, `HOME_INTRO_DEBUG_REPLAY = true` is
  intended); the Home glow fade's reduced-motion override now actually wins.
- **Dead code** — ~550 CSS rules for markup that no longer exists (retired
  Liveroom layouts, the original studio template, page-hero), 9 orphaned
  keyframes, dead JS modules (work rail, gallery scrub, active-section nav,
  pending-YouTube), two unused image preloads. Pixel- and style-identical.
- **Performance** — PNGs re-encoded losslessly (−2.4 MB, decoded pixels
  identical); display font served as woff2 (17 KB; TTF kept as fallback);
  `syncLogoWindows()` now parks after 20 still frames and is re-armed by every
  geometry trigger (`kickLogoWindows()`); the plaque carousel parks while
  off-screen.
- **Structure** — division↔division source handlers are one table-driven
  handler; division arrivals are `runDivisionMorphArrival()` /
  `runHomeOverlayArrival()` driven by `DIVISION_ARRIVAL`; schedule CSS lost 269
  overridden declarations. Behaviour verified identical (event sequences and
  intervals).
- **Not done on purpose** — the CSS stays one file (splitting adds requests
  and cascade-order risk for no visual gain); the Home desktop takeover timing
  chain (820ms × 3) is unchanged; Label→Production / Liveroom→Production still
  have no exit fade (open question).

## 16. Label — Behind GRM line-up (replaces the five spreads)

It is the first section after the Label hero, above About ("More than a label."); the page order is hero → people → about → releases. The About reveal and scroll travel key off the section's own position, so the order doesn't affect them.

- **Spacing under the hero.** The section uses Liveroom's spacing: `margin-top: calc(-12vh - 16px)` and no section padding, so it tucks into the empty bottom of the hero. This collapses with the hero's own `margin-bottom: -10vh`, and the larger one wins. The hero's height is untouched. At 900px and below the section has a small top padding instead.
- **Entrance.** It uses the shared Liveroom reveal (`.reveal`, see §10): it materialises from a 24px blur, rising 30px, over 1.4s, staggered word (0) → photo and outlines (1, together) → names (2). The four big words share one wrapper (`.label-lineup__words`), so the reveal's blur and transform never fight the words' own opacity and transform.

Designed on the Claude Design canvas as direction "E · Step forward" and approved on 2026-10-22. The section is still `#people`, but it is now `.label-lineup`.

- **The photo.** One group photo is split into a cut-out per person in `assets/img/people/` (`grzi`, `dzu`, `igla`; 1254² WebP with alpha). Stacked, the three cut-outs reproduce the original photo.
  - Džu's layer runs about 16px under the two in front, and Grzi's runs about 8px under Igla's, so no seam ever shows.
  - The split came from person segmentation and was hand-tuned at the ears and beards. If the photo changes, the cut-outs and outlines must be regenerated.
- **Outlines.** Each `outline-*.webp` is a Label-green line plus a soft glow, drawn outside that person's silhouette.
  - Džu stands behind the other two, so his outline is one fixed image, `outline-dzu.webp`, drawn at his grown size (1.06): the same 5px line and glow, running all the way round, including along Grzi's and Igla's edges. The glow only spills onto the black. It fades in 300ms after he starts growing, so it never shows half-grown. If you change his growth, regenerate it.
- **State.** `js/main.js` only sets `[data-active="0|1|2"]` on `[data-lineup]`; all motion is in CSS.
  - What changes on selection: the hovered person grows (Grzi and Igla move above everyone, Džu grows behind), the outline fades in, the big word becomes the nickname, the others go to `brightness(.55)` and the credits to opacity .4, and the bio fades in.
  - Input:
    - **Hit-testing:** hover and tap use the people's actual silhouettes, not boxes. `assets/img/people/hitmap.png` is 314², with one grey level per person (0 none, 85 Grzi, 170 Džu, 255 Igla) showing who you see at each point. While someone is grown, the point is mapped back through their growth first, so their enlarged shape still counts as theirs. The outline glow and the black never trigger anything. If the photo or the cut-outs change, regenerate the hitmap too.
    - **Mouse:** hovering a person selects them at once, and moving off everyone clears just as immediately. This is based on `pointerType` and not a media query, because touch fires compatibility mouse events. The names below are buttons and select on hover too.
    - **Touch:** tapping a person or a name toggles them, and tapping the black clears.
    - **Keyboard:** focus selects only when it is `:focus-visible`, and Escape clears.
- **Motion.** The selection responds the moment the mouse enters or leaves a person.
  - The person grows over 700ms on `--lineup-snap`, which starts at once and settles softly. The dim and the outline take about 0.45s, and the bio follows 120ms behind.
  - Džu's outline fades in at 300ms, as he finishes growing.
  - Big words hand over in sequence: the outgoing word leaves in 140ms, and the incoming one only starts after that, so two words never overlap.
  - With reduced motion, there are no transitions.
- **Layout.** The stage is a 1440-wide design box sized in container units (`1cqw` = 14.4px at 1440), so the whole composition scales as one.
  - The stage also fits the screen's height: its width is `min(100%, 1440px, max(640px, (100svh − 220px) × 1.96))`. The names sit at about 74% of the photo's height, over the faded sweaters, so the header, people, names and caption fit in one view on any desktop screen (checked from 1280×720 to 2560×1300).
  - The fade (`.label-lineup__fade`) reaches past the photo's bottom edge, and the photo's left and right edges are feathered, so no hard edge of the square shows.
  - All three outlines live in `.label-lineup__lines`, a copy of the photo box placed above the fade, so the fade never dims them. They stay fully bright until about 65% of the photo's height and then soften out over a short band, just above the names.
  - On wide screens the roles and bio of the selected person are one shared caption (`.label-lineup__detail`), centred under the three names, rather than separate text under each column. It hands over in sequence like the big words, so two captions never show together. At 900px and below, each person's caption sits under their own name and is always visible.
  - At 900px and below, the photo goes full width, the credits stack, and every bio is shown.
- **Copy.** There is no eyebrow or note row: the section opens straight on the big "BEHIND GRM." (`label.people.eyebrow` and `.note` were removed). The bios are one sentence each, under `label.people.bio.{grzi,dzu,igla}` (EN and SR); the photo description is under `label.people.photoAlt`.
  - Grzi's and Džu's bios were written from earlier placeholder text, so swap in real details when they're available.
- **Removed.** The old five-spread markup, `.label-people__entry`/`__portrait`/`__shot`/`__intro`/`__role`/`__name`/`__bio` styles, and the `label.people.role.*` and `label.people.bio.4.*` keys.
  - Roles are no longer the §14 credit-label chips. They are one quiet line (`.label-lineup__roles`): small spaced caps with a 4px division-coloured dot before each role. On wide screens the line is hidden at rest and arrives with the bio on hover; at 900px and below it is always shown. The numbers above the names are gone.
  - `.label-people__credits` and `.credit-label` (§14) are no longer used on any page but are kept, so the chips can come back easily.
  - `assets/img/Behind GRM - 1…5.png` are no longer referenced, but are left in place.
