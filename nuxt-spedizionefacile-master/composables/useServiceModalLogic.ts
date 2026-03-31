/**
 * useServiceModalLogic
 * Logica di validazione e utilita' per il modal servizi (contrassegno/assicurazione).
 * Estratto da ShipmentStepServiceModal.vue per ridurre la dimensione del componente.
 */
export function useServiceModalLogic(props: {
  serviceData: any
  selectedService: any
  packages: any[]
}) {
  // --- Opzioni dropdown ---
  const contrassegnoIncassoOptions = [
    { value: 'contanti', label: 'Contanti' },
    { value: 'assegno', label: 'Assegno bancario' },
  ]

  const contrassegnoRimborsoOptions = [
    { value: 'bonifico', label: 'Bonifico bancario' },
    { value: 'assegno', label: 'Assegno' },
    { value: 'assegno_circolare', label: 'Assegno circolare' },
  ]

  // Tipo pagamento contrassegno BRT (codPaymentType nel payload API)
  const contrassegnoCodPaymentOptions = [
    { value: 'BM', label: 'Bonifico bancario (BM)' },
    { value: 'CC', label: 'Assegno circolare (CC)' },
    { value: 'AS', label: 'Assegno bancario (AS)' },
  ]

  // --- Computed derivati ---
  const selectedServiceIndex = computed(() => Number(props.selectedService?.index ?? -1))

  const selectedServiceIcon = computed(() => (
    props.selectedService?.icon
      ? `/img/quote/second-step/${props.selectedService.icon}`
      : null
  ))

  const insurancePackages = computed(() => {
    if (Array.isArray(props.packages) && props.packages.length > 0) {
      return props.packages
    }
    return [{ package_type: 'pacco', weight: '', first_size: '', second_size: '', third_size: '' }]
  })

  const packageTypeIconMap: Record<string, string> = {
    pacco: '/img/quote/first-step/pack.png',
    pallet: '/img/quote/first-step/pallet.png',
    valigia: '/img/quote/first-step/suitcase.png',
    busta: '/img/quote/first-step/envelope.png',
  }

  const getPackageVisual = (pack: any) => {
    const normalized = String(pack?.package_type || 'pacco').trim().toLowerCase()
    return packageTypeIconMap[normalized] || packageTypeIconMap.pacco
  }

  const getInsuranceSummary = (pack: any) => {
    const weight = String(pack?.weight || '').trim()
    const first = String(pack?.first_size || '').trim()
    const second = String(pack?.second_size || '').trim()
    const third = String(pack?.third_size || '').trim()
    const weightLabel = weight ? `${weight} kg` : 'kg'
    const sizes = [first, second, third].filter(Boolean)
    if (sizes.length === 3) return `${weightLabel} · ${sizes[0]}x${sizes[1]}x${sizes[2]} cm`
    if (sizes.length === 2) return `${weightLabel} · ${sizes[0]}x${sizes[1]} cm`
    return `${weightLabel} · x*x cm`
  }

  // --- Currency helpers ---
  const normalizeCurrencyInput = (value: any) => {
    const sanitized = String(value || '')
      .replace(/[^\d,.\s]/g, '')
      .replace(/\s+/g, '')
      .replace(/\./g, ',')
    const [integerRaw = '', ...decimalParts] = sanitized.split(',')
    const integer = integerRaw.replace(/^0+(?=\d)/, '')
    const decimals = decimalParts.join('').slice(0, 2)
    if (!integer && !decimals) return ''
    if (!decimalParts.length) return integer || '0'
    return `${integer || '0'},${decimals}`
  }

  const parseCurrencyValue = (value: any) => {
    const normalized = normalizeCurrencyInput(value)
    if (!normalized) return 0
    return Number(normalized.replace(',', '.')) || 0
  }

  // --- Errors ---
  const serviceErrors = reactive({
    contrassegnoImporto: '',
    contrassegnoIncasso: '',
    contrassegnoRimborso: '',
    contrassegnoDettaglio: '',
    contrassegnoCodPayment: '',
    assicurazione: {} as Record<number, string>,
  })

  const clearServiceErrors = () => {
    serviceErrors.contrassegnoImporto = ''
    serviceErrors.contrassegnoIncasso = ''
    serviceErrors.contrassegnoRimborso = ''
    serviceErrors.contrassegnoDettaglio = ''
    serviceErrors.contrassegnoCodPayment = ''
    serviceErrors.assicurazione = {}
  }

  // --- Input handlers ---
  const handleContrassegnoImportoInput = (event: Event) => {
    const target = event.target as HTMLInputElement
    props.serviceData.contrassegno.importo = normalizeCurrencyInput(target?.value || '')
    serviceErrors.contrassegnoImporto = ''
  }

  const handleInsuranceInput = (index: number, event: Event) => {
    const target = event.target as HTMLInputElement
    props.serviceData.assicurazione[index] = normalizeCurrencyInput(target?.value || '')
    serviceErrors.assicurazione = { ...serviceErrors.assicurazione, [index]: '' }
  }

  // --- Validation computed ---
  const requiresContrassegnoDettaglio = computed(() => (
    props.serviceData.contrassegno.modalita_rimborso === 'bonifico'
  ))

  const isContrassegnoReady = computed(() => (
    parseCurrencyValue(props.serviceData.contrassegno.importo) > 0
    && !!props.serviceData.contrassegno.modalita_incasso
    && !!props.serviceData.contrassegno.modalita_rimborso
    && !!props.serviceData.contrassegno.cod_payment_method
    && (!requiresContrassegnoDettaglio.value || !!String(props.serviceData.contrassegno.dettaglio_rimborso || '').trim())
  ))

  const isInsuranceReady = computed(() => (
    Array.isArray(insurancePackages.value)
    && insurancePackages.value.length > 0
    && insurancePackages.value.every((_: any, index: number) => parseCurrencyValue(props.serviceData.assicurazione[index]) > 0)
  ))

  const isConfirmDisabled = computed(() => {
    if (selectedServiceIndex.value === 1) return !isContrassegnoReady.value
    if (selectedServiceIndex.value === 2) return !isInsuranceReady.value
    return false
  })

  // --- Validation ---
  const validateContrassegno = () => {
    clearServiceErrors()
    let isValid = true
    if (parseCurrencyValue(props.serviceData.contrassegno.importo) <= 0) {
      serviceErrors.contrassegnoImporto = 'Inserisci un importo valido maggiore di zero.'
      isValid = false
    }
    if (!props.serviceData.contrassegno.modalita_incasso) {
      serviceErrors.contrassegnoIncasso = 'Seleziona come il corriere incassa l\'importo.'
      isValid = false
    }
    if (!props.serviceData.contrassegno.modalita_rimborso) {
      serviceErrors.contrassegnoRimborso = 'Seleziona come vuoi ricevere il rimborso.'
      isValid = false
    }
    if (!props.serviceData.contrassegno.cod_payment_method) {
      serviceErrors.contrassegnoCodPayment = 'Seleziona il tipo di pagamento contrassegno.'
      isValid = false
    }
    if (requiresContrassegnoDettaglio.value && !String(props.serviceData.contrassegno.dettaglio_rimborso || '').trim()) {
      serviceErrors.contrassegnoDettaglio = 'Inserisci IBAN o dettaglio rimborso.'
      isValid = false
    }
    return isValid
  }

  const validateAssicurazione = () => {
    clearServiceErrors()
    let isValid = true
    const nextErrors: Record<number, string> = {}
    insurancePackages.value.forEach((_: any, index: number) => {
      if (parseCurrencyValue(props.serviceData.assicurazione[index]) <= 0) {
        nextErrors[index] = 'Inserisci un valore assicurato valido.'
        isValid = false
      }
    })
    serviceErrors.assicurazione = nextErrors
    return isValid
  }

  return {
    contrassegnoIncassoOptions,
    contrassegnoRimborsoOptions,
    contrassegnoCodPaymentOptions,
    selectedServiceIndex,
    selectedServiceIcon,
    insurancePackages,
    getPackageVisual,
    getInsuranceSummary,
    serviceErrors,
    clearServiceErrors,
    handleContrassegnoImportoInput,
    handleInsuranceInput,
    requiresContrassegnoDettaglio,
    isConfirmDisabled,
    validateContrassegno,
    validateAssicurazione,
  }
}
