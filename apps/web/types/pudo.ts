/**
 * Punti BRT PUDO (Pick Up Drop Off) — selezione consegna alternativa.
 */

export interface PudoPoint {
	pudo_id: string
	name: string
	address: string
	city: string
	postal_code?: string
	province?: string
	country?: string
	latitude?: number
	longitude?: number
	opening_hours?: string
}

/** Punto PUDO normalizzato dal composable. */
export interface BrtPudoNormalized {
	pudo_id: string
	carrier_pudo_id: string
	ui_key: string
	provider: string
	name: string
	address: string
	city: string
	zip_code: string
	province: string
	country: string
	latitude: number | null
	longitude: number | null
	distance_meters: number | null
	enabled: boolean
	opening_hours: string | null
	localization_hint: string
}

/** Metadati restituiti dalle API di ricerca BRT. */
export interface BrtPudoMeta {
	strategy_used?: string[]
	returned_count?: number
	requested_count?: number
	provider?: string
	fallback?: boolean
}

/**
 * Risposta generica delle API BRT PUDO.
 * /api/brt/pudo/search, /api/brt/pudo/nearby, /api/brt/pudo/{id}.
 */
export interface BrtPudoResponse {
	success?: boolean
	error?: string
	pudo?: unknown[]
	data?: {
		pudo?: unknown[]
		meta?: BrtPudoMeta
	}
	meta?: BrtPudoMeta
}
