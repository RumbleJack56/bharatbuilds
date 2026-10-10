# Rain-Ready design system v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Ship the v2 design-system foundation (tokens, type, pattern helpers, motion) and a style-guide route that shows every pattern. Existing pages are not redesigned.

**Architecture:**
- Tokens live in `css/tokens.css`. Component and pattern CSS lives in `css/ui.css`, plus a new `css/patterns.css` if `ui.css` would pass 250 lines.
- Pure pattern helpers go in `js/ui/patterns.js`. SVG chart helpers go in `js/ui/charts.js`.
- A `#/styleguide` route (controller plus pure view) renders every pattern with fixture data, labelled as such.
- Existing views change only where a token rename forces it.
- Ports, adapters, the router and `main.js` wiring are unchanged, except that the route is registered.

**Tech Stack:** vanilla ES modules, no build step, `node --test`, Playwright (scratchpad install).

**Spec:** `rain-ready/docs/design/DESIGN_SYSTEM.md`

## Global Constraints
- The base is branch `aarush/firefly-ui` (PR #21), or main once #21 merges. The new branch is `aarush/design-system`.
- Edit only `rain-ready/web/` and `rain-ready/web/tests/`.
- No new dependency, no build step and no npm package in `web/`. The only new external resource is a Google Fonts stylesheet.
- Layering is enforced by `architecture.test.js`:
  - `ui/` and `views/` are pure.
  - Only `main.js` imports adapters.
  - Only `map-leaflet.js` touches `L`.
- Files stay at about 250 lines or fewer (CSS included).
- Banned UI words stay out, including "verified", "proof" and "unspoofable". Use **confirmed** for the positive state.
- Status is never colour-only. Targets are ≥ 44px. The focus ring is 2px. Contrast is AA.
- Reduced motion turns everything off, from the single block in `motion.css`.
- Commits are `[aarush] web: <what>` with **no AI attribution**.
- Cache version: bump `?v=` across `index.html`, `components.js` and the view sprite refs once, in the last task. `cache-bust.test.js` guards this.
- Tests run from `rain-ready/`: `node --test 'web/tests/**/*.test.js'` and `make test`.
- Use isolated servers only (never `make reset` or `make run`). Walk command:
  ```
  NODE_PATH=…/pw/node_modules PW_CHROME=~/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome node web/tests/e2e/walk.mjs http://localhost:PORT $SP/walk
  ```
- Token values are taken verbatim from spec section 3. Type, spacing, radii, shadow and breakpoints are verbatim from section 4. Motion is verbatim from section 9.

## Review Focus
1. **Legacy alias drift.** Inline styles and older CSS use `--high`, `--elev`, `--low`, `--high-dot`, `--card`, `--mute` and `--none`, and all of them must keep resolving. `tokens-defined.test.js` must keep passing, and Task 1 adds alias assertions.
2. **Ranges, not points.** `gauge()` and the range-bar chart, given `time_to_fill_h_low/high` (one may be null or the same as the other), must never print a lone point or `NaN`. Test the null, equal and missing cases.
3. **Non-finite chart input.** An empty series, a single point, or values of 0 or above the ceiling must not divide by zero or emit `NaN` in SVG attributes. Test each case.
4. **The skeleton delay.** It must not flash for fast loads and must not stay forever. Specifically: nothing appears before 300 ms, and the skeleton is removed when content arrives. This is pure timing logic, tested with `mock.timers`.
5. **Font failure.** If the Google Fonts CSS is blocked or offline, layout must hold with the fallback stack (no overflow at 390 px). Run a Playwright check with the fonts request aborted.

---

### Task 1: Tokens v2, typeface and contrast gate

**Files:**
- Modify:
  - `web/css/tokens.css`
  - `web/index.html` (swap the Inter link for `https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;500;700&display=swap`)
- Test:
  - `web/tests/contrast.test.js`
  - `web/tests/glass-css.test.js` (font assertion)
  - `web/tests/tokens-defined.test.js` (alias list)

**Interfaces:** Produces every token in spec sections 3, 4 and 9:
- colours: `--bg --s1 --s2 --line --line-strong --field-border --fg --body --fg-muted --accent --accent-fill --accent-fill-hover --crit --warn --watch --ok --info --none --tint-a --scenario-* --err-* --bar-bg`
- type: `--t-xs … --t-3xl`
- spacing: `--sp-1 … --sp-8`
- sizes: `--ctl --top-h:56px --bar-h:64px`
- radii: `--r-0 --r-ctl:6px --r-panel:8px --r-float:10px --r-pill:999px`
- `--shadow-float`
- motion: `--dur-instant --dur-fast --dur --dur-slow --ease-out --ease-in`
- legacy aliases: `--high:var(--crit)`, `--elev:var(--warn)` and `--low:var(--ok)`, with `--high-dot` kept as a literal of `--crit` because the parser cannot resolve `var()`.

- [ ] **Step 1: Write failing tests.**
  - **Contrast:** every text token on `bg`, `s1` and `s2` must reach ≥ 4.5. The text tokens are `fg`, `body`, `fg-muted`, `accent`, `crit`, `warn`, `watch`, `ok` and `info`. Also check:
    - each state colour on its own 14% tint over `s1` ≥ 4.5
    - white on `accent-fill` and on `accent-fill-hover` ≥ 4.5
    - `field-border` on `s1` ≥ 3
    - scenario and error ink on their backgrounds ≥ 4.5
    - `fg` over `bar-bg` composited on `bg` ≥ 4.5
  - **Tokens:** `tokens.css` contains `--bg:#10171b` and `--crit:#ff8577` (case-insensitive), and the aliases `--high:var(--crit)` and `--low:var(--ok)`.
  - **Font:** `index.html` links `Atkinson+Hyperlegible+Next` with `display=swap` and no longer links `family=Inter`. The body font-family starts with `"Atkinson Hyperlegible Next"`.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement.** Rewrite the `tokens.css` values and add the new scales. Base element rules:
  - body `var(--t-md)`
  - h1 at `--t-2xl` (`--t-3xl` from 641 px), h2 at `--t-xl`, h3 at `--t-lg`, all weight 700
  - `font-variant-numeric: tabular-nums` on `td`, `.num` and `.metric-value`
  - prose `max-width: 68ch`
- [ ] **Step 4: Run the full web suite green.** Fix only assertions that pinned the old values.
- [ ] **Step 5: Commit.** `[aarush] web: design system v2 tokens, Atkinson Hyperlegible Next, contrast gate`

### Task 2: Radius hierarchy, ledger rows, tables, alerts, density and page widths (CSS + 2 helpers)

**Files:**
- Modify:
  - `web/css/ui.css`
  - `web/css/app.css`
  - `web/js/ui/components.js` (`alert(kind, text)`, `empty(text, action?)`)
- Create: `web/css/patterns.css` if needed, linked in `index.html` with the current `?v=`
- Test: new `web/tests/ds-components.test.js`, plus `cache-bust.test.js` if a CSS file is added

**Interfaces:**
- `alert(kind: "scenario"|"info"|"warn"|"error", text)` returns `<div class="alert alert-${kind}" ${kind==="error"?'role="alert"':''}><svg class="ic">…</svg><p><strong>${word}</strong> ${esc(text)}</p></div>`. The words are: scenario → "Scenario", info → "Note", warn → "Check", error → "Error".
- `banner(t)` stays as it is (back-compat). New code uses `alert`.
- `empty(text, action)` takes `action = {href, label}` and renders a primary link under the text.
- CSS classes:
  - widths: `.w-form` (560), `.w-read` (720), `.w-work` (1200)
  - `.dense`
  - `.ledger` (table), `.ledger-rows` (stacked)
  - `.alert-*`

- [ ] **Step 1: Write failing tests.**
  - **`alert`:**
    - `alert("error","x")` has `role="alert"` and "Error".
    - `alert("scenario","Scenario, not a forecast.")` has no close button.
    - Text is escaped.
  - **`empty`:**
    - `empty("No reports yet.", {href:"#/report", label:"Report a problem"})` has `href="#/report"`.
    - Without an action, it has no `<a`.
  - **CSS:**
    - `.list>.card` and `.ledger td` have `border-radius:0` (or none set).
    - Controls use `var(--r-ctl)`, panels (`.map`, `.photos img`, `.panel-detail`) use `var(--r-panel)`, and `.menu` and `.toast` use `var(--r-float)`.
    - `box-shadow` appears only in `.menu`, `.toast` and `.panel-detail` rules.
    - `.ledger th` is `position:sticky` with `top:var(--sticky-top)`, where `--sticky-top` is `var(--top-h)` on phone and `calc(var(--top-h) + 49px)` from 641 px. 49 is the tab strip height; Task 6 measures it.
    - `.w-form`, `.w-read` and `.w-work` set max-widths of 560, 720 and 1200.
    - `.dense` sets the row min-height to 44.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement the CSS and helpers.**
  - Remove the `.card` radius from rows inside `.list`.
  - Phone tables: `@media (max-width:640px) .ledger` stacks rows using `td::before{content:attr(data-label)}`. Views must then set `data-label`, and the helper in Task 3 does that.
- [ ] **Step 4: Run the full suite green.**
- [ ] **Step 5: Commit.** `[aarush] web: radius hierarchy, ledger tables, alerts, density and page-width classes`

### Task 3: Pattern helpers (gauge, metric, skeleton, ledger table)

**Files:**
- Create: `web/js/ui/patterns.js`
- Modify: `web/css/patterns.css` or `ui.css`
- Test: new `web/tests/ds-patterns.test.js`

**Interfaces** (all pure and string-returning):
- `gauge({ level, low, high, rain, vertical=false })`
  - `level` is one of `"none"|"watch"|"elevated"|"high"`, or anything else, which is treated as `none`.
  - It returns `<div class="gauge gauge-${level}" role="img" aria-label="${Word}: ${rangeText}">` with 4 `<i class="band b-n">` (in the order none, watch, elevated, high) plus `<span class="gauge-word">Word</span><span class="gauge-range">rangeText</span>`.
  - `rangeText` follows these rules:
    - both numbers present and different: "fills in {low}–{high} h at {rain} mm/h"
    - equal: "fills in about {low} h at {rain} mm/h"
    - one null: "fills in about {the other} h at {rain} mm/h"
    - both null: "does not fill at {rain} mm/h"
  - Hours are rounded to 1 decimal under 10 and to an integer at 10 and above. The words come from `LEVEL` in `ui/copy.js`; reuse it, do not duplicate.
- `metric({ value, unit, label, basis })` returns `<div class="metric"><p class="metric-label">…</p><p class="metric-value num">…<span class="metric-unit">…</span></p><p class="metric-basis">…</p></div>`.
  - `basis` is required: throw `Error("metric needs a basis")` when it is missing. The honesty rule is enforced in code.
  - A null or undefined `value` renders "Not available".
- `skeleton(kind: "row"|"metric"|"map", n=3)` returns `<div class="skel" aria-hidden="true">…</div>`.
- `delayed(showFn, ms=300, setTimer=setTimeout, clearTimer=clearTimeout)` returns `{ cancel() }`.
  - It calls `showFn` once after `ms` unless `cancel()` runs first. It is pure apart from the injected timers.
  - Controllers use it as `const d = delayed(() => pane.innerHTML = skeleton("row")); …; d.cancel()`.
- `ledgerTable({ columns:[{key,label,num?}], rows:[{…}] })` returns `<table class="ledger">` with `<th scope="col">`.
  - Each cell is `<td data-label="${label}" class="${num?'num':''}">`.
  - Values are escaped. Null values render "—" with `aria-label="Not available"`.

- [ ] **Step 1: Write failing tests.** Cover:
  - each `gauge` range case, including the Review Focus 2 cases
  - an unknown level falls back to none
  - the aria-label contains the word and the range
  - `metric` throws without a basis; a null value shows "Not available"
  - `delayed` with `mock.timers`:
    - not called at 299 ms, called at 300 ms
    - not called if cancelled at 200 ms
    - called only once
  - `ledgerTable`:
    - escapes `<b>`
    - sets `data-label`, and `num` on numeric columns
    - a null cell renders "—"
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement the helpers and CSS.**
  - Gauge bands: 4 equal segments 6 px tall with a 2 px gap, `--r-0`. A filled band takes its state colour; an unfilled one is transparent with a 1 px `--line-strong` border.
  - The vertical variant stacks the bands bottom to top.
  - Skeleton: `--s2` blocks, static (no shimmer).
- [ ] **Step 4: Run the full suite green, including `architecture.test.js`.** `patterns.js` imports only from `ui/`.
- [ ] **Step 5: Commit.** `[aarush] web: gauge, metric, skeleton, delayed and ledger-table helpers`

### Task 4: SVG chart helpers with table fallback

**Files:**
- Create: `web/js/ui/charts.js`
- Modify: the chart CSS block in `patterns.css`
- Test: new `web/tests/ds-charts.test.js`

**Interfaces** (pure, string-returning; the coordinates use a 0..W by 0..H viewBox, `W=320` and `H=160`, with `width:100%`):
- `lineChart({ series:[{ points:[{x,y}], dashed?, label }], xLabel, yLabel, yMax, caption })` returns `<figure class="chart"><svg viewBox="0 0 320 160" role="img" aria-label="${caption}">…</svg><figcaption>${caption}</figcaption><details><summary>Show the numbers</summary>${ledgerTable(…)}</details></figure>`.
  - A dashed series gets `stroke-dasharray="4 3"`.
  - There are horizontal gridlines only, at most 4.
- `rangeBars({ rows:[{label, low, high, level}], max, caption })` draws one row per item, a bar from low to high in the level colour, with the label left and the range text right. It reuses the `gauge` rangeText rules; export that formatter from `patterns.js`.
- `stackBar({ rows:[{label, parts:[{key, n}]}], keys, caption })` draws status counts per agency. Each segment carries a `<title>` with the word and count.
- Every helper returns `<figure class="chart chart-empty">` with "No data to chart." when it has no rows or points.
- No attribute may contain `NaN` or `Infinity`. Clamp the values, and use `yMax = max(yMax||0, max(y), 1e-9)`.

- [ ] **Step 1: Write failing tests.**
  - Use the API shape `silt_series_illustrative` = `{points:[{days, silt_fraction}], illustrative:true, note}`, mapped to `{x:days, y:silt_fraction}`.
  - The output contains the note as the caption, `stroke-dasharray`, and the word "illustrative".
  - It has no `NaN` for an empty series, a single point or all-zero values.
  - The table fallback has a row per point.
  - `rangeBars` handles null `low` or `high` using the gauge rules.
  - `stackBar` segment widths sum to the bar width (±1).
  - Output never contains "measured" or the banned words (import `BANNED` from `copy.js`).
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement.** Colours: data in `var(--accent)`, state colours by level or status key, axes and labels in `var(--fg-muted)`, gridlines in `var(--line)`.
- [ ] **Step 4: Run the suite green.**
- [ ] **Step 5: Commit.** `[aarush] web: SVG line, range-bar and stacked-bar charts with table fallback`

### Task 5: Motion v2 and the detail-panel shell

**Files:**
- Modify: `web/css/motion.css`, `web/css/ui.css` (`.panel-detail`, `.work-split`) and `web/js/ui/components.js` (`stagger`)
- Test: `web/tests/glass-css.test.js` (motion assertions), `views-glass.test.js` (stagger assertions)

**Interfaces:**
- `stagger(i)` is kept as an export so views do not break, but returns `""`.
  - **Ruling:** remove the per-item entrance. The spec (section 9) wins over the old tests, so update the tests that pinned `--i`.
  - The `.rise` rule is deleted.
- New CSS:
  - `.work-split` is a grid at ≥ 1024 px: `minmax(0,1fr) 440px`, with a 24 px gap.
  - `.panel-detail` uses `--s1`, a hairline, `--r-panel` and `--shadow-float` only when it is an overlay below 1024 px.
  - `.flash` runs a one-time `--s2` highlight that fades over 600 ms.

- [ ] **Step 1: Write failing tests.** In `motion.css`:
  - no `.rise` and no `animation-delay`
  - route view-transition durations use `var(--dur-slow)`
  - exits use `var(--ease-in)`
  - the reduced-motion block still zeroes animation and transition and skips view transitions
  - hover rules change only `background`/`color` (no `transform` on `.card` or `a.card`)
  - the button press is `scale(.98)`

  Also: `stagger(3)` returns `""`, and `.work-split` exists inside a `min-width:1024px` media query.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement.** Update the tests that pinned the old stagger and say so in the report.
- [ ] **Step 4: Run the suite green, then the walk.**
- [ ] **Step 5: Commit.** `[aarush] web: motion v2 (one route transition, no list stagger), detail-panel shell`

### Task 6: Style-guide route, browser verification and cache bump

**Files:**
- Create: `web/js/controllers/styleguide.js`, `web/js/views/styleguide.view.js`
- Modify: `web/js/controllers/index.js` (register `#/styleguide`, no tab), `web/index.html` (import map entries, `?v=` bump), `web/tests/cache-bust.test.js` if needed
- Test: new `web/tests/ds-styleguide.test.js`

**Interfaces:**
- The view renders every pattern with **fixture data clearly labelled "Example data for the style guide"**: colour swatches with their token name and contrast, the type scale, the gauge in 4 levels and 4 range cases, a metric row, all 4 alerts, `ledgerTable` (normal and `.dense`), the 3 charts (including an empty one), a skeleton, both `empty` forms, buttons in all variants and states, fields, pills for every status, and a `.work-split` with a `.panel-detail`.
- The route needs no login and makes no API call.

- [ ] **Step 1: Write failing tests.**
  - `styleguideView()` contains each pattern's root class and the label "Example data".
  - It contains no banned word.
  - The route is registered and absent from `TABS`.
  - The architecture test passes.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement, then bump `?v=` by one** everywhere (`grep -rn "?v=" web/`).
- [ ] **Step 4: Browser checks** (isolated server, Playwright, 390×844 and 1280×800):
  - On `#/styleguide`:
    - 0 console errors
    - `scrollWidth <= innerWidth`
    - `document.fonts.check('16px "Atkinson Hyperlegible Next"')` is true
    - the measured tab strip height, compared with the 49 px used in `--sticky-top`, corrected if they differ
  - With `page.route('**/fonts.googleapis.com/**', r => r.abort())`, there is still no horizontal overflow (Review Focus 5).
  - With `emulateMedia({ reducedMotion: 'reduce' })`, the computed `animation-name` of the view is `none`.
  - Screenshots `$SP/ds-*.png` at both widths, for the controller to review.
  - The walk passes, and `make test` passes.
- [ ] **Step 5: Commit.** `[aarush] web: style-guide route for the v2 design system, cache bump`

## Afterwards (not in this plan)
Redesign the pages one route at a time with these patterns: Inbox and Task detail into `.work-split`, Dashboard metrics and gauges, Board ledger, and the Simulator gauge animation. Each gets its own short plan once the user has reviewed the style guide.
