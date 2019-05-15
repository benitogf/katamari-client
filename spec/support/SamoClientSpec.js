const puppeteer = require('puppeteer');

describe('Samo', () => {
  let browser = undefined;

  beforeEach(async () => {
    browser = await puppeteer.launch({ args: ['--disable-setuid-sandbox', '--no-sandbox'], dumpio: true });
  });

  afterEach(async () => {
    if (browser) await browser.close();
  });

  it('serves a homepage with a title', async () => {
    const url = `http://localhost:8080`;

    const page = await browser.newPage();
    await page.goto(url);

    const title = await page.title();
    expect(title).toBe('samo - test');
    await page.waitFor('.wait');
    const bodyHTML = await page.evaluate(() => document.querySelector('body').innerHTML);
    expect(bodyHTML.replace('<div class="wait"></div>', '')).toBe('000000000000');
  });
});