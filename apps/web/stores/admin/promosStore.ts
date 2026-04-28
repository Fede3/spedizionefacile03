/**
 * promosStore — settings promozione globale (badge, etichetta, immagine).
 *
 * Estratto dalla sezione "promo" di composables/useAdminPrezzi.js
 * (split atomico Pinia 2026-04-26). Endpoint dedicati:
 *   - GET  /api/admin/promo-settings
 *   - POST /api/admin/promo-settings
 *   - POST /api/admin/promo-settings/upload-image
 */
import { defineStore } from 'pinia'
import { ADMIN_DEFAULT_PROMO, type PromoState } from '~/utils/adminPrezziHelpers'

const VALID_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024

interface PromoFeedbackHandlers {
	showSuccess: (msg: string) => void
	showError: (e: unknown, fallback: string) => void
	reloadPublicPriceBands: () => Promise<void> | void
}

export const useAdminPromosStore = defineStore('admin-promos', () => {
	// ---------- STATE ----------
	const promo = ref<PromoState>({ ...ADMIN_DEFAULT_PROMO })
	const promoLoading = ref(false)
	const promoSaving = ref(false)
	const promoImageUploading = ref(false)

	// ---------- ACTIONS ----------
	const fetchPromoSettings = async (): Promise<void> => {
		const sanctum = useSanctumClient()
		promoLoading.value = true
		try {
			const res = await sanctum('/api/admin/promo-settings') as Record<string, unknown> | null
			const payload = (res as { data?: Record<string, unknown> })?.data ?? res ?? {}
			const data = payload as Record<string, unknown>
			promo.value = {
				active: data.promo_active === 'true' || data.promo_active === true,
				label_text: (data.promo_label_text as string) || '',
				label_color: (data.promo_label_color as string) || '#E44203',
				label_image: (data.promo_label_image as string | null) || null,
				show_badges: data.promo_show_badges === 'true' || data.promo_show_badges === true,
				description: (data.promo_description as string) || '',
			}
		} catch {
			// Default values already set
		} finally {
			promoLoading.value = false
		}
	}

	const savePromo = async (handlers: PromoFeedbackHandlers): Promise<void> => {
		const sanctum = useSanctumClient()
		promoSaving.value = true
		try {
			await sanctum('/api/admin/promo-settings', {
				method: 'POST',
				body: {
					promo_active: promo.value.active ? 'true' : 'false',
					promo_label_text: promo.value.label_text,
					promo_label_color: promo.value.label_color,
					promo_show_badges: promo.value.show_badges ? 'true' : 'false',
					promo_description: promo.value.description,
				},
			})
			handlers.showSuccess('Impostazioni promozione salvate con successo.')
			await handlers.reloadPublicPriceBands()
		} catch (e) {
			handlers.showError(e, 'Errore durante il salvataggio della promozione.')
		} finally {
			promoSaving.value = false
		}
	}

	const uploadPromoImage = async (event: Event, handlers: PromoFeedbackHandlers): Promise<void> => {
		const input = event.target as HTMLInputElement
		const file = input.files?.[0]
		if (!file) return
		if (!VALID_IMAGE_TYPES.includes(file.type)) {
			handlers.showError(null, 'Formato file non valido. Usa JPG, PNG, GIF o WebP.')
			input.value = ''
			return
		}
		if (file.size > MAX_IMAGE_SIZE_BYTES) {
			handlers.showError(null, 'File troppo grande. Dimensione massima: 2MB.')
			input.value = ''
			return
		}
		const sanctum = useSanctumClient()
		promoImageUploading.value = true
		try {
			const formData = new FormData()
			formData.append('image', file)
			const res = await sanctum('/api/admin/promo-settings/upload-image', {
				method: 'POST',
				body: formData,
			}) as { image_url?: string } | null
			promo.value.label_image = res?.image_url || null
			handlers.showSuccess('Immagine promo caricata.')
		} catch (e) {
			handlers.showError(e, "Errore durante l'upload dell'immagine.")
		} finally {
			promoImageUploading.value = false
			input.value = ''
		}
	}

	return {
		promo,
		promoLoading,
		promoSaving,
		promoImageUploading,
		fetchPromoSettings,
		savePromo,
		uploadPromoImage,
	}
})
