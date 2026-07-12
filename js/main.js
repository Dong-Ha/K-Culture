const categories = window.KCULTURE_CATEGORIES || [];
const curatedStories = window.KCULTURE_EDITORIAL || [];
const postUtils = window.KCulturePosts;
const supabaseConfig = window.KCULTURE_SUPABASE;
const SESSION_KEY = "kculture.adminSession";
const translations = {
  en: { skip:"Skip to content",navLabel:"Main navigation",languageLabel:"Language",navLatest:"Latest",navMusic:"Music",navScreen:"Screen",navFood:"Food",navLife:"Lifestyle",allThemes:"All themes",backToTop:"Back to top",heroTitle:"Discover",heroBody:"Explore Korean culture through a song, a scene, or a shared meal—and discover the context behind the Korean Wave.",readLatest:"Read the latest stories",latestTitle:"Fresh from Korea",latestBody:"The K-culture guides to read first.",musicTitle:"K-pop beyond the stage",musicBody:"New ways to understand the music, performance, and fandom.",screenTitle:"Reading Korea through K-drama",screenBody:"Meet contemporary Korea through characters, places, and soundtracks.",foodTitle:"K-food is made to be shared",foodBody:"Seasonal flavors, markets, and the culture of a shared table.",lifeTitle:"Wear, walk, and experience Korea",lifeBody:"A cultural journey through style, seasonal festivals, and cities.",themesTitle:"Find your way into K-culture",aboutTitle:"Go beyond consuming K-culture.<br>Start understanding it.",aboutBody:"This journal connects music, screen stories, food, and places so newcomers can explore Korean culture without losing the context.",admin:"Admin",empty:"More stories for this theme are coming soon.",recent:"Recent"},
  ko: { skip:"본문으로 건너뛰기",navLabel:"주요 메뉴",languageLabel:"언어",navLatest:"최신",navMusic:"음악",navScreen:"드라마",navFood:"푸드",navLife:"라이프",allThemes:"테마 전체",backToTop:"맨 위로 이동",heroTitle:"오늘의",heroBody:"노래 한 곡, 장면 하나, 한 끼의 음식에서 시작하는 한국 문화 이야기. 익숙한 한류를 더 깊고 넓게 탐험합니다.",readLatest:"최신 이야기 읽기",latestTitle:"새로 올라온 이야기",latestBody:"지금 가장 먼저 읽어볼 K-컬처 가이드입니다.",musicTitle:"K-pop, 무대 뒤의 문화",musicBody:"음악과 퍼포먼스, 팬덤을 이해하는 새로운 관점.",screenTitle:"K-드라마로 읽는 한국",screenBody:"인물과 공간, OST에 담긴 오늘의 한국을 만납니다.",foodTitle:"한식, 함께 먹는 이야기",foodBody:"계절의 맛과 시장, 함께 차리는 밥상의 문화.",lifeTitle:"입고, 걷고, 경험하는 한국",lifeBody:"스타일과 계절 축제, 도시를 잇는 문화 여행.",themesTitle:"관심사로 찾아보기",aboutTitle:"K-컬처를 소비하는 데서<br>이해하는 데까지.",aboutBody:"이 저널은 처음 한국 문화를 만나는 사람도 맥락을 놓치지 않도록 음악, 화면, 음식과 장소 사이의 연결을 기록합니다.",admin:"관리자",empty:"이 테마의 이야기를 준비하고 있습니다.",recent:"최근"}
};
const categoryKo = { kpop:["K-pop","에너지 넘치는 음악과 퍼포먼스, 팬덤, 시각적 스토리텔링."], kdrama:["K-드라마","로맨스, 스릴러, 역사와 일상을 아우르는 감성적인 이야기."], kfood:["K-푸드","함께 먹는 밥상, 강렬한 맛, 발효 음식과 길거리 간식."], hanbok:["한복과 패션","전통의 실루엣과 현대적인 스타일의 영향."], festivals:["축제","계절의 기념일과 지역 행사, 문화 의식."], travel:["여행","도시와 자연, 궁궐, 카페, 시장과 문화 거리."] };

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
let language = "en";

function readSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || null; } catch { return null; }
}
function saveSession(value) {
  session = value;
  try { value ? sessionStorage.setItem(SESSION_KEY, JSON.stringify(value)) : sessionStorage.removeItem(SESSION_KEY); } catch {}
}
function getBrowserStorage() { try { return window.localStorage; } catch { return null; } }
function categoryLabel(id) { return language === "ko" ? (categoryKo[id]?.[0] || id) : (categoryMap.get(id)?.title || id); }
function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? translations[language].recent : new Intl.DateTimeFormat(language === "ko" ? "ko-KR" : "en-US", { year: "numeric", month: "long", day: "numeric" }).format(date);
}
function sortStories(items) { return items.slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)); }
function storyCard(story, index = 0) {
  const article = document.createElement("a");
  article.className = "story-card";
  article.href = `article.html?id=${encodeURIComponent(story.id)}&lang=${language}`;
  article.setAttribute("aria-label", `${language === "ko" ? (story.titleKo || story.title) : story.title} — ${language === "ko" ? "글 읽기" : "Read story"}`);
  const art = document.createElement("div"); art.className = "story-art"; art.setAttribute("aria-hidden", "true"); art.dataset.theme = story.category;
  const meta = document.createElement("div"); meta.className = "story-meta";
  const category = document.createElement("span"); category.textContent = categoryLabel(story.category);
  const readTime = document.createElement("span"); readTime.textContent = story.readTime || `${Math.max(2, Math.ceil(story.content.length / 90))} min`;
  const title = document.createElement("h3"); title.textContent = language === "ko" ? (story.titleKo || story.title) : story.title;
  const content = document.createElement("p"); content.textContent = language === "ko" ? (story.contentKo || story.content) : story.content;
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
    else { const empty = document.createElement("p"); empty.className = "empty-stories"; empty.textContent = translations[language].empty; grid.replaceChildren(empty); }
  });
}
function renderCategories() {
  const grid = document.querySelector("#category-grid");
  grid.replaceChildren(); postCategory.replaceChildren(new Option(language === "ko" ? "테마 선택" : "Choose a theme", ""));
  categories.forEach((item) => {
    const card = document.createElement("a"); card.className = "category-card";
    card.href = ({ kpop: "#music", kdrama: "#screen", kfood: "#table" })[item.id] || "#lifestyle";
    const icon = document.createElement("b"); icon.textContent = item.icon;
    const copy = document.createElement("div"); const strong = document.createElement("strong"); strong.textContent = language === "ko" ? categoryKo[item.id][0] : item.title;
    const summary = document.createElement("span"); summary.textContent = language === "ko" ? categoryKo[item.id][1] : item.summary; copy.append(strong, document.createElement("br"), summary);
    const arrow = document.createElement("b"); arrow.textContent = "→"; card.append(icon, copy, arrow); grid.append(card);
  });
  categories.forEach((item) => { const option = document.createElement("option"); option.value = item.id; option.textContent = item.title; postCategory.append(option); });
}
function setLanguage(nextLanguage) {
  language = nextLanguage === "ko" ? "ko" : "en";
  document.documentElement.lang = language;
  document.querySelectorAll("[data-i18n]").forEach((element) => { element.innerHTML = translations[language][element.dataset.i18n]; });
  document.querySelectorAll("[data-i18n-aria]").forEach((element) => { element.setAttribute("aria-label", translations[language][element.dataset.i18nAria]); });
  document.querySelectorAll("[data-language]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.language === language)));
  renderCategories(); renderStories();
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

document.querySelectorAll("[data-language]").forEach((button) => button.addEventListener("click", () => setLanguage(button.dataset.language)));
setLanguage("en"); updateAdminView(); loadRemoteStories();
