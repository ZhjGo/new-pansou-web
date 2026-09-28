'use strict';
/* PanSou 搜索 · 公网版前端（对齐 Muse 卡片版设计） */
const API_BASE = window.PANSOU_API_BASE || ''; // 后端基地址来自 assets/js/config.js（不提交到 git）
const PAGE_SIZE = 10;
const HOT_LIMIT = 10;
const HIST_KEY = 'pansou_history_v2';

/* 网盘元信息：logo 均为本地 assets 文件，禁止热链 */
const DRIVES = {
  baidu:  { name: '百度网盘', logo: 'assets/logos/baidu.ico' },
  aliyun: { name: '阿里云盘', logo: 'assets/logos/alipan.ico' },
  quark:  { name: '夸克网盘', logo: 'assets/logos/quark.ico' },
  uc:     { name: 'UC网盘',   logo: 'assets/logos/uc.ico' },
  tianyi: { name: '天翼云盘', logo: 'assets/logos/tianyi.ico' },
  '115':  { name: '115网盘',  logo: 'assets/logos/115.ico' },
  pikpak: { name: 'PikPak',   logo: 'assets/logos/pikpak.ico' },
  xunlei: { name: '迅雷云盘', logo: 'assets/logos/xunlei.png' },
  '123':  { name: '123网盘',  logo: 'assets/logos/123pan.ico' },
  mobile: { name: '移动云盘', logo: 'assets/logos/yun139.png' },
  magnet: { name: '磁力链接', icon: 'magnet' },
  ed2k:   { name: '电驴链接', icon: 'ed2k' },
  others: { name: '其他',     icon: 'others' },
};

const HAND_ICONS = {
  magnet: '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M5 4h4.5v7a3 3 0 0 0 6 0V4H20v7a8 8 0 0 1-15 0V4z" fill="#ff453a"/><rect x="5" y="4" width="4.5" height="4" fill="#fff"/><rect x="15.5" y="4" width="4.5" height="4" fill="#fff"/></svg>',
  ed2k: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#2f7cf6" stroke-width="2.4" stroke-linecap="round"><path d="M9.5 14.5a4 4 0 0 0 6 0l2.5-2.5a4 4 0 0 0-5.7-5.7L11 7.6"/><path d="M14.5 9.5a4 4 0 0 0-6 0L6 12a4 4 0 0 0 5.7 5.7l1.3-1.3"/></svg>',
  others: '<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="5" cy="12" r="2.4" fill="#8e8e93"/><circle cx="12" cy="12" r="2.4" fill="#8e8e93"/><circle cx="19" cy="12" r="2.4" fill="#8e8e93"/></svg>',
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const state = { kw: '', merged: null, total: 0, tab: 'all', sort: 'smart', page: 1, updatedAt: '' };

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function driveMeta(key) { return DRIVES[key] || null; }
function driveName(key) { const m = driveMeta(key); return m ? m.name : key; }
function driveLogo(key, px) {
  const m = driveMeta(key);
  const size = px || 46;
  if (m && m.logo) return `<img src="${m.logo}" alt="${esc(driveName(key))}" loading="lazy" style="width:${size}px;height:${size}px;object-fit:contain" onerror="this.outerHTML=window.__logoFallback('${esc(key)}',${size})">`;
  if (m && m.icon && HAND_ICONS[m.icon]) return HAND_ICONS[m.icon];
  return window.__logoFallback(key, size);
}
window.__logoFallback = function (key, size) {
  const ch = (driveName(key) || key || '?').trim().charAt(0);
  return `<span style="width:${size}px;height:${size}px;border-radius:12px;background:#eef4fe;color:#2f7cf6;font-weight:700;font-size:${Math.round(size * 0.45)}px;display:flex;align-items:center;justify-content:center">${esc(ch)}</span>`;
};
function fmtDate(s) {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())}`;
}
function fmtHM(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}
function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60 * 1000) return '刚刚';
  if (diff < 60 * 60 * 1000) return Math.floor(diff / 60000) + ' 分钟前';
  if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / 3600000) + ' 小时前';
  return fmtDate(new Date(ts).toISOString());
}

/* ---------- 本机搜索历史（含次数） ---------- */
function getHist() {
  try { return JSON.parse(localStorage.getItem(HIST_KEY)) || []; } catch (e) { return []; }
}
function pushHist(kw) {
  kw = kw.trim();
  if (!kw) return;
  const h = getHist();
  const i = h.findIndex((x) => x.kw === kw);
  if (i >= 0) { h[i].n = (h[i].n || 1) + 1; h[i].ts = Date.now(); h.unshift(h.splice(i, 1)[0]); }
  else h.unshift({ kw, ts: Date.now(), n: 1 });
  try { localStorage.setItem(HIST_KEY, JSON.stringify(h.slice(0, 50))); } catch (e) {}
}
function delHist(kw) {
  const h = getHist().filter((x) => x.kw !== kw);
  try { localStorage.setItem(HIST_KEY, JSON.stringify(h)); } catch (e) {}
  renderHistory();
}
function clearHist() {
  try { localStorage.removeItem(HIST_KEY); } catch (e) {}
  renderHistory();
}

/* ---------- 路由 ---------- */
function setNav(name) {
  $$('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.nav === name));
}
function route() {
  const h = location.hash;
  const m = h.match(/^#\/s\?(.*)$/);
  if (m) {
    const kw = new URLSearchParams(m[1]).get('kw') || '';
    showResults(kw);
  } else if (h === '#/h') {
    showHistory();
  } else {
    showHome();
  }
}
function goHome() { if (location.hash === '#/' || location.hash === '') route(); else location.hash = '#/'; }
function goHistory() { if (location.hash === '#/h') route(); else location.hash = '#/h'; }
function doSearch(kw) {
  kw = (kw || '').trim();
  if (!kw) return;
  pushHist(kw);
  const target = '#/s?kw=' + encodeURIComponent(kw);
  if (location.hash === target) route();
  else location.hash = target;
}

/* ---------- 首页 ---------- */
function showHome() {
  $('#view-home').hidden = false;
  $('#view-results').hidden = true;
  $('#view-history').hidden = true;
  setNav('home');
  loadHot();
}
async function loadHot() {
  const box = $('#hotList');
  box.innerHTML = '<div class="empty-tip" style="grid-column:1/-1">加载中…</div>';
  try {
    const r = await fetch(`${API_BASE}/api/hot?limit=${HOT_LIMIT}`);
    const j = await r.json();
    const ks = (j && j.code === 0 && j.data && j.data.keywords) || [];
    if (ks.length) { renderHot(ks); return; }
  } catch (e) { /* fallthrough */ }
  box.innerHTML = '<div class="empty-tip" style="grid-column:1/-1">还没有热搜数据，去搜点什么吧</div>';
}
function renderHot(ks) {
  $('#hotList').innerHTML = ks.map((k, i) => `
    <button class="hot-row" data-kw="${esc(k.keyword)}">
      <span class="hot-num">${i + 1}</span>
      <span class="hot-kw">${esc(k.keyword)}</span>
      <span class="hot-count">${k.count} 次全站搜索</span>
      <span class="chev">›</span>
    </button>`).join('');
}

/* ---------- 结果页 ---------- */
function showResults(kw) {
  $('#view-home').hidden = true;
  $('#view-results').hidden = false;
  $('#view-history').hidden = true;
  setNav('search');
  $('#resultInput').value = kw;
  state.kw = kw; state.tab = 'all'; state.sort = 'smart'; state.page = 1;
  $('#sortSelect').value = 'smart';
  if (kw) fetchResults(kw);
  else {
    $('#tabs').innerHTML = ''; $('#pager').innerHTML = '';
    $('#resultCount').textContent = '';
    $('#cards').innerHTML = '<div class="no-result">在上方输入关键词开始搜索</div>';
  }
}
async function fetchResults(kw) {
  const list = $('#cards');
  $('#resultCount').textContent = '';
  list.innerHTML = '<div class="loading"><div class="spinner"></div>搜索中…</div>';
  $('#tabs').innerHTML = '';
  $('#pager').innerHTML = '';
  try {
    const r = await fetch(`${API_BASE}/api/search?kw=${encodeURIComponent(kw)}`);
    const j = await r.json();
    if (!j || j.code !== 0 || !j.data) throw new Error(j && j.message ? j.message : '接口返回异常');
    state.merged = j.data.merged_by_type || {};
    state.total = j.data.total || 0;
    state.updatedAt = fmtHM(Date.now());
    renderTabs();
    renderCards();
  } catch (e) {
    list.innerHTML = `<div class="no-result">搜索失败：${esc(e.message)}<br>请检查网络后重试</div>`;
  }
}
function flatItems() {
  const out = [];
  for (const [type, arr] of Object.entries(state.merged || {})) {
    (arr || []).forEach((it) => out.push(Object.assign({ _type: type }, it)));
  }
  return out;
}
function currentItems() {
  let items = state.tab === 'all' ? flatItems()
    : (state.merged[state.tab] || []).map((it) => Object.assign({ _type: state.tab }, it));
  if (state.sort === 'new' || state.sort === 'old') {
    const dir = state.sort === 'new' ? -1 : 1;
    items = items.slice().sort((a, b) => {
      const ta = new Date(a.datetime).getTime() || 0;
      const tb = new Date(b.datetime).getTime() || 0;
      return (ta - tb) * dir;
    });
  }
  return items;
}
function renderTabs() {
  const tabs = [{ key: 'all', name: '全部', count: state.total }];
  for (const [type, arr] of Object.entries(state.merged || {})) {
    tabs.push({ key: type, name: driveName(type), count: (arr || []).length });
  }
  $('#tabs').innerHTML = tabs.map((t) =>
    `<button class="tab${state.tab === t.key ? ' active' : ''}" data-tab="${esc(t.key)}">${esc(t.name)}<span class="n">${t.count}</span></button>`
  ).join('');
}
function renderCards() {
  const items = currentItems();
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  if (state.page > totalPages) state.page = totalPages;
  const pageItems = items.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);
  $('#resultCount').innerHTML = items.length
    ? `为你找到 <b>${items.length}</b> 个相关资源 · ${esc(state.updatedAt)} 更新`
    : '';

  if (!pageItems.length) {
    $('#cards').innerHTML = '<div class="no-result">没有找到相关资源，换个关键词试试</div>';
  } else {
    $('#cards').innerHTML = pageItems.map((it, i) => {
      const idx = (state.page - 1) * PAGE_SIZE + i;
      const title = (it.note && it.note.trim()) ? it.note.trim() : it.url;
      const desc = (it.note && it.note.trim()) ? it.note.trim() : '该资源暂无更多简介，请打开资源链接查看详情。';
      const pwd = (it.password || '').trim();
      const date = fmtDate(it.datetime);
      const tags = [`<span class="res-tag">${esc(driveName(it._type))}</span>`];
      if (it.source) tags.push(`<span class="res-tag">${esc(it.source)}</span>`);
      return `<div class="res-card" data-idx="${idx}">
        <div class="res-logo">
          <span class="logo-box">${driveLogo(it._type)}</span>
          <span class="logo-name">${esc(driveName(it._type))}</span>
        </div>
        <div class="res-body">
          <p class="res-title" data-open="${esc(it.url)}">${esc(title)}</p>
          <div class="res-meta">
            <span>${esc(driveName(it._type))}</span><span class="dot">·</span>
            ${date ? `<span>${esc(date)}</span><span class="dot">·</span>` : ''}
            ${pwd ? `<span>提取码 ${esc(pwd)}</span>` : '<span>无提取码</span>'}
          </div>
          <p class="res-desc">${esc(desc)}</p>
          <div class="res-tags">${tags.join('')}</div>
        </div>
        <button class="card-menu-btn" data-menu="${idx}" title="更多操作">···</button>
      </div>`;
    }).join('');
  }
  $('#pager').innerHTML = totalPages > 1
    ? `<button class="page-btn" id="prevPage"${state.page <= 1 ? ' disabled' : ''}>上一页</button>
       <span class="page-info">${state.page} / ${totalPages}</span>
       <button class="page-btn" id="nextPage"${state.page >= totalPages ? ' disabled' : ''}>下一页</button>`
    : '';
  const prev = $('#prevPage'), next = $('#nextPage');
  if (prev) prev.onclick = () => { state.page--; renderCards(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  if (next) next.onclick = () => { state.page++; renderCards(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
}
function pageItemByIdx(idx) {
  const items = currentItems();
  return items[idx] || null;
}
/* 卡片右上角菜单 */
function openCardMenu(btn, idx) {
  const menu = $('#cardMenu');
  const it = pageItemByIdx(Number(idx));
  if (!it) return;
  const pwd = (it.password || '').trim();
  menu.innerHTML = `
    <button data-act="open">打开链接</button>
    <button data-act="copy-link">复制链接</button>
    ${pwd ? `<button data-act="copy-pwd">复制提取码</button>` : ''}`;
  menu.hidden = false;
  const r = btn.getBoundingClientRect();
  menu.style.top = Math.min(window.innerHeight - 140, r.bottom + 6) + 'px';
  menu.style.left = Math.max(8, r.right - 160) + 'px';
  menu.onclick = async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    closeCardMenu();
    if (act === 'open') window.open(it.url, '_blank', 'noopener');
    else if (act === 'copy-link') copyText(it.url, '链接');
    else if (act === 'copy-pwd') copyText(pwd, '提取码');
  };
}
function closeCardMenu() { $('#cardMenu').hidden = true; }

/* ---------- 历史页 ---------- */
function showHistory() {
  $('#view-home').hidden = true;
  $('#view-results').hidden = true;
  $('#view-history').hidden = false;
  setNav('history');
  renderHistory();
}
function renderHistory() {
  const h = getHist();
  const box = $('#histList');
  if (!h.length) {
    box.innerHTML = '<div class="empty-tip">还没有搜索历史，去首页搜点什么吧</div>';
    return;
  }
  box.innerHTML = h.map((x) => `
    <div class="hist-row">
      <svg viewBox="0 0 24 24" fill="none" stroke="#9aa6b8" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>
      <button class="hist-kw" data-kw="${esc(x.kw)}" style="text-align:left">
        <b>${esc(x.kw)}</b>
        <span>${timeAgo(x.ts)} · 共搜索 ${x.n || 1} 次</span>
      </button>
      <span class="chev">›</span>
      <button class="hist-del" data-del="${esc(x.kw)}" title="删除">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg>
      </button>
    </div>`).join('');
}

/* ---------- 复制 ---------- */
let toastTimer = null;
function toast(msg) {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.style.cssText = 'position:fixed;left:50%;bottom:36px;transform:translateX(-50%);background:rgba(21,34,56,.92);color:#fff;font-size:14px;padding:10px 22px;border-radius:999px;z-index:300;opacity:0;transition:opacity .2s;pointer-events:none';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 1600);
}
async function copyText(t, label) {
  try { await navigator.clipboard.writeText(t); }
  catch (e) {
    const ta = document.createElement('textarea');
    ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e2) {}
    ta.remove();
  }
  toast((label || '内容') + '已复制');
}

/* ---------- 事件 ---------- */
function bindEvents() {
  const heroGo = () => doSearch($('#heroInput').value);
  $('#heroBtn').addEventListener('click', heroGo);
  $('#heroInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') heroGo(); });

  const barGo = () => doSearch($('#resultInput').value);
  $('#resultBtn').addEventListener('click', barGo);
  $('#resultInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') barGo(); });
  $('#backBtn').addEventListener('click', goHome);

  $('#logoHome').addEventListener('click', goHome);
  $('#featureCard').addEventListener('click', () => { goHome(); setTimeout(() => $('#heroInput').focus(), 60); });
  $('#hotRefresh').addEventListener('click', loadHot);
  $('#clearHist').addEventListener('click', () => { if (getHist().length && confirm('确定清空全部搜索历史吗？')) clearHist(); });
  $('#sortSelect').addEventListener('change', (e) => { state.sort = e.target.value; state.page = 1; renderCards(); });

  $$('.nav-item').forEach((b) => b.addEventListener('click', () => {
    const n = b.dataset.nav;
    if (n === 'home') goHome();
    else if (n === 'history') goHistory();
    else if (n === 'search') {
      if (state.kw) doSearch(state.kw);
      else { showResults(''); }
    }
  }));

  document.addEventListener('click', (e) => {
    const menu = $('#cardMenu');
    if (!menu.hidden && !e.target.closest('#cardMenu') && !e.target.closest('[data-menu]')) closeCardMenu();

    const mb = e.target.closest('[data-menu]');
    if (mb) {
      if (!menu.hidden) closeCardMenu();
      else openCardMenu(mb, mb.getAttribute('data-menu'));
      return;
    }
    const opener = e.target.closest('[data-open]');
    if (opener) { window.open(opener.getAttribute('data-open'), '_blank', 'noopener'); return; }
    const del = e.target.closest('[data-del]');
    if (del) { delHist(del.getAttribute('data-del')); return; }
    const kwEl = e.target.closest('[data-kw]');
    if (kwEl) { doSearch(kwEl.getAttribute('data-kw')); return; }
    const tab = e.target.closest('[data-tab]');
    if (tab) {
      state.tab = tab.getAttribute('data-tab');
      state.page = 1;
      renderTabs(); renderCards();
      return;
    }
  });

  window.addEventListener('hashchange', route);
}

/* ---------- 启动 ---------- */
document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  route();
});
