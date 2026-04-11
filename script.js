const qs = (s, el = document) => el.querySelector(s);

const projectState = {
  all: [],
  filter: "all",
  query: "",
};

function toast(msg) {
  const el = qs("#toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("is-on");
  window.clearTimeout(toast._t);
  toast._t = window.setTimeout(() => el.classList.remove("is-on"), 1800);
}

function setTheme(next) {
  const root = document.documentElement;
  const btn = qs("#themeToggle");
  const icon = btn?.querySelector(".icon");
  if (next === "light") {
    root.setAttribute("data-theme", "light");
    icon?.setAttribute("data-icon", "moon");
    localStorage.setItem("theme", "light");
  } else {
    root.removeAttribute("data-theme");
    icon?.setAttribute("data-icon", "sun");
    localStorage.setItem("theme", "dark");
  }
}

function initTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return setTheme(saved);

  const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)")?.matches;
  setTheme(prefersLight ? "light" : "dark");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function initCopyActions() {
  const copyEmail = qs("#copyEmail");
  const emailLink = qs("#emailLink");
  copyEmail?.addEventListener("click", async () => {
    const email = emailLink?.textContent?.trim() || "";
    if (!email) return toast("没有找到邮箱内容");
    const ok = await copyText(email);
    toast(ok ? "邮箱已复制" : "复制失败（浏览器限制）");
  });

  const copyLinkBtn = qs("#copyLink");
  copyLinkBtn?.addEventListener("click", async () => {
    const url = window.location.href;
    const ok = await copyText(url);
    toast(ok ? "主页链接已复制" : "复制失败（浏览器限制）");
  });
}

function initFooterYear() {
  const y = qs("#year");
  if (y) y.textContent = String(new Date().getFullYear());
}

function initMobileNav() {
  const root = qs("#mobileNav");
  const toggle = qs("#navToggle");
  const backdrop = qs("#mobileNavBackdrop");
  if (!root || !toggle) return;

  const links = Array.from(root.querySelectorAll(".mobile-nav__link"));

  const open = () => {
    root.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
  };

  const close = () => {
    root.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle.addEventListener("click", () => {
    if (root.hidden) open();
    else close();
  });

  backdrop?.addEventListener("click", close);
  links.forEach((link) => link.addEventListener("click", close));
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
}

function initScrollSpy() {
  const sections = ["about", "skills", "projects", "experience", "contact"];
  const desktopLinks = Array.from(document.querySelectorAll(".nav__link"));
  const mobileLinks = Array.from(document.querySelectorAll(".mobile-nav__link"));

  const setActive = (id) => {
    desktopLinks.forEach((link) => {
      const active = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });

    mobileLinks.forEach((link) => {
      const active = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  };

  const io = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target?.id) setActive(visible.target.id);
    },
    { rootMargin: "-35% 0px -55% 0px", threshold: [0.2, 0.4, 0.65] }
  );

  sections.forEach((id) => {
    const el = qs(`#${id}`);
    if (el) io.observe(el);
  });
}

function initResume() {
  const btn = qs("#downloadResume");
  if (!btn) return;

  btn.addEventListener("click", () => {
    toast("正在打开简历 PDF");
  });
}

function initBgm() {
  const audio = qs("#bgmAudio");
  const btn = qs("#bgmToggle");
  if (!audio || !btn) return;

  const key = "self_intro_bgm_enabled";

  const update = (playing) => {
    btn.textContent = playing ? "暂停音乐" : "播放音乐";
    btn.setAttribute("aria-pressed", playing ? "true" : "false");
  };

  const start = async () => {
    try {
      await audio.play();
      update(true);
      localStorage.setItem(key, "1");
    } catch {
      update(false);
      toast("浏览器限制自动播放，请点击播放");
    }
  };

  const stop = () => {
    audio.pause();
    update(false);
    localStorage.setItem(key, "0");
  };

  btn.addEventListener("click", () => {
    if (audio.paused) start();
    else stop();
  });

  const saved = localStorage.getItem(key);
  if (saved === "1") start();
  else update(false);

  audio.addEventListener("play", () => update(true));
  audio.addEventListener("pause", () => update(false));
}

function escapeHtml(text = "") {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderSkills(skills) {
  const root = qs("#skillsGrid");
  if (!root || !Array.isArray(skills) || !skills.length) return;

  const grouped = skills.reduce((acc, s) => {
    const k = s.category || "其他";
    if (!acc[k]) acc[k] = [];
    acc[k].push(s.skill_name);
    return acc;
  }, {});

  const order = ["熟练", "了解", "正在学习"];
  root.innerHTML = order
    .map((cat) => {
      const list = grouped[cat] || [];
      return `
        <div class="card">
          <h3 class="card__title">${escapeHtml(cat)}</h3>
          <div class="tags">
            ${list.map((x) => `<span class="tag">${escapeHtml(x)}</span>`).join("") || '<span class="tag">暂无</span>'}
          </div>
        </div>
      `;
    })
    .join("");
}

function getFilteredProjects() {
  const list = Array.isArray(projectState.all) ? projectState.all : [];
  const query = projectState.query.trim().toLowerCase();

  return list.filter((p) => {
    const matchFilter = projectState.filter === "all" || (p.project_type || "") === projectState.filter;
    if (!matchFilter) return false;

    if (!query) return true;
    const text = [p.title, p.project_type, p.tech_stack, p.summary, p.contribution, p.result_text]
      .join(" ")
      .toLowerCase();
    return text.includes(query);
  });
}

function renderProjects(projects) {
  const root = qs("#projectsGrid");
  if (!root) return;

  const list = Array.isArray(projects) ? projects : [];
  if (!list.length) {
    root.innerHTML = '<div class="card"><p class="muted">暂无项目数据，可在后台新增。</p></div>';
    return;
  }

  root.innerHTML = list
    .map((p, idx) => {
      const preview = p.preview_url || "#";
      const source = p.source_url || "#";
      const previewLabel = p.preview_url ? "在线预览" : "详情";
      const sourceLabel = p.source_url ? "源码" : "资料";
      const detailId = `project-detail-${idx}`;

      return `
        <article class="card project" data-project-id="${escapeHtml(String(p.id || idx))}">
          <div class="project__top">
            <h3 class="project__title">${escapeHtml(p.title || "未命名项目")}</h3>
            <span class="badge">${escapeHtml(p.project_type || "项目")}</span>
          </div>
          <p class="muted project__summary">${escapeHtml(p.summary || "")}</p>
          <button class="btn btn--tiny btn--ghost project__toggle" type="button" aria-expanded="false" aria-controls="${detailId}">展开详情</button>
          <div class="project__extra" id="${detailId}">
            <ul class="list list--compact">
              <li><strong>我的贡献</strong>：${escapeHtml(p.contribution || "")}</li>
              <li><strong>技术点</strong>：${escapeHtml(p.tech_stack || "")}</li>
              <li><strong>结果</strong>：${escapeHtml(p.result_text || "")}</li>
            </ul>
            <div class="project__links">
              <a class="btn btn--tiny" href="${escapeHtml(preview)}" target="_blank" rel="noreferrer">${previewLabel}</a>
              <a class="btn btn--tiny btn--ghost" href="${escapeHtml(source)}" target="_blank" rel="noreferrer">${sourceLabel}</a>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderProjectsByState() {
  const filtered = getFilteredProjects();
  renderProjects(filtered);
}

function initProjectInteractions() {
  const grid = qs("#projectsGrid");
  const search = qs("#projectSearch");
  const filters = Array.from(document.querySelectorAll("[data-filter]"));
  if (!grid) return;

  filters.forEach((btn) => {
    btn.addEventListener("click", () => {
      projectState.filter = btn.dataset.filter || "all";
      filters.forEach((it) => {
        const active = it === btn;
        it.classList.toggle("is-active", active);
        it.classList.toggle("btn--ghost", !active);
      });
      renderProjectsByState();
    });
  });

  search?.addEventListener("input", () => {
    projectState.query = search.value || "";
    renderProjectsByState();
  });

  grid.addEventListener("click", (e) => {
    const btn = e.target.closest(".project__toggle");
    if (!btn) return;
    const card = btn.closest(".project");
    if (!card) return;

    const opening = !card.classList.contains("is-open");
    card.classList.toggle("is-open", opening);
    btn.setAttribute("aria-expanded", opening ? "true" : "false");
    btn.textContent = opening ? "收起详情" : "展开详情";
  });
}

function renderExperiences(experiences) {
  const root = qs("#experienceTimeline");
  if (!root || !Array.isArray(experiences) || !experiences.length) return;

  root.innerHTML = experiences
    .map(
      (e) => `
      <div class="tl-item">
        <div class="tl-dot" aria-hidden="true"></div>
        <div class="tl-card">
          <div class="tl-top">
            <h3 class="tl-title">${escapeHtml(e.organization || "")} · ${escapeHtml(e.role || "")}</h3>
            <span class="tl-time">${escapeHtml(e.period || "")}</span>
          </div>
          <p class="muted">${escapeHtml(e.summary || "")}</p>
          <ul class="list list--compact">
            <li><strong>成果</strong>：${escapeHtml(e.achievement_1 || "")}</li>
            <li><strong>成果</strong>：${escapeHtml(e.achievement_2 || "")}</li>
          </ul>
        </div>
      </div>
    `
    )
    .join("");
}

function applyProfile(profile) {
  if (!profile) return;

  const profileName = qs("#profileName");
  const profileBio = qs("#profileBio");
  const profileCity = qs("#profileCity");
  const profileDirection = qs("#profileDirection");
  const profileStatus = qs("#profileStatus");
  const emailLink = qs("#emailLink");
  const githubLink = qs("#githubLink");
  const linkedinLink = qs("#linkedinLink");

  if (profileName) {
    profileName.textContent = profile.english_name
      ? `${profile.name}（${profile.english_name}）`
      : profile.name || profileName.textContent;
  }
  if (profileBio && profile.bio) profileBio.textContent = profile.bio;
  if (profileCity && profile.city) profileCity.textContent = `📍 ${profile.city}`;
  if (profileDirection && profile.direction) profileDirection.textContent = `🎯 方向：${profile.direction}`;
  if (profileStatus && profile.status) profileStatus.textContent = `⏱️ 状态：${profile.status}`;

  if (emailLink && profile.email) {
    emailLink.textContent = profile.email;
    emailLink.setAttribute("href", `mailto:${profile.email}`);
  }
  if (githubLink && profile.github_url) githubLink.setAttribute("href", profile.github_url);
  if (linkedinLink && profile.linkedin_url) linkedinLink.setAttribute("href", profile.linkedin_url);

  const foot = qs(".footer .muted");
  if (foot && profile.name) {
    foot.innerHTML = `© <span id="year"></span> ${escapeHtml(profile.name)}. All rights reserved.`;
    initFooterYear();
  }
}

async function loadSiteData() {
  try {
    const resp = await fetch("/api/site-data");
    if (!resp.ok) throw new Error("请求失败");
    const data = await resp.json();

    applyProfile(data.profile);
    renderSkills(data.skills || []);
    projectState.all = Array.isArray(data.projects) ? data.projects : [];
    renderProjectsByState();
    renderExperiences(data.experiences || []);
  } catch {
    toast("未能从数据库加载数据，已使用页面默认内容");
  }
}

function initBackToTop() {
  const btn = qs("#backToTop");
  if (!btn) return;

  const onScroll = () => {
    const visible = window.scrollY > 420;
    btn.classList.toggle("is-visible", visible);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function initContactForm() {
  const form = qs("#contactForm");
  if (!form) return;

  const nameInput = form.querySelector('[name="name"]');
  const emailInput = form.querySelector('[name="email"]');
  const messageInput = form.querySelector('[name="message"]');

  const setFieldError = (input, errorId, text = "") => {
    const errorEl = qs(`#${errorId}`);
    if (!input || !errorEl) return;
    errorEl.textContent = text;
    input.classList.toggle("is-invalid", Boolean(text));
    if (text) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  };

  const validate = () => {
    const name = nameInput?.value?.trim() || "";
    const email = emailInput?.value?.trim() || "";
    const message = messageInput?.value?.trim() || "";
    let ok = true;

    if (!name) {
      setFieldError(nameInput, "error-name", "请填写称呼");
      ok = false;
    } else {
      setFieldError(nameInput, "error-name", "");
    }

    const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setFieldError(emailInput, "error-email", "请填写邮箱");
      ok = false;
    } else if (!emailReg.test(email)) {
      setFieldError(emailInput, "error-email", "邮箱格式不正确");
      ok = false;
    } else {
      setFieldError(emailInput, "error-email", "");
    }

    if (!message) {
      setFieldError(messageInput, "error-message", "请填写留言内容");
      ok = false;
    } else if (message.length < 10) {
      setFieldError(messageInput, "error-message", "内容至少 10 个字符");
      ok = false;
    } else {
      setFieldError(messageInput, "error-message", "");
    }

    return ok;
  };

  [nameInput, emailInput, messageInput].forEach((input) => {
    input?.addEventListener("input", validate);
    input?.addEventListener("blur", validate);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast("请先修正表单错误");
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const resp = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await resp.json();
      if (!resp.ok) throw new Error(result?.error || "提交失败");

      form.reset();
      validate();
      toast("留言已提交并写入数据库");
    } catch (err) {
      const message = err instanceof Error ? err.message : "提交失败";
      toast(message);
    }
  });
}

initTheme();
qs("#themeToggle")?.addEventListener("click", () => {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  setTheme(isLight ? "dark" : "light");
});

initCopyActions();
initFooterYear();
initMobileNav();
initScrollSpy();
initResume();
initBgm();
initBackToTop();
initProjectInteractions();
initContactForm();
loadSiteData();
