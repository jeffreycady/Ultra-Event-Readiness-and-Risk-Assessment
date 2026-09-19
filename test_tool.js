#!/usr/bin/env node
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
  let html = rawHtml.replace(/<script type="module">[\s\S]*?<\/script>/, '');
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

async function runPdfSmokeTest(rawHtml) {
  const jsPdfSrc = fs.readFileSync(
    require.resolve('jspdf/dist/jspdf.umd.min.js'), 'utf8'
  );
  let html = rawHtml.replace(
    /<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/jspdf\/[^"]*"><\/script>/,
    ''
  );
  html = html.replace(/<script type="module">[\s\S]*?<\/script>/, '');
  const themeCss = fs.readFileSync(cssPath, 'utf8');
  const themeJs = fs.readFileSync(jsPath, 'utf8');
  html = html.replace('<link rel="stylesheet" href="theme.css">', '<style>' + themeCss + '</style>');
  html = html.replace('<script src="theme.js"></script>', '<script>' + themeJs + '</script>');
  const vc = new VirtualConsole();
  vc.on('jsdomError', () => {});
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc });
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
    const scripts = [...rawHtml.matchAll(/<script(?: src="[^"]*")?>([\s\S]*?)<\/script>/g)];
    const inline = scripts.filter(m => !m[0].startsWith('<script src') && !m[0].startsWith('<script type'));
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
