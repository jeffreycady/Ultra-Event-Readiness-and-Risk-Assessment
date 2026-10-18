#!/usr/bin/env node
function plainScripts(src) {
  // Plain <script> blocks (no attributes), found with string search rather than a regex.
  const out = [];
  let pos = 0;
  for (;;) {
    const open = src.indexOf('<script>', pos);
    if (open === -1) break;
    const bodyStart = open + '<script>'.length;
    const closeStart = src.toLowerCase().indexOf('</script', bodyStart);
    if (closeStart === -1) break;
    const closeEnd = src.indexOf('>', closeStart) + 1;
    out.push([src.slice(open, closeEnd), src.slice(bodyStart, closeStart)]);
    pos = closeEnd;
  }
  return out;
}
/**
 * test_tool.js — automated regression suite for ultra-event-readiness-check.html
 *
 * Usage: node test_tool.js <path-to-index.html> <path-to-theme.css> <path-to-theme.js>
 * Exits 0 if everything passes, 1 otherwise (with details on what failed).
 *
 * This packages the tests that were run by hand throughout this project's
 * development into one reusable script, so CI can run the same checks
 * automatically before any rebuilt tool is committed.
 *
 * Requires: jsdom, jspdf, pdf-parse (npm install jsdom jspdf@4.2.1 pdf-parse)
 */
const fs = require('fs');
const path = require('path');

const [, , htmlPath, cssPath, jsPath] = process.argv;
if (!htmlPath || !cssPath || !jsPath) {
  console.error('Usage: node test_tool.js <index.html> <theme.css> <theme.js>');
  process.exit(1);
}

const { JSDOM, VirtualConsole } = require('jsdom');

let failures = [];
function check(label, condition) {
  if (condition) {
    console.log('  \u2713', label);
  } else {
    console.log('  \u2717', label, '  <-- FAILED');
    failures.push(label);
  }
}

function loadDom(rawHtml) {
  let html = rawHtml.replace(/<script type="module">[\s\S]*?<\/script\b[^>]*>/, '');
  const themeCss = fs.readFileSync(cssPath, 'utf8');
  const themeJs = fs.readFileSync(jsPath, 'utf8');
  html = html.replace('<link rel="stylesheet" href="theme.css">', '<style>' + themeCss + '</style>');
  html = html.replace('<script src="theme.js"></script>', '<script>' + themeJs + '</script>');
  const vc = new VirtualConsole();
  const jsErrors = [];
  vc.on('jsdomError', e => {
    if (!String(e.message).includes('Not implemented')) jsErrors.push(e.message);
  });
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc });
  return { dom, jsErrors };
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runBoundary(rawHtml, radioValue, checkBox, strategy) {
  const { dom, jsErrors } = loadDom(rawHtml);
  const win = dom.window, doc = win.document;
  await wait(150);
  if (radioValue !== 'ultra') {
    const radio = doc.querySelector(`input[name=eventType][value=${radioValue}]`);
    radio.checked = true;
    radio.dispatchEvent(new win.Event('change', { bubbles: true }));
    await wait(20);
  }
  if (checkBox) {
    const box = doc.getElementById('firstEventToggle');
    box.checked = true;
    box.dispatchEvent(new win.Event('change', { bubbles: true }));
    await wait(20);
  }
  doc.getElementById('startBtn').click();
  await wait(20);
  for (let step = 0; step < 10; step++) {
    const opts = doc.querySelectorAll('.opt input[type=radio]');
    if (strategy === 'best') {
      const seen = new Set();
      opts.forEach(inp => {
        if (inp.value === '0' && !seen.has(inp.name)) {
          inp.checked = true;
          inp.dispatchEvent(new win.Event('change', { bubbles: true }));
          seen.add(inp.name);
        }
      });
    } else {
      const byName = {};
      opts.forEach(inp => { (byName[inp.name] = byName[inp.name] || []).push(inp); });
      Object.values(byName).forEach(group => {
        const lastLabel = group[group.length - 1].closest('.opt').textContent;
        const isNA = lastLabel.includes('Not applicable');
        const target = isNA ? group[group.length - 2] : group[group.length - 1];
        target.checked = true;
        target.dispatchEvent(new win.Event('change', { bubbles: true }));
      });
    }
    await wait(6);
    doc.getElementById('nextBtn').click();
    await wait(6);
  }
  const score = win.eval('overallScore()');
  const expected = strategy === 'best' ? 0 : 100;
  return { score, expected, jsErrors };
}

async function runPdfSmokeTest(rawHtml, url, inspect) {
  const jsPdfSrc = fs.readFileSync(
    require.resolve('jspdf/dist/jspdf.umd.min.js'), 'utf8'
  );
  let html = rawHtml.replace(
    /<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/jspdf\/[^"]*"><\/script\b[^>]*>/,
    ''
  );
  html = html.replace(/<script type="module">[\s\S]*?<\/script\b[^>]*>/, '');
  const themeCss = fs.readFileSync(cssPath, 'utf8');
  const themeJs = fs.readFileSync(jsPath, 'utf8');
  html = html.replace('<link rel="stylesheet" href="theme.css">', '<style>' + themeCss + '</style>');
  html = html.replace('<script src="theme.js"></script>', '<script>' + themeJs + '</script>');
  const vc = new VirtualConsole();
  vc.on('jsdomError', () => {});
  const dom = new JSDOM(html, Object.assign({ runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc }, url ? { url } : {}));
  const win = dom.window, doc = win.document;
  win.eval(jsPdfSrc);
  let capturedBlob = null;
  win.URL.createObjectURL = b => { capturedBlob = b; return 'blob:mock'; };
  win.URL.revokeObjectURL = () => {};
  await wait(150);
  doc.getElementById('startBtn').click();
  await wait(20);
  for (let step = 0; step < 10; step++) {
    const opts = doc.querySelectorAll('.opt input[type=radio]');
    const seen = new Set();
    opts.forEach(inp => {
      if (inp.value === '0' && !seen.has(inp.name)) {
        inp.checked = true;
        inp.dispatchEvent(new win.Event('change', { bubbles: true }));
        seen.add(inp.name);
      }
    });
    await wait(6);
    doc.getElementById('nextBtn').click();
    await wait(6);
  }
  if (inspect) inspect(doc);
  doc.getElementById('exportPdfBtn').click();
  await wait(90);
  if (!capturedBlob) return false;
  const buf = Buffer.from(await capturedBlob.arrayBuffer());
  return buf.slice(0, 5).toString() === '%PDF-' && buf.length > 1000;
}

async function main() {
  const rawHtml = fs.readFileSync(htmlPath, 'utf8');

  console.log('Syntax check:');
  try {
    const inline = plainScripts(rawHtml);
    new Function(inline[inline.length - 1][1]);
    check('Inline script parses as valid JavaScript', true);
  } catch (e) {
    check('Inline script parses as valid JavaScript (' + e.message + ')', false);
    // No point continuing if the file doesn't even parse.
    printSummaryAndExit();
    return;
  }

  console.log('Scoring boundaries (all four event types, best and worst case):');
  const combos = [
    ['ultra', false, 'best'], ['ultra', false, 'worst'],
    ['mountaineering', true, 'best'], ['mountaineering', true, 'worst'],
    ['skimo', true, 'best'], ['skimo', true, 'worst'],
    ['hike', true, 'best'], ['hike', true, 'worst'],
  ];
  for (const [eventType, checkBox, strategy] of combos) {
    const { score, expected, jsErrors } = await runBoundary(rawHtml, eventType, checkBox, strategy);
    const label = `${eventType}${checkBox ? '+firstEvent' : ''} ${strategy}-case = ${score} (expected ${expected})`;
    check(label, score === expected);
    if (jsErrors.length) {
      check(`${eventType} ${strategy}-case: no JS errors (found: ${jsErrors.join('; ')})`, false);
    }
  }

  console.log('PDF export smoke test:');
  try {
    const ok = await runPdfSmokeTest(rawHtml);
    check('PDF export produces a valid, non-trivial PDF', ok);
  } catch (e) {
    check('PDF export produces a valid, non-trivial PDF (threw: ' + e.message + ')', false);
  }

  console.log('Coach registry and partner branding:');
  try {
    const { dom: rd } = loadDom(rawHtml);
    await wait(100);
    const reg = rd.window.eval('JSON.stringify(COACH_REGISTRY)');
    const defSlug = rd.window.eval('DEFAULT_COACH_SLUG');
    const registry = JSON.parse(reg);
    check('Default coach exists in the registry', !!registry[defSlug]);
    let regOk = true; const regProblems = [];
    for (const [slug, c] of Object.entries(registry)) {
      if (!/^[a-z][a-z0-9-]{1,30}$/.test(slug)) { regOk = false; regProblems.push(slug + ': bad slug'); }
      if (!c.name || !/^https:\/\//.test(c.url || '')) { regOk = false; regProblems.push(slug + ': needs name and https url'); }
      if (!c.blurb) { regOk = false; regProblems.push(slug + ': needs blurb'); }
      if (c.logo) {
        if (!/^partners\/[a-z0-9-]+\.(png|svg|webp|jpe?g)$/.test(c.logo)) { regOk = false; regProblems.push(slug + ': logo must be partners/<name>.<png|svg|webp|jpg>'); }
        else if (!fs.existsSync(path.join(path.dirname(htmlPath), c.logo))) { regOk = false; regProblems.push(slug + ': logo file missing: ' + c.logo); }
        else if (fs.statSync(path.join(path.dirname(htmlPath), c.logo)).size > 300 * 1024) { regOk = false; regProblems.push(slug + ': logo over 300 KB'); }
      }
    }
    if (regProblems.length) console.log('    ' + regProblems.join('\n    '));
    check('Every registry entry is valid (slug, https url, blurb, logo file present and under 300 KB)', regOk);
    const noProto = ['constructor', '__proto__', 'toString'].every(sl => {
      const { dom: d2 } = loadDom(rawHtml);
      return d2.window.eval(`hasCoach(${JSON.stringify(sl)})`) === false;
    });
    check('Prototype names such as "constructor" are not treated as partners', noProto);

    const withPartner = rawHtml
      .replace("  // Example of a licensed coach", "  testpartner:{isCreator:false,name:'Test <b>Coach</b>',url:'https://example.com',logo:'https://evil.example/x.png',blurb:'Shared by a test coach.'},\n  // Example of a licensed coach")
      .replace("let's talk.\"\n  }\n", "let's talk.\"\n  },\n");
    check('Test partner injected for the partner checks', withPartner.includes('testpartner:'));
    let seenHero = false, seenResults = false;
    const ok = await runPdfSmokeTest(withPartner, 'https://uera.jcady.org/?coach=testpartner', doc => {
      const card = doc.querySelector('.coach-top');
      seenResults = !!card && card.textContent.includes('Shared by a test coach.') && !doc.querySelector('.coach-top img');
    });
    check('Results page shows the partner card at the top; an outside logo URL is ignored', seenResults);
    check('PDF still builds with a partner coach (header band, no logo file)', ok);
    const { dom: hd } = loadDom(withPartner);
    await wait(100);
    const hdoc = hd.window.document;
    // load hero with the partner via a fresh DOM that has the query string
    const vc2 = new VirtualConsole(); vc2.on('jsdomError', () => {});
    let h2 = withPartner.replace(/<script type="module">[\s\S]*?<\/script\b[^>]*>/, '')
      .replace('<link rel="stylesheet" href="theme.css">', '<style>' + fs.readFileSync(cssPath, 'utf8') + '</style>')
      .replace('<script src="theme.js"></script>', '<script>' + fs.readFileSync(jsPath, 'utf8') + '</script>');
    const d3 = new JSDOM(h2, { url: 'https://uera.jcady.org/?coach=testpartner', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc2 });
    await wait(150);
    const bar = d3.window.document.querySelector('.partner-bar');
    seenHero = !!bar && bar.textContent.includes('Shared by Test <b>Coach</b>') && !bar.querySelector('b') && !!bar.querySelector('a[href*="partners.html"]');
    check('Start page shows "Shared by <partner>" with the name escaped and a Coach? link', seenHero);
    const bar0 = hdoc.querySelector('.partner-bar');
    check('Default start page shows the creator line and the Coach? link', !!bar0 && bar0.textContent.includes('Built by') && !!bar0.querySelector('a[href*="partners.html"]'));

    // partners/partners.json: the shared partner list, validated from disk
    const pjPath = path.join(path.dirname(htmlPath), 'partners', 'partners.json');
    let pjOk = true; const pjProblems = [];
    if (!fs.existsSync(pjPath)) { pjOk = false; pjProblems.push('partners/partners.json is missing'); }
    else {
      let pj = null;
      try { pj = JSON.parse(fs.readFileSync(pjPath, 'utf8')); } catch (e) { pjOk = false; pjProblems.push('invalid JSON: ' + e.message); }
      if (pj) {
        if (!pj.partners || typeof pj.partners !== 'object') { pjOk = false; pjProblems.push('needs a "partners" object'); }
        else for (const [slug, c] of Object.entries(pj.partners)) {
          if (!/^[a-z][a-z0-9-]{1,30}$/.test(slug)) { pjOk = false; pjProblems.push(slug + ': bad slug'); }
          if (slug === defSlug) { pjOk = false; pjProblems.push(slug + ': cannot reuse the default coach slug'); }
          if (!c.name || !/^https:\/\//.test(c.url || '') || !c.blurb) { pjOk = false; pjProblems.push(slug + ': needs name, https url and blurb'); }
          if (c.logo) {
            if (!/^partners\/[a-z0-9-]+\.(png|svg|webp|jpe?g)$/.test(c.logo)) { pjOk = false; pjProblems.push(slug + ': bad logo path'); }
            else if (!fs.existsSync(path.join(path.dirname(htmlPath), c.logo))) { pjOk = false; pjProblems.push(slug + ': logo file missing'); }
            else if (fs.statSync(path.join(path.dirname(htmlPath), c.logo)).size > 300 * 1024) { pjOk = false; pjProblems.push(slug + ': logo over 300 KB'); }
          }
          if (c.listed !== undefined && typeof c.listed !== 'boolean') { pjOk = false; pjProblems.push(slug + ': listed must be true or false'); }
        }
      }
    }
    if (pjProblems.length) console.log('    ' + pjProblems.join('\n    '));
    check('partners/partners.json is valid (slugs, https urls, blurbs, logo files)', pjOk);

    // Runtime loading of the partner list (fetch stubbed): good entry applied, bad ones skipped
    const fixture = JSON.parse('{"partners":{"__proto__":{"name":"Proto","url":"https://proto.example","blurb":"x"}}}');
    Object.assign(fixture.partners, {
      good: { name: 'Good Coach', url: 'https://good.example', blurb: 'Hello from Good Coach.' },
      plainhttp: { name: 'Plain', url: 'http://plain.example', blurb: 'x' },
      evillogo: { name: 'Evil Logo', url: 'https://evil.example', blurb: 'x', logo: 'https://evil.example/a.png' }
    });
    async function loadWith(query) {
      const vc3 = new VirtualConsole(); vc3.on('jsdomError', () => {});
      const h3 = rawHtml.replace(/<script type="module">[\s\S]*?<\/script\b[^>]*>/, '')
        .replace('<link rel="stylesheet" href="theme.css">', '<style>' + fs.readFileSync(cssPath, 'utf8') + '</style>')
        .replace('<script src="theme.js"></script>', '<script>' + fs.readFileSync(jsPath, 'utf8') + '</script>');
      const d = new JSDOM(h3, { url: 'https://uera.jcady.org/' + query, runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc3,
        beforeParse(w) { w.fetch = async () => ({ ok: true, json: async () => fixture }); } });
      await wait(250);
      return d;
    }
    const dGood = await loadWith('?coach=good');
    const barGood = dGood.window.document.querySelector('.partner-bar');
    check('Partner list is loaded at start-up and the partner is shown on the start page', !!barGood && barGood.textContent.includes('Shared by Good Coach'));
    const dBad = await loadWith('?coach=plainhttp');
    check('Entries with a non-https URL are ignored (falls back to the default coach)', dBad.window.document.querySelector('.partner-bar').textContent.includes('Built by'));
    const dEvil = await loadWith('?coach=evillogo');
    const eb = dEvil.window.document.querySelector('.partner-bar');
    check('A partner with an outside logo URL still loads, but without the logo', eb.textContent.includes('Shared by Evil Logo') && !eb.querySelector('img'));
    const dProto = await loadWith('?coach=__proto__');
    check('A "__proto__" key in the partner list is rejected', dProto.window.document.querySelector('.partner-bar').textContent.includes('Built by'));
  } catch (e) {
    check('Partner branding checks (threw: ' + e.message + ')', false);
  }

  printSummaryAndExit();
}

function printSummaryAndExit() {
  console.log();
  if (failures.length === 0) {
    console.log('ALL CHECKS PASSED');
    process.exit(0);
  } else {
    console.log(`${failures.length} CHECK(S) FAILED:`);
    failures.forEach(f => console.log('  -', f));
    process.exit(1);
  }
}

main().catch(e => {
  console.error('TEST RUNNER CRASHED:', e.stack);
  process.exit(1);
});
