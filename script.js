const qs = (s, el = document) => el.querySelector(s);

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

function initResume() {
  const btn = qs("#downloadResume");
  btn?.addEventListener("click", (e) => {
    e.preventDefault();
    toast("把你的简历文件放到本目录并改链接即可");
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

function renderProjects(projects) {
  const root = qs("#projectsGrid");
  if (!root || !Array.isArray(projects) || !projects.length) return;

  root.innerHTML = projects
    .map((p) => {
      const preview = p.preview_url || "#";
      const source = p.source_url || "#";
      const previewLabel = p.preview_url ? "在线预览" : "详情";
      const sourceLabel = p.source_url ? "源码" : "资料";

      return `
        <article class="card project">
          <div class="project__top">
            <h3 class="project__title">${escapeHtml(p.title || "未命名项目")}</h3>
            <span class="badge">${escapeHtml(p.project_type || "项目")}</span>
          </div>
          <p class="muted">${escapeHtml(p.summary || "")}</p>
          <ul class="list list--compact">
            <li><strong>我的贡献</strong>：${escapeHtml(p.contribution || "")}</li>
            <li><strong>技术点</strong>：${escapeHtml(p.tech_stack || "")}</li>
            <li><strong>结果</strong>：${escapeHtml(p.result_text || "")}</li>
          </ul>
          <div class="project__links">
            <a class="btn btn--tiny" href="${escapeHtml(preview)}" target="_blank" rel="noreferrer">${previewLabel}</a>
            <a class="btn btn--tiny btn--ghost" href="${escapeHtml(source)}" target="_blank" rel="noreferrer">${sourceLabel}</a>
          </div>
        </article>
      `;
    })
    .join("");
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
    renderProjects(data.projects || []);
    renderExperiences(data.experiences || []);
  } catch {
    toast("未能从数据库加载数据，已使用页面默认内容");
  }
}

function initContactForm() {
  const form = qs("#contactForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
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
initResume();
initBgm();
initContactForm();
loadSiteData();
