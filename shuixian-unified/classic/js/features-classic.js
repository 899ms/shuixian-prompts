/* =========================================================
   水仙 · 经典版 — features-classic.js
   给经典版补上与新版一致的能力（自包含，不依赖现代版 features.js）：
     · 命令面板 Ctrl/⌘+K —— 搜提示词 / 分类 / 功能命令
     · 智能搜索：模糊匹配 + 拼音首字母（sbpk → 赛博朋克）+ 关键词高亮
     · 变量填空 → 复制成品
     · 灯箱增强：备注、使用次数、填变量复制、下载图片
     · 随机漫游（R / 浮球）、键盘快捷键帮助（?）、图片 LQIP 渐显
   依赖：window.App（classic/js/base.js 暴露）
   ========================================================= */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const LS = { notes: 'sx-notes-v1', uses: 'sx-uses-v1' };

  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
  };

  function toast(m) { try { App.showToast(m); } catch (e) { console.log(m); } }
  function copy(t) { try { App.copyText(t); } catch (e) { } }

  /* ---------- 备注 / 使用次数（与新版共用同一份本地存储） ---------- */
  function notes() { return store.get(LS.notes, {}); }
  function noteFor(id) { const n = notes()[id]; return n && n.text ? n.text : ''; }
  function setNote(id, text) {
    const n = notes();
    if (text && text.trim()) n[id] = { text: text.trim(), ts: Date.now() }; else delete n[id];
    store.set(LS.notes, n);
  }
  function useCount(id) { return store.get(LS.uses, {})[id] || 0; }
  function bumpUse(id) { const u = store.get(LS.uses, {}); u[id] = (u[id] || 0) + 1; store.set(LS.uses, u); }

  /* ---------- 拼音 ---------- */
  let PINYIN = null, pyPromise = null;
  function loadPinyin() {
    if (PINYIN) return Promise.resolve(PINYIN);
    if (pyPromise) return pyPromise;
    pyPromise = fetch('/data/pinyin.json').then(r => r.json())
      .then(j => { PINYIN = (j && j.chars) || {}; return PINYIN; })
      .catch(() => { PINYIN = {}; return PINYIN; });
    return pyPromise;
  }
  function initials(str) {
    if (!PINYIN) return '';
    let out = '';
    for (const ch of String(str)) {
      if (PINYIN[ch]) out += PINYIN[ch];
      else if (/[a-z0-9]/i.test(ch)) out += ch.toLowerCase();
    }
    return out;
  }

  /* ---------- 智能搜索 ---------- */
  function subseq(q, text) {
    if (!q || !text) return 0;
    let i = 0, gaps = 0, last = -1;
    for (let j = 0; j < text.length && i < q.length; j++) {
      if (text[j] === q[i]) { if (last >= 0) gaps += (j - last - 1); last = j; i++; }
    }
    if (i < q.length) return 0;
    const span = last + 1;
    return Math.max(0.15, Math.min(1, 1 - gaps / (span + 1)));
  }
  /* 索引缓存：title/category 的小写形式 + 首字母 + tags 串只算一次。
     原来每次按键都对 5430 条重算 toLowerCase/initials/getTags，单词耗时 25~60ms
     （每次输入都卡一下）。这些字段与查询无关，缓存后每键降到个位数毫秒。 */
  let IDX = new WeakMap();
  function idxOf(d) {
    let v = IDX.get(d);
    if (v) return v;
    const title = (d.title || '').toLowerCase();
    const cat = (d.category || '').toLowerCase();
    let tg = '';
    try {
      const t = App.getTags(d);
      tg = ((t.themes || []).concat(t.styles || [])).join(' ').toLowerCase();
    } catch (e) { }
    v = {
      title: title,
      cat: cat,
      prompt: (d.prompt || '').toLowerCase(),
      iniTitle: initials(title),
      iniCat: initials(cat),
      tags: tg,
    };
    IDX.set(d, v);
    return v;
  }
  // 数据整体替换（切换数据源）后索引失效
  window.__fxClearIdx = () => { IDX = new WeakMap(); };

  function score(d, q) {
    if (!q) return 1;
    const n = q.toLowerCase().trim();
    const ix = idxOf(d);
    let s = 0;
    if (ix.title.includes(n)) s += 120 - Math.min(ix.title.indexOf(n), 80);
    if (ix.cat.includes(n)) s += 70;
    if (ix.prompt.includes(n)) s += 26;
    if (!s) {
      const fz = subseq(n, ix.title); if (fz > 0.42) s += 58 * fz;
      const ini = ix.iniTitle;
      const pz = PINYIN ? subseq(n, ini) : 0;
      if (pz > 0.55) s += 62 * pz + (ini.startsWith(n) ? 30 : 0);
      if (PINYIN && ix.iniCat.includes(n)) s += 34;
      // 命中已有的主题 / 风格标签
      if (ix.tags.includes(n)) s += 30;
    }
    return s;
  }
  function search(list, q) {
    if (!q) return list.slice();
    const out = [];
    for (const d of list) { const s = score(d, q); if (s > 0) out.push([s, d]); }
    out.sort((a, b) => b[0] - a[0]);
    return out.map(x => x[1]);
  }
  function highlight(text, q) {
    const safe = esc(text);
    if (!q) return safe;
    const toks = String(q).trim().split(/\s+/).filter(Boolean).map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!toks.length) return safe;
    try { return safe.replace(new RegExp('(' + toks.join('|') + ')', 'gi'), '<mark class="fxc-hl">$1</mark>'); }
    catch (e) { return safe; }
  }

  /* ---------- 变量 ---------- */
  const VAR_RE = /\{argument\s+name="([^"]+)"(?:\s+default="([^"]*)")?\s*\}/g;
  const VAR_MUST = /\{\{\s*([A-Za-z0-9_\u4e00-\u9fff\- ]{1,40})\s*\}\}/g;
  const VAR_BRACK = /\[([A-Z][A-Z0-9_ ]{1,32})\]/g;
  function parseVars(text) {
    const out = new Map(); let m;
    VAR_RE.lastIndex = 0; while ((m = VAR_RE.exec(text || ''))) if (!out.has(m[1])) out.set(m[1], m[2] || '');
    VAR_MUST.lastIndex = 0; while ((m = VAR_MUST.exec(text || ''))) { const k = m[1].trim(); if (!out.has(k)) out.set(k, ''); }
    VAR_BRACK.lastIndex = 0; while ((m = VAR_BRACK.exec(text || ''))) { const k = m[1].trim(); if (!out.has(k)) out.set(k, ''); }
    return [...out.entries()].map(([name, def]) => ({ name, def }));
  }
  function resolve(text, vals) {
    let o = text || '';
    o = o.replace(VAR_RE, (all, n, d) => (vals[n] != null && vals[n] !== '') ? vals[n] : (d != null ? d : all));
    o = o.replace(VAR_MUST, (all, n) => (vals[n.trim()] != null && vals[n.trim()] !== '') ? vals[n.trim()] : all);
    o = o.replace(VAR_BRACK, (all, n) => (vals[n.trim()] != null && vals[n.trim()] !== '') ? vals[n.trim()] : all);
    return o;
  }
  function previewHTML(text, vals) {
    let h = esc(text || '');
    h = h.replace(/\{argument\s+name=&quot;([^&]+)&quot;(?:\s+default=&quot;([^&]*)&quot;)?\s*\}/g, (all, n, d) => {
      const v = vals && vals[n];
      if (v) return '<span class="fill">' + esc(v) + '</span>';
      if (d) return '<span class="fill">' + esc(d) + '</span>';
      return '<span class="empty">' + n + '</span>';
    });
    h = h.replace(/\{\{\s*([A-Za-z0-9_\u4e00-\u9fff\- ]{1,40})\s*\}\}/g, (all, n) => {
      const v = vals && vals[n.trim()];
      return v ? '<span class="fill">' + esc(v) + '</span>' : '<span class="empty">' + n.trim() + '</span>';
    });
    h = h.replace(/\[([A-Z][A-Z0-9_ ]{1,32})\]/g, (all, n) => {
      const v = vals && vals[n.trim()];
      return v ? '<span class="fill">' + esc(v) + '</span>' : '<span class="empty">' + n.trim() + '</span>';
    });
    return h;
  }
  function promptOf(d) { try { return (App.fullOf(d) || d).prompt || ''; } catch (e) { return d.prompt || ''; } }

  /* ---------- 遮罩 ---------- */
  function mask(id, cls, inner) {
    let el = document.getElementById(id);
    if (!el) { el = document.createElement('div'); el.id = id; document.body.appendChild(el); }
    el.className = 'fxc-mask ' + (cls || '');
    el.innerHTML = inner;
    el.addEventListener('click', e => { if (e.target === el) close(id); });
    return el;
  }
  function open(id) { const el = document.getElementById(id); if (el) { el.classList.add('show'); document.body.style.overflow = 'hidden'; } }
  function close(id) {
    const el = document.getElementById(id); if (el) el.classList.remove('show');
    if (!$('.fxc-mask.show')) document.body.style.overflow = '';
  }

  /* ---------- 变量填空弹窗 ---------- */
  function openVarFill(d) {
    const p = promptOf(d);
    const vars = parseVars(p);
    if (!vars.length) { copy(p); bumpUse(d.id); toast('这条没有可替换变量，已直接复制'); return; }
    const html = `<div class="fxc-panel">
      <div class="fxc-head">
        <div><h3>填好变量，一次复制成品</h3><div class="sub">${esc(d.title || '')}</div></div>
        <button class="x" data-x>✕</button>
      </div>
      <div class="fxc-body">
        <div id="vfcFields">${vars.map(v => `<div class="vfc-field">
          <label><span class="key">${esc(v.name)}</span>${v.def ? '<span style="color:var(--gray);font-weight:600">默认：' + esc(v.def) + '</span>' : ''}</label>
          <input type="text" data-k="${esc(v.name)}" placeholder="${esc(v.def || '填写…')}"></div>`).join('')}</div>
        <div class="vfc-preview"><div class="lbl">预览</div><pre id="vfcPrev"></pre></div>
      </div>
      <div class="fxc-foot">
        <button class="fxc-btn pri" id="vfcOk">复制成品</button>
        <button class="fxc-btn" id="vfcTpl">复制模板</button>
        <span class="spacer"></span>
        <button class="fxc-btn" id="vfcReset">恢复默认</button>
      </div></div>`;
    const el = mask('fxcVarFill', '', html);
    el.querySelector('[data-x]').addEventListener('click', () => close('fxcVarFill'));
    const collect = () => { const o = {}; $$('input[data-k]', el).forEach(i => o[i.dataset.k] = i.value.trim()); return o; };
    const prev = () => { const t = $('#vfcPrev', el); if (t) t.innerHTML = previewHTML(p, collect()); };
    $$('input[data-k]', el).forEach(i => i.addEventListener('input', prev));
    $('#vfcOk', el).addEventListener('click', () => { copy(resolve(p, collect())); bumpUse(d.id); close('fxcVarFill'); });
    $('#vfcTpl', el).addEventListener('click', () => copy(p));
    $('#vfcReset', el).addEventListener('click', () => { $$('input[data-k]', el).forEach(i => i.value = ''); prev(); });
    prev(); open('fxcVarFill');
    const f = $('input[data-k]', el); if (f) setTimeout(() => f.focus(), 50);
  }

  /* ---------- 命令面板 ---------- */
  const COMMANDS = [
    { ico: '🎲', label: '随机漫游一条提示词', run: () => randomPrompt() },
    { ico: '🖼️', label: '去画廊', run: () => location.href = 'gallery.html' },
    { ico: '🗂️', label: '去分类浏览', run: () => location.href = 'classify.html' },
    { ico: '❤️', label: '去我的收藏', run: () => location.href = 'favorites.html' },
    { ico: '🏠', label: '回首页', run: () => location.href = 'index.html' },
    { ico: '🔀', label: '切换到现代版', run: () => { const b = document.getElementById('skinSwitch'); if (b) b.click(); } },
    { ico: '⌨️', label: '键盘快捷键', run: () => openHelp() },
  ];
  let palRows = [], palIdx = 0;
  function categoriesOf() {
    const seen = new Set();
    (App.ALL || []).forEach(d => { if (d.category) seen.add(d.category); });
    return [...seen];
  }
  function openPalette() {
    const html = `<div class="fxc-panel">
      <div class="cmdk-in">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#6B6B6B" stroke-width="2"/><path d="M16 16L21 21" stroke="#6B6B6B" stroke-width="2" stroke-linecap="round"/></svg>
        <input id="palIn" type="text" placeholder="搜索提示词、分类，或输入命令…（支持拼音缩写 sbpk）" autocomplete="off">
        <span class="esc">Esc</span>
      </div>
      <div class="cmdk-list" id="palList"></div>
      <div class="cmdk-foot"><span><kbd>↑</kbd><kbd>↓</kbd> 移动</span><span><kbd>Enter</kbd> 打开</span><span><kbd>Esc</kbd> 关闭</span></div>
    </div>`;
    const el = mask('fxcPalette', 'cmdk', html);
    const input = $('#palIn', el);
    input.value = '';

    function render() {
      const q = input.value.trim();
      let items = [];
      if (!q) {
        items = COMMANDS.map(c => ({ ico: c.ico, t1: c.label, t2: '', run: c.run, sec: '功能' }));
      } else {
        COMMANDS.forEach(c => { if (score({ title: c.label }, q) > 0) items.push({ ico: c.ico, t1: c.label, t2: '', run: c.run, sec: '功能' }); });
        categoriesOf().slice(0, 60).forEach(n => {
          if (score({ title: n }, q) > 0) items.push({ ico: '🗂️', t1: n, t2: '分类', run: () => location.href = 'gallery.html?cat=' + encodeURIComponent(n), sec: '分类' });
        });
        search(App.ALL, q).slice(0, 14).forEach(d => {
          items.push({
            ico: '💡', t1: d.title || ('#' + d.id), t2: (d.category || '') + (noteFor(d.id) ? ' · 📝有备注' : ''),
            thumb: thumbOf(d), hl: q, sec: '提示词',
            run: () => { close('fxcPalette'); App.openLightbox(d); }
          });
        });
      }
      palRows = items; palIdx = 0;
      const list = $('#palList', el);
      if (!items.length) { list.innerHTML = '<div style="padding:26px;text-align:center;color:var(--gray);font-size:13px">没有结果</div>'; return; }
      let h = '', last = '';
      items.forEach((it, i) => {
        if (it.sec !== last) { h += '<div class="cmdk-sec">' + esc(it.sec) + '</div>'; last = it.sec; }
        const thumb = it.thumb ? `<img class="thumb" src="${esc(it.thumb)}" alt="" loading="lazy">` : `<span class="ico">${it.ico}</span>`;
        h += `<button class="cmdk-row ${i === palIdx ? 'on' : ''}" data-i="${i}">${thumb}
          <span class="tx"><span class="t1">${it.hl ? highlight(it.t1, it.hl) : esc(it.t1)}</span>
          ${it.t2 ? '<span class="t2">' + esc(it.t2) + '</span>' : ''}</span></button>`;
      });
      list.innerHTML = h;
      $$('.cmdk-row', list).forEach(b => {
        b.addEventListener('click', () => { const it = palRows[+b.dataset.i]; if (it) { close('fxcPalette'); it.run(); } });
        b.addEventListener('mousemove', () => { palIdx = +b.dataset.i; paint(); });
      });
      list.scrollTop = 0;
    }
    function paint() {
      const list = $('#palList', el); if (!list) return;
      $$('.cmdk-row', list).forEach(b => b.classList.toggle('on', +b.dataset.i === palIdx));
      const cur = $('.cmdk-row.on', list); if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
    }
    // 输入防抖：全量扫描 5430 条即使有索引缓存也要几毫秒，
    // 连打时逐键渲染会堆积。合并到 90ms 空档再渲染，输入手感更顺。
    let palTimer = null;
    function renderSoon() {
      if (palTimer) clearTimeout(palTimer);
      palTimer = setTimeout(render, 90);
    }
    input.addEventListener('input', renderSoon);
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); palIdx = Math.min(palIdx + 1, palRows.length - 1); paint(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); palIdx = Math.max(palIdx - 1, 0); paint(); }
      else if (e.key === 'Enter') { const it = palRows[palIdx]; if (it) { close('fxcPalette'); it.run(); } }
    });
    render(); open('fxcPalette');
    setTimeout(() => input.focus(), 50);
  }
  function thumbOf(d) {
    const p = (d.image && d.image.trim()) || (d.images && d.images[0] && d.images[0].trim()) || (d.thumb && d.thumb.trim());
    if (!p) return '';
    try { return App.imgUrl(p); } catch (e) { return App.IMG_BASE + '/' + p; }
  }

  /* ---------- 快捷键帮助 ---------- */
  function openHelp() {
    const rows = [
      ['Ctrl / ⌘ + K', '命令面板'], ['/', '聚焦搜索框'], ['R', '随机漫游'],
      ['← / →', '灯箱上一张 / 下一张'], ['Esc', '关闭弹层'], ['?', '本帮助'],
    ];
    const html = `<div class="fxc-panel" style="width:min(540px,100%)">
      <div class="fxc-head"><div><h3>键盘快捷键</h3></div><button class="x" data-x>✕</button></div>
      <div class="fxc-body"><div class="fxc-kbd">
        ${rows.map(r => `<div class="r"><span>${esc(r[1])}</span><kbd>${esc(r[0])}</kbd></div>`).join('')}
      </div></div></div>`;
    const el = mask('fxcHelp', '', html);
    el.querySelector('[data-x]').addEventListener('click', () => close('fxcHelp'));
    open('fxcHelp');
  }

  /* ---------- 随机漫游 ---------- */
  function randomPrompt() {
    const all = App.ALL || []; if (!all.length) return;
    App.openLightbox(all[Math.floor(Math.random() * all.length)]);
  }

  /* ---------- 图片下载 ---------- */
  async function downloadImage(d) {
    const p = (d.image && d.image.trim()) || (d.images && d.images[0] && d.images[0].trim()) || (d.thumb && d.thumb.trim());
    if (!p) { toast('这条没有图片'); return; }
    let url; try { url = App.imgUrl(p); } catch (e) { url = App.IMG_BASE + '/' + p; }
    const name = String(d.title || d.id || 'prompt').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 60) + '_' + d.id;
    try {
      const r = await fetch(url, { mode: 'cors' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const b = await r.blob();
      const ext = (b.type && b.type.split('/')[1]) || (p.split('.').pop() || 'jpg');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = name + '.' + ext;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast('图片已开始下载');
    } catch (e) {
      toast('跨域受限，已在新的标签打开图片，可右键另存');
      window.open(url, '_blank', 'noopener');
    }
  }

  /* ---------- 灯箱增强 ---------- */
  let CURRENT = null;
  function decorateLightbox() {
    const body = document.querySelector('#mask .lb-body');
    if (!body || !CURRENT) return;
    if (body.dataset.fxc === String(CURRENT.id)) return;
    body.dataset.fxc = String(CURRENT.id);
    const d = CURRENT;
    const old = body.querySelector('.fxc-lb-wrap'); if (old) old.remove();
    const tg = (() => { try { const t = App.getTags(d); return (t.themes || []).concat(t.styles || []); } catch (e) { return []; } })();

    const wrap = document.createElement('div');
    wrap.className = 'fxc-lb-wrap';
    wrap.innerHTML = `<div class="fxc-acts">
        <button class="fxc-btn pri" id="fxcFill">✍️ 填变量并复制</button>
        <button class="fxc-btn" id="fxcDl">⬇️ 下载图片</button>
        <button class="fxc-btn" id="fxcMd">M↓ 复制 Markdown</button>
        <button class="fxc-btn" id="fxcUse">✅ 标记已用</button>
      </div>
      ${tg.length ? '<div style="font-size:12px;color:var(--gray);margin-bottom:10px">标签：' + tg.map(esc).join(' · ') + '</div>' : ''}
      <div class="fxc-note">
        <div class="nh">📝 我的备注</div>
        <textarea id="fxcNote" placeholder="记下这条提示词的用法、出图参数、改进想法…"></textarea>
        <div class="mt"><span id="fxcNoteInfo"></span><span>使用 <b id="fxcUseN" style="color:var(--blue)">${useCount(d.id)}</b> 次</span></div>
      </div>`;
    body.appendChild(wrap);

    const ta = $('#fxcNote', wrap);
    ta.value = noteFor(d.id);
    ta.addEventListener('input', () => {
      setNote(d.id, ta.value);
      $('#fxcNoteInfo', wrap).textContent = ta.value.trim() ? '备注已保存' : '';
    });
    $('#fxcFill', wrap).addEventListener('click', () => openVarFill(d));
    $('#fxcDl', wrap).addEventListener('click', () => downloadImage(d));
    $('#fxcMd', wrap).addEventListener('click', () => {
      const lines = ['## ' + (d.title || ''), '', '- 分类：' + (d.category || '') + ' · ID #' + d.id,
        '- 图片：' + (thumbOf(d) || '—')];
      const nt = noteFor(d.id); if (nt) lines.push('- 备注：' + nt.replace(/\n/g, ' '));
      if (tg.length) lines.push('- 标签：' + tg.join(' / '));
      lines.push('', '```', promptOf(d), '```', '');
      copy(lines.join('\n'));
    });
    $('#fxcUse', wrap).addEventListener('click', () => {
      bumpUse(d.id);
      $('#fxcUseN', wrap).textContent = useCount(d.id);
      toast('使用 ' + useCount(d.id) + ' 次');
    });
  }
  function watchLightbox() {
    const m = document.getElementById('mask');
    if (!m) return;
    new MutationObserver(() => {
      if (m.classList.contains('show')) setTimeout(decorateLightbox, 30);
    }).observe(m, { attributes: true, attributeFilter: ['class'] });
  }

  /* ---------- LQIP ---------- */
  function watchImages() {
    const mark = img => {
      if (img.dataset.fxLqip) return;
      img.dataset.fxLqip = '1';
      img.classList.add('fxc-lqip');
      const done = () => img.classList.add('on');
      if (img.complete && img.naturalWidth) { done(); return; }
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    };
    const scan = r => $$('.card img, #lbImg', r || document).forEach(mark);
    scan();
    new MutationObserver(muts => {
      muts.forEach(mu => {
        mu.addedNodes && mu.addedNodes.forEach(n => {
          if (n.nodeType !== 1) return;
          if (n.tagName === 'IMG') mark(n); else if (n.querySelectorAll) scan(n);
        });
        if (mu.type === 'attributes' && mu.target.tagName === 'IMG') mark(mu.target);
      });
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
  }

  /* ---------- 顶栏入口 ---------- */
  function injectNavButton() {
    const nav = document.getElementById('mainNav');
    if (!nav || document.getElementById('cmdkBtn')) return;
    const b = document.createElement('button');
    b.className = 'cmdk-btn'; b.id = 'cmdkBtn'; b.type = 'button';
    b.title = '命令面板（Ctrl / ⌘ + K）';
    b.innerHTML = '⌘K<span class="lbl"> 命令面板</span>';
    b.addEventListener('click', openPalette);
    const anchor = document.getElementById('skinSwitch');
    if (anchor) nav.insertBefore(b, anchor); else nav.appendChild(b);
  }

  /* ---------- 键盘 ---------- */
  function wireKeys() {
    document.addEventListener('keydown', e => {
      const tag = (e.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
      // Esc 必须在 typing 判断之前处理：面板里焦点就在 input 上，
      // 原来先 return 会把 Esc 整个吞掉，面板底部的「Esc 关闭」形同虚设。
      if (e.key === 'Escape') {
        const m = document.querySelector('.fxc-mask.show');
        if (m) { close(m.id); e.preventDefault(); return; }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); return; }
      if (typing) return;
      switch (e.key) {
        case '/': { const s = document.getElementById('searchInput'); if (s) { e.preventDefault(); s.focus(); } break; }
        case 'r': case 'R': randomPrompt(); break;
        case '?': openHelp(); break;
      }
    });
  }

  function addDice() {
    if (document.getElementById('fxcDice')) return;
    const b = document.createElement('button');
    b.id = 'fxcDice'; b.className = 'fxc-dice'; b.title = '随机漫游 (R)'; b.textContent = '🎲';
    b.addEventListener('click', randomPrompt);
    document.body.appendChild(b);
  }

  /* ---------- 装配 ---------- */
  function patchApp() {
    if (App.__fxcPatched) return;
    const origLb = App.openLightbox;
    App.openLightbox = function (d) { CURRENT = d; return origLb.apply(this, arguments); };
    const origCard = App.makeCard;
    App.makeCard = function (d, tags) {
      const el = origCard.call(this, d, tags);
      try { el.__fxcData = d; } catch (e) { }
      return el;
    };
    document.addEventListener('click', e => {
      const c = e.target.closest && e.target.closest('.card');
      if (c && c.__fxcData) CURRENT = c.__fxcData;
    }, true);
    App.__fxcPatched = true;
  }

  let booted = false;
  function boot() {
    if (booted) return; booted = true;
    patchApp();
    injectNavButton();
    addDice();
    wireKeys();
    watchImages();
    watchLightbox();
    loadPinyin();
  }

  function waitAndBoot(n) {
    if (window.App && App.ALL && App.ALL.length) { boot(); return; }
    if (n > 200) { boot(); return; }
    setTimeout(() => waitAndBoot(n + 1), 60);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => waitAndBoot(0));
  else waitAndBoot(0);
})();
