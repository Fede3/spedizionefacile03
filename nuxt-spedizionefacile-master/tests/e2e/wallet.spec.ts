import { test, expect } from '@playwright/test'

test.describe('Wallet', () => {
  test('Portafoglio richiede autenticazione', async ({ page }) => {
    await page.goto('/account/portafoglio')
    await expect(page).toHaveURL(/autenticazione/)
  })

  test.describe('Wallet con autenticazione', () => {
    test.skip(true, 'Richiede utente autenticato con saldo - attivare con auth setup')

    test('T6.5.1 - saldo visibile', async ({ page }) => {
      await page.goto('/account/portafoglio')
      await page.waitForLoadState('networkidle')
      await expect(page.getByText(/€|saldo|balance/i).first()).toBeVisible()
    })

    test('T6.5.2 - bottone ricarica presente', async ({ page }) => {
      await page.goto('/account/portafoglio')
      await page.waitForLoadState('networkidle')
      await expect(page.getByText(/ricarica/i).first()).toBeVisible()
    })

    test('T6.5.3 - storico movimenti visibile', async ({ page }) => {
      await page.goto('/account/portafoglio')
      await page.waitForLoadState('networkidle')
      // Should show movements or empty state
      const content = await page.locator('main').textContent()
      expect(content?.length).toBeGreaterThan(0)
    })
  })
})
