# Ultra Event Readiness & Risk Assessment (UERA)

A free readiness and risk assessment for ultramarathons, mountaineering, ski mountaineering and long hikes. It walks an athlete through ten checkpoints (terrain, environment, gear, nutrition, training, medical history, safety, logistics, mental readiness and recovery), scores each one, and produces a PDF report with specific next steps and learning links.

**Live tool:** https://uera.jcady.org
**How it's scored, and the sources:** https://www.jcady.org/framework.html
**Built by:** [Jeff Cady](https://jcady.org), UESCA Certified Ultrarunning Coach

## What it does

- Asks questions in ten categories. The questions adapt to the event type (ultra, mountaineering, skimo, hike), whether it is the athlete's first event, and how close the event is (build phase or taper phase).
- Scores each category and gives an overall result as Low, Moderate or High risk.
- Shows a radar chart and a category "skyline", with remediation steps and learning links for the areas that need work.
- Exports a PDF report. A hidden data block in the PDF lets the athlete upload an earlier report later and compare before and after.
- Lets a licensed coach send athletes a branded link (`?coach=slug`) that shows the coach's name and logo on the start page, the results and the PDF. See [partners/README.md](partners/README.md).

## Privacy

Everything runs in the visitor's browser. Answers are not stored and not sent anywhere. The only thing saved on the device is the light/dark choice. The optional feedback form is the only thing that sends data, and only when someone submits it. Partner logos are loaded only from this repo's own `partners/` folder, so a branded link makes no requests to other sites.

## Repo layout

```
index.html                         The whole tool (generated: see "How the tool is built")
questions-and-learning-links.csv   Source of truth for every question, option and learning link
csv_to_json.py                     Parses and validates the CSV
rebuild_from_csv.js                Rebuilds the question data inside index.html
test_tool.js                       Regression suite (scoring, rendering, PDF, partners)
.github/workflows/rebuild-uera.yml Rebuilds, tests and publishes when the CSV changes
theme.css, theme.js                Shared jcady.org design system (see THEME.md)
partners/                          Coach partner list and logos (see partners/README.md)
docs/ARCHITECTURE.md               How it fits together, with UML diagrams
docs/UI-SPEC.md                    One-page UI spec
llms.txt, robots.txt, sitemap.xml  Search and AI discovery files
SECURITY.md                        How to report a vulnerability
LICENSE.md                         License
```

## How the tool is built

The questions live in the CSV, not in the code. Changing a question means editing the CSV and opening a pull request. A GitHub Action parses the CSV, rebuilds the data inside `index.html`, runs the regression suite, and on `main` commits the rebuilt file, which GitHub Pages then publishes. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Run it locally

No build step is needed to use the tool. Serve the folder over http:

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

Opening `index.html` straight from disk works for most things, but partner branding loads `partners/partners.json` and needs a server.

## Checks

```bash
npm install jsdom jspdf@4.2.1 pdf-parse --no-save
python3 csv_to_json.py questions-and-learning-links.csv parsed.json
node rebuild_from_csv.js index.html parsed.json index.html.rebuilt
node test_tool.js index.html.rebuilt theme.css theme.js
```

These are the same steps the GitHub Action runs. Review `test_tool.js` before relying on a single run: it checks scoring and rendering, not whether the underlying research claims are correct.

## Contributing

Suggestions for questions, answers or learning links are welcome. Open an issue, or edit the CSV and open a pull request. Every learning link should point to a page you have read. Please do not invent sources. Questions reflect published guidance and coaching practice, and the research supports the premise of a question, not its exact wording or scoring.

## Not medical advice

UERA is a planning aid. It is not a diagnosis, a guarantee of safety, or a substitute for a medical evaluation or a qualified coach.

## Security

See [SECURITY.md](SECURITY.md).

## License

See [LICENSE.md](LICENSE.md). Coach licensing and the branded-link program are described at https://www.jcady.org/partners.html.
