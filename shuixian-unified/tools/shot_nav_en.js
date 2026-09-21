/* 手机端英文模式下导航与菜单校验 */
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..');
const URL = process.env.SX_URL || 'http://127.0.0.1:8140/';
const OUT = path.join(ROOT, '.workbuddy-tmp');
fs.mkdirSync(OUT, { recursive: true });
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 800, isMobile: true, deviceScaleFactor: 2, hasTouch: true });

  // 预置英文偏好后再加载（key = sx-lang，值走 JSON 编码）
  await page.goto(URL + 'index.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(() => { try { localStorage.setItem('sx-lang', JSON.stringify('en')); } catch (e) { } });
  await page.goto(URL + 'index.html', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1000));

  const info = await page.evaluate(() => {
    const vis = el => { if (!el) return false; const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return cs.display !== 'none' && r.height > 0; };
    const top = [...document.querySelectorAll('.nav-actions > *')].filter(vis).map(a => (a.textContent || a.id || '').trim().slice(0, 14));
    document.querySelector('#navToggle').click();
    const items = [...document.querySelectorAll('#navLinks > *')].filter(vis).map(a => (a.textContent || '').trim().slice(0, 22));
    return { lang: document.documentElement.lang, top, items };
  });

  console.log('lang =', info.lang);
  console.log('顶栏按钮:', info.top.join(' | '));
  console.log('菜单项:', info.items.join(' | '));
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(OUT, 'menu-phone-390-en.png'), clip: { x: 0, y: 0, width: 390, height: 620 } });
  await browser.close();
})().catch(e => { console.error('ERROR', e.message); process.exit(1); });
