import { test, expect } from '@playwright/test'

const viewports = [
  { width: 320, height: 568 },   // iPhone SE
  { width: 375, height: 667 },   // iPhone 8
  { width: 390, height: 844 },   // iPhone 12 Pro
  { width: 412, height: 915 },   // Pixel 7
  { width: 768, height: 1024 },  // iPad
  { width: 1024, height: 768 },  // iPad Landscape
  { width: 1440, height: 900 }   // Desktop
]

test.describe('Responsive Layout Tests', () => {
  for (const viewport of viewports) {
    test(`Landing page renders correctly on ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/')
      
      // Verify main container doesn't overflow horizontally
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const windowWidth = await page.evaluate(() => window.innerWidth)
      
      // Allow slight variance for scrollbars depending on OS, but basically should not overflow
      expect(bodyWidth).toBeLessThanOrEqual(windowWidth + 20)
      
      // Check for elements that shouldn't be hidden
      await expect(page.locator('text=Constructo').first()).toBeVisible()
    })
  }
})
