/* ============================================================
   NavHub - 个人网址导航 前端逻辑（V3 新标签页风格版）
   功能：多列卡片 / 搜索+引擎直达 / 主题切换 / 最近访问 / 热榜 /
         动态视频背景 / 跑马灯公告 / 时钟问候 / 自定义背景
   ============================================================ */
(function () {
  "use strict";

  const STORAGE_KEY = "navhub.data.v1";
  const THEME_KEY = "navhub.theme.v1";
  const RECENT_KEY = "navhub.recent.v1";
  const HOT_KEY = "navhub.hot.v1";
  const ENGINE_KEY = "navhub.engine.v1";
  const CUSTOM_BG_KEY = "navhub.custombg.v1";

  const ENGINES = {
    bing:   { label: "B 必应", icon: "B", url: "https://www.bing.com/search?q=" },
    baidu:  { label: "B 百度", icon: "B", url: "https://www.baidu.com/s?wd=" },
    google: { label: "G 谷歌", icon: "G", url: "https://www.google.com/search?q=" },
    sogou:  { label: "S 搜狗", icon: "S", url: "https://www.sogou.com/web?query=" },
    so360:  { label: "3 360", icon: "3", url: "https://www.so.com/s?q=" },
    zhihu:  { label: "知 知乎", icon: "知", url: "https://www.zhihu.com/search?type=content&q=" },
  };

  let data = null;
  let activeCat = "all";
  let searchTerm = "";

  const $ = (id) => document.getElementById(id);
  const els = {
    title: $("siteTitle"),
    subtitle: $("siteSubtitle"),
    brandLogo: $("brandLogo"),
    catNav: $("catNav"),
    content: $("content"),
    search: $("searchInput"),
    searchGo: $("searchGoBtn"),
    engineBtn: $("searchEngineBtn"),
    engineIcon: $("engineIcon"),
    engineDropdown: $("engineDropdown"),
    themeBtn: $("themeBtn"),
    today: $("today"),
    clockTime: $("clockTime"),
    clockWrap: $("clockWrap"),
    heroWrap: $("heroWrap"),
    greeting: $("greeting"),
    heroSub: $("heroSub"),
    footer: $("siteFooter"),
    friendLinks: $("friendLinks"),
    recentList: $("recentList"),
    hotList: $("hotList"),
    marqueeBar: $("marqueeBar"),
    marqueeTrack: $("marqueeTrack"),
    bgStage: $("bgStage"),
    bgVideo: $("bgVideo"),
    bgPoster: $("bgPoster"),
    bgOverlay: $("bgOverlay"),
  };

  /* ---------- 工具 ---------- */
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function getHost(url) {
    try { return new URL(url).hostname; } catch (e) { return ""; }
  }
  function highlight(text, term) {
    if (!term) return escapeHtml(text);
    const idx = text.toLowerCase().indexOf(term.toLowerCase());
    if (idx < 0) return escapeHtml(text);
    return escapeHtml(text.slice(0, idx)) + '<span class="mark">' + escapeHtml(text.slice(idx, idx + term.length)) + "</span>" + escapeHtml(text.slice(idx + term.length));
  }

  /* ---------- 主题 ---------- */
  function applyTheme(mode) {
    document.documentElement.setAttribute("data-theme", mode);
    els.themeBtn.textContent = mode === "light" ? "☀️" : mode === "dark" ? "?" : "?";
    localStorage.setItem(THEME_KEY, mode);
  }
  function cycleTheme() {
    const cur = document.documentElement.getAttribute("data-theme") || "auto";
    applyTheme(cur === "auto" ? "light" : cur === "light" ? "dark" : "auto");
  }

  /* ---------- 搜索引擎 ---------- */
  function initEngine() {
    const saved = localStorage.getItem(ENGINE_KEY) || "bing";
    setEngine(saved);
  }
  function setEngine(name) {
    const eng = ENGINES[name] || ENGINES.bing;
    els.engineIcon.textContent = eng.icon;
    els.engineBtn.title = "切换搜索引擎：" + eng.label;
    localStorage.setItem(ENGINE_KEY, name);
  }
  function engineUrl(q) {
    const name = localStorage.getItem(ENGINE_KEY) || "bing";
    return (ENGINES[name] || ENGINES.bing).url + encodeURIComponent(q);
  }

  /* ---------- 数据加载 ---------- */
  async function loadData() {
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        data = JSON.parse(local);
        if (data && data.categories) { afterLoad(); return; }
      }
    } catch (e) { /* ignore */ }
    try {
      const res = await fetch("data/default-data.json", { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      data = await res.json();
    } catch (e) {
      data = {
        site: { title: "我的导航", subtitle: "数据加载失败，请检查 data/default-data.json" },
        categories: [{ name: "示例", icon: "?", slogan: "示例", groups: [{ name: "默认", bookmarks: [{ title: "GitHub", url: "https://github.com" }] }] }],
      };
      showToast("⚠️ 默认数据加载失败，已显示示例");
    }
    afterLoad();
  }

  function afterLoad() {
    renderAll();
    applyBackground();
    startClock();
  }

  /* ---------- 背景：视频 / 图片 / 纯色 ---------- */
  function getBgConfig() {
    const site = (data && data.site) || {};
    let custom = null;
    try {
      custom = JSON.parse(localStorage.getItem(CUSTOM_BG_KEY));
    } catch (e) { /* ignore */ }
    if (custom && (custom.video || custom.image || custom.color || custom.bgVideo || custom.bgImage || custom.bgColor)) {
      return Object.assign({}, site, {
        bgVideo: custom.bgVideo || custom.video || "",
        bgImage: custom.bgImage || custom.image || "",
        bgColor: custom.bgColor || custom.color || "",
        bgOverlay: custom.bgOverlay != null ? custom.bgOverlay : site.bgOverlay,
      });
    }
    return site;
  }

  function applyBackground() {
    const cfg = getBgConfig();
    const overlay = Math.max(0, Math.min(1, parseFloat(cfg.bgOverlay) || 0.55));
    els.bgOverlay.style.opacity = overlay;

    // 1) 视频
    if (cfg.bgVideo) {
      els.bgVideo.src = cfg.bgVideo;
      els.bgStage.classList.add("has-video");
      els.bgStage.classList.remove("has-poster");
      els.bgPoster.style.backgroundImage = "";
      document.body.classList.add("has-bg");
      els.bgVideo.play().catch(() => { /* 自动播放失败则静默 */ });
      return;
    }
    // 2) 图片
    if (cfg.bgImage) {
      els.bgStage.classList.remove("has-video");
      els.bgStage.classList.add("has-poster");
      els.bgPoster.style.backgroundImage = "url('" + cfg.bgImage.replace(/'/g, "%27") + "')";
      document.body.classList.add("has-bg");
      return;
    }
    // 3) 纯色
    if (cfg.bgColor) {
      els.bgStage.classList.remove("has-video", "has-poster");
      els.bgStage.style.background = cfg.bgColor;
      document.body.classList.remove("has-bg");
      return;
    }
    // 4) 默认
    els.bgStage.classList.remove("has-video", "has-poster");
    els.bgStage.style.background = "";
    els.bgPoster.style.backgroundImage = "";
    document.body.classList.remove("has-bg");
  }

  /* ---------- 时钟 + 问候 ---------- */
  function startClock() {
    const site = (data && data.site) || {};
    if (!site.showClock) { els.clockWrap.style.display = "none"; }
    if (!site.showHero) { els.heroWrap.style.display = "none"; }
    tick();
    setInterval(tick, 1000);
  }
  function tick() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const week = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
    els.clockTime.textContent = pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
    els.today.textContent = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} 星期${week}`;
    const h = d.getHours();
    const greet = h < 6 ? "夜深了" : h < 9 ? "早上好" : h < 12 ? "上午好" : h < 14 ? "中午好" : h < 18 ? "下午好" : "晚上好";
    els.greeting.textContent = greet + "，欢迎来到「" + ((data && data.site && data.site.title) || "导航") + "」";
    els.heroSub.textContent = "全中文一站式精选实用资源 · 祝您使用愉快";
    els.heroWrap.hidden = false;
  }

  /* ---------- 跑马灯公告 ---------- */
  function renderMarquee() {
    const site = (data && data.site) || {};
    const notices = Array.isArray(site.notices) ? site.notices : [];
    if (!site.showMarquee || !notices.length) { els.marqueeBar.hidden = true; return; }
    els.marqueeBar.hidden = false;

    // 组装滚动内容（两份实现无缝循环）
    const build = () => notices.map((n, i) => {
      const text = n.text || "";
      const url = n.url || "";
      const inner = url
        ? '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(text) + "</a>"
        : "<span>" + escapeHtml(text) + "</span>";
      return '<span class="marquee-item">' + inner + '</span><span class="marquee-sep">✦</span>';
    }).join("");

    els.marqueeTrack.innerHTML = build() + build();
    // 点击整个公告条滚动区域时，若公告未带链接则无操作（仅展示）
  }

  /* ---------- 渲染 ---------- */
  function renderAll() {
    if (!data) return;
    const site = data.site || {};
    document.title = site.title || "我的导航";
    els.title.textContent = site.title || "我的导航";
    els.subtitle.textContent = site.subtitle || "";
    els.brandLogo.textContent = (site.logo || "?").slice(0, 1);
    els.footer.textContent = site.footer || "";
    renderCatNav();
    renderContent();
    renderSide();
    renderFriendLinks();
    renderMarquee();
  }

  function renderCatNav() {
    const cats = data.categories || [];
    let html = '<button data-cat="all" class="' + (activeCat === "all" ? "active" : "") + '">? 全部</button>';
    cats.forEach((c) => {
      const n = countCat(c);
      html += '<button data-cat="' + escapeHtml(c.name) + '" class="' + (activeCat === c.name ? "active" : "") + '">'
        + escapeHtml(c.icon || "?") + " " + escapeHtml(c.name)
        + '<span class="cat-count">' + n + "</span></button>";
    });
    els.catNav.innerHTML = html;
    els.catNav.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeCat = btn.dataset.cat;
        renderCatNav();
        renderContent();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  }

  function countCat(cat) {
    return (cat.groups || []).reduce((s, g) => s + (g.bookmarks || []).length, 0);
  }

  function renderContent() {
    const cats = (data.categories || []).filter(
      (c) => activeCat === "all" || c.name === activeCat
    );
    if (!cats.length) {
      els.content.innerHTML = '<div class="empty-state"><div class="big">?️</div><p>暂无分类</p></div>';
      return;
    }
    let html = "";
    cats.forEach((c) => { html += renderCatSection(c); });
    els.content.innerHTML = html;
  }

  function renderCatSection(cat) {
    const groups = cat.groups || [];
    if (!groups.length) return "";
    let html = '<section class="cat-section"><div class="cat-section-head"><div class="cat-section-title">'
      + '<span class="cat-icon">' + escapeHtml(cat.icon || "?") + "</span>"
      + "<span>" + escapeHtml(cat.name) + "</span></div>";
    if (cat.slogan) html += '<span class="cat-slogan">' + escapeHtml(cat.slogan) + "</span>";
    html += '<span class="cat-section-count">' + countCat(cat) + " 个</span></div>";

    groups.forEach((g) => {
      const bms = (g.bookmarks || []).filter((b) => matchSearch(b));
      if (!bms.length) return;
      html += '<div class="group"><div class="group-title">' + escapeHtml(g.name) + "</div>";
      html += '<div class="bookmark-grid">';
      bms.forEach((b) => { html += renderBookmark(b); });
      html += "</div></div>";
    });
    html += "</section>";
    return html;
  }

  function matchSearch(bm) {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return (bm.title || "").toLowerCase().includes(t) || (bm.url || "").toLowerCase().includes(t);
  }

  function badgeClass(badge) {
    if (badge === "推荐") return "b-rec";
    if (badge === "NEW") return "b-new";
    if (badge === "APP") return "b-app";
    return "";
  }

  function renderBookmark(bm) {
    const host = getHost(bm.url);
    const title = bm.title || host || "链接";
    const letter = escapeHtml((title[0] || "?").toUpperCase());
    const safeIcon = host
      ? '<img src="https://www.google.com/s2/favicons?domain=' + encodeURIComponent(host)
        + '&sz=64" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement(&quot;span&quot;),{textContent:&quot;'
        + letter + "&quot;}))\">"
      : "<span>" + letter + "</span>";
    const badge = bm.badge ? '<span class="bm-badge ' + badgeClass(bm.badge) + '">' + escapeHtml(bm.badge) + "</span>" : "";
    return '<a class="bookmark" href="' + escapeHtml(bm.url) + '" target="_blank" rel="noopener noreferrer" title="'
      + escapeHtml(bm.url) + '" data-url="' + escapeHtml(bm.url) + '" data-title="' + escapeHtml(title) + '">'
      + '<span class="bm-icon">' + safeIcon + "</span>"
      + '<span class="bm-title">' + highlight(title, searchTerm) + "</span>"
      + badge + "</a>";
  }

  /* ---------- 最近访问 / 热门排行 ---------- */
  function getRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch (e) { return []; }
  }
  function getHot() {
    try { return JSON.parse(localStorage.getItem(HOT_KEY)) || {}; } catch (e) { return {}; }
  }
  function recordClick(bm) {
    const title = bm.dataset.title || "";
    const url = bm.dataset.url || bm.href;
    let recent = getRecent().filter((r) => r.url !== url);
    recent.unshift({ title, url, t: Date.now() });
    if (recent.length > 8) recent = recent.slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    const hot = getHot();
    hot[url] = (hot[url] || 0) + 1;
    localStorage.setItem(HOT_KEY, JSON.stringify(hot));
    renderSide();
  }

  function renderSide() {
    const recent = getRecent();
    els.recentList.innerHTML = recent.length
      ? recent.map((r) => sideItem(r.title, r.url, "")).join("")
      : '<div class="side-empty">暂无记录</div>';

    const hot = getHot();
    const counts = [];
    (data.categories || []).forEach((c) => {
      (c.groups || []).forEach((g) => {
        (g.bookmarks || []).forEach((b) => {
          const n = hot[b.url] || 0;
          if (n > 0) counts.push({ title: b.title, url: b.url, n });
        });
      });
    });
    counts.sort((a, b) => b.n - a.n);
    const top = counts.slice(0, 8);
    els.hotList.innerHTML = top.length
      ? top.map((x, i) => sideItem(x.title, x.url, (i + 1) + ".")).join("")
      : '<div class="side-empty">点击资源后这里会显示排行</div>';
  }

  function sideItem(title, url, prefix) {
    const host = getHost(url);
    const icon = host
      ? '<img src="https://www.google.com/s2/favicons?domain=' + encodeURIComponent(host) + '&sz=64" alt="" loading="lazy">'
      : "<span>?</span>";
    return '<a class="side-item" href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">'
      + '<span class="si-icon">' + icon + "</span>"
      + '<span class="si-title">' + escapeHtml(title) + "</span>"
      + (prefix ? '<span class="si-hot">' + prefix + "</span>" : "") + "</a>";
  }

  /* ---------- 页脚友情链接 ---------- */
  function renderFriendLinks() {
    const cats = data.categories || [];
    const friend = cats.find((c) => /友情|友链/i.test(c.name));
    if (!friend) { els.friendLinks.innerHTML = ""; return; }
    const links = [];
    (friend.groups || []).forEach((g) => {
      (g.bookmarks || []).forEach((b) => links.push(b));
    });
    els.friendLinks.innerHTML = links.map((b) =>
      '<a href="' + escapeHtml(b.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(b.title) + "</a>"
    ).join("");
  }

  /* ---------- 搜索 ---------- */
  function onSearch() {
    searchTerm = els.search.value.trim();
    renderContent();
    if (!searchTerm) return;
    const any = els.content.querySelector(".bookmark");
    if (!any) {
      els.content.innerHTML = '<div class="empty-state"><div class="big">?</div>'
        + "<p>没有找到与 <b>" + escapeHtml(searchTerm) + "</b> 相关的资源，回车使用搜索引擎搜索</p></div>";
    }
  }

  function onSearchEnter() {
    const first = els.content.querySelector(".bookmark");
    if (first && searchTerm) {
      window.open(first.href, "_blank", "noopener");
      recordClick(first);
    } else if (els.search.value.trim()) {
      window.open(engineUrl(els.search.value.trim()), "_blank", "noopener");
    }
  }

  /* ---------- Toast ---------- */
  function showToast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.hidden = true; }, 2200);
  }

  /* ---------- 对外接口 ---------- */
  window.NavHub = {
    get data() { return data; },
    set data(v) { data = v; },
    renderAll,
    renderContent,
    applyBackground,
    showToast,
    STORAGE_KEY,
    CUSTOM_BG_KEY,
  };

  /* ---------- 事件绑定 ---------- */
  function bind() {
    els.themeBtn.addEventListener("click", cycleTheme);
    els.search.addEventListener("input", onSearch);
    els.search.addEventListener("keydown", (e) => { if (e.key === "Enter") onSearchEnter(); });
    els.searchGo.addEventListener("click", () => {
      if (els.search.value.trim()) window.open(engineUrl(els.search.value.trim()), "_blank", "noopener");
    });
    els.engineBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      els.engineDropdown.hidden = !els.engineDropdown.hidden;
    });
    els.engineDropdown.querySelectorAll("button").forEach((b) => {
      b.addEventListener("click", () => {
        setEngine(b.dataset.eng);
        els.engineDropdown.hidden = true;
      });
    });
    document.addEventListener("click", () => { els.engineDropdown.hidden = true; });

    document.addEventListener("click", (e) => {
      const a = e.target.closest(".bookmark, .side-item");
      if (a && a.dataset) recordClick(a);
    });
  }

  function init() {
    const savedTheme = localStorage.getItem(THEME_KEY) || "auto";
    applyTheme(savedTheme);
    initEngine();
    bind();
    loadData();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
