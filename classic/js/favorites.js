/* ===== Favorites Page ===== */
(function(){
  const state = App.state;
  state.board = state.board || "全部";

  function renderBoardTabs(){
    const el = document.getElementById('boardTabs'); el.innerHTML = "";
    const allBtn = document.createElement('button');
    allBtn.className = 'board-tab' + (state.board === '全部' ? ' active' : '');
    allBtn.textContent = '全部';
    allBtn.onclick = () => { state.board = '全部'; renderBoardTabs(); renderFavGrid(); };
    el.appendChild(allBtn);
    App.favData.boards.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'board-tab' + (state.board === b.id ? ' active' : '');
      btn.textContent = b.name;
      btn.onclick = () => { state.board = b.id; renderBoardTabs(); renderFavGrid(); };
      el.appendChild(btn);
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

  function renderFavGrid(){
    let list = App.getFavItems(state.board);
    const q = state.q.trim().toLowerCase();
    if(q) list = list.filter(d => matchQ(d, q));
    const fg = document.getElementById('favGrid'); fg.innerHTML = "";
    list.forEach(d => fg.appendChild(App.makeCard(d)));
    document.getElementById('favEmpty').style.display = list.length ? 'none' : 'block';
  }

  function renderFav(){ renderBoardTabs(); renderFavGrid(); }

  // 当其他页面收藏/取消时通知本页刷新
  window.__favChanged = () => { if(state.board === '全部' || App.favData.items) renderFavGrid(); };

  function bindFavEvents(){
    document.getElementById('newBoardBtn').onclick = () => {
      document.getElementById('boardName').value = '';
      const m = document.getElementById('boardMask'); m.classList.add('show'); m.style.display = 'flex';
      setTimeout(() => document.getElementById('boardName').focus(), 50);
    };

    function closeBoardModal(){ const m = document.getElementById('boardMask'); m.classList.remove('show'); m.style.display = 'none'; }
    document.getElementById('boardClose').onclick = closeBoardModal;
    document.getElementById('boardCancel').onclick = closeBoardModal;
    document.getElementById('boardSave').onclick = () => {
      const name = document.getElementById('boardName').value.trim();
      if(!name){ App.showToast('请输入画板名称'); return; }
      const id = 'b_' + Date.now();
      App.favData.boards.push({ id, name });
      App.saveFav();
      state.board = id;
      renderFav();
      closeBoardModal();
    };

    document.getElementById('exportMdBtn').onclick = async () => {
      await App.ensureFull();
      const list = App.getFavItems(state.board);
      const boardName = App.getBoardName(state.board);
      let md = '# ' + boardName + '\n\n';
      list.forEach((d, i) => {
        md += '## ' + (i + 1) + '. ' + (d.title || '(未命名)') + '\n\n';
        md += '- 分类：' + (d.category || '其他综合') + '\n';
        md += '- 热度：' + (d.likes || 0) + '\n';
        if(d.images && d.images.length) md += '图片：' + d.images.join('\n  - ') + '\n';
        else if(d.image) md += '图片：' + d.image + '\n';
        md += '\n```\n' + (App.fullOf(d).prompt || '') + '\n```\n\n';
      });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
      a.download = '水仙收藏_' + boardName + '.md';
      a.click();
      URL.revokeObjectURL(a.href);
    };
  }

  // 完整数据到达后补全搜索
  window.__onFullLoaded = () => {
    if(state.q.trim()){
      renderFavGrid();
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
    page: 'favorites',
    onSearch: () => { renderFavGrid(); ensureSearchFull(); },
    onReady: () => {
      document.getElementById('loading').style.display = "none";
      bindFavEvents();
      renderFav();
      if(state.q.trim()) ensureSearchFull();
    }
  });
})();
