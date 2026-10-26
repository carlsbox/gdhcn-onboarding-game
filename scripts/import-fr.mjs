#!/usr/bin/env node
/**
 * Import the reviewed French transcripts into the game.
 *
 *   node scripts/import-fr.mjs [--dir <transcript folder>] [--report <report.json>] [extra-transcript.md ...]
 *
 * Reads, from the folder:
 *   transcript-fr-site-ui-and-demo.md   UI, demo, use-case pages  (keys `file:identifier`, e.g. `ui.ts:title.lede`)
 *   transcript-fr-game-scenario.md      scenario text             (keys `soi.brief`, `phases.A`, `soi.choices.email.text`)
 *   transcript-fr-delta-*.md            optional delta translations, same table shape; their rows override
 * and writes
 *   src/i18n/fr.ts            UI strings, flat key -> string
 *   src/i18n/scenario.fr.ts   scenario overlay, transcript path -> string
 *   <folder>/_i18n-import-report.json
 *
 * Staleness rule: a row is imported only when its English column equals the CURRENT English string in the
 * code at that key (after stripping review marks `==`, markup, quotes and whitespace differences).
 * Otherwise it is listed as stale and not imported; keys that no longer exist are listed as removed;
 * current keys with no row are listed as missing. The script is idempotent: re-run it after a delta lands.
 *
 * No dependencies beyond esbuild, which Vite already installs.
 */
import { build } from 'esbuild';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const DIR = resolve(opt('--dir') ?? 'french-localisation');
const REPORT = resolve(opt('--report') ?? join(DIR, '_i18n-import-report.json'));
const EXTRA = args.filter(a => a.endsWith('.md')).map(a => resolve(a));

// ---------- current English, from the code ----------

async function loadCurrent() {
  const tmp = mkdtempSync(join(tmpdir(), 'gdhcn-i18n-'));
  const entry = join(tmp, 'entry.ts');
  const src = p => JSON.stringify(join(ROOT, p));
  writeFileSync(entry, `
    export { en } from ${src('src/i18n/en.ts')};
    export { MOMENTS, PHASES, ROLES } from ${src('src/game/scenario.ts')};
    export { stripTips, GLOSSARY, GLOSSARY_FR } from ${src('src/game/glossary.ts')};
    export { parsePath, getIn } from ${src('src/i18n/path.ts')};
  `);
  const out = join(tmp, 'bundle.mjs');
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'silent', absWorkingDir: ROOT,
    define: { 'import.meta.env': '{}' } });
  return import(pathToFileURL(out).href);
}

// ---------- transcript parsing ----------

function splitRow(line) {
  const cells = [];
  let cur = '';
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '\\' && line[i + 1] === '|') { cur += '\\|'; i++; } else if (line[i] === '|') { cells.push(cur); cur = ''; } else cur += line[i];
  }
  cells.push(cur);
  return cells.slice(1, -1).map(c => c.trim());
}

const clean = c => c.replace(/\\\|/g, '|').replace(/(?<!=)==(?!=)/g, '').trim();

/** Rows `| `key`[, `key`] | English | Français | ... |` from every table in a markdown file. */
function parseTranscript(file) {
  const rows = [];
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = splitRow(line);
    if (cells.length < 3 || !cells[0].includes('`')) continue;
    const keys = [...cells[0].matchAll(/`([^`]+)`/g)].map(m => m[1]);
    rows.push({ keys, en: clean(cells[1]), fr: clean(cells[2]), file });
  }
  return rows;
}

// ---------- normalisation and comparison ----------

const QUOTES = s => s.replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/ | /g, ' ');
const ws = s => s.replace(/\s+/g, ' ').trim();

/** Scan `${...}` expressions with balanced braces and quotes. Returns [{start,end,expr}]. */
function exprs(s) {
  const out = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '$' && s[i + 1] === '{') {
      let depth = 0, q = null, j = i + 1;
      for (; j < s.length; j++) {
        const c = s[j];
        if (q) { if (c === '\\') j++; else if (c === q) q = null; continue; }
        if (c === "'" || c === '"' || c === '`') q = c;
        else if (c === '{') depth++;
        else if (c === '}') { depth--; if (depth === 0) break; }
      }
      // the French review adds non-breaking spaces before ? and : even inside code, so compare expressions with plain spaces
      out.push({ start: i, end: j + 1, expr: s.slice(i + 2, j).replace(/[\u00A0\u202F]/g, ' ') });
      i = j;
    }
  }
  return out;
}

const TOKEN = /\{(\w+)(?::[^|}]*\|[^}]*)?\}/g;
const MARK = '\u0001';

/** Current English for comparison: tooltip markup and HTML tags removed. */
const plainCurrent = (stripTips, s) => stripTips(s).replace(/<[^>]+>/g, '');

/** Template-aware comparison key for a UI row (transcript `${expr}` and code `{name}` both become a mark). */
function uiKeyTranscript(en) {
  let s = en, out = '', last = 0;
  for (const e of exprs(s)) { out += s.slice(last, e.start) + MARK; last = e.end; }
  return ws(QUOTES(out + s.slice(last)));
}
const uiKeyCurrent = (stripTips, en) => ws(QUOTES(plainCurrent(stripTips, en).replace(TOKEN, MARK)));
const plainKey = s => ws(QUOTES(s));

// ---------- markup re-insertion for French ----------

const FR_ANCHORS = {
  github: ['GitHub'], upload: ['certificat de téléversement'], uat: ['UAT'], prod: ['PROD'], dev: ['DEV'],
  top: ['TOP2 et TOP3', 'conditions de participation (TOP)', 'conditions de participation', 'TOP0 à TOP4'],
  tngbot: ["le robot de l'OMS", "robot de l'OMS", "bot de l'OMS", 'tng-bot'],
  tls: ['certificat client TLS', 'certificat TLS'],
  sca: ['autorité de certification de signature (SCA)', 'AC de signature (SCA)', 'SCA'],
  repo: ['dépôts GitHub privés', 'dépôts privés', 'dépôt privé'],
  gpg: ['clé GPG', 'GPG'],
  gateway: ['passerelle en ligne', 'passerelle'],
  dsc: ['certificats de signataire de documents (DSC)', 'certificats de signataire de documents', 'DSC'],
  anchor: ['ancre de confiance'],
};

/** Table cells are trimmed, so give the French the same leading and trailing spaces as the English (list joiners, indented terminal lines). */
const edgeSpace = (en, fr) => (/^\s*/.exec(en)[0] + fr + (/\s*$/.exec(en)[0]));

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '[ \u00A0\u202F]');
/** French equivalents of inline-tag text that is not a literal copy (keyboard key, parenthesised hint). */
const TAG_ANCHORS = { Shift: ['Maj'], '{country} is live': ['{country} est en service'], '(touch: two-finger drag)': ['(tactile : glisser à deux doigts)'] };

/** Position of the first match of `needle` (case-insensitive) that is not inside existing markup, or -1. */
function findFree(text, needle) {
  const re = new RegExp(esc(needle), 'gi');
  for (let m; (m = re.exec(text));) {
    const before = text.slice(0, m.index);
    const inTip = before.lastIndexOf('[[') > before.lastIndexOf(']]');
    const inTag = before.lastIndexOf('<') > before.lastIndexOf('>');
    const inWrapped = /<(\w+)[^>]*>[^<]*$/.test(before) && !/<\/\w+>[^<]*$/.test(before);
    if (!inTip && !inTag && !inWrapped) return { index: m.index, text: m[0] };
  }
  return null;
}

/**
 * The transcripts carry plain text. Where the current English string has glossary tips `[[key|text]]` or
 * inline tags such as <kbd>, wrap the French equivalent when it can be found. Returns the French text and
 * the spans that could not be placed (reported, the tooltip or tag is simply absent in French).
 */
function rewrap(enRaw, frPlain, GLOSSARY, lost) {
  let fr = frPlain;
  const spans = [];
  for (const m of enRaw.matchAll(/\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g)) spans.push({ kind: 'tip', key: m[1].trim(), shown: m[2] ?? GLOSSARY[m[1].trim()]?.term ?? m[1].trim(), at: m.index });
  for (const m of enRaw.matchAll(/<(\w+)([^>]*)>(.*?)<\/\1>/g)) spans.push({ kind: 'tag', tag: m[1], attrs: m[2], shown: m[3].replace(/<[^>]+>/g, ''), at: m.index });
  spans.sort((a, b) => a.at - b.at);
  for (const sp of spans) {
    const cands = [sp.shown, ...(sp.kind === 'tip' ? FR_ANCHORS[sp.key] ?? [] : TAG_ANCHORS[sp.shown] ?? [])];
    let hit = null;
    for (const c of cands) { hit = findFree(fr, c); if (hit) break; }
    if (!hit) { lost.push({ span: sp.kind === 'tip' ? `[[${sp.key}|${sp.shown}]]` : `<${sp.tag}>${sp.shown}</${sp.tag}>` }); continue; }
    const wrapped = sp.kind === 'tip' ? `[[${sp.key}|${hit.text}]]` : `<${sp.tag}${sp.attrs}>${hit.text}</${sp.tag}>`;
    fr = fr.slice(0, hit.index) + wrapped + fr.slice(hit.index + hit.text.length);
  }
  return fr;
}

// ---------- scenario enumeration ----------

const TEXT_LEAF = new Set(['title', 'steps', 'brief', 'prompt', 'learn', 'text', 'by', 'what', 'why', 'label', 'note', 'button', 'fix']);

function enumerateScenario({ MOMENTS, PHASES, ROLES, parsePath }) {
  const out = new Map(); // canonical key -> current English
  const canon = k => parsePath(k).join('.');
  for (const [p, v] of Object.entries(PHASES)) out.set(canon(`phases.${p}`), v);
  for (const [r, o] of Object.entries(ROLES)) for (const f of ['name', 'title', 'initials', 'job']) if (typeof o[f] === 'string') out.set(canon(`roles.${r}.${f}`), o[f]);
  const walk = (v, segs, leaf) => {
    if (typeof v === 'string') { if (TEXT_LEAF.has(leaf) || leaf === 'lines') out.set(segs.join('.'), v); return; }
    if (Array.isArray(v)) {
      v.forEach((x, i) => {
        if (typeof x === 'string') return walk(x, [...segs, String(i)], leaf);
        const id = leaf === 'choices' ? x.id : leaf === 'checks' ? x.flag : String(i);
        walk(x, [...segs, id], leaf);
      });
      return;
    }
    if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, [...segs, k], k);
  };
  for (const m of MOMENTS) walk(m, [m.id], '');
  return out;
}

// ---------- main ----------

const cur = await loadCurrent();
const { en, stripTips, GLOSSARY, GLOSSARY_FR, parsePath } = cur;
const scenarioCurrent = enumerateScenario(cur);
const canon = k => parsePath(k).join('.');

const files = {
  ui: join(DIR, 'transcript-fr-site-ui-and-demo.md'),
  scenario: join(DIR, 'transcript-fr-game-scenario.md'),
};
const deltas = [...readdirSync(DIR).filter(f => /^transcript-fr-delta-.*\.md$/.test(f)).sort().map(f => join(DIR, f)), ...EXTRA];
for (const f of Object.values(files)) if (!existsSync(f)) { console.error(`missing ${f}`); process.exit(1); }

/** scope of a key: UI keys carry `file:`; PHASES/ROLES rows in the UI transcript alias the scenario keys. */
function classify(key) {
  if (key.startsWith('glossary.')) return { scope: 'glossary', key };
  const m = /^scenario\.ts:(PHASES|ROLES)\.(.+)$/.exec(key);
  if (m) return { scope: 'scenario', key: `${m[1].toLowerCase()}.${m[2]}`, alias: true };
  if (key.includes(':')) return { scope: 'ui', key };
  return { scope: 'scenario', key: canon(key) };
}

// later sources override earlier ones; the scenario transcript outranks aliased rows in the UI transcript
const table = { ui: new Map(), scenario: new Map(), glossary: new Map() };
const conflicts = [];
function ingest(file, rows, tag) {
  for (const r of rows) for (const raw of r.keys) {
    const c = classify(raw);
    const prev = table[c.scope].get(c.key);
    if (prev && c.alias && !prev.alias && tag === 'base') { // a UI-transcript alias must not override the scenario transcript
      if (prev.fr !== r.fr) conflicts.push({ key: c.key, scenarioFr: prev.fr, siteUiFr: r.fr });
      continue;
    }
    if (prev && !c.alias && prev.alias && prev.fr !== r.fr && tag === 'base') conflicts.push({ key: c.key, scenarioFr: r.fr, siteUiFr: prev.fr });
    table[c.scope].set(c.key, { en: r.en, fr: r.fr, alias: !!c.alias, rawKey: raw, tag });
  }
}
ingest(files.ui, parseTranscript(files.ui), 'base');
ingest(files.scenario, parseTranscript(files.scenario), 'base');
for (const d of deltas) ingest(d, parseTranscript(d), 'delta');

const report = { imported: 0, importedUi: 0, importedScenario: 0, stale: [], removed: [], missing: [], conflicts, lostMarkup: [], unmappedTokens: [], deltaFiles: deltas.map(f => f.split('/').pop()) };
const outUi = {}, outScenario = {};

// ----- UI -----
for (const [key, row] of table.ui) {
  const currentEn = en[key];
  if (currentEn === undefined) { report.removed.push(key); continue; }
  if (uiKeyTranscript(row.en) !== uiKeyCurrent(stripTips, currentEn)) {
    report.stale.push({ scope: 'ui', key, transcriptEn: row.en, currentEn, fr: row.fr });
    continue;
  }
  // map the transcript's ${expr} onto the code's {token}s by position, then rewrite the French
  const eExprs = exprs(row.en);
  const tokens = [...currentEn.matchAll(TOKEN)].map(m => m[0]);
  const byExpr = new Map(eExprs.map((e, i) => [e.expr, tokens[i]]));
  let fr = '', last = 0, bad = false;
  for (const e of exprs(row.fr)) {
    const tok = byExpr.get(e.expr);
    if (!tok) { bad = true; break; }
    fr += row.fr.slice(last, e.start) + tok; last = e.end;
  }
  if (bad) {
    report.unmappedTokens.push({ key, fr: row.fr });
    report.stale.push({ scope: 'ui', key, transcriptEn: row.en, currentEn, fr: row.fr, note: 'French uses an expression the English column does not' });
    continue;
  }
  fr += row.fr.slice(last);
  const lost = [];
  fr = rewrap(currentEn, fr, GLOSSARY, lost);
  for (const l of lost) report.lostMarkup.push({ key, ...l });
  outUi[key] = edgeSpace(currentEn, fr);
}
for (const key of Object.keys(en)) if (!table.ui.has(key)) report.missing.push({ scope: 'ui', key, en: en[key] });

// ----- scenario -----
for (const [key, row] of table.scenario) {
  const currentEn = scenarioCurrent.get(key);
  if (currentEn === undefined) { report.removed.push(key); continue; }
  if (plainKey(row.en) !== plainKey(plainCurrent(stripTips, currentEn))) {
    report.stale.push({ scope: 'scenario', key, transcriptEn: row.en, currentEn, fr: row.fr });
    continue;
  }
  const lost = [];
  outScenario[key] = edgeSpace(currentEn, rewrap(currentEn, row.fr, GLOSSARY, lost));
  for (const l of lost) report.lostMarkup.push({ key, ...l });
}
for (const [key, e] of scenarioCurrent) if (!table.scenario.has(key)) report.missing.push({ scope: 'scenario', key, en: e });

// ----- glossary tooltips: French stays in src/game/glossary.ts (code is the source); rows are checked, not imported -----
report.glossary = { rows: table.glossary.size, stale: [], drift: [], missing: [] };
for (const [key, row] of table.glossary) {
  const [, k, f] = key.split('.');
  const g = GLOSSARY[k], gf = GLOSSARY_FR[k];
  if (!g || !(f === 'term' || f === 'def')) { report.glossary.stale.push({ key, note: 'no such glossary entry' }); continue; }
  if (plainKey(row.en) !== plainKey(g[f])) { report.glossary.stale.push({ key, transcriptEn: row.en, currentEn: g[f] }); continue; }
  if (!gf || plainKey(row.fr) !== plainKey(gf[f])) report.glossary.drift.push({ key, transcriptFr: row.fr, codeFr: gf?.[f] });
}
for (const [k, g] of Object.entries(GLOSSARY)) for (const f of ['term', 'def']) if (!table.glossary.has(`glossary.${k}.${f}`)) report.glossary.missing.push(`glossary.${k}.${f}`);

report.importedUi = Object.keys(outUi).length;
report.importedScenario = Object.keys(outScenario).length;
report.imported = report.importedUi + report.importedScenario;

// ---------- write ----------

const q = JSON.stringify;
const body = o => Object.entries(o).map(([k, v]) => `  ${q(k)}: ${q(v)},`).join('\n');
const stamp = `GENERATED by scripts/import-fr.mjs from the reviewed French transcripts. Do not edit by hand:\n * fix the transcript (or add transcript-fr-delta-*.md) and re-run \`node scripts/import-fr.mjs\`.`;
writeFileSync(join(ROOT, 'src/i18n/fr.ts'), `/**\n * French UI strings. ${stamp}\n * Only rows whose English matches the current code are here; see the import report for the rest.\n */\nexport const fr: Record<string, string> = {\n${body(outUi)}\n};\n`);
writeFileSync(join(ROOT, 'src/i18n/scenario.fr.ts'), `/**\n * French overlay for src/game/scenario.ts (path -> string). ${stamp}\n */\nexport const SCENARIO_FR: Record<string, string> = {\n${body(outScenario)}\n};\n`);
writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');

console.log(`imported ${report.imported} (ui ${report.importedUi}, scenario ${report.importedScenario}) | stale ${report.stale.length} | removed ${report.removed.length} | missing ${report.missing.length}`);
console.log(`glossary rows ${report.glossary.rows} | stale ${report.glossary.stale.length} | drift from code ${report.glossary.drift.length} | missing ${report.glossary.missing.length}`);
console.log(`conflicts ${conflicts.length} | tooltip/markup not placed ${report.lostMarkup.length} | report ${REPORT}`);
