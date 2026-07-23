const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Starting E2E test on live production: https://fake-artist-game-ten.vercel.app');

  const browser = await chromium.launch({ headless: true });
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();

  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  hostPage.on('console', msg => console.log('Host Console:', msg.type(), msg.text()));
  hostPage.on('pageerror', err => console.log('Host Page Error:', err));

  try {
    console.log('1. Host navigating to home page...');
    await hostPage.goto('https://fake-artist-game-ten.vercel.app');
    await hostPage.waitForSelector('input[placeholder="Например: Нео_2077"]');

    console.log('2. Host creating room as "Алиса_Хост"...');
    await hostPage.fill('input[placeholder="Например: Нео_2077"]', 'Алиса_Хост');
    await hostPage.click('button:has-text("СОЗДАТЬ НОВУЮ КОМНАТУ")');

    await hostPage.waitForTimeout(4000);

    const bodyText = await hostPage.innerText('body');
    console.log('Host page text after click:\n', bodyText);
  } catch (err) {
    console.error('❌ E2E Test Failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
