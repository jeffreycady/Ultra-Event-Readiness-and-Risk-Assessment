# Partner coaches

Partner coaches with a branded link (`https://uera.jcady.org/?coach=SLUG`) are listed in `partners.json` in this folder. Their logos live next to it. The tool loads this one file when a page opens. The jcady.org home page reads the same file for its partner section, so there is a single list to maintain.

## Adding a coach (manual)
1. Confirm their coach license is current.
2. Save their logo here as `SLUG.png` (or `.svg`, `.webp`, `.jpg`). Lowercase letters, numbers and hyphens only; under 300 KB; at least 400 px wide for raster formats. It is shown on a light tile, so a dark or full-color logo works best.
3. Add an entry to `partners.json`:
   ```json
   {
     "partners": {
       "sarah": {
         "name": "Sarah Smith Coaching",
         "url": "https://sarahsmithcoaching.com",
         "logo": "partners/sarah.png",
         "blurb": "This assessment was shared with you by Sarah Smith, a certified coach. Want help turning these results into an actual plan? Get in touch.",
         "listed": true
       }
     }
   }
   ```
   - `slug` (the key): 2 to 31 characters, lowercase letters, numbers and hyphens, starting with a letter. It can't be `jeff`.
   - `url`: https only.
   - `blurb`: written as a referral from the coach, not a claim that they built the tool. Up to 300 characters.
   - `logo`: optional.
   - `listed`: `true` only if the coach ticked the box to appear on the jcady.org partner section. Branding still works when it is `false` or missing.
4. Run `node test_tool.js index.html theme.css theme.js`. It checks every entry and the logo files.
5. Open `?coach=SLUG` on the start page, the results page and the exported PDF, then send the coach their link.

## Removing a coach
Delete their entry and logo file. Their link then falls back to the default (Jeff Cady) rather than breaking.

## Why this is safe for athletes
- Logos load only from this folder, never from a URL in the link or a third-party host.
- The tool re-checks every field it reads (https URLs, slug format, logo path) and skips anything invalid.
- The file is static and served from the same site, so opening a branded link makes no request to any outside service.
