const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const html = fs.readFileSync('index.html', 'utf8');
const main = fs.readFileSync('js/main.js', 'utf8');
const editorial = fs.readFileSync('data/editorial.js', 'utf8');
const navigation = fs.readFileSync('js/navigation.js', 'utf8');
const styles = fs.readFileSync('css/styles.css', 'utf8');

test('English is the document default and both language tabs are available', () => {
  assert.match(html, /<html lang="en">/);
  assert.match(html, /data-language="en" aria-pressed="true"/);
  assert.match(html, /data-language="ko" aria-pressed="false"/);
  assert.match(html, /English-first editorial guide/);
});

test('language selection updates document semantics and rerenders dynamic content', () => {
  assert.match(main, /document\.documentElement\.lang = language/);
  assert.match(main, /renderCategories\(\); renderStories\(\);/);
  assert.match(main, /setLanguage\("en"\)/);
});

test('curated stories have English defaults and Korean alternatives', () => {
  assert.match(editorial, /title: "Three ways to watch a K-pop stage"/);
  assert.match(editorial, /titleKo: "K-pop 무대를 보는 세 가지 포인트"/);
  assert.match(editorial, /contentKo:/);
});

test('navigation hides while scrolling down and returns while scrolling up', () => {
  assert.match(html, /js\/navigation\.js/);
  assert.match(navigation, /currentScrollY < lastScrollY/);
  assert.match(navigation, /classList\.toggle\("nav-hidden"/);
  assert.match(navigation, /focusin/);
  assert.match(styles, /\.nav\.nav-hidden/);
});

test('each editorial content section has a thin back-to-top control', () => {
  const controls = html.match(/class="section-top-link" href="#home"/g) || [];
  assert.equal(controls.length, 5);
  assert.match(html, /data-i18n-aria="backToTop"/);
  assert.match(styles, /\.section-top-link/);
});
