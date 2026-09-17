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
page is hero-only (`overflow: hidden`, no nav links, no mobile menu, no
footer — guarded by the `isHome` flag).

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
