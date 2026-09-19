#!/usr/bin/env node
/**
 * Rebuilds ultra-event-readiness-check.html from questions-and-learning-links.csv.
 *
 * Usage: node rebuild_from_csv.js <source.html> <parsed.json> <output.html>
 *
 * This MERGES the CSV's content (question text/options/naIndex/info,
 * remediation action text/urls, article/video title+url+source) into the
 * source HTML's existing CATEGORIES/RESOURCES objects. Fields the CSV does
 * NOT capture — category id/name/short/tagline(s), remediation summary
 * lines — are preserved unchanged from the source file. This is
 * deliberate: those are structural/design text, not the kind of thing a
 * contributing coach should be casually editing via spreadsheet.
 */
const fs = require('fs');

const [, , srcPath, jsonPath, outPath] = process.argv;
if (!srcPath || !jsonPath || !outPath) {
  console.error('Usage: node rebuild_from_csv.js <source.html> <parsed.json> <output.html>');
  process.exit(1);
}

const html = fs.readFileSync(srcPath, 'utf8');
const scripts = [...html.matchAll(/<script(?: src="[^"]*")?>([\s\S]*?)<\/script>/g)];
const inlineMatch = scripts.find(m => !m[0].startsWith('<script src') && !m[0].startsWith('<script type'));
if (!inlineMatch) { console.error('Could not find the inline script block.'); process.exit(1); }
const js = inlineMatch[1];

const catStart = js.indexOf('const CATEGORIES');
const catEnd = js.indexOf('];', catStart) + 2;
if (catStart < 0 || catEnd < 2) { console.error('Could not locate CATEGORIES block.'); process.exit(1); }
const CATEGORIES = new Function(js.slice(catStart, catEnd) + '; return CATEGORIES;')();

const resStart = js.indexOf('const RESOURCES');
const resEnd = js.indexOf('};', resStart) + 2;
if (resStart < 0 || resEnd < 2) { console.error('Could not locate RESOURCES block.'); process.exit(1); }
const RESOURCES = new Function(js.slice(resStart, resEnd) + '; return RESOURCES;')();

const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const EXTRA_KEYS = ['firstUltraExtra', 'firstHikeExtra', 'firstMountaineeringExtra', 'firstSkimoExtra'];
const warnings = [];

function requireBucket(catId, variant) {
  const v = parsed[catId] && parsed[catId][variant];
  if (!v) {
    warnings.push(`Missing CSV data for category "${catId}" variant "${variant || '(none)'}" — keeping original content for this slot.`);
    return null;
  }
  return v;
}

CATEGORIES.forEach(cat => {
  const id = cat.id;

  // ---- Questions + remediation actions (base / phase / event-type) ----
  if (cat.questionsByEventType) {
    ['ultra', 'hike', 'mountaineering', 'skimo'].forEach(key => {
      const b = requireBucket(id, key);
      if (!b) return;
      cat.questionsByEventType[key] = b.questions;
      if (cat.remediationByEventType && cat.remediationByEventType[key]) {
        cat.remediationByEventType[key].actions = b.actions;
      }
      if (RESOURCES[id]) {
        RESOURCES[id][key] = { article: b.article, video: b.video };
      }
    });
  } else if (cat.questionsByPhase) {
    ['build', 'taper'].forEach(key => {
      const b = requireBucket(id, key);
      if (!b) return;
      cat.questionsByPhase[key] = b.questions;
      if (cat.remediationByPhase && cat.remediationByPhase[key]) {
        cat.remediationByPhase[key].actions = b.actions;
      }
      if (RESOURCES[id]) {
        RESOURCES[id][key] = { article: b.article, video: b.video };
      }
    });
  } else {
    const b = requireBucket(id, '');
    if (b) {
      cat.questions = b.questions;
      if (cat.remediation) cat.remediation.actions = b.actions;
      if (RESOURCES[id]) RESOURCES[id] = { article: b.article, video: b.video };
    }
  }

  // ---- First-timer extras ----
  EXTRA_KEYS.forEach(key => {
    if (!cat[key]) return;
    const b = requireBucket(id, key);
    if (!b) return;
    cat[key].questions = b.questions;
    cat[key].remediationActions = b.actions;
    cat[key].resources = { article: b.article, video: b.video };
  });
});

if (warnings.length) {
  console.warn('WARNINGS during rebuild:');
  warnings.forEach(w => console.warn(' -', w));
}

// Serialize back to JS source. JSON is a valid subset of JS object/array
// literal syntax, so this round-trips safely; guard against a literal
// "</script>" sequence inside any string value prematurely closing the tag.
function serialize(value) {
  return JSON.stringify(value, null, 2).replace(/<\/script/gi, '<\\/script');
}

const newCategoriesBlock = 'const CATEGORIES = ' + serialize(CATEGORIES) + ';';
const newResourcesBlock = 'const RESOURCES = ' + serialize(RESOURCES) + ';';

const scriptStart = html.indexOf(inlineMatch[0]);
const scriptContentStart = scriptStart + inlineMatch[0].indexOf('>') + 1;
const absCatStart = scriptContentStart + catStart;
const absCatEnd = scriptContentStart + catEnd;
const absResStart = scriptContentStart + resStart;
const absResEnd = scriptContentStart + resEnd;

// Replace RESOURCES first (comes after CATEGORIES in the file), so the
// CATEGORIES offsets computed above stay valid.
let out = html.slice(0, absResStart) + newResourcesBlock + html.slice(absResEnd);
out = out.slice(0, absCatStart) + newCategoriesBlock + out.slice(absCatEnd);

fs.writeFileSync(outPath, out);
console.log(`Rebuilt -> ${outPath} (${warnings.length} warning(s))`);
