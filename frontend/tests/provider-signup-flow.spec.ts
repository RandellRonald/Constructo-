import { test, expect } from '@playwright/test';

test('Provider Registration Flow', async ({ page }) => {
  const uniqueId = Date.now();
  const testEmail = `provider_${uniqueId}@example.com`;
  const testPhone = `900${Math.floor(1000000 + Math.random() * 9000000)}`; // e.g. 9001234567 (10 digits)

  // Navigate to provider register
  await page.goto('http://localhost:5173/provider/register');
  
  // Verify registration page loaded
  await expect(page).toHaveURL(/.*\/provider\/register/);
  
  // Step 0: Business Information
  await page.getByPlaceholder('Enter business name').fill(`Biz ${uniqueId}`);
  await page.getByPlaceholder('Full name of owner').fill('Test Owner');
  await page.getByRole('button', { name: 'Next' }).click();

  // Step 1: Contact Information
  await page.getByPlaceholder('+91 XXXXX XXXXX').fill(testPhone);
  await page.getByPlaceholder('business@example.com').fill(testEmail);
  await page.getByRole('button', { name: 'Next' }).click();

  // Step 2: Service Categories
  await page.getByRole('button', { name: /Earthmoving & Excavation/ }).click();
  await page.getByRole('button', { name: 'Next' }).click();

  // Step 3: Location
  await page.getByRole('button', { name: 'Ernakulam' }).click();
  await page.getByRole('button', { name: 'Next' }).click();

  // Step 4: Account
  await page.getByPlaceholder('Min 8 characters').fill('Password123!');
  await page.getByPlaceholder('Confirm your password').fill('Password123!');
  await page.getByRole('checkbox').check();
  
  const submitButton = page.getByRole('button', { name: 'Create Account' });
  await submitButton.click();
  
  // Verify redirect to provider login
  await page.waitForURL(/.*\/provider\/login/, { timeout: 10000 });
  await expect(page).toHaveURL(/.*\/provider\/login/);
  
  // Save screenshot
  await page.screenshot({ path: 'provider_register_success.png' });
});
