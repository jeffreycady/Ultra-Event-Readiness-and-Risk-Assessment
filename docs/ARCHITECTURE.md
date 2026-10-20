# Architecture

How UERA is put together, as of the current `main` branch. Diagrams are Mermaid and render on GitHub. Sections marked **Planned** describe work that is not live.

## Goals
1. **Private.** Nothing the athlete enters is stored or sent. Everything runs in the browser.
2. **Source-grounded.** Every question and learning link comes from one reviewed file, the CSV.
3. **Safe to change.** A bad edit to the questions must fail the build, not reach the live site.
4. **Free to host, easy to maintain.** Static files on GitHub Pages, no server, no database.
5. **Co-brandable.** A licensed coach's name and logo can appear without changing scoring.

## How it's put together
- **One page.** `index.html` holds the markup, styles, application code and the question data. Outside code and assets come from three places: jsPDF (CDN, version pinned with an integrity hash), pdf.js (CDN, version pinned, loaded as a module so it has no integrity hash) and Google Fonts. Shared styling comes from `theme.css` and `theme.js`.
- **Questions are data.** `CATEGORIES` in `index.html` holds ten categories, each with questions, options, remediation steps and learning links. It is generated from `questions-and-learning-links.csv`. Do not edit the generated block by hand.
- **State is in memory.** A single `state` object tracks screen, step, event details, answers and comparison data. Answers are never written to `localStorage` or cookies. The only stored value is the light/dark choice.
- **Scoring.** Each category score is the average of its answered questions, each scaled 0 to 1 by the chosen option's position, times 100. "N/A" answers count as 0 risk and informational-only questions are excluded. The overall score is the mean of the category scores. Tiers: below 34 Low, below 67 Moderate, otherwise High.
- **Theme.** `data-theme` on `<html>` switches CSS variables between light and dark. The choice is saved in `localStorage` (`uera-theme`) on the device and is the only thing the page ever stores. (The earlier statement that nothing is written to `localStorage` applies to answers, not the theme choice.)
- **PDF.** Generated in the browser with jsPDF. A hidden data block (`UERA_DATA_V1`) is embedded on the last page so a later upload can read scores back reliably instead of parsing the rendered text.

## Components

```mermaid
flowchart LR
  subgraph Browser["Athlete's browser"]
    HTML["index.html: UI, state, scoring, PDF"]
    THEME["theme.css + theme.js"]
    PJ["partners/partners.json + logos (same origin)"]
    JSPDF["jsPDF (CDN, integrity pinned)"]
    PDFJS["pdf.js (CDN, version pinned)"]
  end
  FONTS["Google Fonts"]
  FORM["Formspree (feedback form, only on submit)"]
  FW["jcady.org/framework.html (sources)"]
  HTML --> THEME
  HTML -- "fetch, same origin" --> PJ
  HTML --> JSPDF
  HTML -. "compare: reads uploaded PDF" .-> PDFJS
  HTML -.-> FONTS
  HTML -. "user submits feedback" .-> FORM
  HTML -. "links" .-> FW
```

## Build and publish pipeline

```mermaid
flowchart LR
  E["Edit questions-and-learning-links.csv"] --> PR["Push or pull request"]
  PR --> A1["csv_to_json.py: parse and validate"]
  A1 -->|"fails build if malformed"| X1["Stop"]
  A1 --> A2["rebuild_from_csv.js: write data into index.html"]
  A2 --> A3["test_tool.js: scoring, rendering, PDF, partners"]
  A3 -->|"fails build if any check fails"| X2["Stop"]
  A3 --> M{"On main?"}
  M -->|"yes"| C["Commit rebuilt index.html"] --> P["GitHub Pages publishes uera.jcady.org"]
  M -->|"no (pull request)"| V["Check only, nothing committed"]
```

The workflow runs only when the CSV changes. Changes to `index.html` made directly are published as they are, without the rebuild step, so run `test_tool.js` before pushing them.

## Screen states

```mermaid
stateDiagram-v2
  [*] --> hero
  hero --> stepper: Start assessment
  stepper --> stepper: Next / Back
  stepper --> results: All categories answered
  results --> hero: Start over
  results --> compare: Compare with an earlier report
  compare --> results: Back
  results --> PDFexport: Download PDF
  compare --> PDFexport: Download compare PDF
```

## Sequence: taking the assessment

```mermaid
sequenceDiagram
  actor A as Athlete
  participant P as Page (in browser)
  participant R as partners.json
  A->>P: Open uera.jcady.org (optionally ?coach=slug)
  P->>P: Render start page with default branding
  P->>R: fetch partners.json (same origin)
  R-->>P: Partner list
  P->>P: Validate entries, re-render with the coach's branding
  A->>P: Event details, then answers per category
  P->>P: Score in memory
  P-->>A: Results, charts, remediation
  A->>P: Download PDF
  P->>P: Build PDF with jsPDF, embed data block
  P-->>A: PDF saved to the device
  Note over P: No answers are stored or sent
```

## Data model (generated data in index.html)

```mermaid
classDiagram
  class Category { id; name; short; tagline; questions; remediationByEventType }
  class Question { q; opts[]; naIndex?; info? }
  class Remediation { summary; actions[] }
  class Action { text; url }
  class State { screen; step; eventType; phase; isFirstEvent; answers; compare }
  class Coach { slug; name; url; blurb; logo?; isCreator }
  Category "1" --> "*" Question
  Category "1" --> "*" Remediation : per event type
  Remediation "1" --> "*" Action
  State --> Category : answers per category
  State --> Coach : featured coach
```

## Coach partner branding

- **Registry:** `COACH_REGISTRY` in `index.html` holds the built-in coaches. `partners/partners.json` adds more at load time. Built-in entries win over file entries with the same slug.
- **Choosing the coach:** `?coach=slug` first, then a match between the referring site and a coach's website, then the default coach.
- **Safety rules:** slugs match `^[a-z][a-z0-9-]{1,30}$`, websites must be `https`, logo paths must be inside `partners/` and be PNG, SVG, WebP or JPEG, names are capped at 80 characters and messages at 300. A bad entry is skipped, not partially shown. Logos are never loaded from a URL passed in the link.
- **Shown in three places:** start page bar, results coach card, PDF header band. Scoring is unaffected.
- **Adding or removing a partner today:** edit `partners/partners.json` and add the logo, following [partners/README.md](../partners/README.md).

## Planned: self-service partner setup (not live)

A separate Cloudflare Worker that lets a coach set up their own branded link right after buying a license. It would verify the Stripe purchase, validate the text and logo, and publish to `partners/partners.json` through the GitHub API, then remove the entry if the subscription ends. It is built and unit tested with mocked services, but it is **not deployed or tested against live Stripe, GitHub or email**. It would add a second system (the Worker, a KV store and webhooks), which is the only part of UERA that would run on a server.

```mermaid
sequenceDiagram
  actor C as Coach
  participant S as Stripe
  participant J as jcady.org setup page
  participant W as Worker
  participant G as GitHub repo
  C->>S: Buy license
  S-->>C: Redirect with session id
  C->>J: Enter name, website, message, logo
  J->>W: Claim (session id, details)
  W->>S: Verify paid, unused session
  W->>W: Validate text and logo
  W->>G: Commit logo and partners.json
  G-->>C: Pages redeploys, link goes live
  S-->>W: Webhook when subscription ends
  W->>G: Remove entry and logo
```

## Security notes
- Static site, no server, no stored data. Visitors cannot change content.
- Third-party scripts are jsPDF (version pinned, integrity hash) and pdf.js (version pinned, no integrity hash because it loads as a module). Both come from cdnjs. See [SECURITY.md](../SECURITY.md) for reporting.
- User-controlled input that reaches the page (the `coach` query value and the partner list) is validated before use. Uploaded report data is read from a PDF the athlete chooses; its validation has not been separately reviewed. `test_tool.js` covers the partner cases, including a rejected `__proto__` key.
- The feedback form posts to Formspree only when the visitor submits it.

## Limits worth knowing
- The generated question block in `index.html` is large, so diffs on `index.html` are hard to review. Review changes in the CSV.
- Direct edits to `index.html` bypass the CSV rebuild, so the two can drift unless the workflow is rerun.
- Scoring treats all questions equally within a category. Categories are weighted equally in the overall score. That is a design choice, not a research finding.
