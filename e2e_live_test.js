const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Starting Full 2-Player E2E Test on Production: https://fake-artist-game-ten.vercel.app');

  const browser = await chromium.launch({ headless: true });
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();

  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  try {
    console.log('1. Host navigating to home page...');
    await hostPage.goto('https://fake-artist-game-ten.vercel.app');
    await hostPage.waitForSelector('input[placeholder="Например: Нео_2077"]');

    console.log('2. Host creating room as "Алиса_Хост"...');
    await hostPage.fill('input[placeholder="Например: Нео_2077"]', 'Алиса_Хост');
    await hostPage.click('button:has-text("СОЗДАТЬ НОВУЮ КОМНАТУ")');

    await hostPage.waitForURL(/\/room\/[A-Z0-9]{6}/);
    const roomUrl = hostPage.url();
    const roomCode = roomUrl.split('/').pop();
    console.log(`✅ Host created room! Code: ${roomCode}`);

    console.log('3. Guest joining room as "Боб_Инкогнито"...');
    await guestPage.goto('https://fake-artist-game-ten.vercel.app');
    await guestPage.fill('input[placeholder="Например: Нео_2077"]', 'Боб_Инкогнито');
    await guestPage.fill('input[placeholder="КОД"]', roomCode);
    await guestPage.click('button:has-text("ВОЙТИ В ИГРУ")');

    await guestPage.waitForURL(new RegExp(`/room/${roomCode}`));
    console.log('✅ Guest joined room successfully!');

    console.log('4. Verifying Guest appears on Host screen live...');
    await hostPage.waitForSelector('text=Боб_Инкогнито', { timeout: 10000 });
    console.log('🎉 LIVE PLAYER SYNC PASSED 100%! "Боб_Инкогнито" displayed on Host screen!');

    console.log('5. Host clicking "ЗАПУСТИТЬ СЕССИЮ"...');
    await hostPage.click('button:has-text("ЗАПУСТИТЬ СЕССИЮ")');

    await hostPage.waitForTimeout(3000);
    const hostText = await hostPage.innerText('body');
    console.log('Host page text after starting session:\n', hostText);

    const guestText = await guestPage.innerText('body');
    console.log('Guest page text after starting session:\n', guestText);
  } catch (err) {
    console.error('❌ E2E Test Failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
