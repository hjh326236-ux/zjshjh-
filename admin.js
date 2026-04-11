const $ = (s, el = document) => el.querySelector(s);
const ADMIN_TOKEN_KEY = "self_intro_admin_token";

const state = {
  messages: [],
};

function toast(msg) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("is-on");
  window.clearTimeout(toast._t);
  toast._t = window.setTimeout(() => el.classList.remove("is-on"), 1800);
}

function notifyFrontendDataChanged() {
  localStorage.setItem("site_data_updated_at", String(Date.now()));
}

function setConnBadge(text, ok = null) {
  const el = $("#connBadge");
  if (!el) return;
  el.textContent = text;
  el.classList.remove("ok", "err");
  if (ok === true) el.classList.add("ok");
  if (ok === false) el.classList.add("err");
}

function setErrorDetail(text = "") {
  const box = $("#errorBox");
  const detail = $("#errorDetail");
  if (!box || !detail) return;
  if (!text) {
    box.style.display = "none";
    detail.textContent = "";
    return;
  }
  box.style.display = "block";
  detail.textContent = text;
}

function getToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || "";
}

function setToken(token) {
  if (!token) localStorage.removeItem(ADMIN_TOKEN_KEY);
  else localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

async function req(url, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["X-Admin-Token"] = token;

  const method = (options.method || "GET").toUpperCase();
  const resp = await fetch(url, { ...options, headers });
  const text = await resp.text();

  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!resp.ok) {
    const message = data?.error || `请求失败 (${resp.status})`;
    setErrorDetail(
      [
        `URL: ${url}`,
        `Method: ${options.method || "GET"}`,
        `Status: ${resp.status}`,
        `Message: ${message}`,
        text ? `Response: ${text}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    );
    throw new Error(message);
  }

  setErrorDetail("");
  if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) notifyFrontendDataChanged();
  return data;
}

function profilePayload() {
  const keys = [
    "name",
    "english_name",
    "title",
    "city",
    "direction",
    "status",
    "bio",
    "email",
    "wechat",
    "phone",
    "github_url",
    "linkedin_url",
  ];
  const out = {};
  keys.forEach((k) => {
    out[k] = $(`#p_${k}`)?.value?.trim() ?? "";
  });
  return out;
}

function fillProfile(profile = {}) {
  [
    "name",
    "english_name",
    "title",
    "city",
    "direction",
    "status",
    "bio",
    "email",
    "wechat",
    "phone",
    "github_url",
    "linkedin_url",
  ].forEach((k) => {
    const el = $(`#p_${k}`);
    if (el) el.value = profile[k] ?? "";
  });
}

function renderSkills(skills = []) {
  const root = $("#skillsList");
  if (!root) return;
  root.innerHTML = skills
    .map(
      (s) => `
      <div class="item row">
        <div><strong>${s.skill_name}</strong> <span class="mono">[${s.category}] level=${s.level ?? "-"}</span></div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn--tiny" data-edit-skill="${encodeURIComponent(JSON.stringify(s))}">编辑</button>
          <button class="btn btn--tiny btn--ghost" data-del-skill="${s.id}">删除</button>
        </div>
      </div>
    `
    )
    .join("");
}

function renderProjects(projects = []) {
  const root = $("#projectsList");
  if (!root) return;
  root.innerHTML = projects
    .map(
      (p) => `
      <div class="item row">
        <div><strong>${p.title}</strong> <span class="mono">${p.project_type || ""} · sort=${p.sort_order}</span></div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn--tiny" data-edit-project="${encodeURIComponent(JSON.stringify(p))}">编辑</button>
          <button class="btn btn--tiny btn--ghost" data-del-project="${p.id}">删除</button>
        </div>
      </div>
    `
    )
    .join("");
}

function renderExperiences(experiences = []) {
  const root = $("#experiencesList");
  if (!root) return;
  root.innerHTML = experiences
    .map(
      (e) => `
      <div class="item row">
        <div><strong>${e.organization} · ${e.role}</strong> <span class="mono">${e.period} · sort=${e.sort_order}</span></div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn--tiny" data-edit-experience="${encodeURIComponent(JSON.stringify(e))}">编辑</button>
          <button class="btn btn--tiny btn--ghost" data-del-experience="${e.id}">删除</button>
        </div>
      </div>
    `
    )
    .join("");
}

function renderMessages(messages = []) {
  const root = $("#messagesList");
  if (!root) return;
  if (!messages.length) {
    root.innerHTML = '<div class="item"><p class="muted">暂无留言</p></div>';
    return;
  }

  root.innerHTML = messages
    .map(
      (m) => `
      <div class="item">
        <div class="row">
          <div>
            <strong>${m.visitor_name || "匿名"}</strong>
            <div class="mono">${m.visitor_email || "-"} · ${m.created_at || ""}</div>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <span class="status-pill ${m.is_read ? "ok" : "err"}">${m.is_read ? "已读" : "未读"}</span>
            <button class="btn btn--tiny btn--ghost" data-toggle-read="${m.id}">${m.is_read ? "标记未读" : "标记已读"}</button>
          </div>
        </div>
        <p class="muted" style="margin-top:8px;">${String(m.message || "").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</p>
      </div>
    `
    )
    .join("");
}

async function loadAll() {
  const data = await req("/api/admin/data");
  fillProfile(data.profile || {});
  renderSkills(data.skills || []);
  renderProjects(data.projects || []);
  renderExperiences(data.experiences || []);
  state.messages = data.messages || [];
  renderMessages(state.messages);
}

function bindAuth() {
  const tokenInput = $("#adminToken");
  if (tokenInput) tokenInput.value = getToken();

  $("#saveToken")?.addEventListener("click", async () => {
    const token = tokenInput?.value?.trim() || "";
    if (!token) return toast("请输入 Token");
    setToken(token);
    toast("Token 已保存");
    await checkConnection();
  });

  $("#clearToken")?.addEventListener("click", () => {
    setToken("");
    if (tokenInput) tokenInput.value = "";
    setConnBadge("未检测", null);
    toast("Token 已清除");
  });

  $("#checkConnection")?.addEventListener("click", checkConnection);
}

async function checkConnection() {
  try {
    const data = await req("/api/admin/health");
    setConnBadge(`连接正常 · ${data.db_mode || "unknown"}`, true);
    toast("连接正常");
    return true;
  } catch (e) {
    setConnBadge("连接失败", false);
    toast(e.message || "连接失败");
    return false;
  }
}

function bindActions() {
  $("#saveProfile")?.addEventListener("click", async () => {
    try {
      await req("/api/admin/profile", { method: "PUT", body: JSON.stringify(profilePayload()) });
      toast("资料已保存");
      await loadAll();
    } catch (e) {
      toast(e.message || "保存失败");
    }
  });

  $("#saveSkill")?.addEventListener("click", async () => {
    const editId = $("#s_edit_id")?.value?.trim();
    const payload = {
      category: $("#s_category")?.value,
      skill_name: $("#s_skill_name")?.value?.trim(),
      level: Number($("#s_level")?.value || 70),
    };

    try {
      if (editId) {
        await req(`/api/admin/skills/${editId}`, { method: "PUT", body: JSON.stringify(payload) });
        toast("技能已更新");
      } else {
        await req("/api/admin/skills", { method: "POST", body: JSON.stringify(payload) });
        toast("技能已新增");
      }
      $("#s_skill_name").value = "";
      $("#s_level").value = "70";
      $("#s_edit_id").value = "";
      $("#saveSkill").textContent = "新增技能";
      await loadAll();
    } catch (e) {
      toast(e.message || "保存失败");
    }
  });

  $("#skillsList")?.addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-edit-skill]");
    if (editBtn) {
      const row = JSON.parse(decodeURIComponent(editBtn.dataset.editSkill));
      $("#s_edit_id").value = String(row.id || "");
      $("#s_category").value = row.category || "熟练";
      $("#s_skill_name").value = row.skill_name || "";
      $("#s_level").value = String(row.level ?? 70);
      $("#saveSkill").textContent = "更新技能";
      return;
    }

    const delBtn = e.target.closest("[data-del-skill]");
    if (!delBtn) return;
    try {
      await req(`/api/admin/skills/${delBtn.dataset.delSkill}`, { method: "DELETE" });
      toast("技能已删除");
      await loadAll();
    } catch (err) {
      toast(err.message || "删除失败");
    }
  });

  $("#saveProject")?.addEventListener("click", async () => {
    const editId = $("#pr_edit_id")?.value?.trim();
    const payload = {
      title: $("#pr_title")?.value?.trim(),
      project_type: $("#pr_project_type")?.value?.trim(),
      summary: $("#pr_summary")?.value?.trim(),
      contribution: $("#pr_contribution")?.value?.trim(),
      tech_stack: $("#pr_tech_stack")?.value?.trim(),
      result_text: $("#pr_result_text")?.value?.trim(),
      preview_url: $("#pr_preview_url")?.value?.trim(),
      source_url: $("#pr_source_url")?.value?.trim(),
      sort_order: Number($("#pr_sort_order")?.value || 0),
    };

    try {
      if (editId) {
        await req(`/api/admin/projects/${editId}`, { method: "PUT", body: JSON.stringify(payload) });
        toast("项目已更新");
      } else {
        await req("/api/admin/projects", { method: "POST", body: JSON.stringify(payload) });
        toast("项目已新增");
      }
      ["#pr_title", "#pr_project_type", "#pr_summary", "#pr_contribution", "#pr_tech_stack", "#pr_result_text", "#pr_preview_url", "#pr_source_url"].forEach((sel) => {
        const el = $(sel);
        if (el) el.value = "";
      });
      $("#pr_sort_order").value = "0";
      $("#pr_edit_id").value = "";
      $("#saveProject").textContent = "新增项目";
      await loadAll();
    } catch (e) {
      toast(e.message || "保存失败");
    }
  });

  $("#projectsList")?.addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-edit-project]");
    if (editBtn) {
      const row = JSON.parse(decodeURIComponent(editBtn.dataset.editProject));
      $("#pr_edit_id").value = String(row.id || "");
      $("#pr_title").value = row.title || "";
      $("#pr_project_type").value = row.project_type || "";
      $("#pr_summary").value = row.summary || "";
      $("#pr_contribution").value = row.contribution || "";
      $("#pr_tech_stack").value = row.tech_stack || "";
      $("#pr_result_text").value = row.result_text || "";
      $("#pr_preview_url").value = row.preview_url || "";
      $("#pr_source_url").value = row.source_url || "";
      $("#pr_sort_order").value = String(row.sort_order ?? 0);
      $("#saveProject").textContent = "更新项目";
      return;
    }

    const delBtn = e.target.closest("[data-del-project]");
    if (!delBtn) return;
    try {
      await req(`/api/admin/projects/${delBtn.dataset.delProject}`, { method: "DELETE" });
      toast("项目已删除");
      await loadAll();
    } catch (err) {
      toast(err.message || "删除失败");
    }
  });

  $("#saveExperience")?.addEventListener("click", async () => {
    const editId = $("#e_edit_id")?.value?.trim();
    const payload = {
      organization: $("#e_organization")?.value?.trim(),
      role: $("#e_role")?.value?.trim(),
      period: $("#e_period")?.value?.trim(),
      summary: $("#e_summary")?.value?.trim(),
      achievement_1: $("#e_achievement_1")?.value?.trim(),
      achievement_2: $("#e_achievement_2")?.value?.trim(),
      sort_order: Number($("#e_sort_order")?.value || 0),
    };

    try {
      if (editId) {
        await req(`/api/admin/experiences/${editId}`, { method: "PUT", body: JSON.stringify(payload) });
        toast("经历已更新");
      } else {
        await req("/api/admin/experiences", { method: "POST", body: JSON.stringify(payload) });
        toast("经历已新增");
      }
      ["#e_organization", "#e_role", "#e_period", "#e_summary", "#e_achievement_1", "#e_achievement_2"].forEach((sel) => {
        const el = $(sel);
        if (el) el.value = "";
      });
      $("#e_sort_order").value = "0";
      $("#e_edit_id").value = "";
      $("#saveExperience").textContent = "新增经历";
      await loadAll();
    } catch (e) {
      toast(e.message || "保存失败");
    }
  });

  $("#experiencesList")?.addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-edit-experience]");
    if (editBtn) {
      const row = JSON.parse(decodeURIComponent(editBtn.dataset.editExperience));
      $("#e_edit_id").value = String(row.id || "");
      $("#e_organization").value = row.organization || "";
      $("#e_role").value = row.role || "";
      $("#e_period").value = row.period || "";
      $("#e_summary").value = row.summary || "";
      $("#e_achievement_1").value = row.achievement_1 || "";
      $("#e_achievement_2").value = row.achievement_2 || "";
      $("#e_sort_order").value = String(row.sort_order ?? 0);
      $("#saveExperience").textContent = "更新经历";
      return;
    }

    const delBtn = e.target.closest("[data-del-experience]");
    if (!delBtn) return;
    try {
      await req(`/api/admin/experiences/${delBtn.dataset.delExperience}`, { method: "DELETE" });
      toast("经历已删除");
      await loadAll();
    } catch (err) {
      toast(err.message || "删除失败");
    }
  });

  $("#messagesList")?.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-toggle-read]");
    if (!btn) return;

    const id = btn.dataset.toggleRead;
    const row = state.messages.find((m) => String(m.id) === String(id));
    const next = !(row?.is_read === 1 || row?.is_read === true);

    try {
      await req(`/api/admin/messages/${id}/read`, {
        method: "PUT",
        body: JSON.stringify({ is_read: next }),
      });
      toast(next ? "已标记为已读" : "已标记为未读");
      await loadAll();
    } catch (err) {
      toast(err.message || "更新失败");
    }
  });

  $("#refreshMessages")?.addEventListener("click", async () => {
    try {
      await loadAll();
      toast("留言已刷新");
    } catch (err) {
      toast(err.message || "刷新失败");
    }
  });

  $("#exportMessages")?.addEventListener("click", async () => {
    try {
      const token = getToken();
      if (!token) {
        toast("请先保存 Token");
        return;
      }
      const resp = await fetch("/api/admin/messages/export.csv", { headers: { "X-Admin-Token": token } });
      if (!resp.ok) throw new Error("导出失败");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "messages.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast("CSV 导出成功");
    } catch (err) {
      toast(err.message || "导出失败");
    }
  });
}

(async function init() {
  bindAuth();
  bindActions();

  if (getToken()) {
    const ok = await checkConnection();
    if (ok) await loadAll().catch((e) => toast(e.message || "加载失败"));
  } else {
    setConnBadge("未检测", null);
  }
})();
