// 回归测试：画廊卡片布局（grid 轨道炸开 + 缩略图比例）
// 根因：① .gallery-layout 的 1fr 轨道默认 min-width:auto 被多列内容撑爆 → 横向溢出；
//       ② .card .thumb .ph 写死 px 高度，列宽一变就成横图。
// 修复：gallery-layout 用 minmax(0,1fr) + section{min-width:0}；ph 改 aspect-ratio:3/4。
// 运行：NODE_PATH=... node verify_masonry.js   （依赖 puppeteer-core + 本地 8140 服务）
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.SX_URL || 'http://127.0.0.1:8140';
const CATS = ['城市海报', '全部', '动漫二次元'];
let fail = 0;

function check(name, cond, extra) { console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (extra ? '  ' + extra : '')); if (!cond) fail++; }

async function probe(browser, url, w) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 1800));
  const out = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.card')];
    const ratios = cards.slice(0, 8).map(c => { const ph = c.querySelector('.thumb .ph'); if (!ph) return null; const r = ph.getBoundingClientRect(); return +(r.width / r.height).toFixed(2); }).filter(Boolean);
    return { n: cards.length, ratios, overflowX: document.documentElement.scrollWidth - window.innerWidth };
  });
  await page.close();
  return out;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  for (const w of [1440, 768, 390]) {
    const o = await probe(browser, BASE + '/gallery.html?cat=' + encodeURIComponent('城市海报'), w);
    check('[' + w + '] 无横向溢出', o.overflowX <= 0, 'overflowX=' + o.overflowX);
    const allPortrait = o.ratios.length && o.ratios.every(r => r > 0.6 && r < 0.95);
    check('[' + w + '] 卡片竖版(0.6~0.95)', allPortrait, JSON.stringify(o.ratios));
  }
  for (const cat of CATS) {
    const o = await probe(browser, BASE + '/gallery.html?cat=' + encodeURIComponent(cat), 1440);
    check('[' + cat + '] 无溢出&卡片数>0', o.overflowX <= 0 && o.n > 0, 'n=' + o.n + ' overflowX=' + o.overflowX);
  }
  await browser.close();
  console.log(fail === 0 ? '\nALL PASS' : '\n' + fail + ' FAILED');
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('ERR', e); process.exit(2); });
