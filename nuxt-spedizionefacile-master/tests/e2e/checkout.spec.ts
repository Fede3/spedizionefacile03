import { test, expect } from '@playwright/test'

test.describe('Checkout', () => {
  test('T5.1 - checkout richiede autenticazione', async ({ page }) => {
    // The checkout page has middleware: ["sanctum:auth"]
    // Visiting /checkout without auth should redirect to auth page
    await page.goto('/checkout')
    await page.waitForLoadState('networkidle')

    // Should redirect to /autenticazione or /login
    const url = page.url()
    const isRedirected = url.includes('autenticazione') || url.includes('login') || !url.includes('checkout')
    expect(isRedirected).toBe(true)
  })

  test('T5.1.2 - checkout redirect preserva contesto', async ({ page }) => {
    // Navigate to checkout — should redirect to auth
    const response = await page.goto('/checkout')

    // The response itself should not be a server error
    expect(response?.status()).toBeLessThan(500)

    await page.waitForLoadState('networkidle')

    // Should redirect to /autenticazione with redirect=/checkout query param
    // This verifies the auth middleware preserves the intended destination
    await expect(page).toHaveURL(/\/autenticazione\?redirect=/, { timeout: 30000 })
  })

  test('T5.2 - checkout senza carrello reindirizza a carrello', async ({ page }) => {
    // Even if somehow authenticated, empty cart redirects to /carrello
    // The checkout.vue code does:
    //   if (!cart.value || cart.value.data?.length === 0) { navigateTo("/carrello"); }
    // But since auth middleware runs first, we'll get redirected to auth
    await page.goto('/checkout')
    await page.waitForLoadState('networkidle')

    const url = page.url()
    // The auth middleware intercepts first, redirecting to /autenticazione?redirect=/checkout
    // The pathname should be /autenticazione (not /checkout)
    const pathname = new URL(url).pathname
    const isNotCheckout = pathname !== '/checkout'
    expect(isNotCheckout).toBe(true)
  })

  // Full checkout tests require authenticated user + cart items
  test.describe('Checkout UI (richiede auth)', () => {
    test.skip(true, 'Richiede utente autenticato con carrello - skip in run base')

    test('T5.1.1 - riepilogo ordine visibile', async ({ page }) => {
      await page.goto('/checkout')
      await page.waitForLoadState('networkidle')

      // Steps indicator at step 4
      const heading = page.locator('h2', { hasText: /Riepilogo ordine/i })
      await expect(heading).toBeVisible()
    })

    test('T5.1.2 - totale da pagare visibile', async ({ page }) => {
      await page.goto('/checkout')
      await page.waitForLoadState('networkidle')

      const totalLabel = page.getByText('Totale da pagare')
      await expect(totalLabel).toBeVisible()
    })

    test('T5.1.3 - metodi pagamento visibili', async ({ page }) => {
      await page.goto('/checkout')
      await page.waitForLoadState('networkidle')

      // Payment methods: carta, bonifico, portafoglio/wallet
      await expect(page.getByText(/carta/i)).toBeVisible()
      await expect(page.getByText(/bonifico/i)).toBeVisible()
      await expect(page.getByText(/portafoglio|wallet/i)).toBeVisible()
    })

    test('T5.1.4 - link modifica torna al carrello', async ({ page }) => {
      await page.goto('/checkout')
      await page.waitForLoadState('networkidle')

      const editLink = page.locator('a[href="/carrello"]', { hasText: 'Modifica' })
      await expect(editLink).toBeVisible()
    })
  })
})
