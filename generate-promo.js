import { chromium } from 'playwright';
import path from 'path';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ 
    viewport: { width: 1550, height: 1300 }, 
    deviceScaleFactor: 2 
  });
  
  const fileUrl = 'file://' + path.resolve('promo.html');
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  
  // Wait a moment for web fonts to apply
  await page.waitForTimeout(1000);
  
  // Only capture the element so there is no extra body background padding
  const card = page.locator('.card');
  await card.screenshot({ 
    path: 'linkedin-promo.jpeg', 
    type: 'jpeg', 
    quality: 100 
  });
  
  await browser.close();
  console.log('Successfully generated linkedin-promo.jpeg!');
})();
