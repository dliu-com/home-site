// The dliu.com health contract (status/HEALTH.md): the /docs Health tab (#health, for people) and /docs/health.md (Markdown,
// for machines) describe the same functions and guest checks. dliu.com is static, so there is no /health endpoint.
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '..', '..', 'src');
const docs = fs.readFileSync(path.join(SRC, 'docs.html'), 'utf8');
// The Health tab: from its heading to the page-wide source link at the end of the article.
const html = docs.slice(docs.indexOf('<h2 id="health">'), docs.indexOf('<p class="source">'));
const md = fs.readFileSync(path.join(SRC, 'docs', 'health.md'), 'utf8');

const mdSection = (title: string) => md.split(`\n## ${title}\n`)[1].split('\n## ')[0];
const mdRows = (title: string) => mdSection(title).split('\n')
  .filter((line) => line.startsWith('| ') && !line.startsWith('| ---'))
  .slice(1)
  .map((line) => line.slice(2, -2).split(' | ').map((cell) => cell.replace(/^`|`$/g, '')));

const mdFunctions = mdRows('Functions').map(([key]) => key);
const mdChecks = mdRows('Guest checks').map((cells) => cells.join(' | '));
const htmlFunctions = [...html.matchAll(/<tr data-function="([a-z-]+)">/g)].map((m) => m[1]);
// Checks per function, as drawn in the bar chart.
const chart = Object.fromEntries([...html.matchAll(/<g data-function="([a-z-]+)" data-checks="(\d+)">/g)].map((m) => [m[1], Number(m[2])]));
const mdChecksPer = (key: string) => mdChecks.filter((check) => check.startsWith(`${key} | `)).length;
// The words people read: the tab without its tags.
const text = html.replace(/<[^>]+>/g, ' ');

test('/docs/health.md has every section the contract asks for', () => {
  for (const title of ['Functions', 'Guest checks', 'Health endpoint', 'Not tested', 'Rules']) {
    expect(md).toContain(`\n## ${title}\n`);
  }
  expect(mdSection('Rules')).toMatch(/read only/);
});

test('the /docs Health tab shows numbers, flows, a table and a chart, with the Markdown link at the end', () => {
  expect(docs).toContain('<a href="/docs#health">Health</a>');
  expect(html).toMatch(/^<h2 id="health">/);
  expect(html).toMatch(/<div class="dg-stats">[\s\S]*class="dg-stat"/);
  expect(html).toMatch(/<figure class="dg">[\s\S]*class="dg-flow"[\s\S]*class="dg-arrow"[\s\S]*class="dg-step dg-good"[\s\S]*class="dg-step dg-warn"[\s\S]*class="dg-step dg-bad"[\s\S]*<\/figure>/);
  for (const id of ['functions', 'not-tested']) {
    expect(html).toContain(`<h2 id="${id}">`);
  }
  expect(html).toMatch(/<svg viewBox="[^"]+" width="100%" font-size="15" role="img" aria-label="Checks per function: /);
  expect(html.trim()).toMatch(/<p><a href="\/docs\/health.md">Technical version for machines \(Markdown\)<\/a><\/p>$/);
});

test('the Health tab has no exact technical details', () => {
  expect(html).not.toMatch(/<code|<details|<pre/);
  expect(html).not.toMatch(/https?:\/\//);
  expect(text).not.toMatch(/\b(200|301|302|304|401|403|404|500|502|503)\b/);
  expect(text).not.toMatch(/text\/html|text\/css|text\/markdown|application\/|Cache-Control|Location|GET|HEAD/);
});

test('the Health tab and the Markdown file list the same functions and checks', () => {
  expect(mdFunctions).toEqual(['pages', 'resume', 'routing', 'https']);
  expect(htmlFunctions).toEqual(mdFunctions);
  expect(Object.keys(chart)).toEqual(mdFunctions);
  for (const key of mdFunctions) expect(chart[key]).toBe(mdChecksPer(key));
  expect(html).toContain(`<strong>${mdFunctions.length} functions tested</strong>`);
  expect(html).toContain(`<strong>${mdChecks.length} checks</strong>`);
  expect(new Set(mdChecks.map((check) => check.split(' | ')[0]))).toEqual(new Set(mdFunctions));
});

test('guest checks are GET or HEAD on dliu.com, with a status, content type, marker and slow threshold', () => {
  for (const check of mdChecks) {
    const [, method, url, status, contentType, marker, slow] = check.split(' | ');
    expect(method).toMatch(/^(GET|HEAD)$/);
    expect(url).toMatch(/^https?:\/\/dliu\.com\//);
    expect(status).toMatch(/^\d{3}$/);
    expect(contentType).toMatch(/^([a-z]+\/[a-z.+-]+|-)$/);
    expect(marker.length).toBeGreaterThan(0);
    expect(slow).toMatch(/^\d+$/);
  }
  expect(mdChecks).toContain('resume | GET | https://dliu.com/resume.pdf | 200 | application/pdf | %PDF- | 3000');
});

test('the body markers really are in the pages they are checked on', () => {
  const read = (file: string) => fs.readFileSync(path.join(SRC, file), 'utf8');
  expect(read('index.html')).toContain('class="dl-header"');
  expect(read('docs.html')).toContain('dl-docs-main');
  expect(read('style.css')).toContain('.app-grid');
  expect(md).toContain('## Guest checks');
  expect(read('docs.html')).toContain('/docs#health');
  expect(read('404.html')).toContain('Page not found');
  expect(read('resume.pdf').startsWith('%PDF-')).toBe(true);
});

test('there is no /health endpoint, and both versions say so', () => {
  // status's importer would read a /health URL here as the site having one.
  expect(mdSection('Health endpoint').trim()).toMatch(/^None\./);
  expect(mdSection('Health endpoint')).not.toMatch(/https?:\/\/|\/health\b/);
  expect(text).toMatch(/no server or database/);
  expect(fs.existsSync(path.join(SRC, 'health'))).toBe(false);
  expect(fs.existsSync(path.join(SRC, 'health.html'))).toBe(false);
  expect(fs.existsSync(path.join(SRC, 'docs-health.html'))).toBe(false);
});
