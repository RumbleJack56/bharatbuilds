# Rain-Ready design system — specification (v2), 2026-10-10

Status: **written for review. No pages are redesigned yet.** It builds on PR #21 (Firefly flat UI) and replaces its token values and component rules. Ports, adapters and routes stay as they are.

## 0. Ground truth

- **Subject.** A shared action list for monsoon waterlogging in Delhi: which drain to clean, who owns it, who did it, who checked it, and whether it helped.
- **Audience.**
  - **Residents** on phones, outdoors, often in rain or glare. They report a blocked drain and confirm finished work.
  - **Officials** (MCD, PWD) work through an inbox of tasks.
  - **A coordinator** assigns and reviews.
  - **Judges and the public** read the accountability board and dashboard on a laptop.
- **Primary job of the interface.** Make four things legible at a glance:
  - **risk:** how soon a low point fills at a given rain
  - **evidence:** a stamped photo, location and time, and the source of each number
  - **ownership:** which agency, or "No owner found"
  - **response status:** open → accepted → done → confirmed, or disputed/rejected
- **Fixed constraints.** These come from CLAUDE.md, SCOPE section 7 and the PLAN layering, and are not negotiable:
  - vanilla ES modules, no build step, no npm dependency in `web/`
  - views are pure HTML strings, with a composition root in `main.js`
  - honesty rules: scenario, not forecast; banned words; placeholders labelled
  - status is never shown by colour alone; WCAG AA
- **Word rule.** The brief says "verified positive states". `verified` is a banned UI word in this project, because nothing is independently verified. This spec calls that state **confirmed**: a resident checked the finished work. Token names follow suit (`--ok`).

## 1. Component-system audit: shadcn/ui and Flowbite

**Finding:** neither is in the codebase. I searched the whole repo for `shadcn`, `flowbite` and `tailwind` and found 0 matches. The web app is plain HTML strings from `web/js/views/*.js`, with styling from 4 CSS files (`tokens.css`, `app.css`, `ui.css`, `motion.css`, together about 250 lines). Pure snippets live in `web/js/ui/components.js`, which provides `chip`, `banner`, `errBox`, `empty`, `tabsHtml`, `photos`, `flagList` and `guard`.

| Option | What adopting it means here | Verdict |
|---|---|---|
| shadcn/ui | React + Radix + Tailwind, copied into the repo, plus a bundler. | **Reject.** It needs React and a build step, which breaks the "no build step" rule and every view. |
| Flowbite | Tailwind classes plus `flowbite.js`. It can run from a CDN, but Tailwind must be compiled (or use the Play CDN, which is not for production) and it brings its own component JS. | **Reject.** A second styling system on top of ours means two token sources and two focus/motion rules, so it is not one coherent system. |
| Our own (`ui.css` + `ui/components.js`) | It is already wired, tested (contrast, architecture, cache-bust) and token-driven. | **Retain and extend.** This is the one component system. |

**What we take from shadcn/ui is its vocabulary only, not its code.** We borrow its variant naming, so the inventory reads familiarly:
- Button: `default`, `secondary`, `ghost`, `destructive`
- Badge (our status pill), Alert, Table, Tabs (our segmented control), Skeleton, Sheet (our detail panel), Tooltip

We use none of Flowbite.

## 2. Visual direction: "Gauge and ledger"

Two objects from the subject's world give the direction:

1. **The flood gauge staff.** This is the graduated post at underpasses and drains that shows water depth, with bold ticks and numbers. Rain-Ready's risk is a level on a scale (hours to fill at X mm/h), so the gauge is the one bold element. It appears wherever risk appears: legend, list rows, metric, map popup, and simulator.
2. **The municipal works ledger.** These are the ruled register books that record who did what and when, signed off. Accountability data (tasks, timelines, the board) is set as ruled rows with a strong left column for the actor, not as floating cards.

Everything else stays quiet and disciplined. The one bold move is spent on the gauge.

**Self-review against the generic defaults** (frontend-design skill, calibration list):

| Default | Where PR #21 sat | v2 change and why |
|---|---|---|
| Near-black with a single bright accent | `#121214` neutral with violet | The ground becomes a deep, cool **night-water** (`#10171B`), taken from drain water at night. Violet stays, but only as the interactive colour, because it is the one hue the risk scale does not use. Risk colour now leads the palette, not the accent. |
| SaaS card kit (identical rounded cards) | Cards with 12px radius everywhere | Radius follows hierarchy (section 4). Lists become ruled ledger rows. Cards remain only for real objects: a photo with its stamp, a result. |
| Middle-dot meta strings ("A · B · C") | Used in inbox and board meta | Meta becomes labelled pairs ("Owner MCD", "Reports 2") laid out in a definition row, not joined with dots. |
| Monospace for small data labels | Not used | Not used. Numbers use **tabular figures** of the text face instead. |
| ALL-CAPS eyebrows | Not used | Not used. Sentence case everywhere. |
| Inter by default | Inter | **Atkinson Hyperlegible Next**, designed by the Braille Institute for low-vision legibility. It suits residents reading outdoors in glare, and its distinct letterforms (0/O, 1/l/I) matter for drain IDs like `DR-DN-PUSA`. |
| Fade-and-rise on every item | `.rise` stagger on lists | Removed. One orchestrated moment remains: the route change. Motion answers actions (section 9). |

**Theme.** Dark stays the default, because the user chose it twice. A light "daylight" theme is a likely future need for outdoor phones, so every colour is a token; it is not designed or shipped now.

## 3. Colour tokens

These are the base palette, five named values plus one interaction colour:

| Name | Hex | Role |
|---|---|---|
| Night water | `#10171B` | App background (`--bg`) |
| Embankment | `#162026` | Surface: panels, rows, inputs (`--s1`) |
| Culvert | `#1E2A31` | Raised: hover, selected row, table head, overlays (`--s2`) |
| Paper | `#EDF1F2` | Primary text (`--fg`) |
| Silt | `#93A3AB` | Secondary text (`--fg-muted`) |
| Signal violet | `#AB9FFF` / fill `#6D5CE6` | Interactive only: links, focus, primary button, selection (`--accent`, `--accent-fill`) |

Full token set (`web/css/tokens.css`). Every ratio below was computed with `web/tests/contrast-lib.js`.

| Token | Value | Use | Contrast (on s1) |
|---|---|---|---|
| `--bg` | `#10171B` | page | — |
| `--s1` | `#162026` | surfaces | — |
| `--s2` | `#1E2A31` | raised, hover, overlay | — |
| `--line` | `#2B3840` | hairline rule (decorative separation) | 1.37 (decorative; not a boundary) |
| `--line-strong` | `#3A4A54` | ledger rule under a header, table head | — |
| `--field-border` | `#73858E` | input, outline button border | 4.32 (≥ 3 ✓) |
| `--fg` | `#EDF1F2` | headings, values | 14.55 |
| `--body` | `#C3CDD2` | body text | 10.23 |
| `--fg-muted` | `#93A3AB` | labels, meta, captions | 6.36 |
| `--accent` | `#AB9FFF` | links, active nav text, focus ring | 7.20 |
| `--accent-fill` / hover | `#6D5CE6` / `#7060EA` | primary button, white ink | white 4.86 / 4.62 |
| `--crit` (High) | `#FF8577` | critical risk text and gauge band; disputed/rejected/overdue | 6.99 |
| `--warn` (Elevated) | `#F5A83A` | elevated risk; accepted/done awaiting check | 8.31 |
| `--watch` | `#E3CF5A` | watch band | 10.51 |
| `--ok` (confirmed) | `#5FD69A` | confirmed by a resident; low risk | 9.12 |
| `--info` | `#86BDF5` | open; neutral notices | 8.36 |
| `--none` | `= --fg-muted` | no risk at this rain | 6.36 |
| `--tint-a` | `.14` | state tint alpha: `color-mix(in srgb, var(--crit) 14%, var(--s1))` | text on tint ≥ 5.5 |
| `--scenario-bg` / `--scenario-ink` / `--scenario-line` | `#2A2416` / `#FFD9A0` / `#4A3C22` | the mandatory "Scenario, not a forecast" banner | ≥ 4.5 (keep from #21) |
| `--err-bg` / `--err-ink` / `--err-line` | `#2A1A1A` / `#FFC4BD` / `#4A2626` | errors | ≥ 4.5 |
| `--bar-bg` | `rgba(16,23,27,.86)` + blur 12px | top and bottom bars only | fg ≥ 4.5 over bg |

**Rules:**
- Risk and status colours only ever mark risk or status. They are never used for decoration or brand.
- A colour always comes with a word (High, Elevated, Watch, None; open, accepted, done, confirmed, disputed, rejected) and, on the gauge, a position.
- Hairlines (`--line`) only separate content that is already grouped. A boundary that must be seen (a field, a button) uses `--field-border` at ≥ 3:1.
- No gradients anywhere except `--bar-bg`'s blur and the map's own tiles.
- Legacy aliases (`--card`, `--ink`, `--mute`, `--high`, `--elev`, `--low`, `--high-dot`) map onto the new names, so inline styles keep resolving. `tokens-defined.test.js` guards this.

## 4. Typography, spacing, sizing, radii, shadows, breakpoints

**Typeface.** One family: **Atkinson Hyperlegible Next**, weights 400, 500 and 700, from Google Fonts with `display=swap`. Fallback stack: `system-ui, -apple-system, "Segoe UI", sans-serif`. Numbers in data use `font-variant-numeric: tabular-nums`. No second family and no monospace.

**Scale.** A modular ratio of about 1.2 from 16px, following Bringhurst's guidance of a few sizes with clear steps:

| Token | Size / line height | Weight | Use |
|---|---|---|---|
| `--t-xs` | 13 / 18 | 400 | timestamps, legal and attribution only |
| `--t-sm` | 14 / 20 | 400 / 500 | labels, meta, table cells, nav labels |
| `--t-md` | 16 / 24 | 400 | body |
| `--t-lg` | 19 / 26 | 700 | row title, panel title (h3) |
| `--t-xl` | 23 / 30 | 700 | section (h2) |
| `--t-2xl` | 28 / 34 | 700 | page title (h1) on phone |
| `--t-3xl` | 34 / 40 | 700 | page title on ≥ 641px; metric values |

Letter-spacing is 0, except -0.01em at sizes 28 and above. Sentence case throughout. Line length stays at 75 characters or fewer (`max-width: 68ch` on prose).

**Spacing.** A 4px base. The scale is `--sp-1` 4, `--sp-2` 8, `--sp-3` 12, `--sp-4` 16, `--sp-5` 24, `--sp-6` 32, `--sp-7` 48, `--sp-8` 64.
- Inside a row: 12 vertical and 16 horizontal.
- Between related blocks: 16. Between sections: 32 on phone, 48 on desktop.
- Page gutter: 16 on phone, 24 at 641px and up.

**Sizing.**
- Every target is at least 44×44 (control height `--ctl` 44).
- Ledger row: at least 56px tall.
- Top bar 56. Bottom bar 64 plus the safe area.
- Icons: 20 in nav, 16 inline. Lucide (already in `img/icons.svg`), with 1.5 stroke.

**Radii follow hierarchy, not one value everywhere:**

| Element | Radius | Why |
|---|---|---|
| Ledger rows, table cells, gauge ticks | 0 | Ruled register; edges meet. |
| Controls (button, input, segmented thumb) | 6 | Touch affordance without softness. |
| Panels (map frame, photo, result, detail panel) | 8 | The object is a contained thing. |
| Overlays (menu, sheet, toast) | 10 | Floats above; slightly softer. |
| Status pill | 999 | A pill reads as a label, not a container. |

**Shadows.** None on anything in the page flow. Only overlays get one, at a single level: `--shadow-float: 0 12px 32px rgba(0,0,0,.45), 0 0 0 1px var(--line)`.

**Breakpoints.** The base design is the 390px phone.
- `--bp-md` **641px:** tabs move from the bottom bar to the top strip, and the gutter becomes 24.
- `--bp-lg` **1024px:** work pages get two panes (list plus detail panel); the dashboard map gets its side legend.
- `--bp-xl` **1440px:** the work width caps at 1200; no further growth.

## 5. Information hierarchy, page widths, density, navigation

**Hierarchy on any page (top to bottom):**
1. Page title: what this is.
2. The mandatory scenario or honesty banner where the data is a scenario.
3. The decision line: the one number or state that matters (for example, "3 drains to clean before 25 mm/h rain").
4. Filters.
5. Ledger or list.
6. Source and method notes, in muted 14px at the end.

Evidence (photo, stamp, location, time, source) sits next to the claim it supports, never in a separate tab.

**Page widths (a centred column, left-aligned content):**

| Kind | Max width | Pages |
|---|---|---|
| Form | 560 | Login, Report, Mark done |
| Reading | 720 | My reports, Confirm, Task detail (phone), Held |
| Work | 1200 | Dashboard (map, simulator, impact, insights), Board, Inbox at ≥ 1024 with detail panel |

**Alignment.** Content is left-aligned. Numbers in tables are right-aligned. Only empty states are centred.

**Density modes.**
- **Comfortable** (default): residents, all phone views. Row at least 56px, body 16.
- **Compact:** inbox, held, actions and board tables at ≥ 1024px. Row 44px, cells at 14. It is applied by a container class `.dense`, never per element.

**Navigation.**
- **Phone:** a fixed bottom bar with icon over label, 3 to 5 items per role, and the active item marked by an accent bar plus `aria-current`.
- **Desktop:** a flat tab strip under the 56px header, with an underline for the active tab.
- The account menu sits behind the avatar (already built in #21).
- Dashboard sections use a segmented control that wraps. On ≥ 1024px they may become a left section list inside the work column.
- Back links are at least 44px.
- There is never more than one primary button per view.

```
Phone (390)                         Desktop work page (≥1024)
┌───────────────────────┐           ┌──────────────────────────────────────────────┐
│ Rain-Ready        (RA)│ 56        │ Rain-Ready                              (MO) │
├───────────────────────┤           ├──────────────────────────────────────────────┤
│ Inbox                 │           │  Inbox  Held  Dashboard  Board   (underline) │
│ ░ Scenario banner ░░░ │           ├────────────────────────┬─────────────────────┤
│ 3 open · decision line│           │ Inbox        [filters] │ Detail panel        │
│ [All][Open][Overdue]  │           │ ░ Scenario banner ░░░░ │ Pusa Rd barrel      │
│───────────────────────│           │ ┃▮▮▮▯ High  Pusa Rd  ›│ gauge ▮▮▮▯ 3–5 h    │
│┃▮▮▮▯ Pusa Rd barrel  ›│           │ ┃▮▮▯▯ Elev  Karol Bagh›│ Owner MCD (source)  │
││ Owner MCD  Reports 2 │           │ ┃▮▯▯▯ Watch Anand Pbt ›│ Photo + stamp       │
│───────────────────────│           │                        │ Timeline (ledger)   │
│ [nav nav nav nav nav] │ 64        │                        │ [Accept] [Mark done]│
└───────────────────────┘           └────────────────────────┴─────────────────────┘
```

(The "3 open · decision line" label in the wireframe is annotation, not copy. Real meta never joins with dots.)

## 6. Shared patterns

Each pattern is a pure helper in `web/js/ui/` (HTML string in, no I/O) plus rules in `ui.css`. Views compose them.

**6.1 Risk gauge (the signature element), `gauge({ level, label, range })`:**
- A 4-band horizontal staff (None, Watch, Elevated, High), 6px tall with square ticks. Bands up to and including the current level are filled in their colours; the rest show as `--line` outlines.
- The word ("High") and the range ("fills in 3–5 h at 25 mm/h") always sit next to it.
- Vertical variant: 4 stacked bands for the map legend and simulator.
- `role="img"` with an aria-label that repeats the word and range.
- It never shows a single point estimate when the API gives a range.

**6.2 Metric, `metric({ value, unit, label, basis })`:**
- Value at 34/700 tabular, unit at 16 muted, label at 14 above.
- **Basis line at 13 is required:** for example, "Scenario at 25 mm/h, illustrative capacity".
- No icon bubble, no delta arrow, no background tile.
- Metrics sit in a row divided by `--line` verticals, not in cards. A metric with no data shows "Not available" and the reason.

**6.3 Charts** (pure SVG strings, no library):
- **Types:** line (silt series), range bar (fill time low–high per pocket), stacked count bar (status per agency).
- **Axes:** 14px labels at `--fg-muted`; gridlines `--line`, horizontal only; data in `--accent` or the status colour for its meaning.
- **Honesty:**
  - `silt_series_illustrative` is drawn as a dashed line, with the API `note` as its caption, and the words "illustrative estimate".
  - The model curve is solid. "Measured" is never used.
- **Accessibility:** every chart has a `<table>` fallback behind a disclosure ("Show the numbers").
- **Hover:** shows a value readout. It is touch-safe and works on tap.

**6.4 Maps** (Leaflet via `map-leaflet.js`, unchanged port):
- **Frame:** an 8px panel with `--line`. OSM tiles stay light; we do not CSS-filter tiles.
- **Markers:**
  - Pockets: the risk colour plus a shape plus a text label.
  - Drains: a square, red for no owner.
  - Tasks: a numbered rank.
- **Legend:** in the page, never only in the map. A vertical gauge plus shape key, beside the map at ≥ 1024 and under it on phone.
- **Captions:** a caption above the map states the rain basis (already built).
- **Popups:** use the detail-panel typography.

**6.5 Data tables (`.ledger`):**
- Header row on `--s2` with 14/500 `--fg-muted` labels and `--line-strong` under it.
- Rows 44 (dense) or 56, with a `--line` bottom border and no zebra striping. The first column is the actor or asset, at 500 weight.
- Numbers are right-aligned and tabular. Status uses the pill.
- **Sticky head:** `top` = header height plus tab-strip height on desktop (fixes the parked #21 issue).
- **Phone:** tables of more than 3 columns become stacked ledger rows (label / value pairs), not a horizontal scroll.

**6.6 Filters:**
- A segmented control for 2–5 mutually exclusive views ("All / Open / Overdue").
- Toggle chips with counts for multi-select ("Agency: MCD 4").
- A visible "Clear filters" appears when any filter is set.
- Filter state lives in the hash query so it survives refresh. This is a controller concern, already the router's pattern.

**6.7 Empty states (`empty(text, action?)`):**
- Centred, with a 32px muted icon.
- One sentence saying what this space is for, plus the one action that fills it (for example, "Report a problem").
- Copy explains and directs; it never apologises.

**6.8 Loading states (`skeleton(kind, n)`):**
- Skeleton rows shaped like the final content (ledger row, metric, map frame), in `--s2` blocks.
- Shown only after a 300ms delay, so fast loads show nothing.
- No spinner, except inside a busy button (`aria-busy`, label kept).
- Replaces today's "Loading..." text. The `aria-live` region stays.

**6.9 Alerts (one component, `alert(kind, text)`), four kinds:**
- `scenario`: mandatory and never dismissible.
- `info`
- `warn`: field-safety rule, needs check.
- `error`: what went wrong and how to fix it, with `role="alert"`.

Each has a 3px left rule in its colour, a tinted fill and an icon plus a word. Toasts are only for confirming an action that happened ("Report sent"); errors that need action stay inline.

**6.10 Detail panels (`.panel-detail`):**
- At ≥ 1024: a right pane in the work layout, 420–480 wide, which scrolls independently. It shows the title, the gauge, ownership with source, evidence (photo with stamp lines, location, time), a timeline ledger, and actions pinned at its foot.
- On phone the same content is the existing task route, as a full page with a back link. One markup, two placements.
- Escape or the back link closes it, and focus returns to the row that opened it.

## 7. Iconography and imagery

- **Icons:** Lucide only, from the existing sprite, 1.5 stroke. Each icon always has a text label, except the avatar and close buttons, which carry an aria-label.
- **Photos:** shown at their real aspect ratio with the stamp kept legible. No decorative imagery or illustrations.

## 8. Accessibility floor (unchanged, restated)

- Contrast: AA (4.5:1 for text, 3:1 for UI boundaries and the gauge's band edges).
- Focus ring: 2px `--accent` with offset, inset inside clipped containers.
- Targets 44px. Status always shown by word as well as colour.
- `aria-current` on nav. Live regions for async results.
- Reduced motion is honoured, and pages work at 200% zoom with no horizontal scroll at 390px.

## 9. Motion

- **Durations:**
  - `--dur-instant` 0 for focus rings
  - `--dur-fast` 120ms for hover and press
  - `--dur` 200ms for expand/collapse, menu open and toggles
  - `--dur-slow` 280ms for the route change and the detail panel sliding in
- **Easing:** `--ease-out: cubic-bezier(.2,.8,.2,1)` for entrances; `--ease-in: cubic-bezier(.4,0,1,1)` for exits, which run at 0.75× the duration.
- **Entrances:** one orchestrated moment per navigation. The view cross-fades with a 6px rise (View Transitions, already in #19). List items do **not** stagger in; the per-item `.rise` animation is removed.
- **Motion that answers actions** (allowed):
  - The menu or sheet opens from its anchor.
  - A pill changing status cross-fades its colour.
  - A new timeline row highlights `--s2` once and fades back (600ms).
  - The gauge band fills when the simulator rain changes (200ms per band).
- **Hover:** background moves to `--s2`, colour only, with no lift, scale or shadow. Press: scale 0.98 on buttons only.
- **Focus:** an instant ring that never animates.
- **Loading:** skeleton blocks are static, with no shimmer. A busy button keeps its label.
- **Reduced motion:** all transitions and animations are set to 0. The view transition is skipped; state changes happen instantly; the gauge sets without filling. This is already a single block in `motion.css` and stays the only switch.

## 10. Out of scope (until pages are redesigned)

- Page-by-page layouts.
- The persona-key UI (a separate task from PR #20).
- A light theme.
- Devanagari text (if added later, pair Noto Sans Devanagari).
- Any new screen.

## 11. Decisions for the user to confirm

1. **Font change.** Inter (#21) changes to Atkinson Hyperlegible Next, for legibility of IDs and outdoor reading.
2. **Background tint.** Neutral near-black changes to cool night-water `#10171B`.
3. **Stagger.** The per-item list stagger from #19/#21 is removed.
4. **Base.** This builds on PR #21. If #21 is not merged, the plan rebases onto whatever lands.
