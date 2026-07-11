const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const html = fs.readFileSync('index.html', 'utf8');
const main = fs.readFileSync('js/main.js', 'utf8');
const editorial = fs.readFileSync('data/editorial.js', 'utf8');

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
