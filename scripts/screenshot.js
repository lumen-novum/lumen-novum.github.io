const puppeteer = require('puppeteer');

const url = process.env.SCREENSHOT_URL || process.argv[2] || 'http://localhost:4000';
const output = process.env.SCREENSHOT_OUTPUT || process.argv[3] || 'screenshot.png';
const width = parseInt(process.env.SCREENSHOT_WIDTH || '1280', 10);
const height = parseInt(process.env.SCREENSHOT_HEIGHT || '800', 10);

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.screenshot({ path: output, fullPage: false });
  await browser.close();
  console.log('Saved screenshot to', output);
})();
