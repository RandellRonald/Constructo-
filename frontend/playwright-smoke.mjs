import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/');
await page.screenshot({ path: 'playwright-screenshot-home.png', fullPage: true });
console.log('home loaded');
await page.close();
await browser.close();
