/* ============================================================
   NavHub - 管理面板逻辑（V3 版）
   依赖 app.js 暴露的 window.NavHub
   支持：分类/分组/书签增删改、排序、slogan、badge、
         背景设置（视频/图片/纯色）、跑马灯公告、备份导入导出
   ============================================================ */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const els = {
    mask: $("adminMask"),
    adminCategories: $("adminCategories"),
    saveBtn: $("saveBtn"),
    cancelBtn: $("cancelAdmin"),
    closeBtn: $("closeAdmin"),
    addCatBtn: $("addCatBtn"),
    newCatName: $("newCatName"),
    newCatIcon: $("newCatIcon"),
    exportBtn: $("exportBtn"),
    importFile: $("importFile"),
    resetBtn: $("resetBtn"),
    adminBtn: $("adminBtn"),
    // 站点设置
    setBgVideo: $("setBgVideo"),
    setBgImage: $("setBgImage"),
    setBgColor: $("setBgColor"),
    setBgOverlay: $("setBgOverlay"),
    setNotices: $("setNotices"),
  };

  function data() { return window.NavHub.data; }

  function open() { els.mask.hidden = false; render(); }
  function close() { els.mask.hidden = true; }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function save() {
    try {
      // 读取站点设置表单
      const site = data().site = data().site || {};
      site.bgVideo = els.setBgVideo.value.trim();
      site.bgImage = els.setBgImage.value.trim();
      site.bgColor = els.setBgColor.value.trim();
      site.bgOverlay = parseFloat(els.setBgOverlay.value);
      if (isNaN(site.bgOverlay)) site.bgOverlay = 0.55;
      // 公告：每行 "文案 | 链接"
      site.notices = els.setNotices.value.split("\n").map((line) => line.trim()).filter(Boolean)
        .map((line) => {
          const [text, url] = line.split("|").map((s) => s.trim());
          return { text: text || "", url: url || "" };
        });

      localStorage.setItem(window.NavHub.STORAGE_KEY, JSON.stringify(data()));
      window.NavHub.renderAll();
      window.NavHub.applyBackground();
      window.NavHub.showToast("✅ 已保存");
    } catch (e) {
      window.NavHub.showToast("❌ 保存失败：" + e.message);
    }
  }

  /* ---------- 渲染管理界面 ---------- */
  function render() {
    const d = data();
    const site = d.site || {};

    // 站点设置表单
    els.setBgVideo.value = site.bgVideo || "";
    els.setBgImage.value = site.bgImage || "";
    els.setBgColor.value = site.bgColor || "";
    els.setBgOverlay.value = site.bgOverlay != null ? site.bgOverlay : 0.55;
    els.setNotices.value = (Array.isArray(site.notices) ? site.notices : [])
      .map((n) => (n.text || "") + (n.url ? " | " + n.url : "")).join("\n");

    // 分类管理
    let html = "";
    (d.categories || []).forEach((cat, ci) => {
      html += '<div class="admin-cat">';
      html += '<div class="admin-cat-head">'
        + '<input class="mini-input" value="' + esc(cat.icon || "") + '" data-kind="cat-icon" data-ci="' + ci + '" placeholder="图标" style="width:44px;text-align:center" />'
        + '<input class="mini-input" value="' + esc(cat.name) + '" data-kind="cat-name" data-ci="' + ci + '" placeholder="分类名" style="flex:1;font-weight:600" />'
        + '<input class="mini-input" value="' + esc(cat.slogan || "") + '" data-kind="cat-slogan" data-ci="' + ci + '" placeholder="slogan" style="flex:1.4" />'
        + '<button class="mini-btn" data-act="cat-up" data-ci="' + ci + '" title="上移">↑</button>'
        + '<button class="mini-btn" data-act="cat-down" data-ci="' + ci + '" title="下移">↓</button>'
        + '<button class="mini-btn danger" data-act="cat-del" data-ci="' + ci + '" title="删除分类（含全部书签）">?</button>'
        + "</div>";

      (cat.groups || []).forEach((g, gi) => {
        html += '<div class="admin-group">';
        html += '<div class="admin-group-head">'
          + '<input class="mini-input g-name-in" value="' + esc(g.name) + '" data-kind="g-name" data-ci="' + ci + '" data-gi="' + gi + '" placeholder="分组名" />'
          + '<button class="mini-btn" data-act="g-add-bm" data-ci="' + ci + '" data-gi="' + gi + '">＋ 添加</button>'
          + '<button class="mini-btn" data-act="g-del" data-ci="' + ci + '" data-gi="' + gi + '" title="删除分组">?</button>'
          + "</div>";

        (g.bookmarks || []).forEach((bm, bi) => {
          html += '<div class="admin-bm-row">'
            + '<input class="mini-input bm-title-in" value="' + esc(bm.title) + '" data-kind="bm-title" data-ci="' + ci + '" data-gi="' + gi + '" data-bi="' + bi + '" placeholder="名称" />'
            + '<input class="mini-input bm-url-in" value="' + esc(bm.url) + '" data-kind="bm-url" data-ci="' + ci + '" data-gi="' + gi + '" data-bi="' + bi + '" placeholder="https://…" />'
            + '<input class="mini-input bm-badge-in" value="' + esc(bm.badge || "") + '" data-kind="bm-badge" data-ci="' + ci + '" data-gi="' + gi + '" data-bi="' + bi + '" placeholder="标签" title="可选：推荐 / NEW / APP" />'
            + '<button class="mini-btn" data-act="bm-up" data-ci="' + ci + '" data-gi="' + gi + '" data-bi="' + bi + '" title="上移">↑</button>'
            + '<button class="mini-btn" data-act="bm-down" data-ci="' + ci + '" data-gi="' + gi + '" data-bi="' + bi + '" title="下移">↓</button>'
            + '<button class="mini-btn danger" data-act="bm-del" data-ci="' + ci + '" data-gi="' + gi + '" data-bi="' + bi + '" title="删除">✕</button>'
            + "</div>";
        });
        html += "</div>";
      });

      html += '<div style="padding:9px 12px">'
        + '<button class="mini-btn primary" data-act="cat-add-group" data-ci="' + ci + '">＋ 添加分组</button>'
        + "</div></div>";
    });
    els.adminCategories.innerHTML = html || '<p class="hint">暂无分类，请在下方新增。</p>';
  }

  /* ---------- 数据辅助 ---------- */
  function find(ci) { return (data().categories || [])[ci]; }
  function group(cat, gi) { return (cat.groups || [])[gi]; }
  function move(arr, from, to) {
    if (to < 0 || to >= arr.length) return;
    const [it] = arr.splice(from, 1);
    arr.splice(to, 0, it);
  }

  /* ---------- 操作分发 ---------- */
  function handleAction(e) {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    const ci = +btn.dataset.ci;
    const gi = +btn.dataset.gi;
    const bi = +btn.dataset.bi;
    const cat = find(ci);
    if (!cat) return;

    switch (act) {
      case "cat-up": move(data().categories, ci, ci - 1); break;
      case "cat-down": move(data().categories, ci, ci + 1); break;
      case "cat-del":
        if (confirm("确定删除分类「" + cat.name + "」？其下所有分组和书签都会删除。")) {
          data().categories.splice(ci, 1);
        } else return;
        break;
      case "cat-add-group":
        cat.groups = cat.groups || [];
        cat.groups.push({ name: "新分组", bookmarks: [] });
        break;
      case "g-add-bm":
        group(cat, gi).bookmarks.push({ title: "新链接", url: "https://", badge: "" });
        break;
      case "g-del":
        if (confirm("删除分组「" + group(cat, gi).name + "」？")) cat.groups.splice(gi, 1);
        else return;
        break;
      case "bm-up": move(group(cat, gi).bookmarks, bi, bi - 1); break;
      case "bm-down": move(group(cat, gi).bookmarks, bi, bi + 1); break;
      case "bm-del": group(cat, gi).bookmarks.splice(bi, 1); break;
      default: return;
    }
    render();
  }

  /* ---------- 输入变更（失焦提交） ---------- */
  function handleChange(e) {
    const inp = e.target;
    if (!inp.dataset.kind) return;
    const ci = +inp.dataset.ci;
    const cat = find(ci);
    if (!cat) return;
    const kind = inp.dataset.kind;
    const val = inp.value.trim();

    if (kind === "cat-icon") { cat.icon = val || "?"; return; }
    if (kind === "cat-name") { cat.name = val || "未命名"; return; }
    if (kind === "cat-slogan") { cat.slogan = val; return; }

    const gi = +inp.dataset.gi;
    const g = group(cat, gi);
    if (!g) return;
    if (kind === "g-name") { g.name = val || "未命名"; return; }

    const bi = +inp.dataset.bi;
    const bm = (g.bookmarks || [])[bi];
    if (!bm) return;
    if (kind === "bm-title") bm.title = val || "未命名";
    if (kind === "bm-url") bm.url = val;
    if (kind === "bm-badge") bm.badge = val;
  }

  /* ---------- 新增分类 ---------- */
  function addCategory() {
    const name = els.newCatName.value.trim();
    if (!name) { window.NavHub.showToast("请输入分类名称"); return; }
    data().categories.push({
      name,
      icon: els.newCatIcon.value.trim() || "?",
      slogan: "",
      groups: [{ name: "默认", bookmarks: [] }],
    });
    els.newCatName.value = "";
    els.newCatIcon.value = "";
    render();
  }

  /* ---------- 导出 / 导入 / 重置 ---------- */
  function exportJSON() {
    const blob = new Blob([JSON.stringify(data(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    a.download = "navhub-backup-" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
    window.NavHub.showToast("⬇️ 已导出备份文件");
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        if (!obj || !Array.isArray(obj.categories)) throw new Error("格式不正确");
        window.NavHub.data = obj;
        save();
        render();
        window.NavHub.showToast("⬆️ 导入成功");
      } catch (err) {
        window.NavHub.showToast("❌ 导入失败：" + err.message);
      }
    };
    reader.readAsText(file);
  }

  function resetDefault() {
    if (!confirm("确定恢复为默认数据？当前所有修改将丢失（可先导出备份）。")) return;
    localStorage.removeItem(window.NavHub.STORAGE_KEY);
    localStorage.removeItem(window.NavHub.CUSTOM_BG_KEY);
    location.reload();
  }

  /* ---------- 绑定 ---------- */
  function bind() {
    els.adminBtn.addEventListener("click", open);
    els.closeBtn.addEventListener("click", close);
    els.cancelBtn.addEventListener("click", close);
    els.mask.addEventListener("click", (e) => { if (e.target === els.mask) close(); });

    els.adminCategories.addEventListener("click", handleAction);
    els.adminCategories.addEventListener("change", handleChange);

    els.addCatBtn.addEventListener("click", addCategory);
    els.newCatName.addEventListener("keydown", (e) => { if (e.key === "Enter") addCategory(); });

    els.saveBtn.addEventListener("click", () => { save(); close(); });
    els.exportBtn.addEventListener("click", exportJSON);
    els.importFile.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) importJSON(e.target.files[0]);
      e.target.value = "";
    });
    els.resetBtn.addEventListener("click", resetDefault);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !els.mask.hidden) close();
    });
  }

  document.addEventListener("DOMContentLoaded", bind);
})();
