/*
  FILE: composables/useCarrello.ts
  SCOPO: Logica carrello estratta da pages/carrello.vue
  Gestisce: filtri, eliminazione, svuotamento, prezzi, quantita', raggruppamento, coupon, auth gate checkout.
  API: GET/DELETE /api/cart o /api/guest-cart, DELETE /api/cart/{id},
       PATCH /api/cart/{id}/quantity, DELETE /api/empty-cart o /api/empty-guest-cart,
       POST /api/calculate-coupon.
*/

import type { CartItem, AddressGroup } from '~/types'
import { useAuthUiSnapshotPersistence } from '~/composables/useAuthUiSnapshotPersistence'

interface CouponMessage {
  type: 'success' | 'error'
  text: string
}

interface CouponResponse {
  success?: boolean
  percentage?: number
  new_total?: number
}

interface DisplayGroupEntry {
  type: 'group'
  groupIndex: number
  group: AddressGroup
  items: CartItem[]
  totalCents: number
  color: string
}

interface DisplaySingleEntry {
  type: 'single'
  groupIndex: number
  item: CartItem
}

type DisplayEntry = DisplayGroupEntry | DisplaySingleEntry

interface LoginFormData {
  email: string
  password: string
}

interface RegisterFormData {
  name: string
  surname: string
  email: string
  email_confirmation: string
  prefix: string
  telephone_number: string
  password: string
  password_confirmation: string
  role: string
  user_type: string
}

export function useCarrello() {
  const { cart, refresh, status } = useCart()
  const { isAuthenticated, refreshIdentity } = useSanctumAuth()
  const { persistSnapshotFromUser } = useAuthUiSnapshotPersistence()
  const sanctum = useSanctumClient()
  const router = useRouter()
  const route = useRoute()
  const uiFeedback = useUiFeedback()

  // Promo settings per banner e badge
  const { loadPriceBands, promoSettings } = usePriceBands()
  onMounted(async () => { await loadPriceBands() })

  // Endpoint diverso per svuotare il carrello in base a se l'utente e' loggato o ospite
  const endpoint = computed(() => (isAuthenticated.value ? '/api/empty-cart' : '/api/empty-guest-cart'))

  // --- AUTH INLINE GATE (checkout da guest) ---
  const showAuthCheckoutModal = ref(false)
  const authCheckoutTab = ref<'login' | 'register'>('login')
  const authCheckoutLoading = ref(false)
  const authCheckoutError = ref('')
  const authCheckoutSuccess = ref('')
  const authCheckoutRedirect = '/checkout' as const

  const authLoginForm = ref<LoginFormData>({
    email: '',
    password: '',
  })

  const authRegisterForm = ref<RegisterFormData>({
    name: '',
    surname: '',
    email: '',
    email_confirmation: '',
    prefix: '+39',
    telephone_number: '',
    password: '',
    password_confirmation: '',
    role: 'Cliente',
    user_type: 'privato',
  })

  const extractFirstApiError = (error: unknown): string => {
    const err = error as { response?: { _data?: Record<string, unknown> }; data?: Record<string, unknown>; message?: string }
    const data = (err?.response?._data || err?.data || {}) as Record<string, unknown>
    const explicit = (data?.message as string) || err?.message
    if (explicit) return explicit
    const errors = data?.errors as Record<string, string[]> | undefined
    if (errors && typeof errors === 'object') {
      const firstKey = Object.keys(errors)[0]
      const firstVal = Array.isArray(errors[firstKey]) ? errors[firstKey][0] : errors[firstKey]
      if (firstVal) return String(firstVal)
    }
    return 'Operazione non riuscita. Riprova.'
  }

  const openCheckoutWithAuthGate = (): void => {
    if (isAuthenticated.value) {
      navigateTo(authCheckoutRedirect)
      return
    }
    authCheckoutError.value = ''
    authCheckoutSuccess.value = ''
    authCheckoutTab.value = 'login'
    showAuthCheckoutModal.value = true
  }

  const loginForCheckout = async (): Promise<void> => {
    authCheckoutError.value = ''
    authCheckoutSuccess.value = ''

    if (!authLoginForm.value.email || !authLoginForm.value.password) {
      authCheckoutError.value = 'Inserisci email e password per continuare.'
      return
    }

    authCheckoutLoading.value = true
    try {
      const response = await sanctum('/api/custom-login', {
        method: 'POST',
        body: {
          email: authLoginForm.value.email,
          password: authLoginForm.value.password,
        },
      }) as { user?: Record<string, unknown> } & Record<string, unknown>
      persistSnapshotFromUser(response?.user || response)
      await refreshIdentity()
      showAuthCheckoutModal.value = false
      uiFeedback.success('Accesso effettuato', 'Continuiamo con il pagamento.')
      navigateTo(authCheckoutRedirect)
    } catch (error: unknown) {
      const err = error as { response?: { status?: number }; statusCode?: number }
      const statusCode = err?.response?.status || err?.statusCode
      if (statusCode === 403) {
        authCheckoutError.value = "Account da verificare. Completa la verifica e poi continua il pagamento."
        return
      }
      authCheckoutError.value = extractFirstApiError(error)
    } finally {
      authCheckoutLoading.value = false
    }
  }

  const registerForCheckout = async (): Promise<void> => {
    authCheckoutError.value = ''
    authCheckoutSuccess.value = ''

    if (!authRegisterForm.value.name || !authRegisterForm.value.surname) {
      authCheckoutError.value = 'Inserisci nome e cognome.'
      return
    }
    if (!authRegisterForm.value.email || !authRegisterForm.value.email_confirmation) {
      authCheckoutError.value = 'Inserisci e conferma la tua email.'
      return
    }
    if (authRegisterForm.value.email !== authRegisterForm.value.email_confirmation) {
      authCheckoutError.value = 'Le email non coincidono.'
      return
    }
    if (!authRegisterForm.value.password || !authRegisterForm.value.password_confirmation) {
      authCheckoutError.value = 'Inserisci e conferma la password.'
      return
    }
    if (authRegisterForm.value.password !== authRegisterForm.value.password_confirmation) {
      authCheckoutError.value = 'Le password non coincidono.'
      return
    }

    authCheckoutLoading.value = true
    try {
      await sanctum('/api/custom-register', {
        method: 'POST',
        body: authRegisterForm.value,
      })

      // Tentativo login automatico per continuare direttamente il checkout
      const loginResponse = await sanctum('/api/custom-login', {
        method: 'POST',
        body: {
          email: authRegisterForm.value.email,
          password: authRegisterForm.value.password,
        },
      }) as { user?: Record<string, unknown> } & Record<string, unknown>
      persistSnapshotFromUser(loginResponse?.user || loginResponse)
      await refreshIdentity()
      showAuthCheckoutModal.value = false
      uiFeedback.success('Registrazione completata', 'Continuiamo con il pagamento.')
      navigateTo(authCheckoutRedirect)
    } catch (error: unknown) {
      const err = error as { response?: { status?: number }; statusCode?: number }
      const statusCode = err?.response?.status || err?.statusCode
      if (statusCode === 403) {
        authCheckoutError.value = "Registrazione completata, ma devi verificare l'email prima del pagamento."
        authCheckoutSuccess.value = "Apri la verifica account e poi torni al checkout."
        return
      }
      authCheckoutError.value = extractFirstApiError(error)
    } finally {
      authCheckoutLoading.value = false
    }
  }

  // Aggiorna i dati del carrello ogni volta che la pagina viene visitata
  onMounted(async () => {
    if (route.query.updated) {
      clearNuxtData('cart')
    }
    await refresh()

    if (cart.value?.meta?.address_groups) {
      const mergedGroups = cart.value.meta.address_groups.filter((g: AddressGroup) => g.package_ids?.length > 1)
      if (mergedGroups.length > 0) {
        const totalMerged = mergedGroups.reduce((sum: number, g: AddressGroup) => sum + g.package_ids.length, 0)
        uiFeedback.info(`${totalMerged} pacchi identici sono stati uniti automaticamente`, '', { timeout: 5000 })
      }
    }
  })

  // --- FILTRI ---
  const filterProvenienza = ref('')
  const filterRiferimento = ref('')

  const filteredCartItems = computed((): CartItem[] => {
    if (!cart.value?.data) return []
    let items = [...cart.value.data] as CartItem[]
    if (filterProvenienza.value) {
      items = items.filter((item: CartItem) =>
        item.origin_address?.city?.toLowerCase().includes(filterProvenienza.value.toLowerCase())
      )
    }
    if (filterRiferimento.value) {
      items = items.filter((item: CartItem) =>
        String(item.id).includes(filterRiferimento.value) ||
        (item.origin_address?.name || '').toLowerCase().includes(filterRiferimento.value.toLowerCase()) ||
        (item.destination_address?.name || '').toLowerCase().includes(filterRiferimento.value.toLowerCase())
      )
    }
    return items
  })

  const uniqueCities = computed((): string[] => {
    if (!cart.value?.data) return []
    const cities = (cart.value.data as CartItem[]).map((item: CartItem) => item.origin_address?.city).filter(Boolean) as string[]
    return [...new Set(cities)]
  })

  // --- ELIMINAZIONE SINGOLA SPEDIZIONE ---
  const showDeleteConfirm = ref(false)
  const deleteTargetId = ref<number | null>(null)
  const deleteLoading = ref(false)

  const askDelete = (id: number): void => {
    deleteTargetId.value = id
    showDeleteConfirm.value = true
  }

  const confirmDelete = async (): Promise<void> => {
    deleteLoading.value = true
    try {
      await sanctum(`/api/cart/${deleteTargetId.value}`, { method: 'DELETE' })
      clearNuxtData('cart')
      await refreshNuxtData('cart')
      uiFeedback.success('Spedizione rimossa dal carrello.')
    } catch (e) {
      uiFeedback.error('Errore durante la rimozione', 'Riprova.')
    } finally {
      deleteLoading.value = false
      showDeleteConfirm.value = false
      deleteTargetId.value = null
    }
  }

  // --- SVUOTA CARRELLO ---
  const showEmptyConfirm = ref(false)
  const emptyCartLoading = ref(false)

  const emptyCart = async (): Promise<void> => {
    emptyCartLoading.value = true
    try {
      await sanctum(endpoint.value, { method: 'DELETE' })
      clearNuxtData('cart')
      await refreshNuxtData('cart')
      showEmptyConfirm.value = false
      uiFeedback.success('Carrello svuotato.')
    } catch (error) {
      uiFeedback.error('Errore durante lo svuotamento del carrello', 'Riprova.')
    } finally {
      emptyCartLoading.value = false
    }
  }

  // formatPrice auto-importato da utils/price.js

  const unitPrice = (item: CartItem): number => {
    const total = Number(item.single_price) || 0
    const qty = Math.max(1, Number(item.quantity) || 1)
    return total / qty
  }

  // --- AGGIORNAMENTO QUANTITA' ---
  const quantityUpdating = ref<number | null>(null)

  const updateQuantity = async (itemId: number, newQty: number): Promise<void> => {
    if (newQty < 1) newQty = 1
    if (newQty > 100) newQty = 100
    quantityUpdating.value = itemId
    try {
      await sanctum(`/api/cart/${itemId}/quantity`, {
        method: 'PATCH',
        body: { quantity: newQty },
      })
      clearNuxtData('cart')
      await refreshNuxtData('cart')
    } catch (e) {
      uiFeedback.error('Errore nell\'aggiornamento della quantit\u00e0', 'Riprova.')
    } finally {
      quantityUpdating.value = null
    }
  }

  const formatDate = (item: CartItem): string => {
    if (item.created_at) {
      return new Date(item.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }
    return new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const getPackageIcon = (item: CartItem): string => {
    const type = item.package_type?.toLowerCase() || ''
    if (type.includes('pallet')) return '/img/quote/first-step/pallet.png'
    if (type.includes('busta')) return '/img/quote/first-step/envelope.png'
    if (type.includes('valigia')) return '/img/quote/first-step/suitcase.png'
    return '/img/quote/first-step/pack.png'
  }

  // --- RAGGRUPPAMENTO PER INDIRIZZO ---
  const addressGroups = computed((): AddressGroup[] => cart.value?.meta?.address_groups || [])
  const groupColors: string[] = ['#095866', '#E44203', '#6B21A8', '#0369A1', '#B45309']

  const expandedGroups = ref<Record<number, boolean>>({})

  onMounted(() => {
    const saved = sessionStorage.getItem('cart_expanded_groups')
    if (saved) {
      try {
        expandedGroups.value = JSON.parse(saved)
      } catch (e) {
      }
    }
  })

  watch(expandedGroups, (newVal) => {
    sessionStorage.setItem('cart_expanded_groups', JSON.stringify(newVal))
  }, { deep: true })

  const toggleGroup = (groupIdx: number): void => {
    expandedGroups.value[groupIdx] = !isGroupExpanded(groupIdx)
  }

  const isGroupExpanded = (groupIdx: number): boolean => {
    return expandedGroups.value[groupIdx] !== false
  }

  const displayEntries = computed((): DisplayEntry[] => {
    const items = filteredCartItems.value
    if (!items.length) return []

    const filteredIds = new Set(items.map((i: CartItem) => i.id))
    const usedIds = new Set<number>()
    const entries: DisplayEntry[] = []

    for (let gIdx = 0; gIdx < addressGroups.value.length; gIdx++) {
      const group = addressGroups.value[gIdx]
      const groupItems = (group.package_ids || [])
        .filter((id: number) => filteredIds.has(id) && !usedIds.has(id))
        .map((id: number) => items.find((i: CartItem) => i.id === id))
        .filter(Boolean) as CartItem[]

      if (groupItems.length === 0) continue
      groupItems.forEach((i: CartItem) => usedIds.add(i.id))

      if (groupItems.length > 1) {
        const groupTotal = groupItems.reduce((sum: number, i: CartItem) => sum + (Number(i.single_price) || 0), 0)
        entries.push({
          type: 'group',
          groupIndex: gIdx,
          group,
          items: groupItems,
          totalCents: groupTotal,
          color: groupColors[gIdx % groupColors.length],
        })
      } else {
        entries.push({
          type: 'single',
          groupIndex: gIdx,
          item: groupItems[0],
        })
      }
    }

    for (const item of items) {
      if (!usedIds.has(item.id)) {
        entries.push({
          type: 'single',
          groupIndex: -1,
          item,
        })
      }
    }

    return entries
  })

  // --- COUPON / CODICE SCONTO ---
  const couponCode = ref('')
  const couponMessage = ref<CouponMessage | null>(null)
  const couponApplied = ref(false)
  const couponDiscount = ref<number | null>(null)
  const appliedTotal = ref<number | null>(null)
  const showCouponField = ref(false)

  const showCouponPanel = computed(() => showCouponField.value || couponApplied.value || Boolean(couponMessage.value))

  const applyCoupon = async (): Promise<void> => {
    if (!couponCode.value.trim()) return
    couponMessage.value = null
    showCouponField.value = true

    try {
      const total = cart.value?.meta?.total
      let numericTotal: number

      if (typeof total === 'number') {
        numericTotal = total
      } else {
        const cleanTotal = String(total || '0')
          .replace(/[€\s\u00A0EUR]/gi, '')
          .replace(/\./g, '')
          .replace(',', '.')
        numericTotal = Number(cleanTotal) || 0
      }

      const data = await sanctum('/api/calculate-coupon', {
        method: 'POST',
        body: { coupon: couponCode.value, total: numericTotal },
      }) as CouponResponse

      if (data?.success) {
        couponApplied.value = true
        couponDiscount.value = data.percentage ?? null
        appliedTotal.value = data.new_total ?? null
        couponMessage.value = { type: 'success', text: `Sconto del ${data.percentage}% applicato!` }
      } else {
        couponMessage.value = { type: 'error', text: 'Coupon non valido.' }
      }
    } catch (e) {
      couponMessage.value = { type: 'error', text: 'Errore nella verifica del coupon.' }
    }
  }

  const removeCoupon = (): void => {
    couponCode.value = ''
    couponApplied.value = false
    couponDiscount.value = null
    appliedTotal.value = null
    couponMessage.value = null
    showCouponField.value = false
  }

  const displayTotal = computed(() => {
    return couponApplied.value && appliedTotal.value ? appliedTotal.value : cart.value?.meta?.total
  })

  // CSS classes for quantity buttons
  const quantityButtonClass = "w-[32px] h-[32px] tablet:w-[24px] tablet:h-[24px] flex items-center justify-center rounded-full bg-[#EEF2F3] text-[#252B42] text-[0.875rem] tablet:text-[0.75rem] font-bold hover:bg-[#DDE5E7] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-[background-color,transform] duration-200 active:scale-[0.97]" as const
  const quantityButtonCompactClass = "w-[22px] h-[22px] flex items-center justify-center rounded-full bg-[#EEF2F3] text-[#252B42] text-[0.75rem] font-bold hover:bg-[#DDE5E7] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-[background-color,transform] duration-200 active:scale-[0.97]" as const
  const quantityButtonMobileClass = "w-[36px] h-[36px] flex items-center justify-center rounded-full bg-[#EEF2F3] text-[#252B42] text-[0.875rem] font-bold hover:bg-[#DDE5E7] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-[background-color,transform] duration-200 active:scale-[0.97]" as const

  return {
    // Cart data
    cart,
    refresh,
    status,
    isAuthenticated,

    // Promo
    promoSettings,

    // Filters
    filterProvenienza,
    filterRiferimento,
    filteredCartItems,
    uniqueCities,

    // Delete
    showDeleteConfirm,
    deleteLoading,
    askDelete,
    confirmDelete,

    // Empty cart
    showEmptyConfirm,
    emptyCartLoading,
    emptyCart,

    // Prices
    formatPrice,
    unitPrice,
    formatDate,
    getPackageIcon,

    // Quantity
    quantityUpdating,
    updateQuantity,
    quantityButtonClass,
    quantityButtonCompactClass,
    quantityButtonMobileClass,

    // Grouping
    addressGroups,
    groupColors,
    expandedGroups,
    toggleGroup,
    isGroupExpanded,
    displayEntries,

    // Coupon
    couponCode,
    couponMessage,
    couponApplied,
    couponDiscount,
    appliedTotal,
    showCouponField,
    showCouponPanel,
    applyCoupon,
    removeCoupon,
    displayTotal,

    // Auth gate
    showAuthCheckoutModal,
    authCheckoutTab,
    authCheckoutLoading,
    authCheckoutError,
    authCheckoutSuccess,
    authCheckoutRedirect,
    authLoginForm,
    authRegisterForm,
    openCheckoutWithAuthGate,
    loginForCheckout,
    registerForCheckout,
  }
}
