const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.SX_URL || 'http://127.0.0.1:8140';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  let fail = 0;
  const ok = (c, m) => { console.log((c ? '[PASS] ' : '[FAIL] ') + m); if (!c) fail++; };

  // 1) index.html hero stat data-driven count
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => document.querySelector('[data-sx-count="total"]'), { timeout: 15000 }).catch(()=>{});
  const hero = await page.$eval('[data-sx-count="total"]', el => el.textContent.trim()).catch(() => 'NONE');
  ok(hero === '5,430', 'index.html hero count == 5,430 (got "' + hero + '")');

  // 2) footer data-driven count
  const foot = await page.$eval('.sx-footer [data-sx-count="total"]', el => el.textContent.trim()).catch(() => 'NONE');
  ok(foot === '5,430', 'footer count == 5,430 (got "' + foot + '")');

  // 3) about.html count
  await page.goto(BASE + '/about.html', { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => document.querySelector('[data-sx-count="total"]'), { timeout: 15000 }).catch(()=>{});
  const about = await page.$eval('[data-sx-count="total"]', el => el.textContent.trim()).catch(() => 'NONE');
  ok(about === '5,430', 'about.html count == 5,430 (got "' + about + '")');

  // 4) search.html default sort matches dropdown (latest)
  await page.goto(BASE + '/search.html', { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => typeof window.App !== 'undefined' && window.App.D && window.App.D.samples, { timeout: 20000 }).catch(()=>{});
  const sortVal = await page.$eval('#sortSel', el => el.value).catch(() => 'NONE');
  ok(sortVal === 'latest', 'search default sort select == latest (got "' + sortVal + '")');

  // default (no query) list should be sorted by id desc (latest), NOT by likes desc (hot)
  const order = await page.evaluate(() => {
    const ids = Array.from(document.querySelectorAll('#grid .card')).map(c => Number(c.dataset.id));
    return ids;
  }).catch(() => []);
  const byIdDesc = order.length >= 2 && order[0] > order[order.length-1];
  ok(byIdDesc, 'search default list ordered by id desc (latest): ' + JSON.stringify(order.slice(0,5)));

  // 5) classic hardcoded count corrected
  await page.goto(BASE + '/classic/index.html', { waitUntil: 'networkidle2', timeout: 60000 });
  const classicBadge = await page.$eval('.hero-badge', el => el.textContent.replace(/\s+/g,' ').trim()).catch(() => 'NONE');
  ok(/5,430/.test(classicBadge), 'classic hero-badge shows 5,430 (got "' + classicBadge + '")');

  ok(errs.length === 0, 'no page/console errors' + (errs.length ? ' -> ' + errs.join(' | ') : ''));

  await browser.close();
  console.log('\nFIX-VERIFY ' + (fail ? 'FAIL ' + fail : 'ALL PASS'));
  process.exit(fail ? 1 : 0);
})();
