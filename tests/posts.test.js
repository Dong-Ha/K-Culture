const assert = require('node:assert/strict');
const test = require('node:test');
const posts = require('../js/posts.js');

const allowedCategories = ['kpop', 'kdrama', 'kfood'];

test('validatePost rejects missing or short fields', () => {
  const result = posts.validatePost({ title: 'A', category: '', content: 'short' }, allowedCategories);

  assert.equal(result.isValid, false);
  assert.equal(result.errors.title, 'Title must be at least 2 characters.');
  assert.equal(result.errors.category, 'Choose a category.');
  assert.equal(result.errors.content, 'Post content must be at least 10 characters.');
});

test('validatePost rejects oversized fields and categories outside the allowlist', () => {
  const result = posts.validatePost({
    title: 'T'.repeat(posts.TITLE_MAX_LENGTH + 1),
    category: 'invalid-category',
    content: 'C'.repeat(posts.CONTENT_MAX_LENGTH + 1)
  }, allowedCategories);

  assert.equal(result.isValid, false);
  assert.equal(result.errors.title, `Title must be ${posts.TITLE_MAX_LENGTH} characters or fewer.`);
  assert.equal(result.errors.category, 'Choose a valid category.');
  assert.equal(result.errors.content, `Post content must be ${posts.CONTENT_MAX_LENGTH} characters or fewer.`);
});

test('createPost normalizes content and creates a stable post shape', () => {
  const result = posts.createPost(
    { title: '  K-pop   playlist ', category: ' kpop ', content: '  Start with comeback stages.  ' },
    '2026-06-27T00:00:00.000Z',
    allowedCategories
  );

  assert.equal(result.isValid, true);
  assert.deepEqual(result.post, {
    id: 'k-pop-playlist-1782518400000',
    title: 'K-pop playlist',
    category: 'kpop',
    content: 'Start with comeback stages.',
    createdAt: '2026-06-27T00:00:00.000Z'
  });
});

test('safeParsePosts falls back to default posts for invalid storage', () => {
  assert.deepEqual(posts.safeParsePosts('not json', allowedCategories), posts.DEFAULT_POSTS);
  assert.deepEqual(posts.safeParsePosts('{"bad":true}', allowedCategories), posts.DEFAULT_POSTS);
});

test('safeParsePosts filters malformed stored posts and caps stored post count', () => {
  const valid = Array.from({ length: posts.MAX_POSTS + 2 }, (_, index) => ({
    id: `post-${index}`,
    title: `Post ${index}`,
    category: 'kpop',
    content: 'This is a valid stored post.',
    createdAt: '2026-06-27T00:00:00.000Z'
  }));
  const raw = JSON.stringify([
    ...valid,
    { id: 'bad-date', title: 'Bad date', category: 'kpop', content: 'Long enough content.', createdAt: 'not-a-date' },
    { id: 'bad-category', title: 'Bad category', category: 'bad', content: 'Long enough content.', createdAt: '2026-06-27T00:00:00.000Z' },
    { id: 'bad-title', title: 'T'.repeat(posts.TITLE_MAX_LENGTH + 1), category: 'kpop', content: 'Long enough content.', createdAt: '2026-06-27T00:00:00.000Z' }
  ]);

  const parsed = posts.safeParsePosts(raw, allowedCategories);

  assert.equal(parsed.length, posts.MAX_POSTS);
  assert.equal(parsed.every((post) => posts.isValidStoredPost(post, allowedCategories)), true);
});

test('loadPosts and savePosts use the configured localStorage key', () => {
  const storage = new Map();
  const localStorageLike = {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value)
  };
  const saved = [{ id: '1', title: 'Drama note', category: 'kdrama', content: 'Watch with OST notes.', createdAt: '2026-06-27T00:00:00.000Z' }];

  assert.equal(posts.savePosts(localStorageLike, saved), true);
  assert.equal(storage.has(posts.STORAGE_KEY), true);
  assert.deepEqual(posts.loadPosts(localStorageLike, allowedCategories), saved);
});

test('loadPosts and savePosts handle unavailable storage without crashing', () => {
  const brokenStorage = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); }
  };

  assert.deepEqual(posts.loadPosts(brokenStorage, allowedCategories), posts.DEFAULT_POSTS);
  assert.equal(posts.savePosts(brokenStorage, []), false);
});

test('fetchRemotePosts maps Supabase rows to browser posts', async () => {
  const fetchMock = async (url, options) => {
    assert.match(url, /\/rest\/v1\/posts\?/);
    assert.equal(options.headers.apikey, 'public-key');
    return {
      ok: true,
      json: async () => [{
        id: 7,
        title: 'Shared post',
        category: 'kpop',
        content: 'This post is visible to everyone.',
        created_at: '2026-07-11T00:00:00.000Z'
      }]
    };
  };

  const result = await posts.fetchRemotePosts(
    { url: 'https://example.supabase.co', publishableKey: 'public-key' },
    fetchMock
  );

  assert.deepEqual(result, [{
    id: '7',
    title: 'Shared post',
    category: 'kpop',
    content: 'This post is visible to everyone.',
    createdAt: '2026-07-11T00:00:00.000Z'
  }]);
});

test('publishRemotePost sends only writable fields and maps the response', async () => {
  const fetchMock = async (url, options) => {
    assert.equal(url, 'https://example.supabase.co/rest/v1/posts');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Prefer, 'return=representation');
    assert.equal(options.headers.Authorization, 'Bearer admin-access-token');
    assert.deepEqual(JSON.parse(options.body), {
      title: 'Food note',
      category: 'kfood',
      content: 'Try a shared banchan table.'
    });
    return {
      ok: true,
      json: async () => [{
        id: 8,
        title: 'Food note',
        category: 'kfood',
        content: 'Try a shared banchan table.',
        created_at: '2026-07-11T01:00:00.000Z'
      }]
    };
  };

  const result = await posts.publishRemotePost(
    { url: 'https://example.supabase.co', publishableKey: 'public-key' },
    { id: 'local', title: 'Food note', category: 'kfood', content: 'Try a shared banchan table.', createdAt: 'old' },
    'admin-access-token',
    fetchMock
  );

  assert.equal(result.id, '8');
  assert.equal(result.createdAt, '2026-07-11T01:00:00.000Z');
});

test('signInAdmin requests a password session', async () => {
  const fetchMock = async (url, options) => {
    assert.equal(url, 'https://example.supabase.co/auth/v1/token?grant_type=password');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), { email: 'admin@example.com', password: 'secret' });
    return { ok: true, json: async () => ({ access_token: 'token', user: { email: 'admin@example.com' } }) };
  };
  const session = await posts.signInAdmin(
    { url: 'https://example.supabase.co', publishableKey: 'public-key' },
    { email: 'admin@example.com', password: 'secret' },
    fetchMock
  );
  assert.equal(session.access_token, 'token');
});
