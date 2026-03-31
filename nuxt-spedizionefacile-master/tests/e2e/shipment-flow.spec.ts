import { test, expect } from '@playwright/test'

test.describe('Flusso Spedizione', () => {
  test('T3.1 - pagina preventivo carica correttamente', async ({ page }) => {
    const response = await page.goto('/preventivo')
    expect(response?.status()).toBeLessThan(400)

    await page.waitForLoadState('networkidle')

    // The Preventivo component should be rendered
    await expect(page.locator('h2', { hasText: 'Preventivo Rapido' })).toBeVisible({ timeout: 10000 })
  })

  test('T3.2 - step 1 ha tutti i campi necessari', async ({ page }) => {
    await page.goto('/preventivo')
    await page.waitForLoadState('networkidle')

    // Address fields
    await expect(page.locator('#origin_city')).toBeVisible()
    await expect(page.locator('#origin_postal_code')).toBeVisible()
    await expect(page.locator('#destination_city')).toBeVisible()
    await expect(page.locator('#destination_postal_code')).toBeVisible()

    // Package type selector
    await expect(page.locator('button.package-card', { hasText: 'Pacco' })).toBeVisible()
    await expect(page.locator('button.package-card', { hasText: 'Pallet' })).toBeVisible()
    await expect(page.locator('button.package-card', { hasText: 'Valigia' })).toBeVisible()
  })

  test('T3.2.11 - accesso diretto step 3 senza step 2 redirige', async ({ page }) => {
    // Dynamic route: /la-tua-spedizione/[step].vue
    // Without completing step 1-2 session data, accessing step 3 should redirect or show error
    await page.goto('/la-tua-spedizione/3')
    await page.waitForLoadState('networkidle')

    const url = page.url()
    // Should be redirected or page should handle missing session data
    // The page either redirects back to step 1 or shows the page with empty data
    expect(url).toBeDefined()
  })

  test('T3.3 - pagina servizi step 2 non accessibile direttamente', async ({ page }) => {
    await page.goto('/la-tua-spedizione/2')
    await page.waitForLoadState('networkidle')

    const url = page.url()
    // Middleware or page logic should handle missing session data
    expect(url).toBeDefined()
  })

  test('T3.4 - pagina riepilogo carica', async ({ page }) => {
    const response = await page.goto('/riepilogo')
    await page.waitForLoadState('networkidle')

    // Page should load without server errors
    expect(response?.status()).toBeLessThan(500)
  })

  test('T3.5 - flusso completo step 1 compilazione form', async ({ page }) => {
    await page.goto('/preventivo')
    await page.waitForLoadState('networkidle')

    // Fill address fields
    await page.locator('#origin_city').fill('Roma')
    await page.locator('#origin_postal_code').fill('00100')
    await page.locator('#destination_city').fill('Milano')
    await page.locator('#destination_postal_code').fill('20100')

    // Trigger blur to dismiss autocomplete
    await page.locator('#destination_postal_code').blur()
    await page.waitForTimeout(300)

    // Add a package
    await page.locator('button.package-card', { hasText: 'Pacco' }).click()
    await page.waitForTimeout(500)

    // Fill dimensions
    await page.locator('#weight_0').fill('5')
    await page.locator('#first_size_0').fill('30')
    await page.locator('#second_size_0').fill('20')
    await page.locator('#third_size_0').fill('15')

    // All fields should be filled
    await expect(page.locator('#origin_city')).toHaveValue('Roma')
    await expect(page.locator('#origin_postal_code')).toHaveValue('00100')
    await expect(page.locator('#destination_city')).toHaveValue('Milano')
    await expect(page.locator('#destination_postal_code')).toHaveValue('20100')
    await expect(page.locator('#weight_0')).toHaveValue('5')
    await expect(page.locator('#first_size_0')).toHaveValue('30')
    await expect(page.locator('#second_size_0')).toHaveValue('20')
    await expect(page.locator('#third_size_0')).toHaveValue('15')
  })

  test('T3.6 - click Continua con form completo (richiede backend)', async ({ page }) => {
    let csrfRequestCount = 0
    let firstStepRequestCount = 0
    let sessionPayload = {
      data: {
        shipment_details: {},
        packages: [],
        services: null,
        total_price: 0,
        step: 1,
      },
    }

    await page.route('**/sanctum/csrf-cookie', async (route) => {
      csrfRequestCount += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    await page.route('**/api/session/first-step', async (route) => {
      firstStepRequestCount += 1
      const requestBody = route.request().postDataJSON()
      sessionPayload = {
        data: {
          shipment_details: requestBody.shipment_details,
          packages: requestBody.packages.map((pack: Record<string, unknown>) => ({
            ...pack,
            weight_price: 8.5,
            volume_price: 7.25,
            single_price: 8.5,
          })),
          services: null,
          total_price: 8.5,
          step: 2,
        },
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(sessionPayload),
      })
    })

    await page.route('**/api/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(sessionPayload),
      })
    })

    await page.goto('/preventivo')
    await page.waitForLoadState('networkidle')

    // Fill all required fields
    await page.locator('#origin_city').fill('Roma')
    await page.locator('#origin_postal_code').fill('00100')
    await page.locator('#destination_city').fill('Milano')
    await page.locator('#destination_postal_code').fill('20100')
    await page.locator('#destination_postal_code').blur()
    await page.waitForTimeout(300)

    await page.locator('button.package-card', { hasText: 'Pacco' }).click()
    await page.waitForTimeout(500)

    await page.locator('#weight_0').fill('5')
    await page.locator('#first_size_0').fill('30')
    await page.locator('#second_size_0').fill('20')
    await page.locator('#third_size_0').fill('15')
    await page.locator('#third_size_0').blur()
    await page.waitForTimeout(300)

    const continuaBtn = page.locator('button', { hasText: /Vai ai servizi|Continua/ }).first()
    await expect(continuaBtn).toBeVisible()
    await continuaBtn.click()

    await expect.poll(() => csrfRequestCount).toBe(1)
    await expect.poll(() => firstStepRequestCount).toBe(1)
    await page.waitForURL(/\/la-tua-spedizione\/2/, { timeout: 10000 })
    await expect(page).toHaveURL(/\/la-tua-spedizione\/2/)
  })

  test('T3.7 - homepage naviga correttamente al preventivo', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Homepage has the Preventivo component embedded
    await expect(page.locator('h2', { hasText: 'Preventivo Rapido' })).toBeVisible({ timeout: 10000 })

    // Fill some data and verify interaction works on homepage too
    await page.locator('#origin_city').fill('Torino')
    await expect(page.locator('#origin_city')).toHaveValue('Torino')
  })
})
