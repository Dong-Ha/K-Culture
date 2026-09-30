const assert = require('node:assert/strict');
const test = require('node:test');
const posts = require('../js/posts.js');
const fs = require('node:fs');
const vm = require('node:vm');

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

test('normalizePost preserves intentional paragraphs for long-form editing', () => {
  const normalized = posts.normalizePost({
    title: '  Seoul   note ',
    category: ' travel ',
    content: '  First paragraph.  \r\n\r\n  Second **bold** paragraph.  '
  });

  assert.deepEqual(normalized, {
    title: 'Seoul note',
    category: 'travel',
    content: 'First paragraph.\n\nSecond **bold** paragraph.'
  });
});

test('editor actions wrap selections without interpreting user HTML', () => {
  assert.deepEqual(posts.applyEditorAction('K-culture', 0, 1, 'bold'), {
    value: '**K**-culture',
    selectionStart: 2,
    selectionEnd: 3
  });
  assert.equal(posts.applyEditorAction('one\ntwo', 0, 7, 'list').value, '- one\n- two');
  assert.equal(posts.getPostExcerpt('## Seoul\n\nA **careful** [guide](https://example.com).'), 'Seoul A careful guide.');
});

test('renderPostContent builds safe formatting nodes without parsing arbitrary HTML', () => {
  class FakeNode {
    constructor(tagName, textContent = '') { this.tagName = tagName; this.textContent = textContent; this.children = []; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
  }
  const documentRef = {
    createElement: (tagName) => new FakeNode(tagName),
    createTextNode: (text) => new FakeNode('#text', text)
  };
  const container = new FakeNode('div');

  posts.renderPostContent(
    container,
    '## Heading\n- first\n- **second**\n<script>alert(1)</script>\n[Safe](https://example.com) [Unsafe](javascript:alert(1))',
    documentRef
  );

  assert.deepEqual(container.children.map((node) => node.tagName), ['h3', 'ul', 'p', 'p']);
  const allNodes = [];
  const visit = (node) => { allNodes.push(node); node.children.forEach(visit); };
  container.children.forEach(visit);
  assert.equal(allNodes.some((node) => node.tagName === 'script'), false);
  assert.equal(allNodes.filter((node) => node.tagName === 'a').length, 1);
  assert.equal(allNodes.find((node) => node.tagName === 'a').href, 'https://example.com');
  assert.equal(allNodes.some((node) => node.textContent.includes('<script>')), true);
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
    assert.equal(url, 'https://example.supabase.co/rest/v1/posts?select=id,title,category,content,created_at');
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

test('publishRemotePost refuses to send a request without an access token', async () => {
  let requested = false;

  await assert.rejects(
    posts.publishRemotePost(
      { url: 'https://example.supabase.co', publishableKey: 'public-key' },
      { title: 'Food note', category: 'kfood', content: 'Try a shared banchan table.' },
      '',
      async () => {
        requested = true;
      }
    ),
    /administrator session/i
  );

  assert.equal(requested, false);
});

test('updateRemotePost patches only editable fields and maps the response', async () => {
  const fetchMock = async (url, options) => {
    assert.equal(url, 'https://example.supabase.co/rest/v1/posts?id=eq.8&select=id,title,category,content,created_at');
    assert.equal(options.method, 'PATCH');
    assert.equal(options.headers.Authorization, 'Bearer admin-access-token');
    assert.equal(options.headers.Prefer, 'return=representation');
    assert.deepEqual(JSON.parse(options.body), {
      title: 'Updated food note',
      category: 'kfood',
      content: 'A revised shared banchan guide.'
    });
    return {
      ok: true,
      json: async () => [{
        id: 8,
        title: 'Updated food note',
        category: 'kfood',
        content: 'A revised shared banchan guide.',
        created_at: '2026-07-11T01:00:00.000Z'
      }]
    };
  };

  const result = await posts.updateRemotePost(
    { url: 'https://example.supabase.co', publishableKey: 'public-key' },
    '8',
    { title: 'Updated food note', category: 'kfood', content: 'A revised shared banchan guide.', created_by: 'blocked' },
    'admin-access-token',
    fetchMock
  );

  assert.equal(result.id, '8');
  assert.equal(result.title, 'Updated food note');
});

test('updateRemotePost refuses edits without an administrator token', async () => {
  let requested = false;
  await assert.rejects(
    posts.updateRemotePost(
      { url: 'https://example.supabase.co', publishableKey: 'public-key' },
      '8',
      { title: 'Updated', category: 'kfood', content: 'Long enough content.' },
      '',
      async () => { requested = true; }
    ),
    /administrator session/i
  );
  assert.equal(requested, false);
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

test('verifyAdminSession confirms both the auth user and administrator membership', async () => {
  const requests = [];
  const fetchMock = async (url, options) => {
    requests.push({ url, options });

    if (url.endsWith('/auth/v1/user')) {
      return {
        ok: true,
        json: async () => ({ id: 'admin-user-id', email: 'admin@example.com' })
      };
    }

    assert.equal(url, 'https://example.supabase.co/rest/v1/rpc/is_admin');
    assert.equal(options.method, 'POST');
    return { ok: true, json: async () => true };
  };

  const user = await posts.verifyAdminSession(
    { url: 'https://example.supabase.co', publishableKey: 'public-key' },
    'admin-access-token',
    fetchMock
  );

  assert.deepEqual(user, { id: 'admin-user-id', email: 'admin@example.com' });
  assert.equal(requests.length, 2);
  assert.equal(requests.every(({ options }) => options.headers.Authorization === 'Bearer admin-access-token'), true);
});

test('verifyAdminSession rejects authenticated users without administrator membership', async () => {
  const fetchMock = async (url) => {
    if (url.endsWith('/auth/v1/user')) {
      return { ok: true, json: async () => ({ id: 'regular-user-id' }) };
    }

    return { ok: true, json: async () => false };
  };

  await assert.rejects(
    posts.verifyAdminSession(
      { url: 'https://example.supabase.co', publishableKey: 'public-key' },
      'regular-access-token',
      fetchMock
    ),
    /administrator privileges/i
  );
});

test('verifyAdminSession rejects missing tokens without making a request', async () => {
  let requested = false;

  await assert.rejects(
    posts.verifyAdminSession(
      { url: 'https://example.supabase.co', publishableKey: 'public-key' },
      '',
      async () => {
        requested = true;
      }
    ),
    /administrator session/i
  );

  assert.equal(requested, false);
});

test('session restoration only applies results to the token it started with', () => {
  const mainSource = fs.readFileSync('js/main.js', 'utf8');
  const restoreSource = mainSource.match(/async function restoreAdminSession\(\) \{[\s\S]+?\n\}/)?.[0] || '';

  assert.match(restoreSource, /const restoringAccessToken = session\?\.access_token/);
  assert.match(restoreSource, /verifyAdminSession\(supabaseConfig, restoringAccessToken\)/);
  assert.equal(
    (restoreSource.match(/session\?\.access_token !== restoringAccessToken/g) || []).length,
    2
  );
});

test('Supabase policies keep membership and server-owned post fields private', () => {
  for (const migration of ['supabase/schema.sql', 'supabase/admin-only.sql']) {
    const sql = fs.readFileSync(migration, 'utf8');

    assert.match(sql, /create or replace function private\.is_admin\(\)[\s\S]+security definer/i);
    assert.match(sql, /create or replace function public\.is_admin\(\)[\s\S]+security invoker/i);
    assert.match(sql, /set search_path = ''/i);
    assert.match(sql, /alter table public\.posts enable row level security/i);
    assert.match(sql, /create policy "No direct access to admin membership"[\s\S]+using \(false\)/i);
    assert.match(sql, /from pg_policies[\s\S]+and cmd in \('INSERT', 'UPDATE'\)/i);
    assert.match(sql, /with check \(\(select private\.is_admin\(\)\) and created_by = \(select auth\.uid\(\)\)\)/i);
    assert.match(sql, /create policy "Administrators can update posts"[\s\S]+for update[\s\S]+using \(\(select private\.is_admin\(\)\)\)[\s\S]+with check \(\(select private\.is_admin\(\)\)\)/i);
    assert.match(sql, /create index if not exists posts_created_by_idx\s+on public\.posts \(created_by\)/i);
    assert.match(sql, /revoke all privileges on table public\.admins from public, anon, authenticated/i);
    assert.match(sql, /grant insert \(title, category, content\)\s+on table public\.posts to authenticated/i);
    assert.match(sql, /grant update \(title, category, content\)\s+on table public\.posts to authenticated/i);
    assert.match(sql, /posts_content_length[\s\S]+between 10 and 5000/i);
    assert.doesNotMatch(sql, /grant insert on table public\.posts to authenticated/i);
  }
});

test('every page CSP limits scripts and API connections to approved origins', () => {
  for (const page of ['index.html', 'article.html']) {
    const html = fs.readFileSync(page, 'utf8');
    const policy = html.match(/Content-Security-Policy" content="([^"]+)"/)?.[1] || '';

    assert.match(policy, /default-src 'self'/);
    assert.match(policy, /script-src 'self'/);
    assert.match(policy, /connect-src 'self' https:\/\/igaogdhrdtmjxnyezjbp\.supabase\.co/);
    assert.match(policy, /object-src 'none'/);
    assert.doesNotMatch(policy, /unsafe-inline|unsafe-eval/);
  }
});

test('every curated story has a linked bilingual long-form article', () => {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('data/editorial.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('data/articles.js', 'utf8'), context);

  for (const story of context.window.KCULTURE_EDITORIAL) {
    const article = context.window.KCULTURE_ARTICLES[story.id];
    assert.ok(article, `missing article for ${story.id}`);
    assert.ok(article.en.length >= 4, `English article is too short for ${story.id}`);
    assert.ok(article.ko.length >= 4, `Korean article is too short for ${story.id}`);
    assert.ok(article.en.join(' ').length > story.content.length * 3);
    assert.ok(article.ko.join(' ').length > story.contentKo.length * 3);
  }

  const mainSource = fs.readFileSync('js/main.js', 'utf8');
  assert.match(mainSource, /article\.html\?id=/);
  assert.ok(fs.existsSync('article.html'));
  assert.ok(fs.existsSync('js/article.js'));
});

test('textLength and post validation count emoji as PostgreSQL characters', () => {
  assert.equal(posts.textLength('😀'), 1);
  const result = posts.validatePost({
    title: '😀😀',
    category: 'kpop',
    content: '😀'.repeat(10)
  }, allowedCategories);

  assert.equal(result.isValid, true);
  assert.equal(posts.textLength(result.post.content), 10);
});

test('block editor actions preserve the next line at line starts and newline boundaries', () => {
  assert.equal(posts.applyEditorAction('first\nsecond\nthird', 6, 6, 'heading').value, 'first\n## second\nthird');
  assert.equal(posts.applyEditorAction('first\nsecond\nthird', 0, 6, 'quote').value, '> first\nsecond\nthird');
  assert.equal(posts.applyEditorAction('first\nsecond\nthird', 0, 5, 'list').value, '- first\nsecond\nthird');
});

test('fetchRemotePost requests one numeric ID and maps one valid row', async () => {
  const fetchMock = async (url, options) => {
    assert.equal(url, 'https://example.supabase.co/rest/v1/posts?id=eq.42&select=id,title,category,content,created_at&limit=1');
    assert.equal(options.headers.apikey, 'public-key');
    return { ok: true, json: async () => [{
      id: 42,
      title: 'Remote story',
      category: 'kpop',
      content: 'A valid remotely stored story.',
      created_at: '2026-07-11T00:00:00.000Z'
    }] };
  };

  assert.deepEqual(await posts.fetchRemotePost(
    { url: 'https://example.supabase.co', publishableKey: 'public-key' }, '42', fetchMock
  ), {
    id: '42', title: 'Remote story', category: 'kpop', content: 'A valid remotely stored story.',
    createdAt: '2026-07-11T00:00:00.000Z'
  });
});

test('fetchRemotePost returns null for invalid or missing IDs and reports request failures', async () => {
  let requested = false;
  const config = { url: 'https://example.supabase.co', publishableKey: 'public-key' };
  assert.equal(await posts.fetchRemotePost(config, 'not-an-id', async () => { requested = true; }), null);
  assert.equal(requested, false);
  assert.equal(await posts.fetchRemotePost(config, '404', async () => ({ ok: true, json: async () => [] })), null);
  await assert.rejects(
    posts.fetchRemotePost(config, '42', async () => ({ ok: false, status: 503 })),
    (error) => error.status === 503 && /load post \(503\)/i.test(error.message)
  );
});

test('publish and update surface Supabase HTTP status failures', async () => {
  const config = { url: 'https://example.supabase.co', publishableKey: 'public-key' };
  const post = { title: 'Food note', category: 'kfood', content: 'A sufficiently long post.' };
  const failedRequest = async () => ({ ok: false, status: 403 });

  await assert.rejects(
    posts.publishRemotePost(config, post, 'admin-access-token', failedRequest),
    (error) => error.status === 403 && /publish post \(403\)/i.test(error.message)
  );
  await assert.rejects(
    posts.updateRemotePost(config, '8', post, 'admin-access-token', failedRequest),
    (error) => error.status === 403 && /update post \(403\)/i.test(error.message)
  );
});

test('fetchRemotePosts requests deterministic ordering for equal timestamps', async () => {
  let requestedUrl = '';
  const result = await posts.fetchRemotePosts(
    { url: 'https://example.supabase.co', publishableKey: 'public-key' },
    async (url) => {
      requestedUrl = url;
      return { ok: true, json: async () => [
        { id: 10, title: 'Newer ID', category: 'kpop', content: 'This is a valid stored post.', created_at: '2026-07-11T00:00:00.000Z' },
        { id: 9, title: 'Older ID', category: 'kpop', content: 'This is another valid stored post.', created_at: '2026-07-11T00:00:00.000Z' }
      ] };
    }
  );

  assert.match(requestedUrl, /order=created_at\.desc,id\.desc/);
  assert.deepEqual(result.map((post) => post.id), ['10', '9']);
});
