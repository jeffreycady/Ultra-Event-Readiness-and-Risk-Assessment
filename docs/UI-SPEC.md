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
| Stepper (`stepper`) | Answer the ten categories | Step indicator, one category's questions per step, single-choice options, "N/A" where a question allows it, learning links |
| Results (`results`) | Show readiness and next steps | Coach card at top (branded links), overall tier, radar chart, skyline chart, per-category tier and remediation, PDF button |
| Compare (`compare`) | Before and after | Upload an earlier PDF, choose the after state (upload or the live session), side-by-side radar and insights, compare PDF |
| Modals | Secondary content | License, learning resources, feedback form |

## Visual language
- Light "paper" theme: `--paper #DEDACB` page, `--paper-2 #F1EEE1` panels, `--ink #232922` text, `--pine #1B2A1F` dark header and footer, `--accent #CB5A28` for actions.
- Risk tiers use green, amber and red, with tier **labels** (Low, Moderate, High) so color is never the only signal. Tier cut points are 34 and 67 on a 0 to 100 scale.
- Type: Big Shoulders Display (headings, uppercase), Source Serif 4 (body), IBM Plex Mono (labels, data, buttons).
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

## Accessibility and quality: known gaps
- The page uses `aria-` attributes in only a few places (6 in `index.html`). Keyboard use, focus order and screen reader behavior of the stepper, radios and modals have **not been audited**.
- There is no dark mode and no `prefers-reduced-motion` handling.
- Color contrast of the muted ink and accent colors on the paper backgrounds has **not been measured**.
- Recommended before the next release: a keyboard-only pass, a screen reader pass, and a contrast check against WCAG AA.

## Ideas shared with the Tribal Knowledge app (not built)
tk.jcady.org has a light/dark toggle that follows the same brand. If UERA adopts it, reuse the same approach: a `data-theme` attribute, CSS variables, a saved choice on the device, and an early script in `<head>` to avoid a flash.
