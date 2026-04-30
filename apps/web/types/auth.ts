/**
 * Tipi auth: utente loggato + form login/registrazione/password reset.
 */

export interface User {
	id: number
	name: string
	surname: string
	email: string
	role: 'Admin' | 'Cliente' | string
	user_type?: 'privato' | 'azienda' | string
	telephone_number?: string
	prefix?: string
	referred_by?: string
	email_verified_at?: string | null
	created_at?: string
	updated_at?: string
	/** Saldo portafoglio in centesimi */
	wallet_balance?: number
}

export interface AuthCredentials {
	email: string
	password: string
	remember?: boolean
}

export interface AuthRegisterForm extends AuthCredentials {
	name: string
	surname: string
	telephone_number?: string
	prefix?: string
	user_type?: 'privato' | 'azienda' | string
	referred_by?: string | null
}

export interface AuthPasswordChecks {
	length: boolean
	uppercase: boolean
	lowercase: boolean
	number: boolean
	special: boolean
}

export type AuthErrorDictionary = Record<string, string[] | string>

export interface AuthResendMessage {
	type: 'success' | 'error' | 'info'
	text: string
}

export interface AuthTabItem {
	key: string
	label: string
	to?: string
}
