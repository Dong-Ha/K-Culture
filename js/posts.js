(function attachPostUtilities(global) {
  const STORAGE_KEY = "kculture.communityPosts";
  const MAX_POSTS = 50;
  const TITLE_MAX_LENGTH = 80;
  const CONTENT_MAX_LENGTH = 5000;
  const DEFAULT_CATEGORY_IDS = ["kpop", "kdrama", "kfood", "hanbok", "festivals", "travel"];
  const DEFAULT_POSTS = [
    {
      id: "starter-kfood-route",
      title: "My first K-food route",
      category: "kfood",
      content: "Start with gimbap, tteokbokki, and a simple banchan tasting note.",
      createdAt: "2026-01-01T00:00:00.000Z"
    }
  ];

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function normalizeContent(value) {
    return String(value || "")
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((line) => line.replace(/[\t ]+/g, " ").trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function normalizePost(input) {
    return {
      title: normalizeText(input && input.title),
      category: normalizeText(input && input.category),
      content: normalizeContent(input && input.content)
    };
  }

  function getAllowedCategories(allowedCategories) {
    const categories = Array.isArray(allowedCategories) && allowedCategories.length
      ? allowedCategories
      : DEFAULT_CATEGORY_IDS;

    return new Set(categories.map(normalizeText).filter(Boolean));
  }

  function validatePost(input, allowedCategories) {
    const post = normalizePost(input);
    const categorySet = getAllowedCategories(allowedCategories);
    const errors = {};

    if (post.title.length < 2) {
      errors.title = "Title must be at least 2 characters.";
    } else if (post.title.length > TITLE_MAX_LENGTH) {
      errors.title = `Title must be ${TITLE_MAX_LENGTH} characters or fewer.`;
    }

    if (!post.category) {
      errors.category = "Choose a category.";
    } else if (!categorySet.has(post.category)) {
      errors.category = "Choose a valid category.";
    }

    if (post.content.length < 10) {
      errors.content = "Post content must be at least 10 characters.";
    } else if (post.content.length > CONTENT_MAX_LENGTH) {
      errors.content = `Post content must be ${CONTENT_MAX_LENGTH} characters or fewer.`;
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      post
    };
  }

  function createPost(input, now, allowedCategories) {
    const validation = validatePost(input, allowedCategories);

    if (!validation.isValid) {
      return validation;
    }

    const createdAt = now || new Date().toISOString();
    const slug = validation.post.title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, "-")
      .replace(/^-+|-+$/g, "") || "post";

    return {
      isValid: true,
      errors: {},
      post: {
        id: `${slug}-${Date.parse(createdAt) || Date.now()}`,
        ...validation.post,
        createdAt
      }
    };
  }

  function isValidStoredPost(post, allowedCategories) {
    if (!post || typeof post !== "object") {
      return false;
    }

    if (![post.id, post.title, post.category, post.content, post.createdAt].every((value) => typeof value === "string")) {
      return false;
    }

    if (Number.isNaN(Date.parse(post.createdAt))) {
      return false;
    }

    return validatePost(post, allowedCategories).isValid;
  }

  function safeParsePosts(raw, allowedCategories) {
    if (!raw) {
      return DEFAULT_POSTS.slice();
    }

    try {
      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        return DEFAULT_POSTS.slice();
      }

      const validPosts = parsed.filter((post) => isValidStoredPost(post, allowedCategories));
      return validPosts.slice(0, MAX_POSTS);
    } catch {
      return DEFAULT_POSTS.slice();
    }
  }

  function loadPosts(storage, allowedCategories) {
    if (!storage) {
      return DEFAULT_POSTS.slice();
    }

    try {
      return safeParsePosts(storage.getItem(STORAGE_KEY), allowedCategories);
    } catch {
      return DEFAULT_POSTS.slice();
    }
  }

  function savePosts(storage, posts) {
    if (!storage) {
      return false;
    }

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(posts.slice(0, MAX_POSTS)));
      return true;
    } catch {
      return false;
    }
  }

  function getSupabaseHeaders(publishableKey, extraHeaders, accessToken) {
    return {
      apikey: publishableKey,
      ...extraHeaders,
      Authorization: `Bearer ${accessToken || publishableKey}`
    };
  }

  function requireAccessToken(accessToken) {
    if (typeof accessToken !== "string" || !accessToken.trim()) {
      throw new Error("A valid administrator session is required.");
    }

    return accessToken;
  }

  function toRemotePost(post) {
    return {
      title: post.title,
      category: post.category,
      content: post.content
    };
  }

  function getPostExcerpt(content, maxLength = 180) {
    const plain = normalizeText(String(content || "")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[*_#>`~-]/g, " "));

    if (plain.length <= maxLength) return plain;
    return `${plain.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
  }

  function applyEditorAction(value, selectionStart, selectionEnd, action) {
    const source = String(value || "");
    const start = Math.max(0, Number(selectionStart) || 0);
    const end = Math.max(start, Number(selectionEnd) || start);
    const selected = source.slice(start, end);
    const inlineActions = {
      bold: ["**", "**", "bold text"],
      italic: ["*", "*", "italic text"],
      link: ["[", "](https://)", "link text"]
    };

    if (inlineActions[action]) {
      const [before, after, placeholder] = inlineActions[action];
      const text = selected || placeholder;
      return {
        value: `${source.slice(0, start)}${before}${text}${after}${source.slice(end)}`,
        selectionStart: start + before.length,
        selectionEnd: start + before.length + text.length
      };
    }

    const lineStart = source.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const lineEndMatch = source.indexOf("\n", end);
    const lineEnd = lineEndMatch === -1 ? source.length : lineEndMatch;
    const lines = source.slice(lineStart, lineEnd).split("\n");
    const prefix = action === "heading" ? "## " : action === "quote" ? "> " : action === "list" ? "- " : "";
    if (!prefix) return { value: source, selectionStart: start, selectionEnd: end };
    const replacement = lines.map((line) => `${prefix}${line || (action === "list" ? "list item" : "text")}`).join("\n");
    return {
      value: `${source.slice(0, lineStart)}${replacement}${source.slice(lineEnd)}`,
      selectionStart: lineStart + prefix.length,
      selectionEnd: lineStart + replacement.length
    };
  }

  function appendInlineContent(parent, text, documentRef) {
    const pattern = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g;
    let cursor = 0;
    for (const match of String(text || "").matchAll(pattern)) {
      parent.append(documentRef.createTextNode(text.slice(cursor, match.index)));
      const token = match[0];
      if (token.startsWith("**")) {
        const strong = documentRef.createElement("strong"); strong.textContent = token.slice(2, -2); parent.append(strong);
      } else if (token.startsWith("*")) {
        const em = documentRef.createElement("em"); em.textContent = token.slice(1, -1); parent.append(em);
      } else {
        const parts = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
        const link = documentRef.createElement("a"); link.textContent = parts[1]; link.href = parts[2]; link.rel = "noopener noreferrer"; parent.append(link);
      }
      cursor = match.index + token.length;
    }
    parent.append(documentRef.createTextNode(String(text || "").slice(cursor)));
  }

  function renderPostContent(container, content, documentRef) {
    const doc = documentRef || global.document;
    if (!container || !doc) return;
    const lines = normalizeContent(content).split("\n");
    const nodes = [];
    let index = 0;

    while (index < lines.length) {
      if (!lines[index]) { index += 1; continue; }
      if (lines[index].startsWith("- ")) {
        const list = doc.createElement("ul");
        while (index < lines.length && lines[index].startsWith("- ")) {
          const item = doc.createElement("li"); appendInlineContent(item, lines[index].slice(2), doc); list.append(item); index += 1;
        }
        nodes.push(list); continue;
      }
      const line = lines[index];
      const tag = line.startsWith("## ") ? "h3" : line.startsWith("> ") ? "blockquote" : "p";
      const text = tag === "p" ? line : line.slice(tag === "h3" ? 3 : 2);
      const node = doc.createElement(tag); appendInlineContent(node, text, doc); nodes.push(node); index += 1;
    }

    container.replaceChildren(...nodes);
  }

  function fromRemotePost(post) {
    return {
      id: String(post.id),
      title: post.title,
      category: post.category,
      content: post.content,
      createdAt: post.created_at
    };
  }

  async function fetchRemotePosts(config, fetchImpl) {
    const request = fetchImpl || global.fetch;
    const response = await request(
      `${config.url}/rest/v1/posts?select=id,title,category,content,created_at&order=created_at.desc&limit=${MAX_POSTS}`,
      { headers: getSupabaseHeaders(config.publishableKey) }
    );

    if (!response.ok) {
      throw new Error(`Unable to load posts (${response.status}).`);
    }

    const data = await response.json();
    return data.map(fromRemotePost).filter((post) => isValidStoredPost(post));
  }

  async function publishRemotePost(config, post, accessToken, fetchImpl) {
    const request = fetchImpl || global.fetch;
    const token = requireAccessToken(accessToken);
    const response = await request(`${config.url}/rest/v1/posts?select=id,title,category,content,created_at`, {
      method: "POST",
      headers: getSupabaseHeaders(config.publishableKey, {
        "Content-Type": "application/json",
        Prefer: "return=representation"
      }, token),
      body: JSON.stringify(toRemotePost(post))
    });

    if (!response.ok) {
      throw new Error(`Unable to publish post (${response.status}).`);
    }

    const data = await response.json();
    return fromRemotePost(data[0]);
  }

  async function updateRemotePost(config, postId, post, accessToken, fetchImpl) {
    const request = fetchImpl || global.fetch;
    const token = requireAccessToken(accessToken);
    const id = String(postId || "").trim();
    if (!id) throw new Error("A post is required for editing.");
    const response = await request(`${config.url}/rest/v1/posts?id=eq.${encodeURIComponent(id)}&select=id,title,category,content,created_at`, {
      method: "PATCH",
      headers: getSupabaseHeaders(config.publishableKey, {
        "Content-Type": "application/json",
        Prefer: "return=representation"
      }, token),
      body: JSON.stringify(toRemotePost(post))
    });

    if (!response.ok) {
      throw new Error(`Unable to update post (${response.status}).`);
    }

    const data = await response.json();
    if (!data[0]) throw new Error("The post could not be found or edited.");
    return fromRemotePost(data[0]);
  }

  async function signInAdmin(config, credentials, fetchImpl) {
    const request = fetchImpl || global.fetch;
    const response = await request(`${config.url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: getSupabaseHeaders(config.publishableKey, { "Content-Type": "application/json" }),
      body: JSON.stringify(credentials)
    });

    if (!response.ok) {
      throw new Error("Invalid administrator credentials.");
    }

    return response.json();
  }

  async function verifyAdminSession(config, accessToken, fetchImpl) {
    const request = fetchImpl || global.fetch;
    const token = requireAccessToken(accessToken);
    const headers = getSupabaseHeaders(config.publishableKey, undefined, token);
    const userResponse = await request(`${config.url}/auth/v1/user`, { headers });

    if (!userResponse.ok) {
      throw new Error("The administrator session is invalid or expired.");
    }

    const user = await userResponse.json();
    const membershipResponse = await request(`${config.url}/rest/v1/rpc/is_admin`, {
      method: "POST",
      headers: getSupabaseHeaders(config.publishableKey, {
        "Content-Type": "application/json"
      }, token),
      body: "{}"
    });

    if (!membershipResponse.ok || await membershipResponse.json() !== true) {
      throw new Error("This account does not have administrator privileges.");
    }

    return user;
  }

  const api = {
    STORAGE_KEY,
    MAX_POSTS,
    TITLE_MAX_LENGTH,
    CONTENT_MAX_LENGTH,
    DEFAULT_CATEGORY_IDS,
    DEFAULT_POSTS,
    normalizeText,
    normalizeContent,
    normalizePost,
    getAllowedCategories,
    validatePost,
    createPost,
    isValidStoredPost,
    safeParsePosts,
    loadPosts,
    savePosts,
    getSupabaseHeaders,
    requireAccessToken,
    toRemotePost,
    fromRemotePost,
    getPostExcerpt,
    applyEditorAction,
    renderPostContent,
    fetchRemotePosts,
    publishRemotePost,
    updateRemotePost,
    signInAdmin,
    verifyAdminSession
  };

  global.KCulturePosts = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
