const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const header = document.querySelector("[data-header]");
const hero = document.querySelector(".hero");
const heroVideo = document.querySelector("[data-hero-video]");
const videoControl = document.querySelector("[data-video-control]");
const videoControlIcon = videoControl?.querySelector(".video-control-icon");
const videoControlLabel = videoControl?.querySelector(".video-control-label");

if (heroVideo) {
  const markVideoReady = () => heroVideo.classList.add("is-ready");
  heroVideo.addEventListener("canplay", markVideoReady, { once: true });
  if (heroVideo.readyState >= 3) markVideoReady();

  if (reducedMotion.matches) {
    heroVideo.pause();
  } else {
    heroVideo.play().catch(() => {
      videoControl?.setAttribute("aria-pressed", "true");
      if (videoControlIcon) videoControlIcon.textContent = "▶";
      if (videoControlLabel) videoControlLabel.textContent = "play motion";
    });
  }
}

videoControl?.addEventListener("click", () => {
  if (!heroVideo) return;
  const shouldPlay = heroVideo.paused;
  if (shouldPlay) {
    heroVideo.play().catch(() => {});
  } else {
    heroVideo.pause();
  }
  videoControl.setAttribute("aria-pressed", String(!shouldPlay));
  if (videoControlIcon) videoControlIcon.textContent = shouldPlay ? "Ⅱ" : "▶";
  if (videoControlLabel) videoControlLabel.textContent = shouldPlay ? "pause motion" : "play motion";
});

if (hero && !reducedMotion.matches) {
  hero.addEventListener("pointermove", (event) => {
    const box = hero.getBoundingClientRect();
    hero.style.setProperty("--pointer-x", `${event.clientX - box.left}px`);
    hero.style.setProperty("--pointer-y", `${event.clientY - box.top}px`);
  });
}

const menuButton = document.querySelector("[data-menu-button]");
const navLinks = document.querySelector("#nav-links");

function closeMenu() {
  menuButton?.setAttribute("aria-expanded", "false");
  menuButton?.setAttribute("aria-label", "Open navigation");
  navLinks?.classList.remove("is-open");
  document.body.classList.remove("menu-open");
}

menuButton?.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!isOpen));
  menuButton.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
  navLinks?.classList.toggle("is-open", !isOpen);
  document.body.classList.toggle("menu-open", !isOpen);
});

navLinks?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
window.addEventListener("resize", () => {
  if (window.innerWidth > 760) closeMenu();
});

const demos = {
  team: {
    source: "./assets/demo-team-collaboration.mp4",
    poster: "./assets/demo-team-collaboration-poster.jpg",
    kicker: "TEAM MODE · LIVE ORCHESTRATION",
    label: "Argo team collaboration demo",
    caption:
      "A moderator routes the mission, specialists work in isolated branches, and Argo synthesizes the result into one response.",
  },
  single: {
    source: "./assets/demo-single-agent.mp4",
    poster: "./assets/demo-single-agent-poster.jpg",
    kicker: "SINGLE AGENT · FOCUSED EXECUTION",
    label: "Argo single agent demo",
    caption:
      "Work one-on-one with a specialist while tool calls, artifacts, previews, and approvals stay visible in the same conversation.",
  },
  studio: {
    source: "./assets/demo-agent-config.mp4",
    poster: "./assets/demo-agent-config-poster.jpg",
    kicker: "AGENT STUDIO · YOUR RULES",
    label: "Argo agent configuration demo",
    caption:
      "Create agents with a purpose-built prompt, runtime, permissions, MCP servers, and reusable skills—without editing config files by hand.",
  },
};

const demoVideo = document.querySelector("[data-demo-video]");
const demoKicker = document.querySelector("[data-demo-kicker]");
const demoCaption = document.querySelector("[data-demo-caption]");
const demoTabs = [...document.querySelectorAll("[data-demo-tab]")];

function selectDemo(key) {
  const demo = demos[key];
  if (!demo || !demoVideo) return;

  demoTabs.forEach((tab) => {
    const isSelected = tab.dataset.demoTab === key;
    tab.setAttribute("aria-selected", String(isSelected));
    tab.tabIndex = isSelected ? 0 : -1;
  });

  demoVideo.pause();
  demoVideo.poster = demo.poster;
  demoVideo.setAttribute("aria-label", demo.label);
  const source = demoVideo.querySelector("source");
  if (source) source.src = demo.source;
  demoVideo.load();
  if (demoKicker) demoKicker.textContent = demo.kicker;
  if (demoCaption) demoCaption.textContent = demo.caption;
}

demoTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectDemo(tab.dataset.demoTab));
  tab.addEventListener("keydown", (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = demoTabs[(index + delta + demoTabs.length) % demoTabs.length];
    next.focus();
    selectDemo(next.dataset.demoTab);
  });
});

const revealItems = document.querySelectorAll(".reveal");
if (reducedMotion.matches || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8%", threshold: 0.08 },
  );
  revealItems.forEach((item) => revealObserver.observe(item));
}

const command = `git clone https://github.com/ashuiGordon/argo.git\ncd argo\npnpm install\npnpm dev`;
const copyButton = document.querySelector("[data-copy-command]");
copyButton?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(command);
    copyButton.textContent = "copied";
    window.setTimeout(() => {
      copyButton.textContent = "copy";
    }, 1600);
  } catch {
    copyButton.textContent = "select commands";
  }
});

document.querySelector("[data-year]").textContent = new Date().getFullYear();
