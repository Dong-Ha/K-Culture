const categories = window.KCULTURE_CATEGORIES || [];

const categoryGrid = document.querySelector("#category-grid");
const featureTitle = document.querySelector("#feature-title");
const featureDescription = document.querySelector("#feature-description");
const featureKeywords = document.querySelector("#feature-keywords");
const featureExamples = document.querySelector("#feature-examples");

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

renderCategories();
setActiveCategory(categories[0]?.id);
