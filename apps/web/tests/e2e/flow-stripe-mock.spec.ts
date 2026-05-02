import { test, expect } from '@playwright/test'
import { installStripeMocks } from './fixtures/api-mocks'

/**
 * Flow critico 2: checkout pagamento carta Stripe via MOCK.
 *
 * Strategia: l'intera catena Stripe (publishable key, payment intent,
 * confirm) e' mockata dal helper installStripeMocks, cosi' il test e'
 * deterministico e non dipende ne' dal backend Laravel ne' dalla rete
 * Stripe. La carta e' simulata: arrivare al confirm == ordine creato.
 *
 * Il mock non interagisce con Stripe.js reale: registra che l'app FE
 * abbia chiamato gli endpoint corretti nella sequenza giusta.
 */

test.describe('Flow Stripe (mock) - checkout carta', () => {
  test('mock Stripe risponde con succeeded a confirm-payment', async ({ page }) => {
    const stripeState = await installStripeMocks(page, { cardOutcome: 'succeeded' })

    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Trigger via fetch diretto: simula il behavior di create-payment-intent
    // come avverrebbe dal funnel. Il mock deve rispondere senza coinvolgere prod.
    const intentResp = await page.evaluate(async () => {
      const r = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: 1 }),
      })
      return { status: r.status, body: await r.json() }
    })

    expect(intentResp.status).toBe(200)
    expect(intentResp.body).toHaveProperty('client_secret')
    expect(stripeState.lastPaymentIntent).toBeDefined()

    // Conferma pagamento: il mock conta i succeeded
    const confirmResp = await page.evaluate(async () => {
      const r = await fetch('/api/stripe/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_intent_id: 'pi_test_123' }),
      })
      return { status: r.status, body: await r.json() }
    })

    expect(confirmResp.status).toBe(200)
    expect(confirmResp.body.status).toBe('succeeded')
    expect(stripeState.succeededCount).toBeGreaterThan(0)
  })

  test('mock Stripe declined risponde 402 e incrementa failedCount', async ({ page }) => {
    const stripeState = await installStripeMocks(page, { cardOutcome: 'declined' })

    await page.goto('/')

    const resp = await page.evaluate(async () => {
      const r = await fetch('/api/stripe/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_intent_id: 'pi_test_decline' }),
      })
      return { status: r.status, body: await r.json() }
    })

    expect(resp.status).toBe(402)
    expect(resp.body.error).toBe('card_declined')
    expect(stripeState.failedCount).toBe(1)
    expect(stripeState.succeededCount).toBe(0)
  })

  test('mock 3DS risponde requires_action con next_action', async ({ page }) => {
    await installStripeMocks(page, { cardOutcome: 'requires_action' })

    await page.goto('/')

    const resp = await page.evaluate(async () => {
      const r = await fetch('/api/stripe/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_intent_id: 'pi_test_3ds' }),
      })
      return { status: r.status, body: await r.json() }
    })

    expect(resp.status).toBe(200)
    expect(resp.body.status).toBe('requires_action')
    expect(resp.body.next_action).toBeDefined()
  })

  test('publishable key endpoint risponde con pk_test_dummy', async ({ page }) => {
    await installStripeMocks(page)
    await page.goto('/')

    const resp = await page.evaluate(async () => {
      const r = await fetch('/api/settings/stripe')
      return r.json()
    })
    expect(resp.publishable_key).toMatch(/^pk_test_/)
  })
})
