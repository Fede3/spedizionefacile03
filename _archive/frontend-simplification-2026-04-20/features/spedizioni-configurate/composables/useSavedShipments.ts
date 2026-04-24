/**
 * Composable: useSavedShipments
 * Logica completa per la pagina /account/spedizioni-configurate.
 *
 * Gestisce: fetch spedizioni salvate, filtri, paginazione, selezione multipla,
 * eliminazione singola/bulk, aggiunta al carrello, modifica, feedback, duplicati.
 */
import type { Address, SavedShipment } from '~/types'

interface EditFormState {
	origin_name: string
	origin_address: string
	origin_address_number: string
	origin_city: string
	origin_postal_code: string
	origin_province: string
	origin_telephone: string
	dest_name: string
	dest_address: string
	dest_address_number: string
	dest_city: string
	dest_postal_code: string
	dest_province: string
	dest_telephone: string
	package_type: string
	quantity: number | string
	weight: number | string
	first_size: number | string
	second_size: number | string
	third_size: number | string
}

interface SavedShipmentsResponse {
	data?: SavedShipment[]
}

export default function useSavedShipments() {
	const sanctum = useSanctumClient()
	const router = useRouter()

	/* --- Fetch --- */
	const { data: savedShipments, refresh, status: savedStatus } = useSanctumFetch<SavedShipmentsResponse>(
		'/api/saved-shipments',
		{ method: 'GET', lazy: true } as Record<string, unknown>,
	)

	/* --- Filtri --- */
	const filterProvenienza = ref<string>('')
	const filterRiferimento = ref<string>('')
	const filterDateFrom = ref<string>('')
	const filterDateTo = ref<string>('')
	const filtersApplied = ref<boolean>(false)

	const applyFilters = (): void => { filtersApplied.value = true; currentPage.value = 1 }
	const resetFilters = (): void => {
		filterProvenienza.value = ''
		filterRiferimento.value = ''
		filterDateFrom.value = ''
		filterDateTo.value = ''
		filtersApplied.value = false
		currentPage.value = 1
	}

	/* --- Selezione multipla --- */
	const selectedItems = ref<number[]>([])
	const selectAll = ref<boolean>(false)

	const toggleSelectAll = (): void => {
		selectedItems.value = selectAll.value ? filteredItems.value.map((item) => item.id) : []
	}

	const toggleItem = (id: number): void => {
		const idx = selectedItems.value.indexOf(id)
		if (idx > -1) selectedItems.value.splice(idx, 1)
		else selectedItems.value.push(id)
		selectAll.value = selectedItems.value.length === filteredItems.value.length && filteredItems.value.length > 0
	}

	/* --- Paginazione --- */
	const currentPage = ref<number>(1)
	const itemsPerPage = 10

	const filteredItems = computed<SavedShipment[]>(() => {
		if (!savedShipments.value?.data) return []
		let items = [...savedShipments.value.data]
		if (filtersApplied.value) {
			if (filterProvenienza.value) {
				items = items.filter((item) => (item.origin_address as Address | undefined)?.city?.toLowerCase().includes(filterProvenienza.value.toLowerCase()))
			}
			if (filterRiferimento.value) {
				items = items.filter((item) => String(item.id).includes(filterRiferimento.value))
			}
			if (filterDateFrom.value) {
				const from = new Date(filterDateFrom.value)
				items = items.filter((item) => (item.created_at ? new Date(item.created_at) : new Date()) >= from)
			}
			if (filterDateTo.value) {
				const to = new Date(filterDateTo.value)
				to.setHours(23, 59, 59)
				items = items.filter((item) => (item.created_at ? new Date(item.created_at) : new Date()) <= to)
			}
		}
		return items
	})

	const totalPages = computed<number>(() => Math.max(1, Math.ceil(filteredItems.value.length / itemsPerPage)))
	const paginatedItems = computed<SavedShipment[]>(() => {
		const start = (currentPage.value - 1) * itemsPerPage
		return filteredItems.value.slice(start, start + itemsPerPage)
	})

	const totalShipmentsCount = computed<number>(() => savedShipments.value?.data?.length || 0)
	const visibleShipmentsCount = computed<number>(() => filteredItems.value.length)
	const selectedShipmentsCount = computed<number>(() => selectedItems.value.length)
	const activeFiltersCount = computed<number>(() => [filterProvenienza.value, filterRiferimento.value, filterDateFrom.value, filterDateTo.value].filter(Boolean).length)

	const prevPage = (): void => { if (currentPage.value > 1) currentPage.value-- }
	const nextPage = (): void => { if (currentPage.value < totalPages.value) currentPage.value++ }

	const uniqueCities = computed<string[]>(() => {
		if (!savedShipments.value?.data) return []
		const cities = savedShipments.value.data.map((item) => (item.origin_address as Address | undefined)?.city).filter(Boolean) as string[]
		return [...new Set(cities)]
	})

	/* --- Eliminazione --- */
	const showDeleteConfirm = ref<boolean>(false)
	const deleteTargetId = ref<number | null>(null)
	const deleteLoading = ref<boolean>(false)

	const askDelete = (id: number): void => { deleteTargetId.value = id; showDeleteConfirm.value = true }

	const confirmDelete = async (): Promise<void> => {
		deleteLoading.value = true
		try {
			await sanctum(`/api/saved-shipments/${deleteTargetId.value}`, { method: 'DELETE' })
			await refresh()
			showFeedback('Spedizione eliminata con successo.')
		} catch {
			showFeedback('Errore durante l\'eliminazione.', 'error')
		} finally {
			deleteLoading.value = false
			showDeleteConfirm.value = false
			deleteTargetId.value = null
		}
	}

	const bulkDeleteLoading = ref<boolean>(false)
	const showBulkDeleteConfirm = ref<boolean>(false)
	const askBulkDelete = (): void => { if (selectedItems.value.length) showBulkDeleteConfirm.value = true }

	const bulkDelete = async (): Promise<void> => {
		if (!selectedItems.value.length) return
		const count = selectedItems.value.length
		bulkDeleteLoading.value = true
		try {
			for (const id of selectedItems.value) await sanctum(`/api/saved-shipments/${id}`, { method: 'DELETE' })
			selectedItems.value = []
			selectAll.value = false
			await refresh()
			showFeedback(`${count} spedizion${count === 1 ? 'e eliminata' : 'i eliminate'} con successo.`)
		} catch {
			showFeedback('Errore durante l\'eliminazione.', 'error')
			await refresh()
		} finally {
			showBulkDeleteConfirm.value = false
			bulkDeleteLoading.value = false
		}
	}

	/* --- Carrello --- */
	const addToCartLoading = ref<boolean>(false)
	const bulkAddToCart = async (): Promise<void> => {
		if (!selectedItems.value.length) return
		addToCartLoading.value = true
		try {
			await sanctum('/api/saved-shipments/add-to-cart', { method: 'POST', body: { package_ids: selectedItems.value } })
			selectedItems.value = []
			selectAll.value = false
			await refresh()
			router.push('/carrello')
		} catch {
			// ignore
		} finally {
			addToCartLoading.value = false
		}
	}

	/* --- Modifica --- */
	const showEdit = ref<boolean>(false)
	const editItem = ref<SavedShipment | null>(null)
	const editForm = ref<EditFormState>({} as EditFormState)
	const editSaving = ref<boolean>(false)

	const openEdit = (item: SavedShipment): void => {
		editItem.value = item
		const origin = item.origin_address as Partial<Address> | undefined
		const dest = item.destination_address as Partial<Address> | undefined
		editForm.value = {
			origin_name: origin?.name || '',
			origin_address: origin?.address || '',
			origin_address_number: origin?.address_number || '',
			origin_city: origin?.city || '',
			origin_postal_code: origin?.postal_code || '',
			origin_province: origin?.province || '',
			origin_telephone: origin?.telephone_number || '',
			dest_name: dest?.name || '',
			dest_address: dest?.address || '',
			dest_address_number: dest?.address_number || '',
			dest_city: dest?.city || '',
			dest_postal_code: dest?.postal_code || '',
			dest_province: dest?.province || '',
			dest_telephone: dest?.telephone_number || '',
			package_type: item.package_type || '',
			quantity: item.quantity || 1,
			weight: item.weight || '',
			first_size: item.first_size || '',
			second_size: item.second_size || '',
			third_size: item.third_size || '',
		}
		showEdit.value = true
	}

	const saveEdit = async (): Promise<void> => {
		if (!editItem.value) return
		editSaving.value = true
		try {
			await sanctum(`/api/saved-shipments/${editItem.value.id}`, {
				method: 'PUT',
				body: {
					origin_address: {
						name: editForm.value.origin_name,
						address: editForm.value.origin_address,
						address_number: editForm.value.origin_address_number,
						city: editForm.value.origin_city,
						postal_code: editForm.value.origin_postal_code,
						province: editForm.value.origin_province,
						telephone_number: editForm.value.origin_telephone,
					},
					destination_address: {
						name: editForm.value.dest_name,
						address: editForm.value.dest_address,
						address_number: editForm.value.dest_address_number,
						city: editForm.value.dest_city,
						postal_code: editForm.value.dest_postal_code,
						province: editForm.value.dest_province,
						telephone_number: editForm.value.dest_telephone,
					},
					package_type: editForm.value.package_type,
					quantity: editForm.value.quantity,
					weight: editForm.value.weight,
					first_size: editForm.value.first_size,
					second_size: editForm.value.second_size,
					third_size: editForm.value.third_size,
				},
			})
			await refresh()
			showEdit.value = false
			showFeedback('Spedizione aggiornata con successo.')
		} catch {
			showFeedback('Errore durante il salvataggio.', 'error')
		} finally {
			editSaving.value = false
		}
	}

	/* --- Feedback --- */
	const feedbackMessage = ref<string>('')
	const feedbackType = ref<'success' | 'error'>('success')
	const showFeedback = (msg: string, type: 'success' | 'error' = 'success'): void => {
		feedbackMessage.value = msg
		feedbackType.value = type
		setTimeout(() => { feedbackMessage.value = '' }, 5000)
	}

	/* --- Helpers --- */
	// formatPrice auto-importato da utils/price.js
	// Per saved shipments senza prezzo, usiamo '—' direttamente nel template
	const formatPriceOrDash = (cents: number | null | undefined): string =>
		(!cents && cents !== 0) ? '\u2014' : formatPrice(cents as number)

	const destKey = (item: SavedShipment): string => {
		const d = item.destination_address as Partial<Address> | undefined
		if (!d) return ''
		return [d.name, d.address, d.address_number, d.city, d.postal_code].filter(Boolean).join('|').toLowerCase()
	}

	const duplicateDestinations = computed<Set<number>>(() => {
		if (!savedShipments.value?.data) return new Set()
		const map: Record<string, number[]> = {}
		for (const item of savedShipments.value.data) {
			const key = destKey(item)
			if (!key) continue
			if (!map[key]) map[key] = []
			map[key].push(item.id)
		}
		const dupeIds = new Set<number>()
		for (const ids of Object.values(map)) {
			if (ids.length > 1) ids.forEach((id) => dupeIds.add(id))
		}
		return dupeIds
	})

	const isDuplicateDest = (item: SavedShipment): boolean => duplicateDestinations.value.has(item.id)

	const formatCreatedDate = (item: SavedShipment): string => {
		if (item.created_at) return new Date(item.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
		return new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
	}

	const getPackageIcon = (item: SavedShipment): string => {
		const type = item.package_type?.toLowerCase() || ''
		if (type.includes('pallet')) return '/img/quote/first-step/pallet.png'
		if (type.includes('busta')) return '/img/quote/first-step/envelope.png'
		return '/img/quote/first-step/pack.png'
	}

	return {
		savedShipments, refresh, savedStatus,
		filterProvenienza, filterRiferimento, filterDateFrom, filterDateTo, filtersApplied,
		applyFilters, resetFilters,
		selectedItems, selectAll, toggleSelectAll, toggleItem,
		currentPage, totalPages, paginatedItems, filteredItems,
		totalShipmentsCount, visibleShipmentsCount, selectedShipmentsCount, activeFiltersCount,
		prevPage, nextPage, uniqueCities,
		showDeleteConfirm, deleteTargetId, deleteLoading, askDelete, confirmDelete,
		bulkDeleteLoading, showBulkDeleteConfirm, askBulkDelete, bulkDelete,
		addToCartLoading, bulkAddToCart,
		showEdit, editItem, editForm, editSaving, openEdit, saveEdit,
		feedbackMessage, feedbackType,
		formatPrice, formatPriceOrDash, isDuplicateDest, formatCreatedDate, getPackageIcon,
	}
}
