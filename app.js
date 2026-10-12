/**
 * KFK 2060 预言档案 - 交互逻辑核心
 * 具备功能：
 * 1. 标签单机选中，再次单击可取消回“全部”
 * 2. 切换标签自动平滑滚动回第一条预言（对齐吸顶筛选栏下方）
 * 3. 预言小标题展示与检索
 * 4. 现实核查考据（观察至 2026.10）
 * 5. 紧凑型序号标识与右侧状态列排版，减少不必要的框线
 * 6. 全文搜索与关键词高亮
 * 7. 深色/浅色高对比度主题切换
 */

document.addEventListener("DOMContentLoaded", () => {
  const allPredictions = window.PREDICTIONS_DATA || [];
  if (!allPredictions || allPredictions.length === 0) {
    console.error("未加载到预言数据集");
    return;
  }

  // App State
  const state = {
    search: "",
    status: "all",
    category: "all",
    era: "all",
    view: "table",
    currentModalId: null
  };

  // DOM Elements
  const els = {
    viewTable: document.getElementById("viewTable"),
    tableBody: document.getElementById("tableBody"),
    viewTimeline: document.getElementById("viewTimeline"),
    emptyState: document.getElementById("emptyState"),
    stickyPanel: document.getElementById("stickyPanel"),

    filteredCount: document.getElementById("filteredCount"),

    // Status pill counters
    pillAll: document.getElementById("pillAll"),
    pillFulfilled: document.getElementById("pillFulfilled"),
    pillPartial: document.getElementById("pillPartial"),
    pillUnfulfilled: document.getElementById("pillUnfulfilled"),
    pillPending: document.getElementById("pillPending"),
    pillUnverifiable: document.getElementById("pillUnverifiable"),

    // Inputs & Controls
    searchInput: document.getElementById("searchInput"),
    btnClearSearch: document.getElementById("btnClearSearch"),
    btnResetFilters: document.getElementById("btnResetFilters"),
    btnEmptyReset: document.getElementById("btnEmptyReset"),
    activeFilterTags: document.getElementById("activeFilterTags"),

    // Action buttons
    btnRandom: document.getElementById("btnRandom"),
    btnThemeToggle: document.getElementById("btnThemeToggle"),

    // Modal
    detailModal: document.getElementById("detailModal"),
    modalId: document.getElementById("modalId"),
    modalCat: document.getElementById("modalCat"),
    modalStatus: document.getElementById("modalStatus"),
    modalYear: document.getElementById("modalYear"),
    modalTitleHeadline: document.getElementById("modalTitleHeadline"),
    modalQuestion: document.getElementById("modalQuestion"),
    modalAnswer: document.getElementById("modalAnswer"),
    modalCore: document.getElementById("modalCore"),
    modalFactCheck: document.getElementById("modalFactCheck"),
    btnCloseModal: document.getElementById("btnCloseModal"),
    btnModalPrev: document.getElementById("btnModalPrev"),
    btnModalNext: document.getElementById("btnModalNext"),
    btnModalCopy: document.getElementById("btnModalCopy"),

    // Toast
    toast: document.getElementById("toast")
  };

  // 统计各大状态数值并同步显示在标签上
  function initOverallStats() {
    let counts = {
      total: allPredictions.length,
      fulfilled: 0,
      partial: 0,
      unfulfilled: 0,
      pending: 0,
      unverifiable: 0
    };

    allPredictions.forEach(item => {
      if (item.status === "已实现") counts.fulfilled++;
      else if (item.status === "部分实现") counts.partial++;
      else if (item.status === "未实现") counts.unfulfilled++;
      else if (item.status === "待验证") counts.pending++;
      else if (item.status === "无法验证") counts.unverifiable++;
    });

    if (els.pillAll) els.pillAll.textContent = counts.total;
    if (els.pillFulfilled) els.pillFulfilled.textContent = counts.fulfilled;
    if (els.pillPartial) els.pillPartial.textContent = counts.partial;
    if (els.pillUnfulfilled) els.pillUnfulfilled.textContent = counts.unfulfilled;
    if (els.pillPending) els.pillPending.textContent = counts.pending;
    if (els.pillUnverifiable) els.pillUnverifiable.textContent = counts.unverifiable;
  }

  // 多维筛选计算
  function getFilteredData() {
    return allPredictions.filter(item => {
      // 1. 实现状态筛选
      if (state.status !== "all" && item.status !== state.status) {
        return false;
      }

      // 2. 预言类型分类筛选
      if (state.category !== "all" && item.category !== state.category) {
        return false;
      }

      // 3. 预言年代筛选
      if (state.era !== "all") {
        const yr = item.target_year || "";
        if (state.era === "2019-2020") {
          if (!yr.includes("2019") && !yr.includes("2020")) return false;
        } else if (state.era === "2021-2030") {
          if (!yr.includes("202") && !yr.includes("2030") && !yr.includes("20年代") && !yr.includes("30年代前")) return false;
        } else if (state.era === "2031-2048") {
          if (!yr.includes("203") && !yr.includes("204") && !yr.includes("30年代") && !yr.includes("40年代")) return false;
        } else if (state.era === "2049-2060") {
          if (!yr.includes("2049") && !yr.includes("205") && !yr.includes("2060") && !yr.includes("50年代")) return false;
        } else if (state.era === "远期/无明确年份") {
          if (!yr.includes("远期") && !yr.includes("无明确") && !yr.includes("未来") && !yr.includes("战后") && !yr.includes("童年") && !yr.includes("历史")) return false;
        }
      }

      // 4. 全文关键字模糊检索 (支持标题、问题、回答、核心、考据、分类、标签)
      if (state.search.trim()) {
        const q = state.search.toLowerCase().trim();
        const haystack = [
          item.id.toString(),
          item.title || "",
          item.short_title || "",
          item.question || "",
          item.answer || "",
          item.core_prediction || "",
          item.fact_check || "",
          item.category || "",
          item.target_year || "",
          (item.tags || []).join(" ")
        ].join(" ").toLowerCase();

        if (!haystack.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }

  // 清洗回答文本中多余的重复 "KFK: " 前缀
  function cleanAnswerText(ans) {
    if (!ans) return "";
    return ans.replace(/^KFK[：:]\s*/i, "").trim();
  }

  // 需求4: 切换标签、重置或切换视图时，自动平滑滚动回第一条预言（对齐吸顶筛选栏下方）
  function scrollToFirstItem() {
    const targetEl = state.view === "timeline" ? els.viewTimeline : els.viewTable;
    if (!targetEl) return;

    const panelHeight = els.stickyPanel ? els.stickyPanel.offsetHeight : 140;
    const targetTop = targetEl.getBoundingClientRect().top + window.pageYOffset - panelHeight - 16;

    // 如果用户已向下滚动浏览，自动平滑滚回第一条
    if (window.pageYOffset > targetTop) {
      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "smooth"
      });
    }
  }

  // 渲染清单列表视图 (已整合小标题、缩小序号标、状态靠最右，去除多余框线)
  function renderTableView(items) {
    if (!els.tableBody) return;

    if (items.length === 0) {
      els.tableBody.innerHTML = "";
      return;
    }

    const html = items.map(item => {
      const statusClass = getStatusClass(item.status);
      const cleanAns = cleanAnswerText(item.answer);
      const headline = item.title || item.short_title || "";

      return `
        <tr data-id="${item.id}">
          <!-- 1. 序号与属性 (纯色块区分，无繁复边框) -->
          <td class="col-meta-cell">
            <div class="meta-identity-card">
              <span class="meta-id-number">#${String(item.id).padStart(3, "0")}</span>
              <span class="meta-type-tag">${escapeHtml(item.category)}</span>
              <span class="meta-year-tag">${escapeHtml(item.target_year || "未注明")}</span>
            </div>
          </td>

          <!-- 2. 预言小标题 · 提问与原文回答 -->
          <td class="col-qa-th">
            <div class="qa-box">
              ${headline ? `
              <div class="prophecy-headline-badge">
                <span class="title-pin">📌</span> <span class="title-text">${highlightSearchText(escapeHtml(headline))}</span>
              </div>
              ` : ""}
              <div class="qa-question">
                <span class="q-label-tag">问：</span>${highlightSearchText(escapeHtml(item.question))}
              </div>
              <div class="qa-answer">
                <span class="a-label-tag">KFK：</span>${highlightSearchText(escapeHtml(cleanAns))}
              </div>
            </div>
          </td>

          <!-- 3. 核心提炼 · 现实考据与事实核查 (无杂乱虚线边框) -->
          <td class="col-fact-th">
            <div class="fact-box">
              <div class="fact-core">
                <strong>💡 预言核心：</strong> ${highlightSearchText(escapeHtml(item.core_prediction))}
              </div>
              <div class="fact-check-content">
                <strong>🔍 现实考据：</strong> ${highlightSearchText(escapeHtml(item.fact_check))}
              </div>
            </div>
          </td>

          <!-- 4. 实现状态 (放置在最右边末尾) -->
          <td class="col-status-cell">
            <div class="status-cell-wrap">
              <span class="badge-status ${statusClass}">
                <i class="status-dot"></i> ${escapeHtml(item.status)}
              </span>
              <button class="btn-detail-sm" onclick="window.openDetail(${item.id})">详情 ↗</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    els.tableBody.innerHTML = html;
  }

  // 渲染时间轴视图
  function renderTimelineView(items) {
    if (!els.viewTimeline) return;

    if (items.length === 0) {
      els.viewTimeline.innerHTML = "";
      return;
    }

    const eraGroups = [
      { id: "2019", title: "2019年 · 穿越之年与多事之秋", filter: y => y.includes("2019") },
      { id: "2020", title: "2020年 · KFK自称出生与动荡伊始", filter: y => y.includes("2020") },
      { id: "2021-2025", title: "2021-2025年 · 房价下行与现实剧变", filter: y => y.includes("2021") || y.includes("2022") || y.includes("2023") || y.includes("2024") || y.includes("20年代") },
      { id: "2030s", title: "2030年代 · 手机淘汰与AI跨界融合", filter: y => y.includes("2030") || y.includes("30年代") || y.includes("2031") || y.includes("2032") },
      { id: "2035", title: "2035年 · 中国首款全息游戏OS与无障碍语言", filter: y => y.includes("2035") },
      { id: "2038-2039", title: "2038-2039年 · 强AI量产与选拔变革", filter: y => y.includes("2038") || y.includes("2039") },
      { id: "2047-2048", title: "2047-2048年 · 第三次世界大战与历史大转折", filter: y => y.includes("2047") || y.includes("2048") },
      { id: "2049", title: "2049年 · 观察者问题破译与《2019》怀旧剧", filter: y => y.includes("2049") },
      { id: "2050s", title: "2050年代 · 超级细菌灾难与深空探索", filter: y => y.includes("205") || y.includes("50年代") },
      { id: "2060", title: "2060年 · 人口锐减至53亿与万有归一", filter: y => y.includes("2060") },
      { id: "other", title: "远期 / 超验神学未定年份", filter: y => !y.match(/20\d\d|30年代|40年代|50年代|20年代/) }
    ];

    let timelineHtml = "";
    eraGroups.forEach(group => {
      const eraItems = items.filter(it => group.filter(it.target_year || ""));
      if (eraItems.length === 0) return;

      const itemsCards = eraItems.map(it => {
        const statusClass = getStatusClass(it.status);
        const cleanAns = cleanAnswerText(it.answer);
        const headline = it.title || it.short_title || "";

        return `
          <div class="timeline-item-card" onclick="window.openDetail(${it.id})">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span class="meta-id-number" style="font-size:0.85rem;">#${String(it.id).padStart(3, "0")} · [${escapeHtml(it.category)}] ${escapeHtml(it.target_year)}</span>
              <span class="badge-status ${statusClass}">
                <i class="status-dot"></i> ${escapeHtml(it.status)}
              </span>
            </div>
            ${headline ? `<div class="prophecy-headline-badge" style="margin-bottom:8px;"><span class="title-pin">📌</span> <span>${escapeHtml(headline)}</span></div>` : ""}
            <div class="qa-question" style="font-size:1.05rem; margin-bottom:6px;">${escapeHtml(it.question)}</div>
            <div class="qa-answer" style="font-size:0.92rem; margin-bottom:8px;">${escapeHtml(cleanAns)}</div>
            <div class="fact-core" style="font-size:0.92rem; margin-bottom:6px;">💡 ${escapeHtml(it.core_prediction)}</div>
            <div class="fact-check-content" style="font-size:0.9rem;">🔍 ${escapeHtml(it.fact_check)}</div>
          </div>
        `;
      }).join("");

      timelineHtml += `
        <div class="timeline-era-group">
          <div class="timeline-era-header">
            <i class="timeline-era-dot"></i>
            <span class="timeline-era-title">${group.title} (${eraItems.length})</span>
          </div>
          <div class="timeline-items">${itemsCards}</div>
        </div>
      `;
    });

    els.viewTimeline.innerHTML = timelineHtml;
  }

  // 综合主渲染入口
  function render() {
    const items = getFilteredData();
    if (els.filteredCount) els.filteredCount.textContent = items.length;

    // 视图切换
    if (els.viewTable) els.viewTable.style.display = state.view === "table" ? "block" : "none";
    if (els.viewTimeline) els.viewTimeline.style.display = state.view === "timeline" ? "block" : "none";

    // 空状态提示
    if (els.emptyState) {
      els.emptyState.style.display = items.length === 0 ? "block" : "none";
    }

    if (state.view === "table") {
      renderTableView(items);
    } else if (state.view === "timeline") {
      renderTimelineView(items);
    }

    updateActiveFilterChips();
  }

  // 顶部激活条件提示条
  function updateActiveFilterChips() {
    if (!els.activeFilterTags) return;

    let chips = [];
    if (state.status !== "all") {
      chips.push(`状态: ${state.status}`);
    }
    if (state.category !== "all") {
      chips.push(`类型: ${state.category}`);
    }
    if (state.era !== "all") {
      chips.push(`年代: ${state.era}`);
    }
    if (state.search.trim()) {
      chips.push(`关键词: "${state.search}"`);
    }

    if (chips.length > 0) {
      els.activeFilterTags.innerHTML = chips.map(c => `<span class="filter-badge-chip">${escapeHtml(c)}</span>`).join("");
      if (els.btnResetFilters) els.btnResetFilters.style.display = "inline";
    } else {
      els.activeFilterTags.innerHTML = "";
      if (els.btnResetFilters) els.btnResetFilters.style.display = "none";
    }
  }

  // 状态样式映射
  function getStatusClass(status) {
    switch (status) {
      case "已实现": return "status-fulfilled";
      case "部分实现": return "status-partial";
      case "未实现": return "status-unfulfilled";
      case "待验证": return "status-pending";
      case "无法验证": return "status-unverifiable";
      default: return "";
    }
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function highlightSearchText(text) {
    if (!state.search.trim()) return text;
    try {
      const q = state.search.trim();
      const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
      return text.replace(regex, `<mark style="background: rgba(56, 189, 248, 0.35); color: inherit; padding: 0 2px; border-radius: 2px;">$1</mark>`);
    } catch (e) {
      return text;
    }
  }

  function showToast(msg, duration = 2000) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.style.display = "block";
    setTimeout(() => {
      els.toast.style.display = "none";
    }, duration);
  }

  // 搜索框输入与防抖
  let searchTimer = null;
  if (els.searchInput) {
    els.searchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.search = e.target.value;
        if (els.btnClearSearch) els.btnClearSearch.style.display = state.search ? "block" : "none";
        render();
        scrollToFirstItem();
      }, 150);
    });
  }

  if (els.btnClearSearch) {
    els.btnClearSearch.addEventListener("click", () => {
      if (els.searchInput) els.searchInput.value = "";
      state.search = "";
      els.btnClearSearch.style.display = "none";
      render();
      scrollToFirstItem();
    });
  }

  // 需求1 & 4: 标签可单机选中，也可单击取消；切换时自动滚动到第一条
  function setupPillToggle(pills, stateKey, onSelect) {
    pills.forEach(btn => {
      btn.addEventListener("click", () => {
        const val = btn.getAttribute(`data-${stateKey}`);
        const isCurrentActive = btn.classList.contains("active");

        if (val === "all") {
          // 点击“全部”：激活全部，取消其他
          pills.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          state[stateKey] = "all";
        } else if (isCurrentActive) {
          // 再次单击已选中的具体标签 -> 取消选中，自动回退到“全部”
          btn.classList.remove("active");
          const allBtn = Array.from(pills).find(b => b.getAttribute(`data-${stateKey}`) === "all");
          if (allBtn) allBtn.classList.add("active");
          state[stateKey] = "all";
        } else {
          // 单击未选中的具体标签 -> 选中此标签，取消其他
          pills.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          state[stateKey] = val;
        }

        onSelect();
        scrollToFirstItem();
      });
    });
  }

  // 1. 实现状态 Pills 绑定
  const statusPills = document.querySelectorAll("#statusFilterPills .pill-btn");
  setupPillToggle(statusPills, "status", () => render());

  // 2. 预言类型 Pills 绑定
  const categoryPills = document.querySelectorAll("#categoryFilterPills .pill-btn");
  setupPillToggle(categoryPills, "category", () => render());

  // 3. 预言年代 Pills 绑定
  const eraPills = document.querySelectorAll("#eraFilterPills .pill-btn");
  setupPillToggle(eraPills, "era", () => render());

  // 视图切换按钮 (清单列表 vs 时间轴)
  const viewBtns = document.querySelectorAll(".btn-view");
  viewBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      viewBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.view = btn.getAttribute("data-view");
      render();
      scrollToFirstItem();
    });
  });

  // 重置全部筛选条件
  function resetAllFilters() {
    state.search = "";
    state.status = "all";
    state.category = "all";
    state.era = "all";

    if (els.searchInput) els.searchInput.value = "";
    if (els.btnClearSearch) els.btnClearSearch.style.display = "none";

    statusPills.forEach(b => b.classList.toggle("active", b.getAttribute("data-status") === "all"));
    categoryPills.forEach(b => b.classList.toggle("active", b.getAttribute("data-category") === "all"));
    eraPills.forEach(b => b.classList.toggle("active", b.getAttribute("data-era") === "all"));

    render();
    scrollToFirstItem();
    showToast("已重置所有筛选条件");
  }

  if (els.btnResetFilters) els.btnResetFilters.addEventListener("click", resetAllFilters);
  if (els.btnEmptyReset) els.btnEmptyReset.addEventListener("click", resetAllFilters);

  // 详情弹窗逻辑
  window.openDetail = (id) => {
    const item = allPredictions.find(it => it.id === id);
    if (!item) return;

    state.currentModalId = id;
    if (els.modalId) els.modalId.textContent = `#${String(item.id).padStart(3, "0")}`;
    if (els.modalCat) els.modalCat.textContent = item.category;
    if (els.modalStatus) {
      els.modalStatus.textContent = item.status;
      els.modalStatus.className = `badge-status ${getStatusClass(item.status)}`;
    }
    if (els.modalYear) els.modalYear.textContent = `年代：${item.target_year || "未注明"}`;

    if (els.modalTitleHeadline) {
      const headline = item.title || item.short_title || "";
      if (headline) {
        els.modalTitleHeadline.innerHTML = `<div class="prophecy-headline-badge" style="font-size:1.02rem; padding:4px 12px; margin-bottom:12px;"><span class="title-pin">📌</span> <span>${escapeHtml(headline)}</span></div>`;
        els.modalTitleHeadline.style.display = "block";
      } else {
        els.modalTitleHeadline.innerHTML = "";
        els.modalTitleHeadline.style.display = "none";
      }
    }

    if (els.modalQuestion) els.modalQuestion.textContent = item.question;
    if (els.modalAnswer) els.modalAnswer.textContent = cleanAnswerText(item.answer);
    if (els.modalCore) els.modalCore.textContent = item.core_prediction;
    if (els.modalFactCheck) els.modalFactCheck.textContent = item.fact_check;

    if (els.detailModal) els.detailModal.style.display = "flex";
  };

  if (els.btnCloseModal) {
    els.btnCloseModal.addEventListener("click", () => {
      if (els.detailModal) els.detailModal.style.display = "none";
      state.currentModalId = null;
    });
  }

  if (els.detailModal) {
    els.detailModal.addEventListener("click", (e) => {
      if (e.target === els.detailModal) {
        els.detailModal.style.display = "none";
        state.currentModalId = null;
      }
    });
  }

  if (els.btnModalPrev) {
    els.btnModalPrev.addEventListener("click", () => {
      if (!state.currentModalId) return;
      const currentList = getFilteredData();
      const idx = currentList.findIndex(x => x.id === state.currentModalId);
      if (idx > 0) {
        window.openDetail(currentList[idx - 1].id);
      } else {
        showToast("已经是第一条了");
      }
    });
  }

  if (els.btnModalNext) {
    els.btnModalNext.addEventListener("click", () => {
      if (!state.currentModalId) return;
      const currentList = getFilteredData();
      const idx = currentList.findIndex(x => x.id === state.currentModalId);
      if (idx >= 0 && idx < currentList.length - 1) {
        window.openDetail(currentList[idx + 1].id);
      } else {
        showToast("已经是最后一条了");
      }
    });
  }

  if (els.btnModalCopy) {
    els.btnModalCopy.addEventListener("click", () => {
      if (!state.currentModalId) return;
      const item = allPredictions.find(it => it.id === state.currentModalId);
      if (!item) return;
      const headline = item.title || item.short_title ? ` · ${item.title || item.short_title}` : "";
      const text = `【KFK 2060 预言 #${item.id}${headline}】\n类型：${item.category} | 年代：${item.target_year} | 状态：${item.status}\n问：${item.question}\nKFK：${cleanAnswerText(item.answer)}\n💡 预言核心：${item.core_prediction}\n🔍 现实考据：${item.fact_check}`;
      navigator.clipboard.writeText(text).then(() => {
        showToast("已成功复制到剪贴板！");
      }).catch(() => {
        showToast("复制失败，请手动选择复制");
      });
    });
  }

  // 随机探索一条预言
  if (els.btnRandom) {
    els.btnRandom.addEventListener("click", () => {
      const randItem = allPredictions[Math.floor(Math.random() * allPredictions.length)];
      window.openDetail(randItem.id);
      showToast(`🎲 随机探索第 #${randItem.id} 条预言`);
    });
  }

  // 深浅主题切换逻辑
  const savedTheme = localStorage.getItem("kfk_theme") || "dark";
  if (savedTheme === "light") {
    document.body.classList.remove("theme-dark");
    document.body.classList.add("theme-light");
  }

  if (els.btnThemeToggle) {
    els.btnThemeToggle.addEventListener("click", () => {
      const isLight = document.body.classList.contains("theme-light");
      if (isLight) {
        document.body.classList.remove("theme-light");
        document.body.classList.add("theme-dark");
        localStorage.setItem("kfk_theme", "dark");
        showToast("已切换至星空深色模式");
      } else {
        document.body.classList.remove("theme-dark");
        document.body.classList.add("theme-light");
        localStorage.setItem("kfk_theme", "light");
        showToast("已切换至明亮日光模式");
      }
    });
  }

  // 键盘快捷导航
  document.addEventListener("keydown", (e) => {
    if (els.detailModal && els.detailModal.style.display !== "none") {
      if (e.key === "Escape") {
        els.detailModal.style.display = "none";
        state.currentModalId = null;
      } else if (e.key === "ArrowLeft" && els.btnModalPrev) {
        els.btnModalPrev.click();
      } else if (e.key === "ArrowRight" && els.btnModalNext) {
        els.btnModalNext.click();
      }
    }
  });

  // 初始化执行
  initOverallStats();
  render();
});
