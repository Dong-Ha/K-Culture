const categories = window.KCULTURE_CATEGORIES || [];
const postUtils = window.KCulturePosts;
const supabaseConfig = window.KCULTURE_SUPABASE;

const categoryGrid = document.querySelector("#category-grid");
const featureTitle = document.querySelector("#feature-title");
const featureDescription = document.querySelector("#feature-description");
const featureKeywords = document.querySelector("#feature-keywords");
const featureExamples = document.querySelector("#feature-examples");
const postForm = document.querySelector("#post-form");
const postCategory = document.querySelector("#post-category");
const postBoard = document.querySelector("#post-board");
const postList = document.querySelector("#post-list");
const postCount = document.querySelector("#post-count");
const postStatus = document.querySelector("#post-status");
const postErrors = {
  title: document.querySelector("#post-title-error"),
  category: document.querySelector("#post-category-error"),
  content: document.querySelector("#post-content-error")
};

function getBrowserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const allowedCategoryIds = categories.map((category) => category.id);
let posts = postUtils ? postUtils.loadPosts(getBrowserStorage(), allowedCategoryIds) : [];

function createListItems(items) {
  return items.map((item) => `<li>${item}</li>`).join("");
}

function setActiveCategory(categoryId) {
  const category = categories.find((item) => item.id === categoryId) || categories[0];

  if (!category) {
    return;
  }

  featureTitle.textContent = category.title;
  featureDescription.textContent = category.description;
  featureKeywords.innerHTML = createListItems(category.keywords);
  featureExamples.innerHTML = createListItems(category.examples);

  document.querySelectorAll(".category-card").forEach((card) => {
    const isActive = card.dataset.categoryId === category.id;
    card.classList.toggle("is-active", isActive);
    card.setAttribute("aria-pressed", String(isActive));
  });
}

function renderCategories() {
  if (!categoryGrid) {
    return;
  }

  categoryGrid.innerHTML = categories.map((category, index) => `
    <button class="category-card" type="button" data-category-id="${category.id}" aria-pressed="${index === 0}">
      <span class="category-meta">
        <span class="category-icon" aria-hidden="true">${category.icon}</span>
        <span class="category-number">0${index + 1}</span>
      </span>
      <span class="category-title">${category.title}</span>
      <span class="category-summary">${category.summary}</span>
      <span class="category-technique">${category.keywords.slice(0, 3).join(" · ")}</span>
    </button>
  `).join("");

  categoryGrid.addEventListener("click", (event) => {
    const card = event.target.closest(".category-card");

    if (card) {
      setActiveCategory(card.dataset.categoryId);
    }
  });
}

function formatPostDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function getCategoryLabel(categoryId) {
  return categories.find((category) => category.id === categoryId)?.title || categoryId;
}

function renderPostCategoryOptions() {
  if (!postCategory) {
    return;
  }

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.title;
    postCategory.append(option);
  });
}

function renderPosts() {
  if (!postList || !postCount) {
    return;
  }

  postList.innerHTML = "";
  postCount.textContent = `${posts.length} ${posts.length === 1 ? "post" : "posts"}`;

  if (!posts.length) {
    const empty = document.createElement("p");
    empty.className = "empty-posts";
    empty.textContent = "No posts yet. Publish the first K-culture note.";
    postList.append(empty);
    return;
  }

  posts.forEach((post) => {
    const article = document.createElement("article");
    article.className = "post-card";

    const category = document.createElement("span");
    category.className = "post-category-pill";
    category.textContent = getCategoryLabel(post.category);

    const title = document.createElement("h4");
    title.textContent = post.title;

    const content = document.createElement("p");
    content.textContent = post.content;

    const created = document.createElement("time");
    created.dateTime = post.createdAt;
    created.textContent = formatPostDate(post.createdAt);

    article.append(category, title, content, created);
    postList.append(article);
  });
}

function setFormErrors(errors) {
  Object.entries(postErrors).forEach(([field, element]) => {
    const control = postForm?.elements[field];
    const message = errors[field] || "";

    if (element) {
      element.textContent = message;
    }

    if (control) {
      control.setAttribute("aria-invalid", String(Boolean(message)));
    }
  });
}

async function handlePostSubmit(event) {
  event.preventDefault();

  if (!postUtils) {
    return;
  }

  const formData = new FormData(postForm);
  const result = postUtils.createPost({
    title: formData.get("title"),
    category: formData.get("category"),
    content: formData.get("content")
  }, undefined, allowedCategoryIds);

  setFormErrors(result.errors);

  if (!result.isValid) {
    postStatus.textContent = "Please fix the highlighted fields.";
    return;
  }

  const submitButton = postForm.querySelector('[type="submit"]');
  submitButton.disabled = true;
  postStatus.textContent = "Publishing post...";

  try {
    const publishedPost = await postUtils.publishRemotePost(supabaseConfig, result.post);
    posts = [publishedPost, ...posts].slice(0, postUtils.MAX_POSTS);
    postUtils.savePosts(getBrowserStorage(), posts);
    postForm.reset();
    postStatus.textContent = "Post published for everyone.";
    renderPosts();
  } catch (error) {
    console.error(error);
    postStatus.textContent = "Post could not be published. Please try again.";
  } finally {
    submitButton.disabled = false;
  }
}

async function setupPosts() {
  if (!postForm || !postUtils) {
    return;
  }

  renderPostCategoryOptions();
  renderPosts();
  postForm.addEventListener("submit", handlePostSubmit);
  postForm.hidden = false;

  if (postBoard) {
    postBoard.hidden = false;
  }

  if (!supabaseConfig) {
    postStatus.textContent = "Shared posts are not configured. Showing posts saved on this device.";
    return;
  }

  postStatus.textContent = "Loading shared posts...";

  try {
    posts = await postUtils.fetchRemotePosts(supabaseConfig);
    postUtils.savePosts(getBrowserStorage(), posts);
    renderPosts();
    postStatus.textContent = "";
  } catch (error) {
    console.error(error);
    postStatus.textContent = "Shared posts are temporarily unavailable. Showing posts saved on this device.";
  }
}

renderCategories();
setActiveCategory(categories[0]?.id);
setupPosts();
