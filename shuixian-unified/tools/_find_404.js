const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.SX_URL || 'http://127.0.0.1:8140';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const bad = [];
  page.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
  page.on('requestfailed', r => bad.push('FAIL ' + r.url() + ' ' + (r.failure()&&r.failure().errorText)));
  for (const p of ['/index.html','/about.html','/search.html','/classic/index.html']) {
    await page.goto(BASE + p, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 800));
  }
  console.log('404/4xx/FAIL requests:');
  console.log(bad.length ? bad.join('\n') : '(none)');
  await browser.close();
})();
