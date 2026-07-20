const siteHeader = document.querySelector(".site-header");
const mobileMenuToggle = document.querySelector(".mobile-menu-toggle");

const closeMobileMenu = () => {
  siteHeader?.classList.remove("menu-open");
  mobileMenuToggle?.setAttribute("aria-expanded", "false");
  mobileMenuToggle?.setAttribute("aria-label", "Otwórz menu");
};

const updateHeader = () => {
  const fixedHeaderPage =
    document.body.classList.contains("portfolio-page") ||
    document.body.classList.contains("offer-page");

  siteHeader?.classList.toggle("is-scrolled", fixedHeaderPage || window.scrollY > 24);
};

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

mobileMenuToggle?.addEventListener("click", () => {
  const isOpen = siteHeader?.classList.toggle("menu-open");
  mobileMenuToggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
  mobileMenuToggle.setAttribute("aria-label", isOpen ? "Zamknij menu" : "Otwórz menu");
});

siteHeader?.querySelectorAll(".nav-links a").forEach((link) => {
  link.addEventListener("click", closeMobileMenu);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMobileMenu();
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 760) closeMobileMenu();
});

const revealTargets = document.querySelectorAll(
  ".growth-copy, .growth-row, .reveal-on-scroll"
);

document
  .querySelectorAll(".offer-hero-inner, .portfolio-hero-inner")
  .forEach((element) => element.classList.add("is-visible"));

const revealHashTarget = () => {
  if (!window.location.hash) return;

  const target = document.querySelector(window.location.hash);
  const revealScope = target?.closest("section") || target;

  revealScope
    ?.querySelectorAll(".growth-copy, .growth-row, .reveal-on-scroll")
    .forEach((element) => element.classList.add("is-visible"));
};

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.22, rootMargin: "0px 0px -8% 0px" }
  );

  revealTargets.forEach((target) => revealObserver.observe(target));
} else {
  revealTargets.forEach((target) => target.classList.add("is-visible"));
}

window.setTimeout(() => {
  document.body.classList.remove("intro-running");
  document.documentElement.classList.add("hero-ready");
  updateHeader();

  if (window.location.hash) {
    const target = document.querySelector(window.location.hash);
    target?.scrollIntoView({ block: "start", behavior: "auto" });
    revealHashTarget();
    updateHeader();
  }
}, 2650);

window.addEventListener("hashchange", () => {
  window.setTimeout(revealHashTarget, 360);
});

window.setTimeout(() => {
  document.documentElement.classList.add("intro-complete");
}, 6200);

const offerPanels = document.querySelectorAll(".offer-panel");

offerPanels.forEach((panel) => {
  panel.addEventListener("toggle", () => {
    if (!panel.open) return;

    offerPanels.forEach((otherPanel) => {
      if (otherPanel !== panel) otherPanel.open = false;
    });
  });
});

const lazyAutoplayVideos = document.querySelectorAll("[data-autoplay-on-view]");

const prepareLazyVideo = (video) => {
  if (video.dataset.loaded === "true") return;

  video.querySelectorAll("source[data-src]").forEach((source) => {
    source.src = source.dataset.src;
    source.removeAttribute("data-src");
  });

  video.dataset.loaded = "true";
  video.load();
};

const playLazyVideo = (video) => {
  prepareLazyVideo(video);
  video.play().catch(() => {
    // Autoplay może być zablokowany przez ustawienia urządzenia; poster pozostaje widoczny.
  });
};

if ("IntersectionObserver" in window) {
  const videoObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          playLazyVideo(entry.target);
        } else {
          entry.target.pause();
        }
      });
    },
    { rootMargin: "280px 0px", threshold: 0.05 }
  );

  lazyAutoplayVideos.forEach((video) => videoObserver.observe(video));
} else {
  lazyAutoplayVideos.forEach(playLazyVideo);
}

const accessibleExpanders = document.querySelectorAll(".service-expander, .offer-terms");

const syncExpanderState = (expander) => {
  const summary = expander.querySelector(":scope > summary");
  const label = summary?.querySelector("[data-toggle-label]");

  summary?.setAttribute("aria-expanded", String(expander.open));
  if (label) label.textContent = expander.open ? "Ukryj zakres" : "Zobacz zakres";
};

accessibleExpanders.forEach((expander) => {
  syncExpanderState(expander);
  expander.addEventListener("toggle", () => syncExpanderState(expander));
});

const requestedProject = new URLSearchParams(window.location.search).get("projekt");
const projectSelect = document.querySelector('select[name="typ-projektu"]');

if (requestedProject && projectSelect) {
  const matchingOption = [...projectSelect.options].find((option) => option.value === requestedProject);
  if (matchingOption) projectSelect.value = requestedProject;
}

const videoSlider = document.querySelector("[data-video-slider]");

if (videoSlider) {
  const sliderSection = videoSlider.closest(".video-portfolio-section");
  const slides = [...videoSlider.querySelectorAll(".video-reel")];
  const dots = [...sliderSection.querySelectorAll("[data-video-slide]")];
  const currentLabel = sliderSection.querySelector("[data-video-current]");
  const previousButton = sliderSection.querySelector("[data-video-prev]");
  const nextButton = sliderSection.querySelector("[data-video-next]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let currentSlide = 0;
  let scrollFrame;

  const setActiveSlide = (index) => {
    const nextIndex = Math.max(0, Math.min(index, slides.length - 1));
    currentSlide = nextIndex;

    if (currentLabel) currentLabel.textContent = String(nextIndex + 1).padStart(2, "0");

    dots.forEach((dot, dotIndex) => {
      const isActive = dotIndex === nextIndex;
      dot.classList.toggle("is-active", isActive);
      if (isActive) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });

    if (previousButton) previousButton.disabled = nextIndex === 0;
    if (nextButton) nextButton.disabled = nextIndex === slides.length - 1;

    slides.forEach((slide, slideIndex) => {
      if (slideIndex !== nextIndex) slide.querySelector("video")?.pause();
    });
  };

  const scrollToSlide = (index) => {
    const nextIndex = Math.max(0, Math.min(index, slides.length - 1));
    const slide = slides[nextIndex];
    if (!slide) return;

    const trackRect = videoSlider.getBoundingClientRect();
    const slideRect = slide.getBoundingClientRect();
    const targetLeft = videoSlider.scrollLeft + slideRect.left - trackRect.left;

    videoSlider.scrollTo({
      left: targetLeft,
      behavior: reducedMotion.matches ? "auto" : "smooth",
    });
    setActiveSlide(nextIndex);
  };

  const syncSlideFromScroll = () => {
    window.cancelAnimationFrame(scrollFrame);
    scrollFrame = window.requestAnimationFrame(() => {
      const trackLeft = videoSlider.getBoundingClientRect().left;
      const closestIndex = slides.reduce((closest, slide, index) => {
        const distance = Math.abs(slide.getBoundingClientRect().left - trackLeft);
        return distance < closest.distance ? { index, distance } : closest;
      }, { index: 0, distance: Number.POSITIVE_INFINITY }).index;

      if (closestIndex !== currentSlide) setActiveSlide(closestIndex);
    });
  };

  dots.forEach((dot) => {
    dot.addEventListener("click", () => scrollToSlide(Number(dot.dataset.videoSlide)));
  });

  previousButton?.addEventListener("click", () => scrollToSlide(currentSlide - 1));
  nextButton?.addEventListener("click", () => scrollToSlide(currentSlide + 1));

  videoSlider.addEventListener("scroll", syncSlideFromScroll, { passive: true });
  videoSlider.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    scrollToSlide(currentSlide + (event.key === "ArrowRight" ? 1 : -1));
  });

  window.addEventListener("resize", syncSlideFromScroll, { passive: true });
  setActiveSlide(0);
}
