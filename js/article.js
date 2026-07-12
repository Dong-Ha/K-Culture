(function renderArticlePage() {
  const params = new URLSearchParams(window.location.search);
  const storyId = params.get("id");
  const categories = new Map((window.KCULTURE_CATEGORIES || []).map((item) => [item.id, item]));
  const curated = window.KCULTURE_EDITORIAL || [];
  const details = window.KCULTURE_ARTICLES || {};
  let story = curated.find((item) => item.id === storyId);
  let language = params.get("lang") === "ko" ? "ko" : "en";

  function categoryLabel(category) {
    const korean = { kpop: "K-pop", kdrama: "K-드라마", kfood: "K-푸드", hanbok: "한복과 패션", festivals: "축제", travel: "여행" };
    return language === "ko" ? (korean[category] || category) : (categories.get(category)?.title || category);
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat(language === "ko" ? "ko-KR" : "en-US", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
  }

  function render() {
    document.documentElement.lang = language;
    document.querySelectorAll("[data-language]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.language === language)));
    document.querySelector("[data-back-label]").textContent = language === "ko" ? "모든 이야기" : "All stories";
    if (!story) { document.querySelector("#article-missing").hidden = false; return; }
    const title = language === "ko" ? (story.titleKo || story.title) : story.title;
    const deck = language === "ko" ? (story.contentKo || story.content) : story.content;
    const paragraphs = details[story.id]?.[language] || [deck];
    document.title = `${title} | K-Culture Journal`;
    document.querySelector('meta[name="description"]').content = deck;
    document.querySelector("#article-category").textContent = categoryLabel(story.category);
    document.querySelector("#article-title").textContent = title;
    document.querySelector("#article-deck").textContent = deck;
    document.querySelector("#article-date").dateTime = story.createdAt;
    document.querySelector("#article-date").textContent = formatDate(story.createdAt);
    document.querySelector("#article-read-time").textContent = story.readTime || (language === "ko" ? "2분 읽기" : "2 min read");
    document.querySelector("#article-art").dataset.theme = story.category;
    document.querySelector("#article-body").replaceChildren(...paragraphs.map((text) => { const p = document.createElement("p"); p.textContent = text; return p; }));
    document.querySelector("#article-content").hidden = false;
  }

  async function findRemoteStory() {
    if (story || !storyId || !window.KCulturePosts || !window.KCULTURE_SUPABASE) return;
    try { story = (await window.KCulturePosts.fetchRemotePosts(window.KCULTURE_SUPABASE)).find((item) => item.id === storyId); } catch (error) { console.error(error); }
  }

  document.querySelectorAll("[data-language]").forEach((button) => button.addEventListener("click", () => {
    language = button.dataset.language;
    const url = new URL(window.location.href); url.searchParams.set("lang", language); history.replaceState(null, "", url);
    render();
  }));
  findRemoteStory().finally(render);
})();
