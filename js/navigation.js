(function initializeAutoHideNavigation() {
  const navigation = document.querySelector(".nav");
  if (!navigation) return;

  let lastScrollY = window.scrollY;
  let ticking = false;

  function updateNavigation() {
    const currentScrollY = window.scrollY;
    const nearTop = currentScrollY <= navigation.offsetHeight;
    const scrollingUp = currentScrollY < lastScrollY;

    navigation.classList.toggle("nav-hidden", !nearTop && !scrollingUp);
    lastScrollY = currentScrollY;
    ticking = false;
  }

  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(updateNavigation);
      ticking = true;
    }
  }, { passive: true });

  navigation.addEventListener("focusin", () => navigation.classList.remove("nav-hidden"));
})();
