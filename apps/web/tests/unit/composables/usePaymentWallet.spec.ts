import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { usePaymentWallet } from '~/composables/payment/usePaymentWallet'
import type { PaymentFlowSharedDeps } from '~/composables/payment/types'

/**
 * Test usePaymentWallet — flusso pagamento con saldo wallet interno.
 *
 * Wallet = 2-step backend:
 *   1. /api/wallet/pay (debito saldo) → restituisce wallet_transaction_id
 *   2. /api/stripe/mark-order-completed con ext_id=wallet-{tx} (finalizza)
 * NO Stripe SDK, NO 3DS.
 *
 * Test verifica:
 *  - sequenza chiamate corretta
 *  - propagazione amount in EUR
 *  - distinzione errore "saldo insufficiente" da errore tecnico
 *  - persistenza draft + finalizzazione
 */

const buildDeps = (overrides: Partial<PaymentFlowSharedDeps> = {}) => {
  const sanctum = vi.fn(async (url: string) => {
    if (url === '/api/wallet/pay') {
      return { success: true, data: { id: 'wt_777' } }
    }
    return { ok: true }
  })
  const resolvePayableOrderId = vi.fn().mockResolvedValue(99)
  const buildSubmissionContext = vi.fn().mockReturnValue({
    client_submission_id: 'sub_xyz',
  })
  const persistPaymentDraft = vi.fn()
  const callWithAuthRetry = vi.fn(async <T>(fn: () => Promise<T>) => fn())
  const onPaymentSuccess = vi.fn().mockResolvedValue(undefined)

  const cart = {
    finalTotal: ref(25),
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

describe('usePaymentWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Happy path', () => {
    it('chiama wallet/pay con amount EUR e reference order-{id}', async () => {
      const deps = buildDeps()
      const { payWithWallet } = usePaymentWallet(deps)

      await payWithWallet()

      expect(deps.sanctum).toHaveBeenCalledWith('/api/wallet/pay', {
        method: 'POST',
        body: {
          amount: 25,
          reference: 'order-99',
          description: 'Pagamento ordine #99',
        },
      })
    })

    it('chiama mark-order-completed con ext_id=wallet-{tx}', async () => {
      const deps = buildDeps()
      const { payWithWallet } = usePaymentWallet(deps)

      await payWithWallet()

      expect(deps.sanctum).toHaveBeenCalledWith('/api/stripe/mark-order-completed', {
        method: 'POST',
        body: {
          order_id: 99,
          payment_type: 'wallet',
          ext_id: 'wallet-wt_777',
          is_existing_order: false,
          client_submission_id: 'sub_xyz',
        },
      })
    })

    it('rispetta sequenza wallet/pay -> mark-completed -> onPaymentSuccess', async () => {
      const order: string[] = []
      const sanctum = vi.fn(async (url: string) => {
        order.push(url)
        if (url === '/api/wallet/pay') return { success: true, data: { id: 'wt_1' } }
        return { ok: true }
      })
      const onPaymentSuccess = vi.fn(async () => {
        order.push('onPaymentSuccess')
      })

      const deps = buildDeps({ sanctum, onPaymentSuccess })
      const { payWithWallet } = usePaymentWallet(deps)

      await payWithWallet()

      expect(order).toEqual([
        '/api/wallet/pay',
        '/api/stripe/mark-order-completed',
        'onPaymentSuccess',
      ])
    })

    it('persiste draft con paymentMethod=wallet', async () => {
      const deps = buildDeps()
      const { payWithWallet } = usePaymentWallet(deps)

      await payWithWallet()

      expect(deps.persistPaymentDraft).toHaveBeenCalledWith({
        orderId: 99,
        paymentMethod: 'wallet',
        submissionId: 'sub_xyz',
        isExisting: false,
        amount: 25,
      })
    })

    it('aggiorna paymentStep durante le 2 fasi', async () => {
      const observedSteps: string[] = []
      const sanctum = vi.fn(async (url: string) => {
        if (url === '/api/wallet/pay') {
          observedSteps.push('after-debit:' + (deps.paymentStep.value))
          return { success: true, data: { id: 'wt_1' } }
        }
        observedSteps.push('after-finalize:' + (deps.paymentStep.value))
        return { ok: true }
      })

      const deps = buildDeps({ sanctum })
      const { payWithWallet } = usePaymentWallet(deps)
      await payWithWallet()

      expect(observedSteps[0]).toBe('after-debit:Addebito saldo wallet...')
      expect(observedSteps[1]).toBe('after-finalize:Finalizzazione...')
    })

    it('chiama onPaymentSuccess con orderId + wallet', async () => {
      const deps = buildDeps()
      const { payWithWallet } = usePaymentWallet(deps)

      await payWithWallet()

      expect(deps.onPaymentSuccess).toHaveBeenCalledWith(99, 'wallet')
    })

    it('usa callWithAuthRetry con label specifici per ogni fase', async () => {
      const deps = buildDeps()
      const { payWithWallet } = usePaymentWallet(deps)

      await payWithWallet()

      const calls = (deps.callWithAuthRetry as ReturnType<typeof vi.fn>).mock.calls
      expect(calls[0][1]).toEqual({ label: 'wallet pay' })
      expect(calls[1][1]).toEqual({ label: 'wallet mark-completed' })
    })
  })

  describe('Existing order', () => {
    it('rileva existingOrderId e marca isExisting=true', async () => {
      const deps = buildDeps({
        cart: {
          finalTotal: ref(40),
          billingPayload: ref({}),
          existingOrder: ref(null),
          existingOrderId: ref(456),
        } as PaymentFlowSharedDeps['cart'],
      })
      const { payWithWallet } = usePaymentWallet(deps)

      await payWithWallet()

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
  })

  describe('Error: saldo insufficiente', () => {
    it('rileva messaggio "saldo insufficiente" e lancia errore specifico', async () => {
      const deps = buildDeps({
        sanctum: vi.fn().mockResolvedValue({
          success: false,
          message: 'Saldo wallet insufficiente per completare il pagamento.',
        }),
      })
      const { payWithWallet } = usePaymentWallet(deps)

      await expect(payWithWallet()).rejects.toThrow(/saldo/i)
      expect(deps.onPaymentSuccess).not.toHaveBeenCalled()
    })

    it('rileva messaggio "insufficient" case-insensitive', async () => {
      const deps = buildDeps({
        sanctum: vi.fn().mockResolvedValue({
          success: false,
          message: 'Insufficient balance.',
        }),
      })
      const { payWithWallet } = usePaymentWallet(deps)

      await expect(payWithWallet()).rejects.toThrow('Insufficient balance.')
    })

    it('non chiama mark-completed se debito wallet fallisce', async () => {
      const sanctum = vi.fn(async (url: string) => {
        if (url === '/api/wallet/pay') {
          return { success: false, message: 'Saldo insufficiente.' }
        }
        return { ok: true }
      })

      const deps = buildDeps({ sanctum })
      const { payWithWallet } = usePaymentWallet(deps)

      await expect(payWithWallet()).rejects.toThrow()

      const callUrls = (sanctum as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0])
      expect(callUrls).toContain('/api/wallet/pay')
      expect(callUrls).not.toContain('/api/stripe/mark-order-completed')
    })
  })

  describe('Error: errore tecnico', () => {
    it('errore generico (no "saldo" nel msg) usa fallback errore tecnico', async () => {
      const deps = buildDeps({
        sanctum: vi.fn().mockResolvedValue({
          success: false,
          error: 'Database connection lost',
        }),
      })
      const { payWithWallet } = usePaymentWallet(deps)

      await expect(payWithWallet()).rejects.toThrow('Database connection lost')
    })

    it('response senza message/error usa fallback "errore wallet"', async () => {
      const deps = buildDeps({
        sanctum: vi.fn().mockResolvedValue({ success: false }),
      })
      const { payWithWallet } = usePaymentWallet(deps)

      await expect(payWithWallet()).rejects.toThrow(/wallet/i)
    })

    it('response senza data.id (success ma malformato) lancia errore', async () => {
      const deps = buildDeps({
        sanctum: vi.fn().mockResolvedValue({ success: true }),
      })
      const { payWithWallet } = usePaymentWallet(deps)

      await expect(payWithWallet()).rejects.toThrow()
    })

    it('propaga errori network (resolvePayableOrderId)', async () => {
      const deps = buildDeps({
        resolvePayableOrderId: vi.fn().mockRejectedValue(new Error('Order not found')),
      })
      const { payWithWallet } = usePaymentWallet(deps)

      await expect(payWithWallet()).rejects.toThrow('Order not found')
      expect(deps.persistPaymentDraft).not.toHaveBeenCalled()
    })
  })

  describe('Amount handling', () => {
    it('amount=0 quando finalTotal undefined', async () => {
      const deps = buildDeps({
        cart: {
          billingPayload: ref({}),
          existingOrder: ref(null),
          existingOrderId: ref(null),
        } as PaymentFlowSharedDeps['cart'],
      })
      const { payWithWallet } = usePaymentWallet(deps)

      await payWithWallet()

      expect(deps.sanctum).toHaveBeenCalledWith(
        '/api/wallet/pay',
        expect.objectContaining({
          body: expect.objectContaining({ amount: 0 }),
        }),
      )
    })

    it('amount usa valore reale quando finalTotal definito', async () => {
      const deps = buildDeps({
        cart: {
          finalTotal: ref(123.45),
          billingPayload: ref({}),
          existingOrder: ref(null),
          existingOrderId: ref(null),
        } as PaymentFlowSharedDeps['cart'],
      })
      const { payWithWallet } = usePaymentWallet(deps)

      await payWithWallet()

      expect(deps.sanctum).toHaveBeenCalledWith(
        '/api/wallet/pay',
        expect.objectContaining({
          body: expect.objectContaining({ amount: 123.45 }),
        }),
      )
    })
  })
})
