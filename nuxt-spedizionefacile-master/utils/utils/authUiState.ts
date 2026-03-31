export type AuthUiSnapshot = {
	authenticated: boolean
	name: string
	role: string | null
}

export type AuthUiUser = {
	name?: string | null
	role?: string | null
}

export type AuthBootstrapStatus = 'idle' | 'pending' | 'resolved' | 'failed'

export const AUTH_UI_COOKIE = 'sf_auth_ui'
export const AUTH_UI_STORAGE = 'sf_auth_ui_cache'

export const createEmptySnapshot = (): AuthUiSnapshot => ({
	authenticated: false,
	name: '',
	role: null,
})

export const snapshotFromUser = (user: AuthUiUser): AuthUiSnapshot => ({
	authenticated: true,
	name: String(user.name || ''),
	role: user.role || null,
})

export const parseStoredSnapshot = (value: string | null): AuthUiSnapshot => {
	if (!value) {
		return createEmptySnapshot()
	}

	try {
		const parsed = JSON.parse(value) as Partial<AuthUiSnapshot>
		if (!parsed.authenticated) {
			return createEmptySnapshot()
		}

		return {
			authenticated: true,
			name: String(parsed.name || ''),
			role: parsed.role || null,
		}
	} catch {
		return createEmptySnapshot()
	}
}
