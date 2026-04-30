/**
 * Tipi pannello admin: feedback, status config, paginazione.
 */

/** Messaggio di feedback mostrato dal pannello admin. */
export interface AdminActionMessage {
	type: 'success' | 'error'
	text: string
}

/** Configurazione UI per un singolo stato (colori + icona). */
export interface AdminStatusConfigEntry {
	label: string
	bg: string
	text: string
	icon?: string
}

export type AdminStatusConfig = Record<string, AdminStatusConfigEntry>

/** Risposta paginata generica delle API admin (list ordini/utenti/spedizioni). */
export interface AdminPaginatedResponse<T = unknown> {
	data: T[]
	meta?: {
		current_page?: number
		last_page?: number
		per_page?: number
		total?: number
	}
}

/** Opzione di stato selezionabile nei filtri admin (UI <select>). */
export interface AdminStatusOption {
	value: string
	label: string
}

/** Dati payload per cambio ruolo utente dal pannello admin. */
export interface AdminRoleChangeData {
	user_id: number | string
	role: string
}
