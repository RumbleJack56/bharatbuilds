# Deck plan and visual plan

Planned from the idea. Data for each slide is in `PITCH.md` (section numbers given as P5, P7 and so on). A visual marked **[mock]** is drawn for the deck. A visual marked **[shot]** must be a real screenshot once the screen runs.

## 1. Story in four moves

| Move | Slides | The audience should think |
|---|---|---|
| The hazard | 1-3 | "This happens every year and nobody owns it." |
| The turn | 4-5 | "So make it a list with names on it." |
| The proof | 6-11 | "It knows where to act first, and it shows who acted." |
| The effect | 12-14 | "Software cannot clean a drain, but this changes who does." |

One idea per slide. One visual per slide. Headline is a full sentence that states the point.

## 2. Visual system

**Canvas:** 16:9. Margins 6% all sides. 12-column grid. Left 7 columns for the visual, right 5 for text, unless stated.

**Colour**

| Use | Colour | Hex |
|---|---|---|
| Background | Off-white | `#F7F8F6` |
| Text, dark slides | Deep slate | `#12202B` |
| Water, primary accent | Monsoon blue | `#1F6FB2` |
| Capture, reuse | Teal | `#16877A` |
| Level: high | Red-orange | `#D2451E` |
| Level: elevated | Amber | `#E0A106` |
| Level: watch | Grey-blue | `#7C93A6` |
| "No owner found" | Hatched grey | `#9AA3AA` |

Rules from the product that also bind the deck: status is never colour alone (add the word), no green ticks, no star ratings, no water depths.

**Type:** one family (Inter or IBM Plex Sans). Headline 36-40 pt semibold. Body 20-22 pt. Numbers 72-96 pt for the single big figure on a slide. Captions and banners 14 pt.

**Recurring parts**
- **Loop strip** at the bottom of slides 5-11: `Report · Assign · Fix · Confirm · Measure`, with the current step in blue. It tells the audience where they are.
- **Scenario banner** in a thin amber bar on any slide with simulator numbers: "Scenario, not a forecast. Illustrative parameters."
- **Placeholder tag** in a small grey pill on any slide with seed data.
- **Icons:** line icons, 2 px stroke: drain, phone, building (agency), eye (check), droplet, roof.

**Images:** one real street photo of a waterlogged lane for slide 2 (own photo or licensed, credited). All else is diagrams, maps and screens.

## 3. Slide by slide

### Slide 1: Title
```
+--------------------------------------------------+
|                                                  |
|  RAIN-READY                                      |
|  What to clean, who owns it, who did it,         |
|  who checked, did it help.                       |
|                                                  |
|  [thin contour lines pooling at one low point]   |
|  Team · event · pilot ward                       |
+--------------------------------------------------+
```
Dark slate background. Contour-line motif in blue, drawn so the lines sink toward one point. That shape is the low point and returns on slide 6. **[mock]**

### Slide 2: The hazard
**Headline:** "The same lane floods every monsoon."
Full-bleed photo, dark gradient at the bottom, headline over it. One line under: the pilot ward and the cited event (P2, needs citation). No other text.

### Slide 3: Why it stays unsolved
**Headline:** "The water is known. The owner is not."
Three equal columns, each an icon, a 3-word title and one line:

| No owner | No end | No order |
|---|---|---|
| Four agencies, one ward | A complaint goes in, nothing comes out | Every drain looks equally urgent |

Under the columns, a fourth muted line: "And the rain that floods the lane runs off unused." This plants slide 10. **[mock]**

### Slide 4: The turn
**Headline:** "Turn a hazard into a list with names on it."
Centre of the slide, large, the five words as a chain of five blocks:
```
[ Report ] -> [ Assign ] -> [ Fix ] -> [ Confirm ] -> [ Measure ]
 resident      system      agency     other resident   everyone
```
Below, the thesis in one sentence: "Accountability through transparency. Action through insight." This is the only slide with no data.

### Slide 5: The loop
**Headline:** "Four roles, one loop, every step on record."
Left 7 columns: a circle with four nodes (Resident, System, Official, Second resident) and the public dashboard in the middle. Arrows carry the verbs. A side branch from Official: "Not ours" bouncing to another agency.
Right 5 columns: the task states as a vertical timeline, `open · accepted · done · confirmed`. **[mock]** Loop strip starts here.

### Slide 6: The insight core
**Headline:** "Water goes to the low points. So does the plan."
Left 7 columns: ward map with five pockets as soft blobs, coloured and labelled by level, drains as lines, spill arrows between pockets. **[shot]** of the map screen, or **[mock]** until it runs.
Right 5 columns: three inputs feeding one output, as a small funnel: rain, drain condition (time since last confirmed clean), pocket shape, giving "time to fill".
Scenario banner. Placeholder tag. Data: P5.

### Slide 7: Now against cleaned
**Headline:** "A cleaned drain buys hours."
One chart, full width: horizontal paired bars, one pair per pocket, "as they are now" in red-orange and "all cleaned" in blue, axis in hours. Five pairs. Annotate the largest gap.
```
Library lane    ██ 23 min
                ████████ 1 h 35
Lane 2          ███ 34 min
                █████████████████ 3 h 20
...
```
Big figure at right: "about 45 min -> about 4 h" for the main saucer. Scenario banner. Data: P5 first table.

### Slide 8: The ranked plan
**Headline:** "Not every drain matters. Start with the one that does."
Left: ranked list of five rows, each with rank, drain name, owner chip and a gain bar. Row 5's owner chip is hatched grey: "No owner found".
Right: the formula in words, large: "fill time gained x how often people report it".
Speaker line: five of eight drains matter here, and one of the five has no owner. Data: P5 second table.

### Slide 9: The accountability chart
**Headline:** "Everyone can see who has what, and for how long."
Full-width table styled as a chart. Rows: MCD, PWD, I&FC, DJB, **No owner found**. Columns: drains owned, open, accepted, done, confirmed, overdue, bounced away, median hours to accept. Stacked status bar per row in place of raw counts. The "No owner found" row is hatched and sits last, visually heavier than the rest.
Footer: "Agency level only. No officer is named." **[shot]** after one full demo run (P6).

### Slide 10: Water as a resource
**Headline:** "The same rain can be kept."
Left: cross-section drawing, roof to downpipe to three possible ends: tank (store), basin (detain), pit (recharge), with the water table drawn as a dashed line at different depths.
Right: decision ladder by water-table depth (P7 first table) as five stacked bands, teal.
Bottom strip: one figure, "one 600 m2 roof: about 336,000 litres a year". Experimental banner. **[mock]**

### Slide 11: Trust
**Headline:** "A report is a photo with a place, a time and a witness."
Left: a phone frame holding a photo with the stamp block bottom-left (Lat, Long, time, Ref). **[mock]** until the camera is built.
Right: three checks as a short list with icons: taken live in the app; place and time checked against the report; a different resident confirms.
Small line: "Doubtful reports are held for review, not deleted."

### Slide 12: The product
**Headline:** "One app for residents and officials. One dashboard for everyone."
Three device frames in a row: phone (report), phone (official inbox), laptop (dashboard). Short caption under each. **[shot]** x3.
Thin architecture line under them: `Phone or browser -> one server on AWS EC2 -> S3 photos, Bedrock category`.

### Slide 13: What software can change
**Headline:** "Software does not clean a drain. It changes who does."
Two-column table, left "What the system does", right "What it can change" (P10 second table), five rows, an arrow between the columns.
Bottom, in grey, small: "We do not claim floods prevented, lives saved or water-table rise."

### Slide 14: Where it stands, what is next
**Headline:** "One ward today. The method fits any ward."
Left: three-step horizontal roadmap: pilot ward with real drain data; reports and insights per agency; more wards.
Right: honest status in three chips: built, in progress, next (P11).
Close with the one line from slide 1 and the live URL and repo.

## 4. Cut list

| Length | Keep |
|---|---|
| 3-minute video | 2, 4, 7, 8, 9, 12 as stills between the live demo |
| 5-minute pitch | 1, 2, 3, 4, 5, 7, 8, 9, 10, 13 |
| Full | all 14 |

Never cut slides 4, 8 and 9. They are the idea.

## 5. Assets to make

| Asset | For slide | Type |
|---|---|---|
| Contour motif | 1, section breaks | Vector |
| Street photo, credited | 2 | Photo |
| Loop diagram | 5 | Vector |
| Ward map with pockets | 6 | Screenshot or vector |
| Paired bar chart | 7 | Chart from P5 |
| Ranked list | 8 | Chart from P5 |
| Accountability table | 9 | Screenshot |
| Roof cross-section | 10 | Vector |
| Stamped photo in phone frame | 11 | Mock |
| Three device shots | 12 | Screenshots |
