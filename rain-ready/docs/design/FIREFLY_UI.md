# Spec: Firefly-style hybrid UI — 2026-10-10

## Intent
The user wants the Rain-Ready UI to look like the Firefly reference screens: clean, elegant, flat. The design-language notes taken from the reference screens are kept outside the repo.
User choices: Direction **Hybrid**: Firefly structure, with faint glass kept only on the fixed top and bottom bars. Accent **Firefly violet**.
Base: branch `aarush/glass-ui` (PR #19, open). New branch `aarush/firefly-ui`. Code freeze Sun 11 Oct ~2 PM IST.
Success: every screen looks flat and quiet, with neutral near-black surfaces, hairlines, one violet accent, Inter type, row lists, tonal status pills, line icons and an avatar menu. Behaviour, copy, routes and honesty rules are unchanged, and all tests and the e2e walk pass.

## Non-goals
- No new screens, flows or copy, except the avatar menu's accessible labels.
- No light theme, no build step, no npm dependency in `web/`.
- No Firefly logo, name, illustrations or copy.
- Leave PR #19's ports alone: GlassPort and TransitionPort, the liquid lens behind `?glass=liquid`, and the view transitions.

## Tokens (`web/css/tokens.css`)
- **Surfaces:**
  - `--bg:#121214` (page)
  - `--s1:#1a1a1d` (cards, inputs, lists)
  - `--s2:#232327` (hover, segmented thumb, table head)
  - `--line:#2c2c31` (hairline)
  - `--field-border:#6e6e7a` (≥ 3:1 on s1; tune with the test)
- **Bars:** `--bar-bg:rgba(18,18,20,.82)` with `backdrop-filter: blur(12px) saturate(140%)`. This is the only glass. Solid `--bg` when backdrop-filter is unsupported.
- **Text:**
  - `--fg:#f2f2f5` (titles)
  - `--body:#c8c8d0` (body text)
  - `--fg-muted:#9d9daa` (meta)
  - `--accent:#a99dff` (links, active text, focus ring)
- **Primary fill:** `--accent-fill:#6d5ce6`, white ink. Hover `#7a6af0`; it must stay ≥ 4.5:1 with white.
- **Level and status hues:**
  - `--high:#ff8a80`
  - `--elev:#f5b74e`
  - `--low:#4ade80`
  - `--info:#8cbfff`
  - `--watch:#e6d36a`
  - `--high-dot` = `--high`
- **Tonal pill:** the hue at 16% over `--s1`, with text and dot in the hue. Use `color-mix(in srgb, var(--chip) 16%, var(--s1))`.
- **Banner and error:**
  - `--warn-bg:#2a2216`, `--warn-ink:#ffd9a0`, border `#4a3a22`
  - `--err-bg:#2a1a1a`, `--err-ink:#ffc4bd`, border `#4a2626`
- **Radius:** `--radius:12px` (cards and lists), `--radius-sm:8px` (controls and rows), chips 99px. No shadow except the menu popover: `0 8px 24px rgba(0,0,0,.5)`.
- **Type:** Inter 400/500/600 via Google Fonts (`display=swap`, preconnect), with a `system-ui` fallback.
  - Body: 16px, line-height 1.5, colour `--body`.
  - h1: 28px/600 on phone, 36px on ≥ 641 px, letter-spacing -0.01em, `--fg`.
  - h2: 22px/600. h3: 16px/600.
  - Meta: 14px. Small text: 13px.
- **Motion tokens** stay as they are.
- **Backdrop:** remove the three blobs and their drift. `html` gets `--bg` plus one faint radial wash (violet at ≤ 6% alpha, top centre, fixed, no animation).
- **Legacy aliases** stay valid for inline styles: `--card`, `--ink`, `--mute`, `--none`, `--glass-bg`, `--glass-bg-strong`. They map to the new tokens.
- **Contrast test:** every text token ≥ 4.5:1 on `--bg`, `--s1`, `--s2` and on its tonal pill. White on `--accent-fill` ≥ 4.5:1. `--high-dot` and `--field-border` ≥ 3:1 on `--s1`.

## Components (`web/css/ui.css`, renamed from `glass.css`)
- **Surfaces:** `.glass` and `.card` become flat `--s1` with a 1px `--line` border, radius 12, padding 16, no blur or shadow. `.glass-strong` and `.toast` become `--s2` plus hairline, and the toast keeps its shadow.
- **Bars:** `.top` and `.tabs` (the `.lg` targets) use `--bar-bg` plus blur, with a hairline on the inner edge only.
- **Buttons:** 8px radius, weight 500, minimum height 44px.
  - Default (secondary): transparent fill, 1px `--field-border` border, `--fg` text, hover `--s2`.
  - `.primary`: `--accent-fill` with white text, no border, hover lighter.
  - `.link`: no border, `--accent`.
  - Press scale 0.97 is kept.
- **Fields:** `--s1` fill, 1px `--field-border` border, 8px radius. Focus shows a 2px `--accent` ring.
- **Chips (`.chip`):** a tonal pill: dot plus word, 13px/600, padding 2px 10px, no left border. Each status maps to a hue: open = info; accepted/done = elev; confirmed = low; disputed/rejected/overdue = high.
- **Sub-nav `.sub`:** a segmented control. `--s1` container with hairline, padding 4, radius 8. Links are 44px tall, `--fg-muted`. The active link gets the `--s2` thumb, `--fg` text, weight 600, no violet fill. It keeps `flex-wrap:wrap`.
- **Row lists:** list views wrap their items in `<div class="list">`. `.list` is `--s1` with hairline and radius 12, and clips its corners.
  - `.list > .card` has no border, radius or background. It has a 1px `--line` bottom border, except on the last item. Padding is 16px. Hover is `--s2`, but only on `a.card`.
  - `.tasklink` rows show a trailing chevron icon.
  - Lists to wrap: My reports, Confirm, Inbox, Held, Actions, the board action log, and the dashboard accountability and capture lists (wherever a view maps items to `card glass rise`).
- **Empty states:** a new pure helper `empty(text)` in `ui/components.js` renders `<div class="empty"><svg class="ic">…inbox…</svg><p>text</p></div>`. It is centred, with a muted 32px icon, and 32px padding. It replaces every `<p class="muted">${EMPTY.x}</p>`.
- **Tables:** `--s2` header, hairline rows, 14px.
- **Banner and error:** flat tinted fill with a border (tokens above).
- **Map:** 12px radius plus hairline.

## Chrome (`index.html`, `main.js`, `css/app.css`)
- **Header `.top`:** 56px tall (`--top-h:56px`). Left: the brand "Rain-Ready", 16px/600. Right: the account control, shown only when logged in.
  - **Account button:** `<button id="acct" class="avatar" popovertarget="acct-menu" aria-label="Account: <name>">`. It is a 36px circle with the persona's initials in `--s2`, plus a hairline. Its hit area is 44px.
  - **Menu:** `<div id="acct-menu" popover class="menu" role="menu">` positioned under the button: fixed, `top: var(--top-h)`, `right: 12px`. It has `--s2`, hairline, radius 12 and the shadow. It contains the persona name and role (muted), and the existing `#logout` button with label "Log out".
  - The Popover API gives light-dismiss and Escape. When the browser lacks `popover` support (`!("popover" in HTMLElement.prototype)`), main.js removes the `popover` attributes and the menu renders inline next to the avatar.
  - The old `#who` span goes. `drawChrome` sets the initials, the aria-label, the name and role, and hidden state. A pure `initials(name)` goes in `ui/format.js`: the first letter of the first two words, uppercased, or "?".
- **Tabs `#tabs`:** each tab is an icon (20px, 1.5 stroke, `aria-hidden`) above its label, 13px/500, `--fg-muted`. The active tab is `--fg` plus a 2px `--accent` indicator, with `aria-current="page"` added.
  - **Phone (≤ 640px):** a fixed bottom bar.
  - **Desktop (≥ 641px):** a flat strip under the header, full width with a bottom hairline, centred to the content width. Icons sit left of the labels, and the active tab has an underline.
  - `TABS` entries gain an icon name: `[hash, label, icon]`.
- **Icons:** `web/img/icons.svg` is a sprite of `<symbol id="i-…">`. It is copied from `lucide-static` at one pinned exact version (fetch the SVGs from `https://unpkg.com/lucide-static@<version>/icons/<name>.svg`; never hand-draw paths), with Lucide's ISC licence notice in a comment.
  - Icons used: camera, list, circle-check, layout-dashboard, trophy, inbox, shield-alert, user-cog, chevron-right, log-out.
  - Each is used as `<svg class="ic" aria-hidden="true"><use href="img/icons.svg?v=N#i-name"/></svg>`. The `?v=` matches the cache version, and the cache-bust test covers it.
- **Content:** `main` has max-width 760px with 16px side padding. The 640–760 reading width from the brief keeps this phone-first app calm, so there is no 1025px column.
- **Liquid lens:** `.lg` stays on `.top` and `.tabs`. `?glass=liquid` still works; css stays the default.

## Accessibility and honesty (unchanged rules)
- Contrast ≥ 4.5:1 for text and ≥ 3:1 for UI borders and dots.
- 44px targets and a 2px focus ring.
- Status is never shown by colour alone: a pill is dot plus word.
- Reduced motion turns off all motion.
- Banned words are unchanged, and the scenario banners keep their place.
- The avatar menu is reachable by keyboard: Tab to the button, Enter opens it, Escape closes it, and focus returns to the button.

## Folded-in follow-ups (from PR #19 review)
- `report.js`: the wait for `/api/map` is capped with `Promise.race([mapReady, new Promise(r => setTimeout(r, 1500))])`.
- The `index.html` cache-bust comment shows a generic sed hint (`?v=N` → `?v=N+1`).
- The cache version is bumped to `?v=3`.
- The README credits (liquidGL MIT, Lucide ISC, Inter OFL) are outside `web/`. They go in the PR description as a note for the README write-up.

## Done when
- `node --test 'web/tests/**/*.test.js'` and `make test` pass.
- The e2e walk passes.
- Playwright screenshots at 390×844 and 1280×800 of every screen show no console errors and no horizontal scroll.
- An avatar menu keyboard probe passes: Tab, Enter, menu visible, Escape, focus on `#acct`. Log out works.
- Fresh `docs/screenshots/*.jpg` total under ~3 MB.
- A PR is opened from `aarush/firefly-ui`, with base `aarush/glass-ui` (or main if #19 has merged).
