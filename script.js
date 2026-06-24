const siteHeader = document.querySelector(".site-header");
const mobileMenuToggle = document.querySelector(".mobile-menu-toggle");

const closeMobileMenu = () => {
  siteHeader?.classList.remove("menu-open");
  mobileMenuToggle?.setAttribute("aria-expanded", "false");
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
