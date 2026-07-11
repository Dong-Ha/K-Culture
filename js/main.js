const categories = window.KCULTURE_CATEGORIES || [];
const curatedStories = window.KCULTURE_EDITORIAL || [];
const postUtils = window.KCulturePosts;
const supabaseConfig = window.KCULTURE_SUPABASE;
const SESSION_KEY = "kculture.adminSession";

const categoryMap = new Map(categories.map((category) => [category.id, category]));
const postForm = document.querySelector("#post-form");
const loginForm = document.querySelector("#login-form");
const postCategory = document.querySelector("#post-category");
const postStatus = document.querySelector("#post-status");
const adminDialog = document.querySelector("#admin-dialog");
const postErrors = {
  title: document.querySelector("#post-title-error"),
  category: document.querySelector("#post-category-error"),
  content: document.querySelector("#post-content-error")
};
let stories = curatedStories.slice();
let session = readSession();

function readSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || null; } catch { return null; }
}
function saveSession(value) {
  session = value;
  try { value ? sessionStorage.setItem(SESSION_KEY, JSON.stringify(value)) : sessionStorage.removeItem(SESSION_KEY); } catch {}
}
function getBrowserStorage() { try { return window.localStorage; } catch { return null; } }
function categoryLabel(id) { return categoryMap.get(id)?.title || id; }
function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "최근" : new Intl.DateTimeFormat("ko", { year: "numeric", month: "long", day: "numeric" }).format(date);
}
function sortStories(items) { return items.slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)); }
function storyCard(story, index = 0) {
  const article = document.createElement("article");
  article.className = "story-card";
  const art = document.createElement("div"); art.className = "story-art"; art.setAttribute("aria-hidden", "true"); art.dataset.theme = story.category;
  const meta = document.createElement("div"); meta.className = "story-meta";
  const category = document.createElement("span"); category.textContent = categoryLabel(story.category);
  const readTime = document.createElement("span"); readTime.textContent = story.readTime || `${Math.max(2, Math.ceil(story.content.length / 90))} min`;
  const title = document.createElement("h3"); title.textContent = story.title;
  const content = document.createElement("p"); content.textContent = story.content;
  const time = document.createElement("time"); time.dateTime = story.createdAt; time.textContent = formatDate(story.createdAt);
  meta.append(category, readTime); article.append(art, meta, title, content, time); return article;
}
function renderStories() {
  const ordered = sortStories(stories);
  const latest = document.querySelector("#latest-grid"); latest.replaceChildren(...ordered.slice(0, 5).map(storyCard));
  document.querySelectorAll(".theme-section").forEach((section) => {
    const ids = section.dataset.categories.split(",");
    const matches = ordered.filter((story) => ids.includes(story.category)).slice(0, 6);
    const grid = section.querySelector("[data-story-grid]");
    if (matches.length) grid.replaceChildren(...matches.map(storyCard));
    else { const empty = document.createElement("p"); empty.className = "empty-stories"; empty.textContent = "이 테마의 이야기를 준비하고 있습니다."; grid.replaceChildren(empty); }
  });
}
function renderCategories() {
  const grid = document.querySelector("#category-grid");
  categories.forEach((item) => {
    const card = document.createElement("a"); card.className = "category-card";
    card.href = ({ kpop: "#music", kdrama: "#screen", kfood: "#table" })[item.id] || "#lifestyle";
    const icon = document.createElement("b"); icon.textContent = item.icon;
    const copy = document.createElement("div"); const strong = document.createElement("strong"); strong.textContent = item.title;
    const summary = document.createElement("span"); summary.textContent = item.summary; copy.append(strong, document.createElement("br"), summary);
    const arrow = document.createElement("b"); arrow.textContent = "→"; card.append(icon, copy, arrow); grid.append(card);
  });
  categories.forEach((item) => { const option = document.createElement("option"); option.value = item.id; option.textContent = item.title; postCategory.append(option); });
}
function updateAdminView() {
  const signedIn = Boolean(session?.access_token);
  loginForm.hidden = signedIn; postForm.hidden = !signedIn;
  document.querySelector("#admin-email").textContent = session?.user?.email || "관리자";
}
function setFormErrors(errors) {
  Object.entries(postErrors).forEach(([field, element]) => { element.textContent = errors[field] || ""; postForm.elements[field].setAttribute("aria-invalid", String(Boolean(errors[field]))); });
}
async function loadRemoteStories() {
  try {
    const remote = await postUtils.fetchRemotePosts(supabaseConfig);
    postUtils.savePosts(getBrowserStorage(), remote);
    stories = [...remote, ...curatedStories.filter((local) => !remote.some((item) => item.id === local.id))];
    renderStories();
  } catch (error) { console.error(error); }
}
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault(); postStatus.textContent = "로그인 중...";
  const data = new FormData(loginForm);
  try {
    const result = await postUtils.signInAdmin(supabaseConfig, { email: data.get("email"), password: data.get("password") });
    saveSession({ access_token: result.access_token, user: result.user }); loginForm.reset(); updateAdminView(); postStatus.textContent = "관리자로 로그인했습니다.";
  } catch { postStatus.textContent = "로그인에 실패했습니다. 관리자 계정을 확인하세요."; }
});
postForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(postForm);
  const result = postUtils.createPost({ title: data.get("title"), category: data.get("category"), content: data.get("content") }, undefined, categories.map((item) => item.id));
  setFormErrors(result.errors);
  if (!result.isValid) { postStatus.textContent = "입력 내용을 확인하세요."; return; }
  const button = postForm.querySelector('[type="submit"]'); button.disabled = true; postStatus.textContent = "발행 중...";
  try {
    const published = await postUtils.publishRemotePost(supabaseConfig, result.post, session.access_token);
    stories = [published, ...stories]; postForm.reset(); renderStories(); postStatus.textContent = "이야기를 발행했습니다.";
  } catch { postStatus.textContent = "발행하지 못했습니다. 관리자 권한과 세션을 확인하세요."; }
  finally { button.disabled = false; }
});
document.querySelector("#admin-open").addEventListener("click", () => { updateAdminView(); adminDialog.showModal(); });
document.querySelector("#admin-close").addEventListener("click", () => adminDialog.close());
document.querySelector("#logout-button").addEventListener("click", () => { saveSession(null); updateAdminView(); postStatus.textContent = "로그아웃했습니다."; });
adminDialog.addEventListener("click", (event) => { if (event.target === adminDialog) adminDialog.close(); });

renderCategories(); renderStories(); updateAdminView(); loadRemoteStories();
