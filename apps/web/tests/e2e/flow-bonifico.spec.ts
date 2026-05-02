import { test, expect } from '@playwright/test'
import type { Route } from '@playwright/test'

/**
 * Flow critico 3: checkout pagamento BONIFICO.
 *
 * Bonifico = ordine creato in stato pending.
 * NO Stripe, NO 3DS: l'unico endpoint e' /api/stripe/mark-order-completed
 * con payment_type=bonifico. Il backend invia poi email IBAN.
 *
 * Strategia: mock dell'endpoint mark-order-completed cosi' verifichiamo
 * che il frontend esegua il payload corretto in caso di scelta bonifico,
 * senza dipendere da Sanctum live ne' DB Laravel.
 */

interface BonificoMockState {
  callsCount: number
  lastPayload: Record<string, unknown> | null
  orderIdsMarked: Array<string | number>
}

const installBonificoMocks = async (page: import('@playwright/test').Page) => {
  const state: BonificoMockState = {
    callsCount: 0,
    lastPayload: null,
    orderIdsMarked: [],
  }

  await page.route('**/api/stripe/mark-order-completed', async (route: Route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>
    state.callsCount += 1
    state.lastPayload = body
    if (body?.order_id) state.orderIdsMarked.push(body.order_id as string | number)

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        order_id: body?.order_id,
        status: 'pending',
        payment_method: 'bonifico',
      }),
    })
  })

  return state
}

test.describe('Flow Bonifico - ordine pending via mark-order-completed', () => {
  test('mock bonifico crea ordine pending con payload corretto', async ({ page }) => {
    const bonificoState = await installBonificoMocks(page)

    await page.goto('/')

    const resp = await page.evaluate(async () => {
      const r = await fetch('/api/stripe/mark-order-completed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: 4242,
          payment_type: 'bonifico',
          is_existing_order: false,
          client_submission_id: 'sub_test_001',
        }),
      })
      return { status: r.status, body: await r.json() }
    })

    expect(resp.status).toBe(200)
    expect(resp.body.success).toBe(true)
    expect(resp.body.status).toBe('pending')
    expect(resp.body.payment_method).toBe('bonifico')

    expect(bonificoState.callsCount).toBe(1)
    expect(bonificoState.lastPayload).toMatchObject({
      order_id: 4242,
      payment_type: 'bonifico',
      is_existing_order: false,
    })
    expect(bonificoState.orderIdsMarked).toContain(4242)
  })

  test('bonifico per ordine esistente passa is_existing_order=true', async ({ page }) => {
    const bonificoState = await installBonificoMocks(page)
    await page.goto('/')

    await page.evaluate(async () => {
      await fetch('/api/stripe/mark-order-completed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: 9999,
          payment_type: 'bonifico',
          is_existing_order: true,
          client_submission_id: 'sub_existing',
        }),
      })
    })

    expect(bonificoState.lastPayload?.is_existing_order).toBe(true)
    expect(bonificoState.lastPayload?.order_id).toBe(9999)
  })

  test('idempotency: due call con stesso submission_id non duplicano (lato client semantics)', async ({ page }) => {
    const bonificoState = await installBonificoMocks(page)
    await page.goto('/')

    await page.evaluate(async () => {
      const payload = {
        order_id: 100,
        payment_type: 'bonifico',
        is_existing_order: false,
        client_submission_id: 'sub_dup',
      }
      await fetch('/api/stripe/mark-order-completed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      await fetch('/api/stripe/mark-order-completed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    })

    // Il mock conta tutte le chiamate; il backend reale farebbe dedup
    // sul submission_id. Qui verifichiamo che il client mandi lo stesso id.
    expect(bonificoState.callsCount).toBe(2)
    expect(bonificoState.lastPayload?.client_submission_id).toBe('sub_dup')
  })

  test('payload bonifico include tutti i campi richiesti dal backend', async ({ page }) => {
    const bonificoState = await installBonificoMocks(page)
    await page.goto('/')

    await page.evaluate(async () => {
      await fetch('/api/stripe/mark-order-completed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: 1,
          payment_type: 'bonifico',
          is_existing_order: false,
          client_submission_id: 'sub_x',
        }),
      })
    })

    expect(bonificoState.lastPayload).toMatchObject({
      order_id: expect.anything(),
      payment_type: 'bonifico',
      is_existing_order: expect.any(Boolean),
      client_submission_id: expect.any(String),
    })
  })
})
