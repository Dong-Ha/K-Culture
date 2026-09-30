const categories = window.KCULTURE_CATEGORIES || [];
const curatedStories = window.KCULTURE_EDITORIAL || [];
const postUtils = window.KCulturePosts;
const supabaseConfig = window.KCULTURE_SUPABASE;
const SESSION_KEY = "kculture.adminSession";
const ADMIN_LOGIN_DOMAIN = "igaogdhrdtmjxnyezjbp.supabase.co";
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
const adminWorkspace = document.querySelector("#admin-workspace");
const adminPostList = document.querySelector("#admin-post-list");
const postContent = document.querySelector("#post-content");
const postPreview = document.querySelector("#post-preview");
const postCharacterCount = document.querySelector("#post-character-count");
const postSubmitButton = document.querySelector("#post-submit-button");
const cancelEditButton = document.querySelector("#cancel-edit-button");
const draftStatus = document.querySelector("#draft-status");
const postErrors = {
  title: document.querySelector("#post-title-error"),
  category: document.querySelector("#post-category-error"),
  content: document.querySelector("#post-content-error")
};
let stories = curatedStories.slice();
let remoteStories = [];
let session = readSession();
let adminUser = null;
let language = "en";
let editingPostId = null;
let isSaving = false;
let previewTimer;
let storyRevision = 0;
const memoryDrafts = new Map();

function draftKey() {
  return `kculture.draft.${adminUser?.id}.${editingPostId || "new"}`;
}
function saveEditorDraft() {
  if (!adminUser || isSaving) return;
  const draft = { title: postForm.elements.title.value, category: postCategory.value, content: postContent.value };
  const hasContent = Boolean(draft.title || draft.category || draft.content);
  if (hasContent) memoryDrafts.set(draftKey(), draft);
  else memoryDrafts.delete(draftKey());
  try {
    if (hasContent) sessionStorage.setItem(draftKey(), JSON.stringify(draft));
    else sessionStorage.removeItem(draftKey());
    draftStatus.textContent = "Draft saved in this tab. It can be recovered after a reload.";
  } catch {
    draftStatus.textContent = "Draft storage is unavailable. Keep this tab open until you publish.";
  }
}
function restoreEditorDraft() {
  if (!adminUser) return;
  let draft = memoryDrafts.get(draftKey());
  if (!draft) {
    try { draft = JSON.parse(sessionStorage.getItem(draftKey())); } catch {}
  }
  if (!draft || ![draft.title, draft.category, draft.content].every((value) => typeof value === "string")) return;
  postForm.elements.title.value = draft.title;
  postCategory.value = categoryMap.has(draft.category) ? draft.category : "";
  postContent.value = draft.content;
  try {
    if (sessionStorage.getItem(draftKey())) draftStatus.textContent = "Recovered your draft from this tab.";
    else draftStatus.textContent = "Recovered your draft. Keep this tab open until you publish.";
  } catch { draftStatus.textContent = "Recovered your draft. Keep this tab open until you publish."; }
}
function removeEditorDraft() {
  memoryDrafts.delete(draftKey());
  try { sessionStorage.removeItem(draftKey()); } catch {}
  draftStatus.textContent = "";
}
function setEditorBusy(busy) {
  isSaving = busy;
  postForm.setAttribute("aria-busy", String(busy));
  for (const control of postForm.elements) control.disabled = busy;
  adminPostList.querySelectorAll("button").forEach((button) => { button.disabled = busy; });
  document.querySelector("#new-post-button").disabled = busy;
  document.querySelector("#logout-button").disabled = busy;
}

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
  const content = document.createElement("p"); content.textContent = postUtils.getPostExcerpt(language === "ko" ? (story.contentKo || story.content) : story.content);
  const time = document.createElement("time"); time.dateTime = story.createdAt; time.textContent = formatDate(story.createdAt);
  meta.append(category, readTime); article.append(art, meta, title, content, time); return article;
}
function renderStories() {
  const ordered = sortStories(stories);
  const latest = document.querySelector("#latest-grid"); latest.replaceChildren(...ordered.slice(0, 5).map(storyCard));
  const sections = [...document.querySelectorAll(".theme-section")];
  const categorySections = new Map();
  const matchesBySection = sections.map(() => []);
  sections.forEach((section, index) => {
    section.dataset.categories.split(",").forEach((id) => {
      if (!categorySections.has(id)) categorySections.set(id, []);
      categorySections.get(id).push(index);
    });
  });
  ordered.forEach((story) => {
    (categorySections.get(story.category) || []).forEach((index) => {
      if (matchesBySection[index].length < 6) matchesBySection[index].push(story);
    });
  });
  sections.forEach((section, index) => {
    const matches = matchesBySection[index];
    const grid = section.querySelector("[data-story-grid]");
    if (matches.length) grid.replaceChildren(...matches.map(storyCard));
    else { const empty = document.createElement("p"); empty.className = "empty-stories"; empty.textContent = translations[language].empty; grid.replaceChildren(empty); }
  });
}
function renderCategories() {
  const grid = document.querySelector("#category-grid");
  const selectedCategory = postCategory.value;
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
  if (categoryMap.has(selectedCategory)) postCategory.value = selectedCategory;
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
  const signedIn = Boolean(session?.access_token && adminUser);
  loginForm.hidden = signedIn; adminWorkspace.hidden = !signedIn;
  document.querySelector("#admin-email").textContent = adminUser?.user_metadata?.username || adminUser?.email || "관리자";
  if (signedIn) renderAdminPosts();
}
function setFormErrors(errors) {
  Object.entries(postErrors).forEach(([field, element]) => { element.textContent = errors[field] || ""; postForm.elements[field].setAttribute("aria-invalid", String(Boolean(errors[field]))); });
}
function syncStories() {
  const remoteIds = new Set(remoteStories.map((item) => item.id));
  stories = [...remoteStories, ...curatedStories.filter((local) => !remoteIds.has(local.id))];
}
function renderAdminPosts() {
  if (!adminPostList) return;
  if (!remoteStories.length) {
    const empty = document.createElement("p"); empty.className = "admin-empty"; empty.textContent = "No published stories yet."; adminPostList.replaceChildren(empty); return;
  }
  adminPostList.replaceChildren(...sortStories(remoteStories).map((story) => {
    const button = document.createElement("button"); button.type = "button"; button.className = "admin-post-item"; button.dataset.postId = story.id;
    button.disabled = isSaving;
    if (story.id === editingPostId) button.setAttribute("aria-current", "true");
    const title = document.createElement("strong"); title.textContent = story.title;
    const meta = document.createElement("span"); meta.textContent = `${categoryLabel(story.category)} · ${formatDate(story.createdAt)}`;
    button.append(title, meta); return button;
  }));
}
function renderEditorPreview() {
  clearTimeout(previewTimer);
  const content = postContent.value;
  postCharacterCount.textContent = `${postUtils.textLength(content)} / ${postUtils.CONTENT_MAX_LENGTH}`;
  if (!content.trim()) {
    const empty = document.createElement("p"); empty.textContent = "Start writing to preview your story."; postPreview.replaceChildren(empty); return;
  }
  postUtils.renderPostContent(postPreview, content);
}
function resetEditor(recoverDraft = true) {
  editingPostId = null;
  postForm.reset();
  setFormErrors({});
  document.querySelector("#editor-heading").textContent = "Write a new story";
  postSubmitButton.textContent = "Publish story";
  cancelEditButton.hidden = true;
  draftStatus.textContent = "";
  if (recoverDraft) restoreEditorDraft();
  renderEditorPreview(); renderAdminPosts();
}
function beginEdit(postId) {
  if (isSaving) return;
  saveEditorDraft();
  const story = remoteStories.find((item) => item.id === postId);
  if (!story) return;
  editingPostId = story.id;
  postForm.elements.title.value = story.title;
  postForm.elements.category.value = story.category;
  postForm.elements.content.value = story.content;
  setFormErrors({});
  document.querySelector("#editor-heading").textContent = "Edit published story";
  postSubmitButton.textContent = "Save changes";
  cancelEditButton.hidden = false;
  draftStatus.textContent = "";
  restoreEditorDraft();
  renderEditorPreview(); renderAdminPosts();
  postForm.elements.title.focus();
}
async function loadRemoteStories() {
  const loadingRevision = storyRevision;
  try {
    const remote = await postUtils.fetchRemotePosts(supabaseConfig);
    if (storyRevision !== loadingRevision) return;
    postUtils.savePosts(getBrowserStorage(), remote);
    remoteStories = remote; syncStories(); renderStories(); renderAdminPosts();
  } catch (error) { console.error(error); }
}
async function restoreAdminSession() {
  const restoringAccessToken = session?.access_token;
  if (!restoringAccessToken) return;

  try {
    const restoredUser = await postUtils.verifyAdminSession(supabaseConfig, restoringAccessToken);
    if (session?.access_token !== restoringAccessToken) return;
    adminUser = restoredUser;
    saveSession({ ...session, user: restoredUser });
    restoreEditorDraft();
    renderEditorPreview();
  } catch {
    if (session?.access_token !== restoringAccessToken) return;
    adminUser = null;
    saveSession(null);
  }

  updateAdminView();
}
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault(); postStatus.textContent = "로그인 중...";
  const data = new FormData(loginForm);
  const button = loginForm.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    const username = String(data.get("username") || "").trim().toLowerCase();
    const result = await postUtils.signInAdmin(supabaseConfig, { email: `${username}@${ADMIN_LOGIN_DOMAIN}`, password: data.get("password") });
    adminUser = await postUtils.verifyAdminSession(supabaseConfig, result.access_token);
    saveSession({ access_token: result.access_token, user: adminUser }); loginForm.reset(); resetEditor(); updateAdminView(); postStatus.textContent = "관리자로 로그인했습니다.";
  } catch {
    adminUser = null;
    saveSession(null);
    updateAdminView();
    postStatus.textContent = "로그인에 실패했습니다. 관리자 계정과 권한을 확인하세요.";
  } finally {
    button.disabled = false;
  }
});
postForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isSaving) return;
  if (!session?.access_token || !adminUser) {
    adminUser = null;
    saveSession(null);
    updateAdminView();
    postStatus.textContent = "관리자 세션을 다시 확인해 주세요.";
    return;
  }
  const data = new FormData(postForm);
  const result = postUtils.validatePost({ title: data.get("title"), category: data.get("category"), content: data.get("content") }, categories.map((item) => item.id));
  setFormErrors(result.errors);
  if (!result.isValid) { postStatus.textContent = "입력 내용을 확인하세요."; postForm.elements[Object.keys(result.errors)[0]].focus(); return; }
  saveEditorDraft();
  setEditorBusy(true); postStatus.textContent = editingPostId ? "수정 내용을 저장하는 중..." : "발행 중...";
  try {
    if (editingPostId) {
      const updated = await postUtils.updateRemotePost(supabaseConfig, editingPostId, result.post, session.access_token);
      remoteStories = remoteStories.map((story) => story.id === updated.id ? updated : story);
      storyRevision += 1;
      removeEditorDraft(); syncStories(); resetEditor(); renderStories(); postStatus.textContent = "수정 내용을 저장했습니다.";
    } else {
      const published = await postUtils.publishRemotePost(supabaseConfig, result.post, session.access_token);
      remoteStories = [published, ...remoteStories].slice(0, postUtils.MAX_POSTS);
      storyRevision += 1;
      removeEditorDraft(); syncStories(); resetEditor(); renderStories(); postStatus.textContent = "이야기를 발행했습니다.";
    }
    postUtils.savePosts(getBrowserStorage(), remoteStories);
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      adminUser = null; saveSession(null); updateAdminView();
      postStatus.textContent = "세션이 만료되었거나 권한이 없습니다. 다시 로그인하세요. 초안은 이 탭에 보관했습니다.";
    } else if (error.status === 400 || error.status === 409) {
      postStatus.textContent = "서버가 입력 내용을 거부했습니다. 제목·본문 길이와 내용을 확인하세요. 초안은 보관했습니다.";
    } else {
      postStatus.textContent = "저장 결과를 확인하지 못했습니다. 입력 내용은 유지했습니다. 중복 발행을 피하려면 새로고침 후 게시글 목록을 확인하세요.";
    }
  }
  finally { setEditorBusy(false); }
});
postForm.addEventListener("input", () => {
  saveEditorDraft();
  clearTimeout(previewTimer);
  postCharacterCount.textContent = `${postUtils.textLength(postContent.value)} / ${postUtils.CONTENT_MAX_LENGTH}`;
  previewTimer = setTimeout(renderEditorPreview, 150);
});
postForm.querySelector(".editor-toolbar").addEventListener("click", (event) => {
  if (isSaving) return;
  const button = event.target.closest("[data-editor-action]");
  if (!button) return;
  const edit = postUtils.applyEditorAction(postContent.value, postContent.selectionStart, postContent.selectionEnd, button.dataset.editorAction);
  if (postUtils.textLength(edit.value) > postUtils.CONTENT_MAX_LENGTH) { postErrors.content.textContent = "Formatting would exceed the 5,000-character limit."; return; }
  postContent.value = edit.value; postContent.focus(); postContent.setSelectionRange(edit.selectionStart, edit.selectionEnd); renderEditorPreview();
  saveEditorDraft();
});
adminPostList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-post-id]");
  if (button) beginEdit(button.dataset.postId);
});
document.querySelector("#new-post-button").addEventListener("click", () => { if (isSaving) return; saveEditorDraft(); resetEditor(); postForm.elements.title.focus(); });
cancelEditButton.addEventListener("click", () => { if (isSaving) return; removeEditorDraft(); resetEditor(); });
document.querySelector("#admin-open").addEventListener("click", () => { updateAdminView(); adminDialog.showModal(); });
document.querySelector("#admin-close").addEventListener("click", () => adminDialog.close());
document.querySelector("#logout-button").addEventListener("click", () => { if (isSaving) return; saveEditorDraft(); adminUser = null; saveSession(null); resetEditor(false); updateAdminView(); postStatus.textContent = "로그아웃했습니다."; });
window.addEventListener("pagehide", saveEditorDraft);
adminDialog.addEventListener("click", (event) => { if (event.target === adminDialog) adminDialog.close(); });

document.querySelectorAll("[data-language]").forEach((button) => button.addEventListener("click", () => setLanguage(button.dataset.language)));
setLanguage("en"); renderEditorPreview(); updateAdminView(); restoreAdminSession(); loadRemoteStories();
