import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '..', '..', 'src');
const read = (file: string) => fs.readFileSync(path.join(SRC, file), 'utf8');
const DL_CSS = '<link rel="stylesheet" href="https://files.dliu.com/dliu.com/ui/v1/dl.css">';
const DL_ICON = 'https://files.dliu.com/dliu.com/favicon.png';
const pages = fs.readdirSync(SRC).filter((file) => file.endsWith('.html'));

test('every page loads the shared dliu.com stylesheet before its own and uses the DL icon', () => {
  expect(pages.sort()).toEqual(['404.html', 'index.html']);
  for (const file of pages) {
    const page = read(file);
    expect(page).toContain(DL_CSS);
    expect(page.indexOf(DL_CSS)).toBeLessThan(page.indexOf('<link rel="stylesheet" href="/style.css">'));
    expect(page).toContain(`<link rel="icon" type="image/png" href="${DL_ICON}">`);
    expect(page).not.toMatch(/<style\b/);
  }
});

test('every page has the shared header with the DL icon, and the shared footer', () => {
  for (const file of pages) {
    const page = read(file);
    expect(page).toContain('<body class="dl-page">');
    expect(page).toContain(`<a class="dl-logo" href="https://dliu.com" aria-label="dliu.com"><img src="${DL_ICON}"`);
    expect(page).toContain('<a class="dl-brand" href="/">Dewei Liu</a>');
    expect(page).toContain('<nav class="dl-nav" aria-label="Site">');
    expect(page).toMatch(/<main class="dl-main[" ]/);
    expect(page).toContain('<footer class="dl-footer"><a href="https://dliu.com">dliu.com</a>');
  }
});

test('the site stylesheet leaves the header, buttons, footer and palette to the shared stylesheet', () => {
  const css = read('style.css');
  expect(css).not.toMatch(/^\s*(header|footer|button)\b|\.dl-(header|button|footer)|prefers-color-scheme|--[a-z-]+\s*:/m);
  expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
});
