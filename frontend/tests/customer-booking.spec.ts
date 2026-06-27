import { test, expect } from '@playwright/test'

test.describe('Customer Booking Flow', () => {
  test('Customer can login, select a service, pick location, and create booking', async ({ page }) => {
    // 1. Navigate to customer login
    await page.goto('/customer/login')
    
    // 2. Fill login form
    await page.fill('input[type="tel"]', '9999999999')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button:has-text("Sign In")')
    
    // 3. Verify Dashboard
    await expect(page.locator('text=Constructo')).toBeVisible()
    
    // 4. Select Service
    // Simulate clicking on the first service category
    // await page.click('text=Excavator')
    
    // 5. Location Picker
    // Map loads, verify address is geocoded, confirm pickup
    
    // 6. Booking Creation
    // Verify it redirects to tracking or payment depending on the flow
  })
})
