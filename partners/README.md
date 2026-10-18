# Partner coach logos

Logos for coaches with a branded link (`https://uera.jcady.org/?coach=SLUG`) live in this folder.

## Adding a coach (checklist)
1. Confirm their coach license is current.
2. Save their logo here as `SLUG.png` (or `.svg`, `.webp`, `.jpg`). Lowercase letters, numbers and hyphens only; under 300 KB; at least 400 px wide for raster formats. It is shown on a light tile, so a dark or full-color logo works best.
3. In `index.html`, add an entry to `COACH_REGISTRY` (see the commented example above it):
   `isCreator:false`, `name`, `url` (https only), `logo:'partners/SLUG.png'`, and a `blurb` written as a referral from the coach, not an authorship claim.
4. Run `node test_tool.js index.html theme.css theme.js`. It checks the slug, the https URL, the blurb, and that the logo file exists and is under 300 KB.
5. Open `?coach=SLUG` on the start page, the results page and the exported PDF, then send the coach their link to approve.

## Removing a coach
Delete their registry entry and logo file. Their link then falls back to the default (Jeff Cady) rather than breaking.

## Why logos are local
The tool only loads logos from this folder, never from a URL in the link or a third-party host. That keeps the privacy promise (no outside requests when a link is opened) and means a shared link cannot pull in someone else's image.
