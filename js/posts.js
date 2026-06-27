(function attachPostUtilities(global) {
  const STORAGE_KEY = "kculture.communityPosts";
  const MAX_POSTS = 50;
  const TITLE_MAX_LENGTH = 80;
  const CONTENT_MAX_LENGTH = 420;
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

  function normalizePost(input) {
    return {
      title: normalizeText(input && input.title),
      category: normalizeText(input && input.category),
      content: normalizeText(input && input.content)
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

  const api = {
    STORAGE_KEY,
    MAX_POSTS,
    TITLE_MAX_LENGTH,
    CONTENT_MAX_LENGTH,
    DEFAULT_CATEGORY_IDS,
    DEFAULT_POSTS,
    normalizeText,
    normalizePost,
    getAllowedCategories,
    validatePost,
    createPost,
    isValidStoredPost,
    safeParsePosts,
    loadPosts,
    savePosts
  };

  global.KCulturePosts = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
