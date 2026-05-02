import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { usePaymentBonifico } from '~/composables/payment/usePaymentBonifico'
import type { PaymentFlowSharedDeps } from '~/composables/payment/types'

/**
 * Test usePaymentBonifico — flusso pagamento bonifico bancario.
 *
 * Bonifico è il flusso piu' isolato: NO Stripe SDK, NO carta state, NO 3DS.
 * Test verifica:
 *  - chiamata corretta a /api/stripe/mark-order-completed
 *  - persistenza draft prima di registrare
 *  - call retry con label "bonifico mark-completed"
 *  - propagazione errori
 *  - finalizzazione via onPaymentSuccess
 */

const buildDeps = (overrides: Partial<PaymentFlowSharedDeps> = {}) => {
  const sanctum = vi.fn().mockResolvedValue({ ok: true })
  const resolvePayableOrderId = vi.fn().mockResolvedValue(42)
  const buildSubmissionContext = vi.fn().mockReturnValue({
    client_submission_id: 'sub_abc123',
  })
  const persistPaymentDraft = vi.fn()
  const callWithAuthRetry = vi.fn(async <T>(fn: () => Promise<T>) => fn())
  const onPaymentSuccess = vi.fn().mockResolvedValue(undefined)

  const cart = {
    finalTotal: ref(15.5),
    billingPayload: ref({}),
    existingOrder: ref(null),
    existingOrderId: ref(null),
  } as PaymentFlowSharedDeps['cart']

  return {
    cart,
    paymentStep: ref(''),
    sanctum,
    resolvePayableOrderId,
    buildSubmissionContext,
    persistPaymentDraft,
    callWithAuthRetry,
    onPaymentSuccess,
    ...overrides,
  } as PaymentFlowSharedDeps
}

describe('usePaymentBonifico', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Happy path', () => {
    it('chiama mark-order-completed con payload bonifico corretto', async () => {
      const deps = buildDeps()
      const { payWithBonifico } = usePaymentBonifico(deps)

      await payWithBonifico()

      expect(deps.sanctum).toHaveBeenCalledWith('/api/stripe/mark-order-completed', {
        method: 'POST',
        body: {
          order_id: 42,
          payment_type: 'bonifico',
          is_existing_order: false,
          client_submission_id: 'sub_abc123',
        },
      })
    })

    it('persiste draft prima della chiamata sanctum', async () => {
      const deps = buildDeps()
      const persistOrder: string[] = []
      const persistMock = vi.fn(() => persistOrder.push('persist'))
      const sanctumMock = vi.fn(async () => {
        persistOrder.push('sanctum')
        return { ok: true }
      })

      const { payWithBonifico } = usePaymentBonifico({
        ...deps,
        persistPaymentDraft: persistMock,
        sanctum: sanctumMock,
      })

      await payWithBonifico()

      expect(persistOrder).toEqual(['persist', 'sanctum'])
    })

    it('persiste draft con metadata corretti', async () => {
      const deps = buildDeps({
        cart: {
          finalTotal: ref(99.9),
          billingPayload: ref({}),
          existingOrder: ref(null),
          existingOrderId: ref(null),
        } as PaymentFlowSharedDeps['cart'],
      })

      const { payWithBonifico } = usePaymentBonifico(deps)
      await payWithBonifico()

      expect(deps.persistPaymentDraft).toHaveBeenCalledWith({
        orderId: 42,
        paymentMethod: 'bonifico',
        submissionId: 'sub_abc123',
        isExisting: false,
        amount: 99.9,
      })
    })

    it('chiama onPaymentSuccess con orderId + bonifico al termine', async () => {
      const deps = buildDeps()
      const { payWithBonifico } = usePaymentBonifico(deps)

      await payWithBonifico()

      expect(deps.onPaymentSuccess).toHaveBeenCalledWith(42, 'bonifico')
    })

    it('aggiorna paymentStep durante il flusso', async () => {
      const deps = buildDeps()
      const { payWithBonifico } = usePaymentBonifico(deps)

      await payWithBonifico()
      expect(deps.paymentStep.value).toBe('Registrazione ordine...')
    })

    it('usa callWithAuthRetry con label "bonifico mark-completed"', async () => {
      const deps = buildDeps()
      const { payWithBonifico } = usePaymentBonifico(deps)

      await payWithBonifico()

      expect(deps.callWithAuthRetry).toHaveBeenCalledWith(expect.any(Function), {
        label: 'bonifico mark-completed',
      })
    })
  })

  describe('Existing order', () => {
    it('rileva existingOrderId e marca isExisting=true', async () => {
      const deps = buildDeps({
        cart: {
          finalTotal: ref(20),
          billingPayload: ref({}),
          existingOrder: ref(null),
          existingOrderId: ref(123),
        } as PaymentFlowSharedDeps['cart'],
      })
      const { payWithBonifico } = usePaymentBonifico(deps)

      await payWithBonifico()

      expect(deps.buildSubmissionContext).toHaveBeenCalledWith({
        preferExisting: true,
        generate: true,
      })
      expect(deps.persistPaymentDraft).toHaveBeenCalledWith(
        expect.objectContaining({ isExisting: true }),
      )
      expect(deps.sanctum).toHaveBeenCalledWith(
        '/api/stripe/mark-order-completed',
        expect.objectContaining({
          body: expect.objectContaining({ is_existing_order: true }),
        }),
      )
    })

    it('rileva existingOrder oggetto come isExisting=true', async () => {
      const deps = buildDeps({
        cart: {
          finalTotal: ref(20),
          billingPayload: ref({}),
          existingOrder: ref({ id: 123 }),
          existingOrderId: ref(null),
        } as PaymentFlowSharedDeps['cart'],
      })
      const { payWithBonifico } = usePaymentBonifico(deps)

      await payWithBonifico()

      expect(deps.persistPaymentDraft).toHaveBeenCalledWith(
        expect.objectContaining({ isExisting: true }),
      )
    })
  })

  describe('Error handling', () => {
    it('propaga errori sanctum verso il caller', async () => {
      const deps = buildDeps({
        sanctum: vi.fn().mockRejectedValue(new Error('Network error')),
        callWithAuthRetry: vi.fn(async <T>(fn: () => Promise<T>) => fn()),
      })
      const { payWithBonifico } = usePaymentBonifico(deps)

      await expect(payWithBonifico()).rejects.toThrow('Network error')
      expect(deps.onPaymentSuccess).not.toHaveBeenCalled()
    })

    it('propaga errori da resolvePayableOrderId', async () => {
      const deps = buildDeps({
        resolvePayableOrderId: vi.fn().mockRejectedValue(new Error('No order')),
      })
      const { payWithBonifico } = usePaymentBonifico(deps)

      await expect(payWithBonifico()).rejects.toThrow('No order')
      expect(deps.persistPaymentDraft).not.toHaveBeenCalled()
      expect(deps.sanctum).not.toHaveBeenCalled()
    })
  })

  describe('finalTotal handling', () => {
    it('amount=0 quando finalTotal undefined', async () => {
      const deps = buildDeps({
        cart: {
          billingPayload: ref({}),
          existingOrder: ref(null),
          existingOrderId: ref(null),
        } as PaymentFlowSharedDeps['cart'],
      })

      const { payWithBonifico } = usePaymentBonifico(deps)
      await payWithBonifico()

      expect(deps.persistPaymentDraft).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 0 }),
      )
    })
  })
})
