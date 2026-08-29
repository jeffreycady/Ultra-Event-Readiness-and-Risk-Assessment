# Theme Reference

Shared design system for jcady.org and its subdomains (currently the
coaching site and the Ultra Event Readiness & Risk Assessment tool at
uera.jcady.org). Use this as the starting point for any new page.

## Starting a new page

1. Copy `theme.css` and `theme.js` into the new page's repo, next to its
   `index.html`.
2. In `<head>`, add the same Google Fonts `<link>` every page uses (copy it
   from any existing page — Big Shoulders Display, Source Serif 4, IBM Plex
   Mono), then:
   ```html
   <link rel="stylesheet" href="theme.css">
   <script src="theme.js"></script>
   ```
3. Write page-specific CSS in the page's own `<style>` block, placed
   *after* the theme.css link so it can override anything that needs to
   differ.
4. Build the page out of the classes below. Anything genuinely new and
   reusable belongs in theme.css/theme.js — anything one-off belongs in
   the page's own `<style>`.

Each page keeps its own copy of theme.css/theme.js (no shared hosting
between domains). If you update the theme, copy the updated files into
every repo that uses them.

## Design tokens (CSS custom properties)

| Token | Value | Use |
|---|---|---|
| `--paper` | `#DEDACB` | Default page background |
| `--paper-2` | `#F1EEE1` | Card/panel background |
| `--ink` | `#232922` | Primary text |
| `--ink-soft` | `#565f4e` | Secondary text |
| `--pine` | `#1B2A1F` | Dark header/footer background |
| `--pine-2` | `#25372A` | Slightly lighter dark panel |
| `--line` / `--line-soft` | `#A79C82` / `#c9c0a7` | Borders |
| `--accent` | `#CB5A28` | Trail-blaze orange — CTAs, links, highlights |
| `--cream` | `#F7F2E7` | Light text on dark backgrounds |
| `--dim` | `#c8b190` | Muted light text on dark backgrounds (eyebrows, captions) |
| `--low` / `--mid` / `--high` | green / amber / red | Only for tools that score or rate something |

## Typography

- **Big Shoulders Display** (headings, `.display`) — bold, uppercase, condensed
- **Source Serif 4** (body text) — the default `body` font
- **IBM Plex Mono** (`.mono`, labels, data, buttons) — technical/data feel

## Components in theme.css

- `.wrap` — max-width content container (820px)
- `.hero` — dark pine header with the topo contour texture; override
  `.hero{padding}` and `.hero h1{font-size}` per page
- `.eyebrow` — small label above a heading, with a leading dash
- `.btn` / `.btn.ghost` / `.btn.small` — buttons; ghost automatically
  flips to light-on-dark inside `.hero`
- `section`, `.section-title`, `.section-sub` — generic content sections
- `.pill-row` — row of small rounded label chips
- `.card` — bordered panel on `--paper-2`
- `footer.site-footer-full` — full dark marketing footer (name, blurb,
  contact); pair with `.footer-bottom` for the copyright line

## Functions in theme.js

- Runs automatically: sets `--contour-pattern`, the topo-line texture
  used by `.hero::before`.
- `waypointIcon(color, size)` — returns an SVG string for the concentric-
  ring waypoint mark. Default size 34px. Inject with
  `el.innerHTML = waypointIcon('#CB5A28', 44)`.

## Signature elements worth reusing

- The waypoint ring icon (colored concentric circles) — used for category
  markers and process steps. Any "these are the steps" or "these are the
  checkpoints" layout is a good fit.
- The topo contour texture on dark hero/header sections.
- Risk-tier coloring (green/amber/red) for anything that scores or
  flags — only pull this in if the page actually rates something.
