import { test, expect } from '@playwright/test'

test.describe('Visual Regression', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('T9.2.1 - Homepage desktop baseline', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('homepage-desktop.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    })
  })

  test('T9.2.6 - Carrello vuoto baseline', async ({ page }) => {
    await page.goto('/carrello')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('carrello-vuoto.png', {
      maxDiffPixelRatio: 0.01,
    })
  })

  test('T9.2.8 - Autenticazione login tab baseline', async ({ page }) => {
    await page.goto('/autenticazione')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('autenticazione-login.png', {
      maxDiffPixelRatio: 0.01,
    })
  })

  test('T9.2.9 - Autenticazione register tab baseline', async ({ page }) => {
    await page.goto('/autenticazione')
    await page.waitForLoadState('networkidle')
    await page.getByText(/registrati/i).click()
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('autenticazione-register.png', {
      maxDiffPixelRatio: 0.01,
    })
  })
})

test.describe('Visual Regression Mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('Homepage mobile baseline', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    })
  })

  test('Autenticazione mobile baseline', async ({ page }) => {
    await page.goto('/autenticazione')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('autenticazione-mobile.png', {
      maxDiffPixelRatio: 0.01,
    })
  })
})
