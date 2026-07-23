const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Starting Full 2-Player E2E Test on Production: https://fake-artist-game-ten.vercel.app');

  const browser = await chromium.launch({ headless: true });
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();

  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  try {
    // 1. Host creates room
    console.log('1. Host navigating to home page...');
    await hostPage.goto('https://fake-artist-game-ten.vercel.app');
    await hostPage.waitForSelector('input[placeholder="Например: Нео_2077"]');

    console.log('2. Host creating room as "Алиса_Хост"...');
    await hostPage.fill('input[placeholder="Например: Нео_2077"]', 'Алиса_Хост');
    await hostPage.click('button:has-text("СОЗДАТЬ НОВУЮ КОМНАТУ")');

    await hostPage.waitForURL(/\/room\/[A-Z0-9]{6}/);
    const roomCode = hostPage.url().split('/').pop();
    console.log(`✅ Host created room! Code: ${roomCode}`);

    // 2. Guest joins room
    console.log('3. Guest joining room as "Боб_Инкогнито"...');
    await guestPage.goto('https://fake-artist-game-ten.vercel.app');
    await guestPage.fill('input[placeholder="Например: Нео_2077"]', 'Боб_Инкогнито');
    await guestPage.fill('input[placeholder="КОД"]', roomCode);
    await guestPage.click('button:has-text("ВОЙТИ В ИГРУ")');

    await guestPage.waitForURL(new RegExp(`/room/${roomCode}`));
    console.log('✅ Guest joined room successfully!');

    // 3. Verify Live Lobby Sync
    console.log('4. Verifying Guest appears on Host screen live...');
    await hostPage.waitForSelector('text=Боб_Инкогнито', { timeout: 10000 });
    console.log('🎉 LIVE PLAYER SYNC PASSED 100%! "Боб_Инкогнито" displayed on Host screen!');

    // 4. Host launches session
    console.log('5. Host clicking "ЗАПУСТИТЬ СЕССИЮ"...');
    await hostPage.click('button:has-text("ЗАПУСТИТЬ СЕССИЮ")');

    // 5. Verify game drawing phase active
    await hostPage.waitForSelector('canvas', { timeout: 10000 });
    await guestPage.waitForSelector('canvas', { timeout: 10000 });
    console.log('✅ Drawing Phase active for both players!');

    // Check roles
    const hostText = await hostPage.innerText('body');
    const guestText = await guestPage.innerText('body');

    const hostIsFake = hostText.includes('ВЫ — ФЕЙК');
    const guestIsFake = guestText.includes('ВЫ — ФЕЙК');

    console.log(`🎭 Host Role: ${hostIsFake ? 'FAKE ARTIST' : 'REAL ARTIST'}`);
    console.log(`🎭 Guest Role: ${guestIsFake ? 'FAKE ARTIST' : 'REAL ARTIST'}`);

    console.log('🏆 FULL 2-PLAYER E2E GAME TEST PASSED 100%!');
  } catch (err) {
    console.error('❌ E2E Test Failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
