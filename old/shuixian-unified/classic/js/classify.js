/* ===== Classify Page ===== */
(function(){
  const state = App.state;
  state.themes = state.themes || [];
  state.styles = state.styles || [];
  let rendered = 0;

  function toggle(arr, val){ const i = arr.indexOf(val); if(i >= 0) arr.splice(i, 1); else arr.push(val); }

  function hasFilter(){ return state.themes.length > 0 || state.styles.length > 0 || state.q.trim().length > 0; }

  function renderClassifyChips(){
    const te = document.getElementById('themeChips'); te.innerHTML = "";
    App.THEMES.forEach(t => {
      const b = document.createElement('button');
      b.className = 'filter-chip' + (state.themes.includes(t) ? ' active' : '');
      b.textContent = t;
      b.onclick = () => { toggle(state.themes, t); renderClassifyChips(); resetAndRenderClassify(); };
      te.appendChild(b);
    });
    const se = document.getElementById('styleChips'); se.innerHTML = "";
    App.STYLES.forEach(s => {
      const b = document.createElement('button');
      b.className = 'filter-chip' + (state.styles.includes(s) ? ' active' : '');
      b.textContent = s;
      b.onclick = () => { toggle(state.styles, s); renderClassifyChips(); resetAndRenderClassify(); };
      se.appendChild(b);
    });
  }

  // 渐进式搜索：标题即时匹配；完整数据未就绪时不查正文，到达后补全
  function matchQ(d, q){
    const t = (d.title||"").toLowerCase();
    if(t.includes(q)) return true;
    if(App.isFullLoaded()){
      const f = App.fullOf(d);
      return (f.prompt||"").toLowerCase().includes(q);
    }
    return false;
  }

  function getClassifyList(){
    const q = state.q.trim().toLowerCase();
    let list = App.ALL;
    if(q) list = list.filter(d => matchQ(d, q));
    if(state.themes.length) list = list.filter(d => state.themes.some(t => App.getTags(d).themes.includes(t)));
    if(state.styles.length) list = list.filter(d => state.styles.some(s => App.getTags(d).styles.includes(s)));
    return list.slice().sort((a,b) => ((b.likes||0) - (a.likes||0)));
  }

  function renderClassify(){
    const list = getClassifyList();
    const parts = [];
    if(state.themes.length) parts.push(state.themes.join(' + '));
    if(state.styles.length) parts.push(state.styles.join(' + '));
    if(state.q.trim()) parts.push('搜索：' + state.q.trim());
    document.getElementById('classifyResultTitle').innerHTML = '符合 <span style="color:var(--blue)">「' + (parts.length ? parts.join(' × ') : '全部') + '」</span> 的提示词 <span>' + list.length.toLocaleString() + '</span>';

    const cg = document.getElementById('classifyGrid'); cg.innerHTML = "";
    const empty = document.getElementById('classifyEmpty');
    const showMore = document.getElementById('classifyShowMore');

    if(!hasFilter()){
      empty.textContent = '请选择上方「主题」或「风格」标签开始筛选。';
      empty.style.display = 'block';
      showMore.style.display = 'none';
      return;
    }

    if(list.length === 0){
      empty.textContent = '没有匹配的提示词，换个组合试试。';
      empty.style.display = 'block';
      showMore.style.display = 'none';
      return;
    }

    empty.style.display = 'none';
    const n = App.getBatch();
    list.slice(0, n).forEach(d => {
      const tags = App.getTags(d);
      const matched = [...state.themes.filter(t => tags.themes.includes(t)), ...state.styles.filter(s => tags.styles.includes(s))];
      cg.appendChild(App.makeCard(d, matched.length ? matched : tags.themes.concat(tags.styles).slice(0,3)));
    });
    rendered = list.slice(0, n).length;
    showMore.style.display = (rendered < list.length) ? 'inline-flex' : 'none';
  }

  function resetAndRenderClassify(){
    rendered = 0;
    renderClassify();
  }

  document.getElementById('classifyShowMore').onclick = () => {
    const list = getClassifyList();
    const cg = document.getElementById('classifyGrid');
    const n = App.getBatch();
    list.slice(rendered, rendered + n).forEach(d => {
      const tags = App.getTags(d);
      const matched = [...state.themes.filter(t => tags.themes.includes(t)), ...state.styles.filter(s => tags.styles.includes(s))];
      cg.appendChild(App.makeCard(d, matched.length ? matched : tags.themes.concat(tags.styles).slice(0,3)));
    });
    rendered += Math.min(n, list.length - rendered);
    document.getElementById('classifyShowMore').style.display = (rendered < list.length) ? 'inline-flex' : 'none';
  };

  // 完整数据到达后补全搜索
  window.__onFullLoaded = () => {
    if(state.q.trim()){
      resetAndRenderClassify();
      const tip = document.getElementById('searchTip');
      if(tip) tip.style.display = "none";
    }
  };

  function ensureSearchFull(){
    if(!App.isFullLoaded()){
      const tip = document.getElementById('searchTip');
      if(tip) tip.style.display = "block";
      App.ensureFull();
    }
  }

  App.init({
    page: 'classify',
    onSearch: () => { resetAndRenderClassify(); ensureSearchFull(); },
    onReady: () => {
      document.getElementById('loading').style.display = "none";
      renderClassifyChips();
      if(state.q.trim()){ resetAndRenderClassify(); ensureSearchFull(); }
      else renderClassify();
    }
  });
})();
