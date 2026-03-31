import { test, expect } from '@playwright/test'

test.describe('Account - Protezione Route', () => {
  test('T6.1 - dashboard richiede autenticazione', async ({ page }) => {
    await page.goto('/account')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 })
  })

  test('T6.2 - profilo richiede autenticazione', async ({ page }) => {
    await page.goto('/account/profilo')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 })
  })

  test('T6.3 - indirizzi richiede autenticazione', async ({ page }) => {
    await page.goto('/account/indirizzi')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 })
  })

  test('T6.4 - carte richiede autenticazione', async ({ page }) => {
    await page.goto('/account/carte')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 })
  })

  test('T6.5 - portafoglio richiede autenticazione', async ({ page }) => {
    await page.goto('/account/portafoglio')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 })
  })

  test('T6.6 - spedizioni richiede autenticazione', async ({ page }) => {
    await page.goto('/account/spedizioni')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 })
  })

  test('T6.7 - spedizioni configurate richiede autenticazione', async ({ page }) => {
    await page.goto('/account/spedizioni-configurate')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 })
  })

  test('T6.8 - bonus richiede autenticazione', async ({ page }) => {
    await page.goto('/account/bonus')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 })
  })

  test('T6.9 - assistenza richiede autenticazione', async ({ page }) => {
    await page.goto('/account/assistenza')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 })
  })

  test('T6.10 - prelievi richiede autenticazione', async ({ page }) => {
    await page.goto('/account/prelievi')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 })
  })
})

test.describe('Account - Pagine (richiede auth)', () => {
  // Questi test richiedono un utente autenticato.
  // Per eseguirli: creare un file auth.setup.ts con login flow
  // e usare storageState per riutilizzare la sessione.
  test.skip(true, 'Richiede utente autenticato - attivare con auth setup')

  test('T6.1.1 - dashboard mostra card grid', async ({ page }) => {
    await page.goto('/account')
    await expect(page.getByText(/spedizioni/i)).toBeVisible()
    await expect(page.getByText(/portafoglio/i)).toBeVisible()
    await expect(page.getByText(/profilo/i)).toBeVisible()
  })

  test('T6.1.2 - dashboard link funzionanti', async ({ page }) => {
    await page.goto('/account')
    await page.getByText(/profilo/i).click()
    await expect(page).toHaveURL(/account\/profilo/)
  })

  test('T6.2.1 - profilo mostra dati utente', async ({ page }) => {
    await page.goto('/account/profilo')
    await expect(page.locator('input, [class*="profile"]').first()).toBeVisible()
  })

  test('T6.2.2 - toggle edit mode', async ({ page }) => {
    await page.goto('/account/profilo')
    const editBtn = page.getByText(/modifica/i).first()
    await editBtn.click()
    await expect(page.locator('input[type="text"]').first()).toBeEnabled()
  })

  test('T6.3.1 - lista indirizzi visibile', async ({ page }) => {
    await page.goto('/account/indirizzi')
    await page.waitForLoadState('networkidle')
    // Should show address list or empty state
    const content = await page.locator('main').textContent()
    expect(content?.length).toBeGreaterThan(0)
  })

  test('T6.4.1 - lista carte visibile', async ({ page }) => {
    await page.goto('/account/carte')
    await page.waitForLoadState('networkidle')
    const content = await page.locator('main').textContent()
    expect(content?.length).toBeGreaterThan(0)
  })

  test('T6.5.1 - saldo portafoglio visibile', async ({ page }) => {
    await page.goto('/account/portafoglio')
    await page.waitForLoadState('networkidle')
    // Should show balance
    await expect(page.getByText(/saldo|balance|€/i).first()).toBeVisible()
  })

  test('T6.6.1 - lista spedizioni visibile', async ({ page }) => {
    await page.goto('/account/spedizioni')
    await page.waitForLoadState('networkidle')
    const content = await page.locator('main').textContent()
    expect(content?.length).toBeGreaterThan(0)
  })

  test('T6.8.1 - bonus/referral visibile', async ({ page }) => {
    await page.goto('/account/bonus')
    await page.waitForLoadState('networkidle')
    const content = await page.locator('main').textContent()
    expect(content?.length).toBeGreaterThan(0)
  })
})
