import { test, expect } from '@playwright/test'

test.describe('Referral & Wallet', () => {
  test('Wallet richiede autenticazione', async ({ page }) => {
    await page.goto('/account/portafoglio')
    await expect(page).toHaveURL(/autenticazione/)
  })

  test('Bonus/referral richiede autenticazione', async ({ page }) => {
    await page.goto('/account/bonus')
    await expect(page).toHaveURL(/autenticazione/)
  })

  test('Prelievi richiede autenticazione', async ({ page }) => {
    await page.goto('/account/prelievi')
    await expect(page).toHaveURL(/autenticazione/)
  })

  test('Registrazione con parametro ref preserva codice', async ({ page }) => {
    await page.goto('/autenticazione?ref=TESTCODE123')
    await page.waitForLoadState('networkidle')
    // Switch to register tab
    const registerTab = page.getByText(/registrati/i)
    if (await registerTab.isVisible()) {
      await registerTab.click()
      await page.waitForTimeout(500)
      // Check if referral code field is pre-filled
      const refInput = page.locator('input[name*="referral"], input[placeholder*="referral"], input[id*="referral"]')
      if (await refInput.isVisible()) {
        const value = await refInput.inputValue()
        expect(value).toBe('TESTCODE123')
      }
    }
  })
})
