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
    const content = language === "ko" ? (story.contentKo || story.content) : story.content;
    const deck = details[story.id] ? content : window.KCulturePosts.getPostExcerpt(content, 220);
    const paragraphs = details[story.id]?.[language];
    document.title = `${title} | K-Culture Journal`;
    document.querySelector('meta[name="description"]').content = deck;
    document.querySelector("#article-category").textContent = categoryLabel(story.category);
    document.querySelector("#article-title").textContent = title;
    document.querySelector("#article-deck").textContent = deck;
    document.querySelector("#article-date").dateTime = story.createdAt;
    document.querySelector("#article-date").textContent = formatDate(story.createdAt);
    const minutes = Math.max(2, Math.ceil(window.KCulturePosts.getPostExcerpt(content, 10000).length / 500));
    document.querySelector("#article-read-time").textContent = story.readTime || (language === "ko" ? `${minutes}분 읽기` : `${minutes} min read`);
    const diagram = details[story.id]?.diagram;
    const art = document.querySelector("#article-art");
    art.dataset.theme = story.category;
    art.hidden = Boolean(diagram);
    const body = document.querySelector("#article-body");
    if (paragraphs) body.replaceChildren(...paragraphs.map((text) => { const p = document.createElement("p"); p.textContent = text; return p; }));
    else window.KCulturePosts.renderPostContent(body, content);
    const previousDiagram = document.querySelector(".article-diagram");
    if (previousDiagram) previousDiagram.remove();
    if (diagram) {
      const figure = document.createElement("figure");
      figure.className = "article-diagram";
      const frame = document.createElement("iframe");
      const diagramPath = diagram.path + (language === "ko" ? "#ko" : "");
      frame.src = diagramPath;
      frame.title = language === "ko" ? diagram.titleKo : diagram.title;
      frame.setAttribute("sandbox", "");
      frame.loading = "lazy";
      const caption = document.createElement("figcaption");
      caption.textContent = language === "ko" ? diagram.captionKo : diagram.caption;
      const link = document.createElement("a");
      link.href = diagramPath;
      link.textContent = language === "ko" ? "다이어그램 크게 보기" : "Open full diagram";
      figure.append(frame, caption, link);
      body.before(figure);
    }
    document.querySelector("#article-content").hidden = false;
  }

  async function findRemoteStory() {
    if (story || !storyId || !window.KCulturePosts || !window.KCULTURE_SUPABASE) return;
    try { story = await window.KCulturePosts.fetchRemotePost(window.KCULTURE_SUPABASE, storyId); } catch (error) { console.error(error); }
  }

  document.querySelectorAll("[data-language]").forEach((button) => button.addEventListener("click", () => {
    language = button.dataset.language;
    const url = new URL(window.location.href); url.searchParams.set("lang", language); history.replaceState(null, "", url);
    render();
  }));
  findRemoteStory().finally(render);
})();
