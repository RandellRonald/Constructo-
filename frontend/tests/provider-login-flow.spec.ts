import { test, expect } from '@playwright/test';

test('Provider Login Flow', async ({ page }) => {
  // Navigate to provider login
  await page.goto('http://localhost:5173/provider/login');
  
  // Verify login page loaded
  await expect(page).toHaveURL(/.*\/provider\/login/);
  
  // Fill email/phone
  const emailInput = page.getByPlaceholder('Enter email or phone');
  await emailInput.fill('provider@test.com');
  
  // Fill password
  const passwordInput = page.getByPlaceholder('Enter your password');
  await passwordInput.fill('password123');
  
  // Click submit
  const submitButton = page.getByRole('button', { name: 'Sign In' });
  await submitButton.click();
  
  // Verify redirect to provider dashboard
  await page.waitForURL(/.*\/provider\/dashboard/, { timeout: 10000 });
  await expect(page).toHaveURL(/.*\/provider\/dashboard/);
  
  // Save screenshot
  await page.screenshot({ path: 'provider_dashboard.png' });
});
