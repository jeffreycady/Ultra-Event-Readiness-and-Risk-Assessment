# UI spec (one page)

Describes the UI as built in `index.html`, `theme.css` and `theme.js`. Where this page and the code disagree, the code is what ships. Shared tokens and components are documented in [THEME.md](../THEME.md).

## Principles
1. **Guided, one thing at a time.** One category per step, large tap targets, progress always visible.
2. **Private by default.** Nothing entered is stored or sent. The page has no accounts.
3. **Honest scoring.** Scores are shown with tiers and the reasons for them. Informational-only questions never move the score.
4. **Co-branded, not white-label.** Partner branding is added, the tool's own credit stays on every page.

## Screens

| Screen | Purpose | Key elements |
|---|---|---|
| Start (`hero`) | Set up the assessment | Event name, date, event type (ultra, mountaineering, skimo, hike), first-event toggle; partner bar and coach card if a branded link is used |
| Stepper (`stepper`) | Answer the ten categories | Sticky top bar with a live skyline (see below), one category's questions per step, single-choice options, "N/A" where a question allows it, learning links |
| Results (`results`) | Show readiness and next steps | Coach card at top (branded links), overall tier, radar chart, skyline chart, per-category tier and remediation, PDF button |
| Compare (`compare`) | Before and after | Upload an earlier PDF, choose the after state (upload or the live session), side-by-side radar and insights, compare PDF |
| Modals | Secondary content | License, learning resources, feedback form |

## Live skyline in the stepper bar
- One peak per checkpoint in the sticky top bar. When the visitor presses **Next** on a checkpoint, its peak rises in, sized by its risk score and coloured by its tier (green, amber, red). The checkpoint they are on is a dashed outline, and later ones are small grey stubs.
- A running figure on the right shows the average risk of the checkpoints submitted so far, with a count ("Risk so far · 5/10"). It is a running average, not a prediction: the final overall score is the average of all ten.
- A checkpoint's peak appears only after it is submitted, not while it is being answered. Going Back keeps peaks for checkpoints already answered.
- Accessibility: the chart has a text description of scored checkpoints, and moving on announces the score ("Training scored 39, Moderate risk. Checkpoint 6 of 10: ..."). The running figure is hidden from screen readers to avoid repeating it. The peak animation is off when the device asks for reduced motion.

## Visual language
- Default "paper" (light) theme, plus a dark theme (below): `--paper #DEDACB` page, `--paper-2 #F1EEE1` panels, `--ink #232922` text, `--pine #1B2A1F` dark header and footer, `--accent #CB5A28` for actions.
- Risk tiers use green, amber and red, with tier **labels** (Low, Moderate, High) so color is never the only signal. Tier cut points are 34 and 67 on a 0 to 100 scale.
- Type: Big Shoulders Display (headings, uppercase), Source Serif 4 (body), IBM Plex Mono (labels, data, buttons).
- Corners: buttons are pills (fully rounded) and answer boxes have 12px corners, like the Tribal Knowledge app. The start page form (inputs, phase box, event-type and first-event boxes) and the framework callout also use rounded corners (12-14px). Cards and panels on the stepper and results are still square (2px).
- Signature elements: topographic contour texture on dark headers, waypoint ring icon for categories and steps, the JCady cairn mark on the start page and tab icon.

## Layout
- Content container about 820px wide, centered. Panels are bordered cards on `--paper-2`.
- Responsive breakpoints at 640px and 600px: single column, stacked controls.
- A print stylesheet exists for the page. The PDF report is generated separately in code.

## Partner branding
- **Start page:** a "Shared by" bar with the coach's logo, name and link.
- **Results:** a coach card at the top with the coach's logo and message.
- **PDF:** a header band on the first page and a message in the coach section.
- Logos load only from the repo's own `partners/` folder. If a logo is missing the name is shown without one.

## Light and dark theme
- Toggle (moon/sun button, fixed top right, 44px). `data-theme` on `<html>`, saved on the device in `localStorage` key `uera-theme`. First visit follows the device setting (`prefers-color-scheme`), and keeps following it until the visitor chooses.
- An early script in `<head>` (`#theme-init`) applies the theme before first paint. It carries an `id` on purpose so the rebuild tooling does not mistake it for the app script.
- Dark tokens live in `theme.css` under `:root[data-theme="dark"]` and only apply when that attribute is set, so other sites sharing the file are unaffected. The pine start page and results header stay dark in both themes.
- The PDF report is always light, whatever the on-screen theme.

## Accessibility (as of this change)
Built in:
- **Keyboard focus survives redraws.** The page is redrawn after each answer; focus and text selection are put back afterwards.
- **Screen changes:** focus moves to the new heading and a polite live region announces it ("Checkpoint 3 of 10: Gear & Tools").
- **Modals:** `role="dialog"`, `aria-modal`, focus moves in, Tab stays inside, Esc closes, focus returns to the opener.
- **Groups and charts:** answer options and the event-type choice are labelled radio groups; the skyline and radar charts have text descriptions of their values; decorative icons are hidden from assistive technology.
- **Reduced motion:** transitions and smooth scrolling switch off when the device asks for it.
- **Focus ring:** 3px accent outline on every interactive element (already in `theme.css`).

Colour contrast, measured with the WCAG formula on the token values (AA needs 4.5 for small text, 3 for large text and graphics):

| Pair | Before | Now |
|---|---|---|
| Orange text on paper | 2.98 | 4.62 (`--accent-text`) |
| White on orange button | 4.17 | 4.91 (`--accent-btn`) |
| White on amber risk pill | 3.46 | 5.35 (`--mid-strong`) |
| Green text on paper | 4.31 | 4.99 (`--low-ink`) |
| Chart labels on panel | 3.33 | 4.89 (`--chart-label`) |
| Overall score number on the pine header (green / red) | 3.00 / 2.55 | 6.18 / 5.08 (`onDark`) |
| Dark theme body text / secondary text on panels | n/a | 13.15 / 8.00 |

Still open:
- **Not tested with a real screen reader** (VoiceOver, TalkBack, NVDA). Everything above was checked with scripted keyboard tests and by reading the markup.
- **Option card borders:** the border between answer cards uses `--line-soft`, which is below 3:1 against the page in both themes. The radio button and selected-state tint carry the meaning, but the card edge itself is faint.
- **Risk skyline label overlap:** the "Moderate threshold" label can sit on top of a score number when a checkpoint scores near 25.
- Compare screen and PDF upload flow were not re-audited for keyboard use.
- Contrast was measured on tokens, not on every rendered screen.
