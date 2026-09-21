/* 在真机宽度下渲染导航栏并截图，验证手机端只留三个按钮 */
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const URL = process.env.SX_URL || 'http://127.0.0.1:8140/';
const OUT = path.join(ROOT, '.workbuddy-tmp');
fs.mkdirSync(OUT, { recursive: true });

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const VIEWPORTS = [
  { name: 'phone-390', w: 390, h: 780, mobile: true },
  { name: 'phone-360', w: 360, h: 740, mobile: true },
  { name: 'phone-320', w: 320, h: 660, mobile: true },
  { name: 'tablet-820', w: 820, h: 1000, mobile: false },
  { name: 'desktop-1440', w: 1440, h: 900, mobile: false },
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
  });

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.mobile, deviceScaleFactor: 2, hasTouch: vp.mobile });
    await page.goto(URL + 'index.html', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 900));

    const report = await page.evaluate(() => {
      const vis = el => {
        if (!el) return false;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      const nav = document.querySelector('.sx-nav-inner');
      const navRect = nav ? nav.getBoundingClientRect() : null;
      const acts = [...document.querySelectorAll('.nav-actions > *')];
      const inTop = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.top < 100; };
      return {
        innerScrollW: nav ? nav.scrollWidth : 0,
        innerClientW: nav ? nav.clientWidth : 0,
        overflow: nav ? (nav.scrollWidth > nav.clientWidth + 1) : false,
        docOverflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
        visibleTopBar: acts.filter(vis).map(a => ({
          id: a.id || a.className.split(' ')[0],
          width: Math.round(a.getBoundingClientRect().width),
          label: (a.textContent || '').trim().slice(0, 12),
        })),
        langVisible: inTop(document.querySelector('#langBtn')),
        skinVisible: inTop(document.querySelector('#skinSwitch')),
        themeVisible: inTop(document.querySelector('#themeBtn')),
        submitVisibleInTop: inTop(document.querySelector('.nav-actions .btn-amber')),
        favVisibleInTop: inTop(document.querySelector('.nav-actions a.icon-btn:not(.nav-toggle)')),
        menuItems: [...document.querySelectorAll('#navLinks > *')].map(a => ({
          t: (a.textContent || '').trim().slice(0, 16),
          cls: a.className,
          hidden: !vis(a),
        })),
      };
    });

    report.viewport = vp.name;
    console.log('\n===== ' + vp.name + ' (' + vp.w + 'px) =====');
    console.log('  导航溢出:', report.overflow, '| 页面横向溢出:', report.docOverflowX,
      '|', report.innerScrollW + '/' + report.innerClientW);
    console.log('  顶栏可见按钮:', JSON.stringify(report.visibleTopBar));
    console.log('  三键可见 语言/版本/主题:', report.langVisible, report.skinVisible, report.themeVisible);
    console.log('  桌面项已收进菜单 投稿/收藏:', !report.submitVisibleInTop, !report.favVisibleInTop);
    console.log('  菜单项:', report.menuItems.map(m => m.t + (m.hidden ? '(隐)' : '')).join(' | '));

    // 截图：整条导航
    const shot = path.join(OUT, 'nav-' + vp.name + '.png');
    await page.screenshot({ path: shot, clip: { x: 0, y: 0, width: vp.w, height: vp.mobile ? 260 : 120 } });

    // 移动端：展开汉堡菜单再截一张
    if (vp.mobile) {
      await page.evaluate(() => { const t = document.querySelector('#navToggle'); if (t) t.click(); });
      await new Promise(r => setTimeout(r, 500));
      const open = await page.evaluate(() => {
        const nl = document.querySelector('#navLinks');
        const items = [...nl.children].map(a => {
          const cs = getComputedStyle(a), r = a.getBoundingClientRect();
          return { t: (a.textContent || '').trim().slice(0, 16), d: cs.display, w: Math.round(r.width), vis: cs.display !== 'none' && r.height > 0 };
        });
        return { open: nl.classList.contains('open'), items };
      });
      console.log('  展开菜单 open=' + open.open + ':', open.items.filter(i => i.vis).map(i => i.t).join(' | '));
      const shot2 = path.join(OUT, 'menu-' + vp.name + '.png');
      await page.screenshot({ path: shot2, clip: { x: 0, y: 0, width: vp.w, height: Math.min(vp.h, 560) } });
    }
    await page.close();
  }

  await browser.close();
  console.log('\n截图目录: ' + OUT);
})().catch(e => { console.error('ERROR', e.message); process.exit(1); });
