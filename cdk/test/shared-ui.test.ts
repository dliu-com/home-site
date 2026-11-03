import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '..', '..', 'src');
const read = (file: string) => fs.readFileSync(path.join(SRC, file), 'utf8');
const DL_CSS = '<link rel="stylesheet" href="https://files.dliu.com/dliu.com/ui/v1/dl.css">';
const DL_ICON = 'https://files.dliu.com/dliu.com/favicon.png';
const pages = fs.readdirSync(SRC).filter((file) => file.endsWith('.html'));

const DL_DOCS_CSS = '<link rel="stylesheet" href="https://files.dliu.com/dliu.com/ui/v1/dl-docs.css">';
const SITE_CSS = '<link rel="stylesheet" href="/style.css">';

test('every page loads the shared dliu.com stylesheet before its own and uses the DL icon', () => {
  expect(pages.sort()).toEqual(['404.html', 'docs.html', 'index.html']);
  for (const file of pages) {
    const page = read(file);
    expect(page).toContain(DL_CSS);
    if (!file.startsWith('docs')) {
      expect(page.indexOf(DL_CSS)).toBeLessThan(page.indexOf(SITE_CSS));
    }
    expect(page).toContain(`<link rel="icon" type="image/png" href="${DL_ICON}">`);
    expect(page).not.toMatch(/<style\b/);
  }
});

test('every page has the shared header with the DL icon, and the shared footer', () => {
  for (const file of pages) {
    const page = read(file);
    expect(page).toContain('<body class="dl-page">');
    expect(page).toContain(`<a class="dl-brand" href="/"><img class="dl-logo" src="${DL_ICON}" alt="" width="32" height="32">Dewei Liu</a>`);
    expect(page).not.toContain('class="dl-nav"');
    expect(page).toMatch(/<main class="dl-main[" ]/);
    expect(page).toMatch(new RegExp(`<footer class="dl-footer">\\s*<a class="dl-footer-logo" href="https://dliu.com" aria-label="dliu.com"><img src="${DL_ICON}" alt="" width="24" height="24"></a>\\s*<a href="https://dliu.com">dliu.com</a>`));
  }
});

test('the site stylesheet leaves the header, buttons, footer and palette to the shared stylesheet', () => {
  const css = read('style.css');
  expect(css).not.toMatch(/^\s*(header|footer|button)\b|\.dl-(header|button|footer)|prefers-color-scheme|--[a-z-]+\s*:/m);
  expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
});

test('the docs pages use the shared docs layout and have no menu button', () => {
  for (const file of ['docs.html']) {
    const page = read(file);
    expect(page.indexOf(DL_CSS)).toBeLessThan(page.indexOf(DL_DOCS_CSS));
    // style.css restyles h2 for the landing page, so the docs pages don't load it.
    expect(page).not.toContain(SITE_CSS);
    expect(page).toContain('<main class="dl-main dl-docs-main">');
    expect(page).toContain('<nav class="dl-tabs" aria-label="Docs sections">');
    expect(page).toContain('<article class="dl-docs">');
    expect(page).not.toMatch(/<script\b/);
    expect(page).toContain('<a href="/docs#health">Testing</a>');
  }
  const page = read('docs.html');
  expect(page.indexOf(DL_CSS)).toBeLessThan(page.indexOf(DL_DOCS_CSS));
  // style.css restyles h2 for the landing page, so the docs page doesn't load it.
  expect(page).not.toContain(SITE_CSS);
  expect(page).toContain('<main class="dl-main dl-docs-main">');
  expect(page).toContain('<nav class="dl-tabs" aria-label="Docs sections">');
  expect(page).toContain('<article class="dl-docs">');
  expect(page).not.toMatch(/<script\b/);
  for (const id of ['architecture', 'caching', 'deployment', 'cost', 'security']) {
    expect(page).toContain(`<a href="/docs#${id}"`);
    expect(page).toContain(`id="${id}"`);
  }
});

test('no page links to Docs from the header', () => {
  for (const file of pages) {
    const header = read(file).split('</header>')[0];
    expect(header).not.toMatch(/href="\/docs/);
  }
});
