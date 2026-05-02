import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import type { Ref } from 'vue'
import type { Stripe, StripeCardElement } from '@stripe/stripe-js'
import { usePaymentStripe } from '~/composables/payment/usePaymentStripe'
import type { PaymentStripeDeps } from '~/composables/payment/usePaymentStripe'

/**
 * Test usePaymentStripe — flusso pagamento carta Stripe (3DS).
 *
 * Mock di Stripe SDK:
 *  - Stripe.confirmCardPayment (carta nuova, con/senza 3DS)
 *  - Stripe.handleCardAction (carta salvata, 3DS challenge)
 *  - Card Element (mocked elemento riferimento)
 *
 * Branch coperti:
 *  - Carta SALVATA happy path (status=succeeded, no 3DS)
 *  - Carta SALVATA con 3DS (status=requires_action -> handleCardAction succeeded)
 *  - Carta SALVATA error (status=requires_action poi 3DS fallito)
 *  - Carta NUOVA happy path (confirmCardPayment succeeded)
 *  - Carta NUOVA con save-card-for-future (set-default-payment-method)
 *  - Carta NUOVA error stripe (confirmCardPayment error)
 *  - Stripe non inizializzato
 *  - cardElement non mounted
 */

type MockStripe = Pick<Stripe, 'confirmCardPayment' | 'handleCardAction'>
type StripeReturn<TKey extends keyof MockStripe> = Awaited<ReturnType<MockStripe[TKey]>>

const buildStripeMock = (overrides: Partial<MockStripe> = {}): Stripe =>
  ({
    confirmCardPayment: vi.fn().mockResolvedValue({
      paymentIntent: {
        id: 'pi_test_999',
        status: 'succeeded',
        payment_method: 'pm_test_555',
      },
    } as StripeReturn<'confirmCardPayment'>),
    handleCardAction: vi.fn().mockResolvedValue({
      paymentIntent: { id: 'pi_test_999', status: 'succeeded' },
    } as StripeReturn<'handleCardAction'>),
    ...overrides,
  } as unknown as Stripe)

const buildCardElementMock = (): StripeCardElement => ({} as StripeCardElement)

const buildDeps = (overrides: Partial<PaymentStripeDeps> = {}): PaymentStripeDeps => {
  const stripe = ref(buildStripeMock()) as Ref<Stripe | null>
  const cardElement = ref(buildCardElementMock()) as Ref<StripeCardElement | null>
  const sanctum = vi.fn(async (url: string) => {
    if (url === '/api/stripe/create-payment') {
      return { status: 'succeeded', payment_intent_id: 'pi_test_111' }
    }
    if (url === '/api/stripe/existing-order-payment') {
      return { status: 'succeeded', payment_intent_id: 'pi_test_222' }
    }
    if (url === '/api/stripe/create-payment-intent') {
      return { client_secret: 'pi_secret_abc' }
    }
    if (url === '/api/stripe/existing-order-payment-intent') {
      return { client_secret: 'pi_secret_existing' }
    }
    return { ok: true }
  })
  const markOrderPaid = vi.fn().mockResolvedValue(undefined)

  const cart = {
    finalTotal: ref(50),
    billingPayload: ref({ full_name: 'Mario Rossi' }),
    existingOrder: ref(null),
    existingOrderId: ref(null),
  } as PaymentStripeDeps['cart']

  return {
    stripe,
    cardElement,
    hasSavedCard: ref(false),
    useNewCard: ref(false),
    defaultPayment: ref({ card: { id: 'pm_saved_111' } }),
    saveCardForFuture: ref(false),
    user: ref({ name: 'Mario Rossi' }),
    cart,
    paymentStep: ref(''),
    sanctum: sanctum as unknown as PaymentStripeDeps['sanctum'],
    resolvePayableOrderId: vi.fn().mockResolvedValue(77),
    buildSubmissionContext: vi.fn().mockReturnValue({ client_submission_id: 'sub_777' }),
    persistPaymentDraft: vi.fn(),
    callWithAuthRetry: vi.fn(async <T>(fn: () => Promise<T>) => fn()),
    markOrderPaid,
    onPaymentSuccess: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('usePaymentStripe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Pre-conditions', () => {
    it('lancia errore se Stripe non inizializzato', async () => {
      const deps = buildDeps({
        stripe: ref(null) as Ref<Stripe | null>,
      })
      const { payWithCard } = usePaymentStripe(deps)

      await expect(payWithCard()).rejects.toThrow(/Stripe non inizializzato/i)
    })

    it('lancia errore se carta nuova ma cardElement non pronto', async () => {
      const deps = buildDeps({
        hasSavedCard: ref(false),
        useNewCard: ref(false),
        cardElement: ref(null) as Ref<StripeCardElement | null>,
      })
      const { payWithCard } = usePaymentStripe(deps)

      await expect(payWithCard()).rejects.toThrow(/Campo carta non pronto/i)
    })
  })

  describe('Carta SALVATA - happy path', () => {
    it('chiama /api/stripe/create-payment (NEW order) con saved card', async () => {
      const deps = buildDeps({
        hasSavedCard: ref(true),
        useNewCard: ref(false),
      })
      const { payWithCard } = usePaymentStripe(deps)

      await payWithCard()

      expect(deps.sanctum).toHaveBeenCalledWith('/api/stripe/create-payment', {
        method: 'POST',
        body: {
          order_id: 77,
          currency: 'eur',
          payment_method_id: 'pm_saved_111',
          client_submission_id: 'sub_777',
        },
      })
    })

    it('chiama /api/stripe/existing-order-payment per ordine existing', async () => {
      const deps = buildDeps({
        hasSavedCard: ref(true),
        useNewCard: ref(false),
        cart: {
          finalTotal: ref(50),
          billingPayload: ref({}),
          existingOrder: ref({ id: 100 }),
          existingOrderId: ref(100),
        } as PaymentStripeDeps['cart'],
      })
      const { payWithCard } = usePaymentStripe(deps)

      await payWithCard()

      expect(deps.sanctum).toHaveBeenCalledWith(
        '/api/stripe/existing-order-payment',
        expect.objectContaining({
          method: 'POST',
        }),
      )
    })

    it('marca ordine pagato e chiama onPaymentSuccess con carta', async () => {
      const deps = buildDeps({
        hasSavedCard: ref(true),
        useNewCard: ref(false),
      })
      const { payWithCard } = usePaymentStripe(deps)

      await payWithCard()

      expect(deps.markOrderPaid).toHaveBeenCalledWith(77, 'pi_test_111', false, 'sub_777')
      expect(deps.onPaymentSuccess).toHaveBeenCalledWith(77, 'carta')
    })
  })

  describe('Carta SALVATA - 3DS challenge', () => {
    it('completa 3DS quando status=requires_action', async () => {
      const stripeMock = buildStripeMock({
        handleCardAction: vi.fn().mockResolvedValue({
          paymentIntent: { id: 'pi_3ds_999', status: 'succeeded' },
        } as StripeReturn<'handleCardAction'>),
      })
      const sanctum = vi.fn(async (url: string) => {
        if (url === '/api/stripe/create-payment') {
          return {
            status: 'requires_action',
            client_secret: 'pi_3ds_secret',
            payment_intent_id: 'pi_3ds_111',
          }
        }
        return { ok: true }
      })

      const deps = buildDeps({
        hasSavedCard: ref(true),
        useNewCard: ref(false),
        stripe: ref(stripeMock) as Ref<Stripe | null>,
        sanctum: sanctum as unknown as PaymentStripeDeps['sanctum'],
      })
      const { payWithCard } = usePaymentStripe(deps)

      await payWithCard()

      expect(stripeMock.handleCardAction).toHaveBeenCalledWith('pi_3ds_secret')
      // Dopo 3DS l'id finale è quello del paymentIntent restituito
      expect(deps.markOrderPaid).toHaveBeenCalledWith(77, 'pi_3ds_999', false, 'sub_777')
    })

    it('lancia errore se 3DS fallisce', async () => {
      const stripeMock = buildStripeMock({
        handleCardAction: vi.fn().mockResolvedValue({
          error: { message: '3DS rejected', type: 'card_error' } as unknown,
        } as StripeReturn<'handleCardAction'>),
      })
      const sanctum = vi.fn().mockResolvedValue({
        status: 'requires_action',
        client_secret: 'pi_3ds_secret',
      })

      const deps = buildDeps({
        hasSavedCard: ref(true),
        useNewCard: ref(false),
        stripe: ref(stripeMock) as Ref<Stripe | null>,
        sanctum: sanctum as unknown as PaymentStripeDeps['sanctum'],
      })
      const { payWithCard } = usePaymentStripe(deps)

      await expect(payWithCard()).rejects.toBeDefined()
      expect(deps.markOrderPaid).not.toHaveBeenCalled()
    })

    it('lancia errore se 3DS resta non-succeeded dopo handleCardAction', async () => {
      const stripeMock = buildStripeMock({
        handleCardAction: vi.fn().mockResolvedValue({
          paymentIntent: { id: 'pi', status: 'requires_payment_method' },
        } as StripeReturn<'handleCardAction'>),
      })
      const sanctum = vi.fn().mockResolvedValue({
        status: 'requires_action',
        client_secret: 'pi_3ds_secret',
      })

      const deps = buildDeps({
        hasSavedCard: ref(true),
        useNewCard: ref(false),
        stripe: ref(stripeMock) as Ref<Stripe | null>,
        sanctum: sanctum as unknown as PaymentStripeDeps['sanctum'],
      })
      const { payWithCard } = usePaymentStripe(deps)

      await expect(payWithCard()).rejects.toThrow(/3D Secure non completata/i)
    })

    it('lancia errore se status non è succeeded ne requires_action', async () => {
      const sanctum = vi.fn().mockResolvedValue({
        status: 'requires_payment_method',
      })

      const deps = buildDeps({
        hasSavedCard: ref(true),
        useNewCard: ref(false),
        sanctum: sanctum as unknown as PaymentStripeDeps['sanctum'],
      })
      const { payWithCard } = usePaymentStripe(deps)

      await expect(payWithCard()).rejects.toThrow(/Pagamento non riuscito/i)
    })
  })

  describe('Carta NUOVA - happy path', () => {
    it('chiama create-payment-intent + confirmCardPayment con billing name dal cart', async () => {
      const stripeMock = buildStripeMock()
      const deps = buildDeps({
        stripe: ref(stripeMock) as Ref<Stripe | null>,
      })
      const { payWithCard } = usePaymentStripe(deps)

      await payWithCard()

      expect(deps.sanctum).toHaveBeenCalledWith('/api/stripe/create-payment-intent', {
        method: 'POST',
        body: { order_id: 77, client_submission_id: 'sub_777' },
      })
      expect(stripeMock.confirmCardPayment).toHaveBeenCalledWith(
        'pi_secret_abc',
        expect.objectContaining({
          payment_method: expect.objectContaining({
            billing_details: { name: 'Mario Rossi' },
          }),
        }),
      )
    })

    it('marca ordine pagato dopo confirmCardPayment succeeded', async () => {
      const deps = buildDeps()
      const { payWithCard } = usePaymentStripe(deps)

      await payWithCard()

      expect(deps.markOrderPaid).toHaveBeenCalledWith(77, 'pi_test_999', false, 'sub_777')
      expect(deps.onPaymentSuccess).toHaveBeenCalledWith(77, 'carta')
    })

    it('usa endpoint existing-order-payment-intent per ordini existing', async () => {
      const deps = buildDeps({
        cart: {
          finalTotal: ref(50),
          billingPayload: ref({}),
          existingOrder: ref({ id: 200 }),
          existingOrderId: ref(200),
        } as PaymentStripeDeps['cart'],
      })
      const { payWithCard } = usePaymentStripe(deps)

      await payWithCard()

      expect(deps.sanctum).toHaveBeenCalledWith(
        '/api/stripe/existing-order-payment-intent',
        expect.any(Object),
      )
    })

    it('usa fullname utente quando billingPayload non ha name', async () => {
      const stripeMock = buildStripeMock()
      const deps = buildDeps({
        stripe: ref(stripeMock) as Ref<Stripe | null>,
        cart: {
          finalTotal: ref(50),
          billingPayload: ref({}),
          existingOrder: ref(null),
          existingOrderId: ref(null),
        } as PaymentStripeDeps['cart'],
        user: ref({ name: 'Giulia Verdi' }),
      })
      const { payWithCard } = usePaymentStripe(deps)

      await payWithCard()

      expect(stripeMock.confirmCardPayment).toHaveBeenCalledWith(
        'pi_secret_abc',
        expect.objectContaining({
          payment_method: expect.objectContaining({
            billing_details: { name: 'Giulia Verdi' },
          }),
        }),
      )
    })
  })

  describe('Carta NUOVA - save card for future', () => {
    it('aggiunge setup_future_usage=off_session quando saveCardForFuture=true', async () => {
      const stripeMock = buildStripeMock()
      const deps = buildDeps({
        stripe: ref(stripeMock) as Ref<Stripe | null>,
        saveCardForFuture: ref(true),
      })
      const { payWithCard } = usePaymentStripe(deps)

      await payWithCard()

      expect(stripeMock.confirmCardPayment).toHaveBeenCalledWith(
        'pi_secret_abc',
        expect.objectContaining({ setup_future_usage: 'off_session' }),
      )
    })

    it('chiama set-default-payment-method dopo successo se saveCardForFuture', async () => {
      const deps = buildDeps({
        saveCardForFuture: ref(true),
      })
      const { payWithCard } = usePaymentStripe(deps)

      await payWithCard()

      expect(deps.sanctum).toHaveBeenCalledWith('/api/stripe/set-default-payment-method', {
        method: 'POST',
        body: { payment_method: 'pm_test_555' },
      })
    })

    it('errore set-default-payment-method NON blocca il pagamento (warning)', async () => {
      const sanctum = vi.fn(async (url: string) => {
        if (url === '/api/stripe/create-payment-intent') {
          return { client_secret: 'pi_secret' }
        }
        if (url === '/api/stripe/set-default-payment-method') {
          throw new Error('Set default failed')
        }
        return { ok: true }
      })

      const deps = buildDeps({
        saveCardForFuture: ref(true),
        sanctum: sanctum as unknown as PaymentStripeDeps['sanctum'],
      })
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { payWithCard } = usePaymentStripe(deps)

      // Non deve lanciare nonostante l'errore di set-default
      await expect(payWithCard()).resolves.toBeUndefined()
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('save card failed'),
        expect.anything(),
      )
      expect(deps.onPaymentSuccess).toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })
  })

  describe('Carta NUOVA - errori', () => {
    it('propaga errore stripe (confirmCardPayment error)', async () => {
      const stripeMock = buildStripeMock({
        confirmCardPayment: vi.fn().mockResolvedValue({
          error: { message: 'Card declined', type: 'card_error' } as unknown,
        } as StripeReturn<'confirmCardPayment'>),
      })
      const deps = buildDeps({
        stripe: ref(stripeMock) as Ref<Stripe | null>,
      })
      const { payWithCard } = usePaymentStripe(deps)

      await expect(payWithCard()).rejects.toBeDefined()
      expect(deps.markOrderPaid).not.toHaveBeenCalled()
    })

    it('lancia se paymentIntent.status non è succeeded', async () => {
      const stripeMock = buildStripeMock({
        confirmCardPayment: vi.fn().mockResolvedValue({
          paymentIntent: { id: 'pi', status: 'requires_action' },
        } as StripeReturn<'confirmCardPayment'>),
      })
      const deps = buildDeps({
        stripe: ref(stripeMock) as Ref<Stripe | null>,
      })
      const { payWithCard } = usePaymentStripe(deps)

      await expect(payWithCard()).rejects.toThrow(/Stato pagamento/i)
    })

    it('lancia errore se PaymentIntent endpoint risponde senza client_secret', async () => {
      const sanctum = vi.fn().mockResolvedValue({ error: 'PaymentIntent fail' })
      const deps = buildDeps({
        sanctum: sanctum as unknown as PaymentStripeDeps['sanctum'],
      })
      const { payWithCard } = usePaymentStripe(deps)

      await expect(payWithCard()).rejects.toThrow(/PaymentIntent fail|PaymentIntent non creato/i)
    })
  })

  describe('persistPaymentDraft', () => {
    it('persiste draft con paymentMethod=carta PRIMA di chiamare Stripe', async () => {
      const order: string[] = []
      const persist = vi.fn(() => order.push('persist'))
      const stripeMock = buildStripeMock({
        confirmCardPayment: vi.fn(async () => {
          order.push('confirmCardPayment')
          return {
            paymentIntent: { id: 'pi_x', status: 'succeeded' },
          } as StripeReturn<'confirmCardPayment'>
        }),
      })

      const deps = buildDeps({
        stripe: ref(stripeMock) as Ref<Stripe | null>,
        persistPaymentDraft: persist,
      })
      const { payWithCard } = usePaymentStripe(deps)

      await payWithCard()

      expect(order.indexOf('persist')).toBeLessThan(order.indexOf('confirmCardPayment'))
    })

    it('persiste draft con isExisting=true per ordini esistenti', async () => {
      const deps = buildDeps({
        cart: {
          finalTotal: ref(80),
          billingPayload: ref({}),
          existingOrder: ref({ id: 555 }),
          existingOrderId: ref(555),
        } as PaymentStripeDeps['cart'],
      })
      const { payWithCard } = usePaymentStripe(deps)

      await payWithCard()

      expect(deps.persistPaymentDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethod: 'carta',
          isExisting: true,
          amount: 80,
        }),
      )
    })
  })
})
