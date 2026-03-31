/*
  FILE: composables/useCarrello.js
  SCOPO: Logica carrello estratta da pages/carrello.vue
  Gestisce: filtri, eliminazione, svuotamento, prezzi, quantita', raggruppamento, coupon, auth gate checkout.
  API: GET/DELETE /api/cart o /api/guest-cart, DELETE /api/cart/{id},
       PATCH /api/cart/{id}/quantity, DELETE /api/empty-cart o /api/empty-guest-cart,
       POST /api/calculate-coupon.
*/

import { useAuthUiSnapshotPersistence } from '~/composables/useAuthUiSnapshotPersistence'

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
  const authCheckoutTab = ref('login')
  const authCheckoutLoading = ref(false)
  const authCheckoutError = ref('')
  const authCheckoutSuccess = ref('')
  const authCheckoutRedirect = '/checkout'

  const authLoginForm = ref({
    email: '',
    password: '',
  })

  const authRegisterForm = ref({
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

  const extractFirstApiError = (error) => {
    const data = error?.response?._data || error?.data || {}
    const explicit = data?.message || error?.message
    if (explicit) return explicit
    const errors = data?.errors
    if (errors && typeof errors === 'object') {
      const firstKey = Object.keys(errors)[0]
      const firstVal = Array.isArray(errors[firstKey]) ? errors[firstKey][0] : errors[firstKey]
      if (firstVal) return String(firstVal)
    }
    return 'Operazione non riuscita. Riprova.'
  }

  const openCheckoutWithAuthGate = () => {
    if (isAuthenticated.value) {
      navigateTo(authCheckoutRedirect)
      return
    }
    authCheckoutError.value = ''
    authCheckoutSuccess.value = ''
    authCheckoutTab.value = 'login'
    showAuthCheckoutModal.value = true
  }

  const loginForCheckout = async () => {
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
      })
      persistSnapshotFromUser(response?.user || response)
      await refreshIdentity()
      showAuthCheckoutModal.value = false
      uiFeedback.success('Accesso effettuato', 'Continuiamo con il pagamento.')
      navigateTo(authCheckoutRedirect)
    } catch (error) {
      const statusCode = error?.response?.status || error?.statusCode
      if (statusCode === 403) {
        authCheckoutError.value = "Account da verificare. Completa la verifica e poi continua il pagamento."
        return
      }
      authCheckoutError.value = extractFirstApiError(error)
    } finally {
      authCheckoutLoading.value = false
    }
  }

  const registerForCheckout = async () => {
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
      })
      persistSnapshotFromUser(loginResponse?.user || loginResponse)
      await refreshIdentity()
      showAuthCheckoutModal.value = false
      uiFeedback.success('Registrazione completata', 'Continuiamo con il pagamento.')
      navigateTo(authCheckoutRedirect)
    } catch (error) {
      const statusCode = error?.response?.status || error?.statusCode
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
      const mergedGroups = cart.value.meta.address_groups.filter(g => g.package_ids?.length > 1)
      if (mergedGroups.length > 0) {
        const totalMerged = mergedGroups.reduce((sum, g) => sum + g.package_ids.length, 0)
        uiFeedback.info(`${totalMerged} pacchi identici sono stati uniti automaticamente`, '', { timeout: 5000 })
      }
    }
  })

  // --- FILTRI ---
  const filterProvenienza = ref('')
  const filterRiferimento = ref('')

  const filteredCartItems = computed(() => {
    if (!cart.value?.data) return []
    let items = [...cart.value.data]
    if (filterProvenienza.value) {
      items = items.filter(item =>
        item.origin_address?.city?.toLowerCase().includes(filterProvenienza.value.toLowerCase())
      )
    }
    if (filterRiferimento.value) {
      items = items.filter(item =>
        String(item.id).includes(filterRiferimento.value) ||
        (item.origin_address?.name || '').toLowerCase().includes(filterRiferimento.value.toLowerCase()) ||
        (item.destination_address?.name || '').toLowerCase().includes(filterRiferimento.value.toLowerCase())
      )
    }
    return items
  })

  const uniqueCities = computed(() => {
    if (!cart.value?.data) return []
    const cities = cart.value.data.map(item => item.origin_address?.city).filter(Boolean)
    return [...new Set(cities)]
  })

  // --- ELIMINAZIONE SINGOLA SPEDIZIONE ---
  const showDeleteConfirm = ref(false)
  const deleteTargetId = ref(null)
  const deleteLoading = ref(false)

  const askDelete = (id) => {
    deleteTargetId.value = id
    showDeleteConfirm.value = true
  }

  const confirmDelete = async () => {
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

  const emptyCart = async () => {
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

  // --- HELPER PREZZI ---
  const formatPrice = (cents) => {
    if (!cents && cents !== 0) return '0,00\u20AC'
    const num = Number(cents) / 100
    return num.toFixed(2).replace('.', ',') + '\u20AC'
  }

  const unitPrice = (item) => {
    const total = Number(item.single_price) || 0
    const qty = Math.max(1, Number(item.quantity) || 1)
    return total / qty
  }

  // --- AGGIORNAMENTO QUANTITA' ---
  const quantityUpdating = ref(null)

  const updateQuantity = async (itemId, newQty) => {
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

  const formatDate = (item) => {
    if (item.created_at) {
      return new Date(item.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }
    return new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const getPackageIcon = (item) => {
    const type = item.package_type?.toLowerCase() || ''
    if (type.includes('pallet')) return '/img/quote/first-step/pallet.png'
    if (type.includes('busta')) return '/img/quote/first-step/envelope.png'
    if (type.includes('valigia')) return '/img/quote/first-step/suitcase.png'
    return '/img/quote/first-step/pack.png'
  }

  // --- RAGGRUPPAMENTO PER INDIRIZZO ---
  const addressGroups = computed(() => cart.value?.meta?.address_groups || [])
  const groupColors = ['#095866', '#E44203', '#6B21A8', '#0369A1', '#B45309']

  const expandedGroups = ref({})

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

  const toggleGroup = (groupIdx) => {
    expandedGroups.value[groupIdx] = !isGroupExpanded(groupIdx)
  }

  const isGroupExpanded = (groupIdx) => {
    return expandedGroups.value[groupIdx] !== false
  }

  const displayEntries = computed(() => {
    const items = filteredCartItems.value
    if (!items.length) return []

    const filteredIds = new Set(items.map(i => i.id))
    const usedIds = new Set()
    const entries = []

    for (let gIdx = 0; gIdx < addressGroups.value.length; gIdx++) {
      const group = addressGroups.value[gIdx]
      const groupItems = (group.package_ids || [])
        .filter(id => filteredIds.has(id) && !usedIds.has(id))
        .map(id => items.find(i => i.id === id))
        .filter(Boolean)

      if (groupItems.length === 0) continue
      groupItems.forEach(i => usedIds.add(i.id))

      if (groupItems.length > 1) {
        const groupTotal = groupItems.reduce((sum, i) => sum + (Number(i.single_price) || 0), 0)
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
  const couponMessage = ref(null)
  const couponApplied = ref(false)
  const couponDiscount = ref(null)
  const appliedTotal = ref(null)
  const showCouponField = ref(false)

  const showCouponPanel = computed(() => showCouponField.value || couponApplied.value || Boolean(couponMessage.value))

  const applyCoupon = async () => {
    if (!couponCode.value.trim()) return
    couponMessage.value = null
    showCouponField.value = true

    try {
      const total = cart.value?.meta?.total
      let numericTotal

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
      })

      if (data?.success) {
        couponApplied.value = true
        couponDiscount.value = data.percentage
        appliedTotal.value = data.new_total
        couponMessage.value = { type: 'success', text: `Sconto del ${data.percentage}% applicato!` }
      } else {
        couponMessage.value = { type: 'error', text: 'Coupon non valido.' }
      }
    } catch (e) {
      couponMessage.value = { type: 'error', text: 'Errore nella verifica del coupon.' }
    }
  }

  const removeCoupon = () => {
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
  const quantityButtonClass = "w-[32px] h-[32px] tablet:w-[24px] tablet:h-[24px] flex items-center justify-center rounded-full bg-[#EEF2F3] text-[#252B42] text-[0.875rem] tablet:text-[0.75rem] font-bold hover:bg-[#DDE5E7] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-[background-color,transform] duration-200 active:scale-[0.97]"
  const quantityButtonCompactClass = "w-[22px] h-[22px] flex items-center justify-center rounded-full bg-[#EEF2F3] text-[#252B42] text-[0.75rem] font-bold hover:bg-[#DDE5E7] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-[background-color,transform] duration-200 active:scale-[0.97]"
  const quantityButtonMobileClass = "w-[36px] h-[36px] flex items-center justify-center rounded-full bg-[#EEF2F3] text-[#252B42] text-[0.875rem] font-bold hover:bg-[#DDE5E7] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-[background-color,transform] duration-200 active:scale-[0.97]"

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
