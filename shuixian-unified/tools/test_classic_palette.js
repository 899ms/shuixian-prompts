/* =========================================================
   tools/test_classic_palette.js
   经典版命令面板回归测试（真浏览器）
   守护两个已修复的 bug：
     1) classic/js/base.js 未把 App 挂到 window → features-classic.js 永不 boot
        （表现为命令面板按钮/骰子/快捷键全都没有）
     2) Esc 被 wireKeys 里的 typing 提前 return 吞掉 → 面板关不掉
   另含性能基线：单键输入不得回到 20ms+ 的卡顿水平。
   运行： node tools/test_classic_palette.js
   ========================================================= */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = process.env.SX_URL || 'http://127.0.0.1:8140/classic/index.html';

let pass = 0, fail = 0;
const ok = (n, c, extra) => { if (c) { pass++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n + (extra ? '  → ' + extra : '')); } };

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2500));

  console.log('== 1. 启动：App 挂载 & 面板按钮注入 ==');
  const boot = await page.evaluate(() => ({
    hasApp: !!window.App,
    all: (window.App && window.App.ALL && window.App.ALL.length) || 0,
    btn: !!document.getElementById('cmdkBtn'),
  }));
  ok('window.App 已挂载（const 不会自动成为 window 属性）', boot.hasApp,
    'classic/js/base.js 需显式 window.App = App');
  ok('App.ALL 已载入 (>0)', boot.all > 0, 'ALL=' + boot.all);
  ok('导航里注入了命令面板按钮 #cmdkBtn', boot.btn);

  console.log('== 2. 打开面板 & 渲染 ==');
  const open = await page.evaluate(async () => {
    const vis = () => { const e = document.getElementById('fxcPalette'); return !!e && e.classList.contains('show'); };
    const btn = document.getElementById('cmdkBtn');
    if (!btn) return { err: '按钮不存在' };
    const a = performance.now();
    btn.click();
    const ms = performance.now() - a;
    await new Promise(r => setTimeout(r, 300));
    return { visible: vis(), openMs: ms, rows: document.querySelectorAll('.cmdk-row').length, hasInput: !!document.getElementById('palIn') };
  });
  ok('面板可打开', open.visible);
  ok('含搜索输入框 #palIn', open.hasInput);
  ok('空查询列出命令项', open.rows >= 5, 'rows=' + open.rows);
  ok('打开即时（<50ms）', open.openMs < 50, open.openMs.toFixed(1) + 'ms');

  console.log('== 3. 搜索可用（索引缓存未破坏语义） ==');
  const s1 = await page.evaluate(async () => {
    const inp = document.getElementById('palIn');
    inp.value = 'sbpk'; inp.dispatchEvent(new Event('input'));
    await new Promise(r => setTimeout(r, 250));
    return [...document.querySelectorAll('.cmdk-row .t1')].slice(0, 3).map(e => e.textContent);
  });
  ok('拼音缩写 sbpk 能召回', s1.some(t => /赛博朋克/.test(t)), JSON.stringify(s1));

  const s2 = await page.evaluate(async () => {
    const inp = document.getElementById('palIn');
    inp.value = '海报'; inp.dispatchEvent(new Event('input'));
    await new Promise(r => setTimeout(r, 250));
    return document.querySelectorAll('.cmdk-row').length;
  });
  ok('中文「海报」有命中', s2 > 0, 'rows=' + s2);

  const s3 = await page.evaluate(async () => {
    const inp = document.getElementById('palIn');
    inp.value = 'zzzzqqqq'; inp.dispatchEvent(new Event('input'));
    await new Promise(r => setTimeout(r, 250));
    return document.querySelectorAll('.cmdk-row').length;
  });
  ok('无意义查询不报错（返回 0 行）', s3 === 0, 'rows=' + s3);

  console.log('== 4. 输入性能基线（防抖 + 索引缓存） ==');
  const perf = await page.evaluate(async () => {
    const inp = document.getElementById('palIn');
    const out = [];
    for (const q of ['s', 'x', '海']) {
      const a = performance.now();
      inp.value = q; inp.dispatchEvent(new Event('input'));
      out.push([q, performance.now() - a]);
      await new Promise(r => setTimeout(r, 140));
    }
    return out;
  });
  perf.forEach(([q, v]) => ok('输入 "' + q + '" 立即返回 (<12ms)', v < 12, v.toFixed(1) + 'ms'));
  const worst = Math.max(...perf.map(p => p[1]));
  ok('最差单键耗时不回退到 20ms+', worst < 20, worst.toFixed(1) + 'ms');

  console.log('== 5. 交互：Esc / Enter / 点击 ==');
  const esc = await page.evaluate(async () => {
    const vis = () => { const e = document.getElementById('fxcPalette'); return !!e && e.classList.contains('show'); };
    document.getElementById('cmdkBtn').click();
    await new Promise(r => setTimeout(r, 250));
    const opened = vis();
    const inp = document.getElementById('palIn'); inp.focus();
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await new Promise(r => setTimeout(r, 250));
    return { opened, closed: !vis() };
  });
  ok('Esc 可关闭面板（焦点在输入框内）', esc.opened && esc.closed,
    'wireKeys 的 typing return 不能挡在 Esc 之前');

  const enter = await page.evaluate(async () => {
    const vis = () => { const e = document.getElementById('fxcPalette'); return !!e && e.classList.contains('show'); };
    document.getElementById('cmdkBtn').click();
    await new Promise(r => setTimeout(r, 250));
    const inp = document.getElementById('palIn');
    inp.value = '赛博'; inp.dispatchEvent(new Event('input'));
    await new Promise(r => setTimeout(r, 220));
    const rows = document.querySelectorAll('.cmdk-row').length;
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await new Promise(r => setTimeout(r, 350));
    return { rows, closed: !vis() };
  });
  ok('打字后 Enter 选中并收起面板', enter.rows > 0 && enter.closed, 'rows=' + enter.rows);

  const click = await page.evaluate(async () => {
    const vis = () => { const e = document.getElementById('fxcPalette'); return !!e && e.classList.contains('show'); };
    document.getElementById('cmdkBtn').click();
    await new Promise(r => setTimeout(r, 250));
    const rows = [...document.querySelectorAll('.cmdk-row')];
    rows[0].click();
    await new Promise(r => setTimeout(r, 300));
    return { n: rows.length, closed: !vis() };
  });
  ok('点击命令项后面板收起', click.n > 0 && click.closed);

  console.log('== 6. 无 JS 报错 ==');
  ok('页面无未捕获异常', errs.length === 0, errs.join(' | ').slice(0, 200));

  await browser.close();
  console.log(`\n通过 ${pass} / 失败 ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERROR', e.message); process.exit(1); });
