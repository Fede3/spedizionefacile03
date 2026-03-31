import { test, expect } from '@playwright/test'

test.describe('Admin - Protezione Route', () => {
  test('T7.0.1 - admin dashboard richiede autenticazione', async ({ page }) => {
    await page.goto('/account/amministrazione')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 })
  })

  test('T7.0.2 - admin ordini richiede autenticazione', async ({ page }) => {
    await page.goto('/account/amministrazione/ordini')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 })
  })

  test('T7.0.3 - admin utenti richiede autenticazione', async ({ page }) => {
    await page.goto('/account/amministrazione/utenti')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 })
  })

  test('T7.0.4 - admin prezzi richiede autenticazione', async ({ page }) => {
    await page.goto('/account/amministrazione/prezzi')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 })
  })

  test('T7.0.5 - admin coupon richiede autenticazione', async ({ page }) => {
    await page.goto('/account/amministrazione/coupon')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 })
  })

  test('T7.0.6 - admin blog richiede autenticazione', async ({ page }) => {
    await page.goto('/account/amministrazione/blog')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 })
  })

  test('T7.0.7 - admin guide richiede autenticazione', async ({ page }) => {
    await page.goto('/account/amministrazione/guide')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 })
  })

  test('T7.0.8 - admin impostazioni richiede autenticazione', async ({ page }) => {
    await page.goto('/account/amministrazione/impostazioni')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 })
  })

  test('T7.0.9 - admin spedizioni richiede autenticazione', async ({ page }) => {
    await page.goto('/account/amministrazione/spedizioni')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 })
  })

  test('T7.0.10 - admin portafogli richiede autenticazione', async ({ page }) => {
    await page.goto('/account/amministrazione/portafogli')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 })
  })

  test('T7.0.11 - admin prelievi richiede autenticazione', async ({ page }) => {
    await page.goto('/account/amministrazione/prelievi')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 })
  })

  test('T7.0.12 - admin referral richiede autenticazione', async ({ page }) => {
    await page.goto('/account/amministrazione/referral')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 })
  })

  test('T7.0.13 - admin messaggi richiede autenticazione', async ({ page }) => {
    await page.goto('/account/amministrazione/messaggi')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 })
  })

  test('T7.0.14 - admin servizi richiede autenticazione', async ({ page }) => {
    await page.goto('/account/amministrazione/servizi')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 })
  })

  test('T7.0.15 - admin test BRT richiede autenticazione', async ({ page }) => {
    await page.goto('/account/amministrazione/test-brt')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 })
  })

  test('T7.0.16 - admin immagine homepage richiede autenticazione', async ({ page }) => {
    await page.goto('/account/amministrazione/immagine-homepage')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/autenticazione/, { timeout: 30000 })
  })
})

test.describe('Admin - Pagine (richiede admin auth)', () => {
  // Questi test richiedono un utente con ruolo Admin.
  // Per eseguirli: creare auth.setup.ts con login admin
  // e usare storageState per riutilizzare la sessione.
  test.skip(true, 'Richiede utente Admin autenticato - attivare con auth setup')

  test('T7.1.1 - dashboard admin mostra statistiche', async ({ page }) => {
    await page.goto('/account/amministrazione')
    await expect(page.getByText(/ordini|ricavi|utenti/i).first()).toBeVisible()
  })

  test('T7.2.1 - lista ordini admin paginata', async ({ page }) => {
    await page.goto('/account/amministrazione/ordini')
    await page.waitForLoadState('networkidle')
    const content = await page.locator('main').textContent()
    expect(content?.length).toBeGreaterThan(0)
  })

  test('T7.3.1 - lista utenti admin', async ({ page }) => {
    await page.goto('/account/amministrazione/utenti')
    await page.waitForLoadState('networkidle')
    const content = await page.locator('main').textContent()
    expect(content?.length).toBeGreaterThan(0)
  })

  test('T7.4.1 - fasce prezzo visibili', async ({ page }) => {
    await page.goto('/account/amministrazione/prezzi')
    await page.waitForLoadState('networkidle')
    // Should show price band table
    await expect(page.locator('table, [class*="price"], [class*="band"]').first()).toBeVisible()
  })

  test('T7.5.1 - lista coupon visibile', async ({ page }) => {
    await page.goto('/account/amministrazione/coupon')
    await page.waitForLoadState('networkidle')
    const content = await page.locator('main').textContent()
    expect(content?.length).toBeGreaterThan(0)
  })

  test('T7.6.1 - lista blog visibile', async ({ page }) => {
    await page.goto('/account/amministrazione/blog')
    await page.waitForLoadState('networkidle')
    const content = await page.locator('main').textContent()
    expect(content?.length).toBeGreaterThan(0)
  })

  test('T7.6.2 - crea nuovo articolo', async ({ page }) => {
    await page.goto('/account/amministrazione/blog/nuovo')
    await expect(page.locator('input, textarea, [contenteditable]').first()).toBeVisible()
  })

  test('T7.7.1 - impostazioni admin visibili', async ({ page }) => {
    await page.goto('/account/amministrazione/impostazioni')
    await page.waitForLoadState('networkidle')
    const content = await page.locator('main').textContent()
    expect(content?.length).toBeGreaterThan(0)
  })

  test('T7.8.1 - test BRT form visibile', async ({ page }) => {
    await page.goto('/account/amministrazione/test-brt')
    await expect(page.locator('form, input, button').first()).toBeVisible()
  })
})
